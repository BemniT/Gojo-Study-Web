import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function TerminationModal({ state, setState, onClose, onConfirm }) {
  if (!state.open || !state.employee) return null;

  const employee = state.employee;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 130,
        background: 'rgba(15, 23, 42, 0.46)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(640px, calc(100vw - 32px))',
          borderRadius: 28,
          border: '1px solid #f3d5b5',
          background: '#ffffff',
          boxShadow: '0 34px 80px rgba(15, 23, 42, 0.24)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '22px 24px 18px', background: 'linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)', borderBottom: '1px solid #f5e7d6' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              <FaExclamationTriangle />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: 28, padding: '0 12px', borderRadius: 999, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Archive Employee
              </div>
              <h3 style={{ margin: '12px 0 0', fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>Terminate {employee.name}?</h3>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                This will archive the employee, disable access, and move the record to the terminated archive without deleting historical data.
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Employee ID', value: employee.id },
              { label: 'Department', value: employee.department },
              { label: 'Role', value: employee.role },
            ].map((field) => (
              <div key={field.label} style={{ border: '1px solid #e7ecf3', borderRadius: 16, padding: 14, background: '#fbfdff' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{field.label}</div>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{field.value}</div>
              </div>
            ))}
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Termination Reason</span>
            <select
              value={state.reason}
              onChange={(event) => setState((previous) => ({ ...previous, reason: event.target.value, error: '' }))}
              style={{ height: 46, borderRadius: 14, border: '1px solid #dbe4ef', padding: '0 14px', fontSize: 14, color: '#0f172a', background: '#fcfdff' }}
            >
              <option value="">Select a reason</option>
              <option value="Contract Ended">Contract Ended</option>
              <option value="Restructuring">Restructuring</option>
              <option value="Performance">Performance</option>
              <option value="Resignation">Resignation</option>
              <option value="Policy Violation">Policy Violation</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 220px) minmax(0, 1fr)', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Last Working Date</span>
              <input
                type="date"
                value={state.lastWorkingDate}
                onChange={(event) => setState((previous) => ({ ...previous, lastWorkingDate: event.target.value }))}
                style={{ height: 46, borderRadius: 14, border: '1px solid #dbe4ef', padding: '0 14px', fontSize: 14, color: '#0f172a', background: '#fcfdff' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Internal Note</span>
              <textarea
                rows={3}
                value={state.note}
                onChange={(event) => setState((previous) => ({ ...previous, note: event.target.value }))}
                placeholder="Add context for HR records, handover details, or follow-up notes"
                style={{ borderRadius: 14, border: '1px solid #dbe4ef', padding: '12px 14px', fontSize: 14, color: '#0f172a', background: '#fcfdff', resize: 'vertical' }}
              />
            </label>
          </div>

          {state.error ? (
            <div style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
              {state.error}
            </div>
          ) : null}
        </div>

        <div style={{ padding: '16px 24px 22px', borderTop: '1px solid #f5e7d6', background: '#fffdfa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: '#64748b' }}>The record stays in HR history and can be reactivated later.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ height: 42, border: '1px solid #dbe4ef', borderRadius: 12, padding: '0 16px', fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#334155' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={state.isSubmitting}
              style={{ height: 42, border: '1px solid #c2410c', borderRadius: 12, padding: '0 18px', fontWeight: 800, cursor: state.isSubmitting ? 'not-allowed' : 'pointer', background: '#c2410c', color: '#fff', opacity: state.isSubmitting ? 0.7 : 1 }}
            >
              {state.isSubmitting ? 'Archiving...' : 'Terminate Employee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
