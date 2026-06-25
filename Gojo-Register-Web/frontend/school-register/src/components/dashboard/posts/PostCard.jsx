import React from "react";
import { FaThumbsUp } from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";
import {
  MESSAGE_PREVIEW_LIMIT,
  shouldShowPostSeeMore,
  formatPostTimestamp,
  formatAudienceLabel,
  isPostLikedByActor,
  getResolvedLikeCount,
} from "../../../utils/postHelpers";

const SHELL_CARD_STYLE = {
  background: "var(--surface-panel)",
  color: "var(--text-primary)",
  borderRadius: 16,
  border: "1px solid var(--border-soft)",
  boxShadow: "var(--shadow-soft)",
};

/**
 * PostCard
 *
 * Single Facebook-style post card from the Register-Web feed. Pure
 * presentation — everything it needs comes via props.
 *
 * The page owns the expanded-descriptions map (one map drives many cards)
 * and the like handler; this card just reads its own flag + fires events.
 */
export default function PostCard({
  post,
  isExpanded,
  onToggleExpand,
  currentLikeActorId,
  onLike,
}) {
  const messageText = String(post.message || "");
  const canExpandPost = shouldShowPostSeeMore(messageText);
  const normalizedTargetRole = String(post.targetRole || "all").trim().toLowerCase();
  const audienceLabel = formatAudienceLabel(normalizedTargetRole);
  const isPublicPost = !normalizedTargetRole || normalizedTargetRole === "all";
  const targetRoleLabel = isPublicPost ? "Visible to everyone" : `Visible to ${audienceLabel}`;
  const audienceBadgeLabel = isPublicPost ? "Public update" : `${audienceLabel} update`;
  const likeCount = getResolvedLikeCount(post);
  const isLikedByRegister = isPostLikedByActor(post, currentLikeActorId);
  const postTimestamp = post.time || post.createdAt || "";
  const postTimeLabel = formatPostTimestamp(postTimestamp);
  const postTimestampTitle =
    postTimestamp && !Number.isNaN(new Date(postTimestamp).getTime())
      ? new Date(postTimestamp).toLocaleString()
      : String(postTimestamp || "");

  return (
    <div
      className="facebook-post-card"
      id={`post-${post.postId}`}
      style={{
        ...SHELL_CARD_STYLE,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08), 0 8px 20px rgba(15, 23, 42, 0.04)",
        transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
      }}
    >
      <div className="facebook-post-card__header" style={{ padding: "12px 14px 10px" }}>
        <div className="facebook-post-card__header-main">
          <div className="facebook-post-card__avatar">
            <ProfileAvatar
              className="img-circle"
              imageUrl={post.adminProfile}
              name={post.adminName || "Register Office"}
              alt={post.adminName || "Register Office"}
              size={42}
              borderRadius="50%"
            />
          </div>
          <div className="facebook-post-card__identity">
            <div className="facebook-post-card__identity-row">
              <h4>{post.adminName || "Register Office"}</h4>
              <span className="facebook-post-card__page-badge">School Page</span>
            </div>
            <div className="facebook-post-card__meta" title={postTimestampTitle || undefined}>
              <span>{postTimeLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{targetRoleLabel}</span>
            </div>
          </div>
        </div>
        <div className="facebook-post-card__type-chip">Announcement</div>
      </div>

      {messageText ? (
        <div className="facebook-post-card__body" style={{ padding: "0 14px 12px" }}>
          <div className="facebook-post-card__message">
            {canExpandPost && !isExpanded
              ? `${messageText.slice(0, MESSAGE_PREVIEW_LIMIT).trimEnd()}...`
              : messageText}
          </div>
          {canExpandPost ? (
            <button
              type="button"
              className="facebook-post-card__read-more"
              onClick={() => onToggleExpand(post.postId)}
            >
              {isExpanded ? "See less" : "Read more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {post.postUrl ? (
        <div className="facebook-post-card__media-shell">
          <img className="facebook-post-card__media" src={post.postUrl} alt="post media" />
        </div>
      ) : null}

      <div className="facebook-post-card__stats" style={{ padding: "10px 14px 8px" }}>
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

      <div className="facebook-post-card__actions" style={{ padding: "4px 10px 10px" }}>
        <button
          type="button"
          aria-pressed={isLikedByRegister}
          onClick={() => onLike(post.postId)}
          className={`facebook-post-card__action-button${isLikedByRegister ? " is-active" : ""}`}
        >
          <FaThumbsUp style={{ width: 14, height: 14 }} />
          <span>{isLikedByRegister ? "Liked" : "Like"}</span>
        </button>
      </div>
    </div>
  );
}
