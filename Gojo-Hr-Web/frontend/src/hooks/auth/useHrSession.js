import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * useHrSession
 *
 * Owns the Hr-Web admin session layer:
 *   - admin state hydrated from localStorage("admin") (legacy "gojo_admin" for schoolCode fallback)
 *   - derived ids (hrUserId), schoolCode resolution, schoolNodePrefix
 *   - withSchoolPath / schoolPath helpers used to build RTDB paths
 *   - getAdminIdPayload — the {hrId,adminId,userId...} body shape posted to backend mutations
 *   - keeps in sync with `storage` and the custom `hr-admin-updated` event so persisted edits
 *     elsewhere (settings page, profile picture change) propagate without reload.
 *
 * Backend swap target: today the hook reads localStorage. Tomorrow it swaps to
 * `GET /api/me` + JWT. Return shape stays identical so pages don't change.
 */

const readStoredAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('admin') || '{}') || {};
  } catch {
    return {};
  }
};

const readLegacySchoolCode = () => {
  try {
    return String(JSON.parse(localStorage.getItem('gojo_admin') || '{}')?.schoolCode || '').trim();
  } catch {
    return '';
  }
};

export default function useHrSession() {
  const [admin, setAdmin] = useState(readStoredAdmin);

  useEffect(() => {
    const sync = () => setAdmin(readStoredAdmin());
    window.addEventListener('storage', sync);
    window.addEventListener('hr-admin-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('hr-admin-updated', sync);
    };
  }, []);

  const hrUserId = String(
    admin?.userId || admin?.id || admin?.uid || admin?.user_id || admin?.hrId || ''
  ).trim();

  const schoolCode = String(
    admin?.activeSchoolCode || admin?.schoolCode || readLegacySchoolCode() || ''
  ).trim();

  const schoolNodePrefix = schoolCode ? `Platform1/Schools/${schoolCode}` : '';

  const withSchoolPath = useCallback(
    (path) => (schoolNodePrefix ? `${schoolNodePrefix}/${String(path || '').replace(/^\/+/, '')}` : String(path || '')),
    [schoolNodePrefix]
  );

  const getAdminIdPayload = useCallback(() => {
    const payload = {};
    if (admin?.hrId) payload.hrId = admin.hrId;
    if (admin?.hrID) payload.hrID = admin.hrID;
    if (admin?.adminId) payload.adminId = admin.adminId;
    if (admin?.adminID) payload.adminID = admin.adminID;
    if (admin?.userId) payload.userId = admin.userId;
    if (admin?.id && !payload.userId) payload.userId = admin.id;
    return payload;
  }, [admin]);

  return useMemo(
    () => ({
      admin,
      setAdmin,
      hrUserId,
      schoolCode,
      schoolNodePrefix,
      withSchoolPath,
      getAdminIdPayload,
    }),
    [admin, hrUserId, schoolCode, schoolNodePrefix, withSchoolPath, getAdminIdPayload]
  );
}
