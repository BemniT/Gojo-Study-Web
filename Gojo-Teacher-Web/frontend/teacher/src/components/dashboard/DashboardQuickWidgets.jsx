import React from "react";
import ProfileAvatar from "../ProfileAvatar";
import { FaBookOpen } from "react-icons/fa";

function DashboardQuickWidgets({
  compactCards,
  widgetCardStyle,
  softPanelStyle,
  rightRailIconStyle,
  rightRailActionButtonStyle,
  rightRailSecondaryButtonStyle,
  smallStatStyle,
  totalPostsCount,
  totalUnreadMessages,
  totalNotifications,
  recentContacts,
  handleOpenConversation,
  quickLessonFeedback,
  setQuickLessonCheckOpen,
  navigate,
}) {
  return (
    <>
      <div style={widgetCardStyle}>
        <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Quick Statistics</h4>
        <div style={{ display: "flex", gap: compactCards ? 8 : 10, marginTop: compactCards ? 8 : 10, alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={smallStatStyle}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Total Posts</div>
              <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{totalPostsCount}</div>
            </div>
            <div style={smallStatStyle}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Unread</div>
              <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{totalUnreadMessages}</div>
            </div>
            <div style={smallStatStyle}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Notifications</div>
              <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{totalNotifications}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={widgetCardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={rightRailIconStyle}>
            <FaBookOpen style={{ width: 14, height: 14 }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Quick Lesson Check</h4>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3 }}>
              Open this week&apos;s lesson status and submit ready entries from here.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, ...softPanelStyle, padding: "8px 10px", fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Submitted, ready to submit, and missing lesson entries are all shown in one simple view.
        </div>

        {quickLessonFeedback.text ? (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: quickLessonFeedback.type === "error" ? "1px solid rgba(220, 38, 38, 0.18)" : "1px solid rgba(0, 122, 251, 0.16)",
              background: quickLessonFeedback.type === "error" ? "#FFF5F5" : "#F5FAFF",
              color: quickLessonFeedback.type === "error" ? "#B42318" : "var(--text-primary)",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {quickLessonFeedback.text}
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <button type="button" style={rightRailActionButtonStyle} onClick={() => setQuickLessonCheckOpen(true)}>
            Open Quick Check
          </button>
          <button type="button" style={rightRailSecondaryButtonStyle} onClick={() => navigate("/lesson-plan") }>
            Lesson Plan Page
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: compactCards ? 8 : 10 }}>
        <div style={widgetCardStyle}>
          <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Today's Activity</h4>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", ...softPanelStyle, padding: "7px 8px", fontSize: 10 }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>New Posts</span>
              <strong style={{ color: "var(--text-primary)" }}>{totalPostsCount}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", ...softPanelStyle, padding: "7px 8px", fontSize: 10 }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Messages</span>
              <strong style={{ color: "var(--text-primary)" }}>{totalUnreadMessages}</strong>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>Recent Contacts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentContacts.length === 0 ? (
                <div style={{ fontSize: 10, color: "var(--text-muted)", ...softPanelStyle, padding: "7px 8px" }}>
                  No recent chats yet
                </div>
              ) : (
                recentContacts.map((contact) => {
                  return (
                    <button
                      key={contact.userId}
                      type="button"
                      onClick={() => handleOpenConversation(contact.conversation)}
                      style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left", ...softPanelStyle, padding: "5px 6px", cursor: "pointer" }}
                    >
                      <ProfileAvatar
                        src={contact.profileImage || "/default-profile.png"}
                        name={contact.name}
                        alt={contact.name}
                        style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {contact.name}
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {contact.lastMessage || "Open chat"}
                        </div>
                      </div>
                      {contact.unreadCount > 0 ? (
                        <div style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                          {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardQuickWidgets;
