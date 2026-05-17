import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import ProfileAvatar from "./ProfileAvatar";
import { FaRegHeart, FaHeart, FaCalendarAlt, FaPlus, FaThumbsUp, FaBookOpen } from "react-icons/fa";
import "../styles/global.css";
import "./Dashboard.css";
import { RTDB_BASE_RAW } from "../api/rtdbScope";
import QuickLessonPlanCheckModal from "./settings/QuickLessonPlanCheckModal";
import { useCalendar } from "./useCalendar";
import {
  buildSchoolRtdbBase,
  loadUserRecordById,
  resolveTeacherSchoolCode,
} from "../utils/teacherData";
import { getStoredTeacher, setStoredTeacher, getTeacherProfileFetchedAt, setTeacherProfileFetchedAt } from "../utils/useStoredTeacher";
import { usePostsFeed } from "./usePostsFeed";
import { useConversations } from "./useConversations";

function getSafeProfileImage(profileImage) {
  if (!profileImage) return "/default-profile.png";
  if (
    typeof profileImage !== "string" ||
    !profileImage.trim() ||
    profileImage === "null" ||
    profileImage === "undefined"
  ) {
    return "/default-profile.png";
  }
  return profileImage;
}

function normalizePostLikes(likes) {
  if (Array.isArray(likes)) {
    return likes.reduce((accumulator, value) => {
      const normalizedKey = String(value || "").trim();
      if (normalizedKey) {
        accumulator[normalizedKey] = true;
      }
      return accumulator;
    }, {});
  }

  if (likes && typeof likes === "object") {
    return Object.entries(likes).reduce((accumulator, [key, value]) => {
      const normalizedKey = String(key || "").trim();
      if (normalizedKey && value) {
        accumulator[normalizedKey] = true;
      }
      return accumulator;
    }, {});
  }

  return {};
}

function isPostLikedByActor(post, actorId) {
  const normalizedActorId = String(actorId || "").trim();
  if (!normalizedActorId) {
    return false;
  }

  return Boolean(normalizePostLikes(post?.likes)[normalizedActorId]);
}

function getResolvedLikeCount(post) {
  const explicitCount = Number(post?.likeCount);
  if (Number.isFinite(explicitCount) && explicitCount >= 0) {
    return explicitCount;
  }

  return Object.keys(normalizePostLikes(post?.likes)).length;
}

function readTeacherSettingsPreferences(teacherUserId) {
  if (!teacherUserId) {
    return {
      emailAlerts: true,
      pushAlerts: true,
      weeklyDigest: false,
      compactCards: false,
    };
  }

  try {
    return {
      emailAlerts: true,
      pushAlerts: true,
      weeklyDigest: false,
      compactCards: false,
      ...(JSON.parse(localStorage.getItem(`teacher_settings_preferences_${teacherUserId}`) || "{}") || {}),
    };
  } catch {
    return {
      emailAlerts: true,
      pushAlerts: true,
      weeklyDigest: false,
      compactCards: false,
    };
  }
}

const PRIMARY = "#007AFB";
const BACKGROUND = "#FFFFFF";
const ACCENT = "#00B6A9";
const rightRailIconStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "#F8FAFC",
  color: "var(--text-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(15, 23, 42, 0.08)",
};
const rightRailActionButtonStyle = {
  height: 34,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid rgba(0, 122, 251, 0.18)",
  background: "#007AFB",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};
const rightRailSecondaryButtonStyle = {
  height: 34,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "var(--surface-panel)",
  color: "var(--text-primary)",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};
const FEED_SECTION_STYLE = {
  width: "100%",
  maxWidth: 680,
};
const shellCardStyle = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  boxShadow: "var(--shadow-soft)",
};
const MESSAGE_PREVIEW_LIMIT = 220;
const CALENDAR_MANAGER_ROLES = new Set([
  "registrar",
  "registerer",
  "admin",
  "admins",
  "school_admin",
  "school_admins",
]);
export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState("");
  const [quickLessonCheckOpen, setQuickLessonCheckOpen] = useState(false);
  const [quickLessonFeedback, setQuickLessonFeedback] = useState({ type: "", text: "" });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileTab, setMobileTab] = useState("feed");
  const [compactCards, setCompactCards] = useState(() =>
    Boolean(readTeacherSettingsPreferences(getStoredTeacher().userId).compactCards)
  );
  const postRefs = useRef({});

  const teacherId = teacher?.userId || null;
  const role = String(teacher?.role || teacher?.userType || "teacher").trim().toLowerCase().replace(/-/g, "_");
  const canManageCalendar = useMemo(
    () => CALENDAR_MANAGER_ROLES.has(role),
    [role]
  );
  const schoolCode =
    teacher?.schoolCode ||
    getStoredTeacher().schoolCode ||
    "";
  const effectiveSchoolCode = String(
    resolvedSchoolCode ||
      (String(schoolCode || "").includes("-") ? schoolCode : "") ||
      ""
  ).trim();
  const DB_ROOT = effectiveSchoolCode
    ? `${RTDB_BASE_RAW}/Platform1/Schools/${effectiveSchoolCode}`
    : RTDB_BASE_RAW;

  const resolveSchoolCode = useCallback((candidateTeacher) => {
    const storedTeacher = getStoredTeacher();
    const directSchoolCode = String(candidateTeacher?.schoolCode || storedTeacher?.schoolCode || "").trim();
    if (directSchoolCode) {
      return directSchoolCode;
    }

    const usernameCandidate = String(
      candidateTeacher?.username ||
      candidateTeacher?.teacherId ||
      storedTeacher?.username ||
      storedTeacher?.teacherId ||
      ""
    )
      .trim()
      .toUpperCase();

    const inferredPrefix = usernameCandidate.replace(/[^A-Z]/g, "").slice(0, 3);
    return inferredPrefix;
  }, []);

  const getNormalizedTargetRole = useCallback((post) => {
    if (!post || typeof post !== "object") {
      return "";
    }

    const directTarget =
      post.targetRole ??
      post.TargetRole ??
      post.targetrole ??
      post.target ??
      post.targetUserType ??
      post.targetAudience ??
      "";

    if (Array.isArray(directTarget)) {
      return directTarget
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
        .join(",");
    }

    return String(directTarget || "").trim().toLowerCase();
  }, []);

  const isTeacherVisiblePost = useCallback((post) => {
    const normalizedTargetRole = getNormalizedTargetRole(post);
    const targetParts = normalizedTargetRole
      .split(/[\s,|]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (targetParts.length === 0) {
      return true;
    }

    if (targetParts.includes("all")) {
      return true;
    }

    return targetParts.includes("teacher") || targetParts.includes("teachers");
  }, [getNormalizedTargetRole]);

  const {
    posts,
    postsLoading,
    expandedPostIds,
    setExpandedPostIds,
    pendingLikePostIds,
    notifications,
    highlightedPostId,
    fetchPostsAndAdmins,
    handleLike,
  } = usePostsFeed({
    teacher,
    effectiveSchoolCode,
    schoolCode,
    postRefs,
    isTeacherVisiblePost,
    getSafeProfileImage,
    resolveSchoolCode,
  });

  const { conversations, fetchConversations, handleOpenConversation } = useConversations({
    teacher,
    effectiveSchoolCode,
    DB_ROOT,
    navigate,
  });

  const {
    ETHIOPIAN_MONTHS,
    CALENDAR_WEEK_DAYS,
    calendarViewDate,
    selectedCalendarIsoDate,
    setSelectedCalendarIsoDate,
    hoveredCalendarIsoDate,
    setHoveredCalendarIsoDate,
    showAllUpcomingDeadlines,
    setShowAllUpcomingDeadlines,
    calendarEventsLoading,
    calendarEventForm,
    setCalendarEventForm,
    calendarEventSaving,
    editingCalendarEventId,
    calendarActionMessage,
    calendarErrorMessage,
    pendingDeleteEvent,
    setPendingDeleteEvent,
    showCalendarEventModal,
    calendarModalContext,
    calendarHighlightedDay,
    calendarMonthLabel,
    calendarMonthStartGregorian,
    calendarMonthEndGregorian,
    calendarDays,
    monthlyCalendarEvents,
    selectedCalendarDay,
    selectedCalendarEvents,
    upcomingDeadlineEvents,
    visibleUpcomingDeadlineEvents,
    getCalendarEventMeta,
    formatCalendarDeadlineDate,
    handleCalendarMonthChange,
    handleCreateCalendarEvent,
    handleEditCalendarEvent,
    handleDeleteCalendarEvent,
    handleConfirmedDelete,
    handleOpenCalendarEventModal,
    handleOpenDeadlineModal,
    handleCloseCalendarEventModal,
  } = useCalendar({ effectiveSchoolCode, DB_ROOT, teacherId, canManageCalendar });

  const isOverlayModalOpen = showCalendarEventModal || quickLessonCheckOpen;

  useEffect(() => {
    let cancelled = false;

    const resolveDashboardSchoolCode = async () => {
      if (!schoolCode) {
        setResolvedSchoolCode("");
        return;
      }

      const resolved = await resolveTeacherSchoolCode(schoolCode);
      if (!cancelled) {
        setResolvedSchoolCode(resolved);
      }
    };

    resolveDashboardSchoolCode();

    return () => {
      cancelled = true;
    };
  }, [schoolCode]);

  const softPanelStyle = useMemo(() => ({
    background: "#F8FAFC",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    borderRadius: compactCards ? 8 : 10,
  }), [compactCards]);
  const rightRailCardStyle = useMemo(() => ({
    background: "var(--surface-panel)",
    borderRadius: compactCards ? 10 : 12,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08), 0 8px 20px rgba(15, 23, 42, 0.04)",
    border: "1px solid rgba(15, 23, 42, 0.08)",
  }), [compactCards]);
  const widgetCardStyle = useMemo(() => ({
    ...rightRailCardStyle,
    padding: compactCards ? "10px" : "12px",
  }), [compactCards, rightRailCardStyle]);
  const smallStatStyle = useMemo(() => ({
    padding: compactCards ? "8px 10px" : "10px 12px",
    borderRadius: compactCards ? 8 : 10,
    background: "#F8FAFC",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    minWidth: compactCards ? 76 : 84,
  }), [compactCards]);
  const rightRailIconButtonStyle = useMemo(() => ({
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "#F8FAFC",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
  }), []);
  const rightRailPillStyle = useMemo(() => ({
    padding: "4px 8px",
    borderRadius: 999,
    background: "#F8FAFC",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    fontSize: 9,
    color: "var(--text-secondary)",
    fontWeight: 800,
  }), []);

  useEffect(() => {
    const syncPreferences = () => {
      const storedTeacher = getStoredTeacher();
      setCompactCards(Boolean(readTeacherSettingsPreferences(storedTeacher.userId).compactCards));
    };

    window.addEventListener("storage", syncPreferences);
    window.addEventListener("teacher-settings-preferences-changed", syncPreferences);
    return () => {
      window.removeEventListener("storage", syncPreferences);
      window.removeEventListener("teacher-settings-preferences-changed", syncPreferences);
    };
  }, []);

  const formatPostTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const parsedDate = new Date(timestamp);
    if (Number.isNaN(parsedDate.getTime())) return "";

    const dateOptions =
      parsedDate.getFullYear() === new Date().getFullYear()
        ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
        : { month: "short", day: "numeric", year: "numeric" };

    return parsedDate.toLocaleDateString("en-US", dateOptions);
  };

  useEffect(() => {
    const stored = getStoredTeacher();
    if (!stored || !stored.userId) {
      navigate("/login");
      return;
    }

    const fetchTeacherProfile = async () => {
      const fetchedAt = getTeacherProfileFetchedAt();
      const tenMinutes = 10 * 60 * 1000;
      if (stored && Date.now() - fetchedAt < tenMinutes) {
        setTeacher(stored);
        return;
      }

      try {
        const schoolCodeForFetch = resolvedSchoolCode || stored?.schoolCode || "";
        const teacherEntry = await loadUserRecordById({
          rtdbBase: schoolCodeForFetch ? buildSchoolRtdbBase(schoolCodeForFetch) : DB_ROOT,
          schoolCode: schoolCodeForFetch,
          userId: stored.userId,
        });

        if (teacherEntry) {
          const merged = {
            ...stored,
            ...teacherEntry,
            schoolCode: schoolCodeForFetch || "",
          };
          setTeacher(merged);
          setTeacherProfileFetchedAt(Date.now());
          setStoredTeacher(merged);
        } else {
          setTeacher(stored);
        }
      } catch (err) {
        console.error("Error loading teacher profile:", err);
        setTeacher(stored);
      }
    };

    fetchTeacherProfile();
  }, [navigate, resolvedSchoolCode, DB_ROOT]);

  useEffect(() => {
    const storedTeacher = getStoredTeacher();
    const sourceTeacher = teacher?.userId ? teacher : storedTeacher;
    if (!sourceTeacher?.userId) {
      return;
    }

    const teacherForScopedFetch = effectiveSchoolCode
      ? { ...sourceTeacher, schoolCode: effectiveSchoolCode }
      : sourceTeacher;

    fetchPostsAndAdmins(teacherForScopedFetch);
    fetchConversations(teacherForScopedFetch);
  }, [teacher, effectiveSchoolCode, fetchPostsAndAdmins, fetchConversations]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 600) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!quickLessonFeedback.text) return undefined;

    const timeoutId = window.setTimeout(() => {
      setQuickLessonFeedback({ type: "", text: "" });
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [quickLessonFeedback.text]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await (window.__gojoTeacherLogout?.() ?? Promise.resolve());
    navigate("/login", { replace: true });
  }, [navigate]);

  const totalUnreadMessages = useMemo(
    () =>
      conversations.reduce(
        (sum, c) => sum + (c.unreadForMe || 0),
        0
      ),
    [conversations]
  );
  const recentConversations = useMemo(
    () => conversations.slice(0, 5),
    [conversations]
  );
  const totalNotifications = useMemo(
    () => notifications.length + totalUnreadMessages,
    [notifications, totalUnreadMessages]
  );
  const totalPostsToday = useMemo(
    () =>
      posts.filter((post) => {
        const timestamp = post.time ? new Date(post.time) : null;
        if (!timestamp || Number.isNaN(timestamp.getTime())) return false;
        const now = new Date();
        return (
          timestamp.getDate() === now.getDate() &&
          timestamp.getMonth() === now.getMonth() &&
          timestamp.getFullYear() === now.getFullYear()
        );
      }).length,
    [posts]
  );

  const recentContacts = useMemo(
    () =>
      recentConversations
        .map((conv) => ({
          userId: conv.contact?.userId || conv.contact?.pushKey || conv.chatId,
          chatId: conv.chatId,
          conversation: conv,
          name: conv.displayName || "User",
          profileImage: conv.profile || "/default-profile.png",
          type: "user",
          unreadCount: Number(conv.unreadForMe || 0),
          lastMessage:
            conv.lastMessageText ||
            (Number(conv.unreadForMe || 0) > 0
              ? `${Number(conv.unreadForMe || 0)} unread message${
                  Number(conv.unreadForMe || 0) === 1 ? "" : "s"
                }`
              : "Open chat"),
        }))
        .slice(0, 4),
    [recentConversations]
  );

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
        "--border-soft": "#D7E7FB",
        "--border-strong": "#B5D2F8",
        "--text-primary": "#0f172a",
        "--text-secondary": "#334155",
        "--text-muted": "#64748b",
        "--accent": PRIMARY,
        "--accent-soft": "#E7F2FF",
        "--accent-strong": "#005FCC",
        "--success": ACCENT,
        "--success-soft": "#E9FBF9",
        "--success-border": "#AAEDE7",
        "--warning": "#DC2626",
        "--warning-soft": "#FEE2E2",
        "--warning-border": "#FCA5A5",
        "--danger": "#b91c1c",
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
      {!isOnline && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#DC2626",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          textAlign: "center",
          padding: "10px 16px",
          letterSpacing: "0.01em",
        }}>
          ⚠️ You are offline — some data may be outdated. Changes will not be saved.
        </div>
      )}
      <div className="google-dashboard" style={{ display: "flex", gap: compactCards ? 10 : 14, padding: compactCards ? "12px 10px" : "18px 14px", minHeight: "100vh", background: "var(--page-bg)", width: "100%", boxSizing: "border-box", alignItems: "flex-start" }}>
        <Sidebar
          active="dashboard"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          teacher={teacher}
          handleLogout={handleLogout}
        />

        <div
          className="teacher-sidebar-spacer"
          style={{
            width: "var(--sidebar-width)",
            minWidth: "var(--sidebar-width)",
            flex: "0 0 var(--sidebar-width)",
            pointerEvents: "none",
          }}
        />

        <div className="main-content google-main" style={{ flex: "1 1 0", minWidth: 0, maxWidth: "none", margin: "0", boxSizing: "border-box", alignSelf: "flex-start", minHeight: "calc(100vh - 24px)", overflowY: "visible", overflowX: "hidden", position: "relative", top: "auto", scrollbarWidth: "thin", scrollbarColor: "transparent transparent", padding: compactCards ? "0 8px 0 0" : "0 12px 0 2px", display: "flex", justifyContent: "center", opacity: isOverlayModalOpen ? 0.45 : 1, filter: isOverlayModalOpen ? "blur(1px)" : "none", pointerEvents: isOverlayModalOpen ? "none" : "auto", transition: "opacity 180ms ease, filter 180ms ease" }}>
          <div style={{ display: mobileTab === "feed" ? "flex" : "none", justifyContent: "center", width: "100%" }}>
          <div style={{ width: "100%", maxWidth: FEED_SECTION_STYLE.maxWidth }}>
          <div className="section-header-card" style={{ ...FEED_SECTION_STYLE, margin: compactCards ? "0 auto 10px" : "0 auto 14px" }}>
            <div className="section-header-card__title" style={{ fontSize: 17 }}>School Updates Feed</div>
            <div className="section-header-card__subtitle">Post announcements, payment reminders, and notices.</div>
          </div>

          <div className="posts-container" style={{ ...FEED_SECTION_STYLE, display: "flex", flexDirection: "column", gap: compactCards ? 8 : 12 }}>
            {postsLoading ? (
              <>
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    style={{
                      ...shellCardStyle,
                      borderRadius: compactCards ? 10 : 12,
                      overflow: "hidden",
                      padding: compactCards ? "10px 12px" : "12px 14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)", backgroundSize: "200% 100%", animation: "skeleton-shimmer 1.4s infinite" }} />
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ height: 12, width: "40%", borderRadius: 6, background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)", backgroundSize: "200% 100%", animation: "skeleton-shimmer 1.4s infinite" }} />
                        <div style={{ height: 10, width: "25%", borderRadius: 6, background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)", backgroundSize: "200% 100%", animation: "skeleton-shimmer 1.4s infinite" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[100, 85, 60].map((w) => (
                        <div key={w} style={{ height: 11, width: `${w}%`, borderRadius: 6, background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)", backgroundSize: "200% 100%", animation: "skeleton-shimmer 1.4s infinite" }} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : posts.length === 0 ? (
              <div style={{ ...shellCardStyle, borderRadius: compactCards ? 8 : 10, padding: compactCards ? "12px" : "16px", fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>
                No posts available right now.
              </div>
            ) : posts.map((post) => {
              const messageText = String(post.message || "");
              const isLongMessage = messageText.length > MESSAGE_PREVIEW_LIMIT;
              const isExpandedMessage = Boolean(expandedPostIds[post.postId]);
              const normalizedTargetRole = getNormalizedTargetRole(post);
              const targetParts = normalizedTargetRole
                .split(/[\s,|]+/)
                .map((value) => value.trim())
                .filter(Boolean);
              const isPublicPost = targetParts.includes("all");
              const targetRoleLabel = isPublicPost ? "Visible to everyone" : "Visible to teachers";
              const audienceBadgeLabel = isPublicPost ? "Public update" : "Teacher-only update";
              const postTimeLabel = formatPostTimestamp(post.time);
              const postTimestampTitle = post.time ? new Date(post.time).toLocaleString() : "";
              const likeCount = getResolvedLikeCount(post);
              const isLikedByTeacher = isPostLikedByActor(post, teacherId);
              const isLikePending = Boolean(pendingLikePostIds[post.postId]);

              return (
                <div
                  className="facebook-post-card"
                  key={post.postId}
                  id={`post-${post.postId}`}
                  ref={(el) => (postRefs.current[post.postId] = el)}
                  style={{
                    ...shellCardStyle,
                    borderRadius: compactCards ? 10 : 12,
                    overflow: "hidden",
                    border:
                      highlightedPostId === post.postId
                        ? "1px solid var(--accent)"
                        : "1px solid rgba(15, 23, 42, 0.08)",
                    background:
                      highlightedPostId === post.postId
                        ? "linear-gradient(180deg, color-mix(in srgb, var(--accent-soft) 72%, white 28%) 0%, var(--surface-panel) 100%)"
                        : "var(--surface-panel)",
                    boxShadow:
                      highlightedPostId === post.postId
                        ? "0 0 0 2px rgba(0, 122, 251, 0.12), 0 18px 34px rgba(15, 23, 42, 0.08)"
                        : "0 1px 2px rgba(15, 23, 42, 0.08), 0 8px 20px rgba(15, 23, 42, 0.04)",
                    transition: "background 0.3s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                  }}
                >
                  <div className="facebook-post-card__header" style={{ padding: compactCards ? "10px 12px 8px" : "12px 14px 10px" }}>
                    <div className="facebook-post-card__header-main">
                      <div className="facebook-post-card__avatar">
                        <ProfileAvatar
                          src={post.adminProfile}
                          name={post.adminName || "Admin"}
                          alt={post.adminName || "Admin"}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                      <div className="facebook-post-card__identity">
                        <div className="facebook-post-card__identity-row">
                          <h4>{post.adminName || "Admin"}</h4>
                          <span className="facebook-post-card__page-badge">School Page</span>
                        </div>
                        <div className="facebook-post-card__meta" title={postTimestampTitle || undefined}>
                          <span>{postTimeLabel || postTimestampTitle || "Recent update"}</span>
                          <span aria-hidden="true">·</span>
                          <span>{targetRoleLabel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="facebook-post-card__type-chip">Announcement</div>
                  </div>

                  {messageText ? (
                    <div className="facebook-post-card__body" style={{ padding: compactCards ? "0 12px 10px" : "0 14px 12px" }}>
                      <div className="facebook-post-card__message">
                        {isLongMessage && !isExpandedMessage
                          ? `${messageText.slice(0, MESSAGE_PREVIEW_LIMIT).trimEnd()}...`
                          : messageText}
                      </div>
                      {isLongMessage ? (
                        <button
                          type="button"
                          className="facebook-post-card__read-more"
                          onClick={() => setExpandedPostIds((prev) => ({
                            ...prev,
                            [post.postId]: !prev[post.postId],
                          }))}
                        >
                          {isExpandedMessage ? "See less" : "Read more"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {post.postUrl ? (
                    <div className="facebook-post-card__media-shell">
                      <img className="facebook-post-card__media" src={post.postUrl} alt="post media" />
                    </div>
                  ) : null}

                  <div className="facebook-post-card__stats" style={{ padding: compactCards ? "8px 12px 7px" : "10px 14px 8px" }}>
                    <div className="facebook-post-card__stats-left">
                      {likeCount > 0 ? (
                        <>
                          <span className="facebook-post-card__reaction-bubble">
                            <FaThumbsUp style={{ width: 10, height: 10 }} />
                          </span>
                          <span>{`${likeCount} ${likeCount === 1 ? "like" : "likes"}`}</span>
                        </>
                      ) : (
                        <span>Be the first to react</span>
                      )}
                    </div>
                    <div className="facebook-post-card__stats-right" title={targetRoleLabel}>
                      <span>{audienceBadgeLabel}</span>
                    </div>
                  </div>

                  <div className="facebook-post-card__actions" style={{ padding: compactCards ? "3px 8px 8px" : "4px 10px 10px" }}>
                    <button
                      type="button"
                      aria-pressed={isLikedByTeacher}
                      onClick={() => handleLike(post.postId)}
                      disabled={isLikePending}
                      className={`facebook-post-card__action-button${isLikedByTeacher ? " is-active" : ""}`}
                      style={{ opacity: isLikePending ? 0.82 : 1, cursor: isLikePending ? "progress" : "pointer" }}
                    >
                      {isLikedByTeacher ? (
                        <FaHeart style={{ width: 14, height: 14 }} />
                      ) : (
                        <FaRegHeart style={{ width: 14, height: 14 }} />
                      )}
                      <span>{isLikedByTeacher ? "Liked" : "Like"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          <div style={{ display: mobileTab === "messages" ? "block" : "none", width: "100%", maxWidth: FEED_SECTION_STYLE.maxWidth }}>
            <div style={widgetCardStyle}>
              <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Today's Activity</h4>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", ...softPanelStyle, padding: "7px 8px", fontSize: 10 }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>New Posts</span>
                  <strong style={{ color: "var(--text-primary)" }}>{totalPostsToday}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", ...softPanelStyle, padding: "7px 8px", fontSize: 10 }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Messages</span>
                  <strong style={{ color: "var(--text-primary)" }}>{totalUnreadMessages}</strong>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>Recent Contacts</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {recentContacts.length === 0 ? (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", ...softPanelStyle, padding: "7px 8px" }}>
                      No recent chats yet
                    </div>
                  ) : (
                    recentContacts.map((contact) => {
                      return (
                        <button
                          key={contact.userId}
                          type="button"
                          onClick={() => handleOpenConversation(contact.conversation)}
                          style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left", ...softPanelStyle, padding: "5px 6px", cursor: "pointer" }}
                        >
                          <ProfileAvatar
                            src={contact.profileImage || "/default-profile.png"}
                            name={contact.name}
                            alt={contact.name}
                            style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {contact.name}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {contact.lastMessage || "Open chat"}
                            </div>
                          </div>
                          {contact.unreadCount > 0 ? (
                            <div style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                              {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                            </div>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: mobileTab === "calendar" ? "block" : "none", width: "100%", maxWidth: FEED_SECTION_STYLE.maxWidth }}>
            <div style={{ ...rightRailCardStyle, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: compactCards ? "12px 12px 10px" : "14px 14px 12px", background: "var(--surface-panel)", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={rightRailIconStyle}>
                      <FaCalendarAlt style={{ width: 14, height: 14 }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>School Calendar</h4>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3, fontWeight: 800 }}>{calendarMonthLabel}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, fontWeight: 500 }}>
                        {`${calendarMonthStartGregorian.day}/${calendarMonthStartGregorian.month}/${calendarMonthStartGregorian.year} - ${calendarMonthEndGregorian.day}/${calendarMonthEndGregorian.month}/${calendarMonthEndGregorian.year}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(-1)}
                      style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                      aria-label="Previous month"
                      title="Previous month"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(1)}
                      style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                      aria-label="Next month"
                      title="Next month"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ ...rightRailPillStyle, color: "var(--text-primary)" }}>
                      {monthlyCalendarEvents.length} event{monthlyCalendarEvents.length === 1 ? "" : "s"}
                    </div>
                    <div style={{ ...rightRailPillStyle, color: canManageCalendar ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {canManageCalendar ? "Manage access" : "View only"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ margin: compactCards ? "10px" : "12px", background: "#F8FAFC", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 12, padding: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 6 }}>
                  {CALENDAR_WEEK_DAYS.map((day) => (
                    <div key={day} style={{ textAlign: "center", fontSize: 9, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                      {day}
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
                  {calendarDays.map((day, index) => {
                    const isToday = day?.ethDay === calendarHighlightedDay;
                    const dayOfWeek = index % 7;
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const primaryEvent = day?.events?.[0] || null;
                    const isNoClassDay = primaryEvent?.category === "no-class";
                    const isAcademicDay = primaryEvent?.category === "academic";
                    const isSelected = day?.isoDate === selectedCalendarIsoDate;
                    const isHovered = day?.isoDate === hoveredCalendarIsoDate;
                    const dayBackground = day
                      ? isToday
                        ? "var(--accent-soft)"
                        : isSelected
                          ? "color-mix(in srgb, var(--accent-soft) 72%, white 28%)"
                          : isNoClassDay
                            ? "color-mix(in srgb, var(--warning-soft) 58%, white 42%)"
                            : isAcademicDay
                              ? "color-mix(in srgb, var(--accent-soft) 46%, white 54%)"
                              : isWeekend
                                ? "color-mix(in srgb, var(--surface-muted) 82%, white 18%)"
                                : "var(--surface-panel)"
                      : "transparent";

                    return (
                      <button
                        type="button"
                        key={`${day?.ethDay || "blank"}-${index}`}
                        onClick={() => day && setSelectedCalendarIsoDate(day.isoDate)}
                        onMouseEnter={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                        onMouseLeave={() => setHoveredCalendarIsoDate("")}
                        onFocus={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                        onBlur={() => setHoveredCalendarIsoDate("")}
                        title={day?.events?.length ? day.events.map((eventItem) => eventItem.title).join(", ") : ""}
                        style={{
                          minHeight: 0,
                          aspectRatio: "1 / 1",
                          borderRadius: 10,
                          border: isToday
                            ? "1px solid var(--accent)"
                            : isSelected
                              ? "1px solid var(--accent-strong)"
                              : isHovered
                                ? "1px solid var(--border-strong)"
                                    : isNoClassDay
                                      ? "1px solid var(--warning-border)"
                                      : "1px solid var(--border-soft)",
                          background: dayBackground,
                          color: isToday ? "var(--accent-strong)" : day ? "var(--text-secondary)" : "transparent",
                          fontSize: 10,
                          fontWeight: isToday ? 800 : 700,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          padding: "5px 2px",
                          boxShadow: day && isSelected ? "0 8px 18px rgba(0, 122, 251, 0.12)" : "none",
                          cursor: day ? "pointer" : "default",
                          outline: "none",
                          transform: day && isSelected
                            ? "translateY(-2px) scale(1.03)"
                            : day && isHovered
                              ? "translateY(-1px)"
                              : "translateY(0)",
                          transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        disabled={!day}
                      >
                        {day ? (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 800, color: isToday || isSelected ? "var(--accent-strong)" : "var(--text-primary)", lineHeight: 1 }}>{day.ethDay}</div>
                            <div style={{ fontSize: 8, color: isSelected ? "var(--accent)" : "var(--text-muted)", lineHeight: 1 }}>{day.gregorianDate.day}/{day.gregorianDate.month}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 2, minHeight: 6 }}>
                              {day.events.slice(0, 2).map((eventItem) => (
                                <span
                                  key={eventItem.id}
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    background: getCalendarEventMeta(eventItem.category).color,
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        ) : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div
          className="right-widgets-spacer"
          style={{
            width: "clamp(300px, 21vw, 360px)",
            minWidth: 300,
            maxWidth: 360,
            flex: "0 0 clamp(300px, 21vw, 360px)",
            marginLeft: 10,
            pointerEvents: "none",
          }}
        />

        <div
          className="dashboard-widgets"
          onWheel={(event) => event.stopPropagation()}
          style={{ width: "clamp(300px, 21vw, 360px)", minWidth: 300, maxWidth: 360, flex: "0 0 clamp(300px, 21vw, 360px)", display: "flex", flexDirection: "column", gap: compactCards ? 10 : 12, alignSelf: "flex-start", height: "calc(100vh - 88px)", maxHeight: "calc(100vh - 88px)", overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", position: "fixed", top: 74, right: 14, scrollbarWidth: "thin", scrollbarColor: "transparent transparent", paddingRight: 2, paddingLeft: compactCards ? 10 : 14, paddingBottom: compactCards ? 10 : 14, marginLeft: 10, marginRight: 0, borderLeft: "none", opacity: isOverlayModalOpen ? 0.45 : 1, filter: isOverlayModalOpen ? "blur(1px)" : "none", pointerEvents: isOverlayModalOpen ? "none" : "auto", transition: "opacity 180ms ease, filter 180ms ease", zIndex: 20 }}
        >
          <div style={widgetCardStyle}>
            <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Quick Statistics</h4>
            <div style={{ display: "flex", gap: compactCards ? 8 : 10, marginTop: compactCards ? 8 : 10, alignItems: "center", justifyContent: "center", flexWrap: "nowrap" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={smallStatStyle}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Total Posts</div>
                  <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{posts.length}</div>
                </div>
                <div style={smallStatStyle}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Unread</div>
                  <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{totalUnreadMessages}</div>
                </div>
                <div style={smallStatStyle}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Notifications</div>
                  <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{totalNotifications}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={widgetCardStyle}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={rightRailIconStyle}>
                <FaBookOpen style={{ width: 14, height: 14 }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Quick Lesson Check</h4>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3 }}>
                  Open this week&apos;s lesson status and submit ready entries from here.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, ...softPanelStyle, padding: "8px 10px", fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Submitted, ready to submit, and missing lesson entries are all shown in one simple view.
            </div>

            {quickLessonFeedback.text ? (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: quickLessonFeedback.type === "error" ? "1px solid rgba(220, 38, 38, 0.18)" : "1px solid rgba(0, 122, 251, 0.16)",
                  background: quickLessonFeedback.type === "error" ? "#FFF5F5" : "#F5FAFF",
                  color: quickLessonFeedback.type === "error" ? "#B42318" : "var(--text-primary)",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {quickLessonFeedback.text}
              </div>
            ) : null}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <button type="button" style={rightRailActionButtonStyle} onClick={() => setQuickLessonCheckOpen(true)}>
                Open Quick Check
              </button>
              <button type="button" style={rightRailSecondaryButtonStyle} onClick={() => navigate("/lesson-plan")}>
                Lesson Plan Page
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: compactCards ? 8 : 10 }}>
            <div style={widgetCardStyle}>
              <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Today's Activity</h4>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", ...softPanelStyle, padding: "7px 8px", fontSize: 10 }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>New Posts</span>
                  <strong style={{ color: "var(--text-primary)" }}>{totalPostsToday}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", ...softPanelStyle, padding: "7px 8px", fontSize: 10 }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Messages</span>
                  <strong style={{ color: "var(--text-primary)" }}>{totalUnreadMessages}</strong>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>Recent Contacts</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {recentContacts.length === 0 ? (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", ...softPanelStyle, padding: "7px 8px" }}>
                      No recent chats yet
                    </div>
                  ) : (
                    recentContacts.map((contact) => {
                      return (
                        <button
                          key={contact.userId}
                          type="button"
                          onClick={() => handleOpenConversation(contact.conversation)}
                          style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", textAlign: "left", ...softPanelStyle, padding: "5px 6px", cursor: "pointer" }}
                        >
                          <ProfileAvatar
                            src={contact.profileImage || "/default-profile.png"}
                            name={contact.name}
                            alt={contact.name}
                            style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {contact.name}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {contact.lastMessage || "Open chat"}
                            </div>
                          </div>
                          {contact.unreadCount > 0 ? (
                            <div style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                              {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                            </div>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div style={{ ...rightRailCardStyle, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: compactCards ? "12px 12px 10px" : "14px 14px 12px", background: "var(--surface-panel)", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={rightRailIconStyle}>
                      <FaCalendarAlt style={{ width: 14, height: 14 }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>School Calendar</h4>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3, fontWeight: 800 }}>{calendarMonthLabel}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, fontWeight: 500 }}>
                        {`${calendarMonthStartGregorian.day}/${calendarMonthStartGregorian.month}/${calendarMonthStartGregorian.year} - ${calendarMonthEndGregorian.day}/${calendarMonthEndGregorian.month}/${calendarMonthEndGregorian.year}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(-1)}
                      style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                      aria-label="Previous month"
                      title="Previous month"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(1)}
                      style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                      aria-label="Next month"
                      title="Next month"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ ...rightRailPillStyle, color: "var(--text-primary)" }}>
                      {monthlyCalendarEvents.length} event{monthlyCalendarEvents.length === 1 ? "" : "s"}
                    </div>
                    <div style={{ ...rightRailPillStyle, color: canManageCalendar ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {canManageCalendar ? "Manage access" : "View only"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ margin: compactCards ? "10px" : "12px", background: "#F8FAFC", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 12, padding: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 6 }}>
                  {CALENDAR_WEEK_DAYS.map((day) => (
                    <div key={day} style={{ textAlign: "center", fontSize: 9, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                      {day}
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
                  {calendarDays.map((day, index) => {
                    const isToday = day?.ethDay === calendarHighlightedDay;
                    const dayOfWeek = index % 7;
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const primaryEvent = day?.events?.[0] || null;
                    const isNoClassDay = primaryEvent?.category === "no-class";
                    const isAcademicDay = primaryEvent?.category === "academic";
                    const isSelected = day?.isoDate === selectedCalendarIsoDate;
                    const isHovered = day?.isoDate === hoveredCalendarIsoDate;
                    const dayBackground = day
                      ? isToday
                        ? "var(--accent-soft)"
                        : isSelected
                          ? "color-mix(in srgb, var(--accent-soft) 72%, white 28%)"
                          : isNoClassDay
                            ? "color-mix(in srgb, var(--warning-soft) 58%, white 42%)"
                            : isAcademicDay
                              ? "color-mix(in srgb, var(--accent-soft) 46%, white 54%)"
                              : isWeekend
                                ? "color-mix(in srgb, var(--surface-muted) 82%, white 18%)"
                                : "var(--surface-panel)"
                      : "transparent";

                    return (
                      <button
                        type="button"
                        key={`${day?.ethDay || "blank"}-${index}`}
                        onClick={() => day && setSelectedCalendarIsoDate(day.isoDate)}
                        onMouseEnter={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                        onMouseLeave={() => setHoveredCalendarIsoDate("")}
                        onFocus={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                        onBlur={() => setHoveredCalendarIsoDate("")}
                        title={day?.events?.length ? day.events.map((eventItem) => eventItem.title).join(", ") : ""}
                        style={{
                          minHeight: 0,
                          aspectRatio: "1 / 1",
                          borderRadius: 10,
                          border: isToday
                            ? "1px solid var(--accent)"
                            : isSelected
                              ? "1px solid var(--accent-strong)"
                              : isHovered
                                ? "1px solid var(--border-strong)"
                                    : isNoClassDay
                                      ? "1px solid var(--warning-border)"
                                      : "1px solid var(--border-soft)",
                          background: dayBackground,
                          color: isToday ? "var(--accent-strong)" : day ? "var(--text-secondary)" : "transparent",
                          fontSize: 10,
                          fontWeight: isToday ? 800 : 700,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          padding: "5px 2px",
                          boxShadow: day && isSelected ? "0 8px 18px rgba(0, 122, 251, 0.12)" : "none",
                          cursor: day ? "pointer" : "default",
                          outline: "none",
                          transform: day && isSelected
                            ? "translateY(-2px) scale(1.03)"
                            : day && isHovered
                              ? "translateY(-1px)"
                              : "translateY(0)",
                          transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        disabled={!day}
                      >
                        {day ? (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 800, color: isToday || isSelected ? "var(--accent-strong)" : "var(--text-primary)", lineHeight: 1 }}>{day.ethDay}</div>
                            <div style={{ fontSize: 8, color: isSelected ? "var(--accent)" : "var(--text-muted)", lineHeight: 1 }}>{day.gregorianDate.day}/{day.gregorianDate.month}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 2, minHeight: 6 }}>
                              {day.events.slice(0, 2).map((eventItem) => (
                                <span
                                  key={eventItem.id}
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    background: getCalendarEventMeta(eventItem.category).color,
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        ) : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "0 12px 0", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "var(--text-secondary)", fontWeight: 800, background: "#F8FAFC", border: "1px solid rgba(220, 38, 38, 0.18)", borderRadius: 999, padding: "5px 8px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)" }} /> No class
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: "var(--text-secondary)", fontWeight: 800, background: "#F8FAFC", border: "1px solid rgba(0, 122, 251, 0.18)", borderRadius: 999, padding: "5px 8px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} /> Academic
                </div>
                {canManageCalendar ? (
                  <button
                    type="button"
                    onClick={handleOpenCalendarEventModal}
                    style={{ ...rightRailIconButtonStyle, width: 30, height: 30, borderRadius: 999, color: "var(--text-primary)" }}
                    aria-label="Add school calendar event"
                    title="Add school calendar event"
                  >
                    <FaPlus style={{ width: 12, height: 12 }} />
                  </button>
                ) : null}
              </div>

              {calendarActionMessage ? (
                <div style={{ margin: "10px 12px 0", borderRadius: 12, border: "1px solid rgba(0, 122, 251, 0.12)", background: "#F8FAFC", color: "var(--text-primary)", fontSize: 10, fontWeight: 800, padding: "8px 10px" }}>
                  {calendarActionMessage}
                </div>
              ) : null}

              {calendarErrorMessage ? (
                <div style={{ margin: "10px 12px 0", borderRadius: 12, border: "1px solid var(--danger-border)", background: "var(--warning-soft)", color: "var(--danger)", fontSize: 10, fontWeight: 800, padding: "8px 10px" }}>
                  {calendarErrorMessage}
                </div>
              ) : null}

              <div style={{ margin: "12px", background: "#F8FAFC", border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: 12, padding: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-primary)" }}>
                      {selectedCalendarDay
                        ? `${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]} ${selectedCalendarDay.ethDay}, ${calendarViewDate.year}`
                        : "Select a date"}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                      {selectedCalendarDay
                        ? `Gregorian ${selectedCalendarDay.gregorianDate.day}/${selectedCalendarDay.gregorianDate.month}/${selectedCalendarDay.gregorianDate.year}`
                        : "Choose a day to view or add calendar events."}
                    </div>
                  </div>
                  {calendarEventsLoading && (
                    <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700 }}>Loading...</div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {selectedCalendarEvents.length === 0 ? (
                    <div style={{ fontSize: 9, color: "var(--text-muted)", background: "var(--surface-muted)", borderRadius: 10, border: "1px solid var(--border-soft)", padding: "7px 9px" }}>
                      No school events on this day.
                    </div>
                  ) : (
                    selectedCalendarEvents.map((eventItem) => {
                      const eventMeta = getCalendarEventMeta(eventItem.category);

                      return (
                        <div
                          key={eventItem.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 7,
                            background: "var(--surface-panel)",
                            border: `1px solid ${eventMeta.border}`,
                            borderRadius: 10,
                            padding: "7px 8px",
                          }}
                        >
                          <span style={{ width: 8, height: 8, marginTop: 4, borderRadius: "50%", background: eventMeta.color, flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-primary)" }}>{eventItem.title}</div>
                              {eventItem.isDefault ? (
                                <span style={{ padding: "2px 6px", borderRadius: 999, background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 9, fontWeight: 800 }}>Default</span>
                              ) : null}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{eventMeta.label}</div>
                            {eventItem.notes ? (
                              <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 3 }}>{eventItem.notes}</div>
                            ) : null}
                          </div>
                          {canManageCalendar && !eventItem.isDefault ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleEditCalendarEvent(eventItem)}
                                style={{ height: 26, padding: "0 9px", borderRadius: 8, border: "1px solid var(--border-soft)", background: "var(--surface-panel)", color: "var(--text-secondary)", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCalendarEvent(eventItem)}
                                style={{ height: 26, padding: "0 9px", borderRadius: 8, border: "1px solid var(--danger-border)", background: "var(--surface-panel)", color: "var(--danger)", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {pendingDeleteEvent ? (
                <div style={{ margin: "10px 12px", padding: "10px", borderRadius: 10, border: "1px solid var(--danger-border)", background: "var(--warning-soft)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>
                    Delete {getCalendarEventMeta(pendingDeleteEvent.category).label} on{" "}
                    {pendingDeleteEvent.gregorianDate}?
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        handleConfirmedDelete(pendingDeleteEvent);
                        setPendingDeleteEvent(null);
                      }}
                      style={{ height: 28, padding: "0 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: "pointer", background: "var(--danger)", color: "#fff", border: "none" }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteEvent(null)}
                      style={{ height: 28, padding: "0 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: "pointer", background: "var(--surface-panel)", color: "var(--text-primary)", border: "1px solid var(--border-soft)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ ...widgetCardStyle, padding: compactCards ? "10px" : "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Upcoming Deadlines</h4>
                {canManageCalendar ? (
                  <button
                    type="button"
                    onClick={handleOpenDeadlineModal}
                    style={{ ...rightRailIconButtonStyle, borderRadius: 999, color: "var(--text-primary)" }}
                    aria-label="Add upcoming deadline"
                    title="Add upcoming deadline"
                  >
                    <FaPlus style={{ width: 11, height: 11 }} />
                  </button>
                ) : null}
              </div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {calendarEventsLoading ? (
                  <div style={{ padding: "8px 9px", borderRadius: 10, border: "1px solid rgba(15, 23, 42, 0.06)", background: "#F8FAFC", fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>
                    Loading deadlines...
                  </div>
                ) : upcomingDeadlineEvents.length === 0 ? (
                  <div style={{ padding: "8px 9px", borderRadius: 10, border: "1px solid rgba(15, 23, 42, 0.06)", background: "#F8FAFC", fontSize: 10, color: "var(--text-muted)" }}>
                    No upcoming deadlines in the next 30 days.
                    {canManageCalendar ? (
                      <button
                        type="button"
                        onClick={handleOpenDeadlineModal}
                        style={{ marginTop: 8, height: 28, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(15, 23, 42, 0.08)", background: "var(--surface-panel)", color: "var(--text-primary)", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
                      >
                        Add deadline
                      </button>
                    ) : null}
                  </div>
                ) : (
                  visibleUpcomingDeadlineEvents.map((eventItem) => {
                    const eventMeta = getCalendarEventMeta(eventItem.category);

                    return (
                      <div
                        key={`deadline-${eventItem.id}`}
                        style={{
                          padding: "8px 9px",
                          borderRadius: 10,
                          border: `1px solid ${eventMeta.border}`,
                          background: "#F8FAFC",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: eventMeta.color, flexShrink: 0 }} />
                            <span>{eventItem.title?.trim() || eventItem.notes?.trim() || "Academic deadline"}</span>
                          </div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>
                            {eventMeta.label}
                          </div>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {formatCalendarDeadlineDate(eventItem.gregorianDate)}
                        </div>
                      </div>
                    );
                  })
                )}
                {!calendarEventsLoading && upcomingDeadlineEvents.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllUpcomingDeadlines((currentValue) => !currentValue)}
                    style={{ alignSelf: "flex-start", height: 28, padding: "0 10px", borderRadius: 999, border: "1px solid rgba(15, 23, 42, 0.08)", background: "var(--surface-panel)", color: "var(--text-primary)", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
                  >
                    {showAllUpcomingDeadlines ? "See less" : `See more (${upcomingDeadlineEvents.length - 3})`}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ ...widgetCardStyle, padding: compactCards ? "10px" : "12px" }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>Sponsored Links</h4>
            <ul style={{ margin: "10px 0 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7, fontSize: 13 }}>
              <li style={{ ...softPanelStyle, color: "var(--text-primary)", fontWeight: 700, padding: "8px 10px" }}>Gojo Study App</li>
              <li style={{ ...softPanelStyle, color: "var(--text-primary)", fontWeight: 700, padding: "8px 10px" }}>Finance Portal</li>
              <li style={{ ...softPanelStyle, color: "var(--text-primary)", fontWeight: 700, padding: "8px 10px" }}>HR Management</li>
            </ul>
          </div>
        </div>

        <QuickLessonPlanCheckModal
          open={quickLessonCheckOpen}
          teacher={teacher}
          onClose={() => setQuickLessonCheckOpen(false)}
          flashMessage={(type, text) => setQuickLessonFeedback({ type, text })}
        />

        {showCalendarEventModal ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "color-mix(in srgb, var(--text-primary) 26%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 1200,
            }}
            onClick={handleCloseCalendarEventModal}
          >
            <div
              style={{
                width: "min(470px, 100%)",
                background: "var(--surface-panel)",
                borderRadius: 20,
                border: "1px solid var(--border-soft)",
                boxShadow: "var(--shadow-panel)",
                overflow: "hidden",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ padding: "16px 16px 12px", background: "linear-gradient(180deg, var(--surface-overlay) 0%, var(--surface-panel) 100%)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)" }}>
                    {editingCalendarEventId
                      ? "Edit school calendar event"
                      : calendarModalContext === "deadline"
                        ? "Add upcoming deadline"
                        : "Add school calendar event"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                    {selectedCalendarDay
                      ? calendarModalContext === "deadline"
                        ? `Choose the date for this upcoming deadline in ${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]}`
                        : `For Ethiopic day ${selectedCalendarDay.ethDay} in ${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]}`
                      : "Select a day in the calendar first."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseCalendarEventModal}
                  style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid var(--border-soft)", background: "var(--surface-overlay)", color: "var(--text-secondary)", fontSize: 20, lineHeight: 1, cursor: "pointer" }}
                  aria-label="Close calendar event modal"
                >
                  ×
                </button>
              </div>

              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {!canManageCalendar ? (
                  <div style={{ fontSize: 10, color: "var(--warning)", background: "var(--warning-soft)", border: "1px solid var(--warning-border)", borderRadius: 10, padding: "8px 10px" }}>
                    View only. Registrar or admin access is required to add, edit, or delete school calendar events.
                  </div>
                ) : null}

                <div style={{ border: "1px solid var(--border-soft)", borderRadius: 16, padding: 10, background: "linear-gradient(180deg, var(--surface-overlay) 0%, var(--surface-panel) 100%)", boxShadow: "inset 0 1px 0 color-mix(in srgb, white 45%, transparent), var(--shadow-soft)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-primary)" }}>Choose day from calendar</div>
                      <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 2, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{calendarMonthLabel}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleCalendarMonthChange(-1)}
                        style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid var(--border-soft)", background: "var(--surface-overlay)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16, lineHeight: 1, boxShadow: "var(--shadow-soft)" }}
                        aria-label="Previous Ethiopian month"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCalendarMonthChange(1)}
                        style={{ width: 28, height: 28, borderRadius: 9, border: "1px solid var(--border-soft)", background: "var(--surface-overlay)", color: "var(--text-primary)", cursor: "pointer", fontSize: 16, lineHeight: 1, boxShadow: "var(--shadow-soft)" }}
                        aria-label="Next Ethiopian month"
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 5 }}>
                    {CALENDAR_WEEK_DAYS.map((dayLabel) => (
                      <div key={dayLabel} style={{ textAlign: "center", fontSize: 8, fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {dayLabel}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
                    {calendarDays.map((dayItem, index) => {
                      const isSelectedDay = dayItem?.isoDate === selectedCalendarIsoDate;
                      const hasEvents = (dayItem?.events?.length || 0) > 0;
                      const isTodayDay = dayItem?.ethDay === calendarHighlightedDay;
                      const cellBackground = !dayItem
                        ? "transparent"
                        : isTodayDay
                          ? "linear-gradient(145deg, var(--accent-soft) 0%, color-mix(in srgb, var(--accent) 22%, var(--surface-overlay)) 100%)"
                          : isSelectedDay
                            ? "linear-gradient(145deg, var(--surface-overlay) 0%, var(--accent-soft) 55%, color-mix(in srgb, var(--accent) 22%, var(--surface-overlay)) 100%)"
                            : hasEvents
                              ? "linear-gradient(145deg, color-mix(in srgb, var(--warning-soft) 72%, var(--surface-panel)) 0%, var(--warning-soft) 100%)"
                              : "linear-gradient(145deg, var(--surface-panel) 0%, var(--surface-overlay) 100%)";

                      return (
                        <button
                          key={`${dayItem?.isoDate || "blank"}-${index}`}
                          type="button"
                          onClick={() => dayItem && setSelectedCalendarIsoDate(dayItem.isoDate)}
                          disabled={!dayItem || !canManageCalendar}
                          style={{
                            minHeight: 0,
                            aspectRatio: "1 / 1",
                            borderRadius: 10,
                            border: isTodayDay ? "1px solid var(--accent)" : isSelectedDay ? "1px solid var(--accent-strong)" : hasEvents ? "1px solid var(--warning-border)" : "1px solid transparent",
                            background: cellBackground,
                            color: !dayItem ? "transparent" : isSelectedDay || isTodayDay ? "var(--accent-strong)" : "var(--text-primary)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            cursor: dayItem && canManageCalendar ? "pointer" : "default",
                            boxShadow: isSelectedDay
                              ? "0 0 0 1px color-mix(in srgb, var(--accent) 24%, transparent), 0 12px 22px color-mix(in srgb, var(--accent-strong) 18%, transparent)"
                              : isTodayDay
                                ? "0 10px 18px color-mix(in srgb, var(--accent-strong) 14%, transparent)"
                                : "var(--shadow-soft)",
                            padding: "4px 2px",
                            overflow: "hidden",
                            position: "relative",
                            transform: isSelectedDay ? "translateY(-1px) scale(1.02)" : "translateY(0) scale(1)",
                            transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease",
                          }}
                        >
                          {dayItem ? (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{dayItem.ethDay}</div>
                              <div style={{ fontSize: 8, color: isSelectedDay ? "var(--accent-strong)" : "var(--text-secondary)", lineHeight: 1 }}>{dayItem.gregorianDate.day}/{dayItem.gregorianDate.month}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 2, minHeight: 6 }}>
                                {dayItem.events.slice(0, 2).map((eventItem) => (
                                  <span
                                    key={eventItem.id}
                                    style={{
                                      width: 5,
                                      height: 5,
                                      borderRadius: "50%",
                                      background: getCalendarEventMeta(eventItem.category).color,
                                      boxShadow: "0 0 0 2px color-mix(in srgb, var(--surface-panel) 82%, transparent)",
                                    }}
                                  />
                                ))}
                              </div>
                            </>
                          ) : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {calendarModalContext === "deadline" ? (
                  <div style={{ height: 42, borderRadius: 12, border: "1px solid var(--success-border)", padding: "0 12px", fontSize: 12, color: "var(--success)", background: "var(--success-soft)", display: "flex", alignItems: "center", fontWeight: 800 }}>
                    Academic deadline
                  </div>
                ) : (
                  <select
                    value={calendarEventForm.category}
                    onChange={(e) => setCalendarEventForm((prev) => ({ ...prev, category: e.target.value, subType: "general" }))}
                    disabled={!canManageCalendar}
                    style={{ height: 42, borderRadius: 12, border: "1px solid var(--input-border)", padding: "0 12px", fontSize: 12, color: "var(--text-primary)", background: "var(--input-bg)" }}
                  >
                    <option value="no-class">No class day</option>
                    <option value="academic">Academic day</option>
                  </select>
                )}

                {calendarModalContext === "deadline" ? (
                  <input
                    type="text"
                    value={calendarEventForm.title}
                    onChange={(e) => setCalendarEventForm((prev) => ({ ...prev, title: e.target.value }))}
                    disabled={!canManageCalendar}
                    placeholder="Deadline title"
                    style={{ height: 42, borderRadius: 12, border: "1px solid var(--input-border)", padding: "0 12px", fontSize: 12, color: "var(--text-primary)", background: "var(--input-bg)" }}
                  />
                ) : null}

                <textarea
                  value={calendarEventForm.notes}
                  onChange={(e) => setCalendarEventForm((prev) => ({ ...prev, notes: e.target.value }))}
                  disabled={!canManageCalendar}
                  placeholder={calendarModalContext === "deadline" ? "Optional deadline note" : "Optional note"}
                  rows={3}
                  style={{ borderRadius: 12, border: "1px solid var(--input-border)", padding: "12px", fontSize: 12, color: "var(--text-primary)", background: "var(--input-bg)", resize: "vertical" }}
                />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                  <button
                    type="button"
                    onClick={handleCreateCalendarEvent}
                    disabled={calendarEventSaving || !selectedCalendarDay || !canManageCalendar}
                    style={{
                      flex: "1 1 180px",
                      height: 42,
                      borderRadius: 12,
                      border: "none",
                      background: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? "var(--surface-strong)" : "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? "not-allowed" : "pointer",
                      boxShadow: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? "none" : "0 12px 18px color-mix(in srgb, var(--accent-strong) 18%, transparent)",
                    }}
                  >
                    {calendarEventSaving ? "Saving..." : editingCalendarEventId ? "Update calendar event" : "Save calendar event"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseCalendarEventModal}
                    style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid var(--border-soft)", background: "var(--surface-overlay)", color: "var(--text-primary)", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

      </div>

      <nav className="mobile-bottom-bar">
        <button type="button" className={mobileTab === "feed" ? "active" : ""} onClick={() => setMobileTab("feed")}>Feed</button>
        <button type="button" className={mobileTab === "calendar" ? "active" : ""} onClick={() => setMobileTab("calendar")}>Calendar</button>
        <button type="button" className={mobileTab === "messages" ? "active" : ""} onClick={() => setMobileTab("messages")}> 
          Messages
          {totalUnreadMessages > 0 && <span className="mobile-badge">{totalUnreadMessages > 99 ? "99+" : totalUnreadMessages}</span>}
        </button>
      </nav>
    </div>
  );
}
