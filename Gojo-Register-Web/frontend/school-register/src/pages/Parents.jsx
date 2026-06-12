import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaFileAlt,
  FaChalkboardTeacher,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaFacebookMessenger,
  FaSearch,
  FaCalendarAlt,
  FaCommentDots,
  FaPaperPlane,
  FaCheck,
  FaChartLine,
  FaChevronDown,
} from "react-icons/fa";
import axios from "axios";
import { BACKEND_BASE } from "../config.js";
import { buildSchoolRtdbBase } from "../api/rtdbScope";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import useParentChat from "../hooks/chat/useParentChat";
import useParentDetail from "../hooks/parents/useParentDetail";
import useParentsList from "../hooks/parents/useParentsList";
import useTopbarNotifications from "../hooks/useTopbarNotifications";
import RegisterSidebar from "../components/RegisterSidebar";
import DashboardTopBar from "../components/dashboard/layout/DashboardTopBar";
import ParentChatPopup from "../components/dashboard/parents/ParentChatPopup";
import ParentDetailDrawer from "../components/dashboard/parents/ParentDetailDrawer";
import ParentListPanel from "../components/dashboard/parents/ParentListPanel";
import ProfileAvatar from "../components/ProfileAvatar";
import { persistResolvedSchoolSession, resolveSchoolScope } from "../utils/schoolScope";

function Parent() {
  const API_BASE = `${BACKEND_BASE}/api`;
  const [searchTerm, setSearchTerm] = useState("");
  const [parentTab, setParentTab] = useState("Details");
  const [parentChatOpen, setParentChatOpen] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState({});
  const [showPostDropdown, setShowPostDropdown] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(window.innerWidth > 900);
  const [parentFullscreenOpen, setParentFullscreenOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // ---------------- SESSION (registrar/finance + admin alias) ----------------
  const { finance, admin: adminBase, schoolCode, DB_ROOT } = useRegistrarSession();
  const admin = { ...adminBase, username: finance.username || "" };

  // School scope is resolved asynchronously and can override the hook's
  // initial DB_ROOT if the school record points to a different shard.
  const initialDbUrl = DB_ROOT || buildSchoolRtdbBase(schoolCode);
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState(schoolCode);
  const [resolvedDbUrl, setResolvedDbUrl] = useState(initialDbUrl);
  const DB = String(resolvedDbUrl || initialDbUrl || "").trim();
  const DB_PATH = resolvedSchoolCode ? `Platform1/Schools/${resolvedSchoolCode}` : "";

  const selectedParentId = selectedParent?.userId || null;
  const {
    unreadSenders,
    setUnreadSenders,
    unreadPosts: postNotifications,
    setUnreadPosts: setPostNotifications,
    messageCount,
    totalNotifications,
    markMessagesAsSeen,
    markPostAsSeen,
  } = useTopbarNotifications({
    dbRoot: DB,
    currentUserId: admin.userId,
  });

  // ---------------- PARENT CHAT (popup state, RT listeners, send + typing) ----------------
  const {
    messages,
    newMessageText,
    setNewMessageText,
    typingUserId,
    chatId,
    messagesEndRef,
    chatMessagesContainerRef,
    handleChatScroll,
    handleTyping,
    sendMessage,
  } = useParentChat({
    DB,
    DB_PATH,
    adminUserId: admin.userId,
    selectedParent,
    parentChatOpen,
  });

  // ---------------- SELECTED PARENT DETAIL (parentInfo + children) ----------------
  const { parentInfo, children } = useParentDetail({
    DB,
    selectedParent,
    setSelectedParent,
  });

  // ---------------- PARENTS LIST + search filter ----------------
  const { parents, loadingParents, filteredParents } = useParentsList({
    DB,
    searchTerm,
  });

  useEffect(() => {
    const resolveScope = async () => {
      if (!schoolCode) return;

      try {
        const resolvedScope = await resolveSchoolScope(schoolCode);
        const nextResolvedSchoolCode = String(resolvedScope?.schoolCode || schoolCode || "").trim();
        const nextResolvedDbUrl = String(resolvedScope?.dbUrl || initialDbUrl || "").trim();
        const resolvedSchoolInfo = resolvedScope?.schoolInfo || {};

        setResolvedSchoolCode(nextResolvedSchoolCode);
        setResolvedDbUrl(nextResolvedDbUrl);

        if (nextResolvedSchoolCode && nextResolvedSchoolCode !== schoolCode) {
          persistResolvedSchoolSession(nextResolvedSchoolCode, String(resolvedSchoolInfo?.shortName || "").trim());
        }
      } catch (error) {
        console.error("Failed to resolve parents page school scope:", error);
        setResolvedSchoolCode(String(schoolCode || "").trim());
        setResolvedDbUrl(initialDbUrl);
      }
    };

    resolveScope();
  }, [schoolCode, initialDbUrl]);


  const [windowW, setWindowW] = useState(window.innerWidth);


  const isNarrow = windowW < 900;

  // Portrait detection helper used in sidebar layout
  const isPortrait = windowW <= 600;
  const contentLeft = isNarrow ? 0 : 90;




  // Window resize handling for responsiveness
  useEffect(() => {
    const onResize = () => setWindowW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keep sidebarVisible default based on screen size
  useEffect(() => {
    setSidebarVisible(windowW > 900);
  }, [windowW]);

  useEffect(() => {
    if (!selectedParent) {
      setParentFullscreenOpen(false);
    }
  }, [selectedParent]);


  // Mark post notification & navigate
  const handleNotificationClick = async (notification) => {
    try {
      await axios.post(`${API_BASE}/mark_post_notification_read`, {
        notificationId: notification.notificationId,
      });
    } catch (err) {
      console.warn("Failed to mark notification on backend:", err);
    }
    try {
      await markPostAsSeen(notification.postId);
    } catch (err) {
      console.warn("Failed to mark notification in RTDB:", err);
    }
    setPostNotifications((prev) =>
      prev.filter((n) => n.notificationId !== notification.notificationId)
    );
    setShowPostDropdown(false);
    navigate("/dashboard", { state: { postId: notification.postId } });
  };

  useEffect(() => {
    if (location.state?.postId) setPostNotifications([]);
  }, [location.state]);


  // allow rendering even if no admin/userId is present; effects will no-op when adminId is falsy


  // MAIN CONTENT (Teachers-like layout)
  const mainContentStyle = {
    padding: "10px 20px 52px",
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
    height: "100%",
    overflowY: "auto",
    overflowX: "hidden",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  };

  const pageBackground = "linear-gradient(180deg, var(--page-bg) 0%, var(--page-bg-secondary) 100%)";


  const elevatedPanelStyle = {
    background: "var(--surface-panel)",
    border: "1px solid var(--border-soft)",
    boxShadow: "var(--shadow-soft)",
  };

  const heroStyle = {
    position: "relative",
    overflow: "hidden",
  };

  const searchShellStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "12px",
    padding: "10px 12px",
    background: "var(--surface-panel)",
    border: "1px solid var(--border-soft)",
    boxShadow: "var(--shadow-soft)",
  };

  const sidebarShellStyle = {
    background: "var(--surface-overlay)",
    boxShadow: "var(--shadow-panel)",
    borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
  };





  const listShellWidth = isPortrait ? "100%" : "min(100%, 640px)";
  const rightSidebarOffset = isPortrait ? 0 : 408;
  const detailDrawerTop = isPortrait ? 0 : "calc(var(--topbar-height) + 18px)";
  const detailDrawerHeight = isPortrait ? "100vh" : "calc(100vh - var(--topbar-height) - 36px)";
  const detailDrawerRight = isPortrait ? 0 : 14;


  const renderEmptyParentPanel = () => (
    <div
      style={{
        width: isPortrait ? "100%" : "380px",
        height: detailDrawerHeight,
        position: "fixed",
        right: detailDrawerRight,
        top: detailDrawerTop,
        background: "var(--surface-muted)",
        backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        boxShadow: "var(--shadow-panel)",
        borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
        borderRadius: isPortrait ? 0 : 18,
        transition: "all 0.35s ease",
        fontSize: 10,
        padding: "14px",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 12,
          border: "1px solid var(--border-soft)",
          background: "var(--surface-panel)",
          boxShadow: "var(--shadow-soft)",
          padding: "18px 14px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            margin: "0 auto 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent-soft)",
            color: "var(--accent-strong)",
            fontSize: 24,
          }}
        >
          <FaHome />
        </div>
        <h3 style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 800 }}>
          Parent Details
        </h3>
        <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5 }}>
          Select a parent from the list to view profile details, linked children, status, and message options.
        </p>
      </div>
    </div>
  );


  return (
    <div
      className="dashboard-page"
      style={{
        background: "#ffffff",
        minHeight: "100vh",
        height: "100vh",
        overflow: "hidden",
        color: "var(--text-primary)",
        "--surface-panel": "#ffffff",
        "--surface-accent": "#eff6ff",
        "--surface-muted": "#f8fbff",
        "--surface-strong": "#e2e8f0",
        "--surface-overlay": "rgba(255,255,255,0.92)",
        "--page-bg": "#ffffff",
        "--page-bg-secondary": "#f8fbff",
        "--border-soft": "#e2e8f0",
        "--border-strong": "#cbd5e1",
        "--text-primary": "#0f172a",
        "--text-secondary": "#334155",
        "--text-muted": "#64748b",
        "--accent": "#3b82f6",
        "--accent-soft": "#dbeafe",
        "--accent-strong": "#007AFB",
        "--shadow-soft": "0 10px 22px rgba(15, 23, 42, 0.07)",
        "--shadow-panel": "0 16px 34px rgba(15, 23, 42, 0.12)",
        "--shadow-glow": "0 0 0 2px rgba(37, 99, 235, 0.18)",
        "--success": "#16a34a",
        "--success-soft": "#dcfce7",
        "--warning": "#d97706",
        "--warning-soft": "#fef3c7",
        "--danger": "#dc2626",
        "--danger-soft": "#fee2e2",
        "--input-border": "#dbeafe",
        "--input-bg": "#ffffff",
      }}
    >
      <DashboardTopBar
        admin={admin}
        totalNotifications={totalNotifications}
        showPostDropdown={showPostDropdown}
        setShowPostDropdown={setShowPostDropdown}
        unreadPostList={postNotifications}
        messageCount={messageCount}
        unreadSenders={unreadSenders}
        setUnreadSenders={setUnreadSenders}
        markMessagesAsSeen={markMessagesAsSeen}
        onOpenPost={handleNotificationClick}
      />

      <div className="google-dashboard" style={{ display: "flex", gap: 14, padding: "12px", height: "calc(100vh - 73px)", overflow: "hidden", background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)" }}>
        <RegisterSidebar user={admin} sticky fullHeight />

        {/* MAIN CONTENT */}
        <main className={`main-content ${selectedParent && sidebarVisible && !parentFullscreenOpen ? "sidebar-open" : ""}`} style={mainContentStyle}>
          <div
            style={{
              width: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              paddingRight: rightSidebarOffset,
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
          <ParentListPanel
            filteredParents={filteredParents}
            loadingParents={loadingParents}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedParentId={selectedParent?.userId}
            onSelectParent={(parentRecord) => {
              setSelectedParent(parentRecord);
              setSidebarVisible(true);
            }}
            listShellWidth={listShellWidth}
            isPortrait={isPortrait}
          />
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        {!parentFullscreenOpen && selectedParent && (
          <ParentDetailDrawer
            isFullscreen={false}
            selectedParent={selectedParent}
            parentInfo={parentInfo}
            childList={children}
            parentTab={parentTab}
            setParentTab={setParentTab}
            setParentFullscreenOpen={setParentFullscreenOpen}
            setSelectedParent={setSelectedParent}
            setParentChatOpen={setParentChatOpen}
            setSidebarVisible={setSidebarVisible}
            isPortrait={isPortrait}
            detailDrawerRight={detailDrawerRight}
            detailDrawerTop={detailDrawerTop}
            detailDrawerHeight={detailDrawerHeight}
            parentChatOpen={parentChatOpen}
            adminUserId={admin.userId}
            messages={messages}
            newMessageText={newMessageText}
            setNewMessageText={setNewMessageText}
            typingUserId={typingUserId}
            chatMessagesContainerRef={chatMessagesContainerRef}
            messagesEndRef={messagesEndRef}
            handleChatScroll={handleChatScroll}
            handleTyping={handleTyping}
            sendMessage={sendMessage}
          />
        )}
        {!parentFullscreenOpen && !selectedParent && renderEmptyParentPanel()}
        {selectedParent && parentFullscreenOpen && (
          <ParentDetailDrawer
            isFullscreen
            selectedParent={selectedParent}
            parentInfo={parentInfo}
            childList={children}
            parentTab={parentTab}
            setParentTab={setParentTab}
            setParentFullscreenOpen={setParentFullscreenOpen}
            setSelectedParent={setSelectedParent}
            setParentChatOpen={setParentChatOpen}
            setSidebarVisible={setSidebarVisible}
            isPortrait={isPortrait}
            detailDrawerRight={detailDrawerRight}
            detailDrawerTop={detailDrawerTop}
            detailDrawerHeight={detailDrawerHeight}
            parentChatOpen={parentChatOpen}
            adminUserId={admin.userId}
            messages={messages}
            newMessageText={newMessageText}
            setNewMessageText={setNewMessageText}
            typingUserId={typingUserId}
            chatMessagesContainerRef={chatMessagesContainerRef}
            messagesEndRef={messagesEndRef}
            handleChatScroll={handleChatScroll}
            handleTyping={handleTyping}
            sendMessage={sendMessage}
          />
        )}

      </div>
    </div>
  );
}

export default Parent;