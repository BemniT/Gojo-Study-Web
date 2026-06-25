export const DEFAULT_PROFILE_IMAGE = '/default-profile.png';
export const DEFAULT_SCHOOL_CODE = 'ET-ORO-ADA-GMI';
export const MESSAGE_PAGE_SIZE = 25;
export const MAX_CHAT_IMAGE_BYTES = 180 * 1024;
export const UNREAD_REFRESH_INTERVAL_MS = 60 * 1000;
export const UNREAD_PRIORITY_LIMIT = 120;
export const CONTACT_LIST_ROW_HEIGHT = 78;
export const CONTACT_LIST_BUFFER_ROWS = 6;
export const EMPLOYEE_CONTACTS_CACHE_TTL_MS = 5 * 60 * 1000;

export function normalizeRoleLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Staff';
  if (normalized === 'hr') return 'HR';
  if (normalized === 'finance') return 'Finance';
  if (normalized === 'teacher') return 'Teacher';
  if (normalized === 'management') return 'Management';
  return value;
}

export function normalizeRoleFilterLabel(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Staff';
  if (normalized.includes('finance') || normalized.includes('admin')) return 'Administrative';
  return normalizeRoleLabel(value);
}

export function formatTime(ts) {
  const date = new Date(Number(ts) || Date.now());
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
}

export function formatDateLabel(ts) {
  if (!ts) return '';
  const msgDate = new Date(Number(ts));
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
  const diffMs = startOfToday - startOfMsgDay;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return msgDate.toLocaleDateString();
}

export function isPageVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export function isEmployeeActive(employee = {}) {
  const status = String(employee?.status || employee?.employment?.status || employee?.job?.status || '').trim().toLowerCase();
  return !employee?.terminated
    && employee?.isActive !== false
    && !status.includes('terminated')
    && !status.includes('inactive')
    && !status.includes('deactivated');
}

export function normalizeChatMessages(payload, currentUserId) {
  return Object.entries(payload || {})
    .map(([id, value]) => ({
      id,
      ...(value || {}),
      isMine: String(value?.senderId || '') === String(currentUserId || ''),
    }))
    .sort((left, right) => Number(left.timeStamp || 0) - Number(right.timeStamp || 0));
}

export function mergeMessages(existingMessages, incomingMessages) {
  const merged = new Map();
  [...(existingMessages || []), ...(incomingMessages || [])].forEach((message) => {
    if (!message?.id) return;
    merged.set(message.id, message);
  });
  return Array.from(merged.values()).sort((left, right) => Number(left.timeStamp || 0) - Number(right.timeStamp || 0));
}
