/**
 * @file usePostsFeed.js
 * @description React hook that manages the teacher posts feed, including fetching, liking, notifications, and scroll-to-post behaviour.
 */
import { useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../api/apiConfig";
import { readSessionResource, writeSessionResource } from "../utils/teacherData";
import { getStoredTeacher } from "../utils/useStoredTeacher";

/**
 * Manages posts feed state, like toggling, notification tracking, and post fetching for the teacher dashboard.
 * @param {{ teacher: object, effectiveSchoolCode: string, schoolCode: string, postRefs: object,
 *   isTeacherVisiblePost: Function, getSafeProfileImage: Function, resolveSchoolCode: Function }} params
 * @returns {{ posts: Array, postsLoading: boolean, notifications: Array, highlightedPostId: string|null,
 *   fetchPostsAndAdmins: Function, handleLike: Function, handleNotificationClick: Function }}
 */
export function usePostsFeed({ teacher, effectiveSchoolCode, schoolCode, postRefs, isTeacherVisiblePost, getSafeProfileImage, resolveSchoolCode }) {
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [expandedPostIds, setExpandedPostIds] = useState({});
  const [pendingLikePostIds, setPendingLikePostIds] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [highlightedPostId, setHighlightedPostId] = useState(null);

  const teacherId = teacher?.userId || null;

  // Returns the localStorage key for the posts cache of the given school code.
  const getPostsCacheKey = useCallback(
    (candidateSchoolCode) =>
      `teacher_posts_cache_v2_${String(candidateSchoolCode || "global").toUpperCase()}`,
    []
  );

  // Returns the session-storage key for the dashboard posts of the given school code.
  const getDashboardPostsSessionKey = useCallback(
    (candidateSchoolCode) =>
      `dashboard_posts_${String(candidateSchoolCode || "global").toUpperCase()}`,
    []
  );

  // Retrieves the list of post IDs already seen by the given teacher from localStorage.
  const getSeenPosts = useCallback((teacherUserId) => {
    try {
      return JSON.parse(localStorage.getItem(`seen_posts_${teacherUserId}`)) || [];
    } catch {
      return [];
    }
  }, []);

  // Adds a post ID to the teacher's seen-posts list in localStorage if not already present.
  const saveSeenPost = useCallback((teacherUserId, postId) => {
    const seen = getSeenPosts(teacherUserId);
    if (!seen.includes(postId)) {
      try {
        localStorage.setItem(
          `seen_posts_${teacherUserId}`,
          JSON.stringify([...seen, postId])
        );
      } catch (err) {
        console.error("Failed to save seen post:", err);
      }
    }
  }, [getSeenPosts]);

  // Converts a likes value (array or object) into a consistent { userId: true } map.
  const normalizePostLikes = useCallback((likes) => {
    if (Array.isArray(likes)) {
      return likes.reduce((accumulator, value) => {
        const normalizedKey = String(value || "").trim();
        if (normalizedKey) {
          accumulator[normalizedKey] = true;
        }
        return accumulator;
      }, {});
    }

    if (likes && typeof likes === "object") {
      return Object.entries(likes).reduce((accumulator, [key, value]) => {
        const normalizedKey = String(key || "").trim();
        if (normalizedKey && value) {
          accumulator[normalizedKey] = true;
        }
        return accumulator;
      }, {});
    }

    return {};
  }, []);

  // Optimistically toggles the teacher's like on a post and syncs the result to the API.
  const handleLike = useCallback(
    async (postId) => {
      const normalizedPostId = String(postId || "").trim();
      if (!teacherId || !normalizedPostId || pendingLikePostIds[normalizedPostId]) return;

      const currentPost = posts.find((post) => String(post?.postId || "") === normalizedPostId);
      if (!currentPost) return;

      const previousLikes = normalizePostLikes(currentPost.likes);
      const wasLiked = Boolean(previousLikes[String(teacherId)]);
      const nextLikes = { ...previousLikes };

      if (wasLiked) {
        delete nextLikes[String(teacherId)];
      } else {
        nextLikes[String(teacherId)] = true;
      }

      const optimisticLikeCount = Object.keys(nextLikes).length;
      const cacheKey = getPostsCacheKey(effectiveSchoolCode || schoolCode);

      setPendingLikePostIds((prev) => ({
        ...prev,
        [normalizedPostId]: true,
      }));

      setPosts((prevPosts) => {
        const nextPosts = prevPosts.map((post) =>
          post.postId === normalizedPostId
            ? {
                ...post,
                likeCount: optimisticLikeCount,
                likes: nextLikes,
              }
            : post
        );

        return nextPosts;
      });

      try {
        const res = await axios.post(`${API_BASE}/like_post`, {
          postId: normalizedPostId,
          teacherId,
          schoolCode,
        });

        if (res.data.success) {
          const likeCount = res.data.likeCount;
          const responseLikes = normalizePostLikes(res.data.likes);
          const syncedLikes = Object.keys(responseLikes).length > 0 ? responseLikes : nextLikes;

          setPosts((prevPosts) => {
            const nextPosts = prevPosts.map((post) =>
              post.postId === normalizedPostId
                ? {
                    ...post,
                    likeCount: typeof likeCount === "number" ? likeCount : Object.keys(syncedLikes).length,
                    likes: syncedLikes,
                  }
                : post
            );

            setTimeout(() => localStorage.setItem(cacheKey, JSON.stringify(nextPosts)), 0);
            return nextPosts;
          });
        }
      } catch (err) {
        console.error("Error liking post:", err);
        setPosts((prevPosts) => {
          const nextPosts = prevPosts.map((post) =>
            post.postId === normalizedPostId
              ? {
                  ...post,
                  likeCount: Object.keys(previousLikes).length,
                  likes: previousLikes,
                }
              : post
          );

          setTimeout(() => localStorage.setItem(cacheKey, JSON.stringify(nextPosts)), 0);
          return nextPosts;
        });
      } finally {
        setPendingLikePostIds((prev) => {
          const next = { ...prev };
          delete next[normalizedPostId];
          return next;
        });
      }
    },
    [teacherId, posts, pendingLikePostIds, normalizePostLikes, effectiveSchoolCode, schoolCode, getPostsCacheKey]
  );

  // Scrolls to the target post, marks it as seen, and dismisses its notification badge.
  const handleNotificationClick = (postId) => {
    if (!teacher || !postId) return;
    if (teacherId) saveSeenPost(teacherId, postId);
    setHighlightedPostId(postId);
    const el = postRefs?.current?.[postId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setNotifications((prev) => prev.filter((n) => n.id !== postId));
    setTimeout(() => setHighlightedPostId(null), 3000);
  };

  // Fetches the posts feed from the API, applies visibility filters, and updates state and caches.
  const fetchPostsAndAdmins = useCallback(
    async (candidateTeacher) => {
      if (!candidateTeacher?.userId) {
        setPosts([]);
        setPostsLoading(false);
        return;
      }

      const resolvedSchoolCode = resolveSchoolCode(candidateTeacher);
      const cacheKey = getPostsCacheKey(resolvedSchoolCode);
      const sessionCacheKey = getDashboardPostsSessionKey(resolvedSchoolCode);

      setPostsLoading(true);

      const cachedSessionPosts = readSessionResource(sessionCacheKey, {
        ttlMs: 300 * 1000,
      });
      if (Array.isArray(cachedSessionPosts) && cachedSessionPosts.length > 0) {
        setPosts(cachedSessionPosts);
      }

      const cachedPostsRaw = localStorage.getItem(cacheKey);
      if (cachedPostsRaw) {
        try {
          const cachedPosts = JSON.parse(cachedPostsRaw);
          if (Array.isArray(cachedPosts) && cachedPosts.length > 0) {
            const teacherCachedPosts = cachedPosts.filter(isTeacherVisiblePost);
            if (teacherCachedPosts.length > 0) {
              setPosts(teacherCachedPosts);
            }
          }
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }

      try {
        const postsResp = await axios.get(`${API_BASE}/get_posts`, {
          params: resolvedSchoolCode
            ? { schoolCode: resolvedSchoolCode, viewerRole: "teacher", limit: 25 }
            : { viewerRole: "teacher", limit: 25 },
          headers: resolvedSchoolCode ? { "X-School-Code": resolvedSchoolCode } : {},
          timeout: 12000,
        });
        let postsData = postsResp.data || [];
        if (!Array.isArray(postsData) && typeof postsData === "object") {
          postsData = Object.values(postsData);
        }

        const teacherVisiblePosts = postsData.filter(isTeacherVisiblePost);

        const finalPosts = teacherVisiblePosts.map((post) => {
          const postId = post.postId || post.id || post.key || "";
          let likesArray = [];

          if (Array.isArray(post.likes)) likesArray = post.likes;
          else if (post.likes && typeof post.likes === "object") {
            likesArray = Object.keys(post.likes);
          }

          const timeValue = post.time || post.timestamp || post.createdAt || null;

          return {
            ...post,
            postId,
            adminName: post.adminName || "Admin",
            adminProfile: getSafeProfileImage(post.adminProfile),
            time: timeValue,
            likes: likesArray,
            likeCount: post.likeCount || likesArray.length || 0,
          };
        });

        finalPosts.sort((a, b) => {
          const ta = a.time ? new Date(a.time).getTime() : 0;
          const tb = b.time ? new Date(b.time).getTime() : 0;
          return tb - ta;
        });

        setExpandedPostIds({});

        setPosts(finalPosts);
        if (finalPosts.length > 0) {
          localStorage.setItem(cacheKey, JSON.stringify(finalPosts));
          writeSessionResource(sessionCacheKey, finalPosts);
        } else {
          localStorage.removeItem(cacheKey);
          writeSessionResource(sessionCacheKey, []);
        }

        const storedTeacher = getStoredTeacher();
        const seenPosts = getSeenPosts(storedTeacher?.userId || candidateTeacher?.userId);

        const notifs = finalPosts
          .filter((p) => !seenPosts.includes(p.postId))
          .slice(0, 5)
          .map((p) => ({
            id: p.postId,
            title: p.message?.substring(0, 80) || "Untitled post",
            adminName: p.adminName,
            adminProfile: p.adminProfile,
          }));

        setNotifications(notifs);
      } catch (err) {
        console.error("Error fetching posts/admins:", err);
      } finally {
        setPostsLoading(false);
      }
    },
    [getSeenPosts, getPostsCacheKey, getDashboardPostsSessionKey, isTeacherVisiblePost, getSafeProfileImage, resolveSchoolCode]
  );

  return {
    posts,
    setPosts,
    postsLoading,
    expandedPostIds,
    setExpandedPostIds,
    pendingLikePostIds,
    setPendingLikePostIds,
    notifications,
    setNotifications,
    highlightedPostId,
    setHighlightedPostId,
    getSeenPosts,
    saveSeenPost,
    fetchPostsAndAdmins,
    handleLike,
    handleNotificationClick,
    getPostsCacheKey,
    getDashboardPostsSessionKey,
  };
}
