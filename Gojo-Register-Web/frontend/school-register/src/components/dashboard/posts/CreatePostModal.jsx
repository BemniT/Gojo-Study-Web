import React from "react";
import { AiFillPicture, AiFillVideoCamera } from "react-icons/ai";
import ProfileAvatar from "../../ProfileAvatar";
import { formatFileSize } from "../../../utils/postMedia";

export default function CreatePostModal({
  open,
  onClose,
  admin,
  targetRole,
  setTargetRole,
  targetOptions,
  postText,
  setPostText,
  postMedia,
  setPostMedia,
  postMediaMeta,
  setPostMediaMeta,
  isOptimizingMedia,
  fileInputRef,
  handlePostMediaSelection,
  handleOpenPostMediaPicker,
  handleSubmitCreatePost,
  canSubmitPost,
}) {
  if (!open) return null;

  const isVideo = !!(postMedia && String(postMedia.type || "").startsWith("video/"));

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.18)", backdropFilter: "blur(10px)", zIndex: 1200 }}
      />
      <div style={{ position: "fixed", inset: 0, zIndex: 1201, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, pointerEvents: "none" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "min(640px, 100%)", maxHeight: "90vh", overflowY: "auto", background: "var(--surface-panel)", borderRadius: 28, border: "1px solid var(--border-soft)", boxShadow: "none", pointerEvents: "auto", position: "relative" }}>
          <div style={{ position: "relative", padding: "22px 24px 18px", borderBottom: "1px solid var(--border-soft)", background: "var(--surface-panel)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 52 }}>
              <div style={{ display: "inline-flex", alignItems: "center", width: "fit-content", height: 28, padding: "0 12px", borderRadius: 999, background: "var(--accent-soft)", border: "1px solid var(--border-strong)", color: "var(--accent-strong)", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                School Announcement
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                Create a new post
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 420 }}>
                Share polished announcements, reminders, and updates with the right audience.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ position: "absolute", right: 18, top: 18, border: "1px solid var(--border-soft)", background: "var(--surface-panel)", width: 40, height: 40, borderRadius: "50%", fontSize: 22, color: "var(--text-secondary)", cursor: "pointer", lineHeight: 1 }}
              aria-label="Close create post modal"
              title="Close"
            >
              ×
            </button>
          </div>

          <div style={{ padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", padding: "14px 16px", borderRadius: 20, border: "1px solid var(--border-soft)", background: "var(--surface-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ borderRadius: "50%", boxShadow: "var(--shadow-glow)", flexShrink: 0 }}>
                  <ProfileAvatar
                    className="img-circle"
                    imageUrl={admin.profileImage}
                    name={admin.name || "Register Office"}
                    alt={admin.name || "profile"}
                    size={48}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{admin.name || "Register Office"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Posting from the register dashboard</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 170 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Audience
                </div>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  style={{ height: 40, borderRadius: 12, border: "1px solid var(--input-border)", background: "var(--input-bg)", fontSize: 13, fontWeight: 700, color: "var(--text-primary)", padding: "0 36px 0 12px", minWidth: 170, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)" }}
                  title="Post target role"
                >
                  {targetOptions.map((role) => {
                    const label = role === "all" ? "All Users" : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`;
                    return <option key={role} value={role}>{label}</option>;
                  })}
                </select>
              </div>
            </div>

            <div style={{ border: "1px solid var(--border-soft)", borderRadius: 24, background: "var(--surface-panel)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px 12px", borderBottom: "1px solid color-mix(in srgb, var(--border-soft) 80%, transparent 20%)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Post message</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{postText.trim().length} characters</div>
              </div>

              <textarea
                placeholder="Write a clear announcement for your school community..."
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                style={{ minHeight: 220, resize: "vertical", border: "none", background: "transparent", borderRadius: 0, padding: "18px 18px 16px", fontSize: 19, lineHeight: 1.6, outline: "none", color: "var(--text-primary)", width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ border: "1px solid var(--border-soft)", borderRadius: 20, padding: "14px 16px", background: "var(--surface-panel)" }}>
              <div className="fb-post-bottom" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ marginRight: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Media and attachments</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Add a photo or video to make the update stand out.</div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handlePostMediaSelection}
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                />

                <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "16px 18px", background: "linear-gradient(180deg, var(--surface-muted) 0%, #ffffff 100%)", borderRadius: 18, border: "1px dashed var(--border-strong)", boxSizing: "border-box", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 260px" }}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "var(--accent-soft)", border: "1px solid var(--border-strong)", color: "var(--accent-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {isVideo ? <AiFillVideoCamera /> : <AiFillPicture />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                        {postMedia ? "Media ready to attach" : "Choose a photo or video"}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
                        {isOptimizingMedia
                          ? "Optimizing your image before upload."
                          : "Images are automatically compressed and converted to JPEG when that reduces size."}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginLeft: "auto" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 999, border: "1px solid var(--border-soft)", background: "var(--surface-panel)", color: "var(--text-secondary)", fontSize: 11, fontWeight: 800, letterSpacing: "0.02em" }}>
                      <AiFillVideoCamera style={{ color: "var(--danger)", fontSize: 15 }} />
                      Photos and videos
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenPostMediaPicker}
                      disabled={isOptimizingMedia}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 42, padding: "0 18px", borderRadius: 999, background: isOptimizingMedia ? "var(--surface-strong)" : "var(--accent)", border: "none", cursor: isOptimizingMedia ? "progress" : "pointer", color: "#fff", fontSize: 13, fontWeight: 800, opacity: isOptimizingMedia ? 0.86 : 1, minWidth: 138 }}
                    >
                      <AiFillPicture style={{ fontSize: 17 }} />
                      <span>{isOptimizingMedia ? "Optimizing..." : postMedia ? "Change file" : "Choose file"}</span>
                    </button>
                  </div>
                </div>

                {postMedia ? (
                  <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface-muted)", borderRadius: 16, border: "1px solid var(--border-soft)", boxSizing: "border-box" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: isVideo ? "var(--warning-soft)" : "var(--success-soft)", color: isVideo ? "var(--danger)" : "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isVideo ? <AiFillVideoCamera style={{ fontSize: 20 }} /> : <AiFillPicture style={{ fontSize: 20 }} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{postMedia.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {postMediaMeta?.wasCompressed
                          ? `Optimized from ${formatFileSize(postMediaMeta.originalSize)} to ${formatFileSize(postMediaMeta.finalSize)}${postMediaMeta.wasConvertedToJpeg ? " as JPEG" : ""}`
                          : `Ready to attach to this post${postMediaMeta?.wasConvertedToJpeg ? " as JPEG" : ""}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPostMedia(null);
                        setPostMediaMeta(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      style={{ background: "var(--surface-panel)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0 }}
                      aria-label="Remove selected media"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", paddingTop: 2 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Your post will appear in the register feed immediately after publishing.
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ height: 44, padding: "0 18px", borderRadius: 999, border: "1px solid var(--border-soft)", background: "var(--surface-panel)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitCreatePost}
                  disabled={!canSubmitPost}
                  style={{ minWidth: 160, height: 46, border: "none", background: canSubmitPost ? "var(--accent)" : "var(--surface-strong)", borderRadius: 999, color: canSubmitPost ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 800, letterSpacing: "0.01em", cursor: canSubmitPost ? "pointer" : "not-allowed", boxShadow: canSubmitPost ? "0 8px 18px rgba(0, 122, 251, 0.14)" : "none" }}
                >
                  {isOptimizingMedia ? "Optimizing..." : "Publish post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
