import { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import { DASHBOARD_POSTS_CACHE_KEY, POST_PAGE_SIZE } from '../../utils/dashboardConstants';
import { getCachedDashboardResource, setCachedDashboardResource } from '../../utils/dashboardCache';
import { normalizePostLikes, normalizePostRecord, normalizePostsApiPayload } from '../../utils/dashboardPosts';

/**
 * Owns the Dashboard posts feed read-side: initial load, infinite scroll,
 * client-side cache mirror, optimistic like/unlike, and post upsert/cache
 * helpers that the create/edit/delete flows call into.
 *
 * Inputs:
 *   currentLikeActorId — the HR user-id used as the "liked by" key
 *   postOwnerId        — the HR admin-id sent as the post-owner on like POST
 */
export default function useDashboardPosts({ currentLikeActorId, postOwnerId }) {
  const [posts, setPosts] = useState([]);
  const [postsCursor, setPostsCursor] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [pendingLikePostIds, setPendingLikePostIds] = useState({});
  const [expandedPostDescriptions, setExpandedPostDescriptions] = useState({});

  // ----- Initial load (cache-first, 30s TTL) -----------------------------
  useEffect(() => {
    let cancelled = false;

    getCachedDashboardResource(DASHBOARD_POSTS_CACHE_KEY, async () => {
      const response = await api.get('/api/get_posts', {
        params: { limit: POST_PAGE_SIZE, withMeta: 1 },
      });
      return response.data;
    }, 30 * 1000)
      .then((payload) => {
        const { items, hasMore, nextCursor } = normalizePostsApiPayload(payload);
        if (!cancelled) {
          setPosts(items);
          setHasMorePosts(hasMore);
          setPostsCursor(nextCursor);
        }
      })
      .catch((error) => {
        console.error('Failed to load posts:', error);
        if (!cancelled) {
          setPosts([]);
          setHasMorePosts(false);
          setPostsCursor(null);
        }
      });

    return () => { cancelled = true; };
  }, []);

  // ----- Cache mirror ----------------------------------------------------
  const cachePostsFeed = useCallback((items, nextCursor, hasMore) => {
    setCachedDashboardResource(DASHBOARD_POSTS_CACHE_KEY, {
      posts: items,
      nextCursor,
      hasMore,
    });
  }, []);

  // ----- Upsert (used by create/edit flows) ------------------------------
  const upsertPostInState = useCallback((incomingPost) => {
    if (!incomingPost?.postId) return;

    setPosts((currentPosts) => {
      const alreadyExists = currentPosts.some((post) => post.postId === incomingPost.postId);
      const retainedCount = Math.max(currentPosts.length, POST_PAGE_SIZE);
      const mergedPosts = alreadyExists
        ? currentPosts.map((post) => (post.postId === incomingPost.postId ? { ...post, ...incomingPost } : post))
        : [incomingPost, ...currentPosts];
      const nextPosts = mergedPosts.slice(0, retainedCount);

      cachePostsFeed(nextPosts, postsCursor, hasMorePosts);
      return nextPosts;
    });
  }, [cachePostsFeed, hasMorePosts, postsCursor]);

  // ----- Infinite scroll -------------------------------------------------
  const loadMorePosts = useCallback(async () => {
    if (loadingMorePosts || !hasMorePosts || !postsCursor?.beforeTime) return;

    setLoadingMorePosts(true);

    try {
      const response = await api.get('/api/get_posts', {
        params: {
          limit: POST_PAGE_SIZE,
          withMeta: 1,
          beforeTime: postsCursor.beforeTime,
          beforePostId: postsCursor.beforePostId,
        },
      });

      const { items, hasMore, nextCursor } = normalizePostsApiPayload(response.data);

      setPosts((currentPosts) => {
        const existingIds = new Set(currentPosts.map((post) => String(post.postId || '')));
        const appendedPosts = items.filter((post) => !existingIds.has(String(post.postId || '')));
        const nextPosts = [...currentPosts, ...appendedPosts];
        cachePostsFeed(nextPosts, nextCursor, hasMore);
        return nextPosts;
      });

      setHasMorePosts(hasMore);
      setPostsCursor(nextCursor);
    } catch (error) {
      console.error('Failed to load older posts:', error);
    } finally {
      setLoadingMorePosts(false);
    }
  }, [cachePostsFeed, hasMorePosts, loadingMorePosts, postsCursor]);

  // ----- Like / unlike (optimistic) --------------------------------------
  const handleLikePost = useCallback(async (postId) => {
    const normalizedPostId = String(postId || '').trim();
    if (!normalizedPostId || !currentLikeActorId || pendingLikePostIds[normalizedPostId]) return;

    const currentPost = posts.find((post) => String(post?.postId || '') === normalizedPostId);
    if (!currentPost) return;

    const previousLikes = normalizePostLikes(currentPost.likes);
    const wasLiked = Boolean(previousLikes[String(currentLikeActorId)]);
    const nextLikes = { ...previousLikes };

    if (wasLiked) delete nextLikes[String(currentLikeActorId)];
    else nextLikes[String(currentLikeActorId)] = true;

    const optimisticLikeCount = Object.keys(nextLikes).length;

    setPendingLikePostIds((current) => ({ ...current, [normalizedPostId]: true }));

    setPosts((currentPosts) => {
      const nextPosts = currentPosts.map((post) => (
        post.postId === normalizedPostId
          ? { ...post, likeCount: optimisticLikeCount, likes: nextLikes }
          : post
      ));
      setCachedDashboardResource(DASHBOARD_POSTS_CACHE_KEY, nextPosts);
      return nextPosts;
    });

    try {
      const response = await api.post('/api/like_post', {
        postId: normalizedPostId,
        userId: currentLikeActorId,
        adminId: postOwnerId,
      });

      const likeCount = response?.data?.likeCount;
      const likes = normalizePostLikes(response?.data?.likes);

      setPosts((currentPosts) => {
        const nextPosts = currentPosts.map((post) =>
          post.postId === normalizedPostId
            ? {
                ...post,
                likeCount: typeof likeCount === 'number' ? likeCount : Object.keys(likes).length,
                likes,
              }
            : post,
        );
        setCachedDashboardResource(DASHBOARD_POSTS_CACHE_KEY, nextPosts);
        return nextPosts;
      });
    } catch (error) {
      console.error('Failed to like post:', error);
      setPosts((currentPosts) => {
        const nextPosts = currentPosts.map((post) => (
          post.postId === normalizedPostId
            ? {
                ...post,
                likeCount: Math.max(0, Object.keys(previousLikes).length),
                likes: previousLikes,
              }
            : post
        ));
        setCachedDashboardResource(DASHBOARD_POSTS_CACHE_KEY, nextPosts);
        return nextPosts;
      });
      alert('Unable to update like. Please try again.');
    } finally {
      setPendingLikePostIds((current) => {
        const next = { ...current };
        delete next[normalizedPostId];
        return next;
      });
    }
  }, [currentLikeActorId, pendingLikePostIds, postOwnerId, posts]);

  // ----- Expanded description toggle -------------------------------------
  const togglePostDescription = useCallback((postId) => {
    setExpandedPostDescriptions((current) => ({
      ...current,
      [postId]: !current[postId],
    }));
  }, []);

  return {
    posts,
    setPosts,
    postsCursor,
    setPostsCursor,
    hasMorePosts,
    setHasMorePosts,
    loadingMorePosts,
    pendingLikePostIds,
    expandedPostDescriptions,
    cachePostsFeed,
    upsertPostInState,
    loadMorePosts,
    handleLikePost,
    togglePostDescription,
  };
}
