import React from "react";
import { AiFillPicture, AiFillVideoCamera } from "react-icons/ai";
import ProfileAvatar from "../../ProfileAvatar";
import PostCard from "./PostCard";

const FEED_MAX_WIDTH = 760;

const FEED_SECTION_STYLE = {
  width: "100%",
  maxWidth: FEED_MAX_WIDTH,
  margin: "0 auto",
  boxSizing: "border-box",
};

const SHELL_CARD_STYLE = {
  background: "var(--surface-panel)",
  color: "var(--text-primary)",
  borderRadius: 16,
  border: "1px solid var(--border-soft)",
  boxShadow: "var(--shadow-soft)",
};

export default function PostsFeed({
  admin,
  posts,
  expandedPostDescriptions,
  togglePostDescription,
  currentLikeActorId,
  onLike,
  onOpenCreatePost,
}) {
  return (
    <div style={{ width: "100%", maxWidth: FEED_MAX_WIDTH }}>
      {/* Feed header */}
      <div className="section-header-card" style={{ ...FEED_SECTION_STYLE, margin: "0 auto 14px" }}>
        <div className="section-header-card__title" style={{ fontSize: 17 }}>
          School Updates Feed
        </div>
        <div className="section-header-card__subtitle">
          Post announcements, payment reminders, and notices.
        </div>
      </div>

      {/* Post input box */}
      <div
        className="post-box"
        style={{ ...FEED_SECTION_STYLE, ...SHELL_CARD_STYLE, margin: "0 auto 14px", borderRadius: 12, overflow: "hidden", padding: "10px 12px" }}
      >
        <div
          className="fb-post-top"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: "var(--surface-panel)",
            border: "none",
            boxShadow: "none",
            padding: 0,
          }}
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
            onClick={onOpenCreatePost}
            style={{
              flex: 1,
              height: 42,
              border: "1px solid var(--border-soft)",
              background: "var(--surface-muted)",
              borderRadius: 999,
              padding: "0 16px",
              fontSize: 14,
              textAlign: "left",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            What's on your mind?
          </button>
          <button
            type="button"
            onClick={onOpenCreatePost}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              border: "none",
              borderRadius: 8,
              background: "transparent",
              color: "var(--danger)",
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Live video"
          >
            <AiFillVideoCamera className="fb-icon" />
          </button>
          <button
            type="button"
            onClick={onOpenCreatePost}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              border: "none",
              borderRadius: 8,
              background: "transparent",
              color: "var(--success)",
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Photo"
          >
            <AiFillPicture className="fb-icon" />
          </button>
        </div>
      </div>

      {/* Posts container */}
      <div
        className="posts-container"
        style={{ ...FEED_SECTION_STYLE, display: "flex", flexDirection: "column", gap: 12 }}
      >
        {posts.length === 0 ? (
          <div style={{ ...SHELL_CARD_STYLE, borderRadius: 12, padding: "16px", fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>
            No posts available right now.
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              isExpanded={!!expandedPostDescriptions[post.postId]}
              onToggleExpand={togglePostDescription}
              currentLikeActorId={currentLikeActorId}
              onLike={onLike}
            />
          ))
        )}
      </div>
    </div>
  );
}
