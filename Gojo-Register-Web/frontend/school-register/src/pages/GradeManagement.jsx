import React, { useState } from "react";
import { FaPlus, FaSyncAlt, FaTrashAlt, FaUsers } from "react-icons/fa";
import { buildSchoolRtdbBase } from "../api/rtdbScope";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import useGradeManagement from "../hooks/students/useGradeManagement";

const cardStyle = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  boxShadow: "var(--shadow-panel)",
};

const inputStyle = {
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  background: "var(--input-bg)",
  color: "var(--text-primary)",
};

const primaryButtonStyle = {
  border: "1px solid var(--accent-strong)",
  background: "var(--accent-strong)",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 800,
};

const successButtonStyle = {
  border: "1px solid var(--success)",
  background: "var(--success)",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 800,
};

const dangerGhostButtonStyle = {
  border: "1px solid var(--danger)",
  background: "var(--danger-soft)",
  color: "var(--danger)",
  borderRadius: 7,
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 800,
};

const tableHeadStyle = {
  fontSize: 12,
  fontWeight: 900,
  color: "var(--text-secondary)",
};

const toneByStat = {
  blue: "var(--accent-strong)",
  green: "var(--success)",
  purple: "color-mix(in srgb, var(--accent) 72%, var(--text-primary))",
  amber: "var(--warning)",
};

const normalizeGradeInput = (raw) => {
  const digits = String(raw || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  const normalized = String(Number(digits));
  if (normalized === "0" || normalized === "NaN") return "";
  return normalized;
};

export default function GradeManagement() {
  const { schoolCode } = useRegistrarSession();
  const initialDbUrl = buildSchoolRtdbBase(schoolCode);

  const [newGrade, setNewGrade] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newSectionMax, setNewSectionMax] = useState("40");
  const [selectedSection, setSelectedSection] = useState("");

  const {
    gradesMap,
    gradeKeys,
    feedback,
    loading,
    working,
    activeAcademicYear,
    stats,
    sectionStudentList,
    sectionOccupancy,
    sectionMaxDraft,
    setSectionMaxDraft,
    loadData,
    createGrade,
    addSection,
    updateSectionMax,
    deleteSection,
    deleteGrade,
  } = useGradeManagement({
    schoolCode,
    DB_URL: initialDbUrl,
    selectedGrade,
    setSelectedGrade,
    selectedSection,
    setSelectedSection,
  });

  const handleCreateGrade = () => createGrade(newGrade, { onSuccess: () => setNewGrade("") });
  const handleAddSection = () =>
    addSection(newSection, newSectionMax, {
      onSuccess: () => { setNewSection(""); setNewSectionMax("40"); },
    });

  const sectionColumns = {
    display: "grid",
    gridTemplateColumns: "0.8fr 1fr 1.2fr 1fr",
    gap: 8,
    alignItems: "center",
  };

  const studentColumns = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 0.7fr 0.7fr",
    gap: 8,
    alignItems: "center",
  };

  return (
    <div style={{ padding: "10px 6px 20px", minWidth: 0, boxSizing: "border-box", color: "var(--text-primary)" }}>
      <style>
        {`
          .grade-actions-wrap { display: flex; align-items: center; gap: 6px; }
          .gm-top-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .gm-add-section-grid { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(120px, 1fr) 110px auto; gap: 8px; align-items: center; }
          .gm-max-input { width: 100%; max-width: 110px; justify-self: start; }
          .gm-dashboard { display: flex; gap: 14px; padding: 12px; }
          .gm-sidebar { width: 220px; }
          .gm-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
          @media (max-width: 1180px) { .gm-dashboard { flex-direction: column; } .gm-sidebar { width: auto; } }
          @media (max-width: 980px) {
            .gm-top-grid { grid-template-columns: 1fr; }
            .gm-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gm-add-section-grid { grid-template-columns: 1fr 1fr; }
            .gm-max-input { max-width: 100%; }
          }
          @media (max-width: 640px) {
            .grade-actions-wrap { flex-direction: column; align-items: stretch; }
            .gm-stats { grid-template-columns: 1fr; }
            .gm-add-section-grid { grid-template-columns: 1fr; }
          }
        `}
      </style>

      <div style={{ width: "min(100%, 1180px)", margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="section-header-card" style={{ padding: 18 }}>
          <div className="section-header-card__row">
            <div>
              <h1 className="section-header-card__title" style={{ fontSize: 24, fontWeight: 900 }}>Grade Management</h1>
              <p className="section-header-card__subtitle" style={{ fontSize: 13 }}>
                Manage grades and sections with capacity control and live section occupancy.
              </p>
            </div>

            <div className="section-header-card__actions">
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
                {activeAcademicYear ? `Current Year: ${activeAcademicYear.replace("_", "/")}` : "No active academic year"}
              </div>
              <button
                type="button"
                onClick={() => loadData({ force: true })}
                disabled={loading || working}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  border: "1px solid var(--border-strong)",
                  background: "var(--accent-soft)",
                  color: "var(--accent-strong)",
                  borderRadius: 9, padding: "7px 10px", fontSize: 12, fontWeight: 800,
                  cursor: loading || working ? "not-allowed" : "pointer",
                  opacity: loading || working ? 0.6 : 1,
                }}
              >
                <FaSyncAlt /> Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="gm-stats">
          {[{
            title: "Total Grades", value: stats.totalGrades, hint: "Configured levels", color: toneByStat.blue,
          }, {
            title: "Total Sections", value: stats.totalSections, hint: "Across all grades", color: toneByStat.green,
          }, {
            title: "Section Capacity", value: stats.totalCapacity, hint: "Maximum seat count", color: toneByStat.purple,
          }, {
            title: "Students (Year)", value: stats.activeStudentCount,
            hint: activeAcademicYear ? activeAcademicYear.replace("_", "/") : "All years", color: toneByStat.amber,
          }].map((item) => (
            <div key={item.title} style={{ ...cardStyle, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{item.title}</span>
                <FaUsers style={{ color: item.color }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 26, fontWeight: 900, color: "var(--text-primary)" }}>{item.value}</div>
              <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)" }}>{item.hint}</div>
            </div>
          ))}
        </div>

        {feedback.text ? (
          <div
            style={{
              borderRadius: 12, padding: "10px 12px", fontSize: 13, fontWeight: 700,
              border: `1px solid ${feedback.type === "error" ? "var(--danger-border)" : feedback.type === "warning" ? "var(--warning-border)" : "var(--border-strong)"}`,
              background: feedback.type === "error" ? "var(--danger-soft)" : feedback.type === "warning" ? "var(--warning-soft)" : "var(--accent-soft)",
              color: feedback.type === "error" ? "var(--danger)" : feedback.type === "warning" ? "var(--warning)" : "var(--accent-strong)",
            }}
          >
            {feedback.text}
          </div>
        ) : null}

        <div className="gm-top-grid">
          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", marginBottom: 10 }}>Create Grade (1-12)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input
                value={newGrade}
                onChange={(e) => setNewGrade(normalizeGradeInput(e.target.value))}
                placeholder="Example: 1"
                style={{ ...inputStyle, padding: "9px 10px" }}
              />
              <button
                onClick={handleCreateGrade}
                disabled={working}
                style={{ ...primaryButtonStyle, cursor: working ? "not-allowed" : "pointer", opacity: working ? 0.75 : 1, display: "flex", alignItems: "center", gap: 6 }}
              >
                <FaPlus /> Create
              </button>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", marginBottom: 10 }}>Add Section & Max Students</div>
            <div className="gm-add-section-grid">
              <select
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setSelectedSection(""); }}
                style={inputStyle}
              >
                <option value="">Select Grade</option>
                {gradeKeys.map((grade) => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>

              <input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value.toUpperCase())}
                placeholder="Section (A/B/C)"
                style={inputStyle}
              />

              <input
                value={newSectionMax}
                onChange={(e) => setNewSectionMax(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Max"
                className="gm-max-input"
                style={inputStyle}
              />

              <button
                onClick={handleAddSection}
                disabled={working || !selectedGrade}
                style={{ ...successButtonStyle, cursor: working || !selectedGrade ? "not-allowed" : "pointer", opacity: working || !selectedGrade ? 0.75 : 1, display: "flex", alignItems: "center", gap: 6 }}
              >
                <FaPlus /> Add
              </button>
            </div>
          </div>
        </div>

        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", fontWeight: 900, color: "var(--text-primary)", borderBottom: "1px solid var(--border-soft)" }}>Grades & Sections</div>

          {loading ? (
            <div style={{ padding: 14, fontSize: 13, color: "var(--text-muted)" }}>Loading...</div>
          ) : gradeKeys.length === 0 ? (
            <div style={{ padding: 14, fontSize: 13, color: "var(--text-muted)" }}>No grades configured yet.</div>
          ) : (
            <>
              <div style={{ ...sectionColumns, padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", ...tableHeadStyle }}>
                <div>Grade</div>
                <div>Section</div>
                <div>Students / Max</div>
                <div>Actions</div>
              </div>

              {gradeKeys.map((grade) => {
                const sections = ((gradesMap[grade] || {}).sections || {});
                const sectionRows = Object.entries(sections).sort((a, b) => String(a[0]).localeCompare(String(b[0])));

                if (sectionRows.length === 0) {
                  return (
                    <div key={grade} style={{ ...sectionColumns, padding: "10px 14px", borderTop: "1px solid var(--border-soft)" }}>
                      <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>Grade {grade}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>No section</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>-</div>
                      <button
                        onClick={() => deleteGrade(grade)}
                        disabled={working}
                        style={{ ...dangerGhostButtonStyle, cursor: working ? "not-allowed" : "pointer", opacity: working ? 0.7 : 1, width: "fit-content", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <FaTrashAlt /> Delete Grade
                      </button>
                    </div>
                  );
                }

                return sectionRows.map(([sectionKey, sectionNode], idx) => {
                  const maxStudents = Number(sectionNode?.maxStudents || 0);
                  const occupancyKey = `${grade}__${String(sectionKey || "").toUpperCase()}`;
                  const current = Number(sectionOccupancy[occupancyKey] || 0);

                  return (
                    <div key={`${grade}-${sectionKey}`} style={{ ...sectionColumns, padding: "10px 14px", borderTop: "1px solid var(--border-soft)" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                        {idx === 0 ? `Grade ${grade}` : ""}
                      </div>

                      <div style={{ fontSize: 12, fontWeight: 800 }}>{sectionKey}</div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: current > maxStudents && maxStudents > 0 ? "var(--danger)" : "var(--success)" }}>
                          {current}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>/</span>
                        <input
                          value={sectionMaxDraft[occupancyKey] || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, "");
                            setSectionMaxDraft((prev) => ({ ...prev, [occupancyKey]: value }));
                          }}
                          style={{ ...inputStyle, width: 76, padding: "5px 8px", fontSize: 12 }}
                        />
                        <button
                          onClick={() => updateSectionMax(grade, sectionKey)}
                          disabled={working}
                          style={{ ...primaryButtonStyle, borderRadius: 7, padding: "5px 8px", fontSize: 11, cursor: working ? "not-allowed" : "pointer", opacity: working ? 0.7 : 1 }}
                        >
                          Save
                        </button>
                      </div>

                      <div className="grade-actions-wrap">
                        <button
                          onClick={() => {
                            setSelectedGrade(String(grade));
                            setSelectedSection(String(sectionKey).toUpperCase());
                          }}
                          style={{ border: "1px solid var(--success)", background: "var(--success)", color: "#fff", borderRadius: 7, padding: "6px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                        >
                          View
                        </button>

                        <button
                          onClick={() => deleteSection(grade, sectionKey)}
                          disabled={working}
                          style={{ ...dangerGhostButtonStyle, cursor: working ? "not-allowed" : "pointer", opacity: working ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <FaTrashAlt /> Delete
                        </button>
                      </div>
                    </div>
                  );
                });
              })}
            </>
          )}
        </div>

        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", fontWeight: 900, color: "var(--text-primary)", borderBottom: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>
              Section Student List {selectedGrade && selectedSection ? `- Grade ${selectedGrade} / ${selectedSection}` : ""}
            </span>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {activeAcademicYear ? `Year: ${activeAcademicYear.replace("_", "/")}` : "All years"}
            </div>
          </div>

          {!selectedGrade || !selectedSection ? (
            <div style={{ padding: 14, fontSize: 13, color: "var(--text-muted)" }}>Choose a section from the table above to view students.</div>
          ) : sectionStudentList.length === 0 ? (
            <div style={{ padding: 14, fontSize: 13, color: "var(--text-muted)" }}>No students found in this section.</div>
          ) : (
            <>
              <div style={{ ...studentColumns, padding: "10px 14px", borderBottom: "1px solid var(--border-soft)", ...tableHeadStyle }}>
                <div>Student</div>
                <div>Student ID</div>
                <div>Grade</div>
                <div>Section</div>
              </div>
              {sectionStudentList.map((student) => (
                <div key={student.studentId} style={{ ...studentColumns, padding: "10px 14px", borderTop: "1px solid var(--border-soft)" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{student.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{student.studentId}</div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{student.grade}</div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{student.section}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
