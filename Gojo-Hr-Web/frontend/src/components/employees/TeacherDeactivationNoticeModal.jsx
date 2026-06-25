import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function TeacherDeactivationNoticeModal({ state, onClose }) {
  if (!state.open || !state.employee) return null;

  const employee = state.employee;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 125,
        background: 'rgba(15, 23, 42, 0.42)',
        backdropFilter: 'blur(9px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(560px, calc(100vw - 32px))',
          borderRadius: 28,
          border: '1px solid #dbe7ff',
          background: '#ffffff',
          boxShadow: '0 34px 80px rgba(15, 23, 42, 0.24)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '22px 24px 18px', background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)', borderBottom: '1px solid #e5eefb' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#eef6ff', border: '1px solid #d8e8ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              <FaExclamationTriangle />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: 28, padding: '0 12px', borderRadius: 999, background: '#eef6ff', border: '1px solid #d8e8ff', color: '#1e40af', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Academic Action Required
              </div>
              <h3 style={{ margin: '12px 0 0', fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>Deactivate teacher first</h3>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                {employee.name} is still an active teacher account. Academic administration must deactivate the teacher before HR can complete termination.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: 24, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Employee ID', value: employee.id },
              { label: 'Role', value: employee.role },
            ].map((field) => (
              <div key={field.label} style={{ border: '1px solid #e7ecf3', borderRadius: 16, padding: 14, background: '#fbfdff' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{field.label}</div>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{field.value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid #dbe7ff', background: '#f8fbff', color: '#334155', fontSize: 13, lineHeight: 1.7 }}>
            Once academics deactivates the teacher account, the employee will remain visible here with a deactivated status and HR can then open the termination modal normally.
          </div>
        </div>

        <div style={{ padding: '16px 24px 22px', borderTop: '1px solid #e5eefb', background: '#fcfdff', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ height: 42, border: '1px solid #dbe4ef', borderRadius: 12, padding: '0 16px', fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#334155' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
