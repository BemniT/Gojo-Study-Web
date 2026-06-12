import React from "react";

const yearLabel = (key) => String(key || "").replace("_", "/");

const neutralButtonStyle = {
  border: "1px solid var(--input-border)",
  background: "var(--surface-panel)",
  color: "var(--text-secondary)",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 700,
};

const dangerButtonStyle = {
  border: "1px solid var(--danger)",
  background: "var(--danger)",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 800,
};

export default function ConfirmStatusModal({
  open,
  onClose,
  onConfirm,
  working,
  selectedStudent,
  actionLabel,
  currentAcademicYear,
  registererPassword,
  setRegistererPassword,
  passwordError,
  setPasswordError,
}) {
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--page-bg) 54%, transparent)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
      <div style={{ width: "100%", maxWidth: 460, background: "var(--surface-panel)", border: "1px solid var(--border-soft)", borderRadius: 12, boxShadow: "var(--shadow-panel)", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-soft)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>Confirm Status Change</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>Please review before proceeding.</div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
          <div><strong>Student:</strong> {selectedStudent?.name || "-"} ({selectedStudent?.studentId || "-"})</div>
          <div><strong>Action:</strong> {actionLabel}</div>
          <div><strong>Academic Year:</strong> {currentAcademicYear ? yearLabel(currentAcademicYear) : "-"}</div>
          <div style={{ marginTop: 6 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>
              Registerer Password
            </label>
            <input
              type="password"
              value={registererPassword}
              onChange={(e) => {
                setRegistererPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              placeholder="Enter your password to confirm"
              style={{
                width: "100%",
                border: "1px solid var(--input-border)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                boxSizing: "border-box",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
              }}
            />
            {passwordError ? (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "var(--danger)" }}>
                {passwordError}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-soft)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={working}
            style={{ ...neutralButtonStyle, cursor: working ? "not-allowed" : "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            style={{ ...dangerButtonStyle, padding: "7px 12px", cursor: working ? "not-allowed" : "pointer", opacity: working ? 0.65 : 1 }}
          >
            {working ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
