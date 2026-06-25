import { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import { getEmployeesSnapshot, setEmployeesSnapshot } from '../../hrData';
import {
  EMPLOYEE_SUMMARY_CACHE_TTL_MS,
  MOCK_EMPLOYEES,
  applyTerminationToSnapshot,
  isEmployeeTerminatedRecord,
  mapDataToList,
} from '../../utils/employeeData';

const EMPTY_TERMINATION_MODAL = {
  open: false,
  employee: null,
  isSubmitting: false,
  error: '',
  reason: '',
  note: '',
  lastWorkingDate: '',
};

const EMPTY_DEACTIVATION_NOTICE = { open: false, employee: null };

export default function useEmployeesList({ admin }) {
  const [employees, setEmployees] = useState([]);
  const [terminationModal, setTerminationModal] = useState(EMPTY_TERMINATION_MODAL);
  const [deactivationNotice, setDeactivationNotice] = useState(EMPTY_DEACTIVATION_NOTICE);

  const load = useCallback(async () => {
    try {
      const snapshot = await getEmployeesSnapshot(EMPLOYEE_SUMMARY_CACHE_TTL_MS);
      const list = mapDataToList(snapshot);
      const hasData = (Array.isArray(list) && list.length) || (!Array.isArray(list) && Object.keys(list || {}).length);
      setEmployees(hasData ? list : mapDataToList(MOCK_EMPLOYEES));
    } catch (e) {
      console.error(e);
      setEmployees(mapDataToList(MOCK_EMPLOYEES));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recoverCompletedTermination = useCallback(async (employeeId, actorId, formValues) => {
    let latestSnapshot = null;

    try {
      latestSnapshot = await getEmployeesSnapshot(0);
      const latestList = mapDataToList(latestSnapshot);
      const latestEmployee = latestList.find((employee) => String(employee.id) === String(employeeId));
      if (!latestEmployee || latestEmployee.isTerminated) {
        setEmployeesSnapshot(latestSnapshot);
        setEmployees(latestList);
        return true;
      }
    } catch (error) {
      console.error('Failed to refresh employee summaries after termination.', error);
    }

    try {
      const response = await api.get(`/employees/${employeeId}`);
      if (!isEmployeeTerminatedRecord(response.data)) return false;

      if (Array.isArray(latestSnapshot)) {
        const patchedSnapshot = applyTerminationToSnapshot(latestSnapshot, employeeId, actorId, formValues);
        setEmployeesSnapshot(patchedSnapshot);
        setEmployees(mapDataToList(patchedSnapshot));
      } else {
        setEmployees((current) => current.filter((employee) => String(employee.id) !== String(employeeId)));
      }

      return true;
    } catch (error) {
      console.error('Failed to verify raw employee termination state.', error);
      return false;
    }
  }, []);

  const resolveHrId = useCallback(
    () => admin?.hrId || admin?.hrID || admin?.adminId || admin?.adminID || admin?.id || admin?.userId,
    [admin]
  );

  const confirmTerminateEmployee = useCallback(async () => {
    if (!terminationModal.employee || !terminationModal.reason.trim()) {
      setTerminationModal((previous) => ({ ...previous, error: 'Select a termination reason before continuing.' }));
      return;
    }

    try {
      setTerminationModal((previous) => ({ ...previous, isSubmitting: true, error: '' }));
      const employeeId = terminationModal.employee.id;
      const hrId = resolveHrId();
      const payload = {
        hrId,
        terminationReason: terminationModal.reason,
        terminationNote: terminationModal.note,
        lastWorkingDate: terminationModal.lastWorkingDate,
      };
      await api.post(`/employees/${employeeId}/terminate`, payload);

      try {
        const freshSnapshot = await getEmployeesSnapshot(0);
        const nextSnapshot = applyTerminationToSnapshot(freshSnapshot, employeeId, hrId, terminationModal);
        setEmployeesSnapshot(nextSnapshot);
        setEmployees(mapDataToList(nextSnapshot));
      } catch (refreshError) {
        console.error('Failed to refresh employee list after termination.', refreshError);
        setEmployees((current) => current.filter((employee) => String(employee.id) !== String(employeeId)));
      }

      setTerminationModal(EMPTY_TERMINATION_MODAL);
    } catch (e) {
      console.error(e);
      if (e?.response?.data?.requiresAcademicDeactivation) {
        const employee = terminationModal.employee;
        setTerminationModal(EMPTY_TERMINATION_MODAL);
        setDeactivationNotice({ open: true, employee });
        return;
      }

      const employeeId = terminationModal.employee?.id;
      const hrId = resolveHrId();
      if (employeeId) {
        const recovered = await recoverCompletedTermination(employeeId, hrId, terminationModal);
        if (recovered) {
          setTerminationModal(EMPTY_TERMINATION_MODAL);
          return;
        }
      }

      setTerminationModal((previous) => ({ ...previous, isSubmitting: false, error: 'Failed to terminate employee. Please try again.' }));
    }
  }, [recoverCompletedTermination, resolveHrId, terminationModal]);

  const openTerminationModal = useCallback((employee) => {
    setTerminationModal({
      open: true,
      employee,
      isSubmitting: false,
      error: '',
      reason: employee.department || employee.role || 'Restructuring',
      note: '',
      lastWorkingDate: new Date().toISOString().slice(0, 10),
    });
  }, []);

  const closeTerminationModal = useCallback(() => {
    setTerminationModal(EMPTY_TERMINATION_MODAL);
  }, []);

  const handleTerminateAction = useCallback((employee) => {
    if (employee.filterKey === 'teacher' && employee.isActive) {
      setDeactivationNotice({ open: true, employee });
      return;
    }
    openTerminationModal(employee);
  }, [openTerminationModal]);

  const closeDeactivationNotice = useCallback(() => {
    setDeactivationNotice(EMPTY_DEACTIVATION_NOTICE);
  }, []);

  return {
    employees,
    load,
    terminationModal,
    setTerminationModal,
    openTerminationModal,
    closeTerminationModal,
    confirmTerminateEmployee,
    handleTerminateAction,
    deactivationNotice,
    closeDeactivationNotice,
  };
}
