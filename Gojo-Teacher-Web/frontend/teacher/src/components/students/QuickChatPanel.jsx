import React from "react";
import { FaCheck, FaCommentDots, FaFacebookMessenger, FaPaperPlane } from "react-icons/fa";
import styles from "./Students.module.css";

function QuickChatPanel({
  chatOpen,
  selectedStudent,
  selectedStudentDetails,
  quickChatTarget,
  closeQuickChat,
  handleOpenParentChat,
  handleOpenStudentChat,
  handleExpandQuickChat,
  messages,
  messagesEndRef,
  teacherUserId,
  quickChatMessagesRef,
  chatMessagesRef,
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
  return (
    <>
      {!chatOpen && (
        <div
          onClick={handleOpenParentChat}
          title="Chat with student's parent"
          className={`${styles.chatFab} ${styles.parentFab}`}
        >
          <span className={styles.fabIconWrap}>
            <FaFacebookMessenger size={18} />
          </span>
          <div className={styles.fabLabel}>
            <span className={styles.fabLabelText}>Parent Chat</span>
          </div>
          <span className={`${styles.fabBadge} ${styles.parentFabBadge}`}>
            P
          </span>
        </div>
      )}

      {!chatOpen && (
        <div
          onClick={handleOpenStudentChat}
          title="Chat with student"
          className={`${styles.chatFab} ${styles.studentFab}`}
        >
          <span className={styles.fabIconWrap}>
            <FaCommentDots size={18} />
          </span>
          <div className={styles.fabLabel}>
            <span className={styles.fabLabelText}>Student Chat</span>
          </div>
          <span className={`${styles.fabBadge} ${styles.studentFabBadge}`}>
            S
          </span>
        </div>
      )}

      {chatOpen && selectedStudent && (
        <div className={styles.quickChatWindow}>
          <div className={styles.quickChatHeader}>
            <strong>{quickChatTarget?.name || selectedStudent.name}</strong>

            <div className={styles.quickChatHeaderActions}>
              <button
                onClick={handleExpandQuickChat}
                className={`${styles.quickChatIconButton} ${styles.expandButton}`}
              >
                ⤢
              </button>

              <button
                onClick={closeQuickChat}
                className={`${styles.quickChatIconButton} ${styles.closeButton}`}
              >
                ×
              </button>
            </div>
          </div>

          <div
            ref={(node) => {
              if (quickChatMessagesRef) {
                quickChatMessagesRef.current = node;
              }
              if (chatMessagesRef) {
                chatMessagesRef.current = node;
              }
            }}
            className={styles.quickMessages}
          >
            {(quickChatHasOlder || quickChatLoadingOlder) && !quickChatLoading && (
              <div className={styles.loadOlderWrap}>
                <button
                  onClick={loadOlderMessages}
                  disabled={quickChatLoadingOlder}
                  className={`${styles.loadOlderButton} ${quickChatLoadingOlder ? styles.loadOlderButtonDisabled : ""}`}
                >
                  {quickChatLoadingOlder ? "Loading older messages..." : "Load older messages"}
                </button>
              </div>
            )}

            {quickChatLoading ? (
              <p className={styles.chatStatusText}>Loading recent chat...</p>
            ) : messages.length === 0 ? (
              <p className={styles.chatStatusTextMuted}>
                Start chatting with {quickChatTarget?.name || selectedStudent.name}
              </p>
            ) : (
              messages.map((m) => {
                const isTeacher = String(m?.senderId || "") === String(teacherUserId);

                return (
                  <div
                    key={m.messageId || m.id}
                    className={`${styles.messageRow} ${isTeacher ? styles.messageRowSent : styles.messageRowReceived}`}
                  >
                    <div className={`${styles.messageBubble} ${isTeacher ? styles.messageBubbleSent : styles.messageBubbleReceived}`}>
                      {m.text} {m.edited && <small className={styles.editedText}> (edited)</small>}

                      <div className={`${styles.messageMeta} ${isTeacher ? styles.messageMetaSent : styles.messageMetaReceived}`}>
                        <span className={styles.messageDate}>{formatDateLabel(m.timeStamp)}</span>
                        <span>{formatTime(m.timeStamp)}</span>
                        {isTeacher && !m.deleted && (
                          <span className={styles.messageChecks}>
                            <FaCheck size={12} color={isTeacher ? "#fff" : "#888"} className={styles.messageChecksFirst} />
                            {m.seen && <FaCheck size={12} color={isTeacher ? "#f3f7f8" : "#ccc"} className={styles.messageChecksSecond} />}
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

          <div className={styles.quickInputBar}>
            <input
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Type a message..."
              className={styles.quickInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <button
              onClick={() => sendMessage()}
              className={styles.quickSendButton}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default QuickChatPanel;
