import React from "react";
import { FaUsers } from "react-icons/fa";

function MarksTable({
  marksWrapperRef,
  assessmentList,
  studentMarks,
  students,
  selectedQuarter,
  cellErrors,
  updateScore,
  formatStudentName,
}) {
  return (
    <div className="marks-table-wrapper" ref={marksWrapperRef}>
      <table className="marks-table">
        <thead>
          <tr
            style={{
              background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
              color: "#fff",
              borderRadius: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              fontWeight: "700",
              fontSize: "12px",
            }}
          >
            <th
              style={{
                padding: "12px 8px",
                textAlign: "center",
                background: "rgba(255,255,255,0.05)",
                width: 48,
                minWidth: 48,
                maxWidth: 48,
                whiteSpace: "nowrap",
                borderRadius: "16px 0 0 16px",
                verticalAlign: "middle",
              }}
            >
              No
            </th>
            <th
              style={{
                padding: "16px 20px",
                textAlign: "left",
                background: "rgba(255,255,255,0.1)",
                width: 240,
                minWidth: 240,
                verticalAlign: "middle",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FaUsers /> Student
              </span>
            </th>
            {assessmentList.map((assessment, index) => (
              <th
                key={index}
                style={{
                  padding: "16px 18px",
                  background: "rgba(255,255,255,0.05)",
                  textAlign: "center",
                  transition: "0.3s all",
                  verticalAlign: "middle",
                }}
              >
                {assessment.name} ({assessment.max})
              </th>
            ))}
            <th
              style={{
                padding: "16px 18px",
                background: "rgba(255,255,255,0.05)",
                textAlign: "center",
                verticalAlign: "middle",
                borderRadius: "0 16px 16px 0",
              }}
            >
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {Array.from(Object.entries(studentMarks)).map(([studentId, marks], index) => {
            const total = Object.values(marks).reduce((sum, assessment) => sum + (assessment.score || 0), 0);
            const student = students.find((item) => item.id === studentId);

            return (
              <tr
                key={studentId}
                style={{
                  background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                  borderRadius: "12px",
                  marginBottom: "10px",
                  transition: "0.3s all",
                  cursor: "pointer",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "#e0e7ff";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = index % 2 === 0 ? "#ffffff" : "#f8fafc";
                }}
              >
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    fontWeight: 700,
                    width: 48,
                    minWidth: 48,
                    maxWidth: 48,
                    whiteSpace: "nowrap",
                    verticalAlign: "middle",
                  }}
                >
                  {index + 1}
                </td>

                <td
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    width: 240,
                    minWidth: 240,
                    fontWeight: 600,
                    verticalAlign: "middle",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{formatStudentName(student?.name)}</span>
                </td>

                {Object.entries(marks).map(([key, assessment]) => (
                  <td key={key} style={{ padding: "12px", textAlign: "center", verticalAlign: "middle" }}>
                    {selectedQuarter === "avg" ? (
                      <div style={{ fontWeight: 700 }}>{assessment.score}</div>
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        min="0"
                        max={999}
                        value={
                          assessment.score === "" ||
                          assessment.score === null ||
                          assessment.score === undefined ||
                          assessment.score === 0
                            ? ""
                            : assessment.score
                        }
                        placeholder="-"
                        onChange={(event) => {
                          let value = String(event.target.value || "").replace(/[^0-9]/g, "");
                          if (value && value.length > 3) value = value.slice(0, 3);
                          updateScore(studentId, key, value, assessment?.max);
                        }}
                        onKeyDown={(event) => {
                          const allowed = ["Backspace", "ArrowLeft", "ArrowRight", "Delete", "Tab", "Enter"];
                          if (allowed.includes(event.key)) return;
                          if (!/^[0-9]$/.test(event.key)) event.preventDefault();
                        }}
                        onWheel={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          try {
                            event.currentTarget.blur();
                          } catch {
                            // Ignore blur failures
                          }
                        }}
                        style={{
                          width: "66px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: cellErrors?.[studentId]?.[key] ? "1px solid #ef4444" : "1px solid var(--border-strong)",
                          textAlign: "center",
                          background: "var(--surface-panel)",
                          fontWeight: 500,
                        }}
                      />
                    )}
                    {selectedQuarter !== "avg" ? (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          color: cellErrors?.[studentId]?.[key] ? "#dc2626" : "#64748b",
                        }}
                      >
                        {cellErrors?.[studentId]?.[key] || `max ${assessment?.max ?? 0}`}
                      </div>
                    ) : null}
                  </td>
                ))}

                <td style={{ padding: "12px", fontWeight: 600, textAlign: "center", verticalAlign: "middle" }}>
                  {total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default MarksTable;
