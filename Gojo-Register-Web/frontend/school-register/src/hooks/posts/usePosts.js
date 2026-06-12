import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { optimizePostMedia } from "../../utils/postMedia";
import { buildRegisterTargetRoleOptions } from "../../utils/registerData";

/**
 * usePosts
 *
 * Owns the Register-Web posts data layer:
 *   - posts list (sorted desc + profile-enriched)
 *   - draft state: postText, postMedia, postMediaMeta, isOptimizingMedia
 *   - audience targeting: targetRole + targetOptions
 *   - profile-image cache (across fetchPosts calls; avoids re-reading
 *     Users/Finance RTDB nodes for repeat authors)
 *   - handlers: fetchPosts, handlePost, handleSubmitCreatePost, handleLike,
 *     handleDelete, handleEdit, handlePostMediaSelection, handleOpenPostMediaPicker
 *   - mount effect that kicks off the initial fetch
 *
 * The page still owns showCreatePostModal + showPostDropdown — those are UI
 * concerns, not data.
 *
 * Session ownership: this hook is called AFTER useRegistrarSession so
 * admin/finance/schoolCode/DB_ROOT are stable inputs. setPosts is exposed so
 * the page's "mark notification seen" flow can patch the seen-by map in-place
 * without going through fetchPosts.
 */
export default function usePosts({
  apiBase,
  schoolCode,
  dbRoot,
  admin,
  finance,
}) {
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState("");
  const [postMedia, setPostMedia] = useState(null);
  const [postMediaMeta, setPostMediaMeta] = useState(null);
  const [isOptimizingMedia, setIsOptimizingMedia] = useState(false);
  const [targetRole, setTargetRole] = useState("all");
  const [targetOptions, setTargetOptions] = useState(() => buildRegisterTargetRoleOptions());

  const fileInputRef = useRef(null);
  const postProfileCacheRef = useRef(new Map());

  const currentLikeActorId = admin?.userId || admin?.adminId || "";
  const canSubmitPost = Boolean(postText.trim() || postMedia) && !isOptimizingMedia;

  // ---------------- FETCH ----------------
  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${apiBase}/get_posts`, { params: { schoolCode } });
      const sortedPosts = (res.data || []).sort((a, b) => new Date(b.time) - new Date(a.time));

      // Collect unique IDs needing profile enrichment.
      const profileCache = postProfileCacheRef.current;
      const pendingUserIds = new Set();
      const pendingFinanceIds = new Set();

      for (const p of sortedPosts) {
        if (p.adminProfile || p.adminProfileImage || p.profileImage) continue;
        if (p.userId && !profileCache.has(`user:${p.userId}`)) pendingUserIds.add(p.userId);
        else if ((p.financeId || p.adminId) && !profileCache.has(`finance:${p.financeId || p.adminId}`)) {
          pendingFinanceIds.add(p.financeId || p.adminId);
        }
      }

      // Batch-resolve missing profiles in parallel (deduplicated).
      await Promise.all([
        ...[...pendingUserIds].map(async (uid) => {
          try {
            const uRes = await axios.get(`${dbRoot}/Users/${uid}.json`);
            const u = uRes.data || {};
            profileCache.set(`user:${uid}`, u.profileImage || u.profile || u.avatar || "");
          } catch {
            profileCache.set(`user:${uid}`, "");
          }
        }),
        ...[...pendingFinanceIds].map(async (fid) => {
          try {
            const fRes = await axios.get(`${dbRoot}/Finance/${fid}.json`);
            const f = fRes.data || {};
            profileCache.set(`finance:${fid}`, f.profileImage || f.profile || "");
          } catch {
            profileCache.set(`finance:${fid}`, "");
          }
        }),
      ]);

      const enriched = sortedPosts.map((p) => {
        let profile = p.adminProfile || p.adminProfileImage || p.profileImage || "";
        if (!profile && p.userId) profile = profileCache.get(`user:${p.userId}`) || "";
        if (!profile && (p.financeId || p.adminId)) {
          profile = profileCache.get(`finance:${p.financeId || p.adminId}`) || "";
        }
        return { ...p, adminProfile: profile || "/default-profile.png" };
      });

      setPosts(enriched);
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  // ---------------- MOUNT ----------------
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- MEDIA PICKER ----------------
  const handlePostMediaSelection = async (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      setPostMedia(null);
      setPostMediaMeta(null);
      return;
    }

    setIsOptimizingMedia(true);

    try {
      const optimizedResult = await optimizePostMedia(file);
      setPostMedia(optimizedResult.file);
      setPostMediaMeta({
        originalSize: optimizedResult.originalSize,
        finalSize: optimizedResult.finalSize,
        wasCompressed: optimizedResult.wasCompressed,
        wasConvertedToJpeg: optimizedResult.wasConvertedToJpeg,
      });
    } catch (error) {
      console.error("Failed to optimize media:", error);
      setPostMedia(file);
      setPostMediaMeta({
        originalSize: Number(file.size || 0),
        finalSize: Number(file.size || 0),
        wasCompressed: false,
        wasConvertedToJpeg: false,
      });
    } finally {
      setIsOptimizingMedia(false);
    }
  };

  const handleOpenPostMediaPicker = () => {
    if (isOptimizingMedia) return;
    fileInputRef.current?.click();
  };

  // ---------------- CREATE ----------------
  const handlePost = async () => {
    if (!(postText.trim() || postMedia) || isOptimizingMedia) return;

    const ownerUserId = admin?.userId || admin?.adminId || "";
    const compatibilityFinanceId = finance?.financeId || admin?.adminId || "";

    if (!ownerUserId) {
      alert("Session expired");
      return;
    }

    const formData = new FormData();
    formData.append("message", postText);
    if (postMedia) formData.append("post_media", postMedia);

    formData.append("adminId", ownerUserId);
    formData.append("userId", ownerUserId);
    formData.append("adminName", admin?.name || "");
    formData.append("adminProfile", admin?.profileImage || "");

    formData.append("financeId", compatibilityFinanceId);
    formData.append("financeName", admin?.name || "");
    formData.append("financeProfile", admin?.profileImage || "");
    formData.append("schoolCode", schoolCode || "");
    formData.append("targetRole", targetRole || "all");

    const response = await axios.post(`${apiBase}/create_post`, formData);

    if (response.data && response.data.success === false) {
      throw new Error(response.data.message || "Post could not be published.");
    }

    setPostText("");
    setPostMedia(null);
    setPostMediaMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchPosts();
  };

  const handleSubmitCreatePost = async () => {
    if (!postText && !postMedia) return false;
    try {
      await handlePost();
      return true;
    } catch (err) {
      console.error("Create post failed:", err);
      return false;
    }
  };

  // ---------------- LIKE ----------------
  const handleLike = async (postId) => {
    if (!currentLikeActorId) return;

    try {
      const res = await axios.post(`${apiBase}/like_post`, {
        postId,
        schoolCode,
        userId: currentLikeActorId,
        adminId: admin?.adminId,
        financeId: finance?.financeId,
      });

      if (res.data.success) {
        const likeCount = res.data.likeCount;
        const nextLikes = { ...(res.data.likes || {}) };

        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.postId === postId ? { ...post, likeCount, likes: nextLikes } : post
          )
        );
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  // ---------------- DELETE ----------------
  const handleDelete = async (postId) => {
    try {
      await axios.delete(`${apiBase}/delete_post/${postId}`, {
        data: { adminId: admin?.adminId },
      });
      fetchPosts();
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  // ---------------- EDIT ----------------
  // NOTE: still uses native prompt(); replacing with EditPostModal is a
  // follow-up Phase 1 cleanup item.
  const handleEdit = async (postId, currentText) => {
    const newText = prompt("Edit your post:", currentText);
    if (!newText) return;
    try {
      await axios.post(`${apiBase}/edit_post/${postId}`, {
        adminId: admin?.adminId,
        postText: newText,
      });
      fetchPosts();
    } catch (err) {
      console.error("Error editing post:", err);
    }
  };

  return {
    // state
    posts, setPosts,
    postText, setPostText,
    postMedia, setPostMedia,
    postMediaMeta, setPostMediaMeta,
    isOptimizingMedia,
    targetRole, setTargetRole,
    targetOptions, setTargetOptions,
    // refs
    fileInputRef,
    // derived
    canSubmitPost,
    currentLikeActorId,
    // actions
    fetchPosts,
    handlePost,
    handleSubmitCreatePost,
    handleLike,
    handleDelete,
    handleEdit,
    handlePostMediaSelection,
    handleOpenPostMediaPicker,
  };
}
