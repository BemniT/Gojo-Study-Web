import React from "react";
import { FaChevronDown } from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";

const HEADER_BUTTON_STYLE = {
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.14)",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};

const SECTION_TOGGLE_STYLE = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "var(--surface-muted)",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  padding: "8px 10px",
  cursor: "pointer",
  marginBottom: 8,
};

const FIELD_CARD_STYLE = {
  background: "var(--surface-muted)",
  border: "1px solid var(--border-soft)",
  borderRadius: 8,
  padding: "8px 10px",
};

const INPUT_STYLE = {
  width: "100%",
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  background: "var(--input-bg)",
  color: "var(--text-primary)",
};

export default function StudentFullscreenModal({
  open,
  onClose,
  selectedStudent,
  fullscreenEditing,
  setFullscreenEditing,
  fullscreenSaving,
  fullscreenSectionCollapsed,
  toggleFullscreenSection,
  fullscreenEditForm,
  sectionDefinitions,
  registrationSections,
  excludedAdditionalKeys,
  updateFullscreenSectionField,
  updateFullscreenAdditionalField,
  resetFullscreenEditFormFromSelected,
  saveFullscreenEdits,
  isImageValue,
  formatFieldLabel,
  renderDisplayValue,
}) {
  if (!selectedStudent || !open) return null;

  const additionalEntries = fullscreenEditing
    ? Object.entries(fullscreenEditForm.additional || {})
    : Object.entries(
        Object.fromEntries(
          Object.entries(selectedStudent || {}).filter(
            ([k]) => !excludedAdditionalKeys.includes(k)
          )
        )
      );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "linear-gradient(180deg, var(--page-bg-secondary) 0%, var(--page-bg) 100%)",
        overflowY: "auto",
        padding: "16px 20px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          background: "var(--surface-panel)",
          border: "1px solid var(--border-soft)",
          borderRadius: 16,
          boxShadow: "var(--shadow-panel)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            color: "#fff",
            background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ProfileAvatar
              imageUrl={selectedStudent.profileImage}
              name={selectedStudent.name}
              size={56}
              style={{ border: "2px solid rgba(255,255,255,0.8)" }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedStudent.name || "Student"}</div>
              <div style={{ fontSize: 12, opacity: 0.95 }}>
                {selectedStudent.studentId} • Grade {selectedStudent.grade || "-"} • Section {selectedStudent.section || "-"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!fullscreenEditing ? (
              <button onClick={() => setFullscreenEditing(true)} style={HEADER_BUTTON_STYLE}>
                Edit All Sections
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    resetFullscreenEditFormFromSelected();
                    setFullscreenEditing(false);
                  }}
                  style={HEADER_BUTTON_STYLE}
                  disabled={fullscreenSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={saveFullscreenEdits}
                  style={{
                    ...HEADER_BUTTON_STYLE,
                    background: "#16a34a",
                    opacity: fullscreenSaving ? 0.75 : 1,
                  }}
                  disabled={fullscreenSaving}
                >
                  {fullscreenSaving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}

            <button onClick={onClose} style={HEADER_BUTTON_STYLE}>
              Exit Full Screen
            </button>
          </div>
        </div>

        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {sectionDefinitions.map((section) => {
            const sectionData = fullscreenEditing
              ? (fullscreenEditForm.sections?.[section.key] || {})
              : (registrationSections?.[section.key] || {});
            const isCollapsed = !!fullscreenSectionCollapsed?.[section.key];
            const sectionEntries = Object.entries(sectionData || {});
            const imageEntries = !fullscreenEditing
              ? sectionEntries.filter(([key, value]) => isImageValue(key, value))
              : [];
            const nonImageEntries = !fullscreenEditing
              ? sectionEntries.filter(([key, value]) => !isImageValue(key, value))
              : sectionEntries;

            return (
              <div
                key={section.title}
                style={{
                  background: "var(--surface-panel)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: 12,
                  padding: 10,
                  boxShadow: "var(--shadow-soft)",
                  gridColumn: section.fullWidth ? "1 / -1" : "auto",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFullscreenSection(section.key)}
                  style={SECTION_TOGGLE_STYLE}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-strong)" }}>
                    {section.title}
                  </span>
                  <FaChevronDown
                    style={{
                      color: "var(--accent-strong)",
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      transition: "transform .2s ease",
                    }}
                  />
                </button>

                {!isCollapsed && (Object.keys(sectionData || {}).length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No data</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {!fullscreenEditing && imageEntries.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                        {imageEntries.map(([key, value]) => (
                          <div key={`image_${key}`} style={FIELD_CARD_STYLE}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                              {formatFieldLabel(key)}
                            </div>
                            {renderDisplayValue(key, value)}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                      {nonImageEntries.map(([key, value]) => (
                        <div key={key} style={FIELD_CARD_STYLE}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            {formatFieldLabel(key)}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 2, wordBreak: "break-word" }}>
                            {!fullscreenEditing ? (
                              renderDisplayValue(key, value)
                            ) : (
                              <div style={{ display: "grid", gap: 6 }}>
                                <input
                                  value={value ?? ""}
                                  onChange={(event) =>
                                    updateFullscreenSectionField(section.key, key, event.target.value)
                                  }
                                  style={INPUT_STYLE}
                                />
                                {isImageValue(key, value) ? (
                                  <img
                                    src={String(value || "")}
                                    alt={formatFieldLabel(key)}
                                    style={{
                                      width: "100%",
                                      maxHeight: 160,
                                      objectFit: "cover",
                                      borderRadius: 8,
                                      border: "1px solid var(--border-strong)",
                                    }}
                                  />
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          <div
            style={{
              background: "var(--surface-panel)",
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              padding: 12,
              boxShadow: "var(--shadow-soft)",
              gridColumn: "1 / -1",
            }}
          >
            <button
              type="button"
              onClick={() => toggleFullscreenSection("additional")}
              style={SECTION_TOGGLE_STYLE}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-strong)" }}>
                Additional Student Data
              </span>
              <FaChevronDown
                style={{
                  color: "var(--accent-strong)",
                  transform: fullscreenSectionCollapsed?.additional ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform .2s ease",
                }}
              />
            </button>

            {!fullscreenSectionCollapsed?.additional && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                {additionalEntries.map(([key, value]) => (
                  <div key={key} style={FIELD_CARD_STYLE}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                      {formatFieldLabel(key)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 2, wordBreak: "break-word" }}>
                      {!fullscreenEditing ? (
                        renderDisplayValue(key, value)
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          <input
                            value={value ?? ""}
                            onChange={(event) => updateFullscreenAdditionalField(key, event.target.value)}
                            style={INPUT_STYLE}
                          />
                          {isImageValue(key, value) ? (
                            <img
                              src={String(value || "")}
                              alt={formatFieldLabel(key)}
                              style={{
                                width: "100%",
                                maxHeight: 160,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid var(--border-strong)",
                              }}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
