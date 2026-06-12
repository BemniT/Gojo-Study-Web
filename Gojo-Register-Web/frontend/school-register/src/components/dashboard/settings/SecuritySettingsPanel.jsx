import React from "react";
import { FaLock, FaSave } from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";

const SECTION_STYLE = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 18,
  boxShadow: "var(--shadow-panel)",
  padding: 18,
};

const PANEL_STYLE = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 14,
};

const LABEL_STYLE = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 6,
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

function buildRecoveryCodes() {
  return Array.from({ length: 8 }, () =>
    Math.random().toString(36).slice(2, 10).toUpperCase()
  );
}

export default function SecuritySettingsPanel({
  securityForm,
  updateSecurityForm,
  profileImage,
  setSelectedProfileFile,
  savingKey,
  saveSecurity,
  twoFactorCode,
  setTwoFactorCode,
}) {
  const saving = savingKey === "security";
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
            <FaLock style={{ color: "var(--accent-strong)" }} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>Security</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
            Update registrar account details, password, session timeout, and profile image from one place.
          </div>
        </div>
        <button
          type="button"
          onClick={saveSecurity}
          disabled={saving}
          style={{ ...PRIMARY_BUTTON_STYLE, opacity: saving ? 0.7 : 1 }}
        >
          <FaSave /> {saving ? "Saving..." : "Save Security Settings"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", gap: 14 }}>
        <div
          style={{
            ...PANEL_STYLE,
            padding: 14,
            background: "linear-gradient(180deg, var(--surface-muted) 0%, var(--surface-panel) 100%)",
          }}
        >
          <ProfileAvatar
            imageUrl={profileImage}
            name={securityForm.name || "Register Office"}
            size={96}
            style={{ border: "3px solid var(--border-strong)", boxShadow: "var(--shadow-glow)" }}
          />
          <div style={{ marginTop: 12, fontSize: 16, fontWeight: 900 }}>
            {securityForm.name || "Register Office"}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
            @{securityForm.username || "registrar"}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={LABEL_STYLE}>Profile Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setSelectedProfileFile(event.target.files?.[0] || null)}
              style={{ ...INPUT_STYLE, padding: 8 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <div>
            <label style={LABEL_STYLE}>Display Name</label>
            <input
              value={securityForm.name}
              onChange={(event) => updateSecurityForm("name", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Username</label>
            <input
              value={securityForm.username}
              onChange={(event) => updateSecurityForm("username", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>New Password</label>
            <input
              type="password"
              value={securityForm.newPassword}
              onChange={(event) => updateSecurityForm("newPassword", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Confirm Password</label>
            <input
              type="password"
              value={securityForm.confirmPassword}
              onChange={(event) => updateSecurityForm("confirmPassword", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Session Timeout (minutes)</label>
            <select
              value={securityForm.sessionTimeout}
              onChange={(event) => updateSecurityForm("sessionTimeout", event.target.value)}
              style={INPUT_STYLE}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="120">120 minutes</option>
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Two-Factor Authentication</label>
            <select
              value={securityForm.twoFactorEnabled ? "enabled" : "disabled"}
              onChange={(event) =>
                updateSecurityForm("twoFactorEnabled", event.target.value === "enabled")
              }
              style={INPUT_STYLE}
            >
              <option value="disabled">Disabled</option>
              <option value="enabled">Enabled</option>
            </select>
          </div>
        </div>

        {securityForm.twoFactorEnabled ? (
          <div style={{ ...PANEL_STYLE, padding: 14, marginTop: 14, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 10 }}>
              Authenticator Setup
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={LABEL_STYLE}>Setup Key</label>
                <input
                  value={securityForm.twoFactorSecret || ""}
                  readOnly
                  style={{ ...INPUT_STYLE, fontFamily: "monospace", letterSpacing: "0.08em" }}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Verification Code</label>
                <input
                  value={twoFactorCode}
                  onChange={(event) =>
                    setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="Enter 6-digit authenticator code"
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Recovery Codes</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                  {(securityForm.twoFactorRecoveryCodes || []).map((code) => (
                    <div
                      key={code}
                      style={{ ...PANEL_STYLE, padding: "8px 10px", fontFamily: "monospace", fontSize: 12, fontWeight: 800 }}
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateSecurityForm("twoFactorRecoveryCodes", buildRecoveryCodes())}
                style={SUBTLE_BUTTON_STYLE}
              >
                Regenerate Recovery Codes
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
