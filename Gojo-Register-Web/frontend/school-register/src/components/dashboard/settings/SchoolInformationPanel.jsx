import React from "react";
import { FaGlobe, FaSave } from "react-icons/fa";

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

const TEXTAREA_STYLE = {
  ...INPUT_STYLE,
  minHeight: 94,
  resize: "vertical",
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

const TINY_PILL_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 800,
  background: "var(--surface-accent)",
  color: "var(--accent-strong)",
  border: "1px solid var(--border-strong)",
};

export default function SchoolInformationPanel({
  schoolForm,
  updateSchoolForm,
  savingKey,
  saveSchoolInformation,
}) {
  const saving = savingKey === "school";
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
            <FaGlobe style={{ color: "var(--accent-strong)" }} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>School Information</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
            Basic school details used in ID cards, documents, certificates, and registrar records.
          </div>
        </div>
        <button
          type="button"
          onClick={saveSchoolInformation}
          disabled={saving}
          style={{ ...PRIMARY_BUTTON_STYLE, opacity: saving ? 0.7 : 1 }}
        >
          <FaSave /> {saving ? "Saving..." : "Save School Info"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 260px)",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={LABEL_STYLE}>School Name</label>
            <input
              value={schoolForm.name}
              onChange={(event) => updateSchoolForm("name", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Short Name</label>
            <input
              value={schoolForm.shortName}
              onChange={(event) => updateSchoolForm("shortName", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={LABEL_STYLE}>School Motto</label>
            <input
              value={schoolForm.motto}
              onChange={(event) => updateSchoolForm("motto", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={LABEL_STYLE}>School Logo URL</label>
            <input
              value={schoolForm.logoUrl}
              onChange={(event) => updateSchoolForm("logoUrl", event.target.value)}
              style={INPUT_STYLE}
              placeholder="https://..."
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={LABEL_STYLE}>School Address</label>
            <textarea
              value={schoolForm.addressLine}
              onChange={(event) => updateSchoolForm("addressLine", event.target.value)}
              style={TEXTAREA_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>City</label>
            <input
              value={schoolForm.city}
              onChange={(event) => updateSchoolForm("city", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Region</label>
            <input
              value={schoolForm.region}
              onChange={(event) => updateSchoolForm("region", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Country</label>
            <input
              value={schoolForm.country}
              onChange={(event) => updateSchoolForm("country", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Phone Number</label>
            <input
              value={schoolForm.phone}
              onChange={(event) => updateSchoolForm("phone", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Email</label>
            <input
              value={schoolForm.email}
              onChange={(event) => updateSchoolForm("email", event.target.value)}
              style={INPUT_STYLE}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Website</label>
            <input
              value={schoolForm.website}
              onChange={(event) => updateSchoolForm("website", event.target.value)}
              style={INPUT_STYLE}
              placeholder="https://school.example.com"
            />
          </div>
        </div>

        <div
          style={{
            ...PANEL_STYLE,
            padding: 14,
            background: "linear-gradient(180deg, var(--surface-muted) 0%, var(--surface-panel) 100%)",
          }}
        >
          <div
            style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 10 }}
          >
            Preview
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <img
              src={schoolForm.logoUrl || "/default-profile.png"}
              alt="School logo"
              style={{
                width: 92,
                height: 92,
                borderRadius: 18,
                objectFit: "cover",
                border: "1px solid var(--border-soft)",
                background: "var(--surface-panel)",
              }}
            />
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {schoolForm.name || "School Name"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {schoolForm.motto || "School motto appears here"}
            </div>
            <div style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <div>
                {schoolForm.city || "City"}, {schoolForm.region || "Region"}
              </div>
              <div>{schoolForm.phone || "Phone"}</div>
              <div>{schoolForm.email || "Email"}</div>
              <div>{schoolForm.website || "Website"}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <span style={TINY_PILL_STYLE}>ID Cards</span>
              <span style={TINY_PILL_STYLE}>Certificates</span>
              <span style={TINY_PILL_STYLE}>Documents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
