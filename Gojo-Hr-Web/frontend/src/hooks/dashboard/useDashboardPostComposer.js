import { useCallback, useState } from 'react';
import api from '../../api';
import { POST_IMAGE_PREVIEW_MAX_BYTES, POST_IMAGE_PREVIEW_MAX_DIMENSION } from '../../utils/dashboardConstants';
import {
  getPostFullMediaUrl,
  getSafeProfileImage,
  isLikelyVideoMedia,
  normalizePostRecord,
} from '../../utils/dashboardPosts';
import { compressPostImageToJpeg } from '../../utils/postImageCompress';

const TARGET_OPTIONS = ['all', 'teacher', 'school_admins', 'finance', 'hr'];

/**
 * Owns the Dashboard post composer:
 *   - composer state (text, media, target role, modal open, edit mode)
 *   - delete modal state
 *   - expanded image lightbox state
 *   - image compression pipeline (full + preview variants)
 *   - create / edit / delete API calls
 *   - post-ownership predicate for "show edit/delete" gating
 *
 * Inputs come from useHrSession (admin, ids) and useDashboardPosts
 * (upsert + cache helpers). Returns a flat surface the JSX wires up.
 */
export default function useDashboardPostComposer({
  admin,
  postOwnerId,
  currentLikeActorId,
  fileInputRef,
  upsertPostInState,
  setPosts,
  cachePostsFeed,
  postsCursor,
  hasMorePosts,
}) {
  // composer fields
  const [postText, setPostText] = useState('');
  const [postMedia, setPostMedia] = useState(null);
  const [postMediaPreviewFile, setPostMediaPreviewFile] = useState(null);
  const [postMediaMeta, setPostMediaMeta] = useState(null);
  const [isOptimizingMedia, setIsOptimizingMedia] = useState(false);
  const [isPostSubmitting, setIsPostSubmitting] = useState(false);
  const [targetRole, setTargetRole] = useState('all');

  // modal/editing state
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [editingPostId, setEditingPostId] = useState('');
  const [existingPostMediaUrl, setExistingPostMediaUrl] = useState('');
  const [existingPostPreviewUrl, setExistingPostPreviewUrl] = useState('');
  const [existingPostMediaType, setExistingPostMediaType] = useState('');

  // delete + lightbox
  const [showDeletePostModal, setShowDeletePostModal] = useState(false);
  const [pendingDeletePost, setPendingDeletePost] = useState(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [expandedPostImage, setExpandedPostImage] = useState(null);

  const canSubmitPost = Boolean(postText.trim() || postMedia || existingPostMediaUrl) && !isOptimizingMedia;
  const isPostComposerEditing = Boolean(editingPostId);

  // ----- Ownership predicate --------------------------------------------
  const isPostOwnedByCurrentUser = useCallback((post) => {
    if (!post) return false;
    const ownerCandidates = [post.adminId, post.userId, post.hrId, post.ownerId].filter(Boolean).map((value) => String(value));
    const actorCandidates = [postOwnerId, currentLikeActorId, admin?.adminId, admin?.hrId, admin?.id, admin?.userId].filter(Boolean).map((value) => String(value));
    return ownerCandidates.some((ownerValue) => actorCandidates.includes(ownerValue));
  }, [admin, currentLikeActorId, postOwnerId]);

  // ----- Composer state reset -------------------------------------------
  const resetPostComposerState = useCallback(() => {
    setEditingPostId('');
    setPostText('');
    setPostMedia(null);
    setPostMediaPreviewFile(null);
    setPostMediaMeta(null);
    setExistingPostMediaUrl('');
    setExistingPostPreviewUrl('');
    setExistingPostMediaType('');
    setTargetRole('all');
    if (fileInputRef?.current) fileInputRef.current.value = '';
  }, [fileInputRef]);

  const openCreatePostModal = useCallback(() => {
    resetPostComposerState();
    setShowCreatePostModal(true);
  }, [resetPostComposerState]);

  const closePostComposerModal = useCallback(() => {
    if (isPostSubmitting) return;
    setShowCreatePostModal(false);
    resetPostComposerState();
  }, [isPostSubmitting, resetPostComposerState]);

  const handleStartEditPost = useCallback((post) => {
    if (!post) return;
    const nextTargetRole = String(post.targetRole || 'all').trim().toLowerCase();
    setEditingPostId(String(post.postId || ''));
    setPostText(String(post.message || ''));
    setPostMedia(null);
    setPostMediaPreviewFile(null);
    setPostMediaMeta(null);
    setExistingPostMediaUrl(String(post.postUrl || ''));
    setExistingPostPreviewUrl(String(post.postPreviewUrl || post.postUrl || ''));
    setExistingPostMediaType(String(post.mediaType || ''));
    setTargetRole(TARGET_OPTIONS.includes(nextTargetRole) ? nextTargetRole : 'all');
    if (fileInputRef?.current) fileInputRef.current.value = '';
    setShowCreatePostModal(true);
  }, [fileInputRef]);

  // ----- Delete modal ----------------------------------------------------
  const handleCloseDeletePostModal = useCallback(() => {
    if (isDeletingPost) return;
    setPendingDeletePost(null);
    setShowDeletePostModal(false);
  }, [isDeletingPost]);

  const handleRequestDeletePost = useCallback((post) => {
    if (!post || !isPostOwnedByCurrentUser(post)) return;
    setPendingDeletePost(post);
    setShowDeletePostModal(true);
  }, [isPostOwnedByCurrentUser]);

  // ----- Expanded image lightbox ----------------------------------------
  const openExpandedPostImage = useCallback((post) => {
    const fullImageUrl = getPostFullMediaUrl(post);
    if (!fullImageUrl || isLikelyVideoMedia(post?.mediaType, fullImageUrl)) return;
    setExpandedPostImage({
      src: fullImageUrl,
      alt: `${post?.adminName || 'HR Office'} post image`,
    });
  }, []);

  const closeExpandedPostImage = useCallback(() => setExpandedPostImage(null), []);

  // ----- Media picker ----------------------------------------------------
  const handlePostMediaSelection = useCallback(async (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      setPostMedia(null);
      setPostMediaPreviewFile(null);
      setPostMediaMeta(null);
      return;
    }

    setIsOptimizingMedia(true);

    try {
      const optimizedResult = await compressPostImageToJpeg(file, { nameSuffix: 'full' });
      const isImageMedia = String(file.type || '').startsWith('image/') && file.type !== 'image/svg+xml';
      const previewResult = isImageMedia
        ? await compressPostImageToJpeg(file, {
            maxDimension: POST_IMAGE_PREVIEW_MAX_DIMENSION,
            maxBytes: POST_IMAGE_PREVIEW_MAX_BYTES,
            nameSuffix: 'preview',
          })
        : null;

      setPostMedia(optimizedResult.file);
      setPostMediaPreviewFile(previewResult?.file || null);
      setPostMediaMeta({
        originalSize: optimizedResult.originalSize,
        finalSize: optimizedResult.finalSize,
        wasCompressed: optimizedResult.wasCompressed,
        wasConvertedToJpeg: optimizedResult.wasConvertedToJpeg,
        previewFinalSize: Number(previewResult?.finalSize || 0),
        hasPreviewVariant: Boolean(previewResult?.file),
      });
    } catch (error) {
      console.error('Failed to optimize media:', error);
      setPostMedia(file);
      setPostMediaPreviewFile(null);
      setPostMediaMeta({
        originalSize: Number(file.size || 0),
        finalSize: Number(file.size || 0),
        wasCompressed: false,
        wasConvertedToJpeg: false,
        previewFinalSize: 0,
        hasPreviewVariant: false,
      });
    } finally {
      setIsOptimizingMedia(false);
    }
  }, []);

  const handleOpenPostMediaPicker = useCallback(() => {
    if (isOptimizingMedia) return;
    fileInputRef?.current?.click();
  }, [fileInputRef, isOptimizingMedia]);

  // ----- Submit (create or update) --------------------------------------
  const handlePost = useCallback(async () => {
    if (!canSubmitPost || isPostSubmitting) return null;
    if (!postOwnerId) {
      alert('Session expired');
      return null;
    }

    setIsPostSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('message', postText);
      payload.append('adminId', postOwnerId);
      payload.append('userId', admin?.userId || admin?.id || postOwnerId);
      payload.append('adminName', admin?.name || 'HR Office');
      payload.append('adminProfile', getSafeProfileImage(admin?.profileImage));
      payload.append('targetRole', targetRole || 'all');

      if (postMedia) {
        payload.append('media', postMedia);
        if (postMediaPreviewFile) payload.append('mediaPreview', postMediaPreviewFile);
      }

      if (editingPostId) {
        payload.append('removeMedia', !postMedia && !existingPostMediaUrl ? '1' : '0');

        if (existingPostMediaUrl && !postMedia) {
          payload.append('postUrl', existingPostMediaUrl);
          payload.append('postPreviewUrl', existingPostPreviewUrl || existingPostMediaUrl);
          payload.append('mediaType', existingPostMediaType || '');
        }

        const response = await api.patch(`/api/update_post/${editingPostId}`, payload);
        const updatedPost = response?.data?.post;
        if (updatedPost) upsertPostInState(updatedPost);
        return updatedPost;
      }

      const response = isPostComposerEditing
        ? await api.put(`/api/update_post/${editingPostId}`, payload)
        : await api.post('/api/create_post', payload);
      const savedPost = response?.data?.post ? normalizePostRecord(response.data.post) : null;
      if (savedPost) upsertPostInState(savedPost);

      return savedPost;
    } catch (error) {
      console.error(`Failed to ${isPostComposerEditing ? 'update' : 'create'} post:`, error?.response?.data || error);
      throw error;
    } finally {
      setIsPostSubmitting(false);
    }
  }, [
    admin,
    canSubmitPost,
    editingPostId,
    existingPostMediaType,
    existingPostMediaUrl,
    existingPostPreviewUrl,
    isPostComposerEditing,
    isPostSubmitting,
    postMedia,
    postMediaPreviewFile,
    postOwnerId,
    postText,
    targetRole,
    upsertPostInState,
  ]);

  const handleSubmitCreatePost = useCallback(async () => {
    if (!canSubmitPost || isPostSubmitting) return;
    try {
      await handlePost();
      setShowCreatePostModal(false);
      resetPostComposerState();
    } catch (error) {
      console.error('Post save failed:', error?.response?.data || error);
      alert(error?.response?.data?.message || 'Unable to save post. Please try again.');
    }
  }, [canSubmitPost, handlePost, isPostSubmitting, resetPostComposerState]);

  // ----- Delete API ------------------------------------------------------
  const handleDeletePost = useCallback(async (postId) => {
    try {
      await api.delete(`/api/delete_post/${postId}`, {
        params: { adminId: postOwnerId, userId: currentLikeActorId },
      });
      setPosts((currentPosts) => {
        const nextPosts = currentPosts.filter((post) => post.postId !== postId);
        cachePostsFeed(nextPosts, postsCursor, hasMorePosts);
        return nextPosts;
      });

      if (editingPostId === postId) {
        setShowCreatePostModal(false);
        resetPostComposerState();
      }

      return true;
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Unable to delete post. Please try again.');
      return false;
    }
  }, [cachePostsFeed, currentLikeActorId, editingPostId, hasMorePosts, postOwnerId, postsCursor, resetPostComposerState, setPosts]);

  const handleConfirmDeletePost = useCallback(async () => {
    const postId = String(pendingDeletePost?.postId || '').trim();
    if (!postId || isDeletingPost) return;

    setIsDeletingPost(true);
    try {
      const wasDeleted = await handleDeletePost(postId);
      if (wasDeleted) {
        setPendingDeletePost(null);
        setShowDeletePostModal(false);
      }
    } finally {
      setIsDeletingPost(false);
    }
  }, [handleDeletePost, isDeletingPost, pendingDeletePost]);

  return {
    // composer fields + setters
    postText,
    setPostText,
    postMedia,
    postMediaPreviewFile,
    postMediaMeta,
    isOptimizingMedia,
    isPostSubmitting,
    targetRole,
    setTargetRole,
    targetOptions: TARGET_OPTIONS,

    // modal/editing state
    showCreatePostModal,
    editingPostId,
    existingPostMediaUrl,
    existingPostPreviewUrl,
    existingPostMediaType,

    // delete modal
    showDeletePostModal,
    pendingDeletePost,
    isDeletingPost,

    // lightbox
    expandedPostImage,

    // computed
    canSubmitPost,
    isPostComposerEditing,
    isPostOwnedByCurrentUser,

    // actions
    resetPostComposerState,
    openCreatePostModal,
    closePostComposerModal,
    handleStartEditPost,
    handleCloseDeletePostModal,
    handleRequestDeletePost,
    openExpandedPostImage,
    closeExpandedPostImage,
    handlePostMediaSelection,
    handleOpenPostMediaPicker,
    handleSubmitCreatePost,
    handleConfirmDeletePost,
  };
}
