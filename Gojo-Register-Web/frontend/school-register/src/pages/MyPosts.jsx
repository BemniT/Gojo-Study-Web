import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { AiFillPicture, AiFillVideoCamera } from "react-icons/ai";
import "../styles/global.css";

import { BACKEND_BASE } from "../config.js";
import useTopbarNotifications from "../hooks/useTopbarNotifications";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import usePosts from "../hooks/posts/usePosts";
import useCalendar from "../hooks/calendar/useCalendar";
import useConversations from "../hooks/chat/useConversations";
import { CALENDAR_MANAGER_ROLES } from "../utils/calendar";
import { buildRegisterTargetRoleOptions } from "../utils/registerData";

import RegisterSidebar from "../components/RegisterSidebar";
import ProfileAvatar from "../components/ProfileAvatar";
import DashboardTopBar from "../components/dashboard/layout/DashboardTopBar";
import CalendarWidget from "../components/dashboard/calendar/CalendarWidget";
import CalendarEventModal from "../components/dashboard/calendar/CalendarEventModal";
import CreatePostModal from "../components/dashboard/posts/CreatePostModal";
import MyPostCard from "../components/dashboard/posts/MyPostCard";
import MyPostsStatisticsCard from "../components/dashboard/layout/MyPostsStatisticsCard";
import TodaysActivityCard from "../components/dashboard/layout/TodaysActivityCard";

const FEED_MAX_WIDTH = "min(700px, 100%)";

const SHELL_CARD_STYLE = {
  background: "var(--surface-panel)",
  color: "var(--text-primary)",
  borderRadius: 16,
  border: "1px solid var(--border-soft)",
  boxShadow: "var(--shadow-soft)",
};

function MyPosts() {
  const API_BASE = `${BACKEND_BASE}/api`;
  const navigate = useNavigate();
  const location = useLocation();

  // ---------------- SESSION ----------------
  const { finance, admin, schoolCode, DB_ROOT } = useRegistrarSession();

  // ---------------- POSTS ----------------
  const postsApi = usePosts({
    apiBase: API_BASE,
    schoolCode,
    dbRoot: DB_ROOT,
    admin,
    finance,
  });
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
    handleSubmitCreatePost,
    handleLike,
    handlePostMediaSelection,
    handleOpenPostMediaPicker,
  } = postsApi;

  // ---------------- CALENDAR ----------------
  const currentCalendarRole = String(finance.role || "registrar").trim().toLowerCase();
  const canManageCalendar = CALENDAR_MANAGER_ROLES.has(currentCalendarRole);
  const cal = useCalendar({ schoolCode, dbRoot: DB_ROOT, admin, canManageCalendar });

  // ---------------- CONVERSATIONS ----------------
  const { recentContacts } = useConversations({
    dbRoot: DB_ROOT,
    currentUserId: finance.userId,
  });

  // ---------------- TOPBAR NOTIFICATIONS ----------------
  const {
    unreadSenders,
    setUnreadSenders,
    unreadPosts: unreadPostList,
    messageCount,
    totalNotifications,
    markMessagesAsSeen,
    markPostAsSeen,
  } = useTopbarNotifications({
    dbRoot: DB_ROOT,
    currentUserId: admin.userId,
  });

  // ---------------- PAGE STATE ----------------
  const [showPostDropdown, setShowPostDropdown] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [expandedPostDescriptions, setExpandedPostDescriptions] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isOverlayModalOpen = showCreatePostModal || cal.showCalendarEventModal;
  const adminId = admin?.adminId || admin?.userId || null;
  const token = admin?.token || null;

  // Filter to MY posts only. Guard against empty IDs — otherwise a post with
  // a missing field would match the current admin's missing field and leak in.
  const myUserId = admin?.userId || "";
  const myAdminId = admin?.adminId || "";
  const isMyPost = (p) =>
    (!!myUserId && p.userId === myUserId) ||
    (!!myAdminId && p.adminId === myAdminId) ||
    (!!myAdminId && p.financeId === myAdminId);
  const myPosts = posts.filter(isMyPost);
  const mediaPostCount = myPosts.filter((p) => Boolean(p.postUrl)).length;
  const totalPostLikes = myPosts.reduce((sum, p) => sum + Number(p.likeCount || 0), 0);

  // Sync target role options
  useEffect(() => {
    const nextRoles = buildRegisterTargetRoleOptions();
    setTargetOptions(nextRoles);
    setTargetRole((prev) => (nextRoles.includes(prev) ? prev : "all"));
  }, [finance.userId, setTargetOptions, setTargetRole]);

  // Scroll to a specific post when navigated with state
  const postIdToScroll = location.state?.postId;
  useEffect(() => {
    if (!postIdToScroll) return;
    const el = document.getElementById(`post-${postIdToScroll}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.backgroundColor = "color-mix(in srgb, var(--warning-soft) 72%, var(--surface-panel))";
      setTimeout(() => (el.style.backgroundColor = ""), 2000);
    }
  }, [postIdToScroll]);

  const togglePostDescription = (postId) => {
    setExpandedPostDescriptions((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  // Open post from notification (mark seen + scroll)
  const openPostFromNotif = async (post) => {
    setShowPostDropdown(false);
    try {
      await markPostAsSeen(post.postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.postId === post.postId
            ? { ...p, seenBy: { ...(p.seenBy || {}), [admin.userId]: true } }
            : p
        )
      );
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

  // ---------------- EDIT / SAVE / DELETE (Firebase-first, backend fallback) ----------------
  const startEdit = (postId, currentContent) => {
    setEditingPostId(postId);
    setEditedContent(currentContent || "");
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditedContent("");
  };

  const saveEdit = async (postId) => {
    if (!postId || !adminId) return;
    const targetPost = posts.find((p) => p.postId === postId);
    if (!targetPost || !isMyPost(targetPost)) {
      alert("You can only edit posts you authored.");
      cancelEdit();
      return;
    }
    const trimmed = (editedContent || "").trim();
    if (trimmed.length === 0) {
      alert("Post content cannot be empty.");
      return;
    }
    setSavingId(postId);

    try {
      const payload = {
        message: trimmed,
        edited: true,
        editedAt: new Date().toISOString(),
        lastEditedBy: adminId,
      };
      await axios.patch(`${DB_ROOT}/Posts/${encodeURIComponent(postId)}.json`, payload);
      setPosts((prev) =>
        prev.map((post) =>
          post.postId === postId ? { ...post, message: trimmed, edited: true } : post
        )
      );
      cancelEdit();
      setSavingId(null);
      return;
    } catch (_) {
      // fall through to backend
    }

    try {
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["x-access-token"] = token;
      }
      const res = await axios.post(
        `${API_BASE}/edit_post/${postId}`,
        { adminId, postText: trimmed, message: trimmed },
        { headers }
      );
      if (res.data && res.data.success === false) {
        throw new Error(res.data.message || "Edit failed on backend");
      }
      setPosts((prev) =>
        prev.map((post) =>
          post.postId === postId ? { ...post, message: trimmed, edited: true } : post
        )
      );
      cancelEdit();
    } catch (err) {
      console.error("[EDIT] Final error:", err.response?.status, err.response?.data || err.message || err);
      alert("Edit failed: " + (err.response?.data?.message || err.message || "See console"));
    } finally {
      setSavingId(null);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!postId || !adminId) return;
    const targetPost = posts.find((p) => p.postId === postId);
    if (!targetPost || !isMyPost(targetPost)) {
      alert("You can only delete posts you authored.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setDeletingId(postId);

    try {
      await axios.delete(`${DB_ROOT}/Posts/${encodeURIComponent(postId)}.json`);
      setPosts((prev) => prev.filter((p) => p.postId !== postId));
      setDeletingId(null);
      return;
    } catch (_) {
      // fall through to backend
    }

    try {
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["x-access-token"] = token;
      }
      const res = await axios.post(`${API_BASE}/delete_post/${postId}`, { adminId }, { headers });
      if (res.data && res.data.success === false) {
        throw new Error(res.data.message || "Delete failed on backend");
      }
      setPosts((prev) => prev.filter((p) => p.postId !== postId));
    } catch (err) {
      console.error("[DELETE] Final error:", err.response?.status, err.response?.data || err.message || err);
      alert("Delete failed: " + (err.response?.data?.message || err.message || "See console"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="dashboard-page" style={{ background: "var(--page-bg)", minHeight: "100vh" }}>
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

      <div className="google-dashboard" style={{ display: "flex", gap: 16, padding: "18px 16px", minHeight: "100vh", background: "var(--page-bg)", width: "100%", boxSizing: "border-box" }}>
        <RegisterSidebar
          user={admin}
          sticky
          fullHeight
          dimmed={isOverlayModalOpen}
          style={{ width: "clamp(220px, 15vw, 280px)", minWidth: 220, top: 24 }}
        />

        {/* ---------------- MAIN CONTENT ---------------- */}
        <div
          className="main-content google-main"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            margin: 0,
            boxSizing: "border-box",
            alignSelf: "flex-start",
            height: "calc(100vh - 24px)",
            overflowY: "auto",
            position: "sticky",
            top: 24,
            scrollbarWidth: "thin",
            scrollbarColor: "transparent transparent",
            padding: "0 2px",
            opacity: isOverlayModalOpen ? 0.45 : 1,
            filter: isOverlayModalOpen ? "blur(1px)" : "none",
            pointerEvents: isOverlayModalOpen ? "none" : "auto",
            transition: "opacity 180ms ease, filter 180ms ease",
          }}
        >
          {/* Page header */}
          <div
            style={{
              ...SHELL_CARD_STYLE,
              maxWidth: FEED_MAX_WIDTH,
              margin: "0 auto 14px",
              padding: "14px 16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, var(--accent), var(--accent-strong), color-mix(in srgb, var(--accent) 68%, white))" }} />
            <div style={{ fontSize: 17, fontWeight: 800 }}>My Posts</div>
            <div style={{ marginTop: 5, fontSize: 12, color: "var(--text-secondary)" }}>
              Manage, edit, and review your announcements.
            </div>
          </div>

          {/* Post input box */}
          <div
            className="post-box"
            style={{ ...SHELL_CARD_STYLE, maxWidth: FEED_MAX_WIDTH, margin: "0 auto 14px", borderRadius: 12, overflow: "hidden", padding: "10px 12px" }}
          >
            <div
              className="fb-post-top"
              style={{ display: "flex", gap: 10, alignItems: "center", background: "transparent", border: "none", boxShadow: "none", padding: 0 }}
            >
              <ProfileAvatar
                className="img-circle"
                imageUrl={admin.profileImage}
                name={admin.name || "Register Office"}
                alt={admin.name || "profile"}
                size={38}
              />
              <button
                type="button"
                onClick={() => setShowCreatePostModal(true)}
                style={{ flex: 1, height: 42, border: "1px solid var(--border-soft)", background: "var(--surface-muted)", borderRadius: 999, padding: "0 16px", fontSize: 14, textAlign: "left", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                What's on your mind?
              </button>
              <button
                type="button"
                onClick={() => setShowCreatePostModal(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "none", borderRadius: 8, background: "transparent", color: "var(--danger)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
                title="Live video"
              >
                <AiFillVideoCamera className="fb-icon" />
              </button>
              <button
                type="button"
                onClick={() => setShowCreatePostModal(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, border: "none", borderRadius: 8, background: "transparent", color: "var(--success)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
                title="Photo"
              >
                <AiFillPicture className="fb-icon" />
              </button>
            </div>
          </div>

          {/* Posts container */}
          {myPosts.length === 0 ? (
            <div style={{ ...SHELL_CARD_STYLE, maxWidth: FEED_MAX_WIDTH, margin: "0 auto", borderRadius: 10, padding: 18, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
              You have no posts yet.
            </div>
          ) : (
            <div className="posts-container" style={{ maxWidth: FEED_MAX_WIDTH, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {myPosts.map((post) => (
                <MyPostCard
                  key={post.postId}
                  post={post}
                  admin={admin}
                  isExpanded={!!expandedPostDescriptions[post.postId]}
                  onToggleExpand={togglePostDescription}
                  currentLikeActorId={currentLikeActorId}
                  onLike={handleLike}
                  isEditing={editingPostId === post.postId}
                  editedContent={editedContent}
                  setEditedContent={setEditedContent}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  savingId={savingId}
                  onDelete={handleDeletePost}
                  deletingId={deletingId}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---------------- RIGHT WIDGETS COLUMN ---------------- */}
        <div
          className="dashboard-widgets"
          style={{
            width: "clamp(300px, 21vw, 360px)",
            minWidth: 300,
            maxWidth: 360,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignSelf: "flex-start",
            height: "calc(100vh - 24px)",
            overflowY: "auto",
            position: "sticky",
            top: 24,
            scrollbarWidth: "thin",
            scrollbarColor: "transparent transparent",
            paddingRight: 2,
            marginLeft: "auto",
            marginRight: 0,
            opacity: isOverlayModalOpen ? 0.45 : 1,
            filter: isOverlayModalOpen ? "blur(1px)" : "none",
            pointerEvents: isOverlayModalOpen ? "none" : "auto",
            transition: "opacity 180ms ease, filter 180ms ease",
          }}
        >
          <MyPostsStatisticsCard
            postsCount={myPosts.length}
            mediaPostCount={mediaPostCount}
            totalPostLikes={totalPostLikes}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <TodaysActivityCard
              posts={myPosts}
              messageCount={messageCount}
              recentContacts={recentContacts}
            />
            <CalendarWidget cal={cal} canManageCalendar={canManageCalendar} />
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

export default MyPosts;
