import React from "react";

const FIELDS = [
  { label: "Phone", key: "phone" },
  { label: "Gender", key: "gender" },
  { label: "Email", key: "email" },
  { label: "Grade", key: "grade" },
  { label: "Section", key: "section" },
  { label: "Age", key: "age" },
  { label: "Birth Date", key: "dob" },
  { label: "Parent Name", key: "parentName" },
  { label: "Parent Phone", key: "parentPhone" },
];

const FIELD_CARD_STYLE = {
  alignItems: "center",
  justifyContent: "flex-start",
  display: "flex",
  background: "var(--surface-panel)",
  padding: "8px",
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  boxShadow: "none",
  minHeight: 36,
};

const FIELD_INPUT_STYLE = {
  marginTop: 6,
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--input-border)",
  fontSize: 12,
  background: "var(--input-bg)",
  color: "var(--text-primary)",
};

export default function StudentDetailsTab({
  selectedStudent,
  editingProfile,
  editForm,
  setEditForm,
  savingProfile,
  startEditProfile,
  saveProfileEdits,
  cancelEditProfile,
}) {
  return (
    <div
      style={{
        padding: "12px",
        background: "var(--surface-panel)",
        borderRadius: 12,
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
        margin: "0 auto",
        maxWidth: 380,
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3
            style={{
              margin: 0,
              marginBottom: 6,
              color: "var(--text-primary)",
              fontWeight: 800,
              letterSpacing: "0.1px",
              fontSize: 12,
              textAlign: "left",
            }}
          >
            Student Profile
          </h3>

          <div style={{ display: "flex", gap: 8 }}>
            {!editingProfile ? (
              <button
                onClick={startEditProfile}
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--accent-strong)",
                  padding: "6px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={saveProfileEdits}
                  disabled={savingProfile}
                  style={{
                    background: "var(--accent-strong)",
                    border: "none",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {savingProfile ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEditProfile}
                  style={{
                    background: "var(--surface-panel)",
                    border: "1px solid var(--border-soft)",
                    color: "var(--text-secondary)",
                    padding: "6px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {FIELDS.map(({ label, key }) => {
            const value = selectedStudent?.[key];
            const editValue = typeof editForm[key] !== "undefined" ? editForm[key] : (value || "");
            return (
              <div key={key} style={FIELD_CARD_STYLE}>
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.4px",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>

                  {!editingProfile ? (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginTop: 2,
                        wordBreak: "break-word",
                      }}
                    >
                      {value || <span style={{ color: "var(--text-muted)" }}>N/A</span>}
                    </div>
                  ) : key === "gender" ? (
                    <select
                      value={editValue}
                      onChange={(e) => setEditForm((p) => ({ ...(p || {}), [key]: e.target.value }))}
                      style={FIELD_INPUT_STYLE}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  ) : (
                    <input
                      value={editValue}
                      onChange={(e) => setEditForm((p) => ({ ...(p || {}), [key]: e.target.value }))}
                      style={FIELD_INPUT_STYLE}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
