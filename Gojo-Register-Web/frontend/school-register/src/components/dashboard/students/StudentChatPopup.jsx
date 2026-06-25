import React from "react";
import { FaCheck, FaPaperPlane } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

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

export default function StudentChatPopup({
  open,
  selectedStudent,
  onClose,
  popupMessages,
  adminUserId,
  messagesEndRef,
  newMessageText,
  setNewMessageText,
  sendMessage,
}) {
  const navigate = useNavigate();

  if (!open || !selectedStudent) return null;

  const expandToFullChat = () => {
    onClose();
    navigate("/all-chat", {
      state: {
        user: {
          userId: selectedStudent.userId,
          name: selectedStudent.name,
          profileImage: selectedStudent.profileImage,
          type: "student",
        },
      },
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "360px",
        height: "480px",
        background: "var(--surface-panel)",
        borderRadius: "16px",
        boxShadow: "var(--shadow-panel)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "14px",
          borderBottom: "1px solid var(--border-soft)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--surface-muted)",
        }}
      >
        <strong>{selectedStudent.name}</strong>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={expandToFullChat}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
            title="Open full chat"
          >
            ⤢
          </button>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
            title="Close chat"
          >
            ×
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div
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
        {popupMessages.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Start chatting with {selectedStudent.name}
          </p>
        ) : (
          popupMessages.map((m) => {
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
                    background: isAdmin ? "var(--accent)" : "var(--surface-panel)",
                    color: isAdmin ? "#fff" : "var(--text-primary)",
                    padding: "10px 14px",
                    borderRadius: 18,
                    borderTopRightRadius: isAdmin ? 0 : 18,
                    borderTopLeftRadius: isAdmin ? 18 : 0,
                    boxShadow: "var(--shadow-soft)",
                    wordBreak: "break-word",
                    cursor: "default",
                    position: "relative",
                  }}
                >
                  {m.text}{" "}
                  {m.edited && <small style={{ fontSize: 10 }}> (edited)</small>}
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
                            color={isAdmin ? "#f8fafc" : "var(--text-muted)"}
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

      {/* INPUT */}
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
          onChange={(e) => setNewMessageText(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "25px",
            border: "1px solid var(--input-border)",
            outline: "none",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button
          onClick={() => sendMessage()}
          style={{
            width: 45,
            height: 45,
            borderRadius: "50%",
            background: "var(--accent)",
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
