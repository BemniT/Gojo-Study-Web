import React from "react";
import { useNavigate } from "react-router-dom";
import ProfileAvatar from "../../ProfileAvatar";

const WIDGET_CARD_STYLE = {
  background: "linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-accent) 100%)",
  borderRadius: 16,
  boxShadow: "var(--shadow-soft)",
  padding: "10px",
  border: "1px solid var(--border-soft)",
};

const SOFT_PANEL_STYLE = {
  background: "var(--surface-muted)",
  border: "1px solid var(--border-soft)",
  borderRadius: 10,
};

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export default function TodaysActivityCard({ posts, messageCount, recentContacts }) {
  const navigate = useNavigate();
  const today = new Date();
  const newPostsToday = posts.filter((p) => isSameDay(p.time, today)).length;

  return (
    <div style={WIDGET_CARD_STYLE}>
      <h4 style={{ fontSize: 12, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
        Today's Activity
      </h4>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...SOFT_PANEL_STYLE, padding: "7px 8px", fontSize: 10 }}>
          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>New Posts</span>
          <strong style={{ color: "var(--text-primary)" }}>{newPostsToday}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...SOFT_PANEL_STYLE, padding: "7px 8px", fontSize: 10 }}>
          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Messages</span>
          <strong style={{ color: "var(--text-primary)" }}>{messageCount}</strong>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
          Recent Contacts
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {recentContacts.length === 0 ? (
            <div style={{ fontSize: 10, color: "var(--text-muted)", ...SOFT_PANEL_STYLE, padding: "7px 8px" }}>
              No recent chats yet
            </div>
          ) : (
            recentContacts.map((contact) => (
              <button
                key={contact.userId}
                type="button"
                onClick={() =>
                  navigate("/all-chat", {
                    state: {
                      user: {
                        userId: contact.userId,
                        name: contact.name,
                        profileImage: contact.profileImage,
                        type: contact.type || "user",
                      },
                    },
                  })
                }
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left", ...SOFT_PANEL_STYLE, padding: "5px 6px", cursor: "pointer" }}
              >
                <ProfileAvatar
                  className="img-circle"
                  imageUrl={contact.profileImage}
                  name={contact.name || "Register Office"}
                  alt={contact.name || "profile"}
                  size={30}
                  borderRadius="50%"
                  style={{
                    border: "2px solid var(--border-strong)",
                    boxShadow: "0 8px 18px rgba(15,23,42,0.14)",
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {contact.name}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {contact.lastMessage || "Open chat"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
