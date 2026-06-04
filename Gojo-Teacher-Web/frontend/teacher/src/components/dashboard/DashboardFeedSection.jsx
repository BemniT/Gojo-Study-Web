import React from "react";
import ProfileAvatar from "../ProfileAvatar";
import { FaHeart, FaRegHeart, FaThumbsUp } from "react-icons/fa";

function DashboardFeedSection({
  mobileTab,
  compactCards,
  feedSectionStyle,
  shellCardStyle,
  postsLoading,
  posts,
  expandedPostIds,
  setExpandedPostIds,
  pendingLikePostIds,
  highlightedPostId,
  postRefs,
  teacherId,
  MESSAGE_PREVIEW_LIMIT,
  getNormalizedTargetRole,
  formatPostTimestamp,
  getResolvedLikeCount,
  isPostLikedByActor,
  handleLike,
}) {
  return (
    <div style={{ display: mobileTab === "feed" ? "flex" : "none", justifyContent: "center", width: "100%" }}>
      <div style={{ width: "100%", maxWidth: feedSectionStyle.maxWidth }}>
        <div className="section-header-card" style={{ ...feedSectionStyle, margin: compactCards ? "0 auto 10px" : "0 auto 14px" }}>
          <div className="section-header-card__title" style={{ fontSize: 17 }}>School Updates Feed</div>
          <div className="section-header-card__subtitle">Post announcements, payment reminders, and notices.</div>
        </div>

        <div className="posts-container" style={{ ...feedSectionStyle, display: "flex", flexDirection: "column", gap: compactCards ? 8 : 12 }}>
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
          ) : (
            posts.map((post) => {
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
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardFeedSection;
