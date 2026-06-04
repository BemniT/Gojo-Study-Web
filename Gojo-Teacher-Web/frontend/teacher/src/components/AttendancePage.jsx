import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../styles/global.css";
import AttendanceControls from "./attendance/AttendanceControls";
import AttendanceTable from "./attendance/AttendanceTable";
import styles from "./attendance/AttendancePage.module.css";
import { API_BASE } from "../api/apiConfig";
import { getRtdbRoot, RTDB_BASE_RAW } from "../api/rtdbScope";
import { getTeacherCourseContext } from "../api/teacherApi";
import { resolveTeacherSchoolCode } from "../utils/teacherData";
const RTDB_BASE = getRtdbRoot();
const TEACHER_BEFORE_APP_NAVIGATION_HANDLER = "__teacherBeforeAppNavigation";

const getViewportWidth = () => (typeof window !== "undefined" ? window.innerWidth : 1024);

const getStoredTeacher = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("teacher");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    window.__gojoClearTeacherState?.();
    return null;
  }
};

const normalizeCourseSubject = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toTitleCase = (value) =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const parseVirtualCourseFromId = (courseId) => {
  const normalized = String(courseId || "").trim();
  if (!normalized.startsWith("course_")) {
    return {
      id: normalized,
      subject: normalized,
      name: normalized,
      grade: "",
      section: "",
      virtual: true,
    };
  }

  const body = normalized.slice("course_".length);
  const parts = body.split("_").filter(Boolean);
  const gradeSection = parts.at(-1) || "";
  const match = gradeSection.match(/^(\d+)([A-Za-z].*)$/);
  const subjectRaw = normalizeCourseSubject(parts.slice(0, -1).join(" "));

  return {
    id: normalized,
    subject: toTitleCase(subjectRaw),
    name: toTitleCase(subjectRaw),
    grade: match?.[1] || "",
    section: String(match?.[2] || "").toUpperCase(),
    virtual: true,
  };
};

const getStudentGrade = (student = {}) =>
  String(
    student?.grade ||
      student?.basicStudentInformation?.grade ||
      student?.academicSetup?.grade ||
      ""
  ).trim();

const getStudentSection = (student = {}) =>
  String(
    student?.section ||
      student?.basicStudentInformation?.section ||
      student?.academicSetup?.section ||
      ""
  )
    .trim()
    .toUpperCase();

const ATTENDANCE_AUTOSAVE_STORAGE_KEY = "teacher_attendance_auto_save_enabled";
const ATTENDANCE_AUTOSAVE_DELAY_MS = 900;

const getStoredAutoSaveEnabled = () => {
  if (typeof window === "undefined") return true;

  try {
    const raw = localStorage.getItem(ATTENDANCE_AUTOSAVE_STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
};

const serializeAttendance = (attendanceMap = {}) =>
  JSON.stringify(
    Object.keys(attendanceMap || {})
      .sort((leftKey, rightKey) => String(leftKey).localeCompare(String(rightKey)))
      .reduce((result, key) => {
        result[key] = attendanceMap[key];
        return result;
      }, {})
  );

const saveAttendanceRecord = async ({ baseUrl, courseId, selectedDate, attendanceData }) =>
  axios.put(`${baseUrl}/Attendance/${courseId}/${selectedDate}.json`, attendanceData);

const formatSavedTime = (value) => {
  if (!value) return "";

  const savedDate = new Date(value);
  if (Number.isNaN(savedDate.getTime())) return "";

  return savedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AttendancePage() {
  const findUserByUserId = (usersObj, userId) => {
    if (!usersObj || !userId) return null;

    if (usersObj[userId]) return usersObj[userId];

    const targetUserId = String(userId || "").trim();
    const matchByUserId = Object.values(usersObj).find(
      (user) => String(user?.userId || "").trim() === targetUserId
    );

    return matchByUserId || null;
  };

  const [sidebarOpen, setSidebarOpen] = useState(() => getViewportWidth() > 600);
  const [isMobile, setIsMobile] = useState(() => getViewportWidth() <= 600);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => getStoredAutoSaveEnabled());
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [savedAttendanceSignature, setSavedAttendanceSignature] = useState(() => serializeAttendance({}));
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courses, setCourses] = useState([]);
  const [rtdbBase, setRtdbBase] = useState("");
  const [schoolBaseResolved, setSchoolBaseResolved] = useState(false);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [showMessenger, setShowMessenger] = useState(false);
  const autoSaveTimerRef = useRef(null);
  const hydratingAttendanceRef = useRef(false);
  const attendanceSignature = serializeAttendance(attendance);
  const hasUnsavedChanges = attendanceSignature !== savedAttendanceSignature;
  const manualModeSwitchLocked = !autoSaveEnabled && hasUnsavedChanges;
  const manualModeSwitchMessage = "Save Attendance before changing course or date while Auto Save is off.";

  useEffect(() => {
    const handleResize = () => {
      const width = getViewportWidth();
      setSidebarOpen(width > 600);
      setIsMobile(width <= 600);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () =>
      window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const storedTeacher = getStoredTeacher();
    if (!storedTeacher) {
      navigate("/login");
      return;
    }
    setTeacher(storedTeacher);
  }, [navigate]);

  useEffect(() => {
    const resolveSchoolBase = async () => {
      if (!teacher) return;
      setSchoolBaseResolved(false);

      if (!teacher?.schoolCode) {
        setRtdbBase(RTDB_BASE);
        setSchoolBaseResolved(true);
        return;
      }

      const resolvedSchoolCode = await resolveTeacherSchoolCode(teacher.schoolCode);
      setRtdbBase(`${RTDB_BASE_RAW}/Platform1/Schools/${resolvedSchoolCode}`);
      setSchoolBaseResolved(true);
    };

    resolveSchoolBase();
  }, [teacher]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ATTENDANCE_AUTOSAVE_STORAGE_KEY, String(autoSaveEnabled));
  }, [autoSaveEnabled]);

  useEffect(() => {
    if (!teacher || !schoolBaseResolved || !rtdbBase) return;
    const fetchCourses = async () => {
      try {
        const context = await getTeacherCourseContext({ teacher, rtdbBase });
        let teacherCourses = (context.courses || []).map((course) => {
          const defaults = parseVirtualCourseFromId(course?.id);
          return {
            ...course,
            id: course?.id || defaults.id,
            subject: course?.subject || course?.name || defaults.subject,
            name: course?.name || course?.subject || defaults.name,
            grade: String(course?.grade || defaults.grade || "").trim(),
            section: String(course?.section || course?.secation || defaults.section || "")
              .trim()
              .toUpperCase(),
          };
        });

        setCourses(teacherCourses);
        if (teacherCourses.length > 0) {
          setSelectedCourseId((prev) => {
            if (prev && teacherCourses.some((c) => c.id === prev)) return prev;
            return teacherCourses[0].id;
          });
          setError("");
        } else {
          setSelectedCourseId("");
          setStudents([]);
          setLoading(false);
          setError("No assigned course found for this teacher.");
        }
      } catch (err) {
        console.error("Error fetching courses:", err);
        setLoading(false);
        setError("Failed to load courses. Please try again.");
      }
    };
    fetchCourses();
  }, [teacher, schoolBaseResolved, rtdbBase]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;

  useEffect(() => {
    if (!schoolBaseResolved || !rtdbBase) return;
    if (!selectedCourse) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE}/course/${encodeURIComponent(selectedCourse.id)}/students`, {
          params: {
            schoolCode: teacher?.schoolCode || "",
            includeMarks: false,
          },
        });

        const filtered = Array.isArray(response?.data?.students) ? response.data.students : [];

        setStudents(
          filtered.map((student) => ({
            studentId: String(student?.studentId || "").trim(),
            userId: String(student?.userId || "").trim(),
            name: String(student?.name || student?.username || "Student").trim() || "Student",
            profileImage: student?.profileImage || "",
          }))
        );
        setError("");
      } catch (err) {
        setError("Failed to fetch students. Please try again.");
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedCourse, schoolBaseResolved, rtdbBase]);

  useEffect(() => {
    if (!selectedCourse || !schoolBaseResolved || !rtdbBase) {
      hydratingAttendanceRef.current = true;
      setAttendance({});
      setSavedAttendanceSignature(serializeAttendance({}));
      setSaveState("idle");
      setSaveError("");
      setLastSavedAt(null);
      return;
    }

    const fetchAttendance = async () => {
      try {
        const res = await axios.get(
          `${rtdbBase}/Attendance/${selectedCourse.id}/${date}.json`
        );
        const nextAttendance = res.data || {};
        hydratingAttendanceRef.current = true;
        setAttendance(nextAttendance);
        setSavedAttendanceSignature(serializeAttendance(nextAttendance));
        setSaveState("idle");
        setSaveError("");
        setLastSavedAt(null);
      } catch (err) {
        hydratingAttendanceRef.current = true;
        setAttendance({});
        setSavedAttendanceSignature(serializeAttendance({}));
        setSaveState("idle");
        setSaveError("");
        setLastSavedAt(null);
      }
    };
    fetchAttendance();
  }, [selectedCourse, date, schoolBaseResolved, rtdbBase]);

  useEffect(() => {
    if (!autoSaveEnabled && saveState === "pending") {
      setSaveState(hasUnsavedChanges ? "idle" : "saved");
    }
  }, [autoSaveEnabled, hasUnsavedChanges, saveState]);

  useEffect(() => {
    if (hydratingAttendanceRef.current) {
      hydratingAttendanceRef.current = false;
      return;
    }

    if (!autoSaveEnabled || !selectedCourse || !schoolBaseResolved || !rtdbBase) return;
    if (!hasUnsavedChanges) return;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    setSaveState("pending");
    setSaveError("");

    autoSaveTimerRef.current = window.setTimeout(async () => {
      autoSaveTimerRef.current = null;
      setSaveState("saving");

      try {
        await saveAttendanceRecord({
          baseUrl: rtdbBase,
          courseId: selectedCourse.id,
          selectedDate: date,
          attendanceData: attendance,
        });

        setSavedAttendanceSignature(attendanceSignature);
        setLastSavedAt(new Date().toISOString());
        setSaveState("saved");
      } catch (err) {
        console.error("Failed to auto-save attendance:", err);
        setSaveState("error");
        setSaveError("Auto-save failed. Your recent attendance changes are not saved yet.");
      }
    }, ATTENDANCE_AUTOSAVE_DELAY_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    attendance,
    attendanceSignature,
    autoSaveEnabled,
    date,
    hasUnsavedChanges,
    rtdbBase,
    schoolBaseResolved,
    selectedCourse,
  ]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []);

  const handleMark = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const persistAttendance = async ({
    silent = false,
    successMessage = "Attendance saved successfully!",
    failureMessage = "Failed to save attendance",
    saveErrorMessage = "Manual save failed. Please try again.",
  } = {}) => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (!selectedCourse) {
      if (!silent) {
        alert("Please select a course");
      }
      return false;
    }

    if (silent && !hasUnsavedChanges) {
      return true;
    }

    setSaveState("saving");
    setSaveError("");

    try {
      await saveAttendanceRecord({
        baseUrl: rtdbBase,
        courseId: selectedCourse.id,
        selectedDate: date,
        attendanceData: attendance,
      });

      setSavedAttendanceSignature(attendanceSignature);
      setLastSavedAt(new Date().toISOString());
      setSaveState("saved");

      if (!silent) {
        alert(successMessage);
      }

      return true;
    } catch (err) {
      console.error(silent ? "Failed to save attendance before continuing:" : "Failed to save attendance:", err);
      setSaveState("error");
      setSaveError(saveErrorMessage);

      if (!silent) {
        alert(failureMessage);
      }

      return false;
    }
  };

  const flushPendingAttendance = async (options = {}) => {
    if (!hasUnsavedChanges) {
      return true;
    }

    return persistAttendance({
      silent: true,
      successMessage: "",
      failureMessage: options.failureMessage || "Failed to save attendance",
      saveErrorMessage:
        options.saveErrorMessage ||
        "Could not save current attendance before switching. Please save and try again.",
    });
  };

  const prepareAttendanceContextSwitch = async () => {
    if (manualModeSwitchLocked) {
      alert(manualModeSwitchMessage);
      return false;
    }

    return flushPendingAttendance({
      failureMessage: "Failed to save attendance before switching",
      saveErrorMessage: "Could not save current attendance before switching. Please save and try again.",
    });
  };

  const handleSave = async () => {
    await persistAttendance({
      silent: false,
      successMessage: "Attendance saved successfully!",
      failureMessage: "Failed to save attendance",
      saveErrorMessage: "Manual save failed. Please try again.",
    });
  };

  const handleLogout = async () => {
    const didFlush = await flushPendingAttendance({
      failureMessage: "Failed to save attendance before logging out",
      saveErrorMessage: "Could not save current attendance before logging out. Please save and try again.",
    });
    if (!didFlush) return;

    await (window.__gojoTeacherLogout?.() ?? Promise.resolve());
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleBeforeAppNavigation = async (intent = {}) => {
      if (!hasUnsavedChanges) {
        return true;
      }

      if (!autoSaveEnabled) {
        alert(
          intent.type === "logout"
            ? "Save Attendance before logging out while Auto Save is off."
            : "Save Attendance before leaving this page while Auto Save is off."
        );
        return false;
      }

      return flushPendingAttendance({
        failureMessage:
          intent.type === "logout"
            ? "Failed to save attendance before logging out"
            : "Failed to save attendance before leaving this page",
        saveErrorMessage:
          intent.type === "logout"
            ? "Could not save current attendance before logging out. Please save and try again."
            : "Could not save current attendance before leaving this page. Please save and try again.",
      });
    };

    window[TEACHER_BEFORE_APP_NAVIGATION_HANDLER] = handleBeforeAppNavigation;

    return () => {
      if (window[TEACHER_BEFORE_APP_NAVIGATION_HANDLER] === handleBeforeAppNavigation) {
        delete window[TEACHER_BEFORE_APP_NAVIGATION_HANDLER];
      }
    };
  }, [autoSaveEnabled, flushPendingAttendance, hasUnsavedChanges]);

  // Responsive table CSS, reinforces white background
  useEffect(() => {
    const styleId = "responsive-attendance-table";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @media (max-width: 600px) {
        .attendance-main-content-responsive {
          margin-left: 0 !important;
          width: 100vw !important;
          max-width: 100vw !important;
          padding: 8px 2vw !important;
          border-radius: 0 !important;
        }
        .attendance-table-wrapper {
          width: 100vw !important;
          max-width: 100vw !important;
          overflow-x: auto !important;
          padding: 0 1vw !important;
          background: #fff !important;
        }
        .attendance-table {
          min-width: 480px !important;
          width: auto !important;
          max-width: 100vw !important;
          table-layout: auto !important;
          overflow-x: auto !important;
          background: #fff !important;
        }
        .attendance-table th, .attendance-table td {
          font-size: 13px !important;
          padding: 7px !important;
          white-space: normal !important;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const selectedCourseLabel = selectedCourse
    ? `${selectedCourse.subject || selectedCourse.name || "Course"} ΓÇó Grade ${selectedCourse.grade} Section ${selectedCourse.section}`
    : "No course selected";

  const getStatusButtonStyle = (studentId, statusType) => {
    const active = attendance[studentId] === statusType;
    const palette =
      statusType === "present"
        ? { activeBg: "#16a34a", activeText: "#ffffff" }
        : statusType === "absent"
          ? { activeBg: "#dc2626", activeText: "#ffffff" }
          : { activeBg: "#d97706", activeText: "#ffffff" };

    return {
      background: active ? palette.activeBg : "#f1f5f9",
      color: active ? palette.activeText : "#334155",
      padding: "8px 14px",
      border: active ? "1px solid transparent" : "1px solid #cbd5e1",
      borderRadius: "999px",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 12,
      minWidth: 86,
      boxShadow: active ? "0 6px 14px rgba(15, 23, 42, 0.16)" : "none",
      transition: "all 0.15s ease",
    };
  };

  const headerMetaPillStyle = {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#334155",
    fontWeight: 700,
    fontSize: 12,
  };

  const saveStatusText =
    saveState === "saving"
      ? "Saving attendance..."
      : saveState === "pending"
        ? "Auto-save queued..."
        : saveState === "error"
          ? saveError || "Save failed"
          : hasUnsavedChanges
            ? autoSaveEnabled
              ? "Unsaved changes detected"
              : "Unsaved changes"
            : lastSavedAt
              ? `Saved at ${formatSavedTime(lastSavedAt)}`
              : autoSaveEnabled
                ? "Auto-save is on"
                : "Auto-save is off";

  const saveStatusStyle = {
    ...headerMetaPillStyle,
    background:
      saveState === "error"
        ? "#fef2f2"
        : saveState === "saving" || saveState === "pending"
          ? "#eff6ff"
          : hasUnsavedChanges
            ? "#fff7ed"
            : "#f8fafc",
    border:
      saveState === "error"
        ? "1px solid #fecaca"
        : saveState === "saving" || saveState === "pending"
          ? "1px solid #bfdbfe"
          : hasUnsavedChanges
            ? "1px solid #fdba74"
            : "1px solid #e2e8f0",
    color:
      saveState === "error"
        ? "#b91c1c"
        : saveState === "saving" || saveState === "pending"
          ? "#1d4ed8"
          : hasUnsavedChanges
            ? "#9a3412"
            : "#334155",
  };

  return (
    <div
      className="dashboard-page"
      style={{
        background: "var(--page-bg)",
        minHeight: "100vh",
        height: "100vh",
        overflow: "hidden",
        color: "var(--text-primary)",
        "--surface-panel": "#ffffff",
        "--surface-accent": "#eff6ff",
        "--surface-muted": "#ffffff",
        "--surface-strong": "#e2e8f0",
        "--page-bg": "#ffffff",
        "--border-soft": "#e2e8f0",
        "--border-strong": "#cbd5e1",
        "--text-primary": "#0f172a",
        "--text-secondary": "#334155",
        "--text-muted": "#64748b",
        "--accent": "#2563eb",
        "--accent-soft": "#dbeafe",
        "--accent-strong": "#007AFB",
        "--sidebar-width": "clamp(230px, 16vw, 290px)",
        "--shadow-soft": "0 10px 24px rgba(15, 23, 42, 0.08)",
        "--shadow-panel": "0 14px 30px rgba(15, 23, 42, 0.10)",
      }}
    >
      <div className="google-dashboard" style={{ display: "flex", gap: 10, padding: "10px", height: "calc(100vh - 73px)", overflow: "hidden", background: "#ffffff" }}>
        <Sidebar
          active="attendance"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          teacher={teacher}
          handleLogout={handleLogout}
        />

        <div
          className="teacher-sidebar-spacer"
          style={{
            width: "var(--sidebar-width)",
            minWidth: "var(--sidebar-width)",
            flex: "0 0 var(--sidebar-width)",
            pointerEvents: "none",
          }}
        />

        <div
          className="attendance-main-content-responsive"
          style={{
            flex: 1,
            width: "100%",
            minWidth: 0,
            height: "100%",
            marginLeft: 0,
            padding: 0,
            overflowY: "auto",
            overflowX: "hidden",
            background: "#ffffff",
            scrollPaddingBottom: 32,
          }}
        >
          <div className={`main-inner ${styles.mainInner}`} style={{ padding: isMobile ? "10px 2vw 64px" : "16px 18px 72px" }}>
            <div className={`section-header-card ${styles.headerCard}`}>
              <h2 className="section-header-card__title" style={{ fontSize: 24 }}>Attendance</h2>
              <div className="section-header-card__meta">
                <span style={headerMetaPillStyle}>{students.length} Students</span>
                <span style={headerMetaPillStyle}>{date}</span>
                <span style={saveStatusStyle}>{saveStatusText}</span>
                <span className="section-header-card__chip">Teacher View</span>
              </div>
            </div>

            <AttendanceControls
              isMobile={isMobile}
              selectedCourseLabel={selectedCourseLabel}
              autoSaveEnabled={autoSaveEnabled}
              setAutoSaveEnabled={setAutoSaveEnabled}
              manualModeSwitchLocked={manualModeSwitchLocked}
              manualModeSwitchMessage={manualModeSwitchMessage}
              selectedCourse={selectedCourse}
              courses={courses}
              setSelectedCourseId={setSelectedCourseId}
              date={date}
              setDate={setDate}
              prepareAttendanceContextSwitch={prepareAttendanceContextSwitch}
              ATTENDANCE_AUTOSAVE_DELAY_MS={ATTENDANCE_AUTOSAVE_DELAY_MS}
            />

            <AttendanceTable
              loading={loading}
              error={error}
              selectedCourse={selectedCourse}
              students={students}
              handleMark={handleMark}
              getStatusButtonStyle={getStatusButtonStyle}
              isMobile={isMobile}
            />

            <div className={styles.footerCard}>
              <span className={styles.footerText}>
                {autoSaveEnabled
                  ? hasUnsavedChanges
                    ? "Attendance changes will save automatically unless auto-save is turned off."
                    : "Auto-save is active for this attendance sheet."
                  : "Mark attendance and use Save Attendance when you are ready."}
              </span>
              <button
                className={styles.saveBtn}
                style={{
                  cursor: saveState === "saving" ? "default" : "pointer",
                  opacity: saveState === "saving" ? 0.72 : 1,
                }}
                disabled={saveState === "saving"}
                onClick={handleSave}
              >
                {saveState === "saving" ? "Saving..." : "Save Attendance"}
              </button>
            </div>

            <div style={{ height: isMobile ? 28 : 36, flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
