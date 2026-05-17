import { normalizeIdentifier } from "./teacherData";
import { resolveProfileImage } from "./profileImage";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

// NOTE: This codebase uses two chat-key conventions:
// - Students/Parents: teacherUserId_otherUserId (teacher first)
// - Admins: [id1,id2].sort().join('_')
export const teacherFirstChatId = (teacherUserId, otherUserId) => {
  const t = String(teacherUserId || "").trim();
  const o = String(otherUserId || "").trim();
  return `${t}_${o}`;
};

export const sortedChatId = (id1, id2) => {
  const a = String(id1 || "").trim();
  const b = String(id2 || "").trim();
  return [a, b].sort().join("_");
};

export const normalizeTab = (tab) => {
  const t = String(tab || "").toLowerCase();
  if (t === "student" || t === "students") return "student";
  if (t === "parent" || t === "parents") return "parent";
  if (t === "admin" || t === "admins") return "admin";
  return null;
};

export const getChatIdForTab = (tab, teacherUserId, otherUserId) => {
  const normalized = normalizeTab(tab) || "student";
  return normalized === "admin"
    ? sortedChatId(teacherUserId, otherUserId)
    : teacherFirstChatId(teacherUserId, otherUserId);
};

export const normalizeGrade = (value) => String(value ?? "").trim();
export const normalizeSection = (value) => String(value ?? "").trim().toUpperCase();
export const normalizeRole = (value) => String(value || "").trim().toLowerCase();
export const normalizeTeacherRef = (value) =>
  String(value || "").trim().replace(/^-+/, "").toUpperCase();

export const getStudentUserId = (student = {}) =>
  String(
    student?.userId ||
      student?.systemAccountInformation?.userId ||
      student?.account?.userId ||
      ""
  ).trim();

const DEFAULT_PROFILE_IMAGE = "/default-profile.png";

export const getInitials = (name) => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "U";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
};

export const createPlaceholderAvatar = (name) => {
  const initials = getInitials(name);
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#2563eb'/>
      <stop offset='100%' stop-color='#0ea5e9'/>
    </linearGradient>
  </defs>
  <rect width='160' height='160' rx='80' fill='url(#g)'/>
  <text x='50%' y='53%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Segoe UI, Arial, sans-serif' font-size='56' font-weight='700'>${initials}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const sanitizeProfileImage = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_PROFILE_IMAGE;

  const lower = raw.toLowerCase();
  if (lower.startsWith("file://") || lower.startsWith("content://")) {
    return DEFAULT_PROFILE_IMAGE;
  }

  return raw;
};

export const resolveAvatarSrc = (rawValue, name) => {
  const sanitized = sanitizeProfileImage(rawValue);
  if (!sanitized || sanitized === DEFAULT_PROFILE_IMAGE) {
    return createPlaceholderAvatar(name);
  }
  return sanitized;
};

export const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image file"));
    };
    image.src = objectUrl;
  });

export const compressImageToJpeg = async (
  file,
  { maxWidth = 1280, maxHeight = 1280, quality = 0.72 } = {}
) => {
  const image = await loadImageFromFile(file);

  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;

  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.max(1, Math.round(width * ratio));
  height = Math.max(1, Math.round(height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (output) => {
        if (!output) {
          reject(new Error("Image compression failed"));
          return;
        }
        resolve(output);
      },
      "image/jpeg",
      quality
    );
  });

  return blob;
};

export const isActiveRecord = (record = {}) => {
  const raw = record?.status ?? record?.isActive;
  if (typeof raw === "boolean") return raw;
  const normalized = String(raw || "active").toLowerCase();
  return normalized === "active" || normalized === "true" || normalized === "1";
};

export const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
};

export const buildContactsSessionKey = (schoolCode, tab) => {
  return `all_chat_contacts_${String(schoolCode || "global").toUpperCase()}_${String(tab || "student").toLowerCase()}`;
};

export const buildUnreadSessionKey = (schoolCode, teacherUserId, tab) => {
  return `all_chat_unread_${String(schoolCode || "global").toUpperCase()}_${String(teacherUserId || "").trim()}_${String(tab || "student").toLowerCase()}`;
};

export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
};

export const formatDateLabel = (timestamp) => {
  if (!timestamp) return "";
  const messageDate = new Date(Number(timestamp));
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMessageDay = new Date(
    messageDate.getFullYear(),
    messageDate.getMonth(),
    messageDate.getDate()
  );
  const diffMs = startOfToday - startOfMessageDay;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return messageDate.toLocaleDateString();
};

export const deleteStorageObjectByUrl = async (url) => {
  try {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) return false;

    const objectSegment = normalizedUrl.split("/o/")[1] || "";
    const encodedPath = objectSegment.split("?")[0] || "";
    const decodedPath = decodeURIComponent(encodedPath);
    if (!decodedPath) return false;

    const objectRef = storageRef(storage, decodedPath);
    await deleteObject(objectRef);
    return true;
  } catch (error) {
    console.error("Failed to delete storage object by URL:", error);
    return false;
  }
};

export const mergeChatMessages = (...groups) => {
  const merged = new Map();

  groups
    .flat()
    .filter(Boolean)
    .forEach((message) => {
      const key = String(message?.id || message?.messageId || "").trim();
      if (!key) return;

      const previous = merged.get(key) || {};
      merged.set(key, {
        ...previous,
        ...message,
        id: key,
        messageId: key,
      });
    });

  return [...merged.values()].sort(
    (leftMessage, rightMessage) =>
      Number(leftMessage?.timeStamp || 0) - Number(rightMessage?.timeStamp || 0)
  );
};

export const collectStudentParentLinks = (student = {}) => {
  const rawStudent = student?.raw || student || {};
  const links = [];

  const pushLink = (candidate = {}, fallbackParentId = "") => {
    const parentId = normalizeIdentifier(candidate?.parentId || candidate?.id || fallbackParentId);
    const userId = normalizeIdentifier(candidate?.userId || candidate?.parentUserId);
    const name = String(candidate?.name || candidate?.parentName || "").trim();
    const phone = String(candidate?.phone || candidate?.parentPhone || candidate?.phoneNumber || "").trim();
    const profileImage = resolveProfileImage(
      candidate?.profileImage,
      candidate?.profile,
      candidate?.parentProfileImage
    );

    if (!parentId && !userId && !name && !phone && profileImage === DEFAULT_PROFILE_IMAGE) {
      return;
    }

    links.push({
      parentId,
      userId,
      name,
      phone,
      profileImage,
    });
  };

  pushLink({
    parentId: rawStudent?.parentId,
    userId: rawStudent?.parentUserId,
    name: rawStudent?.parentName,
    phone: rawStudent?.parentPhone,
    parentProfileImage: rawStudent?.parentProfileImage,
  });

  Object.entries(rawStudent?.parents || {}).forEach(([parentKey, link]) => {
    pushLink(link, parentKey);
  });

  const guardianParents = rawStudent?.parentGuardianInformation?.parents;
  if (Array.isArray(guardianParents)) {
    guardianParents.forEach((link) => pushLink(link));
  } else if (guardianParents && typeof guardianParents === "object") {
    Object.entries(guardianParents).forEach(([parentKey, link]) => {
      pushLink(link, parentKey);
    });
  }

  const deduped = [];
  const seen = new Set();
  links.forEach((link) => {
    const key = `${link.parentId}__${link.userId}__${link.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(link);
  });

  return deduped;
};