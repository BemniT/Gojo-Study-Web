import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import { getEmployeesSnapshot, setEmployeesSnapshot } from '../../hrData';
import { isEmployeeTerminatedRecord } from '../../utils/employeeData';

const normalizeTerminations = (data) => {
  const list = Array.isArray(data)
    ? data
    : Object.entries(data || {}).map(([id, payload]) => ({ ...(payload || {}), id }));

  return list
    .map((record) => ({
      ...record,
      _name: record?.employeeName || 'Employee',
      _department: record?.department || 'Unassigned',
      _position: record?.position || 'Staff',
      _profileImage: record?.profileImage || '',
      _terminationReason: record?.reason || 'Not recorded',
      _terminationNote: record?.note || '',
      _terminatedAt: record?.createdAt || record?.date || '—',
      _terminatedBy: record?.terminatedByName || record?.terminatedBy || '—',
      _lastWorkingDate: record?.date || '—',
    }))
    .sort((leftItem, rightItem) => {
      const leftDate = Date.parse(leftItem._terminatedAt);
      const rightDate = Date.parse(rightItem._terminatedAt);
      if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate) && leftDate !== rightDate) {
        return rightDate - leftDate;
      }
      return leftItem._name.localeCompare(rightItem._name);
    });
};

export default function useTerminatedEmployees({ getAdminIdPayload }) {
  const [terminatedEmployees, setTerminatedEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadTerminationArchive = useCallback(async ({ showError = true } = {}) => {
    setIsLoading(true);
    if (showError) setErrorMessage('');

    try {
      const response = await api.get('/employee-terminations');
      setTerminatedEmployees(normalizeTerminations(response.data || []));
    } catch (error) {
      console.error(error);
      setTerminatedEmployees([]);
      if (showError) setErrorMessage('Failed to load terminated employees.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTerminationArchive();
  }, [loadTerminationArchive]);

  const summary = useMemo(() => {
    const total = terminatedEmployees.length;
    const departments = new Set(
      terminatedEmployees.map((employee) => employee._department).filter(Boolean)
    ).size;
    const recent = terminatedEmployees.filter((employee) => {
      const parsed = employee._terminatedAt && employee._terminatedAt !== '—' ? new Date(employee._terminatedAt) : null;
      return parsed && !Number.isNaN(parsed.getTime()) && (Date.now() - parsed.getTime()) / 86400000 <= 30;
    }).length;
    return { total, departments, recent };
  }, [terminatedEmployees]);

  const recoverCompletedReactivation = useCallback(async (employeeId) => {
    try {
      const snapshot = await getEmployeesSnapshot(0);
      const snapshotList = Array.isArray(snapshot)
        ? snapshot
        : Object.entries(snapshot || {}).map(([id, payload]) => ({ ...(payload || {}), id }));
      const matchedEmployee = snapshotList.find(
        (employee) => String(employee?.id || employee?.employeeId) === String(employeeId)
      );

      if (matchedEmployee && !isEmployeeTerminatedRecord(matchedEmployee)) {
        setEmployeesSnapshot(snapshot);
        setTerminatedEmployees((current) => current.filter((employee) => String(employee.employeeId) !== String(employeeId)));
        return true;
      }
    } catch (error) {
      console.error('Failed to refresh employees after reactivation.', error);
    }

    try {
      const response = await api.get(`/employees/${employeeId}`);
      if (!isEmployeeTerminatedRecord(response.data)) {
        setTerminatedEmployees((current) => current.filter((employee) => String(employee.employeeId) !== String(employeeId)));
        return true;
      }
    } catch (error) {
      console.error('Failed to verify raw employee reactivation state.', error);
    }

    return false;
  }, []);

  const reactivate = useCallback(async (employeeId) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      await api.post(`/employees/${employeeId}/reactivate`, getAdminIdPayload());

      setTerminatedEmployees((current) => current.filter((employee) => String(employee.employeeId) !== String(employeeId)));

      try {
        const snapshot = await getEmployeesSnapshot(0);
        setEmployeesSnapshot(snapshot);
      } catch (error) {
        console.error('Failed to refresh employee summaries after reactivation.', error);
      }

      await loadTerminationArchive({ showError: false });
    } catch (error) {
      console.error(error);
      const recovered = await recoverCompletedReactivation(employeeId);
      if (recovered) {
        setErrorMessage('');
        return;
      }
      setErrorMessage('Failed to reactivate employee.');
    } finally {
      setIsLoading(false);
    }
  }, [getAdminIdPayload, loadTerminationArchive, recoverCompletedReactivation]);

  return {
    terminatedEmployees,
    isLoading,
    errorMessage,
    summary,
    loadTerminationArchive,
    reactivate,
  };
}
