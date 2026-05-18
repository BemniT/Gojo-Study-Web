import React from "react";
import { FixedSizeList as List } from "react-window";

function AttendanceTab({
  selectedStudent,
  attendanceLoading,
  attendanceView,
  setAttendanceView,
  attendanceBySubject,
  attendanceCourseFilter,
  attendanceSummary,
  getLatestRecordDate,
  getProgress,
  toggleExpand,
  expandedCards,
  formatSubjectName,
}) {
  if (!selectedStudent) return null;

  return (
    <div
      style={{
        padding: 12,
        background: "var(--surface-panel)",
        borderRadius: 12,
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {attendanceLoading && (
        <div style={{ marginBottom: 10, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
          Loading attendance...
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {["daily", "weekly", "monthly"].map((v) => (
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

      {(() => {
        const subjectEntries = Object.entries(attendanceBySubject).filter(
          ([course]) => attendanceCourseFilter === "All" || course === attendanceCourseFilter
        );

        if (subjectEntries.length === 0) {
          return (
            <div
              style={{
                marginTop: 8,
                border: "1px dashed #bfdbfe",
                borderRadius: 12,
                padding: "18px 12px",
                textAlign: "center",
                background: "#f8fbff",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>
                No attendance records
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                There are no attendance entries yet for this student.
              </div>
            </div>
          );
        }

        return subjectEntries.map(([course, records]) => {
          const latestRecordDate = getLatestRecordDate(records) || new Date();
          const displayRecords = attendanceSummary.getRecordsForView(records, attendanceView);
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
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "transparent",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 18,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatSubjectName(course)}
                  </h3>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 10,
                      color: "var(--text-muted)",
                    }}
                  >
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
                  marginBottom: 8,
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

              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  letterSpacing: 0.3,
                }}
              >
                Click to view {attendanceView.toUpperCase()} details
              </div>

              {expandedCards[expandKey] && (
                <div
                  style={{
                    marginTop: 8,
                    background: "var(--surface-muted)",
                    borderRadius: 12,
                    padding: 10,
                    overflow: "hidden",
                  }}
                >
                  {displayRecords.length > 0 ? (
                    <List
                      height={Math.min(displayRecords.length * 28, 280)}
                      itemCount={displayRecords.length}
                      itemSize={28}
                      width="100%"
                    >
                      {({ index, style }) => {
                        const r = displayRecords[index];
                        return (
                          <div
                            style={{
                              ...style,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 6px",
                              borderBottom:
                                index !== displayRecords.length - 1
                                  ? "1px solid var(--border-soft)"
                                  : "none",
                              boxSizing: "border-box",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 10, color: "var(--text-primary)" }}>
                                📅 {new Date(r.date).toDateString()}
                              </span>
                            </div>

                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: 999,
                                fontSize: 10,
                                fontWeight: 800,
                                background:
                                  r.status === "present"
                                    ? "#dcfce7"
                                    : r.status === "late"
                                    ? "#fef3c7"
                                    : "#fee2e2",
                                color:
                                  r.status === "present"
                                    ? "#166534"
                                    : r.status === "late"
                                    ? "#92400e"
                                    : "#991b1b",
                              }}
                            >
                              {r.status.toUpperCase()}
                            </span>
                          </div>
                        );
                      }}
                    </List>
                  ) : (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "8px 6px" }}>
                      No records for selected period
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        });
      })()}
    </div>
  );
}

export default AttendanceTab;
