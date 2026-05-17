import React from "react";
import { FaCheck } from "react-icons/fa";

export default function MessageThread(props) {
  const {
    isMobile,
    selectedChatUser,
    messages,
    chatLoading,
    chatHasOlder,
    chatLoadingOlder,
    loadOlderMessages,
    displayItems,
    editingMessages,
    beginTextLongPress,
    cancelImageLongPress,
    handleTextBubbleClick,
    isUserOnline,
    getLastSeenText,
    tabTitle,
    formatTime,
    setPreviewImageUrl,
    chatEndRef,
    chatMessagesRef,
    beginImageLongPress,
    setTextMenu,
    setImageMenu,
  } = props;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          borderBottom: "1px solid #eef2f7",
          boxShadow: "none",
          background: "#ffffff",
          borderRadius: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {isMobile && (
            <button onClick={() => {} } style={{ border: "none", background: "none", padding: 4, cursor: "pointer", color: "#1d4ed8" }} aria-label="Back to user list">
              <span style={{ fontSize: 20 }}>‹</span>
            </button>
          )}

          <img src={selectedChatUser.profileImage} alt={selectedChatUser.name} style={{ width: isMobile ? 42 : 50, height: isMobile ? 42 : 50, borderRadius: "50%", objectFit: "cover", border: "2px solid #ffffff", boxShadow: "0 6px 12px rgba(15,23,42,0.12)" }} />

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedChatUser.name}</span>
            <span style={{ fontSize: 12, color: isUserOnline(selectedChatUser.userId) ? "#16A34A" : "#64748b" }}>
              {isUserOnline(selectedChatUser.userId) ? "Online" : getLastSeenText(selectedChatUser.userId) || tabTitle}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#007AFB", background: "#FFFFFF", border: "1px solid #007AFB", padding: "5px 10px", borderRadius: 999 }}>{tabTitle}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "5px 10px", borderRadius: 999 }}>{messages.length} messages</span>
        </div>
      </div>

      <div ref={chatMessagesRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0" }}>
        {chatLoading && !messages.length ? (
          <div style={{ alignSelf: "center", marginBottom: 12, fontSize: 12, color: "#64748b" }}>Loading messages...</div>
        ) : null}

        {chatHasOlder || chatLoadingOlder ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <button onClick={loadOlderMessages} disabled={chatLoadingOlder} style={{ borderRadius: 999, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: chatLoadingOlder ? "not-allowed" : "pointer", opacity: chatLoadingOlder ? 0.7 : 1 }}>{chatLoadingOlder ? "Loading older messages..." : "Load older messages"}</button>
          </div>
        ) : null}

        {displayItems.map((item, index) => {
          if (item.type === "date") {
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 12px" }}>
                <div style={{ flex: 1, height: 1, background: "#dbe7ff" }} />
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{item.label}</span>
                <div style={{ flex: 1, height: 1, background: "#dbe7ff" }} />
              </div>
            );
          }

          const m = item;
          const isTeacher = m.isTeacher;
          const isEditing = !!editingMessages[m.id];
          const isImageMessage = String(m?.type || "").toLowerCase() === "image" && !!m?.imageUrl;
          const isDeletedMessage = !!m?.deleted;
          const prev = index > 0 ? displayItems[index - 1] : null;
          const prevSameSender = prev && prev.type === "message" && prev.senderId === m.senderId;

          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isTeacher ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <div
                onClick={() => handleTextBubbleClick(m.id)}
                onMouseDown={isTeacher && !m.deleted && !isImageMessage ? () => beginTextLongPress(m) : undefined}
                onMouseUp={isTeacher && !m.deleted && !isImageMessage ? cancelImageLongPress : undefined}
                onMouseLeave={isTeacher && !m.deleted && !isImageMessage ? cancelImageLongPress : undefined}
                onTouchStart={isTeacher && !m.deleted && !isImageMessage ? () => beginTextLongPress(m) : undefined}
                onTouchEnd={isTeacher && !m.deleted && !isImageMessage ? cancelImageLongPress : undefined}
                onTouchCancel={isTeacher && !m.deleted && !isImageMessage ? cancelImageLongPress : undefined}
                onContextMenu={isTeacher && !m.deleted && !isImageMessage ? (event) => { event.preventDefault(); setTextMenu({ open: true, message: m }); } : undefined}
                style={{ maxWidth: isMobile ? "88%" : "76%", background: isTeacher ? "#007AFB" : "#f6f7fb", color: isTeacher ? "#fff" : "#111827", padding: isImageMessage ? 6 : "9px 13px", borderRadius: 14, borderTopRightRadius: isTeacher ? 6 : 14, borderTopLeftRadius: isTeacher ? 14 : 6, boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)", border: isTeacher ? "none" : "1px solid #e5e7eb", wordBreak: "break-word", cursor: "pointer", position: "relative", overflow: "visible", marginRight: isTeacher ? -12 : 0 }}
              >
                {!isTeacher && !prevSameSender ? (
                  <div style={{ position: "absolute", left: -6, bottom: -2, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "8px solid #f6f7fb", transform: "rotate(180deg)" }} />
                ) : null}

                {isTeacher && !prevSameSender ? (
                  <div style={{ position: "absolute", right: -20, bottom: -2, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "8px solid #007AFB" }} />
                ) : null}

                {isDeletedMessage ? (
                  <>
                    <span style={{ fontStyle: "italic", color: isTeacher ? "rgba(255,255,255,0.92)" : "#64748b" }}>This message is deleted</span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 6, fontSize: 10, color: isTeacher ? "rgba(255,255,255,0.85)" : "#64748b" }}>
                      <span>{formatTime(m.timeStamp)}</span>
                      {isTeacher ? (
                        <span style={{ display: "flex", gap: 0 }}>
                          <FaCheck size={10} color="#fff" style={{ opacity: 0.82 }} />
                          {m.seen ? <FaCheck size={10} color="#ffffff" style={{ marginLeft: 2, opacity: 0.98 }} /> : null}
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : isImageMessage ? (
                  <div style={{ width: isMobile ? 214 : 240, position: "relative" }} onClick={(event) => { event.stopPropagation(); setPreviewImageUrl(m.imageUrl); }} onMouseDown={() => beginImageLongPress(m)} onTouchStart={() => beginImageLongPress(m)} onContextMenu={(event) => { event.preventDefault(); setImageMenu({ open: true, message: m }); }}>
                    <img src={m.imageUrl} alt={m.text || "image"} style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 6, fontSize: 10, color: isTeacher ? "rgba(255,255,255,0.85)" : "#64748b" }}>
                      <span>{formatTime(m.timeStamp)}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 6, fontSize: 10, color: isTeacher ? "rgba(255,255,255,0.85)" : "#64748b" }}>
                      <span>{formatTime(m.timeStamp)}</span>
                      {isTeacher ? (
                        <span style={{ display: "flex", gap: 0 }}>
                          <FaCheck size={10} color="#fff" style={{ opacity: 0.82 }} />
                          {m.seen ? <FaCheck size={10} color="#ffffff" style={{ marginLeft: 2, opacity: 0.98 }} /> : null}
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              {isEditing ? null : null}
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
    </>
  );
}
