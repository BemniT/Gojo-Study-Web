import React from "react";

const VIEWS = ["daily", "weekly", "monthly"];

const STATUS_BG = {
  present: "var(--success-soft)",
  late: "var(--warning-soft)",
};

const STATUS_FG = {
  present: "var(--success)",
  late: "var(--warning)",
};

const statusBackground = (status) => STATUS_BG[status] || "var(--danger-soft)";
const statusForeground = (status) => STATUS_FG[status] || "var(--danger)";

export default function StudentAttendanceTab({
  attendanceBySubject,
  attendanceView,
  setAttendanceView,
  attendanceCourseFilter = "All",
  expandedCards,
  toggleExpand,
  getProgress,
  formatSubjectName,
}) {
  return (
    <div
      style={{
        padding: "12px",
        background: "var(--surface-panel)",
        borderRadius: 12,
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10 }}>
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setAttendanceView(v)}
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              border: "none",
              fontWeight: 700,
              fontSize: 10,
              cursor: "pointer",
              background: attendanceView === v ? "var(--accent-strong)" : "var(--surface-strong)",
              color: attendanceView === v ? "#fff" : "var(--text-primary)",
            }}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      {Object.entries(attendanceBySubject)
        .filter(
          ([course]) => attendanceCourseFilter === "All" || course === attendanceCourseFilter
        )
        .map(([course, records]) => {
          const today = new Date().toDateString();
          const now = new Date();
          const weekRecords = records.filter(
            (r) => new Date(r.date).getWeek?.() === now.getWeek?.()
          );
          const monthRecords = records.filter(
            (r) => new Date(r.date).getMonth() === now.getMonth()
          );
          const displayRecords =
            attendanceView === "daily"
              ? records.filter((r) => new Date(r.date).toDateString() === today)
              : attendanceView === "weekly"
              ? weekRecords
              : monthRecords;
          const progress = getProgress(displayRecords);
          const expandKey = `${attendanceView}-${course}`;

          return (
            <div
              key={course}
              onClick={() => toggleExpand(expandKey)}
              style={{
                cursor: "pointer",
                background: "var(--surface-panel)",
                borderRadius: 12,
                padding: 12,
                marginBottom: 10,
                border: "1px solid var(--border-soft)",
                boxShadow: "var(--shadow-soft)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>
                    {formatSubjectName(course)}
                  </h3>
                  <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--text-muted)" }}>
                    {records[0]?.teacherName}
                  </p>
                </div>
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 800,
                    background: "var(--accent-soft)",
                    color: "var(--accent-strong)",
                    border: "1px solid var(--border-strong)",
                  }}
                >
                  {progress}%
                </div>
              </div>

              <div
                onClick={() => toggleExpand(expandKey)}
                style={{
                  height: 8,
                  background: "var(--surface-strong)",
                  borderRadius: 999,
                  cursor: "pointer",
                  overflow: "hidden",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "var(--accent-strong)",
                    transition: "width .3s ease",
                  }}
                />
              </div>

              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12 }}>
                Click to view {attendanceView.toUpperCase()} details
              </div>

              {expandedCards[expandKey] && (
                <div
                  style={{
                    marginTop: 14,
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  {displayRecords.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 6px",
                        borderBottom:
                          i !== displayRecords.length - 1 ? "1px solid var(--border-soft)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 10, color: "var(--text-primary)" }}>
                          {new Date(r.date).toDateString()}
                        </span>
                      </div>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 800,
                          background: statusBackground(r.status),
                          color: statusForeground(r.status),
                        }}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
