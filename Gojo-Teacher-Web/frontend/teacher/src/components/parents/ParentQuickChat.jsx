import React from "react";
import { FaCheck, FaCommentDots, FaPaperPlane } from "react-icons/fa";
import styles from "./Parents.module.css";

function ParentQuickChat({
  chatOpen,
  selectedParent,
  teacherId,
  onOpen,
  onClose,
  onExpand,
  messages,
  messagesEndRef,
  quickChatMessagesRef,
  quickChatHasOlder,
  quickChatLoadingOlder,
  quickChatLoading,
  loadOlderMessages,
  formatDateLabel,
  formatTime,
  newMessageText,
  setNewMessageText,
  sendMessage,
}) {
  if (!selectedParent) return null;

  return (
    <>
      {!chatOpen && (
        <div onClick={onOpen} className={styles.chatFab}>
          <span className={styles.fabIconWrap}>
            <FaCommentDots size={18} />
          </span>
          <div className={styles.fabLabel}>
            <span className={styles.fabLabelText}>Parent Chat</span>
          </div>
          <span className={styles.fabBadge}>P</span>
        </div>
      )}

      {chatOpen && (
        <div className={styles.quickChatWindow}>
          {/* Header */}
          <div className={styles.quickChatHeader}>
            <strong>{selectedParent.name}</strong>
            <div className={styles.quickChatHeaderActions}>
              <button onClick={onExpand} className={`${styles.quickChatIconButton} ${styles.expandButton}`}>
                ⤢
              </button>
              <button onClick={onClose} className={`${styles.quickChatIconButton} ${styles.closeButton}`}>
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={quickChatMessagesRef} className={styles.quickMessages}>
            {(quickChatHasOlder || quickChatLoadingOlder) && !quickChatLoading && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <button
                  onClick={loadOlderMessages}
                  disabled={quickChatLoadingOlder}
                  className={styles.loadOlderBtn}
                >
                  {quickChatLoadingOlder ? "Loading older messages..." : "Load older messages"}
                </button>
              </div>
            )}

            {quickChatLoading ? (
              <p style={{ textAlign: "center", color: "#64748b" }}>Loading recent chat...</p>
            ) : messages.length === 0 ? (
              <p style={{ textAlign: "center", color: "#aaa" }}>
                Start chatting with {selectedParent.name}
              </p>
            ) : (
              messages.map((m) => {
                const isTeacher = String(m?.senderId || "") === String(teacherId);
                return (
                  <div
                    key={m.messageId || m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isTeacher ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        background: isTeacher ? "#007AFB" : "#ffffff",
                        color: isTeacher ? "#ffffff" : "#0f172a",
                        padding: "10px 14px",
                        borderRadius: 18,
                        borderTopRightRadius: isTeacher ? 0 : 18,
                        borderTopLeftRadius: isTeacher ? 18 : 0,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.text}
                      {m.edited && <small style={{ fontSize: 10 }}> (edited)</small>}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 6,
                          marginTop: 6,
                          fontSize: 11,
                          color: isTeacher ? "#ffffff" : "#888888",
                        }}
                      >
                        <span style={{ marginRight: 6, fontSize: 11, opacity: 0.9 }}>
                          {formatDateLabel(m.timeStamp)}
                        </span>
                        <span>{formatTime(m.timeStamp)}</span>
                        {isTeacher && !m.deleted && (
                          <span style={{ display: "flex", gap: 0, alignItems: "center" }}>
                            <FaCheck size={12} color="#ffffff" style={{ opacity: 0.85, marginLeft: 6 }} />
                            {m.seen && (
                              <FaCheck size={12} color="#f3f7f8" style={{ marginLeft: 2, opacity: 0.95 }} />
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

          {/* Input */}
          <div className={styles.chatInputRow}>
            <input
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Type a message..."
              className={styles.chatInput}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
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

export default ParentQuickChat;
