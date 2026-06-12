import React from "react";
import { FaSearch } from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";

const chipStyle = (active) => ({
  padding: "6px 12px",
  borderRadius: "999px",
  background: active ? "var(--accent-strong)" : "var(--surface-accent)",
  color: active ? "#fff" : "var(--accent-strong)",
  cursor: "pointer",
  border: active ? "1px solid var(--accent-strong)" : "1px solid var(--border-strong)",
  fontSize: "11px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  transition: "all 0.2s ease",
});

function StudentItem({ student, selected, onClick, number }) {
  return (
    <div
      onClick={() => onClick(student)}
      style={{
        width: "100%",
        borderRadius: "14px",
        padding: "11px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        background: "#ffffff",
        border: selected ? "1px solid #93c5fd" : "1px solid #e2e8f0",
        boxShadow: selected
          ? "0 14px 28px rgba(37, 99, 235, 0.16), inset 3px 0 0 #2563eb"
          : "0 4px 10px rgba(15, 23, 42, 0.06)",
        transition: "all 0.24s ease",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: selected ? "#1d4ed8" : "#eef2ff",
          color: selected ? "#fff" : "#334155",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {number}
      </div>

      <ProfileAvatar
        imageUrl={student.profileImage}
        name={student.name}
        size={48}
        style={{
          border: selected ? "2px solid #60a5fa" : "2px solid #e2e8f0",
          background: "#ffffff",
        }}
      />

      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {student.name}
        </h3>
        <p style={{ margin: "4px 0", color: "#555", fontSize: 11 }}>
          Grade {student.grade} - Section {student.section}
        </p>
      </div>
    </div>
  );
}

export default function StudentListPanel({
  listShellWidth,
  isPortrait,
  currentYearStudents,
  currentAcademicYear,
  searchTerm,
  setSearchTerm,
  selectedGrade,
  setSelectedGrade,
  selectedSection,
  setSelectedSection,
  students,
  assignedGrades,
  assignedSectionsForSelectedGrade,
  selectedFilterLabel,
  studentsLoading,
  selectedStudent,
  handleSelectStudent,
}) {
  return (
    <div
      className="student-list-card-responsive"
      style={{
        width: listShellWidth,
        maxWidth: 640,
        position: "relative",
        marginLeft: 0,
        marginRight: isPortrait ? 0 : "24px",
        background: "#ffffff",
        border: "1px solid var(--border-soft)",
        borderRadius: 18,
        boxShadow: "var(--shadow-soft)",
        padding: "14px 14px 22px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @media (max-width: 600px) {
          .student-list-card-responsive {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
        }
      `}</style>

      <div className="section-header-card" style={{ marginBottom: 12 }}>
        <h2 className="section-header-card__title" style={{ fontSize: 20 }}>Students</h2>
        <div className="section-header-card__meta">
          <span>Total: {currentYearStudents.length}</span>
          <span className="section-header-card__chip">
            {currentAcademicYear ? String(currentAcademicYear).replace("_", "/") : "Register View"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "10px" }}>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f8fbff",
            border: "1px solid #dbeafe",
            borderRadius: "12px",
            padding: "10px 12px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
          }}
        >
          <FaSearch style={{ color: "var(--text-muted)", fontSize: 14 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            style={{ width: "100%", border: "none", outline: "none", fontSize: 13, background: "transparent" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            setSelectedGrade("All");
            setSelectedSection("All");
          }}
          style={chipStyle(selectedGrade === "All" && selectedSection === "All")}
        >
          All Grades
        </button>
        {assignedGrades.map((gradeValue) => (
          <button
            key={`grade-${gradeValue}`}
            onClick={() => {
              const firstSectionForGrade = students
                .filter((item) => String(item.grade) === String(gradeValue))
                .map((item) => item.section)
                .find(Boolean);

              setSelectedGrade(gradeValue);
              setSelectedSection(firstSectionForGrade || "All");
            }}
            style={chipStyle(selectedGrade === gradeValue)}
          >
            {`Grade ${gradeValue}`}
          </button>
        ))}
      </div>

      {selectedGrade !== "All" && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedSection("All")}
            style={{
              ...chipStyle(selectedSection === "All"),
              boxShadow: selectedSection === "All" ? "0 0 0 2px var(--accent-soft)" : "none",
              transform: selectedSection === "All" ? "translateY(-1px)" : "none",
            }}
          >
            All Sections
          </button>
          {assignedSectionsForSelectedGrade.map((sectionValue) => (
            <button
              key={sectionValue}
              onClick={() => setSelectedSection(sectionValue)}
              style={chipStyle(selectedSection === sectionValue)}
            >
              Section {sectionValue}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
        {selectedFilterLabel}
      </div>
      {studentsLoading ? (
        <p style={{ color: "var(--text-muted)", marginTop: 2 }}>Loading students...</p>
      ) : null}
      {!studentsLoading && selectedGrade !== "All" && selectedSection === "All" ? (
        <p style={{ color: "var(--text-muted)", marginTop: 2 }}>
          {`Showing all students in Grade ${selectedGrade}. Select a section to narrow down.`}
        </p>
      ) : null}
      {!studentsLoading && currentYearStudents.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: 2 }}>No students found.</p>
      ) : null}

      <style>{`
        .student-list-responsive {
          display: flex;
          flex-direction: column;
          margin-top: 12px;
          gap: 12px;
          width: 100%;
          max-width: 100%;
          margin-left: 0;
          margin-right: 0;
        }

        .student-list-responsive > div {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 600px) {
          .student-list-responsive {
            width: 100% !important;
            max-width: 100% !important;
          }

          .student-list-responsive > div {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>

      <div className="student-list-responsive">
        {currentYearStudents.map((student, index) => (
          <StudentItem
            key={student.userId || student.studentId || index}
            student={student}
            number={index + 1}
            selected={selectedStudent?.studentId === student.studentId}
            onClick={handleSelectStudent}
          />
        ))}
        <div aria-hidden="true" style={{ height: 18 }} />
      </div>
    </div>
  );
}
