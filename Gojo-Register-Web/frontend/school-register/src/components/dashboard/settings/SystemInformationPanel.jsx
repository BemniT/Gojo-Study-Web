import React from "react";
import { FaFileAlt } from "react-icons/fa";

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

export default function SystemInformationPanel({ systemInfo }) {
  return (
    <div style={SECTION_STYLE}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <FaFileAlt style={{ color: "var(--accent-strong)" }} />
        <div style={{ fontSize: 17, fontWeight: 900 }}>System Information</div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {[
          { label: "System version", value: systemInfo.version },
          { label: "Server status", value: systemInfo.serverStatus },
          { label: "Last update", value: systemInfo.lastUpdate },
          { label: "Storage usage", value: systemInfo.storageUsage },
        ].map((item) => (
          <div key={item.label} style={{ ...PANEL_STYLE, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>
              {item.label}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-primary)", fontWeight: 800 }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
