import React from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaFacebookMessenger } from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";

const BADGE_STYLE = {
  position: "absolute",
  top: "-5px",
  right: "-5px",
  background: "var(--danger)",
  color: "#fff",
  borderRadius: "50%",
  padding: "2px 6px",
  fontSize: "10px",
  fontWeight: "bold",
};

const DROPDOWN_STYLE = {
  position: "absolute",
  top: "40px",
  right: "0",
  width: "360px",
  maxHeight: "420px",
  overflowY: "auto",
  background: "var(--surface-panel)",
  borderRadius: 10,
  boxShadow: "var(--shadow-panel)",
  border: "1px solid var(--border-soft)",
  zIndex: 1000,
  padding: 6,
};

const ROW_STYLE = {
  padding: 10,
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  borderBottom: "1px solid var(--border-soft)",
  transition: "background 120ms ease",
};

const renderAvatar = (imageUrl, name, size = 40, borderRadius = "50%") => (
  <ProfileAvatar
    className="img-circle"
    imageUrl={imageUrl}
    name={name || "Register Office"}
    alt={name || "profile"}
    size={size}
    borderRadius={borderRadius}
  />
);

export default function DashboardTopBar({
  admin,
  totalNotifications,
  showPostDropdown,
  setShowPostDropdown,
  unreadPostList,
  messageCount,
  unreadSenders,
  setUnreadSenders,
  markMessagesAsSeen,
  onOpenPost,
}) {
  const navigate = useNavigate();

  return (
    <nav
      className="top-navbar"
      style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface-overlay)" }}
    >
      <h2 style={{ color: "var(--text-primary)", fontWeight: 800, letterSpacing: "0.2px" }}>
        Gojo Register Portal
      </h2>

      <div className="nav-right">
        {/* Combined bell: posts + message senders */}
        <div
          className="icon-circle"
          style={{ position: "relative", cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            setShowPostDropdown((prev) => !prev);
          }}
        >
          <FaBell />
          {totalNotifications > 0 && <span style={BADGE_STYLE}>{totalNotifications}</span>}
        </div>

        {showPostDropdown && (
          <div
            className="notification-dropdown"
            onClick={(e) => e.stopPropagation()}
            style={DROPDOWN_STYLE}
          >
            {totalNotifications === 0 ? (
              <p style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)" }}>
                No new notifications
              </p>
            ) : (
              <div>
                {unreadPostList.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--border-soft)",
                        color: "var(--text-primary)",
                        fontWeight: 700,
                      }}
                    >
                      Posts
                    </div>
                    {unreadPostList.map((post) => (
                      <div
                        key={post.postId}
                        onClick={() => onOpenPost(post)}
                        style={ROW_STYLE}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-muted)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                      >
                        <div style={{ width: 46, height: 46, flexShrink: 0 }}>
                          {renderAvatar(post.adminProfile, post.adminName, 46)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong>{post.adminName}</strong>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              color: "var(--text-secondary)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {post.message || "New post"}
                          </p>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                          {new Date(post.time || post.createdAt || Date.now()).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {messageCount > 0 && (
                  <div>
                    <div
                      style={{
                        padding: "8px 10px",
                        color: "var(--text-primary)",
                        fontWeight: 700,
                        background: "var(--surface-muted)",
                        border: "1px solid var(--border-soft)",
                        borderRadius: 6,
                        margin: "8px 6px",
                      }}
                    >
                      Messages
                    </div>
                    {Object.entries(unreadSenders || {}).map(([userId, sender]) => (
                      <div
                        key={userId}
                        style={ROW_STYLE}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-muted)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        onClick={async () => {
                          await markMessagesAsSeen(userId);
                          setUnreadSenders((prev) => {
                            const copy = { ...prev };
                            delete copy[userId];
                            return copy;
                          });
                          setShowPostDropdown(false);
                          navigate("/all-chat", {
                            state: {
                              user: {
                                userId,
                                name: sender.name,
                                profileImage: sender.profileImage,
                                type: sender.type,
                              },
                            },
                          });
                        }}
                      >
                        {renderAvatar(sender.profileImage, sender.name, 46, 8)}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong
                            style={{ display: "block", marginBottom: 4, color: "var(--text-primary)" }}
                          >
                            {sender.name}
                          </strong>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              color: "var(--text-secondary)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {sender.count} new message{sender.count > 1 && "s"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messenger */}
        <div
          className="icon-circle"
          style={{ position: "relative", cursor: "pointer" }}
          onClick={() => navigate("/all-chat")}
        >
          <FaFacebookMessenger />
          {messageCount > 0 && <span style={BADGE_STYLE}>{messageCount}</span>}
        </div>

        {/* Profile */}
        <div
          className="profile-img"
          style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}
        >
          {renderAvatar(admin.profileImage, admin.name, 38)}
        </div>
      </div>
    </nav>
  );
}
