import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCommentDots, FaCheck, FaPaperPlane } from "react-icons/fa";

const CHAT_FAB_STYLE = {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "56px",
  height: "56px",
  background: "var(--accent-strong)",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  cursor: "pointer",
  zIndex: 1000,
  boxShadow: "var(--shadow-glow)",
  transition: "transform 0.2s ease",
};

const CHAT_WINDOW_STYLE = {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "360px",
  height: "480px",
  background: "var(--surface-panel)",
  borderRadius: "16px",
  boxShadow: "var(--shadow-panel)",
  border: "1px solid var(--border-soft)",
  zIndex: 2000,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const CHAT_INPUT_STYLE = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: "25px",
  border: "1px solid var(--input-border)",
  outline: "none",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
};

const ACTION_CIRCLE_STYLE = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-secondary)",
};

const formatTime = (ts) => {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const formatDateLabel = (ts) => {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  } catch {
    return "";
  }
};

export default function ParentChatPopup({
  open,
  selectedParent,
  setOpen,
  messages,
  adminUserId,
  typingUserId,
  chatMessagesContainerRef,
  messagesEndRef,
  handleChatScroll,
  newMessageText,
  setNewMessageText,
  handleTyping,
  sendMessage,
}) {
  const navigate = useNavigate();
  if (!selectedParent) return null;

  if (!open) {
    return (
      <div onClick={() => setOpen(true)} style={CHAT_FAB_STYLE} title="Open chat">
        <FaCommentDots size={30} />
      </div>
    );
  }

  const expandToFullChat = () => {
    setOpen(false);
    navigate("/all-chat", { state: { user: selectedParent, tab: "parent" } });
  };

  return (
    <div style={CHAT_WINDOW_STYLE}>
      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid var(--border-soft)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "color-mix(in srgb, var(--accent-soft) 78%, var(--surface-panel) 22%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <strong style={{ color: "var(--text-primary)" }}>{selectedParent.name}</strong>
          {typingUserId && String(typingUserId) === String(selectedParent.userId) && (
            <small style={{ color: "var(--accent-strong)", marginTop: 4 }}>Typing…</small>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={expandToFullChat} style={{ ...ACTION_CIRCLE_STYLE, fontSize: 18 }} title="Open full chat">
            ⤢
          </button>
          <button onClick={() => setOpen(false)} style={{ ...ACTION_CIRCLE_STYLE, fontSize: 20 }} title="Close">
            ×
          </button>
        </div>
      </div>

      <div
        ref={chatMessagesContainerRef}
        onScroll={handleChatScroll}
        style={{
          flex: 1,
          padding: "12px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          background: "var(--surface-muted)",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Start chatting with {selectedParent.name}
          </p>
        ) : (
          messages.map((m) => {
            const isAdmin = String(m.senderId) === String(adminUserId);
            return (
              <div
                key={m.messageId || m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isAdmin ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    background: isAdmin ? "var(--accent-strong)" : "var(--surface-panel)",
                    color: isAdmin ? "#fff" : "var(--text-primary)",
                    padding: "10px 14px",
                    borderRadius: 18,
                    borderTopRightRadius: isAdmin ? 0 : 18,
                    borderTopLeftRadius: isAdmin ? 18 : 0,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                    wordBreak: "break-word",
                    cursor: "default",
                    position: "relative",
                    border: isAdmin ? "none" : "1px solid var(--border-soft)",
                  }}
                >
                  {m.text} {m.edited && <small style={{ fontSize: 10 }}> (edited)</small>}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 6,
                      marginTop: 6,
                      fontSize: 11,
                      color: isAdmin ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    <span style={{ marginRight: 6, fontSize: 11, opacity: 0.9 }}>
                      {formatDateLabel(m.timeStamp)}
                    </span>
                    <span>{formatTime(m.timeStamp)}</span>
                    {isAdmin && !m.deleted && (
                      <span style={{ display: "flex", gap: 0, alignItems: "center" }}>
                        <FaCheck
                          size={10}
                          color={isAdmin ? "#fff" : "var(--text-muted)"}
                          style={{ opacity: 0.9, marginLeft: 2 }}
                        />
                        {m.seen && (
                          <FaCheck
                            size={10}
                            color={
                              isAdmin
                                ? "color-mix(in srgb, white 90%, var(--accent-soft) 10%)"
                                : "var(--border-strong)"
                            }
                            style={{ marginLeft: -6, opacity: 0.95 }}
                          />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          padding: "10px",
          borderTop: "1px solid var(--border-soft)",
          display: "flex",
          gap: "8px",
          background: "var(--surface-panel)",
        }}
      >
        <input
          value={newMessageText}
          onChange={(e) => {
            setNewMessageText(e.target.value);
            handleTyping(e.target.value);
          }}
          placeholder="Type a message..."
          style={CHAT_INPUT_STYLE}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage(newMessageText);
          }}
        />
        <button
          onClick={() => sendMessage(newMessageText)}
          style={{
            width: 45,
            height: 45,
            borderRadius: "50%",
            background: "var(--accent-strong)",
            border: "none",
            color: "#fff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
          title="Send"
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}
