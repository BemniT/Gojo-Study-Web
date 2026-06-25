export const MOCK_EMPLOYEES = {};
export const EMPLOYEE_SUMMARY_CACHE_TTL_MS = 5 * 60 * 1000;

export function isEmployeeTerminatedRecord(value) {
  const raw = value || {};
  const employment = raw.employment || raw.profileData?.employment || {};
  const job = { ...(raw.job || raw.profileData?.job || {}), ...employment };
  const statusText = String(job.status || raw.status || '').trim().toLowerCase();
  return Boolean(raw.terminated) || Boolean(raw.termination?.terminatedAt) || statusText.includes('terminated');
}

export function normalizeEmployeeRecord(id, value) {
  const raw = value || {};
  const personal = raw.personal || raw.profileData?.personal || {};
  const employment = raw.employment || raw.profileData?.employment || {};
  const job = { ...(raw.job || raw.profileData?.job || {}), ...employment };
  const contact = raw.contact || raw.profileData?.contact || {};
  const name = raw.fullName || raw.name || [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ') || 'Employee';
  const role = raw.position || raw.role || job.position || job.employeeCategory || job.category || 'Staff';
  const roleId = raw.teacherId || raw.managementId || raw.financeId || raw.hrId || raw.schoolAdminId || raw.adminId || '';
  const department = raw.department || job.department || 'Unassigned';
  const joined = raw.hireDate || job.hireDate || job.dateJoined || job.contractStartDate || '';
  const status = (job.status || raw.status || (raw.deactivated || raw.isActive === false ? 'Inactive' : 'Active') || '').toString();
  const image = String(raw.profileImage || personal.profileImage || personal.profileImageName || raw.profileData?.personal?.profileImage || raw.profileData?.personal?.profileImageName || '').trim();
  const phone = raw.phone || contact.phone1 || contact.phone || contact.phone2 || contact.altPhone || '';
  const email = raw.email || contact.email || contact.altEmail || '';
  const deptPos = [department, raw.position || job.position].filter(Boolean).join(' / ');
  const statusText = status.toString().toLowerCase();
  const isTerminated = isEmployeeTerminatedRecord(raw);
  const isDeactivated = !isTerminated && Boolean(raw.deactivated || raw.isActive === false || statusText.includes('inactive') || statusText.includes('deactivated'));
  const normalizedRole = role.toString().toLowerCase();
  const filterKey = raw.hrId || normalizedRole.includes('human resource') || normalizedRole === 'hr'
    ? 'hr'
    : raw.financeId || normalizedRole.includes('finance') || normalizedRole.includes('account')
      ? 'finance'
      : raw.teacherId || normalizedRole.includes('teacher')
        ? 'teacher'
        : raw.managementId || raw.schoolAdminId || normalizedRole.includes('management') || normalizedRole.includes('director') || normalizedRole.includes('manager') || normalizedRole.includes('principal')
          ? 'management'
          : 'other';

  return {
    id,
    raw,
    personal,
    job,
    contact,
    name,
    role,
    roleId,
    department,
    joined,
    status,
    image,
    phone,
    email,
    deptPos,
    filterKey,
    isActive: !isTerminated && !isDeactivated,
    isTerminated,
    isDeactivated,
    searchIndex: [id, name, role, roleId, department, phone, email].filter(Boolean).join(' ').toLowerCase(),
  };
}

export function mapDataToList(data) {
  if (Array.isArray(data)) {
    return data.map((item, index) =>
      normalizeEmployeeRecord(item?.id || item?.employeeId || `employee-${index}`, item)
    );
  }
  return Object.entries(data || {}).map(([id, value]) => normalizeEmployeeRecord(id, value));
}

export function formatJoinedDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function applyTerminationToSnapshot(snapshot, employeeId, actorId, formValues) {
  const terminatedAt = new Date().toISOString();
  const nextTermination = {
    reason: formValues.reason,
    note: formValues.note,
    lastWorkingDate: formValues.lastWorkingDate,
    terminatedAt,
    terminatedBy: actorId || '',
    accessRevokedAt: terminatedAt,
  };

  const patchEmployee = (employee) => {
    const nextEmployee = { ...(employee || {}) };
    nextEmployee.terminated = true;
    nextEmployee.terminatedAt = terminatedAt;
    nextEmployee.terminatedBy = actorId || '';
    nextEmployee.termination = nextTermination;
    delete nextEmployee.status;
    delete nextEmployee.isActive;

    const stampJob = (node) => ({ ...node, status: 'Terminated', lastWorkingDate: formValues.lastWorkingDate });

    if (nextEmployee.job && typeof nextEmployee.job === 'object') {
      nextEmployee.job = stampJob(nextEmployee.job);
      delete nextEmployee.job.isActive;
    }

    if (nextEmployee.employment && typeof nextEmployee.employment === 'object') {
      nextEmployee.employment = stampJob(nextEmployee.employment);
      delete nextEmployee.employment.isActive;
    }

    if (nextEmployee.profileData?.job && typeof nextEmployee.profileData.job === 'object') {
      nextEmployee.profileData = { ...nextEmployee.profileData, job: stampJob(nextEmployee.profileData.job) };
      delete nextEmployee.profileData.job.isActive;
    }

    if (nextEmployee.profileData?.employment && typeof nextEmployee.profileData.employment === 'object') {
      nextEmployee.profileData = { ...nextEmployee.profileData, employment: stampJob(nextEmployee.profileData.employment) };
      delete nextEmployee.profileData.employment.isActive;
    }

    return nextEmployee;
  };

  if (Array.isArray(snapshot)) {
    return snapshot.map((employee) => {
      const currentEmployeeId = employee?.id || employee?.employeeId || employee?.raw?.employeeId;
      return String(currentEmployeeId) === String(employeeId) ? patchEmployee(employee) : employee;
    });
  }

  return Object.fromEntries(
    Object.entries(snapshot || {}).map(([currentEmployeeId, employee]) => [
      currentEmployeeId,
      String(currentEmployeeId) === String(employeeId) ? patchEmployee(employee) : employee,
    ])
  );
}
