export const ATTENDANCE_AUTOSAVE_STORAGE_KEY = 'gojo-hr-attendance-autosave-enabled';
export const ATTENDANCE_EMPLOYEES_CACHE_TTL_MS = 5 * 60 * 1000;

export function toIsoDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeAttendanceStatus(rawStatus) {
  const value = (rawStatus || '').toString().toLowerCase();
  if (value === 'late') return 'late';
  if (value === 'present') return 'present';
  if (value === 'absent') return 'absent';
  return '';
}

export function createAttendanceSignature(date, attendanceMap) {
  const entries = Object.entries(attendanceMap || {})
    .map(([employeeId, record]) => {
      const entry = record && typeof record === 'object' ? record : {};
      const status = normalizeAttendanceStatus(entry.status);
      const present = typeof entry.present === 'boolean' ? entry.present : status !== 'absent';
      return [String(employeeId), { status, present }];
    })
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId));

  return JSON.stringify({ date: String(date || ''), attendance: entries });
}

/**
 * Normalize a legacy attendance map from the API:
 * - status defaults to "absent" if missing
 * - present is derived from status when absent
 */
export function normalizeAttendanceMap(raw) {
  const map = typeof raw === 'object' && raw ? raw : {};
  return Object.entries(map).reduce((accumulator, [employeeId, record]) => {
    const entry = record && typeof record === 'object' ? record : {};
    const status = normalizeAttendanceStatus(entry.status) || 'absent';
    const present = typeof entry.present === 'boolean' ? entry.present : status !== 'absent';
    accumulator[employeeId] = { ...entry, status, present };
    return accumulator;
  }, {});
}
