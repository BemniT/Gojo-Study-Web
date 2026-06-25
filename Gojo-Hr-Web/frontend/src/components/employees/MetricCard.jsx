import React from 'react';

export default function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      style={{
        background: 'var(--surface-panel)',
        borderRadius: 18,
        border: '1px solid var(--border-soft)',
        padding: 18,
        boxShadow: 'var(--shadow-panel)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
        </div>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 16,
            background: accent.background,
            border: `1px solid ${accent.border}`,
            color: accent.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          <Icon />
        </div>
      </div>
    </div>
  );
}
