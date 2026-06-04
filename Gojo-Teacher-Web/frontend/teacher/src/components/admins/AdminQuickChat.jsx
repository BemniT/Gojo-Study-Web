import React from "react";
import { FaCheck, FaCommentDots, FaPaperPlane } from "react-icons/fa";
import styles from "./Admins.module.css";

function AdminQuickChat({
  adminChatOpen,
  selectedAdmin,
  quickChatTarget,
  teacherUserId,
  openAdminQuickChat,
  closeAdminQuickChat,
  expandQuickChat,
  quickChatHasOlder,
  quickChatLoadingOlder,
  quickChatLoading,
  loadOlderMessages,
  messages,
  messagesEndRef,
  quickChatMessagesRef,
  formatDateLabel,
  formatTime,
  newMessageText,
  setNewMessageText,
  sendMessage,
}) {
  if (!selectedAdmin) return null;

  return (
    <>
      {!adminChatOpen && (
        <div onClick={openAdminQuickChat} className={styles.chatFab}>
          <span className={styles.fabIconWrap}>
            <FaCommentDots size={18} />
          </span>
          <div className={styles.fabLabel}>
            <span className={styles.fabLabelText}>Management Chat</span>
          </div>
          <span className={styles.fabBadge}>A</span>
        </div>
      )}

      {adminChatOpen && (
        <div className={styles.quickChatWindow}>
          <div className={styles.quickChatHeader}>
            <strong>{quickChatTarget?.name || selectedAdmin.name}</strong>
            <div className={styles.quickChatHeaderActions}>
              <button onClick={expandQuickChat} className={styles.quickChatIconButton}>⤢</button>
              <button onClick={closeAdminQuickChat} className={styles.quickChatIconButton}>×</button>
            </div>
          </div>

          <div ref={quickChatMessagesRef} className={styles.quickMessages}>
            {(quickChatHasOlder || quickChatLoadingOlder) && !quickChatLoading && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <button onClick={loadOlderMessages} disabled={quickChatLoadingOlder} className={styles.loadOlderBtn}>
                  {quickChatLoadingOlder ? "Loading older messages..." : "Load older messages"}
                </button>
              </div>
            )}

            {quickChatLoading ? (
              <p style={{ textAlign: "center", color: "#64748b" }}>Loading recent chat...</p>
            ) : messages.length === 0 ? (
              <p style={{ textAlign: "center", color: "#aaa" }}>
                Start chatting with {quickChatTarget?.name || selectedAdmin.name}
              </p>
            ) : (
              messages.map((message) => {
                const isTeacher = String(message?.senderId || "") === String(teacherUserId);
                return (
                  <div
                    key={message.messageId || message.id}
                    style={{ display: "flex", flexDirection: "column", alignItems: isTeacher ? "flex-end" : "flex-start", marginBottom: 10 }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        background: isTeacher ? "#4facfe" : "#fff",
                        color: isTeacher ? "#fff" : "#000",
                        padding: "10px 14px",
                        borderRadius: 18,
                        borderTopRightRadius: isTeacher ? 0 : 18,
                        borderTopLeftRadius: isTeacher ? 18 : 0,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        wordBreak: "break-word",
                      }}
                    >
                      {message.text} {message.edited && <small style={{ fontSize: 10 }}>(edited)</small>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 6, fontSize: 11, color: isTeacher ? "#fff" : "#888" }}>
                        <span style={{ marginRight: 6, fontSize: 11, opacity: 0.9 }}>{formatDateLabel(message.timeStamp)}</span>
                        <span>{formatTime(message.timeStamp)}</span>
                        {isTeacher && !message.deleted && (
                          <span style={{ display: "flex", gap: 0, alignItems: "center" }}>
                            <FaCheck size={12} color={isTeacher ? "#fff" : "#888"} style={{ opacity: 0.85, marginLeft: 6 }} />
                            {message.seen && (
                              <FaCheck size={12} color={isTeacher ? "#f3f7f8" : "#ccc"} style={{ marginLeft: 2, opacity: 0.95 }} />
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

          <div className={styles.chatInputRow}>
            <input
              value={newMessageText}
              onChange={(event) => setNewMessageText(event.target.value)}
              placeholder="Type a message..."
              className={styles.chatInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
            />
            <button onClick={() => sendMessage()} className={styles.chatSendBtn}>
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminQuickChat;
