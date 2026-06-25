import { resolveProfileImage } from './profileImage';

export function isLikelyVideoMedia(mediaType, mediaUrl) {
  if (String(mediaType || '').toLowerCase().startsWith('video/')) return true;
  return /\.(mp4|mov|webm|ogg|m4v)(?:$|\?)/i.test(String(mediaUrl || ''));
}

export function getSafeProfileImage(profileImage) {
  return resolveProfileImage(profileImage);
}

export function normalizePostLikes(likes) {
  if (Array.isArray(likes)) {
    return likes.reduce((accumulator, value) => {
      const normalizedKey = String(value || '').trim();
      if (normalizedKey) accumulator[normalizedKey] = true;
      return accumulator;
    }, {});
  }

  if (likes && typeof likes === 'object') {
    return Object.entries(likes).reduce((accumulator, [key, value]) => {
      const normalizedKey = String(key || '').trim();
      if (normalizedKey && value) accumulator[normalizedKey] = true;
      return accumulator;
    }, {});
  }

  return {};
}

export function isPostLikedByActor(post, actorId) {
  const normalizedActorId = String(actorId || '').trim();
  if (!normalizedActorId) return false;
  return Boolean(normalizePostLikes(post?.likes)[normalizedActorId]);
}

export function getResolvedLikeCount(post) {
  const explicitCount = Number(post?.likeCount);
  if (Number.isFinite(explicitCount) && explicitCount >= 0) return explicitCount;
  return Object.keys(normalizePostLikes(post?.likes)).length;
}

export function getPostId(post) {
  return String(post?.postId || post?.id || '');
}

export function normalizePostRecord(post) {
  const likes = post?.likes && typeof post.likes === 'object' ? post.likes : {};
  const postId = getPostId(post);
  const parsedLikeCount = Number(post?.likeCount);

  return {
    ...(post || {}),
    postId,
    id: postId,
    adminId: String(post?.adminId || post?.hrId || post?.userId || ''),
    hrId: String(post?.hrId || post?.adminId || ''),
    userId: String(post?.userId || ''),
    adminName: post?.adminName || post?.name || 'HR Office',
    adminProfile: post?.adminProfile || post?.profileImage || '/default-profile.png',
    postUrl: post?.postUrl || '',
    postPreviewUrl: post?.postPreviewUrl || '',
    mediaType: String(post?.mediaType || ''),
    message: post?.message || '',
    targetRole: (post?.targetRole || 'all').toString().toLowerCase(),
    likes,
    likeCount: Number.isFinite(parsedLikeCount) ? parsedLikeCount : Object.keys(likes).length,
    time: post?.time || post?.createdAt || '',
  };
}

export function getPostFeedImageUrl(post = {}) {
  return String(post?.postPreviewUrl || post?.postUrl || '');
}

export function getPostFullMediaUrl(post = {}) {
  return String(post?.postUrl || post?.postPreviewUrl || '');
}

export function normalizePostsApiPayload(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.posts)
      ? payload.posts
      : [];

  const nextCursor = payload?.nextCursor && typeof payload.nextCursor === 'object'
    ? {
        beforeTime: String(payload.nextCursor.beforeTime || ''),
        beforePostId: String(payload.nextCursor.beforePostId || ''),
      }
    : null;

  return {
    items: items.map((item) => normalizePostRecord(item)),
    hasMore: Boolean(payload?.hasMore),
    nextCursor: nextCursor && nextCursor.beforeTime ? nextCursor : null,
  };
}

export function isVideoPostUrl(url = '') {
  return /^data:video\//i.test(url) || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
}
