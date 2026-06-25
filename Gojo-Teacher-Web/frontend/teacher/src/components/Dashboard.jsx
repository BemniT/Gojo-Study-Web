import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import ProfileAvatar from "./ProfileAvatar";
import { FaCalendarAlt, FaPlus } from "react-icons/fa";
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
import DashboardFeedSection from "./dashboard/DashboardFeedSection";
import DashboardQuickWidgets from "./dashboard/DashboardQuickWidgets";
import DashboardCalendarWidgets from "./dashboard/DashboardCalendarWidgets";
import DashboardCalendarEventModal from "./dashboard/DashboardCalendarEventModal";

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
          ΓÜá∩╕Å You are offline ΓÇö some data may be outdated. Changes will not be saved.
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
          <DashboardFeedSection
            mobileTab={mobileTab}
            compactCards={compactCards}
            feedSectionStyle={FEED_SECTION_STYLE}
            shellCardStyle={shellCardStyle}
            postsLoading={postsLoading}
            posts={posts}
            expandedPostIds={expandedPostIds}
            setExpandedPostIds={setExpandedPostIds}
            pendingLikePostIds={pendingLikePostIds}
            highlightedPostId={highlightedPostId}
            postRefs={postRefs}
            teacherId={teacherId}
            MESSAGE_PREVIEW_LIMIT={MESSAGE_PREVIEW_LIMIT}
            getNormalizedTargetRole={getNormalizedTargetRole}
            formatPostTimestamp={formatPostTimestamp}
            getResolvedLikeCount={getResolvedLikeCount}
            isPostLikedByActor={isPostLikedByActor}
            handleLike={handleLike}
          />

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
                      ΓÇ╣
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(1)}
                      style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                      aria-label="Next month"
                      title="Next month"
                    >
                      ΓÇ║
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
          <DashboardQuickWidgets
            compactCards={compactCards}
            widgetCardStyle={widgetCardStyle}
            softPanelStyle={softPanelStyle}
            rightRailIconStyle={rightRailIconStyle}
            rightRailActionButtonStyle={rightRailActionButtonStyle}
            rightRailSecondaryButtonStyle={rightRailSecondaryButtonStyle}
            smallStatStyle={smallStatStyle}
            totalPostsCount={posts.length}
            totalUnreadMessages={totalUnreadMessages}
            totalNotifications={totalNotifications}
            recentContacts={recentContacts}
            handleOpenConversation={handleOpenConversation}
            quickLessonFeedback={quickLessonFeedback}
            setQuickLessonCheckOpen={setQuickLessonCheckOpen}
            navigate={navigate}
          />

          <DashboardCalendarWidgets
            compactCards={compactCards}
            widgetCardStyle={widgetCardStyle}
            rightRailCardStyle={rightRailCardStyle}
            rightRailIconStyle={rightRailIconStyle}
            rightRailIconButtonStyle={rightRailIconButtonStyle}
            rightRailPillStyle={rightRailPillStyle}
            softPanelStyle={softPanelStyle}
            canManageCalendar={canManageCalendar}
            calendarMonthLabel={calendarMonthLabel}
            calendarMonthStartGregorian={calendarMonthStartGregorian}
            calendarMonthEndGregorian={calendarMonthEndGregorian}
            CALENDAR_WEEK_DAYS={CALENDAR_WEEK_DAYS}
            calendarDays={calendarDays}
            calendarHighlightedDay={calendarHighlightedDay}
            selectedCalendarIsoDate={selectedCalendarIsoDate}
            hoveredCalendarIsoDate={hoveredCalendarIsoDate}
            setSelectedCalendarIsoDate={setSelectedCalendarIsoDate}
            setHoveredCalendarIsoDate={setHoveredCalendarIsoDate}
            getCalendarEventMeta={getCalendarEventMeta}
            monthlyCalendarEvents={monthlyCalendarEvents}
            calendarActionMessage={calendarActionMessage}
            calendarErrorMessage={calendarErrorMessage}
            selectedCalendarDay={selectedCalendarDay}
            calendarViewDate={calendarViewDate}
            ETHIOPIAN_MONTHS={ETHIOPIAN_MONTHS}
            calendarEventsLoading={calendarEventsLoading}
            selectedCalendarEvents={selectedCalendarEvents}
            handleCalendarMonthChange={handleCalendarMonthChange}
            handleOpenCalendarEventModal={handleOpenCalendarEventModal}
            handleEditCalendarEvent={handleEditCalendarEvent}
            handleDeleteCalendarEvent={handleDeleteCalendarEvent}
            pendingDeleteEvent={pendingDeleteEvent}
            handleConfirmedDelete={handleConfirmedDelete}
            setPendingDeleteEvent={setPendingDeleteEvent}
            calendarModalContext={calendarModalContext}
            calendarEventForm={calendarEventForm}
            setCalendarEventForm={setCalendarEventForm}
            calendarEventSaving={calendarEventSaving}
            editingCalendarEventId={editingCalendarEventId}
            handleCreateCalendarEvent={handleCreateCalendarEvent}
            handleCloseCalendarEventModal={handleCloseCalendarEventModal}
            upcomingDeadlineEvents={upcomingDeadlineEvents}
            visibleUpcomingDeadlineEvents={visibleUpcomingDeadlineEvents}
            formatCalendarDeadlineDate={formatCalendarDeadlineDate}
            showAllUpcomingDeadlines={showAllUpcomingDeadlines}
            setShowAllUpcomingDeadlines={setShowAllUpcomingDeadlines}
            handleOpenDeadlineModal={handleOpenDeadlineModal}
          />
        </div>

        <QuickLessonPlanCheckModal
          open={quickLessonCheckOpen}
          teacher={teacher}
          onClose={() => setQuickLessonCheckOpen(false)}
          flashMessage={(type, text) => setQuickLessonFeedback({ type, text })}
        />

        <DashboardCalendarEventModal
          open={showCalendarEventModal}
          onClose={handleCloseCalendarEventModal}
          canManageCalendar={canManageCalendar}
          editingCalendarEventId={editingCalendarEventId}
          calendarModalContext={calendarModalContext}
          selectedCalendarDay={selectedCalendarDay}
          ETHIOPIAN_MONTHS={ETHIOPIAN_MONTHS}
          calendarViewDate={calendarViewDate}
          calendarMonthLabel={calendarMonthLabel}
          CALENDAR_WEEK_DAYS={CALENDAR_WEEK_DAYS}
          calendarDays={calendarDays}
          selectedCalendarIsoDate={selectedCalendarIsoDate}
          calendarHighlightedDay={calendarHighlightedDay}
          setSelectedCalendarIsoDate={setSelectedCalendarIsoDate}
          handleCalendarMonthChange={handleCalendarMonthChange}
          calendarEventForm={calendarEventForm}
          setCalendarEventForm={setCalendarEventForm}
          getCalendarEventMeta={getCalendarEventMeta}
          calendarEventSaving={calendarEventSaving}
          handleCreateCalendarEvent={handleCreateCalendarEvent}
        />

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
