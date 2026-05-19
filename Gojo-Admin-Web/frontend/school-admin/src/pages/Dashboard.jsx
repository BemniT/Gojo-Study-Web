import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminSession } from '../hooks/useAdminSession';
import { usePosts } from '../hooks/usePosts';
import { useConversations } from '../hooks/useConversations';
import { useCalendar } from '../hooks/useCalendar';
import { useClickOutside } from '../hooks/useClickOutside';
import EditPostModal from '../components/EditPostModal';
import ProfileAvatar from '../components/ProfileAvatar';
import styles from '../styles/Dashboard.module.css';
import { useEffect } from "react";
export function useClickOutside(ref, callback) {
  useEffect(() => {
    if (!ref || !callback) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback(e);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, callback]);
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, loadingAdmin, hasSession } = useAdminSession();
  const {
    posts,
    fetchPosts,
    handleLike,
    handleDelete,
    editPost,
    likePendingPostIds,
    expandedPostDescriptions,
    togglePostDescription,
    shouldShowPostsLoadingState,
    currentLikeActorId,
    getSafeMediaUrl,
    MESSAGE_PREVIEW_LIMIT,
    formatAudienceLabel,
    likeCountForPost,
    isPostLikedByActor,
    shouldShowPostSeeMore,
  } = usePosts({
    adminUserId: admin?.userId || admin?.adminId || '',
    schoolScopeCode: admin?.schoolCode || '',
    schoolCode: admin?.schoolCode || '',
  });
  const {
    conversations,
    unreadMessages,
    fetchConversations,
    handleOpenConversation,
  } = useConversations({
    adminUserId: admin.userId || admin.adminId || '',
    schoolScopeCode: admin.schoolCode || '',
    schoolCode: admin.schoolCode || '',
  });
  useCalendar({
    schoolScopeCode: admin?.schoolCode || '',
    dbUrl: '', // Provide actual dbUrl if available
    adminRole: admin?.role || 'admin',
  });
  useClickOutside(/* refs and handlers as needed */);

  // --- State for editing posts ---
  const [editingPost, setEditingPost] = useState(null);
  // --- State for confirm dialog and edit modal ---
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const [editPostModal, setEditPostModal] = useState(null); // { postId, currentText }
  // --- State for highlighting posts ---
  const [highlightedPostId, setHighlightedPostId] = useState('');

  // --- Scroll to post if needed ---
  const postIdToScroll = location.state?.postIdToScroll || '';
  useEffect(() => {
    if (postIdToScroll) {
      setHighlightedPostId(postIdToScroll);
      setTimeout(() => setHighlightedPostId(''), 1500);
    }
  }, [postIdToScroll]);

  // --- Compute unread messages from conversations ---
  const totalUnreadMessages = conversations.reduce(
    (sum, c) => sum + (Number(c.unreadForMe) || 0),
    0
  );
  const messageCount = totalUnreadMessages;

  // --- Handle open post from notification ---
  const openPostFromNotif = (postId) => {
    setHighlightedPostId(postId);
    setTimeout(() => setHighlightedPostId(''), 1500);
    // Optionally scroll into view if needed
    const el = document.getElementById(`post-${postId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // --- Render ---
  return (
    <div className={styles['dashboard-page']}>
      <div className={styles['dashboard-layout']}>
        <div className={styles['posts-container']}>
          {shouldShowPostsLoadingState ? (
            <div className={styles['shell-card'] + ' ' + styles['muted-center']}>
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className={styles['shell-card'] + ' ' + styles['muted-center']}>
              No posts available right now.
            </div>
          ) : (
            posts.map((post) => {
              const isHighlighted = highlightedPostId === post.postId;
              return (
                <div
                  className={
                    styles['facebook-post-card'] +
                    (isHighlighted ? ' ' + styles['postHighlighted'] : '')
                  }
                  id={`post-${post.postId}`}
                  key={post.postId}
                >
                  <div className={styles['facebook-post-card__header']}>
                    <div className={styles['facebook-post-card__header-main']}>
                      <div className={styles['facebook-post-card__avatar']}>
                        <ProfileAvatar
                          src={post.adminProfile}
                          name={post.adminName || 'Admin'}
                          alt={post.adminName || 'Admin'}
                        />
                      </div>
                      <div className={styles['facebook-post-card__identity']}>
                        <div className={styles['facebook-post-card__identity-row']}>
                          <h4>{post.adminName || 'Admin'}</h4>
                          <span className={styles['facebook-post-card__page-badge']}>
                            School Page
                          </span>
                        </div>
                        <div className={styles['facebook-post-card__meta']}>
                          <span>{post.time}</span>
                          <span aria-hidden="true">·</span>
                          <span>{post.targetRole}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles['facebook-post-card__type-chip']}>
                      Announcement
                    </div>
                  </div>
                  <div className={styles['facebook-post-card__body']}>
                    <div className={styles['facebook-post-card__message']}>
                      {post.message}
                    </div>
                  </div>
                  <div className={styles['facebook-post-card__actions']}>
                    <button
                      type="button"
                      aria-pressed={isPostLikedByActor(post, currentLikeActorId)}
                      onClick={() => handleLike(post.postId)}
                      disabled={!!likePendingPostIds[post.postId]}
                      className={
                        styles['facebook-post-card__action-button'] +
                        (isPostLikedByActor(post, currentLikeActorId)
                          ? ' ' + styles['is-active']
                          : '')
                      }
                    >
                      Like
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPost({ id: post.postId, text: post.message })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        handleDelete(post.postId);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className={styles['right-widgets-spacer']} />
        <div className={styles['dashboard-widgets']}>
          {/* ...widgets and calendar, etc. can be rendered here using hooks... */}
        </div>
      </div>
      <EditPostModal
        isOpen={!!editingPost}
        initialText={editingPost?.text}
        onConfirm={async (newText) => {
          await editPost(editingPost.id, newText);
          setEditingPost(null);
        }}
        onCancel={() => setEditingPost(null)}
      />

      {/* Confirm Dialog Modal */}
      {confirmDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <p style={{ margin: "0 0 20px", fontSize: 15, color: "#0f172a" }}>{confirmDialog.message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setConfirmDialog(null)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editPostModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, color: "#0f172a" }}>Edit Post</h3>
            <textarea
              style={{ width: "100%", minHeight: 80, marginBottom: 16, borderRadius: 8, border: "1px solid #e2e8f0", padding: 10, fontSize: 15 }}
              value={editPostModal.currentText}
              onChange={e => setEditPostModal({ ...editPostModal, currentText: e.target.value })}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditPostModal(null)} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer" }}>Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  await editPost(editPostModal.postId, editPostModal.currentText);
                  setEditPostModal(null);
                }}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
