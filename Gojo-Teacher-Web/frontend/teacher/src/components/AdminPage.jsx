import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers } from "react-icons/fa";
import Sidebar from "./Sidebar";
import AdminList from "./admins/AdminList";
import AdminDetailPanel from "./admins/AdminDetailPanel";
import AdminQuickChat from "./admins/AdminQuickChat";
import { useAdmins } from "../hooks/useAdmins";
import { useQuickChat } from "../hooks/useQuickChat";
import { formatDateLabel, formatTime, getChatIdForTab } from "../utils/chatHelpers";
import "../styles/global.css";
import styles from "./admins/Admins.module.css";

function AdminPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth > 600 : true
  );
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== "undefined" ? window.innerWidth < window.innerHeight : false
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminChatOpen, setAdminChatOpen] = useState(false);

  const {
    teacher,
    teacherUserId,
    resolvedSchoolCode,
    rtdbBase,
    filteredAdmins,
    loading,
    error,
  } = useAdmins({ searchTerm });

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
    teacherUserId,
    resolvedSchoolCode,
    rtdbBase,
    chatTab: "admin",
  });

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 600);
      setIsPortrait(window.innerWidth < window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!adminChatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, adminChatOpen]);

  useEffect(() => {
    if (!selectedAdmin) {
      setAdminChatOpen(false);
      setQuickChatTarget(null);
    }
  }, [selectedAdmin, setQuickChatTarget]);

  useEffect(() => {
    if (selectedAdmin) document.body.classList.add("sidebar-open");
    else document.body.classList.remove("sidebar-open");

    return () => document.body.classList.remove("sidebar-open");
  }, [selectedAdmin]);

  const handleLogout = async () => {
    await (window.__gojoTeacherLogout?.() ?? Promise.resolve());
    navigate("/login", { replace: true });
  };

  const openAdminQuickChat = () => {
    if (!selectedAdmin?.userId) return;
    setQuickChatTarget({
      ...selectedAdmin,
      userId: String(selectedAdmin.userId || "").trim(),
      type: "admin",
    });
    setAdminChatOpen(true);
  };

  const closeAdminQuickChat = () => {
    setAdminChatOpen(false);
    setNewMessageText("");
  };

  const expandQuickChat = () => {
    if (!selectedAdmin?.userId) return;

    closeAdminQuickChat();
    const chatId = getChatIdForTab("admin", teacherUserId, selectedAdmin.userId);
    navigate("/all-chat", {
      state: {
        user: quickChatTarget || selectedAdmin,
        contact: quickChatTarget || selectedAdmin,
        chatId,
        tab: "admin",
      },
    });
  };

  const listShellWidth = isPortrait ? "92%" : "560px";

  return (
    <div className={styles.pageRoot}>
      <div className={`${styles.dashboardShell} google-dashboard`}>
        <Sidebar
          active="admins"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          teacher={teacher}
          handleLogout={handleLogout}
        />

        <div className={`${styles.sidebarSpacer} teacher-sidebar-spacer`} />

        <div className={styles.mainContent}>
          <div
            className={`${styles.adminListPanel} admin-list-card-responsive`}
            style={{ width: listShellWidth, marginRight: isPortrait ? 0 : "24px" }}
          >
            <div className={`${styles.sectionHeader} section-header-card`}>
              <h2 className={`${styles.sectionTitle} section-header-card__title`}>Management</h2>
              <div className="section-header-card__meta">
                <span>Total: {filteredAdmins.length}</span>
                <span className="section-header-card__chip">Teacher View</span>
              </div>
            </div>

            <AdminList
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              loading={loading}
              error={error}
              filteredAdmins={filteredAdmins}
              selectedAdmin={selectedAdmin}
              onSelect={setSelectedAdmin}
            />
          </div>

          {selectedAdmin ? (
            <>
              <AdminDetailPanel
                selectedAdmin={selectedAdmin}
                isPortrait={isPortrait}
                onClose={() => setSelectedAdmin(null)}
              />

              <AdminQuickChat
                adminChatOpen={adminChatOpen}
                selectedAdmin={selectedAdmin}
                quickChatTarget={quickChatTarget}
                teacherUserId={teacherUserId}
                openAdminQuickChat={openAdminQuickChat}
                closeAdminQuickChat={closeAdminQuickChat}
                expandQuickChat={expandQuickChat}
                quickChatHasOlder={quickChatHasOlder}
                quickChatLoadingOlder={quickChatLoadingOlder}
                quickChatLoading={quickChatLoading}
                loadOlderMessages={loadOlderMessages}
                messages={messages}
                messagesEndRef={messagesEndRef}
                quickChatMessagesRef={quickChatMessagesRef}
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
                <h3 className={styles.noSelectionTitle}>Management Details</h3>
                <p className={styles.noSelectionText}>
                  Select a management member to view details and chat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
