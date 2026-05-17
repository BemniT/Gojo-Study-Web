import React from "react";
import { FaArrowLeft, FaFilter } from "react-icons/fa";
import styles from "./AllChat.module.css";

export default function ContactList(props) {
  const {
    navigate,
    isMobile,
    selectedTab,
    selectedChatUser,
    sidebarOpen,
    setSelectedTab,
    setSelectedChatUser,
    setCurrentChatKey,
    setSelectedStudentGrade,
    setSelectedStudentSection,
    setShowStudentFilters,
    showSearchFilterCard,
    showStudentFilters,
    isStudentFilterActive,
    tabTitle,
    listCount,
    searchText,
    setSearchText,
    availableStudentGrades,
    availableStudentSections,
    students,
    parents,
    admins,
    loadingContacts,
    list,
    unreadCounts,
    createPlaceholderAvatar,
    isUserOnline,
    getLastSeenText,
    setUnreadCounts,
    setSidebarOpen,
    handleContactListScroll,
    contactScrollRef,
  } = props;

  const formatAdminRole = (user) => {
    const rawRole = String(user?.title || user?.role || user?.source || "").trim().toLowerCase();
    if (!rawRole) return "Management";

    if (rawRole.includes("school admin")) return "School Admin";
    if (rawRole === "hr") return "HR";
    if (rawRole.includes("registerer")) return "Registerer";
    if (rawRole.includes("management")) return "Management";

    return rawRole
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <div
      className={styles.contactLayout}
      style={{
        display:
          isMobile && !selectedChatUser
            ? "flex"
            : isMobile && selectedChatUser
            ? "none"
            : "flex",
        alignItems: "stretch",
        position: isMobile && !selectedChatUser ? "fixed" : "static",
        top: isMobile && !selectedChatUser ? "var(--topbar-height, 0px)" : 0,
        left: 0,
        width: isMobile && !selectedChatUser ? "100vw" : undefined,
        height: isMobile && !selectedChatUser ? "calc(100dvh - var(--topbar-height, 0px))" : undefined,
        background: isMobile && !selectedChatUser ? "#fff" : undefined,
        zIndex: isMobile && !selectedChatUser ? 100 : undefined,
      }}
    >
      <div
        className={styles.contactPanel}
        style={{
          width: isMobile && !selectedChatUser ? "100vw" : sidebarOpen ? (isMobile ? 230 : 320) : 0,
          height: isMobile && !selectedChatUser ? "calc(100dvh - var(--topbar-height, 0px))" : "auto",
          padding: sidebarOpen || (isMobile && !selectedChatUser) ? 16 : 0,
          boxShadow: sidebarOpen || (isMobile && !selectedChatUser) ? "0 16px 30px rgba(15, 23, 42, 0.08)" : "none",
          border: sidebarOpen || (isMobile && !selectedChatUser) ? "1px solid #e2e8f0" : "none",
          borderRadius: isMobile ? 0 : 22,
          display: sidebarOpen || (isMobile && !selectedChatUser) ? "flex" : "none",
          overflowY: isMobile && !selectedChatUser ? "auto" : "visible",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              border: "1px solid #dbeafe",
              background: "#ffffff",
              padding: 8,
              cursor: "pointer",
              borderRadius: 999,
              color: "#007AFB",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
            }}
            aria-label="Go back"
          >
            <FaArrowLeft size={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Chats</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>Telegram-like focus, school-safe communication</div>
          </div>
        </div>

        {/* tabs, filters, search and list are rendered by parent via props/list */}
        <div style={{ marginTop: showSearchFilterCard ? 6 : 0, marginBottom: showSearchFilterCard ? 10 : 2 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {[
              { key: "student", label: "Students" },
              { key: "parent", label: "Parents" },
              { key: "admin", label: "Management" },
            ].map((tab) => {
              const active = selectedTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSelectedTab(tab.key);
                    if (tab.key !== "student") {
                      setShowStudentFilters(false);
                      setSelectedStudentGrade("All");
                      setSelectedStudentSection("All");
                    }
                  }}
                  style={{
                    border: active ? "1px solid #007AFB" : "1px solid #dbeafe",
                    background: active ? "#007AFB" : "#ffffff",
                    color: active ? "#ffffff" : "#1e3a8a",
                    borderRadius: 10,
                    padding: "8px 6px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 12,
                    lineHeight: 1.2,
                  }}
                >
                  <div>{tab.label}</div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={`Search ${tabTitle.toLowerCase()}...`}
              style={{
                flex: 1,
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 13,
                outline: "none",
              }}
            />

            {selectedTab === "student" ? (
              <button
                onClick={() => setShowStudentFilters((value) => !value)}
                style={{
                  border: isStudentFilterActive ? "1px solid #007AFB" : "1px solid #dbeafe",
                  background: isStudentFilterActive ? "#eff6ff" : "#ffffff",
                  color: "#1e40af",
                  borderRadius: 10,
                  width: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="Toggle student filters"
                title="Toggle student filters"
              >
                <FaFilter size={14} />
              </button>
            ) : null}
          </div>

          {selectedTab === "student" && showStudentFilters ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <select
                onChange={(event) => setSelectedStudentGrade(event.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px", fontSize: 12 }}
              >
                {availableStudentGrades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade === "All" ? "All grades" : `Grade ${grade}`}
                  </option>
                ))}
              </select>

              <select
                onChange={(event) => setSelectedStudentSection(event.target.value)}
                style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px", fontSize: 12 }}
              >
                {availableStudentSections.map((section) => (
                  <option key={section} value={section}>
                    {section === "All" ? "All sections" : `Section ${section}`}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div ref={contactScrollRef} onScroll={handleContactListScroll} style={{ marginTop: 4, overflowY: "auto", flex: 1, paddingRight: 2 }}>
          {loadingContacts ? (
            <div style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>Loading permitted contacts...</div>
          ) : list.length === 0 ? (
            <div style={{ padding: "12px 8px", color: "#64748b", fontSize: 13 }}>
              {searchText.trim() ? "No matching contacts." : `No permitted ${tabTitle.toLowerCase()} contacts.`}
            </div>
          ) : null}

          {list.map((u) => {
            const isActive = selectedChatUser?.userId === u.userId;
            const unread = unreadCounts[u.userId] || 0;
            const roleLabel = formatAdminRole(u);
            const presenceLabel = isUserOnline(u.userId)
              ? "Online now"
              : getLastSeenText(u.userId) || tabTitle;
            const subtitle = selectedTab === "admin"
              ? `${roleLabel}${presenceLabel ? ` • ${presenceLabel}` : ""}`
              : presenceLabel;

            return (
              <div
                key={u.userId}
                onClick={() => {
                  setSelectedChatUser(u);
                  setCurrentChatKey(null);
                  setUnreadCounts((previousCounts) => ({
                    ...previousCounts,
                    [u.userId]: 0,
                  }));
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`${styles.contactRow} ${isActive ? styles.contactRowActive : ""}`}
                style={{
                  padding: isMobile ? 16 : 11,
                  fontSize: isMobile ? 17 : 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <img
                      src={u.profileImage}
                      alt={u.name}
                      onError={(e) => {
                        const fallback = createPlaceholderAvatar(u?.name || "User");
                        if (e.currentTarget.src === fallback) return;
                        e.currentTarget.src = fallback;
                      }}
                      style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: "50%", objectFit: "cover", border: "2px solid #ffffff", boxShadow: "0 4px 10px rgba(15,23,42,0.12)" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        right: -2,
                        bottom: -2,
                        width: 12,
                        height: 12,
                        borderRadius: 12,
                        border: "2px solid #fff",
                        background: isUserOnline(u.userId) ? "#22c55e" : "#cbd5e1",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
                    <span style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {subtitle}
                    </span>
                  </div>
                </div>

                {unread > 0 ? (
                  <div style={{ minWidth: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "#ef4444", color: "#fff", borderRadius: 14, padding: "0 6px", fontSize: 11, fontWeight: 800, boxShadow: "0 4px 10px rgba(239,68,68,0.25)" }}>{unread > 99 ? "99+" : unread}</div>
                ) : (
                  <div style={{ width: 26 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!isMobile && (
        <div style={{ width: 44, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 10 }}>
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            style={{
              width: 40,
              height: 74,
              border: "1px solid #007AFB)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 90%, #e5eaf0 100%)",
              borderRadius: 18,
              padding: 0,
              boxShadow: "0 14px 24px rgba(15, 23, 42, 0.1)",
              cursor: "pointer",
              color: "#007AFB",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
            }}
            title={sidebarOpen ? "Collapse contacts" : "Expand contacts"}
            aria-label="Toggle sidebar"
          >
            <span aria-hidden="true" style={{ width: 4, height: 24, borderRadius: 999, background: "linear-gradient(180deg, #bfdbfe 0%, #60a5fa 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)" }} />
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.08em", transform: sidebarOpen ? "translateX(-1px)" : "translateX(1px)" }}>{sidebarOpen ? "‹" : "›"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
