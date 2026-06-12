import React from "react";
import { FaSave, FaUsers } from "react-icons/fa";
import { MANAGED_ROLES, PERMISSION_LABELS } from "../../../utils/registerSettings";

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

export default function RolesNotificationsPanel({
  preferencesForm,
  updatePreferencesForm,
  permissionsForm,
  updateRolePermission,
  selectedRole,
  setSelectedRole,
  savingKey,
  savePermissions,
}) {
  const saving = savingKey === "permissions";
  return (
    <div style={SECTION_STYLE}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FaUsers style={{ color: "var(--accent-strong)" }} />
          <div style={{ fontSize: 17, fontWeight: 900 }}>Roles & Notifications</div>
        </div>
        <button
          type="button"
          onClick={savePermissions}
          disabled={saving}
          style={{ ...PRIMARY_BUTTON_STYLE, opacity: saving ? 0.7 : 1 }}
        >
          <FaSave /> {saving ? "Saving..." : "Save Role Access"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        {[
          { key: "emailNotifications", label: "Email notifications" },
          { key: "systemAlerts", label: "System alerts" },
          { key: "deadlineReminders", label: "Deadline reminders" },
          { key: "registrationAlerts", label: "Registration alerts" },
        ].map((item) => (
          <label
            key={item.key}
            style={{
              ...PANEL_STYLE,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>{item.label}</span>
            <input
              type="checkbox"
              checked={Boolean(preferencesForm[item.key])}
              onChange={(event) => updatePreferencesForm(item.key, event.target.checked)}
            />
          </label>
        ))}
      </div>

      <div style={{ ...PANEL_STYLE, padding: 12, marginBottom: 12 }}>
        <label style={LABEL_STYLE}>Manage Role Access</label>
        <select
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value)}
          style={INPUT_STYLE}
        >
          {MANAGED_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase()}{role.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}
      >
        {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
          <label
            key={key}
            style={{
              ...PANEL_STYLE,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
            <input
              type="checkbox"
              checked={Boolean(permissionsForm[selectedRole]?.[key])}
              onChange={(event) => updateRolePermission(selectedRole, key, event.target.checked)}
            />
          </label>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginTop: 12 }}>
        Role access is enforced in navigation, protected routes, and default-page redirects for
        new sessions.
      </div>
    </div>
  );
}
