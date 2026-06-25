/**
 * Pure helpers for rendering posts (Register-Web).
 * No React imports — safe to use anywhere.
 */

export const MESSAGE_PREVIEW_LIMIT = 220;

export const shouldShowPostSeeMore = (message = "") => {
  const normalizedMessage = String(message || "").trim();
  if (!normalizedMessage) return false;

  const sentenceCount = normalizedMessage
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const lineCount = normalizedMessage.split(/\r?\n/).filter(Boolean).length;

  return normalizedMessage.length > 180 || sentenceCount > 2 || lineCount > 2;
};

export const formatPostTimestamp = (timestamp) => {
  if (!timestamp) return "Recent update";

  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) return String(timestamp);

  const now = Date.now();
  const differenceMs = now - parsedDate.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (differenceMs >= 0 && differenceMs < minuteMs) return "Just now";
  if (differenceMs >= 0 && differenceMs < hourMs) return `${Math.floor(differenceMs / minuteMs)}m ago`;
  if (differenceMs >= 0 && differenceMs < dayMs) return `${Math.floor(differenceMs / hourMs)}h ago`;
  if (differenceMs >= 0 && differenceMs < 7 * dayMs) return `${Math.floor(differenceMs / dayMs)}d ago`;

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: parsedDate.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
};

export const formatAudienceLabel = (targetRoleValue) => {
  const normalizedValue = String(targetRoleValue || "all").trim().toLowerCase();
  if (!normalizedValue || normalizedValue === "all") return "everyone";
  return normalizedValue
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

export const isPostLikedByActor = (post, actorId) => {
  if (!actorId || !post?.likes) return false;
  return Boolean(post.likes[actorId]);
};

export const getResolvedLikeCount = (post) => {
  if (Number.isFinite(Number(post?.likeCount))) return Number(post.likeCount);
  if (post?.likes && typeof post.likes === "object") return Object.keys(post.likes).length;
  return 0;
};
