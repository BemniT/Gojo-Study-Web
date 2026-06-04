import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers } from "react-icons/fa";
import Sidebar from "./Sidebar";
import { useParents } from "../hooks/useParents";
import { useQuickChat } from "../hooks/useQuickChat";
import { formatTime, formatDateLabel } from "../utils/chatHelpers";
import { getChatId } from "../utils/studentHelpers";
import "../styles/global.css";
import styles from "./parents/Parents.module.css";
import ParentList from "./parents/ParentList";
import ParentDetailPanel from "./parents/ParentDetailPanel";
import ParentQuickChat from "./parents/ParentQuickChat";

function TeacherParent() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // ── Responsive layout ──────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth > 600 : true
  );
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== "undefined" ? window.innerWidth < window.innerHeight : false
  );

  useEffect(() => {
    const handle = () => {
      setSidebarOpen(window.innerWidth > 600);
      setIsPortrait(window.innerWidth < window.innerHeight);
    };
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handle);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
    };
  }, []);

  // ── Selection / chat state ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParent, setSelectedParent] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  // ── Data hook ──────────────────────────────────────────────────────────────
  const {
    teacher,
    teacherId,
    RTDB_BASE,
    resolvedSchoolCode,
    paginatedParents,
    filteredParents,
    isLoadingParents,
    isErrorParents,
    parentsQueryError,
    goNext,
    hasMore,
    isLoadingNext,
  } = useParents({ searchTerm });

  // ── Quick-chat hook ────────────────────────────────────────────────────────
  const {
    quickChatTarget,
    setQuickChatTarget,
    messages,
    newMessageText,
    setNewMessageText,
    quickChatLoading,
    quickChatLoadingOlder,
    quickChatHasOlder,
    sendMessage,
    loadOlderMessages,
    quickChatMessagesRef,
  } = useQuickChat({
    teacherUserId: teacherId,
    resolvedSchoolCode,
    rtdbBase: RTDB_BASE,
  });

  // ── Scroll to bottom when new messages arrive ──────────────────────────────
  useEffect(() => {
    if (!chatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatOpen]);

  // ── Close chat when parent is deselected ──────────────────────────────────
  useEffect(() => {
    if (!selectedParent) {
      setChatOpen(false);
      setQuickChatTarget(null);
    }
  }, [selectedParent, setQuickChatTarget]);

  // ── Prevent background scroll on mobile when panel is open ────────────────
  useEffect(() => {
    if (selectedParent) document.body.classList.add("sidebar-open");
    else document.body.classList.remove("sidebar-open");
    return () => document.body.classList.remove("sidebar-open");
  }, [selectedParent]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await (window.__gojoTeacherLogout?.() ?? Promise.resolve());
    navigate("/login", { replace: true });
  };

  const handleSelectParent = (parent) => {
    setSelectedParent(parent);
    setChatOpen(false);
    setQuickChatTarget(null);
  };

  const handleOpenChat = () => {
    if (!selectedParent) return;
    setQuickChatTarget({ userId: selectedParent.userId, name: selectedParent.name, type: "parent" });
    setChatOpen(true);
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setNewMessageText("");
  };

  const handleExpandChat = () => {
    handleCloseChat();
    const chatId = getChatId(teacherId, selectedParent.userId);
    navigate("/all-chat", {
      state: { user: selectedParent, contact: selectedParent, chatId, tab: "parent" },
    });
  };

  const parentListError = isErrorParents
    ? parentsQueryError?.message || "Failed to load parents"
    : "";
  const listShellWidth = isPortrait ? "92%" : "560px";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.pageRoot}>
      <div className={`${styles.dashboardShell} google-dashboard`}>
        <Sidebar
          active="parents"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          teacher={teacher}
          handleLogout={handleLogout}
        />

        <div className={`${styles.sidebarSpacer} teacher-sidebar-spacer`} />

        {/* MAIN CONTENT */}
        <div className={styles.mainContent}>
          <div
            className={`${styles.parentListPanel} parent-list-card-responsive`}
            style={{ width: listShellWidth, marginRight: isPortrait ? 0 : "24px" }}
          >
            <div className={`${styles.sectionHeader} section-header-card`}>
              <h2 className={`${styles.sectionTitle} section-header-card__title`}>Parents</h2>
              <div className="section-header-card__meta">
                <span>Total: {filteredParents.length}</span>
                <span className="section-header-card__chip">Teacher View</span>
              </div>
            </div>

            <ParentList
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isLoadingParents={isLoadingParents}
              parentListError={parentListError}
              filteredParents={filteredParents}
              paginatedParents={paginatedParents}
              isLoadingNext={isLoadingNext}
              goNext={goNext}
              hasMore={hasMore}
              selectedParent={selectedParent}
              onSelectParent={handleSelectParent}
            />
          </div>

          {/* RIGHT PANEL */}
          {selectedParent ? (
            <>
              <ParentDetailPanel
                selectedParent={selectedParent}
                isPortrait={isPortrait}
                onClose={() => setSelectedParent(null)}
              />
              <ParentQuickChat
                chatOpen={chatOpen}
                selectedParent={selectedParent}
                teacherId={teacherId}
                onOpen={handleOpenChat}
                onClose={handleCloseChat}
                onExpand={handleExpandChat}
                messages={messages}
                messagesEndRef={messagesEndRef}
                quickChatMessagesRef={quickChatMessagesRef}
                quickChatHasOlder={quickChatHasOlder}
                quickChatLoadingOlder={quickChatLoadingOlder}
                quickChatLoading={quickChatLoading}
                loadOlderMessages={loadOlderMessages}
                formatDateLabel={formatDateLabel}
                formatTime={formatTime}
                newMessageText={newMessageText}
                setNewMessageText={setNewMessageText}
                sendMessage={sendMessage}
              />
            </>
          ) : (
            <div
              className={styles.noSelectionPanel}
              style={{
                width: isPortrait ? "100%" : "380px",
                height: isPortrait ? "100vh" : "calc(100vh - 55px)",
                position: "fixed",
                right: 0,
                top: isPortrait ? 0 : "55px",
                borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
              }}
            >
              <div className={styles.noSelectionCard}>
                <div className={styles.noSelectionIcon}>
                  <FaUsers />
                </div>
                <h3 className={styles.noSelectionTitle}>Parent Details</h3>
                <p className={styles.noSelectionText}>
                  Select a parent from the list to view details, children, status, and chat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherParent;
