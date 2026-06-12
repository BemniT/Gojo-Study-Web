import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../styles/global.css";
import { AiFillPicture, AiFillVideoCamera } from "react-icons/ai";
import { FaHome, FaFileAlt, FaChalkboardTeacher, FaCog, FaSignOutAlt, FaBell, FaFacebookMessenger, FaCalendarAlt, FaChartLine, FaPlus, FaThumbsUp, FaEllipsisH, FaExchangeAlt, FaFolderOpen, FaUserGraduate, FaChevronDown } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { BACKEND_BASE } from "../config.js";
import useTopbarNotifications from "../hooks/useTopbarNotifications";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import usePosts from "../hooks/posts/usePosts";
import useCalendar from "../hooks/calendar/useCalendar";
import useConversations from "../hooks/chat/useConversations";
import PostsFeed from "../components/dashboard/posts/PostsFeed";
import CalendarEventModal from "../components/dashboard/calendar/CalendarEventModal";
import DashboardSidebar from "../components/dashboard/layout/DashboardSidebar";
import DashboardTopBar from "../components/dashboard/layout/DashboardTopBar";
import CalendarWidget from "../components/dashboard/calendar/CalendarWidget";
import CreatePostModal from "../components/dashboard/posts/CreatePostModal";
import QuickStatisticsCard from "../components/dashboard/layout/QuickStatisticsCard";
import TodaysActivityCard from "../components/dashboard/layout/TodaysActivityCard";
import {
  ETHIOPIAN_MONTHS,
  CALENDAR_WEEK_DAYS,
  CALENDAR_MANAGER_ROLES,
  getCalendarEventMeta,
  formatCalendarDeadlineDate,
} from "../utils/calendar";
import { formatFileSize, optimizePostMedia } from "../utils/postMedia";
import { buildRegisterTargetRoleOptions, fetchConversationSummaries } from "../utils/registerData";
import ProfileAvatar from "../components/ProfileAvatar";


const createDefaultSidebarSections = () => ({
  dashboard: false,
  academic: false,
  student: false,
  status: false,
  documents: false,
  reports: false,
  system: false,
});

let dashboardSidebarSectionsState = createDefaultSidebarSections();


const hasUsableProfileImage = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  return normalized !== "/default-profile.png" && normalized.toLowerCase() !== "null" && normalized.toLowerCase() !== "undefined";
};

const getAvatarInitials = (value) => {
  const parts = String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "RO";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

const RECENT_CONTACT_LIMIT = 3;

function Dashboard() {
  const PRIMARY = "#007AFB";
  const BACKGROUND = "#FFFFFF";
  const ACCENT = "#00B6A9";
  const API_BASE = `${BACKEND_BASE}/api`;

  // ---------------- REGISTRAR SESSION (hook owns finance/admin bootstrap) ----------------
  const {
    finance, setFinance,
    admin,
    schoolCode,
    DB_ROOT,
    loadingAdmin,
  } = useRegistrarSession();

  // ---------------- POSTS (hook owns feed + draft + CRUD) ----------------
  const {
    posts, setPosts,
    postText, setPostText,
    postMedia, setPostMedia,
    postMediaMeta, setPostMediaMeta,
    isOptimizingMedia,
    targetRole, setTargetRole,
    targetOptions, setTargetOptions,
    fileInputRef,
    canSubmitPost,
    currentLikeActorId,
    fetchPosts,
    handlePost,
    handleSubmitCreatePost,
    handleLike,
    handleDelete,
    handleEdit,
    handlePostMediaSelection,
    handleOpenPostMediaPicker,
  } = usePosts({
    apiBase: API_BASE,
    schoolCode,
    dbRoot: DB_ROOT,
    admin,
    finance,
  });

  // ---------------- STATE ----------------
  const currentCalendarRole = String(finance.role || "registrar").trim().toLowerCase();
  const canManageCalendar = CALENDAR_MANAGER_ROLES.has(currentCalendarRole);

  // ---------------- CALENDAR (hook owns events + Ethiopian-date derivations) ----------------
  const cal = useCalendar({
    schoolCode,
    dbRoot: DB_ROOT,
    admin,
    canManageCalendar,
  });
  const {
    calendarViewDate, setCalendarViewDate,
    calendarEvents,
    calendarEventsLoading,
    calendarEventForm, setCalendarEventForm,
    calendarEventSaving,
    selectedCalendarIsoDate, setSelectedCalendarIsoDate,
    editingCalendarEventId,
    calendarActionMessage,
    showCalendarEventModal,
    hoveredCalendarIsoDate, setHoveredCalendarIsoDate,
    calendarModalContext,
    showAllUpcomingDeadlines, setShowAllUpcomingDeadlines,
    calendarMonthLabel,
    calendarHighlightedDay,
    calendarDays,
    monthlyCalendarEvents,
    upcomingDeadlineEvents,
    visibleUpcomingDeadlineEvents,
    editingCalendarEvent,
    selectableCalendarDays,
    selectedCalendarDay,
    selectedCalendarEvents,
    handleCalendarMonthChange,
    handleCreateCalendarEvent,
    handleEditCalendarEvent,
    handleDeleteCalendarEvent,
    handleCancelCalendarEdit,
    handleOpenCalendarEventModal,
    handleOpenDeadlineModal,
    handleCloseCalendarEventModal,
  } = cal;

  const [unreadMessages, setUnreadMessages] = useState([]);
  const [showMessengerDropdown, setShowMessengerDropdown] = useState(false);

  const [showMessageDropdown, setShowMessageDropdown] = useState(false);
  const [expandedPostDescriptions, setExpandedPostDescriptions] = useState({});
  const [sidebarSections, setSidebarSections] = useState(() => ({ ...dashboardSidebarSectionsState }));
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherChatOpen, setTeacherChatOpen] = useState(false);
  // All unread messages from any sender type
  // Correct order
  const location = useLocation();
  const scrollToPostId = location.state?.scrollToPostId;
  const postIdToScroll = location.state?.postId;
  const postId = location.state?.postId;

  const [currentChat, setCurrentChat] = useState([]);


  const togglePostDescription = (postId) => {
    setExpandedPostDescriptions((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const financeUserId = finance.userId;

  // ---------------- CONVERSATIONS (hook owns recent-contacts panel) ----------------
  const {
    teachers, setTeachers,
    unreadTeachers, setUnreadTeachers,
    popupMessages, setPopupMessages,
    recentContacts,
  } = useConversations({
    dbRoot: DB_ROOT,
    currentUserId: financeUserId,
  });

  // When financeUserId changes, refresh posts audience options. (Was previously
  // bundled into the conversations effect; kept here as a thin sync so the
  // hooks stay single-purpose.)
  useEffect(() => {
    const nextRoles = buildRegisterTargetRoleOptions();
    setTargetOptions(nextRoles);
    setTargetRole((prev) => (nextRoles.includes(prev) ? prev : "all"));
  }, [financeUserId, setTargetOptions, setTargetRole]);

  const [showPostDropdown, setShowPostDropdown] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const {
    unreadSenders,
    setUnreadSenders,
    unreadPosts: unreadPostList,
    setUnreadPosts: setUnreadPostList,
    messageCount,
    totalNotifications,
    markMessagesAsSeen,
    markPostAsSeen,
  } = useTopbarNotifications({
    dbRoot: DB_ROOT,
    currentUserId: admin.userId,
  });

  const navigate = useNavigate();
  const currentPath = location.pathname;
  const renderProfileAvatar = (imageUrl, name, size = 40, borderRadius = "50%", style = {}) => {
    return (
      <ProfileAvatar
        className="img-circle"
        imageUrl={imageUrl}
        name={name || "Register Office"}
        alt={name || "profile"}
        size={size}
        borderRadius={borderRadius}
        style={style}
      />
    );
  };
  const toggleSidebarSection = (sectionKey) => {
    setSidebarSections((prev) => {
      const nextState = {
        ...prev,
        [sectionKey]: !prev[sectionKey],
      };

      dashboardSidebarSectionsState = nextState;
      return nextState;
    });
  };
  const isOverlayModalOpen = showCalendarEventModal;





  useEffect(() => {
    if (postId) {
      const element = document.getElementById(`post-${postId}`);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  }, [postId]);




  const handleOpenChat = (user, userType) => {
    navigate("/all-chat", {
      state: {
        userType,           // "teacher" or "student"
        studentId: user?.id, // for student chat
        teacher: user,       // for teacher chat
      },
    });
  };


  // ---------------- CLOSE DROPDOWN ON OUTSIDE CLICK ----------------
  useEffect(() => {
    const closeDropdown = (e) => {
      if (
        !e.target.closest(".icon-circle") &&
        !e.target.closest(".messenger-dropdown")
      ) {
        setShowMessageDropdown(false);
      }
    };

    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  }, []);


  const openChatWithUser = async (userId) => {
    setShowMessengerDropdown(false);

    // Fetch chat history
    const res = await axios.get(`${API_BASE}/chat/${admin.userId}/${userId}`);
    setCurrentChat(res.data); // You need a state `currentChat` to render the conversation

    // Mark messages as read
    await axios.post(`${API_BASE}/mark_messages_read`, {
      financeId: finance.userId,
      senderId: userId
    });

    // Refresh unread messages
    setUnreadMessages(prev => prev.filter(m => m.senderId !== userId));
  };

  // ---------------- OPEN POST FROM NOTIFICATION ----------------
  const openPostFromNotif = async (post) => {
    setShowPostDropdown(false);

    try {
      await markPostAsSeen(post.postId);

      // Update post as seen in main feed
      setPosts(prev =>
        prev.map(p =>
          p.postId === post.postId
            ? {
                ...p,
                seenBy: {
                  ...(p.seenBy || {}),
                  [admin.userId]: true
                }
              }
            : p
        )
      );

      // Scroll + highlight
      setTimeout(() => {
        const el = document.getElementById(`post-${post.postId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.backgroundColor = "var(--warning-soft)";
          setTimeout(() => (el.style.backgroundColor = ""), 1500);
        }
      }, 200);

    } catch (err) {
      console.error("Error opening post notification:", err);
    }
  };

  useEffect(() => {
    if (postIdToScroll) {
      const element = document.getElementById(`post-${postIdToScroll}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        element.style.backgroundColor = "color-mix(in srgb, var(--warning-soft) 72%, var(--surface-panel))";
        setTimeout(() => (element.style.backgroundColor = ""), 2000);
      }
    }
  }, [postIdToScroll]);

  // ---------------- CLOSE DROPDOWN ON OUTSIDE CLICK ----------------
  useEffect(() => {
    const close = (e) => {
      if (
        !e.target.closest(".icon-circle") &&
        !e.target.closest(".notification-dropdown")
      ) {
        setShowPostDropdown(false);
      }
    };

    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);


  // Add this effect to monitor admin state changes
  useEffect(() => {
    if (loadingAdmin) return;

    if (!admin.userId && !admin.adminId) {
      console.log("No admin found, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [loadingAdmin, admin.userId, admin.adminId]);

  useEffect(() => {
    if (!showCreatePostModal) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowCreatePostModal(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showCreatePostModal]);





  // ---------------- HANDLE LIKE ----------------

  // ---------------- HANDLE DELETE ----------------

  // ---------------- HANDLE EDIT ----------------

  // ---------------- RENDER ----------------
  return (
    <div
      className="dashboard-page"
      style={{
        background: BACKGROUND,
        minHeight: "100vh",
        height: "auto",
        overflowX: "hidden",
        overflowY: "auto",
        "--surface-panel": BACKGROUND,
        "--surface-accent": "#F1F8FF",
        "--surface-muted": "#F7FBFF",
        "--surface-strong": "#DCEBFF",
        "--page-bg": BACKGROUND,
        "--page-bg-secondary": BACKGROUND,
        "--border-soft": "#D7E7FB",
        "--border-strong": "#B5D2F8",
        "--text-primary": "#0f172a",
        "--text-secondary": "#334155",
        "--text-muted": "#64748b",
        "--accent": PRIMARY,
        "--accent-soft": "#E7F2FF",
        "--accent-strong": "#007AFB",
        "--success": ACCENT,
        "--success-soft": "#E9FBF9",
        "--success-border": "#AAEDE7",
        "--warning": "#DC2626",
        "--warning-soft": "#FEE2E2",
        "--warning-border": "#FCA5A5",
        "--danger": "#b91c1c",
        "--danger-soft": "#FEE2E2",
        "--danger-border": "#fca5a5",
        "--sidebar-width": "clamp(230px, 16vw, 290px)",
        "--surface-overlay": "#F1F8FF",
        "--input-bg": BACKGROUND,
        "--input-border": "#B5D2F8",
        "--shadow-soft": "0 10px 24px rgba(0, 122, 251, 0.10)",
        "--shadow-panel": "0 14px 30px rgba(0, 122, 251, 0.14)",
        "--shadow-glow": "0 0 0 2px rgba(0, 122, 251, 0.18)",
      }}
    >

      {/* ---------------- TOP NAVIGATION BAR ---------------- */}
      <DashboardTopBar
        admin={admin}
        totalNotifications={totalNotifications}
        showPostDropdown={showPostDropdown}
        setShowPostDropdown={setShowPostDropdown}
        unreadPostList={unreadPostList}
        messageCount={messageCount}
        unreadSenders={unreadSenders}
        setUnreadSenders={setUnreadSenders}
        markMessagesAsSeen={markMessagesAsSeen}
        onOpenPost={openPostFromNotif}
      />

      <div className="google-dashboard" style={{ display: "flex", gap: 14, padding: "18px 14px", minHeight: "100vh", background: "var(--page-bg)", width: "100%", boxSizing: "border-box", alignItems: "flex-start" }}>
        {/* LEFT SIDEBAR */}
        <DashboardSidebar
          admin={admin}
          currentPath={currentPath}
          sidebarSections={sidebarSections}
          toggleSidebarSection={toggleSidebarSection}
          isOverlayModalOpen={isOverlayModalOpen}
        />

        {/* MIDDLE FEED COLUMN */}
        <div className="main-content google-main" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 'none', margin: '0', boxSizing: 'border-box', alignSelf: 'flex-start', minHeight: 'calc(100vh - 24px)', overflowY: 'visible', overflowX: 'hidden', position: 'relative', top: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent', padding: '0 12px 0 2px', display: 'flex', justifyContent: 'center', opacity: isOverlayModalOpen ? 0.45 : 1, filter: isOverlayModalOpen ? 'blur(1px)' : 'none', pointerEvents: isOverlayModalOpen ? 'none' : 'auto', transition: 'opacity 180ms ease, filter 180ms ease' }}>
          <PostsFeed
            admin={admin}
            posts={posts}
            expandedPostDescriptions={expandedPostDescriptions}
            togglePostDescription={togglePostDescription}
            currentLikeActorId={currentLikeActorId}
            onLike={handleLike}
            onOpenCreatePost={() => setShowCreatePostModal(true)}
          />
        </div>

        {/* RIGHT WIDGETS COLUMN */}
        <div className="dashboard-widgets" style={{ width: 'clamp(300px, 21vw, 360px)', minWidth: 300, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'flex-start', height: 'calc(100vh - 24px)', overflowY: 'auto', position: 'sticky', top: 24, scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent', paddingRight: 2, marginLeft: 'auto', marginRight: 0, opacity: isOverlayModalOpen ? 0.45 : 1, filter: isOverlayModalOpen ? 'blur(1px)' : 'none', pointerEvents: isOverlayModalOpen ? 'none' : 'auto', transition: 'opacity 180ms ease, filter 180ms ease' }}>
          {/* Quick Statistics */}
          <QuickStatisticsCard
            myPostsCount={posts.filter(p => p.userId === admin.userId || p.adminId === admin.adminId || p.financeId === admin.adminId).length}
            messageCount={messageCount}
            totalNotifications={totalNotifications}
          />

          {/* Today + Deadlines row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TodaysActivityCard
              posts={posts}
              messageCount={messageCount}
              recentContacts={recentContacts}
            />

            <CalendarWidget cal={cal} canManageCalendar={canManageCalendar} />
          </div>

          {/* Quick Links */}
          <div style={{ background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)', borderRadius: 16, boxShadow: 'var(--shadow-soft)', padding: '13px', border: '1px solid var(--border-soft)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Sponsored Links</h4>
            <ul style={{ margin: '10px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>
              <li style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>Gojo Study App</li>
              <li style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>Finance Portal</li>
              <li style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>HR Management</li>
            </ul>
          </div>

        </div>
      </div>

      <CreatePostModal
        open={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        admin={admin}
        targetRole={targetRole}
        setTargetRole={setTargetRole}
        targetOptions={targetOptions}
        postText={postText}
        setPostText={setPostText}
        postMedia={postMedia}
        setPostMedia={setPostMedia}
        postMediaMeta={postMediaMeta}
        setPostMediaMeta={setPostMediaMeta}
        isOptimizingMedia={isOptimizingMedia}
        fileInputRef={fileInputRef}
        handlePostMediaSelection={handlePostMediaSelection}
        handleOpenPostMediaPicker={handleOpenPostMediaPicker}
        handleSubmitCreatePost={handleSubmitCreatePost}
        canSubmitPost={canSubmitPost}
      />

      <CalendarEventModal cal={cal} canManageCalendar={canManageCalendar} />
    </div>
  );
}

export default Dashboard;