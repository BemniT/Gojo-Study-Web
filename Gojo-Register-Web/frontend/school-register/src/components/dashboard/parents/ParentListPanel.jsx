import React from "react";
import { FaSearch } from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";

const RESPONSIVE_STYLES = `
  @media (max-width: 600px) {
    .parent-list-card-responsive {
      width: 100% !important;
      max-width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }

  .parent-list-responsive {
    display: flex;
    flex-direction: column;
    margin-top: 12px;
    gap: 12px;
    width: 100%;
    max-width: 100%;
  }

  .parent-list-responsive > div {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 600px) {
    .parent-list-responsive {
      width: 100% !important;
      max-width: 100% !important;
    }

    .parent-list-responsive > div {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
    }
  }
`;

function ParentItem({ parent, selected, onClick, number }) {
  return (
    <div
      onClick={() => onClick(parent)}
      style={{
        padding: "11px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "#ffffff",
        border: selected ? "1px solid #93c5fd" : "1px solid #e2e8f0",
        borderRadius: 14,
        cursor: "pointer",
        boxShadow: selected
          ? "0 14px 28px rgba(37, 99, 235, 0.16), inset 3px 0 0 #2563eb"
          : "0 4px 10px rgba(15, 23, 42, 0.06)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: selected ? "#007AFB" : "#eef2ff",
          color: selected ? "#fff" : "#334155",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {number}
      </div>

      <ProfileAvatar
        imageUrl={parent.profileImage}
        name={parent.name}
        size={48}
        style={{
          border: selected ? "2px solid #60a5fa" : "2px solid #e2e8f0",
          background: "#ffffff",
        }}
      />

      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            color: "#0f172a",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {parent.name}
        </h3>
        <p
          style={{
            margin: "4px 0",
            color: "#555",
            fontSize: 11,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {parent.email && parent.email !== "N/A"
            ? parent.email
            : `${parent.childRelationship || "N/A"}: ${parent.childName || "N/A"}`}
        </p>
        <p style={{ margin: 0, color: "#475569", fontSize: 10, fontWeight: 700 }}>
          {(parent.childCount || 0) === 1 ? "1 Child" : `${parent.childCount || 0} Children`}
        </p>
      </div>
    </div>
  );
}

export default function ParentListPanel({
  filteredParents,
  loadingParents,
  searchTerm,
  setSearchTerm,
  selectedParentId,
  onSelectParent,
  listShellWidth,
  isPortrait,
}) {
  return (
    <div
      className="parent-list-card-responsive"
      style={{
        width: listShellWidth,
        maxWidth: 640,
        position: "relative",
        marginLeft: 0,
        marginRight: isPortrait ? 0 : "24px",
        background: "#ffffff",
        border: "1px solid var(--border-soft)",
        borderRadius: 18,
        boxShadow: "var(--shadow-soft)",
        padding: "14px 14px 22px",
        boxSizing: "border-box",
      }}
    >
      <style>{RESPONSIVE_STYLES}</style>

      <div className="section-header-card" style={{ marginBottom: 12 }}>
        <h2 className="section-header-card__title" style={{ fontSize: 20 }}>
          Parents
        </h2>
        <div className="section-header-card__meta">
          <span>Total: {filteredParents.length}</span>
          <span className="section-header-card__chip">Family View</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "10px" }}>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f8fbff",
            border: "1px solid #dbeafe",
            borderRadius: "12px",
            padding: "10px 12px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
          }}
        >
          <FaSearch style={{ color: "var(--text-muted)", fontSize: 14 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search parents..."
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: 13,
              background: "transparent",
            }}
          />
        </div>
      </div>

      {loadingParents ? (
        <p style={{ color: "var(--text-muted)", marginTop: 2 }}>Loading parents...</p>
      ) : null}
      {!loadingParents && filteredParents.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: 2 }}>No parents found.</p>
      ) : null}

      <div className="parent-list-responsive">
        {!loadingParents &&
          filteredParents.map((parent, index) => (
            <ParentItem
              key={parent.userId || index}
              parent={parent}
              number={index + 1}
              selected={selectedParentId === parent.userId}
              onClick={onSelectParent}
            />
          ))}
        <div aria-hidden="true" style={{ height: 18 }} />
      </div>
    </div>
  );
}
