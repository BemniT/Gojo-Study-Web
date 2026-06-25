export function getConversationSortTime(rawValue) {
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) return rawValue;

  if (typeof rawValue === 'string') {
    const numericValue = Number(rawValue);
    if (Number.isFinite(numericValue)) return numericValue;

    const parsedValue = new Date(rawValue).getTime();
    if (Number.isFinite(parsedValue)) return parsedValue;
  }

  return 0;
}

export function formatFeedTimestamp(rawValue) {
  const timestamp = getConversationSortTime(rawValue);
  if (!timestamp) return 'Just now';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60 * 1000) return 'Just now';

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function normalizeDashboardCollection(items) {
  if (Array.isArray(items)) return items;
  return Object.entries(items || {}).map(([id, payload]) => ({
    ...(payload || {}),
    id,
  }));
}

export function resolveDashboardSelection(action) {
  if (action === 'view-my-posts') return { dashboardView: 'home', postFeedView: 'mine' };
  if (action === 'view-overview') return { dashboardView: 'overview', postFeedView: 'all' };
  return { dashboardView: 'home', postFeedView: 'all' };
}

export function readStoredDashboardSelection() {
  try {
    const parsedValue = JSON.parse(localStorage.getItem('hr_dashboard_sidebar_view_state') || '{}');
    return {
      dashboardView: parsedValue?.dashboardView === 'overview' ? 'overview' : 'home',
      postFeedView: parsedValue?.postFeedView === 'mine' ? 'mine' : 'all',
    };
  } catch {
    return { dashboardView: 'home', postFeedView: 'all' };
  }
}

export function getDashboardRoleLabel(value = '') {
  const role = String(value || '').trim().toLowerCase();
  if (role === 'teacher' || role === 'teachers') return 'Teacher';
  if (role === 'finance') return 'Finance';
  if (['school_admins', 'school_admin', 'management', 'admin', 'admins'].includes(role)) return 'School Admins';
  if (role === 'hr') return 'HR';
  return 'Staff';
}

export function formatActivityTime(value) {
  const stamp = Number(value || 0);
  if (!stamp) return '';
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function normalizeAttendanceSummaryEntry(entry = {}) {
  const presentCount = Math.max(0, Number(entry?.presentCount) || 0);
  const lateCount = Math.max(0, Number(entry?.lateCount) || 0);
  const rawAbsentCount = Math.max(0, Number(entry?.absentCount) || 0);
  const rawTotal = Math.max(0, Number(entry?.total) || 0);
  const total = Math.max(rawTotal, presentCount + lateCount + rawAbsentCount);
  const absentCount = total > 0
    ? Math.max(0, total - (presentCount + lateCount))
    : rawAbsentCount;
  const rawRate = Number(entry?.rate);
  const rate = Number.isFinite(rawRate)
    ? Math.max(0, Math.min(100, Math.round(rawRate)))
    : total > 0
      ? Math.round(((presentCount + lateCount) / total) * 100)
      : 0;

  return { total, presentCount, lateCount, absentCount, rate };
}

export function normalizeEducationQualification(employee = {}) {
  const degreeType = String(
    employee?.education?.degreeType || employee?.profileData?.education?.degreeType || ''
  ).trim().toLowerCase();
  const highestQualification = String(
    employee?.education?.highestQualification || employee?.profileData?.education?.highestQualification || ''
  ).trim().toLowerCase();
  const combined = `${degreeType} ${highestQualification}`.trim();

  if (!combined) return '';
  if (combined.includes('prof')) return 'Prof.';
  if (combined.includes('phd') || combined.includes('doctor')) return 'PhD';
  if (combined.includes('msc') || combined.includes('master') || combined.includes('mba')) return 'Masters';
  if (combined.includes('bsc') || combined.includes('bachelor') || combined.includes('degree')) return 'Degree';
  if (combined.includes('diploma')) return 'Diploma';
  return 'Other';
}
