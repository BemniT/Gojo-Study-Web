import React from "react";

const generateTemporaryPassword = (length = 8) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Small adapter: <input value={form?.[key]} onChange={(e) => onUpdate(key, e.target.value)} />
function DraftField({ label, draft, fieldKey, onUpdate, transform, defaultValue = "" }) {
  const value = draft.form?.[fieldKey] ?? defaultValue;
  return (
    <div className="ps-rereg-field">
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) =>
          onUpdate(fieldKey, transform ? transform(e.target.value) : e.target.value)
        }
      />
    </div>
  );
}

export default function ReRegisterModal({
  open,
  draft,
  mode,
  index,
  queueLength,
  saving,
  onClose,
  onMoveIndex,
  onUpdateField,
  onUpdateParentField,
  onAddParentRow,
  onRemoveParentRow,
  onSave,
}) {
  if (!open || !draft) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 10000,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--surface-panel)",
          borderRadius: 16,
          border: "1px solid var(--border-soft)",
          boxShadow: "0 24px 44px rgba(15,23,42,0.28)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
            background: "linear-gradient(180deg, var(--surface-muted) 0%, var(--surface-panel) 100%)",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>
              {mode === "edit" ? "Edit Student Promotion Draft" : "Re-Register Student Data"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {mode === "edit"
                ? `This draft will be applied when promotion is confirmed | ID: ${draft.studentId}`
                : `Student ${index + 1} of ${queueLength} | ID: ${draft.studentId}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {mode !== "edit" ? (
              <>
                <button
                  onClick={() => onMoveIndex(index - 1)}
                  className="ps-btn"
                  disabled={index === 0 || saving}
                  style={{
                    border: "1px solid var(--border-soft)",
                    background: "var(--surface-panel)",
                    color: "var(--text-secondary)",
                    padding: "7px 10px",
                    fontWeight: 700,
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => onMoveIndex(index + 1)}
                  className="ps-btn"
                  disabled={index >= queueLength - 1 || saving}
                  style={{
                    border: "1px solid var(--border-soft)",
                    background: "var(--surface-panel)",
                    color: "var(--text-secondary)",
                    padding: "7px 10px",
                    fontWeight: 700,
                  }}
                >
                  Next
                </button>
              </>
            ) : null}
            <button
              onClick={onClose}
              className="ps-btn"
              disabled={saving}
              style={{
                border: "1px solid var(--danger-border)",
                background: "var(--surface-panel)",
                color: "var(--danger)",
                padding: "7px 10px",
                fontWeight: 700,
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <div className="ps-rereg-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Basic Student Information */}
              <div className="ps-rereg-section">
                <p className="ps-rereg-section-title">Basic Student Information</p>
                <div className="ps-rereg-grid-3">
                  <DraftField label="First Name" draft={draft} fieldKey="firstName" onUpdate={onUpdateField} />
                  <DraftField label="Middle Name" draft={draft} fieldKey="middleName" onUpdate={onUpdateField} />
                  <DraftField label="Last Name" draft={draft} fieldKey="lastName" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-grid-3" style={{ marginTop: 8 }}>
                  <DraftField label="Grade" draft={draft} fieldKey="grade" onUpdate={onUpdateField} transform={(v) => v.replace(/[^0-9]/g, "")} />
                  <DraftField label="Section" draft={draft} fieldKey="section" onUpdate={onUpdateField} transform={(v) => v.toUpperCase()} />
                  <DraftField label="Academic Year" draft={draft} fieldKey="academicYear" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-grid-3" style={{ marginTop: 8 }}>
                  <DraftField label="Gender" draft={draft} fieldKey="gender" onUpdate={onUpdateField} />
                  <DraftField label="Date of Birth" draft={draft} fieldKey="dob" onUpdate={onUpdateField} />
                  <DraftField label="Admission Date" draft={draft} fieldKey="admissionDate" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-grid-3" style={{ marginTop: 8 }}>
                  <DraftField label="Student Number" draft={draft} fieldKey="studentNumber" onUpdate={onUpdateField} />
                  <DraftField label="National ID Number" draft={draft} fieldKey="nationalIdNumber" onUpdate={onUpdateField} />
                  <DraftField label="Status" draft={draft} fieldKey="status" onUpdate={onUpdateField} defaultValue="active" />
                </div>
                <div className="ps-rereg-grid-2" style={{ marginTop: 8 }}>
                  <DraftField label="Phone" draft={draft} fieldKey="phone" onUpdate={onUpdateField} />
                  <DraftField label="Email" draft={draft} fieldKey="email" onUpdate={onUpdateField} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <DraftField label="Previous School" draft={draft} fieldKey="previousSchool" onUpdate={onUpdateField} />
                </div>
              </div>

              {/* Address Information */}
              <div className="ps-rereg-section">
                <p className="ps-rereg-section-title">Address Information</p>
                <div className="ps-rereg-grid-3">
                  <DraftField label="Region" draft={draft} fieldKey="region" onUpdate={onUpdateField} />
                  <DraftField label="City" draft={draft} fieldKey="city" onUpdate={onUpdateField} />
                  <DraftField label="Sub City" draft={draft} fieldKey="subCity" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-grid-2" style={{ marginTop: 8 }}>
                  <DraftField label="Kebele" draft={draft} fieldKey="kebele" onUpdate={onUpdateField} />
                  <DraftField label="House Number" draft={draft} fieldKey="houseNumber" onUpdate={onUpdateField} />
                </div>
              </div>

              {/* Finance Information */}
              <div className="ps-rereg-section">
                <p className="ps-rereg-section-title">Finance Information</p>
                <div className="ps-rereg-grid-3">
                  <DraftField label="Registration Fee Paid" draft={draft} fieldKey="registrationFeePaid" onUpdate={onUpdateField} />
                  <DraftField label="Has Discount" draft={draft} fieldKey="hasDiscount" onUpdate={onUpdateField} />
                  <DraftField label="Discount Amount" draft={draft} fieldKey="discountAmount" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-grid-2" style={{ marginTop: 8 }}>
                  <DraftField label="Payment Plan Type" draft={draft} fieldKey="paymentPlanType" onUpdate={onUpdateField} />
                  <DraftField label="Transport Service" draft={draft} fieldKey="transportService" onUpdate={onUpdateField} />
                </div>
              </div>

              {/* Health And Academic Setup */}
              <div className="ps-rereg-section">
                <p className="ps-rereg-section-title">Health And Academic Setup</p>
                <div className="ps-rereg-grid-2">
                  <DraftField label="Blood Type" draft={draft} fieldKey="bloodType" onUpdate={onUpdateField} />
                  <DraftField label="Medical Condition" draft={draft} fieldKey="medicalCondition" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-grid-2" style={{ marginTop: 8 }}>
                  <DraftField label="Emergency Contact Name" draft={draft} fieldKey="emergencyContactName" onUpdate={onUpdateField} />
                  <DraftField label="Emergency Phone" draft={draft} fieldKey="emergencyPhone" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-grid-2" style={{ marginTop: 8 }}>
                  <DraftField label="Special Program" draft={draft} fieldKey="specialProgram" onUpdate={onUpdateField} />
                  <DraftField label="Language Option" draft={draft} fieldKey="languageOption" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-field" style={{ marginTop: 8 }}>
                  <label>Elective Subjects</label>
                  <textarea
                    rows={2}
                    value={draft.form?.electiveSubjects || ""}
                    onChange={(e) => onUpdateField("electiveSubjects", e.target.value)}
                  />
                </div>
              </div>

              {/* System Account Information */}
              <div className="ps-rereg-section">
                <p className="ps-rereg-section-title">System Account Information</p>
                <div className="ps-rereg-grid-2">
                  <DraftField label="Username" draft={draft} fieldKey="username" onUpdate={onUpdateField} />
                  <DraftField label="Temporary Password" draft={draft} fieldKey="temporaryPassword" onUpdate={onUpdateField} />
                </div>
                <div className="ps-rereg-grid-2" style={{ marginTop: 8 }}>
                  <DraftField label="Is Active" draft={draft} fieldKey="isActive" onUpdate={onUpdateField} defaultValue="true" />
                  <DraftField label="Role" draft={draft} fieldKey="role" onUpdate={onUpdateField} defaultValue="student" />
                </div>
              </div>

              {/* Parents */}
              <div className="ps-rereg-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <p className="ps-rereg-section-title" style={{ margin: 0 }}>
                    Parent Guardian Information
                  </p>
                  <button
                    onClick={onAddParentRow}
                    type="button"
                    style={{
                      border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                      background: "var(--accent-soft)",
                      color: "var(--accent-strong)",
                      borderRadius: 8,
                      padding: "5px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Add Parent
                  </button>
                </div>
                {(draft.parents || []).map((parent, parentIndex) => (
                  <div
                    key={`${parent.parentId || "parent"}_${parentIndex}`}
                    style={{
                      border: "1px solid var(--border-soft)",
                      borderRadius: 10,
                      padding: 8,
                      marginBottom: 8,
                      background: "var(--surface-panel)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <strong style={{ fontSize: 12, color: "var(--text-primary)" }}>Parent #{parentIndex + 1}</strong>
                      <button
                        type="button"
                        onClick={() => onRemoveParentRow(parentIndex)}
                        style={{
                          border: "1px solid var(--danger-border)",
                          background: "var(--surface-panel)",
                          color: "var(--danger)",
                          borderRadius: 8,
                          padding: "4px 7px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="ps-rereg-grid-3">
                      <div className="ps-rereg-field">
                        <label>Parent ID</label>
                        <input value={parent.parentId || ""} onChange={(e) => onUpdateParentField(parentIndex, "parentId", e.target.value)} />
                      </div>
                      <div className="ps-rereg-field">
                        <label>Full Name</label>
                        <input value={parent.fullName || ""} onChange={(e) => onUpdateParentField(parentIndex, "fullName", e.target.value)} />
                      </div>
                      <div className="ps-rereg-field">
                        <label>Relationship</label>
                        <select value={parent.relationship || "Guardian"} onChange={(e) => onUpdateParentField(parentIndex, "relationship", e.target.value)}>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Guardian">Guardian</option>
                        </select>
                      </div>
                    </div>
                    <div className="ps-rereg-grid-3" style={{ marginTop: 8 }}>
                      <div className="ps-rereg-field">
                        <label>Phone</label>
                        <input value={parent.phone || ""} onChange={(e) => onUpdateParentField(parentIndex, "phone", e.target.value)} />
                      </div>
                      <div className="ps-rereg-field">
                        <label>Alternative Phone</label>
                        <input value={parent.alternativePhone || ""} onChange={(e) => onUpdateParentField(parentIndex, "alternativePhone", e.target.value)} />
                      </div>
                      <div className="ps-rereg-field">
                        <label>Email</label>
                        <input value={parent.email || ""} onChange={(e) => onUpdateParentField(parentIndex, "email", e.target.value)} />
                      </div>
                    </div>
                    <div className="ps-rereg-grid-3" style={{ marginTop: 8 }}>
                      <div className="ps-rereg-field">
                        <label>Occupation</label>
                        <input value={parent.occupation || ""} onChange={(e) => onUpdateParentField(parentIndex, "occupation", e.target.value)} />
                      </div>
                      <div className="ps-rereg-field">
                        <label>National ID Number</label>
                        <input value={parent.nationalIdNumber || ""} onChange={(e) => onUpdateParentField(parentIndex, "nationalIdNumber", e.target.value)} />
                      </div>
                      <div className="ps-rereg-field">
                        <label>Username</label>
                        <input value={parent.username || ""} onChange={(e) => onUpdateParentField(parentIndex, "username", e.target.value)} />
                      </div>
                    </div>
                    <div className="ps-rereg-grid-3" style={{ marginTop: 8 }}>
                      <div className="ps-rereg-field">
                        <label>Temporary Password</label>
                        <input value={parent.temporaryPassword || ""} onChange={(e) => onUpdateParentField(parentIndex, "temporaryPassword", e.target.value)} />
                      </div>
                      <div className="ps-rereg-field">
                        <label>isActive</label>
                        <select value={parent.isActive || "true"} onChange={(e) => onUpdateParentField(parentIndex, "isActive", e.target.value)}>
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      </div>
                      <div className="ps-rereg-field">
                        <label>Role</label>
                        <input value={parent.role || "parent"} readOnly />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => onUpdateParentField(parentIndex, "temporaryPassword", generateTemporaryPassword(8))}
                        style={{
                          border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                          color: "var(--accent-strong)",
                          background: "var(--surface-panel)",
                          borderRadius: 8,
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Generate Password
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border-soft)",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
            background: "linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)",
          }}
        >
          {mode === "edit" ? (
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
                Save the draft here, then confirm promotion when you are ready.
              </div>
              <button onClick={onSave} className="ps-btn ps-btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onMoveIndex(index + 1)}
                className="ps-btn"
                disabled={index >= queueLength - 1 || saving}
                style={{
                  border: "1px solid var(--border-soft)",
                  background: "var(--surface-panel)",
                  color: "var(--text-secondary)",
                  fontWeight: 700,
                }}
              >
                Skip (Next)
              </button>
              <button onClick={onSave} className="ps-btn ps-btn-primary" disabled={saving}>
                {saving
                  ? "Saving..."
                  : index >= queueLength - 1
                  ? "Re-Register & Finish"
                  : "Re-Register & Next"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
