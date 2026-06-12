import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaCog, FaFacebookMessenger, FaHistory, FaUndoAlt, FaUserSlash, FaUsers } from 'react-icons/fa';
import './Dashboard.css';
import '../styles/global.css';
import useHrSession from '../hooks/auth/useHrSession';
import useTerminatedEmployees from '../hooks/employees/useTerminatedEmployees';

const headerActionStyle = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 38,
  minWidth: 38,
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

const tdStyle = {
  padding: '16px 18px',
  fontSize: 13,
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-soft)',
};

const getInitials = (name) =>
  (name || 'Employee')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'E';

const formatDate = (value) => {
  if (!value || value === '—') return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function AvatarBadge({ src, name, size = 48 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: 16,
          border: '1px solid var(--border-soft)',
          background: 'linear-gradient(135deg, var(--surface-accent) 0%, var(--surface-muted) 100%)',
          color: 'var(--accent-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, flexShrink: 0,
        }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Employee'}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: 16, objectFit: 'cover', border: '1px solid var(--border-soft)', flexShrink: 0 }}
    />
  );
}

export default function TerminatedEmployees() {
  const navigate = useNavigate();
  const { admin, getAdminIdPayload } = useHrSession();
  const {
    terminatedEmployees,
    isLoading,
    errorMessage,
    summary,
    reactivate,
  } = useTerminatedEmployees({ getAdminIdPayload });

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
      <nav
        className="top-navbar"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: 'var(--topbar-height)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, padding: '0 18px 0 20px',
          borderBottom: '1px solid var(--border-soft)',
          background: 'var(--surface-panel)',
          zIndex: 60,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Gojo HR</h2>
        </div>

        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" title="Notifications" style={headerActionStyle}><FaBell /></button>
          <button type="button" title="Messages" onClick={() => navigate('/all-chat')} style={headerActionStyle}><FaFacebookMessenger /></button>
          <Link to="/settings" aria-label="Settings" style={headerActionStyle}><FaCog /></Link>
          <AvatarBadge src={admin.profileImage || ''} name={admin.name || 'HR Office'} size={40} />
        </div>
      </nav>

      <div
        className="google-dashboard"
        style={{
          display: 'flex', gap: 14, padding: '18px 14px 18px',
          height: '100vh', overflow: 'hidden',
          background: 'var(--page-bg)', width: '100%', boxSizing: 'border-box',
          alignItems: 'flex-start',
        }}
      >
        <div className="admin-sidebar-spacer" style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)', flex: '0 0 var(--sidebar-width)', pointerEvents: 'none' }} />

        <main
          className="google-main"
          style={{
            flex: '1 1 0', minWidth: 0, maxWidth: 'none', margin: 0,
            boxSizing: 'border-box', alignSelf: 'flex-start',
            height: 'calc(100vh - var(--topbar-height) - 36px)',
            maxHeight: 'calc(100vh - var(--topbar-height) - 36px)',
            overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch', position: 'relative',
            padding: '0 12px 12px 2px',
            display: 'flex', justifyContent: 'center', width: '100%',
          }}
        >
          <div style={{ width: '100%', maxWidth: 1320 }}>
            <section style={{ background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)', border: '1px solid var(--border-soft)', borderRadius: 22, padding: '22px 24px', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', height: 30, padding: '0 12px', borderRadius: 999, background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', color: 'var(--danger)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Workforce Archive
                  </div>
                  <h1 style={{ margin: '12px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Terminated Employees</h1>
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 760 }}>
                    Archived employee records stay here with termination history, and can be reactivated without rebuilding accounts from scratch.
                  </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '0 14px', borderRadius: 999, border: '1px solid var(--danger-border)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12, fontWeight: 700 }}>
                  <FaUserSlash /> {summary.total} archived
                </div>
              </div>
            </section>

            <section style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {[
                { label: 'Archived Staff', value: summary.total, Icon: FaUsers, iconBg: '#fff1f2', iconBorder: '#fecdd3', iconColor: '#e11d48' },
                { label: 'Departments', value: summary.departments, Icon: FaHistory, iconBg: '#f3f8ff', iconBorder: '#dbe8f7', iconColor: '#2563eb' },
                { label: 'Last 30 Days', value: summary.recent, Icon: FaUserSlash, iconBg: '#fffbeb', iconBorder: '#fde68a', iconColor: '#d97706' },
              ].map((card) => (
                <div key={card.label} style={{ background: 'var(--surface-panel)', borderRadius: 18, border: '1px solid var(--border-soft)', padding: 18, boxShadow: 'var(--shadow-panel)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
                      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{card.value}</div>
                    </div>
                    <div style={{ width: 46, height: 46, borderRadius: 16, background: card.iconBg, border: `1px solid ${card.iconBorder}`, color: card.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      <card.Icon />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {errorMessage ? (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
                {errorMessage}
              </div>
            ) : null}

            <section style={{ marginTop: 16, background: 'var(--surface-panel)', borderRadius: 22, border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-panel)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Termination Archive</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>Every archived record keeps reason, date, and responsible staff for later review or reactivation.</div>
                </div>
              </div>

              {isLoading ? (
                <div style={{ padding: '28px 20px', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Loading terminated employees...</div>
              ) : terminatedEmployees.length === 0 ? (
                <div style={{ padding: '28px 20px', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>No terminated employees found.</div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-muted)' }}>
                        <th style={thStyle}>Employee</th>
                        <th style={thStyle}>Department</th>
                        <th style={thStyle}>Reason</th>
                        <th style={thStyle}>Last Day</th>
                        <th style={thStyle}>Terminated</th>
                        <th style={thStyle}>By</th>
                        <th style={thStyle}>Note</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terminatedEmployees.map((employee) => (
                        <tr key={employee.terminationId || employee.id || employee._name}>
                          <td style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <AvatarBadge src={employee._profileImage} name={employee._name} size={50} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{employee._name}</div>
                                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{employee.employeeId || '—'} · {employee._position}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{employee._department}</td>
                          <td style={tdStyle}>{employee._terminationReason}</td>
                          <td style={tdStyle}>{formatDate(employee._lastWorkingDate)}</td>
                          <td style={tdStyle}>{formatDate(employee._terminatedAt)}</td>
                          <td style={tdStyle}>{employee._terminatedBy}</td>
                          <td style={{ ...tdStyle, color: 'var(--text-muted)', minWidth: 220, maxWidth: 280 }}>
                            <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.5 }}>{employee._terminationNote || '—'}</div>
                          </td>
                          <td style={{ padding: '16px 18px', textAlign: 'right', borderBottom: '1px solid var(--border-soft)' }}>
                            <button
                              type="button"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, background: '#eefbf3', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                              onClick={() => reactivate(employee.employeeId)}
                              title="Restore this employee and reactivate linked access"
                            >
                              <FaUndoAlt /> Reactivate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
