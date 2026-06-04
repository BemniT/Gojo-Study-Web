import React from "react";
import ProfileAvatar from "../ProfileAvatar";

function AttendanceTable({
  loading,
  error,
  selectedCourse,
  students,
  handleMark,
  getStatusButtonStyle,
  isMobile,
}) {
  return (
    <div
      className="attendance-table-wrapper"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        marginBottom: 20,
        background: "var(--surface-panel)",
        borderRadius: 14,
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
        padding: isMobile ? 8 : 10,
      }}
    >
      {loading ? (
        <p style={{ margin: 0, padding: 10, color: "var(--text-muted)" }}>Loading students...</p>
      ) : error ? (
        <p style={{ margin: 0, padding: 10, color: "#b91c1c" }}>{error}</p>
      ) : selectedCourse && students.length === 0 ? (
        <p style={{ margin: 0, padding: 10, color: "var(--text-muted)" }}>
          No students are assigned to Grade {selectedCourse.grade} Section {selectedCourse.section} yet.
        </p>
      ) : (
        <table
          className="attendance-table"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "var(--surface-panel)",
            minWidth: 720,
            borderRadius: 12,
          }}
        >
          <thead>
            <tr style={{ background: "var(--accent-strong)", fontWeight: "bold", color: "#fff", textAlign: "left" }}>
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
                NO
              </th>
              <th style={{ padding: "12px" }}>Student</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Present</th>
              <th style={{ padding: "12px", textAlign: "center" }}>Absent</th>
              <th style={{ padding: "12px", textAlign: "center", borderRadius: "0 16px 16px 0" }}>Late</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr
                key={student.studentId}
                style={{
                  background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                  borderBottom: "1px solid var(--border-soft)",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "#e0e7ff";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = index % 2 === 0 ? "#ffffff" : "#f8fafc";
                }}
              >
                <td style={{ padding: "12px", textAlign: "center", fontWeight: 700 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "#f1f5f9",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#374151",
                    }}
                  >
                    {index + 1}
                  </div>
                </td>

                <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "2px solid #4b6cb7",
                      background: "#fff",
                    }}
                  >
                    <ProfileAvatar
                      src={student.profileImage}
                      name={student.name}
                      alt={student.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{student.name}</span>
                </td>

                <td style={{ padding: "10px", textAlign: "center" }}>
                  <button
                    style={getStatusButtonStyle(student.studentId, "present")}
                    onClick={() => handleMark(student.studentId, "present")}
                  >
                    Present
                  </button>
                </td>
                <td style={{ padding: "10px", textAlign: "center" }}>
                  <button
                    style={getStatusButtonStyle(student.studentId, "absent")}
                    onClick={() => handleMark(student.studentId, "absent")}
                  >
                    Absent
                  </button>
                </td>
                <td style={{ padding: "10px", textAlign: "center" }}>
                  <button
                    style={getStatusButtonStyle(student.studentId, "late")}
                    onClick={() => handleMark(student.studentId, "late")}
                  >
                    Late
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AttendanceTable;
