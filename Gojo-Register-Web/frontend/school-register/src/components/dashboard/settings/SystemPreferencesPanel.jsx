import React from "react";
import { FaCog, FaMoon, FaSave, FaSun } from "react-icons/fa";

const SECTION_STYLE = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  boxShadow: "var(--shadow-soft)",
  padding: 18,
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

export default function SystemPreferencesPanel({
  preferencesForm,
  updatePreferencesForm,
  savingKey,
  savePreferences,
  darkMode,
  toggleDarkMode,
}) {
  const saving = savingKey === "preferences";
  return (
    <div style={SECTION_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <FaCog style={{ color: "var(--accent-strong)" }} />
        <div style={{ fontSize: 17, fontWeight: 900 }}>System Preferences</div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={LABEL_STYLE}>Language</label>
          <select
            value={preferencesForm.language}
            onChange={(event) => updatePreferencesForm("language", event.target.value)}
            style={INPUT_STYLE}
          >
            <option value="English">English</option>
            <option value="Afaan Oromo">Afaan Oromo</option>
            <option value="Amharic">Amharic</option>
          </select>
        </div>
        <div>
          <label style={LABEL_STYLE}>Time Zone</label>
          <input
            value={preferencesForm.timeZone}
            onChange={(event) => updatePreferencesForm("timeZone", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Date Format</label>
          <select
            value={preferencesForm.dateFormat}
            onChange={(event) => updatePreferencesForm("dateFormat", event.target.value)}
            style={INPUT_STYLE}
          >
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          </select>
        </div>
        <div>
          <label style={LABEL_STYLE}>Default Page</label>
          <select
            value={preferencesForm.defaultPage}
            onChange={(event) => updatePreferencesForm("defaultPage", event.target.value)}
            style={INPUT_STYLE}
          >
            <option value="/dashboard">Dashboard</option>
            <option value="/overview">Overview</option>
            <option value="/students">Students</option>
            <option value="/document-generation">Document Generation</option>
          </select>
        </div>
        <button
          type="button"
          onClick={toggleDarkMode}
          style={{ ...SUBTLE_BUTTON_STYLE, justifyContent: "space-between" }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {darkMode ? <FaMoon /> : <FaSun />} Theme
          </span>
          <span>{darkMode ? "Dark" : "Light"}</span>
        </button>
        <button
          type="button"
          onClick={savePreferences}
          disabled={saving}
          style={{ ...PRIMARY_BUTTON_STYLE, opacity: saving ? 0.7 : 1 }}
        >
          <FaSave /> {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
