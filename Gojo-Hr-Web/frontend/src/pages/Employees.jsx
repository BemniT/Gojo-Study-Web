import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaBuilding, FaChalkboardTeacher, FaCog, FaFacebookMessenger, FaFilter, FaSearch, FaUsers, FaUserTie } from 'react-icons/fa';
import EmployeeDetailPanel from '../components/EmployeeDetailPanel';
import AvatarBadge from '../components/AvatarBadge';
import TerminationModal from '../components/employees/TerminationModal';
import TeacherDeactivationNoticeModal from '../components/employees/TeacherDeactivationNoticeModal';
import useHrSession from '../hooks/auth/useHrSession';
import useEmployeesList from '../hooks/employees/useEmployeesList';
import { formatJoinedDate } from '../utils/employeeData';

const headerActionStyle = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 38,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid var(--border-soft, #dbe2f2)',
  background: 'var(--surface-panel, #fff)',
  color: 'var(--text-secondary, #334155)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
};

const metricCardStyle = {
  background: 'var(--surface-panel)',
  borderRadius: 18,
  border: '1px solid var(--border-soft)',
  padding: 18,
  boxShadow: 'var(--shadow-panel)',
};

const thStyle = {
  padding: '14px 18px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 800,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  borderBottom: '1px solid var(--border-soft)',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Employees' },
  { key: 'management', label: 'Management' },
  { key: 'finance', label: 'Finance' },
  { key: 'hr', label: 'HR' },
  { key: 'teacher', label: 'Teachers' },
];

const METRIC_CARDS = [
  { key: 'total', label: 'Total Employees', Icon: FaUsers, bg: '#f3f8ff', border: '#dbe8f7', color: '#2563eb' },
  { key: 'active', label: 'Active Staff', Icon: FaUserTie, bg: '#f5fbf7', border: '#d9efe1', color: '#059669' },
  { key: 'departments', label: 'Departments', Icon: FaBuilding, bg: '#fbf8ff', border: '#ece3fb', color: '#7c3aed' },
  { key: 'leadership', label: 'Leadership', Icon: FaChalkboardTeacher, bg: '#fff8f2', border: '#f4e3d1', color: '#c2410c' },
];

export default function Employees() {
  const navigate = useNavigate();
  const { admin } = useHrSession();

  const {
    employees,
    load,
    terminationModal,
    setTerminationModal,
    closeTerminationModal,
    confirmTerminateEmployee,
    handleTerminateAction,
    deactivationNotice,
    closeDeactivationNotice,
  } = useEmployeesList({ admin });

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    if (!selectedEmployeeId && !terminationModal.open) return undefined;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = previousOverflow; };
  }, [selectedEmployeeId, terminationModal.open, deactivationNotice.open]);

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return employees.filter((employee) => {
      if (employee.isTerminated) return false;
      if (filter !== 'all' && employee.filterKey !== filter) return false;
      if (term && !employee.searchIndex.includes(term)) return false;
      return true;
    });
  }, [employees, filter, searchTerm]);

  const counts = useMemo(() => {
    const nonTerminated = employees.filter((employee) => !employee.isTerminated);
    return {
      total: nonTerminated.length,
      active: employees.filter((employee) => employee.isActive).length,
      departments: new Set(nonTerminated.map((employee) => employee.department).filter(Boolean)).size,
      leadership: employees.filter((employee) => employee.filterKey === 'management' && !employee.isTerminated).length,
    };
  }, [employees]);

  return (
    <div
      className="dashboard-page"
      style={{
        minHeight: '100vh',
        background: 'var(--page-bg)',
        color: 'var(--text-primary)',
        '--sidebar-width': 'clamp(230px, 16vw, 290px)',
        '--topbar-height': '64px',
      }}
    >
      <nav className="top-navbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 18px 0 20px', borderBottom: '1px solid var(--border-soft)', background: 'var(--surface-panel)', zIndex: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Gojo HR</h2>
        </div>

        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" title="Notifications" style={headerActionStyle}><FaBell /></button>
          <button type="button" title="Messages" onClick={() => navigate('/all-chat')} style={headerActionStyle}><FaFacebookMessenger /></button>
          <Link to="/settings" aria-label="Settings" style={headerActionStyle}><FaCog /></Link>
          <AvatarBadge src={admin.profileImage} name={admin.name || 'HR Office'} size={40} fontSize={14} />
        </div>
      </nav>

      <div className="google-dashboard" style={{ display: 'flex', gap: 14, padding: '18px 14px 18px', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>
        <div className="admin-sidebar-spacer" style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)', flex: '0 0 var(--sidebar-width)', pointerEvents: 'none' }} />

        <main className="google-main" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 'none', margin: 0, boxSizing: 'border-box', alignSelf: 'flex-start', height: 'calc(100vh - var(--topbar-height) - 36px)', maxHeight: 'calc(100vh - var(--topbar-height) - 36px)', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', position: 'relative', padding: '0 12px 12px 2px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: 1260 }}>
            <section
              style={{
                background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)',
                border: '1px solid var(--border-soft)',
                borderRadius: 22,
                padding: '22px 24px',
                boxShadow: 'var(--shadow-panel)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', height: 30, padding: '0 12px', borderRadius: 999, background: 'var(--surface-accent)', border: '1px solid var(--border-strong)', color: 'var(--accent-strong)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Employee Directory
                  </div>
                  <h1 style={{ margin: '12px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Employee List</h1>
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 760 }}>
                    Review active and deactivated staff, browse departments, and move into employee details from a cleaner HR workspace built to match the rest of the platform.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '0 14px', borderRadius: 999, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                    <FaFilter /> {filteredEmployees.length} visible
                  </div>
                </div>
              </div>
            </section>

            <section style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {METRIC_CARDS.map((card) => (
                <div key={card.key} style={metricCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
                      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{counts[card.key]}</div>
                    </div>
                    <div style={{ width: 46, height: 46, borderRadius: 16, background: card.bg, border: `1px solid ${card.border}`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      <card.Icon />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section style={{ marginTop: 16, background: 'var(--surface-panel)', borderRadius: 22, border: '1px solid var(--border-soft)', padding: 18, boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setFilter(option.key)}
                      style={{
                        height: 38,
                        padding: '0 16px',
                        borderRadius: 999,
                        border: filter === option.key ? '1px solid var(--border-strong)' : '1px solid var(--border-soft)',
                        background: filter === option.key ? 'var(--surface-accent)' : 'var(--surface-panel)',
                        color: filter === option.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div style={{ position: 'relative', minWidth: 260, flex: '1 1 280px', maxWidth: 360 }}>
                  <FaSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }} />
                  <input
                    aria-label="Search employees"
                    placeholder="Search by name, ID, role, phone, or email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', height: 42, borderRadius: 14, border: '1px solid var(--input-border)', padding: '0 14px 0 40px', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>
            </section>

            <section style={{ marginTop: 16, background: 'var(--surface-panel)', borderRadius: 22, border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-panel)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Employee Directory</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>A refined table view for quick HR review, deactivation follow-up, and navigation into employee details.</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{filteredEmployees.length} result{filteredEmployees.length === 1 ? '' : 's'}</div>
              </div>

              {filteredEmployees.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>
                  No employee records match the current filters.
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1060, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-muted)' }}>
                        <th style={thStyle}>Employee</th>
                        <th style={thStyle}>ID</th>
                        <th style={thStyle}>Role</th>
                        <th style={thStyle}>Contact</th>
                        <th style={thStyle}>Department</th>
                        <th style={thStyle}>Joined</th>
                        <th style={thStyle}>Status</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                          <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                              <AvatarBadge src={employee.image} name={employee.name} size={54} fontSize={15} radius={16} loading="lazy" decoding="async" />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.name}</div>
                                <div style={{ marginTop: 5, fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.email || 'No email available'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>{employee.id}</td>
                          <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{employee.role || 'Staff'}</div>
                          </td>
                          <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{employee.phone || '—'}</td>
                          <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{employee.deptPos || '—'}</td>
                          <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{formatJoinedDate(employee.joined)}</td>
                          <td style={{ padding: '16px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                minHeight: 30,
                                padding: '0 12px',
                                borderRadius: 999,
                                border: employee.isDeactivated ? '1px solid #fcd34d' : '1px solid #dcecf0',
                                background: employee.isDeactivated ? '#fffbea' : '#f5fbf7',
                                color: employee.isDeactivated ? '#92400e' : '#166534',
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {employee.isDeactivated ? 'Deactivated' : employee.status || 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => setSelectedEmployeeId(employee.id)}
                                style={{ height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid #d8e8ff', background: '#eef6ff', color: '#1f4f96', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTerminateAction(employee)}
                                style={{ height: 34, padding: '0 14px', borderRadius: 10, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Terminate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {selectedEmployeeId ? (
              <div
                role="dialog"
                aria-modal="true"
                onClick={() => setSelectedEmployeeId('')}
                style={{
                  position: 'fixed', inset: 0, zIndex: 120,
                  background: 'rgba(15, 23, 42, 0.38)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 18,
                }}
              >
                <div onClick={(event) => event.stopPropagation()}>
                  <EmployeeDetailPanel
                    employeeId={selectedEmployeeId}
                    admin={admin}
                    embedded
                    onClose={() => setSelectedEmployeeId('')}
                    onSaved={load}
                  />
                </div>
              </div>
            ) : null}

            <TeacherDeactivationNoticeModal
              state={deactivationNotice}
              onClose={closeDeactivationNotice}
            />

            <TerminationModal
              state={terminationModal}
              setState={setTerminationModal}
              onClose={closeTerminationModal}
              onConfirm={confirmTerminateEmployee}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
