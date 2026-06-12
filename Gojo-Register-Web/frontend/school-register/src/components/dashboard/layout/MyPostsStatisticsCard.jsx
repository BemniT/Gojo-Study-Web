import React from "react";

const WIDGET_CARD_STYLE = {
  background: "linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-accent) 100%)",
  borderRadius: 16,
  boxShadow: "var(--shadow-soft)",
  padding: "11px",
  border: "1px solid var(--border-soft)",
};

const SMALL_STAT_STYLE = {
  padding: "5px 8px",
  borderRadius: 12,
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: 72,
};

const LABEL_STYLE = { fontSize: 10, color: "var(--text-muted)", fontWeight: 600 };
const VALUE_STYLE = { marginTop: 3, fontSize: 13, fontWeight: 800, color: "var(--text-primary)" };

export default function MyPostsStatisticsCard({ postsCount, mediaPostCount, totalPostLikes }) {
  return (
    <div style={WIDGET_CARD_STYLE}>
      <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
        Quick Statistics
      </h4>
      <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={SMALL_STAT_STYLE}>
            <div style={LABEL_STYLE}>My Posts</div>
            <div style={VALUE_STYLE}>{postsCount}</div>
          </div>
          <div style={SMALL_STAT_STYLE}>
            <div style={LABEL_STYLE}>Media</div>
            <div style={VALUE_STYLE}>{mediaPostCount}</div>
          </div>
          <div style={SMALL_STAT_STYLE}>
            <div style={LABEL_STYLE}>Likes</div>
            <div style={VALUE_STYLE}>{totalPostLikes}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
