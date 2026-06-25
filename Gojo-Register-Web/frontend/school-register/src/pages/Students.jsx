import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { format, parseISO, startOfWeek, startOfMonth } from "date-fns";
import { useMemo } from "react";
import { getDatabase, ref, onValue, push, update } from "firebase/database";
import { getFirestore, collection, getDocs } from "firebase/firestore";

import app, { db, firestore } from "../firebase"; // Adjust the path if needed
import { BACKEND_BASE } from "../config.js";
import { buildSchoolRtdbBase } from "../api/rtdbScope";
import useTopbarNotifications from "../hooks/useTopbarNotifications";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import useStudentsList from "../hooks/students/useStudentsList";
import useStudentTabData from "../hooks/students/useStudentTabData";
import useStudentDetail from "../hooks/students/useStudentDetail";
import useStudentChat from "../hooks/chat/useStudentChat";
import useStudentFullscreenForm from "../hooks/students/useStudentFullscreenForm";
import useStudentProfileEdit from "../hooks/students/useStudentProfileEdit";
import useAttendanceView from "../hooks/students/useAttendanceView";
import StudentFullscreenModal from "../components/dashboard/students/StudentFullscreenModal";
import StudentListPanel from "../components/dashboard/students/StudentListPanel";
import StudentDetailDrawer from "../components/dashboard/students/StudentDetailDrawer";
import DashboardTopBar from "../components/dashboard/layout/DashboardTopBar";
import RegisterSidebar from "../components/RegisterSidebar";
import ProfileAvatar from "../components/ProfileAvatar";
import {
  buildUserLookupFromNode,
  loadAttendanceForStudent,
  loadGradeManagementNode,
  loadMarksForStudent,
  loadParentRecordsByIds,
  loadSchoolInfoNode,
  loadSchoolStudentsNode,
  loadUserRecordById,
  loadUserRecordsByIds,
} from "../utils/registerData";
import { persistResolvedSchoolSession, resolveSchoolScope } from "../utils/schoolScope";


function StudentsPage() {
  const API_BASE = `${BACKEND_BASE}/api`;
  // ------------------ STATES ------------------
  const [selectedGrade, setSelectedGrade] = useState("All"); // Grade filter
  const [selectedSection, setSelectedSection] = useState("All"); // Section filter
  const [searchTerm, setSearchTerm] = useState("");
  const [studentChatOpen, setStudentChatOpen] = useState(false); // Toggle chat popup
  const [studentTab, setStudentTab] = useState("details");
  const [studentFullscreenOpen, setStudentFullscreenOpen] = useState(false);
  const navigate = useNavigate();

  // Prefer the best available session payload. Sometimes `finance` can be stale/empty
  // while `admin` still contains a valid adminId/userId (or vice-versa).
  // ---------------- SESSION (registrar/finance + admin alias) ----------------
  const { finance, setFinance, admin: adminBase, schoolCode, DB_ROOT } = useRegistrarSession();

  // Older inline code expected `admin.username`; keep it as a derived field.
  const admin = { ...adminBase, username: finance.username || "" };

  const adminId = admin?.adminId || admin?.userId || null;
  const adminUserId = admin?.userId || null;

  // School scope is resolved asynchronously and can override the hook's
  // initial `DB_ROOT` if the school record points to a different shard.
  const initialDbUrl = DB_ROOT || buildSchoolRtdbBase(schoolCode);
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState(schoolCode);
  const [resolvedDbUrl, setResolvedDbUrl] = useState(initialDbUrl);
  const DB_URL = String(resolvedDbUrl || initialDbUrl || "").trim();
  const activeSchoolCode = String(resolvedSchoolCode || schoolCode || "").trim();

  // ---------------- STUDENTS LIST (hook owns fetch + derivations) ----------------
  const {
    students, setStudents,
    studentsLoading,
    gradeOptions, setGradeOptions,
    currentAcademicYear, setCurrentAcademicYear,
    previousAcademicYearKey,
    filteredStudentsBase,
    currentYearStudents,
    lastYearStudents,
    assignedGrades,
    assignedSectionsForSelectedGrade,
  } = useStudentsList({
    dbUrl: DB_URL,
    selectedGrade,
    setSelectedGrade,
    selectedSection,
    searchTerm,
  });


  useEffect(() => {
    const resolveScope = async () => {
      if (!schoolCode) return;

      try {
        const resolvedScope = await resolveSchoolScope(schoolCode);
        const nextResolvedSchoolCode = String(resolvedScope?.schoolCode || schoolCode || "").trim();
        const nextResolvedDbUrl = String(resolvedScope?.dbUrl || initialDbUrl || "").trim();
        const resolvedSchoolInfo = resolvedScope?.schoolInfo || {};

        setResolvedSchoolCode(nextResolvedSchoolCode);
        setResolvedDbUrl(nextResolvedDbUrl);

        if (nextResolvedSchoolCode && nextResolvedSchoolCode !== schoolCode) {
          persistResolvedSchoolSession(nextResolvedSchoolCode, String(resolvedSchoolInfo?.shortName || "").trim());
        }
      } catch (error) {
        console.error("Failed to resolve students page school scope:", error);
        setResolvedSchoolCode(String(schoolCode || "").trim());
        setResolvedDbUrl(initialDbUrl);
      }
    };

    resolveScope();
  }, [schoolCode, initialDbUrl]);

  // UI state helpers (responsive + dropdowns/chat)
  const getIsNarrow = () => (typeof window !== "undefined" ? window.innerWidth <= 800 : false);
  const getIsPortrait = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(orientation: portrait)").matches : false);

  const [isNarrow, setIsNarrow] = useState(getIsNarrow());
  const [isPortrait, setIsPortrait] = useState(getIsPortrait());
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  // ---------------- SELECTED STUDENT (detail loader) ----------------
  const {
    selectedStudent,
    setSelectedStudent,
    selectStudent: handleSelectStudent,
    studentSelectionRequestRef,
  } = useStudentDetail({
    dbUrl: DB_URL,
    activeSchoolCode,
    onOpenDrawer: () => setRightSidebarOpen(true),
  });

  // ---------------- STUDENT TAB DATA (marks + payment history) ----------------
  const {
    studentMarks,
    setStudentMarks,
    paymentHistory,
    setPaymentHistory,
  } = useStudentTabData({
    dbUrl: DB_URL,
    selectedStudent,
    studentTab,
  });


  // ---------------- STUDENT CHAT (popup) ----------------
  const {
    popupMessages,
    newMessageText,
    setNewMessageText,
    messagesEndRef,
    sendMessage,
  } = useStudentChat({
    dbUrl: DB_URL,
    adminUserId,
    selectedStudent,
    studentChatOpen,
  });

  // ---------------- STUDENT PROFILE QUICK-EDIT (Details tab) ----------------
  const {
    editingProfile,
    editForm,
    setEditForm,
    savingProfile,
    startEditProfile,
    cancelEditProfile,
    saveProfileEdits,
  } = useStudentProfileEdit({
    dbUrl: DB_URL,
    backendBase: BACKEND_BASE,
    selectedStudent,
    setSelectedStudent,
    setStudents,
  });

  // ---------------- ATTENDANCE VIEW (right-drawer Attendance tab) ----------------
  const {
    attendanceView,
    setAttendanceView,
    attendanceCourseFilter,
    expandedCards,
    toggleExpand,
    attendanceBySubject,
    getProgress,
    formatSubjectName,
  } = useAttendanceView({ selectedStudent });

  const [showPostDropdown, setShowPostDropdown] = useState(false);
  const [activeSemester, setActiveSemester] = useState("semester1");
  const [activeQuarter, setActiveQuarter] = useState("quarter1");
  const semesterQuarters = {
    semester1: ["quarter1", "quarter2"],
    semester2: ["quarter3", "quarter4"],
  };

// Place before return (

  const studentMarksFlattened = useMemo(() => {
    const src = studentMarks || {};
    const out = {};

    Object.entries(src).forEach(([courseId, node]) => {
      const normalized = {};

      if (node && (node.teacherName || node.teacher)) {
        normalized.teacherName = node.teacherName || node.teacher;
      }

      // already has semester nodes
      if (node && (node.semester1 || node.semester2)) {
        if (node.semester1) normalized.semester1 = node.semester1;
        if (node.semester2) normalized.semester2 = node.semester2;
        out[courseId] = normalized;
        return;
      }

      // quarter keys -> place under semesters
      const quarterKeys = Object.keys(node || {}).filter((k) => /^quarter\d+/i.test(k));
      if (quarterKeys.length) {
        normalized.semester1 = normalized.semester1 || {};
        normalized.semester2 = normalized.semester2 || {};
        quarterKeys.forEach((qk) => {
          const qLower = qk.toLowerCase();
          if (/quarter[12]/i.test(qLower)) {
            normalized.semester1[qLower] = node[qk];
          } else {
            normalized.semester2[qLower] = node[qk];
          }
        });
        out[courseId] = normalized;
        return;
      }

      // fallback: flat assessments -> place under semester2.assessments
      if (node && node.assessments) {
        normalized.semester2 = normalized.semester2 || {};
        normalized.semester2.assessments = node.assessments;
        out[courseId] = normalized;
        return;
      }

      // default: copy whatever node was
      out[courseId] = normalized;
    });

    return out;
  }, [studentMarks]);

  const {
    unreadSenders,
    setUnreadSenders,
    unreadPosts: postNotifications,
    totalNotifications,
    messageCount,
    markMessagesAsSeen,
    markPostAsSeen,
    setUnreadPosts: setPostNotifications,
  } = useTopbarNotifications({
    dbRoot: DB_URL,
    currentUserId: admin.userId,
  });


const handleNotificationClick = async (notification) => {
  try {
    await markPostAsSeen(notification.postId);
  } catch (err) {
    console.warn("Failed to mark notification as seen:", err);
  }

  setPostNotifications((prev) =>
    prev.filter((n) => n.notificationId !== notification.notificationId)
  );

  setShowPostDropdown(false);
  navigate("/dashboard", {
    state: { postId: notification.postId },
  });
};
useEffect(() => {
  if (location.state?.postId) {
    setPostNotifications([]);
  }
}, []);

  const handleSendMessage = () => {
    // now newMessageText is defined
    console.log("Sending message:", newMessageText);
    // your code to send the message
  };

  useEffect(() => {
    const closeDropdown = (e) => {
      if (
        !e.target.closest(".icon-circle") &&
        !e.target.closest(".notification-dropdown")
      ) {
        setShowPostDropdown(false);
      }
    };

    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  }, []);



  // ---- Student profile edit helpers ----

  // Close the notification dropdown on outside click
  useEffect(() => {
    const closeDropdown = (e) => {
      if (!e.target.closest(".icon-circle") && !e.target.closest(".notification-dropdown")) {
        setShowPostDropdown(false);
      }
    };
    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  }, []);




  // ------------------ FETCH STUDENTS ------------------


  const selectedFilterLabel =
    selectedGrade === "All"
      ? "All grades"
      : selectedSection === "All"
      ? `Grade ${selectedGrade} (select section)`
      : `Grade ${selectedGrade} - Section ${selectedSection}`;

  const listShellWidth = isPortrait ? "100%" : "min(100%, 640px)";
  const rightSidebarOffset = isPortrait ? 0 : 408;
  const stackChatActions = isPortrait || isNarrow;
  const detailDrawerTop = isPortrait ? 0 : "calc(var(--topbar-height) + 18px)";
  const detailDrawerHeight = isPortrait ? "100vh" : "calc(100vh - var(--topbar-height) - 36px)";
  const detailDrawerRight = isPortrait ? 0 : 14;

  // Keep the section selection in sync when the grade changes.
  useEffect(() => {
    if (selectedGrade === "All") {
      setSelectedSection("All");
      return;
    }
    const gradeSections = [...new Set(
      students
        .filter((s) => String(s.grade) === String(selectedGrade))
        .map((s) => s.section)
        .filter(Boolean)
    )];
    setSelectedSection((prev) => {
      if (!gradeSections.length) return "All";
      return gradeSections.includes(prev) ? prev : gradeSections[0];
    });
  }, [selectedGrade, students]);


  // ---------------- FETCH PERFORMANCE ----------------
  // This effect reads ClassMarks and stores only the entries for the selected student.







  // ---------------- CLOSE DROPDOWN ON OUTSIDE CLICK ----------------

  useEffect(() => {
    const onResize = () => {
      try {
        setIsNarrow(getIsNarrow());
        setIsPortrait(getIsPortrait());
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);












  const contentLeft = isNarrow ? 0 : 90;

  const registrationSections = useMemo(() => {
    if (!selectedStudent) return null;

    return {
      basic: selectedStudent.basicStudentInformation || {},
      parent: selectedStudent.parentGuardianInformation || {},
      address: selectedStudent.addressInformation || {},
      finance: selectedStudent.financeInformation || {},
      health: selectedStudent.healthEmergency || {},
      academic: selectedStudent.academicSetup || {},
      system: selectedStudent.systemAccountInformation || {},
    };
  }, [selectedStudent]);

  const sectionDefinitions = useMemo(() => ([
    { key: "basic", title: "1) Basic Student Information" },
    { key: "parent", title: "2) Parent / Guardian Information", fullWidth: true },
    { key: "address", title: "3) Address Information" },
    { key: "finance", title: "4) Finance Information" },
    { key: "health", title: "5) Health & Emergency" },
    { key: "academic", title: "6) Academic Setup" },
    { key: "system", title: "7) System Account Information" },
  ]), []);

  const excludedAdditionalKeys = useMemo(() => [
    "basicStudentInformation",
    "parentGuardianInformation",
    "addressInformation",
    "financeInformation",
    "healthEmergency",
    "academicSetup",
    "systemAccountInformation",
    "marks",
    "attendance",
    "parents",
    "studentId",
    "userId",
  ], []);

  // ---------------- FULLSCREEN PROFILE EDITOR ----------------
  const {
    fullscreenEditing,
    setFullscreenEditing,
    fullscreenSaving,
    fullscreenSectionCollapsed,
    fullscreenEditForm,
    toggleFullscreenSection,
    updateFullscreenSectionField,
    updateFullscreenAdditionalField,
    resetFullscreenEditFormFromSelected,
    saveFullscreenEdits,
  } = useStudentFullscreenForm({
    dbUrl: DB_URL,
    selectedStudent,
    setSelectedStudent,
    setStudents,
    studentFullscreenOpen,
    registrationSections,
    excludedAdditionalKeys,
  });

  const formatFieldLabel = (fieldKey = "") =>
    String(fieldKey)
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (char) => char.toUpperCase());

  const isImageValue = (fieldKey, value) => {
    if (!value || typeof value !== "string") return false;
    const val = value.trim();
    const isUrlLike = /^https?:\/\//i.test(val) || /^data:image\//i.test(val);
    const hasImageExt = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(val);
    const keyHintsImage = /(image|photo|avatar|nationalid|nid)/i.test(String(fieldKey || ""));
    return (keyHintsImage && isUrlLike) || hasImageExt || /^data:image\//i.test(val);
  };

  const renderDisplayValue = (fieldKey, value) => {
    if (isImageValue(fieldKey, value)) {
      return (
        <img
          src={String(value)}
          alt={formatFieldLabel(fieldKey)}
          style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border-strong)" }}
        />
      );
    }

    if (Array.isArray(value)) {
      if (!value.length) return <span>-</span>;

      return (
        <div style={{ display: "grid", gap: 8 }}>
          {value.map((item, index) => (
            <div
              key={`${String(fieldKey)}_${index}`}
              style={{ background: "var(--surface-muted)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "8px 10px" }}
            >
              {item && typeof item === "object" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                  {Object.entries(item).map(([nestedKey, nestedValue]) => (
                    <div key={`${nestedKey}_${index}`}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>
                        {formatFieldLabel(nestedKey)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-primary)", wordBreak: "break-word" }}>
                        {renderDisplayValue(nestedKey, nestedValue)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span>{String(item || "-")}</span>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (value && typeof value === "object") {
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {Object.entries(value).map(([nestedKey, nestedValue]) => (
            <div
              key={nestedKey}
              style={{ background: "var(--surface-muted)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "8px 10px" }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>
                {formatFieldLabel(nestedKey)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-primary)", wordBreak: "break-word" }}>
                {renderDisplayValue(nestedKey, nestedValue)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "boolean") {
      return <span>{value ? "Yes" : "No"}</span>;
    }

    return <span>{String(value || "-")}</span>;
  };



  const shellCardStyle = {
    background: "var(--surface-panel)",
    border: "1px solid var(--border-soft)",
    borderRadius: 12,
    boxShadow: "var(--shadow-soft)",
  };
  const softPanelStyle = {
    background: "var(--surface-muted)",
    border: "1px solid var(--border-soft)",
    borderRadius: 10,
  };
  const listCardStyle = (isSelected) => ({
    width: isNarrow ? "92%" : "560px",
    minHeight: "86px",
    borderRadius: "14px",
    padding: "12px",
    background: isSelected ? "var(--surface-accent)" : "var(--surface-panel)",
    border: isSelected ? "2px solid var(--accent-strong)" : "1px solid var(--border-soft)",
    boxShadow: isSelected ? "var(--shadow-glow)" : "var(--shadow-soft)",
    cursor: "pointer",
    transition: "all 0.25s ease",
    position: "relative",
  });
  const rightDrawerCardStyle = {
    background: "var(--surface-panel)",
    borderRadius: 12,
    border: "1px solid var(--border-soft)",
    boxShadow: "var(--shadow-soft)",
  };

 return (
   <div
     className="dashboard-page"
     style={{
       background: "#ffffff",
       minHeight: "100vh",
       height: "100vh",
       overflow: "hidden",
       color: "var(--text-primary)",
       "--surface-panel": "#ffffff",
       "--surface-accent": "#eff6ff",
       "--surface-muted": "#f8fbff",
       "--surface-strong": "#e2e8f0",
       "--surface-overlay": "rgba(255,255,255,0.92)",
       "--page-bg": "#ffffff",
       "--page-bg-secondary": "#f8fbff",
       "--border-soft": "#e2e8f0",
       "--border-strong": "#cbd5e1",
       "--text-primary": "#0f172a",
       "--text-secondary": "#334155",
       "--text-muted": "#64748b",
       "--accent": "#3b82f6",
       "--accent-soft": "#dbeafe",
       "--accent-strong": "#007AFB",
       "--shadow-soft": "0 10px 22px rgba(15, 23, 42, 0.07)",
       "--shadow-panel": "0 16px 34px rgba(15, 23, 42, 0.12)",
       "--shadow-glow": "0 0 0 2px rgba(37, 99, 235, 0.18)",
       "--success": "#16a34a",
       "--success-soft": "#dcfce7",
       "--warning": "#d97706",
       "--warning-soft": "#fef3c7",
       "--danger": "#dc2626",
       "--danger-soft": "#fee2e2",
       "--input-border": "#dbeafe",
       "--input-bg": "#ffffff",
     }}
   >
      {/* ---------------- TOP NAVIGATION BAR ---------------- */}
      <DashboardTopBar
        admin={admin}
        totalNotifications={totalNotifications}
        showPostDropdown={showPostDropdown}
        setShowPostDropdown={setShowPostDropdown}
        unreadPostList={postNotifications}
        messageCount={messageCount}
        unreadSenders={unreadSenders}
        setUnreadSenders={setUnreadSenders}
        markMessagesAsSeen={markMessagesAsSeen}
        onOpenPost={handleNotificationClick}
      />

      <div className="google-dashboard" style={{ display: "flex", gap: 14, padding: "12px", height: "calc(100vh - 73px)", overflow: "hidden", background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)" }}>
        {/* ---------------- SIDEBAR ---------------- */}
        <RegisterSidebar user={admin} sticky fullHeight />
        {/* ---------------- MAIN CONTENT ---------------- */}
        <div
          className={`main-content ${rightSidebarOpen ? "sidebar-open" : ""}`}
          style={{
            padding: "10px 20px 52px",
            flex: 1,
            minWidth: 0,
            boxSizing: "border-box",
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              paddingRight: rightSidebarOffset,
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
          <StudentListPanel
            listShellWidth={listShellWidth}
            isPortrait={isPortrait}
            currentYearStudents={currentYearStudents}
            currentAcademicYear={currentAcademicYear}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedGrade={selectedGrade}
            setSelectedGrade={setSelectedGrade}
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
            students={students}
            assignedGrades={assignedGrades}
            assignedSectionsForSelectedGrade={assignedSectionsForSelectedGrade}
            selectedFilterLabel={selectedFilterLabel}
            studentsLoading={studentsLoading}
            selectedStudent={selectedStudent}
            handleSelectStudent={handleSelectStudent}
          />
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <StudentDetailDrawer
          selectedStudent={selectedStudent}
          isPortrait={isPortrait}
          detailDrawerHeight={detailDrawerHeight}
          detailDrawerRight={detailDrawerRight}
          detailDrawerTop={detailDrawerTop}
          onClose={() => {
            studentSelectionRequestRef.current += 1;
            setRightSidebarOpen(false);
            setStudentFullscreenOpen(false);
            setSelectedStudent(null);
          }}
          onExpand={() => setStudentFullscreenOpen(true)}
          studentTab={studentTab}
          setStudentTab={setStudentTab}
          editingProfile={editingProfile}
          editForm={editForm}
          setEditForm={setEditForm}
          savingProfile={savingProfile}
          startEditProfile={startEditProfile}
          saveProfileEdits={saveProfileEdits}
          cancelEditProfile={cancelEditProfile}
          attendanceBySubject={attendanceBySubject}
          attendanceView={attendanceView}
          setAttendanceView={setAttendanceView}
          attendanceCourseFilter={attendanceCourseFilter}
          expandedCards={expandedCards}
          toggleExpand={toggleExpand}
          getProgress={getProgress}
          formatSubjectName={formatSubjectName}
          studentMarksFlattened={studentMarksFlattened}
          activeSemester={activeSemester}
          setActiveSemester={setActiveSemester}
          paymentHistory={paymentHistory}
          studentChatOpen={studentChatOpen}
          setStudentChatOpen={setStudentChatOpen}
          stackChatActions={stackChatActions}
          popupMessages={popupMessages}
          adminUserId={adminUserId}
          messagesEndRef={messagesEndRef}
          newMessageText={newMessageText}
          setNewMessageText={setNewMessageText}
          sendMessage={sendMessage}
        />

      <StudentFullscreenModal
        open={studentFullscreenOpen}
        onClose={() => setStudentFullscreenOpen(false)}
        selectedStudent={selectedStudent}
        fullscreenEditing={fullscreenEditing}
        setFullscreenEditing={setFullscreenEditing}
        fullscreenSaving={fullscreenSaving}
        fullscreenSectionCollapsed={fullscreenSectionCollapsed}
        toggleFullscreenSection={toggleFullscreenSection}
        fullscreenEditForm={fullscreenEditForm}
        sectionDefinitions={sectionDefinitions}
        registrationSections={registrationSections}
        excludedAdditionalKeys={excludedAdditionalKeys}
        updateFullscreenSectionField={updateFullscreenSectionField}
        updateFullscreenAdditionalField={updateFullscreenAdditionalField}
        resetFullscreenEditFormFromSelected={resetFullscreenEditFormFromSelected}
        saveFullscreenEdits={saveFullscreenEdits}
        isImageValue={isImageValue}
        formatFieldLabel={formatFieldLabel}
        renderDisplayValue={renderDisplayValue}
      />
    </div>

  </div>
)}
export default StudentsPage;