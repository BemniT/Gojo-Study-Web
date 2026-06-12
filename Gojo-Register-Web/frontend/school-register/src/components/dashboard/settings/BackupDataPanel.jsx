import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaDatabase, FaExternalLinkAlt } from "react-icons/fa";
import { formatDateForSettings } from "../../../utils/registerSettings";

const SECTION_STYLE = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  boxShadow: "var(--shadow-soft)",
  padding: 18,
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

export default function BackupDataPanel({
  savingKey,
  exportSchoolData,
  createCloudSnapshot,
  onRestoreFile,
  dbRoot,
  backupStats,
  preferencesForm,
}) {
  const navigate = useNavigate();
  const backupInputRef = useRef(null);
  return (
    <div style={SECTION_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <FaDatabase style={{ color: "var(--accent-strong)" }} />
        <div style={{ fontSize: 17, fontWeight: 900 }}>Backup & Data</div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <button
          type="button"
          onClick={exportSchoolData}
          disabled={savingKey === "backupExport"}
          style={SUBTLE_BUTTON_STYLE}
        >
          <FaExternalLinkAlt /> Export School Data
        </button>
        <button
          type="button"
          onClick={createCloudSnapshot}
          disabled={savingKey === "backupSnapshot"}
          style={SUBTLE_BUTTON_STYLE}
        >
          <FaDatabase /> Create Cloud Snapshot
        </button>
        <button
          type="button"
          onClick={() => backupInputRef.current?.click()}
          disabled={savingKey === "backupRestore"}
          style={SUBTLE_BUTTON_STYLE}
        >
          <FaDatabase /> Restore From Backup File
        </button>
        <button
          type="button"
          onClick={() => navigate("/academic-years")}
          style={SUBTLE_BUTTON_STYLE}
        >
          <FaDatabase /> Open Academic Archives
        </button>
        <button
          type="button"
          onClick={() => window.open(`${dbRoot}/YearHistory.json`, "_blank", "noopener,noreferrer")}
          style={SUBTLE_BUTTON_STYLE}
        >
          <FaExternalLinkAlt /> View YearHistory Snapshot
        </button>
        <input
          ref={backupInputRef}
          type="file"
          accept="application/json"
          onChange={onRestoreFile}
          style={{ display: "none" }}
        />
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
        Cloud snapshots: {backupStats.snapshots}. Latest snapshot:{" "}
        {backupStats.lastSnapshot
          ? formatDateForSettings(Number(backupStats.lastSnapshot), preferencesForm)
          : "Not available"}
        .
      </div>
    </div>
  );
}
