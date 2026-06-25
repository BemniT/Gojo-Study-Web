import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api';
import { getEmployeeJob, getEmployeeName, getEmployeeProfileImage, getEmployeesSnapshot } from '../../hrData';
import {
  ATTENDANCE_AUTOSAVE_STORAGE_KEY,
  ATTENDANCE_EMPLOYEES_CACHE_TTL_MS,
  createAttendanceSignature,
  normalizeAttendanceMap,
  normalizeAttendanceStatus,
  toIsoDate,
} from '../../utils/attendanceData';

const getInitials = (name) => (name || 'Employee')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part.charAt(0).toUpperCase())
  .join('') || 'E';

export default function useAttendance({ markedBy }) {
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [employees, setEmployees] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(ATTENDANCE_AUTOSAVE_STORAGE_KEY);
      return stored == null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [autoSaveState, setAutoSaveState] = useState('idle');

  const userEditedAttendanceRef = useRef(false);
  const lastSavedSignatureRef = useRef('');

  const isBusy = isLoading || isSaving || isAutoSaving;

  // ---- Derived ----------------------------------------------------------
  const positions = useMemo(() => {
    const set = new Set();
    (employees || []).forEach((employee) => {
      const job = getEmployeeJob(employee);
      const pos = job.position || employee.position || employee.role || 'Staff';
      if (pos) set.add(pos);
    });
    return Array.from(set).sort();
  }, [employees]);

  const normalizedEmployees = useMemo(() => {
    const list = (employees || [])
      .filter((employee) => {
        const status = (employee.status || employee?.job?.status || employee?.profileData?.job?.status || '').toString().toLowerCase();
        const isActive = typeof employee.isActive === 'boolean' ? employee.isActive : true;
        return status !== 'terminated' && isActive !== false;
      })
      .map((employee) => {
        const job = getEmployeeJob(employee);
        const name = getEmployeeName(employee);
        const avatar = getEmployeeProfileImage(employee);
        return {
          ...employee,
          _name: name,
          _avatar: avatar,
          _initials: getInitials(name),
          _department: job.department || employee.department || 'Unassigned',
          _position: job.position || employee.position || employee.role || 'Staff',
        };
      });

    let filtered = selectedPosition ? list.filter((e) => e._position === selectedPosition) : list;
    if (searchTerm && searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((e) => (e._name || '').toLowerCase().includes(query) || (e.id || '').toLowerCase().includes(query));
    }
    return filtered.sort((a, b) => a._name.localeCompare(b._name));
  }, [employees, selectedPosition, searchTerm]);

  const attendanceStats = useMemo(() => normalizedEmployees.reduce(
    (stats, employee) => {
      const employeeId = employee.id;
      stats.total += 1;

      if (!Object.prototype.hasOwnProperty.call(attendance || {}, employeeId)) {
        stats.unset += 1;
        return stats;
      }

      const record = attendance?.[employeeId] || {};
      const status = normalizeAttendanceStatus(record.status || (record.present ? 'present' : 'absent'));

      if (status === 'present') stats.present += 1;
      else if (status === 'late') stats.late += 1;
      else if (status === 'absent') stats.absent += 1;
      else stats.unset += 1;

      return stats;
    },
    { total: 0, present: 0, late: 0, absent: 0, unset: 0 },
  ), [attendance, normalizedEmployees]);

  // ---- Side effects -----------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getEmployeesSnapshot(ATTENDANCE_EMPLOYEES_CACHE_TTL_MS);
        setEmployees(snapshot);
      } catch (e) {
        console.error(e);
        setEmployees([]);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ATTENDANCE_AUTOSAVE_STORAGE_KEY, autoSaveEnabled ? 'true' : 'false');
    } catch {
      // Ignore storage persistence errors
    }
    if (!autoSaveEnabled) setAutoSaveState('idle');
  }, [autoSaveEnabled]);

  useEffect(() => {
    userEditedAttendanceRef.current = false;
    setAutoSaveState('idle');
  }, [selectedDate]);

  useEffect(() => {
    async function loadAttendance() {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      try {
        const response = await api.get('/api/employee_attendance', { params: { date: selectedDate } });
        const withStatus = normalizeAttendanceMap(response.data?.attendance);
        setAttendance(withStatus);
        lastSavedSignatureRef.current = createAttendanceSignature(selectedDate, withStatus);
        userEditedAttendanceRef.current = false;
        setAutoSaveState('idle');
      } catch (e) {
        console.error(e);
        setAttendance({});
        lastSavedSignatureRef.current = createAttendanceSignature(selectedDate, {});
        userEditedAttendanceRef.current = false;
        setAutoSaveState('idle');
        setErrorMessage('Failed to load attendance for the selected date.');
      } finally {
        setIsLoading(false);
      }
    }

    if (selectedDate) loadAttendance();
  }, [selectedDate]);

  // ---- Mutations --------------------------------------------------------
  const handleSetStatus = useCallback((employeeId, status) => {
    const finalStatus = normalizeAttendanceStatus(status) || 'absent';
    const present = finalStatus !== 'absent';
    userEditedAttendanceRef.current = true;
    setErrorMessage('');
    setSuccessMessage('');
    if (autoSaveEnabled) setAutoSaveState('pending');
    setAttendance((previous) => ({
      ...(previous || {}),
      [employeeId]: { ...(previous?.[employeeId] || {}), present, status: finalStatus },
    }));
  }, [autoSaveEnabled]);

  const handleSave = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsAutoSaving(true);
      setAutoSaveState('saving');
    } else {
      setIsSaving(true);
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const nextSignature = createAttendanceSignature(selectedDate, attendance);
      const payload = { date: selectedDate, markedBy, attendance };
      const response = await api.post('/api/employee_attendance', payload);
      const savedCount = response.data?.savedCount;
      lastSavedSignatureRef.current = nextSignature;
      userEditedAttendanceRef.current = false;
      setAutoSaveState('saved');

      if (!silent) {
        setSuccessMessage(typeof savedCount === 'number' ? `Saved ${savedCount} records.` : 'Saved attendance.');
      }
      return true;
    } catch (e) {
      console.error(e);
      setAutoSaveState('error');
      setErrorMessage(silent ? 'Auto-save failed. Use Save Attendance.' : 'Failed to save attendance.');
      return false;
    } finally {
      if (silent) setIsAutoSaving(false); else setIsSaving(false);
    }
  }, [attendance, markedBy, selectedDate]);

  // Autosave debounce
  useEffect(() => {
    if (!autoSaveEnabled || !selectedDate || isLoading || isSaving || isAutoSaving) return undefined;
    if (!userEditedAttendanceRef.current) return undefined;

    const nextSignature = createAttendanceSignature(selectedDate, attendance);
    if (nextSignature === lastSavedSignatureRef.current) {
      userEditedAttendanceRef.current = false;
      setAutoSaveState('saved');
      return undefined;
    }

    setAutoSaveState('pending');
    const timeoutId = window.setTimeout(() => {
      handleSave({ silent: true }).catch(console.error);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [attendance, autoSaveEnabled, handleSave, isAutoSaving, isLoading, isSaving, selectedDate]);

  const autoSaveLabel = autoSaveEnabled
    ? autoSaveState === 'saving' ? 'Auto-saving changes...'
    : autoSaveState === 'saved' ? 'Changes save automatically'
    : autoSaveState === 'error' ? 'Auto-save needs attention'
    : 'Changes will save automatically'
    : 'Manual save only';

  const clearFilters = useCallback(() => {
    setSelectedPosition('');
    setSearchTerm('');
  }, []);

  return {
    // employees + filters
    employees,
    normalizedEmployees,
    positions,
    selectedDate,
    setSelectedDate,
    selectedPosition,
    setSelectedPosition,
    searchTerm,
    setSearchTerm,
    clearFilters,

    // attendance + statuses
    attendance,
    attendanceStats,
    handleSetStatus,

    // save state
    isLoading,
    isSaving,
    isAutoSaving,
    isBusy,
    errorMessage,
    successMessage,
    autoSaveEnabled,
    setAutoSaveEnabled,
    autoSaveState,
    autoSaveLabel,
    handleSave,
  };
}
