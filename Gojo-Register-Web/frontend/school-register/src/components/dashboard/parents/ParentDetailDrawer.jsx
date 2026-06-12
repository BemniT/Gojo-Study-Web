import React from "react";
import ProfileAvatar from "../../ProfileAvatar";
import ParentChatPopup from "./ParentChatPopup";

const TABS = [
  { key: "Details", label: "DETAILS" },
  { key: "Children", label: "CHILDREN" },
  { key: "Status", label: "STATUS" },
];

const elevatedPanelStyle = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  boxShadow: "var(--shadow-soft)",
};

const detailsCardStyle = {
  padding: "12px",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "var(--surface-panel)",
};

const infoTileStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  background: "var(--surface-panel)",
  padding: "8px",
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
  minHeight: 36,
};

const statusValueColor = (label, value) => {
  if (label === "Status") {
    const v = String(value || "").toLowerCase();
    if (v === "active") return "var(--success)";
    if (v === "inactive" || v === "disabled") return "var(--danger)";
  }
  return "var(--text-primary)";
};

const tabButtonStyle = (isActive) => ({
  flex: 1,
  padding: "6px",
  background: "none",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  color: isActive ? "var(--accent-strong)" : "var(--text-muted)",
  fontSize: "10px",
  borderBottom: isActive ? "3px solid var(--accent-strong)" : "3px solid transparent",
});

const headerButtonStyle = {
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.14)",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};

const formatAddress = (parent) => {
  if (typeof parent.address === "string") return parent.address;
  if (parent.address && typeof parent.address === "object") {
    const parts = [
      parent.address.street,
      parent.address.subCity,
      parent.address.city,
      parent.address.state,
      parent.address.region,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  return "—";
};

const formatRelationships = (parent) => {
  if (Array.isArray(parent.relationships) && parent.relationships.length > 0) {
    return Array.from(new Set(parent.relationships.filter(Boolean))).join(", ");
  }
  return parent.childRelationship && parent.childRelationship !== "N/A"
    ? parent.childRelationship
    : "—";
};

export default function ParentDetailDrawer({
  isFullscreen = false,
  selectedParent,
  parentInfo,
  children: childList,
  parentTab,
  setParentTab,
  setParentFullscreenOpen,
  setSelectedParent,
  setParentChatOpen,
  setSidebarVisible,
  isPortrait,
  detailDrawerRight,
  detailDrawerTop,
  detailDrawerHeight,
  // Chat popup wiring
  parentChatOpen,
  adminUserId,
  messages,
  newMessageText,
  setNewMessageText,
  typingUserId,
  chatMessagesContainerRef,
  messagesEndRef,
  handleChatScroll,
  handleTyping,
  sendMessage,
}) {
  if (!selectedParent) return null;

  const activeParent =
    parentInfo && String(parentInfo.userId) === String(selectedParent.userId)
      ? { ...selectedParent, ...parentInfo }
      : selectedParent;

  const formattedStatus = activeParent.status
    ? `${String(activeParent.status).charAt(0).toUpperCase()}${String(activeParent.status).slice(1)}`
    : "—";
  const formattedCreatedAt =
    activeParent.createdAt && activeParent.createdAt !== "N/A"
      ? new Date(activeParent.createdAt).toLocaleString()
      : "—";

  const profileItems = [
    { label: "Parent ID", value: activeParent.parentId || "—" },
    { label: "Username", value: activeParent.username || "—" },
    { label: "Email", value: activeParent.email || "N/A" },
    { label: "Phone", value: activeParent.phone || "N/A" },
    { label: "Age", value: activeParent.age || "—" },
    {
      label: "City",
      value:
        activeParent.city ||
        (activeParent.address && typeof activeParent.address === "object"
          ? activeParent.address.city
          : activeParent.city) ||
        "—",
    },
    { label: "Citizenship", value: activeParent.citizenship || "—" },
    { label: "Job", value: activeParent.job || "—" },
    { label: "Status", value: formattedStatus },
    { label: "Relationship", value: formatRelationships(activeParent) },
    { label: "Children", value: childList.length || "0" },
    { label: "Created", value: formattedCreatedAt },
    { label: "Address", value: formatAddress(activeParent), fullWidth: true },
    {
      label: "Additional Info",
      value:
        activeParent.additionalInfo && activeParent.additionalInfo !== "N/A"
          ? activeParent.additionalInfo
          : "—",
      fullWidth: true,
    },
  ];

  const detailsSection = (
    <div style={detailsCardStyle}>
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
        Parent Profile
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {profileItems.map((item) => (
          <div
            key={item.label}
            style={{ ...infoTileStyle, gridColumn: item.fullWidth ? "1 / -1" : "auto" }}
          >
            <div>
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.4px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: statusValueColor(item.label, item.value),
                  marginTop: 2,
                  wordBreak: "break-word",
                }}
              >
                {item.value || <span style={{ color: "var(--text-muted)" }}>N/A</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const childrenSection = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {childList.length === 0 ? (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid var(--border-soft)",
            background: "var(--surface-panel)",
            color: "var(--text-muted)",
          }}
        >
          No children found.
        </div>
      ) : (
        childList.map((c) => (
          <div
            key={c.studentId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px",
              borderRadius: 12,
              ...elevatedPanelStyle,
            }}
          >
            <ProfileAvatar
              imageUrl={c.profileImage}
              name={c.name}
              size={44}
              style={{ border: "2px solid var(--accent-strong)" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  marginBottom: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.name}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                Grade {c.grade}
                {c.section ? ` • ${c.section}` : ""}
                {` • Relation: ${c.relationship || "N/A"}`}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const statusSection = (
    <div
      style={{
        padding: "12px",
        borderRadius: 12,
        border: "1px solid var(--border-soft)",
        background: "var(--surface-panel)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Status", value: activeParent.status || "Active" },
          {
            label: "Created",
            value: activeParent.createdAt
              ? new Date(activeParent.createdAt).toLocaleString()
              : "—",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: 8,
              borderRadius: 10,
              border: "1px solid var(--border-soft)",
              background: "var(--surface-muted)",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.4px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginTop: 2,
                wordBreak: "break-word",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isFullscreen) {
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
                imageUrl={activeParent.profileImage}
                name={activeParent.name}
                size={56}
                style={{ border: "2px solid rgba(255,255,255,0.8)" }}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{activeParent.name || "Parent"}</div>
                <div style={{ fontSize: 12, opacity: 0.95 }}>
                  {activeParent.parentId || "No Parent ID"}
                  {activeParent.phone ? ` • ${activeParent.phone}` : ""}
                  {activeParent.email ? ` • ${activeParent.email}` : ""}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setParentFullscreenOpen(false)} style={headerButtonStyle}>
                Exit Full Screen
              </button>
            </div>
          </div>

          <div
            style={{
              padding: 14,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "var(--surface-panel)",
                border: "1px solid var(--border-soft)",
                borderRadius: 12,
                padding: 10,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-strong)", marginBottom: 8 }}>
                Parent Details
              </div>
              {detailsSection}
            </div>

            <div
              style={{
                background: "var(--surface-panel)",
                border: "1px solid var(--border-soft)",
                borderRadius: 12,
                padding: 10,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-strong)", marginBottom: 8 }}>
                Status
              </div>
              {statusSection}
            </div>

            <div
              style={{
                background: "var(--surface-panel)",
                border: "1px solid var(--border-soft)",
                borderRadius: 12,
                padding: 10,
                boxShadow: "var(--shadow-soft)",
                gridColumn: "1 / -1",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-strong)", marginBottom: 8 }}>
                Children
              </div>
              {childrenSection}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const panelStyle = {
    width: isPortrait ? "100%" : "380px",
    position: "fixed",
    left: isPortrait ? 0 : "auto",
    right: detailDrawerRight,
    top: detailDrawerTop,
    height: detailDrawerHeight,
    background: "#ffffff",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
    padding: "14px",
    paddingBottom: "130px",
    boxShadow: "var(--shadow-panel)",
    borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
    borderRadius: isPortrait ? 0 : 18,
    transition: "all 0.35s ease",
    fontSize: "10px",
  };

  return (
    <aside className="parent-info-sidebar" style={panelStyle}>
      <div style={{ position: "absolute", top: 12, left: 14, zIndex: 999 }}>
        <button
          onClick={() => {
            setSelectedParent(null);
            setParentChatOpen(false);
            setParentFullscreenOpen(false);
            setSidebarVisible(false);
          }}
          aria-label="Close sidebar"
          style={{
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.42)",
            borderRadius: 999,
            backdropFilter: "blur(6px)",
            fontSize: 24,
            fontWeight: 700,
            color: "#ffffff",
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
            boxShadow: "0 8px 22px rgba(15, 23, 42, 0.18)",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ position: "absolute", top: 8, right: 14, zIndex: 999 }}>
        <button
          onClick={() => setParentFullscreenOpen(true)}
          aria-label="Expand parent profile"
          title="Expand"
          style={{
            border: "1px solid var(--border-strong)",
            background: "var(--surface-panel)",
            color: "var(--accent-strong)",
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          ⤢
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "14px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
            margin: "-14px -14px 12px",
            padding: "16px 10px",
            textAlign: "center",
          }}
        >
          <ProfileAvatar
            imageUrl={selectedParent.profileImage}
            name={selectedParent.name}
            size={70}
            style={{ margin: "0 auto 10px", border: "3px solid rgba(255,255,255,0.8)" }}
          />
          <h2 style={{ margin: 0, color: "#ffffff", fontSize: 14, fontWeight: 800 }}>
            {selectedParent.name}
          </h2>
          <p style={{ margin: "4px 0", color: "#dbeafe", fontSize: "10px" }}>
            {selectedParent.parentId || "No Parent ID"}
          </p>
          <p style={{ margin: 0, color: "#dbeafe", fontSize: "10px" }}>
            {selectedParent.phone || "No phone"}
            {selectedParent.email ? ` • ${selectedParent.email}` : ""}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-soft)",
            marginBottom: "10px",
            flexShrink: 0,
            background: "var(--surface-panel)",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setParentTab(t.key)}
              style={tabButtonStyle(parentTab === t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: 40,
            paddingRight: 2,
          }}
        >
          {parentTab === "Details" && detailsSection}
          {parentTab === "Children" && childrenSection}
          {parentTab === "Status" && statusSection}
        </div>

        <ParentChatPopup
          open={parentChatOpen}
          setOpen={setParentChatOpen}
          selectedParent={selectedParent}
          messages={messages}
          adminUserId={adminUserId}
          typingUserId={typingUserId}
          chatMessagesContainerRef={chatMessagesContainerRef}
          messagesEndRef={messagesEndRef}
          handleChatScroll={handleChatScroll}
          newMessageText={newMessageText}
          setNewMessageText={setNewMessageText}
          handleTyping={handleTyping}
          sendMessage={sendMessage}
        />
      </div>
    </aside>
  );
}
