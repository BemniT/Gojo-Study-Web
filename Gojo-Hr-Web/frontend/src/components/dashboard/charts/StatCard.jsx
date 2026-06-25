import React from 'react';

export default function StatCard({ title, value, icon, color }) {
  return (
    <div style={{ background: 'var(--surface-panel, #fff)', borderRadius: 16, padding: 16, minWidth: 180, flex: 1, border: '1px solid var(--border-soft, #d7e7fb)', boxShadow: 'var(--shadow-soft, 0 10px 24px rgba(0,122,251,0.1))', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 46, height: 46, background: 'var(--accent-soft, #e7f2ff)', color: color || 'var(--accent-strong, #007afb)', border: '1px solid var(--border-strong, #b5d2f8)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
        <div style={{ marginTop: 3, fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #0f172a)', lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  );
}
