import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaCalendarAlt, FaCheckCircle, FaClock, FaCog, FaFacebookMessenger, FaTimesCircle, FaUsers } from 'react-icons/fa';
import './Dashboard.css';
import '../styles/global.css';
import AvatarBadge from '../components/AvatarBadge';
import MetricCard from '../components/employees/MetricCard';
import AttendanceFiltersBar from '../components/employees/AttendanceFiltersBar';
import AttendanceTable from '../components/employees/AttendanceTable';
import AttendanceStickyFooter from '../components/employees/AttendanceStickyFooter';
import useHrSession from '../hooks/auth/useHrSession';
import useAttendance from '../hooks/employees/useAttendance';

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
  boxShadow: 'none',
};

const METRIC_ACCENTS = {
  active:  { background: '#f3f8ff', border: '#dbe8f7', color: '#2563eb' },
  present: { background: '#f5fbf7', border: '#d9efe1', color: '#059669' },
  late:    { background: '#fffbeb', border: '#fde68a', color: '#d97706' },
  absent:  { background: '#fff7f7', border: '#fecaca', color: '#dc2626' },
};

export default function EmployeesAttendance() {
  const navigate = useNavigate();
  const { admin, getAdminIdPayload } = useHrSession();
  const idPayload = getAdminIdPayload();
  const markedBy = idPayload.adminId || idPayload.hrId || idPayload.userId || '';

  const {
    normalizedEmployees,
    positions,
    selectedDate,
    setSelectedDate,
    selectedPosition,
    setSelectedPosition,
    searchTerm,
    setSearchTerm,
    clearFilters,
    attendance,
    attendanceStats,
    handleSetStatus,
    isLoading,
    isBusy,
    errorMessage,
    successMessage,
    autoSaveEnabled,
    setAutoSaveEnabled,
    autoSaveState,
    autoSaveLabel,
    handleSave,
  } = useAttendance({ markedBy });

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
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>Gojo HR</h2>
        </div>

        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" title="Notifications" style={headerActionStyle}><FaBell /></button>
          <button type="button" title="Messages" onClick={() => navigate('/all-chat')} style={headerActionStyle}><FaFacebookMessenger /></button>
          <Link to="/settings" aria-label="Settings" style={headerActionStyle}><FaCog /></Link>
          <AvatarBadge src={admin.profileImage} name={admin.name || 'HR Office'} size={40} radius={16} fontSize={15} />
        </div>
      </nav>

      <div className="google-dashboard" style={{ display: 'flex', gap: 14, padding: '18px 14px 18px', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>
        <div className="admin-sidebar-spacer" style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)', flex: '0 0 var(--sidebar-width)', pointerEvents: 'none' }} />

        <main className="google-main" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 'none', margin: 0, boxSizing: 'border-box', alignSelf: 'flex-start', height: 'calc(100vh - var(--topbar-height) - 36px)', maxHeight: 'calc(100vh - var(--topbar-height) - 36px)', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', position: 'relative', padding: '0 12px 12px 2px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: 1320 }}>
            <section style={{ background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)', border: '1px solid var(--border-soft)', borderRadius: 22, padding: '22px 24px', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', height: 30, padding: '0 12px', borderRadius: 999, background: 'var(--surface-accent)', border: '1px solid var(--border-strong)', color: 'var(--accent-strong)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Workforce Attendance
                  </div>
                  <h1 style={{ margin: '12px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Employees Attendance</h1>
                  <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 760 }}>
                    Review daily staff attendance from one premium workspace, filter quickly, and mark each employee with faster status actions.
                  </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '0 14px', borderRadius: 999, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
                  <FaCalendarAlt /> {selectedDate}
                </div>
              </div>
            </section>

            <section style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <MetricCard icon={FaUsers}        label="Active Employees" value={attendanceStats.total}                                accent={METRIC_ACCENTS.active} />
              <MetricCard icon={FaCheckCircle}  label="Present"          value={attendanceStats.present}                              accent={METRIC_ACCENTS.present} />
              <MetricCard icon={FaClock}        label="Late"             value={attendanceStats.late}                                 accent={METRIC_ACCENTS.late} />
              <MetricCard icon={FaTimesCircle}  label="Absent / Unset"   value={attendanceStats.absent + attendanceStats.unset}       accent={METRIC_ACCENTS.absent} />
            </section>

            <AttendanceFiltersBar
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedPosition={selectedPosition}
              setSelectedPosition={setSelectedPosition}
              positions={positions}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              autoSaveEnabled={autoSaveEnabled}
              setAutoSaveEnabled={setAutoSaveEnabled}
              autoSaveLabel={autoSaveLabel}
              autoSaveState={autoSaveState}
              onClear={clearFilters}
              onSave={handleSave}
              isBusy={isBusy}
            />

            {errorMessage ? (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', fontSize: 13, fontWeight: 700 }}>
                {successMessage}
              </div>
            ) : null}

            <AttendanceTable
              employees={normalizedEmployees}
              attendance={attendance}
              isLoading={isLoading}
              onSetStatus={handleSetStatus}
            />

            <AttendanceStickyFooter
              stats={attendanceStats}
              isBusy={isBusy}
              onSave={handleSave}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
