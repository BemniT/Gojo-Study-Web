import React from "react";
import { FaThumbsUp } from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";
import { shouldShowPostSeeMore } from "../../../utils/postHelpers";

const SHELL_CARD_STYLE = {
  background: "var(--surface-panel)",
  color: "var(--text-primary)",
  borderRadius: 16,
  border: "1px solid var(--border-soft)",
  boxShadow: "var(--shadow-soft)",
};

const SUBTLE_BUTTON_STYLE = {
  background: "var(--surface-muted)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border-soft)",
};

export default function MyPostCard({
  post,
  admin,
  isExpanded,
  onToggleExpand,
  currentLikeActorId,
  onLike,
  isEditing,
  editedContent,
  setEditedContent,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  savingId,
  onDelete,
  deletingId,
}) {
  const canExpand = post.message ? shouldShowPostSeeMore(post.message) : false;
  const liked = !!(post.likes && post.likes[currentLikeActorId]);

  return (
    <div
      className="post-card facebook-post-card"
      id={`post-${post.postId}`}
      style={{ ...SHELL_CARD_STYLE, borderRadius: 10, overflow: "hidden" }}
    >
      <div className="post-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "12px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
          <ProfileAvatar
            className="img-circle"
            imageUrl={post.adminProfile}
            name={post.adminName || admin.name || "Register Office"}
            alt={post.adminName || admin.name || "profile"}
            size={38}
          />
          <div className="post-info" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: 15, color: "var(--text-primary)", fontWeight: 700, lineHeight: 1.2 }}>
              {post.adminName || admin.name || "Admin"}
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2, fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
              <span>{post.time}{post.edited ? " · Edited" : ""}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: "6px 10px", borderRadius: 999, background: "var(--surface-muted)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 700, flexShrink: 0, border: "1px solid var(--border-soft)" }}>
          My post
        </div>
      </div>

      {isEditing ? (
        <div style={{ padding: "0 16px 12px" }}>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            style={{ width: "100%", minHeight: 120, resize: "vertical", border: "1px solid var(--input-border)", borderRadius: 8, padding: "10px 12px", fontSize: 15, lineHeight: 1.4, outline: "none", boxSizing: "border-box", color: "var(--text-primary)", background: "var(--input-bg)" }}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={onCancelEdit}
              style={{ ...SUBTLE_BUTTON_STYLE, borderRadius: 6, height: 34, padding: "0 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={() => onSaveEdit(post.postId)}
              disabled={savingId === post.postId}
              style={{ border: "none", background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)", borderRadius: 6, height: 34, padding: "0 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {savingId === post.postId ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {post.message ? (
            <div style={{ padding: "0 16px 12px" }}>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontSize: 15,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: canExpand && !isExpanded ? "3.9em" : "none",
                  overflow: canExpand && !isExpanded ? "hidden" : "visible",
                  position: "relative",
                }}
              >
                {post.message}
              </div>
              {canExpand ? (
                <button
                  type="button"
                  onClick={() => onToggleExpand(post.postId)}
                  style={{
                    marginTop: 6,
                    border: "none",
                    background: "transparent",
                    color: "var(--accent-strong)",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  {isExpanded ? "See less" : "See more"}
                </button>
              ) : null}
            </div>
          ) : null}

          {post.postUrl && (
            <div style={{ background: "#000", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {post.isVideo ? (
                <video
                  src={post.postUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", height: "auto", maxHeight: "min(78vh, 720px)", display: "block", margin: "0 auto" }}
                />
              ) : (
                <img
                  src={post.postUrl}
                  alt="post media"
                  style={{ width: "100%", height: "auto", maxHeight: "min(78vh, 720px)", objectFit: "contain", display: "block", margin: "0 auto" }}
                />
              )}
            </div>
          )}

          <div style={{ padding: "10px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13, color: "var(--text-muted)", borderTop: "1px solid var(--border-soft)", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => onLike(post.postId)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                color: liked ? "var(--accent-strong)" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: liked ? "var(--accent-strong)" : "var(--surface-strong)", color: liked ? "#fff" : "var(--text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FaThumbsUp style={{ width: 10, height: 10 }} />
              </span>
              <span style={{ whiteSpace: "nowrap" }}>
                {post.likeCount || 0} like{(post.likeCount || 0) === 1 ? "" : "s"}
              </span>
            </button>

            <div style={{ whiteSpace: "nowrap", fontSize: 12 }}>
              {post.targetRole && post.targetRole !== "all" ? `Visible to ${post.targetRole}` : "Visible to everyone"}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginLeft: "auto" }}>
              <button
                onClick={() => onStartEdit(post.postId, post.message)}
                style={{ ...SUBTLE_BUTTON_STYLE, borderRadius: 999, height: 34, padding: "0 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(post.postId)}
                disabled={deletingId === post.postId}
                style={{ border: "none", background: "var(--danger)", borderRadius: 999, height: 34, padding: "0 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {deletingId === post.postId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
