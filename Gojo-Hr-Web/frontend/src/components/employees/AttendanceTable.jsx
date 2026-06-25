import React, { useState } from 'react';
import { FaUserCheck } from 'react-icons/fa';
import AvatarBadge from '../AvatarBadge';
import { normalizeAttendanceStatus } from '../../utils/attendanceData';

const STATUS_STYLES = {
  present: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  late:    { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  absent:  { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  unset:   { bg: 'var(--surface-panel)', border: 'var(--border-soft)', text: 'var(--text-muted)' },
};

const PRESENT_COLORS = { background: '#f0fdf4', border: '#bbf7d0', color: '#166534' };
const LATE_COLORS    = { background: '#fffbeb', border: '#fde68a', color: '#92400e' };
const ABSENT_COLORS  = { background: '#fef2f2', border: '#fecaca', color: '#991b1b' };

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

function StatusActionButton({ label, value, active, colors, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      style={{
        minHeight: 34,
        padding: '0 12px',
        borderRadius: 999,
        border: `1px solid ${active ? colors.border : 'var(--border-soft)'}`,
        background: active ? colors.background : 'var(--surface-panel)',
        color: active ? colors.color : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 800,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: active ? 'var(--shadow-soft)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

export default function AttendanceTable({ employees, attendance, isLoading, onSetStatus }) {
  const [hoveredEmployeeId, setHoveredEmployeeId] = useState(null);

  return (
    <section style={{ marginTop: 16, background: 'var(--surface-panel)', borderRadius: 22, border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-panel)', overflow: 'hidden' }}>
      <div style={{ padding: '18px 18px 12px', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Daily Attendance Sheet</div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>Use the action pills for faster marking, then save once when the register is complete.</div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 34, padding: '0 14px', borderRadius: 999, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
          <FaUserCheck /> {employees.length} visible employee{employees.length === 1 ? '' : 's'}
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '28px 20px', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Loading attendance...</div>
      ) : employees.length === 0 ? (
        <div style={{ padding: '28px 20px', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>No employees found for the current filters.</div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)' }}>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Position</th>
                <th style={thStyle}>Current Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Mark Attendance</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const employeeId = employee.id;
                const isHovered = hoveredEmployeeId === employeeId;
                const hasSavedOrSelectedStatus = Object.prototype.hasOwnProperty.call(attendance || {}, employeeId);
                const record = attendance?.[employeeId] || {};
                const displayStatus = hasSavedOrSelectedStatus
                  ? normalizeAttendanceStatus(record.status || (record.present ? 'present' : 'absent'))
                  : '';
                const styles = STATUS_STYLES[displayStatus || 'unset'];

                return (
                  <tr
                    key={employeeId}
                    onMouseEnter={() => setHoveredEmployeeId(employeeId)}
                    onMouseLeave={() => setHoveredEmployeeId(null)}
                    style={{ background: isHovered ? 'var(--surface-muted)' : 'var(--surface-panel)', transition: 'background 0.18s ease' }}
                  >
                    <td style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <AvatarBadge src={employee._avatar} name={employee._name} size={50} radius={16} fontSize={15} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee._name}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700, borderBottom: '1px solid var(--border-soft)' }}>{employee._department}</td>
                    <td style={{ padding: '16px 18px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700, borderBottom: '1px solid var(--border-soft)' }}>{employee._position}</td>
                    <td style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-soft)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 30, padding: '0 12px', borderRadius: 999, border: `1px solid ${styles.border}`, background: styles.bg, color: styles.text, fontSize: 12, fontWeight: 800, textTransform: displayStatus ? 'capitalize' : 'none' }}>
                        {displayStatus || 'Not set'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right', borderBottom: '1px solid var(--border-soft)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <StatusActionButton label="Present" value="present" active={displayStatus === 'present'} colors={PRESENT_COLORS} onClick={(value) => onSetStatus(employeeId, value)} />
                        <StatusActionButton label="Late" value="late" active={displayStatus === 'late'} colors={LATE_COLORS} onClick={(value) => onSetStatus(employeeId, value)} />
                        <StatusActionButton label="Absent" value="absent" active={displayStatus === 'absent'} colors={ABSENT_COLORS} onClick={(value) => onSetStatus(employeeId, value)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
