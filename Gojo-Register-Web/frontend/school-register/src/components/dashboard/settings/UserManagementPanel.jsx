import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaUsers } from "react-icons/fa";

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

export default function UserManagementPanel({ counts, loading }) {
  const navigate = useNavigate();
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
            <FaUsers style={{ color: "var(--accent-strong)" }} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>User Management</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
            Create users, review counts, and jump to live register pages for students, parents,
            teachers, and registrar staff.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate("/student-register")}
            style={SUBTLE_BUTTON_STYLE}
          >
            <FaUserPlus /> Add Student
          </button>
          <button
            type="button"
            onClick={() => navigate("/teacher-register")}
            style={SUBTLE_BUTTON_STYLE}
          >
            <FaUserPlus /> Add Teacher
          </button>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}
      >
        {[
          { label: "Students", value: counts.students, action: () => navigate("/students") },
          { label: "Parents", value: counts.parents, action: () => navigate("/parents") },
          { label: "Teachers", value: counts.teachers, action: () => navigate("/teacher-register") },
          { label: "Registrars", value: counts.registerers, action: () => navigate("/registerer-register") },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            style={{ ...STAT_STYLE, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
              {item.label}
            </div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900, color: "var(--text-primary)" }}>
              {loading ? "--" : item.value}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--accent-strong)", fontWeight: 700 }}>
              Open
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          onClick={() => navigate("/parent-register")}
          style={SUBTLE_BUTTON_STYLE}
        >
          Create Parent
        </button>
        <button
          type="button"
          onClick={() => navigate("/registerer-register")}
          style={SUBTLE_BUTTON_STYLE}
        >
          Create Registrar
        </button>
        <button
          type="button"
          onClick={() => navigate("/all-chat")}
          style={SUBTLE_BUTTON_STYLE}
        >
          Open Staff Communication
        </button>
      </div>
    </div>
  );
}
