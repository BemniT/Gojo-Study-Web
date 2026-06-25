import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEmployeeContact, getEmployeeJob, getEmployeeMeta, getEmployeeName, getEmployeeProfileImage, getEmployeesSnapshot } from '../../hrData';
import { dedupeUserIds, loadChatSummariesForContacts, sortedChatId } from '../../utils/chatSummary';
import { createProfilePlaceholder, isFallbackProfileImage, resolveProfileImage } from '../../utils/profileImage';
import {
  CONTACT_LIST_BUFFER_ROWS,
  CONTACT_LIST_ROW_HEIGHT,
  EMPLOYEE_CONTACTS_CACHE_TTL_MS,
  UNREAD_PRIORITY_LIMIT,
  UNREAD_REFRESH_INTERVAL_MS,
  isEmployeeActive,
  isPageVisible,
  normalizeRoleFilterLabel,
  normalizeRoleLabel,
} from '../../utils/chatHelpers';

const resolveAvatarSrc = (rawValue, name) => {
  const sanitized = resolveProfileImage(rawValue);
  if (!sanitized || isFallbackProfileImage(sanitized)) return createProfilePlaceholder(name || 'HR Office');
  return sanitized;
};

export default function useChatContacts({ db, schoolPath, schoolCode, adminUserId, incomingContactUserId, incomingChatId, incomingContact }) {
  const [employees, setEmployees] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contactError, setContactError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedChatUser, setSelectedChatUser] = useState(() => incomingContact || null);
  const [chatSummariesByUserId, setChatSummariesByUserId] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [contactListScrollTop, setContactListScrollTop] = useState(0);
  const [contactListViewportHeight, setContactListViewportHeight] = useState(0);
  const contactListRef = useRef(null);

  useEffect(() => {
    if (selectedRoleFilter === 'all') return;
    const normalizedFilter = normalizeRoleFilterLabel(selectedRoleFilter);
    if (normalizedFilter !== selectedRoleFilter) setSelectedRoleFilter(normalizedFilter);
  }, [selectedRoleFilter]);

  useEffect(() => {
    if (!incomingContactUserId) return;
    setSelectedChatUser((current) => {
      if (current?.userId === incomingContactUserId) return current;
      return incomingContact;
    });
  }, [incomingContact, incomingContactUserId]);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      setLoadingContacts(true);
      setContactError('');

      try {
        const buildChatContacts = (items) => (Array.isArray(items) ? items : [])
          .map((employee) => {
            const job = getEmployeeJob(employee);
            const contact = getEmployeeContact(employee);
            const meta = getEmployeeMeta(employee);
            const role = normalizeRoleLabel(job.employeeCategory || job.category || job.position || employee.role || employee.position || 'Staff');
            const userId = String(employee.userId || meta.userId || '').trim();
            const name = getEmployeeName(employee);
            const profileImage = resolveAvatarSrc(getEmployeeProfileImage(employee), name);
            const status = String(job.status || employee.status || '').trim() || 'Active';

            return {
              ...employee,
              id: employee.id || employee.employeeId,
              employeeId: employee.employeeId || employee.id || '',
              userId,
              name,
              role,
              department: job.department || employee.department || 'Unassigned',
              status,
              email: contact.email || contact.altEmail || employee.email || '',
              phone: contact.phone1 || contact.phone || contact.phone2 || employee.phone || '',
              profileImage,
            };
          })
          .filter((employee) => employee.userId)
          .filter((employee) => employee.userId !== adminUserId)
          .filter((employee) => isEmployeeActive(employee))
          .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));

        let snapshot = await getEmployeesSnapshot(EMPLOYEE_CONTACTS_CACHE_TTL_MS);
        if (cancelled) return;

        let normalized = buildChatContacts(snapshot);
        const shouldForceFreshFetch =
          !Array.isArray(snapshot) || snapshot.length === 0 || normalized.length === 0;

        if (shouldForceFreshFetch) {
          snapshot = await getEmployeesSnapshot(0);
          if (cancelled) return;
          normalized = buildChatContacts(snapshot);
        }

        setEmployees(normalized);
        if (!normalized.length && Array.isArray(snapshot) && snapshot.length > 0) {
          setContactError('Only active employees with linked user accounts are available in chat.');
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) setContactError('Employee contacts could not be loaded.');
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    }

    loadEmployees();
    return () => { cancelled = true; };
  }, [adminUserId]);

  const roleFilters = useMemo(
    () => ['all', ...new Set(employees.map((employee) => normalizeRoleFilterLabel(employee.role)).filter(Boolean))],
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    const activeRoleFilter = selectedRoleFilter === 'all' ? 'all' : normalizeRoleFilterLabel(selectedRoleFilter);

    return employees.filter((employee) => {
      if (activeRoleFilter !== 'all' && normalizeRoleFilterLabel(employee.role).toLowerCase() !== String(activeRoleFilter || '').toLowerCase()) {
        return false;
      }
      if (!query) return true;
      return [employee.name, employee.department, employee.role, employee.employeeId, employee.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [employees, searchText, selectedRoleFilter]);

  const orderedFilteredEmployees = useMemo(() => {
    if (!selectedChatUser?.userId) return filteredEmployees;
    return [...filteredEmployees].sort((left, right) => {
      if (left.userId === selectedChatUser.userId) return -1;
      if (right.userId === selectedChatUser.userId) return 1;
      return 0;
    });
  }, [filteredEmployees, selectedChatUser]);

  useEffect(() => {
    const element = contactListRef.current;
    if (!element) return undefined;

    const syncContactListMetrics = () => {
      setContactListScrollTop(element.scrollTop || 0);
      setContactListViewportHeight(element.clientHeight || 0);
    };

    syncContactListMetrics();

    if (typeof ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(syncContactListMetrics);
      resizeObserver.observe(element);
      return () => resizeObserver.disconnect();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncContactListMetrics);
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('resize', syncContactListMetrics);
    };
  }, [orderedFilteredEmployees.length, searchText, selectedRoleFilter]);

  const activeUnreadUserIds = useMemo(
    () => Object.entries(unreadCounts || {})
      .filter(([, count]) => Number(count || 0) > 0)
      .slice(0, UNREAD_PRIORITY_LIMIT)
      .map(([userId]) => String(userId || '').trim())
      .filter(Boolean),
    [unreadCounts]
  );

  const unreadRefreshUserIds = useMemo(
    () => dedupeUserIds([
      selectedChatUser?.userId,
      ...activeUnreadUserIds,
      ...orderedFilteredEmployees.slice(0, UNREAD_PRIORITY_LIMIT).map((employee) => employee.userId),
    ]),
    [activeUnreadUserIds, orderedFilteredEmployees, selectedChatUser]
  );

  const visiblePresenceEmployees = useMemo(() => {
    if (!orderedFilteredEmployees.length) return [];
    const viewportHeight = Math.max(contactListViewportHeight, CONTACT_LIST_ROW_HEIGHT * 6);
    const visibleRowCount = Math.max(8, Math.ceil(viewportHeight / CONTACT_LIST_ROW_HEIGHT));
    const startIndex = Math.max(0, Math.floor(contactListScrollTop / CONTACT_LIST_ROW_HEIGHT) - CONTACT_LIST_BUFFER_ROWS);
    const endIndex = Math.min(
      orderedFilteredEmployees.length,
      startIndex + visibleRowCount + (CONTACT_LIST_BUFFER_ROWS * 2)
    );
    return orderedFilteredEmployees.slice(startIndex, endIndex);
  }, [contactListScrollTop, contactListViewportHeight, orderedFilteredEmployees]);

  const visiblePresenceUserIds = useMemo(
    () => dedupeUserIds([selectedChatUser?.userId, ...visiblePresenceEmployees.map((employee) => employee.userId)]),
    [selectedChatUser, visiblePresenceEmployees]
  );

  // Auto-select an employee when a contact/chatId arrives via location.state
  useEffect(() => {
    if (!employees.length) return;

    const matchedEmployee = employees.find((employee) => {
      if (incomingContactUserId && employee.userId === incomingContactUserId) return true;
      if (incomingChatId && adminUserId && sortedChatId(adminUserId, employee.userId) === incomingChatId) return true;
      return false;
    });

    if (!matchedEmployee) return;

    setSelectedChatUser((current) => {
      if (current?.userId === matchedEmployee.userId
        && current?.name === matchedEmployee.name
        && current?.role === matchedEmployee.role
        && current?.department === matchedEmployee.department
        && current?.profileImage === matchedEmployee.profileImage) return current;
      return matchedEmployee;
    });
  }, [adminUserId, employees, incomingChatId, incomingContactUserId]);

  // Clear selected user if it no longer exists in the loaded list
  useEffect(() => {
    if (!selectedChatUser?.userId) return;
    if (employees.some((employee) => employee.userId === selectedChatUser.userId)) return;
    setSelectedChatUser(null);
  }, [employees, selectedChatUser]);

  // Bulk load chat summaries when employees list changes
  useEffect(() => {
    if (!adminUserId || !employees.length) {
      setChatSummariesByUserId({});
      setUnreadCounts({});
      return undefined;
    }

    let cancelled = false;

    loadChatSummariesForContacts({
      db,
      schoolPath,
      ownerUserId: adminUserId,
      contacts: employees.map((employee) => ({ userId: employee.userId })),
    })
      .then((entries) => {
        if (!cancelled) {
          const summaryMap = entries.reduce((accumulator, entry) => {
            accumulator[entry.userId] = entry;
            return accumulator;
          }, {});
          setChatSummariesByUserId(summaryMap);
          setUnreadCounts(employees.reduce((accumulator, employee) => {
            accumulator[employee.userId] = Number(summaryMap[employee.userId]?.unreadCount || 0);
            return accumulator;
          }, {}));
        }
      })
      .catch((error) => {
        console.error('Failed to load chat summaries:', error);
        if (!cancelled) { setChatSummariesByUserId({}); setUnreadCounts({}); }
      });

    return () => { cancelled = true; };
  }, [adminUserId, db, employees, schoolCode]);

  // Periodic refresh of summaries for active/priority user IDs
  useEffect(() => {
    if (!adminUserId || !unreadRefreshUserIds.length) return undefined;

    let cancelled = false;

    const refreshChatSummaries = () => {
      if (!isPageVisible()) return Promise.resolve();
      return loadChatSummariesForContacts({
        db,
        schoolPath,
        ownerUserId: adminUserId,
        contacts: unreadRefreshUserIds.map((userId) => ({ userId })),
      })
        .then((entries) => {
          if (!cancelled) {
            const summaryMap = entries.reduce((accumulator, entry) => {
              accumulator[entry.userId] = entry;
              return accumulator;
            }, {});
            const unreadMap = unreadRefreshUserIds.reduce((accumulator, userId) => {
              accumulator[userId] = Number(summaryMap[userId]?.unreadCount || 0);
              return accumulator;
            }, {});
            setChatSummariesByUserId((previous) => ({ ...previous, ...summaryMap }));
            setUnreadCounts((previous) => ({ ...previous, ...unreadMap }));
          }
        })
        .catch((error) => console.error('Failed to refresh chat summaries:', error));
    };

    refreshChatSummaries().catch(() => {});
    const intervalId = window.setInterval(() => { refreshChatSummaries().catch(() => {}); }, UNREAD_REFRESH_INTERVAL_MS);
    const handleVisibilityChange = () => { if (isPageVisible()) refreshChatSummaries().catch(() => {}); };

    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [adminUserId, db, schoolCode, unreadRefreshUserIds]);

  const updateContactListScrollTop = useCallback((nextTop) => {
    setContactListScrollTop(nextTop || 0);
  }, []);

  return {
    employees,
    loadingContacts,
    contactError,
    searchText,
    setSearchText,
    selectedRoleFilter,
    setSelectedRoleFilter,
    selectedChatUser,
    setSelectedChatUser,
    roleFilters,
    filteredEmployees,
    orderedFilteredEmployees,
    visiblePresenceUserIds,
    chatSummariesByUserId,
    setChatSummariesByUserId,
    unreadCounts,
    setUnreadCounts,
    contactListRef,
    updateContactListScrollTop,
  };
}
