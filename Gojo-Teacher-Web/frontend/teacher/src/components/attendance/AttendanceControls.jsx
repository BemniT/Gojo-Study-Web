import React from "react";

function AttendanceControls({
  isMobile,
  selectedCourseLabel,
  autoSaveEnabled,
  setAutoSaveEnabled,
  manualModeSwitchLocked,
  manualModeSwitchMessage,
  selectedCourse,
  courses,
  setSelectedCourseId,
  date,
  setDate,
  prepareAttendanceContextSwitch,
  ATTENDANCE_AUTOSAVE_DELAY_MS,
}) {
  return (
    <>
      <div
        style={{
          marginBottom: 14,
          background: "linear-gradient(135deg, #eff6ff, #f8fafc)",
          border: "1px solid var(--border-soft)",
          borderRadius: 14,
          padding: isMobile ? "10px 12px" : "12px 14px",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 800, color: "var(--text-secondary)", fontSize: 12, letterSpacing: "0.02em" }}>
          ACTIVE COURSE
        </span>
        <span
          style={{
            background: "#ffffff",
            border: "1px solid #dbeafe",
            color: "var(--text-primary)",
            borderRadius: 999,
            padding: "6px 11px",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {selectedCourseLabel}
        </span>

        <div
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "#ffffff",
            border: "1px solid #dbeafe",
            borderRadius: 999,
            padding: "6px 8px 6px 12px",
          }}
        >
          <span style={{ fontWeight: 800, color: "#334155", fontSize: 12, whiteSpace: "nowrap" }}>
            Auto Save {autoSaveEnabled ? "On" : "Off"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autoSaveEnabled}
            onClick={() => setAutoSaveEnabled((previousValue) => !previousValue)}
            style={{
              position: "relative",
              width: 52,
              height: 30,
              borderRadius: 999,
              border: autoSaveEnabled ? "1px solid #007AFB" : "1px solid #cbd5e1",
              background: autoSaveEnabled ? "#007AFB" : "#e2e8f0",
              cursor: "pointer",
              transition: "all 0.2s ease",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 3,
                left: autoSaveEnabled ? 25 : 3,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.16)",
                transition: "left 0.2s ease",
              }}
            />
          </button>
        </div>
      </div>

      <div
        style={{
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--surface-panel)",
          border: "1px solid var(--border-soft)",
          boxShadow: "var(--shadow-soft)",
          borderRadius: 14,
          padding: isMobile ? "12px" : "14px 16px",
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 13 }}>Select Course:</label>
        <select
          value={selectedCourse?.id || ""}
          disabled={manualModeSwitchLocked}
          onChange={async (event) => {
            const nextCourseId = event.target.value;
            const didContinue = await prepareAttendanceContextSwitch();
            if (!didContinue) return;
            setSelectedCourseId(nextCourseId);
          }}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid var(--border-strong)",
            outline: "none",
            background: "#f8fafc",
            minWidth: isMobile ? "100%" : "280px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            opacity: manualModeSwitchLocked ? 0.75 : 1,
            cursor: manualModeSwitchLocked ? "not-allowed" : "pointer",
          }}
        >
          <option value="">-- Select Course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {(course.subject || course.name || "Course")} - Grade {course.grade} Section {course.section}
            </option>
          ))}
        </select>

        <label style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 13 }}>Date:</label>
        <input
          type="date"
          value={date}
          disabled={manualModeSwitchLocked}
          onChange={async (event) => {
            const nextDate = event.target.value;
            const didContinue = await prepareAttendanceContextSwitch();
            if (!didContinue) return;
            setDate(nextDate);
          }}
          style={{
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid var(--border-strong)",
            outline: "none",
            background: "#f8fafc",
            color: "var(--text-primary)",
            fontWeight: 600,
            opacity: manualModeSwitchLocked ? 0.75 : 1,
            cursor: manualModeSwitchLocked ? "not-allowed" : "pointer",
          }}
        />

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 999,
            background: autoSaveEnabled ? "#eff6ff" : "#f8fafc",
            border: autoSaveEnabled ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
            color: autoSaveEnabled ? "#1d4ed8" : "#475569",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {autoSaveEnabled
            ? `Changes save automatically after ${ATTENDANCE_AUTOSAVE_DELAY_MS / 1000}s.`
            : "Auto-save is off. Use Save Attendance to keep your updates."}
        </span>

        {manualModeSwitchLocked && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 12px",
              borderRadius: 999,
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#9a3412",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {manualModeSwitchMessage}
          </span>
        )}
      </div>
    </>
  );
}

export default AttendanceControls;
