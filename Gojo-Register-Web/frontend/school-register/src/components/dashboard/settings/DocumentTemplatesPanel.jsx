import React from "react";
import { useNavigate } from "react-router-dom";
import { FaExternalLinkAlt, FaFileAlt, FaSave } from "react-icons/fa";

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

export default function DocumentTemplatesPanel({
  templateForm,
  updateTemplateForm,
  savingKey,
  saveTemplates,
}) {
  const navigate = useNavigate();
  const saving = savingKey === "templates";
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
            <FaFileAlt style={{ color: "var(--accent-strong)" }} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>Document Templates</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
            Configure document naming defaults for ID cards, enrollment letters, transfer letters,
            and certificates.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate("/document-generation")}
            style={SUBTLE_BUTTON_STYLE}
          >
            <FaExternalLinkAlt /> Open Document Generation
          </button>
          <button
            type="button"
            onClick={saveTemplates}
            disabled={saving}
            style={{ ...PRIMARY_BUTTON_STYLE, opacity: saving ? 0.7 : 1 }}
          >
            <FaSave /> {saving ? "Saving..." : "Save Templates"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <div>
          <label style={LABEL_STYLE}>Student ID Card Title</label>
          <input
            value={templateForm.idCardTitle}
            onChange={(event) => updateTemplateForm("idCardTitle", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Enrollment Letter Title</label>
          <input
            value={templateForm.enrollmentLetterTitle}
            onChange={(event) => updateTemplateForm("enrollmentLetterTitle", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Transfer Letter Title</label>
          <input
            value={templateForm.transferLetterTitle}
            onChange={(event) => updateTemplateForm("transferLetterTitle", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Certificate Title</label>
          <input
            value={templateForm.certificateTitle}
            onChange={(event) => updateTemplateForm("certificateTitle", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Signatory Name</label>
          <input
            value={templateForm.signatoryName}
            onChange={(event) => updateTemplateForm("signatoryName", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div>
          <label style={LABEL_STYLE}>Footer Note</label>
          <input
            value={templateForm.footerNote}
            onChange={(event) => updateTemplateForm("footerNote", event.target.value)}
            style={INPUT_STYLE}
          />
        </div>
      </div>
    </div>
  );
}
