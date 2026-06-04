import React from "react";
import { FaFileExcel, FaSave } from "react-icons/fa";

function MarksControls({
  isMobile,
  courses,
  selectedCourseId,
  setSelectedCourseId,
  manualModeSwitchLocked,
  manualModeSwitchMessage,
  prepareMarksContextSwitch,
  autoSaveEnabled,
  setAutoSaveEnabled,
  activeSemester,
  setActiveSemester,
  setStructureSubmitted,
  setAssessmentList,
  setStudentMarks,
  assessmentMode,
  quartersBySem,
  selectedQuarter,
  setSelectedQuarter,
  structureSubmitted,
  autoSaveStatus,
  autoSaveError,
  hasUnsavedChanges,
  lastAutoSavedAt,
  formatAutoSaveTime,
  AUTO_SAVE_DELAY_MS,
  downloadExcel,
  saveAllMarks,
  assessmentList,
}) {
  return (
    <>
      <div
        style={{
          marginBottom: 14,
          display: "flex",
          justifyContent: "flex-start",
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
        <label style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 14 }}>
          Select Course:
        </label>
        <select
          value={selectedCourseId}
          disabled={manualModeSwitchLocked}
          onChange={async (event) => {
            const nextCourseId = event.target.value;
            const didFlush = await prepareMarksContextSwitch();
            if (!didFlush) return;
            setSelectedCourseId(nextCourseId);
          }}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-panel)",
            minWidth: isMobile ? "100%" : "300px",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-primary)",
            opacity: manualModeSwitchLocked ? 0.75 : 1,
            cursor: manualModeSwitchLocked ? "not-allowed" : "pointer",
          }}
        >
          <option value="">-- Select Course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.subject} - Grade {course.grade} Section {course.section}
            </option>
          ))}
        </select>

        <div
          style={{
            marginLeft: isMobile ? 0 : "auto",
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

      {selectedCourseId && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            gap: 10,
            marginBottom: 14,
            borderBottom: "1px solid var(--border-soft)",
            paddingBottom: 8,
            overflowX: "auto",
          }}
        >
          {["semester1", "semester2"].map((semester) => {
            const isActive = activeSemester === semester;
            return (
              <button
                key={semester}
                disabled={manualModeSwitchLocked}
                onClick={async () => {
                  const didFlush = await prepareMarksContextSwitch();
                  if (!didFlush) return;
                  setActiveSemester(semester);
                  setStructureSubmitted(false);
                  setAssessmentList([]);
                  setStudentMarks({});
                }}
                style={{
                  background: isActive ? "var(--accent-soft)" : "var(--surface-panel)",
                  border: isActive
                    ? "1px solid color-mix(in srgb, var(--accent-strong) 34%, white)"
                    : "1px solid var(--border-soft)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: isActive ? "var(--accent-strong)" : "var(--text-muted)",
                  padding: "8px 12px",
                  borderRadius: 10,
                  whiteSpace: "nowrap",
                  opacity: manualModeSwitchLocked ? 0.65 : 1,
                  cursor: manualModeSwitchLocked ? "not-allowed" : "pointer",
                }}
              >
                {semester === "semester1" ? "Semester 1" : "Semester 2"}
              </button>
            );
          })}
        </div>
      )}

      {selectedCourseId && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            alignItems: "center",
            flexWrap: "wrap",
            background: "var(--surface-panel)",
            border: "1px solid #dbeafe",
            borderRadius: 16,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
            padding: isMobile ? "12px" : "12px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 13 }}>
              {assessmentMode === "quarter" ? "Quarter:" : "Mode:"}
            </span>
            {(quartersBySem[activeSemester] || ["q1", "q2"]).map((quarter) => (
              <button
                key={quarter}
                disabled={manualModeSwitchLocked}
                onClick={async () => {
                  const didFlush = await prepareMarksContextSwitch();
                  if (!didFlush) return;
                  setSelectedQuarter(quarter);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border:
                    selectedQuarter === quarter
                      ? "1px solid color-mix(in srgb, var(--accent-strong) 34%, white)"
                      : "1px solid var(--border-soft)",
                  background: selectedQuarter === quarter ? "var(--accent-soft)" : "var(--surface-panel)",
                  cursor: manualModeSwitchLocked ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  color: selectedQuarter === quarter ? "var(--accent-strong)" : "var(--text-muted)",
                  opacity: manualModeSwitchLocked ? 0.65 : 1,
                }}
              >
                {assessmentMode === "semester" ? "SEM" : quarter.toUpperCase()}
              </button>
            ))}
          </div>

          {structureSubmitted ? (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: autoSaveStatus === "error" ? "#b91c1c" : "#475569",
                  fontWeight: autoSaveStatus === "error" ? 700 : 600,
                }}
              >
                {autoSaveStatus === "error"
                  ? autoSaveError || "Auto-save failed. Use Save All to retry."
                  : manualModeSwitchLocked
                  ? manualModeSwitchMessage
                  : !autoSaveEnabled
                  ? "Auto-save is off. Use Save All to keep your updates."
                  : hasUnsavedChanges
                  ? `Changes save automatically after ${AUTO_SAVE_DELAY_MS / 1000} seconds.`
                  : lastAutoSavedAt
                  ? `Last saved at ${formatAutoSaveTime(lastAutoSavedAt)}.`
                  : "Changes save automatically as you type."}
              </div>

              <button
                onClick={() => downloadExcel()}
                style={{
                  padding: "10px 16px",
                  background: "var(--accent-strong)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  boxShadow: "0 12px 22px rgba(29, 78, 216, 0.26)",
                }}
                title="Download as Excel"
              >
                <FaFileExcel /> Download Excel
              </button>

              <button
                onClick={() => saveAllMarks()}
                disabled={!structureSubmitted || !assessmentList.length || (assessmentMode === "quarter" && selectedQuarter === "avg")}
                style={{
                  padding: "10px 16px",
                  background:
                    !structureSubmitted || !assessmentList.length || (assessmentMode === "quarter" && selectedQuarter === "avg")
                      ? "var(--surface-strong)"
                      : "var(--accent-strong)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor:
                    !structureSubmitted || !assessmentList.length || (assessmentMode === "quarter" && selectedQuarter === "avg")
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    !structureSubmitted || !assessmentList.length || (assessmentMode === "quarter" && selectedQuarter === "avg")
                      ? "none"
                      : "0 12px 22px rgba(29, 78, 216, 0.26)",
                }}
                title="Save all marks for current quarter"
              >
                <FaSave /> Save All
              </button>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}

export default MarksControls;
