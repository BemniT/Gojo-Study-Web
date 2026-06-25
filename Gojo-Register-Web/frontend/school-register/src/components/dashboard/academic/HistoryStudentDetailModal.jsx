import React from "react";
import ProfileAvatar from "../../ProfileAvatar";

const formatFieldLabel = (key) =>
  String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (s) => s.toUpperCase());

const formatFieldValue = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    const allPrimitive = value.every(
      (item) => item === null || ["string", "number", "boolean"].includes(typeof item)
    );
    return allPrimitive ? value.join(", ") : `${value.length} item(s)`;
  }
  if (typeof value === "object") return "Available";
  const text = String(value).trim();
  return text || "-";
};

const EXCLUDE_OTHER_FIELDS = new Set([
  "basicStudentInformation",
  "contactInformation",
  "parentInformation",
  "guardianInformation",
  "profileImage",
  "name",
  "studentId",
]);

const SECTION_CARD = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  padding: 12,
  boxShadow: "var(--shadow-soft)",
};

const SECTION_HEADING = {
  fontSize: 13,
  fontWeight: 800,
  color: "var(--accent-strong)",
  marginBottom: 8,
};

const FIELD_TILE = {
  fontSize: 11,
  color: "var(--text-muted)",
  fontWeight: 700,
};

const FIELD_VALUE = {
  marginTop: 2,
  fontSize: 12,
  color: "var(--text-primary)",
  fontWeight: 700,
};

function FieldSection({ title, entries, keyPrefix }) {
  return (
    <div style={SECTION_CARD}>
      <div style={SECTION_HEADING}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {entries.map(([key, value]) => (
          <div key={`${keyPrefix}-${key}`} className="ay-student-item">
            <div style={FIELD_TILE}>{formatFieldLabel(key)}</div>
            <div style={FIELD_VALUE}>{formatFieldValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistoryStudentDetailModal({ student, onClose }) {
  if (!student) return null;

  const guardianSource = student.parentInformation || student.guardianInformation;
  const otherEntries = Object.entries(student).filter(
    ([key, value]) =>
      !EXCLUDE_OTHER_FIELDS.has(key) && (typeof value !== "object" || Array.isArray(value))
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
        onClick={(e) => e.stopPropagation()}
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
              imageUrl={student.profileImage}
              name={student.name || "Student"}
              size={56}
              style={{ border: "2px solid rgba(255,255,255,0.8)" }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{student.name || "Student"}</div>
              <div style={{ fontSize: 12, opacity: 0.95 }}>
                {student.studentId || "No student ID"}
                {student.grade ? ` • Grade ${student.grade}` : ""}
                {student.section ? ` • Section ${student.section}` : ""}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(255,255,255,0.45)",
              background: "rgba(255,255,255,0.14)",
              color: "#fff",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Exit Full Screen
          </button>
        </div>

        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {/* Overview */}
          <div style={SECTION_CARD}>
            <div style={SECTION_HEADING}>Overview</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["Grade", student.grade || "—"],
                ["Section", student.section || "—"],
                ["Email", student.email || "—"],
                ["User ID", student.userId || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    border: "1px solid var(--border-soft)",
                    background: "var(--surface-muted)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <strong>{label}:</strong> {value}
                </div>
              ))}
            </div>
          </div>

          <FieldSection
            title="Basic Information"
            keyPrefix="basic"
            entries={Object.entries(student.basicStudentInformation || {})}
          />

          {guardianSource ? (
            <FieldSection
              title="Guardian Information"
              keyPrefix="guardian"
              entries={Object.entries(guardianSource)}
            />
          ) : null}

          {student.contactInformation ? (
            <FieldSection
              title="Contact Information"
              keyPrefix="contact"
              entries={Object.entries(student.contactInformation)}
            />
          ) : null}

          <div style={{ ...SECTION_CARD, gridColumn: "1 / -1" }}>
            <div style={SECTION_HEADING}>Other Information</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {otherEntries.map(([key, value]) => (
                <div key={`other-${key}`} className="ay-student-item">
                  <div style={FIELD_TILE}>{formatFieldLabel(key)}</div>
                  <div style={FIELD_VALUE}>{formatFieldValue(value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
