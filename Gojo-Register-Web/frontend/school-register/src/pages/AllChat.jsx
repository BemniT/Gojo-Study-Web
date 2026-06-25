import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPaperPlane } from "react-icons/fa";
import "../styles/global.css";
import ProfileAvatar from "../components/ProfileAvatar";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import useAllChatContacts from "../hooks/chat/useAllChatContacts";
import useAllChatThread from "../hooks/chat/useAllChatThread";

const pageShellStyle = {
  display: "flex",
  height: "100vh",
  background: "linear-gradient(180deg, var(--page-bg) 0%, var(--page-bg-secondary) 100%)",
};

const sidebarStyle = {
  width: 300,
  background: "var(--surface-panel)",
  borderRight: "1px solid var(--border-soft)",
  overflowY: "auto",
  padding: 15,
  boxShadow: "var(--shadow-soft)",
};

const searchInputStyle = {
  flex: 1,
  padding: 8,
  borderRadius: 20,
  border: "1px solid var(--input-border)",
  outline: "none",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
};

const tabButtonStyle = (isActive) => ({
  flex: 1,
  padding: 8,
  borderRadius: 20,
  border: "1px solid transparent",
  cursor: "pointer",
  background: isActive ? "var(--accent-strong)" : "var(--surface-muted)",
  color: isActive ? "#fff" : "var(--text-primary)",
  fontWeight: 700,
});

const threadHeaderStyle = {
  padding: 10,
  borderBottom: "1px solid var(--border-soft)",
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--surface-muted)",
  borderRadius: 10,
  marginBottom: 10,
};

const threadBodyStyle = {
  flex: 1,
  overflowY: "auto",
  padding: 15,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  background: "var(--surface-overlay)",
  borderRadius: 10,
  border: "1px solid var(--border-soft)",
};

const composerInputStyle = {
  flex: 1,
  padding: "12px 16px",
  borderRadius: 30,
  border: "1px solid var(--input-border)",
  outline: "none",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
};

const actionButtonStyle = {
  background: "var(--accent-strong)",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(Number(timestamp)).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function AllChat() {
  const location = useLocation();
  const navigate = useNavigate();
  const { finance, schoolCode, DB_ROOT } = useRegistrarSession();
  const financeUserId = finance.userId || "";
  const financeAccountId = finance.financeId || "";
  const DB_PATH = schoolCode ? `Platform1/Schools/${schoolCode}` : "";

  const [searchQuery, setSearchQuery] = useState("");

  const {
    students,
    parents,
    teachers,
    selectedTab,
    setSelectedTab,
    selectedChatUser,
    setSelectedChatUser,
  } = useAllChatContacts({
    DB_ROOT,
    schoolCode,
    financeUserId,
    financeAccountId,
    location,
  });

  const {
    messages,
    messageInput,
    setMessageInput,
    editingMsgId,
    setEditingMsgId,
    activeMessageId,
    setActiveMessageId,
    typing,
    lastSeen,
    chatEndRef,
    sendMessage,
    deleteMessage,
    handleTyping,
    updateUnreadForSelected,
  } = useAllChatThread({
    DB_ROOT,
    DB_PATH,
    financeUserId,
    selectedChatUser,
  });

  const activeList =
    selectedTab === "student" ? students : selectedTab === "parent" ? parents : teachers;

  const filteredList = activeList.filter((u) =>
    String(u.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserList = (users) =>
    users.map((u) => (
      <div
        key={u.userId}
        onClick={async () => {
          setSelectedChatUser(u);
          await updateUnreadForSelected(u.userId);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 10,
          borderRadius: 8,
          background: selectedChatUser?.userId === u.userId ? "var(--accent-soft)" : "var(--surface-panel)",
          border: selectedChatUser?.userId === u.userId ? "1px solid var(--accent-strong)" : "1px solid var(--border-soft)",
          cursor: "pointer",
          marginBottom: 8,
          transition: "0.2s all",
          boxShadow: selectedChatUser?.userId === u.userId ? "var(--shadow-glow)" : "var(--shadow-soft)",
        }}
      >
        {u.unread > 0 && (
          <span
            style={{
              marginRight: 6,
              minWidth: 22,
              height: 22,
              background: "var(--danger)",
              color: "#fff",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {u.unread > 99 ? "99+" : u.unread}
          </span>
        )}
        <ProfileAvatar imageUrl={u.profileImage} name={u.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {u.lastMsgText || "No messages yet"}
          </div>
        </div>
      </div>
    ));

  return (
    <div style={pageShellStyle}>
      <div style={sidebarStyle}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 15 }}>
          <button onClick={() => navigate(-1)} style={{ ...actionButtonStyle, marginRight: 10 }}>
            <FaArrowLeft />
          </button>
          <input
            type="text"
            placeholder="Search student/parent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
          />
        </div>

        <div style={{ display: "flex", marginBottom: 15, gap: 5 }}>
          {["student", "parent", "teacher"].map((tab) => (
            <button key={tab} onClick={() => setSelectedTab(tab)} style={tabButtonStyle(selectedTab === tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {renderUserList(filteredList)}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 15, minWidth: 0 }}>
        {selectedChatUser ? (
          <>
            <div style={threadHeaderStyle}>
              <ProfileAvatar imageUrl={selectedChatUser.profileImage} name={selectedChatUser.name} size={40} />
              <div>
                <strong style={{ color: "var(--text-primary)" }}>{selectedChatUser.name}</strong>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {typing
                    ? "Typing..."
                    : lastSeen
                    ? `Last seen: ${new Date(lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </div>
              </div>
            </div>

            <div style={threadBodyStyle}>
              {messages.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: 20 }}>
                  Start chatting with {selectedChatUser.name}...
                </p>
              ) : (
                messages.map((m) => {
                  const isFinance = m.sender === "registerer";
                  if (m.deleted) return null;

                  return (
                    <div
                      key={m.id}
                      onClick={() => setActiveMessageId(m.id)}
                      style={{ display: "flex", flexDirection: "column", alignItems: isFinance ? "flex-end" : "flex-start", marginBottom: 12 }}
                    >
                      <div
                        style={{
                          background: isFinance ? "var(--accent-strong)" : "var(--surface-panel)",
                          color: isFinance ? "#fff" : "var(--text-primary)",
                          padding: "8px 12px",
                          borderRadius: 16,
                          borderTopRightRadius: isFinance ? 0 : 16,
                          borderTopLeftRadius: isFinance ? 16 : 0,
                          maxWidth: "46%",
                          wordBreak: "break-word",
                          display: "flex",
                          flexDirection: "column",
                          border: isFinance ? "none" : "1px solid var(--border-soft)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
                        }}
                      >
                        <div>{m.text}</div>
                        {m.edited && <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>edited</div>}
                        <div style={{ fontSize: 10, opacity: 0.75, display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
                          <span>{formatTime(m.timeStamp)}</span>
                          {isFinance && <span>{m.seen ? "✔✔" : "✔"}</span>}
                        </div>
                      </div>

                      {activeMessageId === m.id && isFinance && (
                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          <button
                            onClick={() => {
                              setMessageInput(m.text || "");
                              setEditingMsgId(m.id);
                            }}
                            style={{ fontSize: 12, border: "1px solid var(--border-soft)", background: "var(--surface-panel)", color: "var(--text-primary)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}
                          >
                            Edit
                          </button>
                          <button onClick={() => deleteMessage(m.id)} style={{ fontSize: 12, color: "#fff", background: "var(--danger)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
              <input
                value={messageInput}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                style={composerInputStyle}
              />
              <button
                onClick={sendMessage}
                style={{ background: "var(--accent-strong)", border: "none", color: "#fff", borderRadius: "50%", width: 45, height: 45, display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "var(--shadow-glow)" }}
              >
                <FaPaperPlane />
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "50%" }}>
            Select a student or parent to start chatting...
          </p>
        )}
      </div>
    </div>
  );
}

export default AllChat;
