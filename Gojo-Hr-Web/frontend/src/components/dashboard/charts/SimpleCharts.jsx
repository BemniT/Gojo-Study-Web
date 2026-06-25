import React from 'react';

export function LineChart({ data = [], width = 420, height = 120, color = '#4b6cb7' }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const points = data.map((d, i) => `${(i * (width / (data.length - 1))).toFixed(2)},${(height - (d / max) * height).toFixed(2)}`).join(' ');
  const pathD = `M ${points.split(' ').map((p) => p).join(' L ')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="url(#grad)" points={`${points} ${width},${height} 0,${height}`} stroke="none" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={(i * (width / (data.length - 1))).toFixed(2)} cy={(height - (d / max) * height).toFixed(2)} r="3" fill={color} />
      ))}
    </svg>
  );
}

export function Sparkline({ data = [], color = 'var(--accent, #4b6cb7)', width = 100, height = 28 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const points = data.map((d, i) => `${(i * (width / (data.length - 1))).toFixed(2)},${(height - (d / max) * height).toFixed(2)}`).join(' ');
  const pathD = `M ${points.split(' ').map((p) => p).join(' L ')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GenderBar({ male = 0, female = 0, width = 250, height = 86 }) {
  const total = Math.max(1, male + female);
  const barX = 8;
  const barY = 16;
  const barWidth = width - 16;
  const barHeight = 16;
  const maleWidth = (male / total) * barWidth;
  const femaleWidth = (female / total) * barWidth;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gender comparison bar">
      <rect x={barX} y={barY} width={barWidth} height={barHeight} rx={8} fill="var(--surface-accent, #edf2ff)" />
      <rect x={barX} y={barY} width={maleWidth} height={barHeight} rx={8} fill="#4b6cb7" />
      <rect x={barX + maleWidth} y={barY} width={femaleWidth} height={barHeight} rx={8} fill="#ec4899" />
      <g transform={`translate(${barX}, 52)`}>
        <circle cx="5" cy="0" r="5" fill="#4b6cb7" />
        <text x="16" y="4" fontSize="11" fill="var(--text-secondary, #334155)" fontWeight="800">Male {male}</text>
      </g>
      <g transform={`translate(${width / 2 + 6}, 52)`}>
        <circle cx="5" cy="0" r="5" fill="#ec4899" />
        <text x="16" y="4" fontSize="11" fill="var(--text-secondary, #334155)" fontWeight="800">Female {female}</text>
      </g>
      <text x={barX} y={78} fontSize="10" fill="var(--text-muted, #64748b)" fontWeight="700">{Math.round((male / total) * 100)}%</text>
      <text x={width - barX} y={78} textAnchor="end" fontSize="10" fill="var(--text-muted, #64748b)" fontWeight="700">{Math.round((female / total) * 100)}%</text>
    </svg>
  );
}

export function DonutChart({ values = [], colors = [], size = 120, centerValue = '', centerLabel = '' }) {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gender distribution chart">
      <defs>
        <filter id="genderDonutGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.1" />
        </filter>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-soft, #e8eefc)" strokeWidth={strokeWidth} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: 'url(#genderDonutGlow)' }}>
        {values.map((value, index) => {
          const dashLength = (value / total) * circumference;
          const dashOffset = -offset;
          offset += dashLength;
          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors[index] || ['#4b6cb7', '#e0245e'][index % 2]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx={size / 2} cy={size / 2} r={radius - strokeWidth / 2 + 1} fill="var(--surface-panel, #fff)" />
      {centerValue ? <text x="50%" y="48%" textAnchor="middle" fontSize="22" fontWeight="900" fill="var(--text-primary, #111827)">{centerValue}</text> : null}
      {centerLabel ? <text x="50%" y="61%" textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--text-muted, #64748b)">{centerLabel}</text> : null}
    </svg>
  );
}

export function QualificationChart({ items = [], total = 0 }) {
  if (!items.some((item) => Number(item.count || 0) > 0)) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>No qualification data available yet.</div>;
  }

  const safeTotal = Math.max(1, total);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => {
        const count = Number(item.count || 0);
        const percentage = Math.round((count / safeTotal) * 100);

        return (
          <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '84px 1fr 62px', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary, #334155)' }}>{item.label}</div>
            <div style={{ height: 12, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-accent, #eef2ff)', border: '1px solid var(--border-soft, #dbe2f2)' }}>
              <div style={{ width: `${percentage}%`, height: '100%', background: item.color, borderRadius: 999 }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 800, color: 'var(--text-muted, #64748b)' }}>{count} ({percentage}%)</div>
          </div>
        );
      })}
    </div>
  );
}

export function PositionChart({ employees = [], maxBars = 6 }) {
  const counts = employees.reduce((acc, e) => {
    const p = (e.position || e.role || 'Other').trim();
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const list = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, maxBars);
  const total = employees.length || 1;
  return (
    <div style={{ width: '100%', padding: 8 }}>
      {list.map(([pos, cnt], i) => {
        const pct = Math.round((cnt / total) * 100);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 120, fontSize: 13, color: 'var(--text-secondary, #374151)' }}>{pos}</div>
            <div style={{ flex: 1, background: 'var(--surface-accent, #eef2ff)', height: 10, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#4b6cb7' }} />
            </div>
            <div style={{ width: 46, textAlign: 'right', fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>{cnt} ({pct}%)</div>
          </div>
        );
      })}
      {list.length === 0 && <div className="muted">No position data</div>}
    </div>
  );
}
