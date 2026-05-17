import React from "react";

function PerformanceTab({
  semesterTabs,
  activeSemester,
  setActiveSemester,
  marksLoading,
  studentMarksFlattened,
  availableSemesters,
  activeQuarterViews,
  setActiveQuarterViews,
  formatQuarterLabel,
}) {
  return (
    <div
      style={{
        position: "relative",
        paddingBottom: "30px",
        background: "var(--surface-panel)",
        borderRadius: 12,
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginBottom: "12px",
          borderBottom: "1px solid var(--border-soft)",
          paddingBottom: "6px",
        }}
      >
        {semesterTabs.map((sem) => {
          const isActive = activeSemester === sem;
          return (
            <button
              key={sem}
              onClick={() => setActiveSemester(sem)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: 700,
                color: isActive ? "var(--accent-strong)" : "var(--text-muted)",
                padding: "6px 8px",
                borderBottom: isActive ? "2px solid var(--accent-strong)" : "2px solid transparent",
              }}
            >
              {String(sem).replace(/semester(\d+)/i, "Semester $1")}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "10px",
          padding: "10px",
        }}
      >
        {marksLoading ? (
          <div style={{ textAlign: "center", gridColumn: "1 / -1", padding: 12, color: "var(--text-muted)", fontSize: 11 }}>
            Loading performance...
          </div>
        ) : Object.keys(studentMarksFlattened || {}).length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 12,
              borderRadius: 12,
              background: "var(--surface-panel)",
              color: "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid var(--border-soft)",
              gridColumn: "1 / -1",
            }}
          >
            No performance records
          </div>
        ) : !availableSemesters.includes(activeSemester) ? (
          <div
            style={{
              textAlign: "center",
              padding: 12,
              borderRadius: 12,
              background: "var(--surface-panel)",
              color: "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid var(--border-soft)",
              gridColumn: "1 / -1",
            }}
          >
            No performance records for {String(activeSemester).replace(/semester(\d+)/i, "Semester $1")}
          </div>
        ) : (
          Object.entries(studentMarksFlattened)
            .filter(([, studentCourseData]) => Boolean(studentCourseData?.[activeSemester]))
            .map(([courseKey, studentCourseData], idx) => {
              const data = studentCourseData?.[activeSemester];
              if (!data) return null;

              const assessments = data.assessments || {};
              const total = Object.values(assessments).reduce((sum, a) => sum + (a.score || 0), 0);
              const maxTotal = Object.values(assessments).reduce((sum, a) => sum + (a.max || 0), 0);
              const percentage = maxTotal ? (total / maxTotal) * 100 : 0;

              const statusClr = percentage >= 75 ? "#16a34a" : percentage >= 50 ? "#f59e0b" : "#dc2626";

              const courseName = courseKey.replace("course_", "").replace(/_/g, " ").toUpperCase();

              const quarterEntriesPreview = Object.entries(data || {})
                .filter(([k, v]) => /^q\d+$/i.test(k) && v && typeof v === "object")
                .sort((a, b) => {
                  const na = parseInt(String(a[0]).replace(/^q/i, ""), 10) || 0;
                  const nb = parseInt(String(b[0]).replace(/^q/i, ""), 10) || 0;
                  return na - nb;
                });
              const hasQuarterFormatPreview = quarterEntriesPreview.length > 0;

              return (
                <div
                  key={`${courseKey}-${idx}`}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-soft)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      marginBottom: 10,
                      color: "var(--text-primary)",
                      textAlign: "left",
                    }}
                  >
                    {courseName}
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 800,
                      marginBottom: 10,
                      color: hasQuarterFormatPreview ? "#007AFB" : "#0f766e",
                      background: hasQuarterFormatPreview ? "#dbeafe" : "#ccfbf1",
                      border: "1px solid var(--border-soft)",
                    }}
                  >
                    {hasQuarterFormatPreview ? "Format: Quarter-based" : "Format: Semester-based"}
                  </div>

                  {(() => {
                    const quarterEntries = quarterEntriesPreview;
                    const hasQuarterFormat = hasQuarterFormatPreview;
                    const quarterStateKey = `${courseKey}__${activeSemester}`;
                    const defaultQuarterKey = quarterEntries[0]?.[0] || "";
                    const selectedQuarterKey = quarterEntries.some(([quarterKey]) => quarterKey === activeQuarterViews[quarterStateKey])
                      ? activeQuarterViews[quarterStateKey]
                      : defaultQuarterKey;
                    const selectedQuarterData = quarterEntries.find(([quarterKey]) => quarterKey === selectedQuarterKey)?.[1] || null;

                    const renderQuarterBlock = (quarterKey, qdata) => {
                      const label = formatQuarterLabel(quarterKey);

                      const qAss = qdata?.assessments || qdata || {};
                      const qTotal = Object.values(qAss).reduce((s, a) => s + (a.score || 0), 0);
                      const qMax = Object.values(qAss).reduce((s, a) => s + (a.max || 0), 0);
                      const qPct = qMax ? (qTotal / qMax) * 100 : 0;
                      const clr = qPct >= 75 ? "#16a34a" : qPct >= 50 ? "#f59e0b" : "#dc2626";

                      return (
                        <div style={{ flex: 1, minWidth: 0, padding: 8, borderRadius: 8, border: "1px solid #f1f5f9", background: "#fff" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 8 }}>{label}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{qTotal} / {qMax}</div>
                            <div style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, color: clr, border: "1px solid #e5e7eb" }}>{Math.round(qPct)}%</div>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, qPct))}%`, height: "100%", background: clr }} />
                          </div>
                          {Object.entries(qAss).length === 0 ? (
                            <div style={{ color: "#8b8f95", fontSize: 12 }}>No marks</div>
                          ) : (
                            Object.entries(qAss).map(([k, a]) => (
                              <div key={k} style={{ marginBottom: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: "#111827" }}>
                                  <span>{a.name || k}</span>
                                  <span>{a.score === "" || a.score === null || a.score === undefined || a.score === 0 ? "-" : a.score} / {a.max}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    };

                    if (hasQuarterFormat) {
                      return (
                        <>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              marginBottom: 12,
                            }}
                          >
                            {quarterEntries.map(([quarterKey]) => {
                              const isQuarterActive = selectedQuarterKey === quarterKey;
                              return (
                                <button
                                  key={quarterKey}
                                  onClick={() =>
                                    setActiveQuarterViews((prev) => ({
                                      ...prev,
                                      [quarterStateKey]: quarterKey,
                                    }))
                                  }
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 999,
                                    border: isQuarterActive ? "1px solid var(--accent-strong)" : "1px solid var(--border-soft)",
                                    background: isQuarterActive ? "var(--accent-strong)" : "var(--surface-accent)",
                                    color: isQuarterActive ? "#ffffff" : "var(--accent-strong)",
                                    fontSize: 10,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                  }}
                                >
                                  {formatQuarterLabel(quarterKey)}
                                </button>
                              );
                            })}
                          </div>

                          {selectedQuarterData ? renderQuarterBlock(selectedQuarterKey, selectedQuarterData) : null}
                          <div style={{ marginTop: 8, textAlign: "left", fontSize: 10, color: "#64748b" }}>
                            {selectedQuarterData?.teacherName || studentCourseData.teacherName || data.teacherName || "N/A"}
                          </div>
                        </>
                      );
                    }

                    return (
                      <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Total</div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#111827" }}>{total} / {maxTotal}</div>
                          <div style={{ padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800, border: "1px solid #e5e7eb", color: statusClr, background: "#ffffff" }}>{Math.round(percentage)}%</div>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginBottom: 12 }}>
                          <div style={{ width: `${Math.max(0, Math.min(100, percentage))}%`, height: "100%", background: statusClr }} />
                        </div>
                        {Object.entries(assessments).map(([key, a]) => (
                          <div key={key} style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: "#111827" }}>
                              <span>{a.name}</span>
                              <span>{a.score === "" || a.score === null || a.score === undefined || a.score === 0 ? "-" : a.score} / {a.max}</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ marginTop: 8, textAlign: "left", fontWeight: 700, fontSize: 10, color: statusClr }}>
                          {percentage >= 75 ? "Excellent" : percentage >= 50 ? "Good" : "Needs Improvement"}
                        </div>
                        <div style={{ marginTop: 6, textAlign: "left", fontSize: 10, color: "#64748b" }}>
                          {studentCourseData.teacherName || data.teacherName || "N/A"}
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

export default PerformanceTab;
