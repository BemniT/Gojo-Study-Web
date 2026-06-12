import React from "react";
import { useNavigate } from "react-router-dom";
import { FaChalkboardTeacher, FaSave } from "react-icons/fa";

const SECTION_STYLE = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  boxShadow: "var(--shadow-soft)",
  padding: 18,
};

const PANEL_STYLE = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  boxShadow: "var(--shadow-soft)",
};

const STAT_STYLE = {
  ...PANEL_STYLE,
  padding: 14,
};

const LABEL_STYLE = {
  display: "block",
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-secondary)",
};

const INPUT_STYLE = {
  width: "100%",
  border: "1px solid var(--input-border)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  outline: "none",
};

const PRIMARY_BUTTON_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "1px solid var(--accent-strong)",
  background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "var(--shadow-glow)",
};

const SUBTLE_BUTTON_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-panel)",
  color: "var(--accent-strong)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

export default function AcademicConfigurationPanel({
  academicForm,
  updateAcademicForm,
  savingKey,
  saveAcademicConfiguration,
  counts,
  loading,
}) {
  const navigate = useNavigate();
  const saving = savingKey === "academic";
  return (
    <div style={SECTION_STYLE}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FaChalkboardTeacher style={{ color: "var(--accent-strong)" }} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>Academic Configuration</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
            Control the academic structure, promotion threshold, section naming, and capacity defaults.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate("/academic-years")} style={SUBTLE_BUTTON_STYLE}>
            Academic Years
          </button>
          <button type="button" onClick={() => navigate("/grade-management")} style={SUBTLE_BUTTON_STYLE}>
            Grade Management
          </button>
          <button
            type="button"
            onClick={saveAcademicConfiguration}
            disabled={saving}
            style={{ ...PRIMARY_BUTTON_STYLE, opacity: saving ? 0.7 : 1 }}
          >
            <FaSave /> {saving ? "Saving..." : "Save Academic Config"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <div>
          <label style={LABEL_STYLE}>Current Academic Year</label>
          <input
            value={academicForm.currentAcademicYear}
            onChange={(event) => updateAcademicForm("currentAcademicYear", event.target.value)}
            style={INPUT_STYLE}
            placeholder="2028_2029"
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Section Naming System</label>
          <select
            value={academicForm.sectionNamingSystem}
            onChange={(event) => updateAcademicForm("sectionNamingSystem", event.target.value)}
            style={INPUT_STYLE}
          >
            <option value="Alphabetical (A, B, C)">Alphabetical (A, B, C)</option>
            <option value="Numeric (1, 2, 3)">Numeric (1, 2, 3)</option>
            <option value="Custom Mixed">Custom Mixed</option>
          </select>
        </div>
        <div>
          <label style={LABEL_STYLE}>Promotion Pass Mark (%)</label>
          <input
            value={academicForm.promotionPassMark}
            onChange={(event) => updateAcademicForm("promotionPassMark", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Default Max Students per Section</label>
          <input
            value={academicForm.maxStudentsPerSection}
            onChange={(event) => updateAcademicForm("maxStudentsPerSection", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        <div style={STAT_STYLE}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Grade Levels</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "var(--accent-strong)" }}>
            {loading ? "--" : counts.grades}
          </div>
        </div>
        <div style={STAT_STYLE}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Sections</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "var(--success)" }}>
            {loading ? "--" : counts.sections}
          </div>
        </div>
        <div style={STAT_STYLE}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Pass Mark</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "var(--text-primary)" }}>
            {academicForm.promotionPassMark}%
          </div>
        </div>
        <div style={STAT_STYLE}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Max Students</div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "var(--text-primary)" }}>
            {academicForm.maxStudentsPerSection}
          </div>
        </div>
      </div>
    </div>
  );
}
