import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api';
import {
  getDepartmentsSnapshot,
  getPositionsSnapshot,
  setDepartmentsSnapshot,
  setPositionsSnapshot,
} from '../../hrData';
import { createInitialReferenceForms } from '../../utils/registerForm';

export default function useReferenceManager({ onCreateDepartment, onCreatePosition } = {}) {
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [referenceError, setReferenceError] = useState('');
  const [referenceForms, setReferenceForms] = useState(() => createInitialReferenceForms());
  const [referenceStatus, setReferenceStatus] = useState({ type: '', message: '' });
  const [referenceSubmitting, setReferenceSubmitting] = useState({ department: false, position: false });
  const [isReferenceManagerExpanded, setIsReferenceManagerExpanded] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [nextDepartments, nextPositions] = await Promise.all([
          getDepartmentsSnapshot(),
          getPositionsSnapshot(),
        ]);
        setDepartments(nextDepartments);
        setPositions(nextPositions);
        setDepartmentsSnapshot(nextDepartments);
        setPositionsSnapshot(nextPositions);
        setReferenceError('');
      } catch (error) {
        console.error(error);
        setReferenceError('Departments and positions could not be loaded. You can still continue with manual values if needed.');
      }
    })();
  }, []);

  const reloadReferenceData = useCallback(async () => {
    const [departmentsResponse, positionsResponse] = await Promise.all([
      api.get('/departments'),
      api.get('/positions'),
    ]);

    const nextDepartments = Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : [];
    const nextPositions = Array.isArray(positionsResponse?.data) ? positionsResponse.data : [];

    setDepartments(nextDepartments);
    setPositions(nextPositions);
    setDepartmentsSnapshot(nextDepartments);
    setPositionsSnapshot(nextPositions);
    setReferenceError('');

    return { nextDepartments, nextPositions };
  }, []);

  const setReferenceFormValue = useCallback((section, key, value) => {
    setReferenceForms((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: value } }));
    setReferenceStatus((prev) => (prev.message ? { type: '', message: '' } : prev));
  }, []);

  const toggleReferenceManager = useCallback(() => {
    setIsReferenceManagerExpanded((prev) => !prev);
  }, []);

  const handleCreateDepartment = useCallback(async () => {
    const name = String(referenceForms.department.name || '').trim();
    const description = String(referenceForms.department.description || '').trim();
    const status = String(referenceForms.department.status || 'active').trim().toLowerCase() || 'active';

    if (!name) {
      setReferenceStatus({ type: 'error', message: 'Department name is required.' });
      return;
    }

    setReferenceSubmitting((prev) => ({ ...prev, department: true }));
    try {
      const response = await api.post('/departments', { name, description, status });
      const createdDepartment = response?.data || {};
      await reloadReferenceData();
      setReferenceForms((prev) => ({
        department: createInitialReferenceForms().department,
        position: {
          ...(prev.position || {}),
          departmentId: createdDepartment.id || prev.position?.departmentId || '',
        },
      }));
      onCreateDepartment?.(createdDepartment);
      setReferenceStatus({ type: 'success', message: `${createdDepartment.name || 'Department'} created successfully.` });
    } catch (error) {
      console.error(error);
      const serverError = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Unable to create department.';
      setReferenceStatus({ type: 'error', message: serverError });
    } finally {
      setReferenceSubmitting((prev) => ({ ...prev, department: false }));
    }
  }, [onCreateDepartment, referenceForms.department, reloadReferenceData]);

  const handleCreatePosition = useCallback(async () => {
    const name = String(referenceForms.position.name || '').trim();
    const departmentId = String(referenceForms.position.departmentId || '').trim();

    if (!departmentId) {
      setReferenceStatus({ type: 'error', message: 'Select a department before creating a position.' });
      return;
    }
    if (!name) {
      setReferenceStatus({ type: 'error', message: 'Position name is required.' });
      return;
    }

    setReferenceSubmitting((prev) => ({ ...prev, position: true }));
    try {
      const response = await api.post('/positions', { name, departmentId });
      const createdPosition = response?.data || {};
      const { nextDepartments } = await reloadReferenceData();
      const linkedDepartment = nextDepartments.find((item) => String(item.id) === String(departmentId));
      setReferenceForms((prev) => ({
        ...prev,
        position: { ...(prev.position || {}), name: '', departmentId },
      }));
      onCreatePosition?.({ createdPosition, linkedDepartment, departmentId });
      setReferenceStatus({ type: 'success', message: `${createdPosition.name || 'Position'} created successfully.` });
    } catch (error) {
      console.error(error);
      const serverError = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Unable to create position.';
      setReferenceStatus({ type: 'error', message: serverError });
    } finally {
      setReferenceSubmitting((prev) => ({ ...prev, position: false }));
    }
  }, [onCreatePosition, referenceForms.position, reloadReferenceData]);

  const departmentOptions = useMemo(
    () => departments.filter((item) => String(item?.status || 'active').toLowerCase() !== 'inactive'),
    [departments]
  );

  return {
    departments,
    positions,
    departmentOptions,
    referenceError,
    referenceForms,
    referenceStatus,
    referenceSubmitting,
    isReferenceManagerExpanded,
    setReferenceFormValue,
    toggleReferenceManager,
    handleCreateDepartment,
    handleCreatePosition,
  };
}
