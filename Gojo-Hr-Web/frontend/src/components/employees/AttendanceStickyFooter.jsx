import React from 'react';

export default function AttendanceStickyFooter({ stats, isBusy, onSave }) {
  return (
    <section
      style={{
        position: 'sticky',
        bottom: 18,
        marginTop: 16,
        background: 'var(--surface-overlay, rgba(8, 17, 31, 0.9))',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-soft)',
        borderRadius: 20,
        padding: '14px 18px',
        boxShadow: 'var(--shadow-panel)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Attendance Ready to Save</div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          {stats.present} present, {stats.late} late, {stats.absent} absent, {stats.unset} not set.
        </div>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={isBusy}
        style={{ height: 42, border: '1px solid #007afb', borderRadius: 12, padding: '0 18px', fontWeight: 800, cursor: isBusy ? 'not-allowed' : 'pointer', background: '#007afb', color: '#fff', opacity: isBusy ? 0.7 : 1 }}
      >
        {isBusy ? 'Saving...' : 'Save Attendance'}
      </button>
    </section>
  );
}
