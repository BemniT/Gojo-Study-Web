import React from "react";
import { FaChalkboardTeacher } from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";
import StudentDetailsTab from "./StudentDetailsTab";
import StudentAttendanceTab from "./StudentAttendanceTab";
import StudentPerformanceTab from "./StudentPerformanceTab";
import StudentPaymentTab from "./StudentPaymentTab";
import StudentChatActionButtons from "./StudentChatActionButtons";
import StudentChatPopup from "./StudentChatPopup";

const TABS = ["details", "attendance", "performance", "payment"];

function DrawerEmptyState({ isPortrait, detailDrawerHeight, detailDrawerRight, detailDrawerTop }) {
  return (
    <div
      style={{
        width: isPortrait ? "100%" : "380px",
        height: detailDrawerHeight,
        position: "fixed",
        right: detailDrawerRight,
        top: detailDrawerTop,
        background: "var(--surface-muted)",
        backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        boxShadow: "var(--shadow-panel)",
        borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
        borderRadius: isPortrait ? 0 : 18,
        transition: "all 0.35s ease",
        fontSize: 10,
        padding: "14px",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 12,
          border: "1px solid var(--border-soft)",
          background: "var(--surface-panel)",
          boxShadow: "var(--shadow-soft)",
          padding: "18px 14px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            margin: "0 auto 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent-soft)",
            color: "var(--accent-strong)",
            fontSize: 24,
          }}
        >
          <FaChalkboardTeacher />
        </div>
        <h3 style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 800 }}>
          Student Details
        </h3>
        <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5 }}>
          Select a student from the list to view profile, attendance, performance, and payment details.
        </p>
      </div>
    </div>
  );
}

export default function StudentDetailDrawer({
  // Selected student + drawer chrome
  selectedStudent,
  isPortrait,
  detailDrawerHeight,
  detailDrawerRight,
  detailDrawerTop,
  onClose,
  onExpand,
  // Tabs
  studentTab,
  setStudentTab,
  // Details tab
  editingProfile,
  editForm,
  setEditForm,
  savingProfile,
  startEditProfile,
  saveProfileEdits,
  cancelEditProfile,
  // Attendance tab
  attendanceBySubject,
  attendanceView,
  setAttendanceView,
  attendanceCourseFilter,
  expandedCards,
  toggleExpand,
  getProgress,
  formatSubjectName,
  // Performance tab
  studentMarksFlattened,
  activeSemester,
  setActiveSemester,
  // Payment tab
  paymentHistory,
  // Chat action buttons + popup
  studentChatOpen,
  setStudentChatOpen,
  stackChatActions,
  popupMessages,
  adminUserId,
  messagesEndRef,
  newMessageText,
  setNewMessageText,
  sendMessage,
}) {
  if (!selectedStudent) {
    return (
      <DrawerEmptyState
        isPortrait={isPortrait}
        detailDrawerHeight={detailDrawerHeight}
        detailDrawerRight={detailDrawerRight}
        detailDrawerTop={detailDrawerTop}
      />
    );
  }

  return (
    <div
      style={{
        width: isPortrait ? "100%" : "380px",
        height: detailDrawerHeight,
        position: "fixed",
        right: detailDrawerRight,
        top: detailDrawerTop,
        background: "#ffffff",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        padding: "14px",
        paddingBottom: "130px",
        boxShadow: "var(--shadow-panel)",
        borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
        borderRadius: isPortrait ? 0 : 18,
        transition: "all 0.35s ease",
        fontSize: "10px",
      }}
    >
      {/* Close button */}
      <div style={{ position: "absolute", top: 12, left: 14, zIndex: 2000 }}>
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          style={{
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.42)",
            borderRadius: 999,
            backdropFilter: "blur(6px)",
            fontSize: 24,
            fontWeight: 700,
            color: "#ffffff",
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
            boxShadow: "0 8px 22px rgba(15, 23, 42, 0.18)",
          }}
        >
          ×
        </button>
      </div>

      {/* Expand button */}
      <div style={{ position: "absolute", top: 8, right: 14, zIndex: 2000 }}>
        <button
          onClick={onExpand}
          aria-label="Expand student profile"
          title="Expand"
          style={{
            border: "1px solid var(--border-strong)",
            background: "var(--surface-panel)",
            color: "var(--accent-strong)",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          ⤢
        </button>
      </div>

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
          margin: "-14px -14px 12px",
          padding: "16px 10px",
          textAlign: "center",
        }}
      >
        <ProfileAvatar
          imageUrl={selectedStudent.profileImage}
          name={selectedStudent.name}
          size={70}
          style={{ margin: "0 auto 10px", border: "3px solid rgba(255,255,255,0.8)" }}
        />

        <h2 style={{ margin: 0, color: "#ffffff", fontSize: 14, fontWeight: 800 }}>
          {selectedStudent.name}
        </h2>
        <p style={{ margin: "4px 0", color: "#dbeafe", fontSize: "10px" }}>
          {selectedStudent.studentId}
        </p>
        <p style={{ margin: 0, color: "#dbeafe", fontSize: "10px" }}>
          Grade {selectedStudent.grade} - Section {selectedStudent.section}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-soft)", marginBottom: "10px" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStudentTab(tab)}
            style={{
              flex: 1,
              padding: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              color: studentTab === tab ? "var(--accent-strong)" : "var(--text-muted)",
              fontSize: "10px",
              borderBottom:
                studentTab === tab ? "3px solid var(--accent-strong)" : "3px solid transparent",
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {studentTab === "details" && (
          <StudentDetailsTab
            selectedStudent={selectedStudent}
            editingProfile={editingProfile}
            editForm={editForm}
            setEditForm={setEditForm}
            savingProfile={savingProfile}
            startEditProfile={startEditProfile}
            saveProfileEdits={saveProfileEdits}
            cancelEditProfile={cancelEditProfile}
          />
        )}

        {studentTab === "attendance" && (
          <StudentAttendanceTab
            attendanceBySubject={attendanceBySubject}
            attendanceView={attendanceView}
            setAttendanceView={setAttendanceView}
            attendanceCourseFilter={attendanceCourseFilter}
            expandedCards={expandedCards}
            toggleExpand={toggleExpand}
            getProgress={getProgress}
            formatSubjectName={formatSubjectName}
          />
        )}

        {studentTab === "performance" && (
          <StudentPerformanceTab
            studentMarksFlattened={studentMarksFlattened}
            activeSemester={activeSemester}
            setActiveSemester={setActiveSemester}
          />
        )}

        {studentTab === "payment" && (
          <StudentPaymentTab
            selectedStudent={selectedStudent}
            paymentHistory={paymentHistory}
          />
        )}
      </div>

      <StudentChatActionButtons
        selectedStudent={selectedStudent}
        studentChatOpen={studentChatOpen}
        stackChatActions={stackChatActions}
      />

      <StudentChatPopup
        open={studentChatOpen}
        selectedStudent={selectedStudent}
        onClose={() => setStudentChatOpen(false)}
        popupMessages={popupMessages}
        adminUserId={adminUserId}
        messagesEndRef={messagesEndRef}
        newMessageText={newMessageText}
        setNewMessageText={setNewMessageText}
        sendMessage={sendMessage}
      />
    </div>
  );
}
