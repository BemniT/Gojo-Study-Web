import React, { useMemo, useState } from 'react';

export default function GrowthTrendChart({ points = [], mode = 'monthly' }) {
  const [hoverIdx, setHoverIdx] = useState(-1);
  const uid = useMemo(() => Math.random().toString(36).slice(2, 9), []);
  if (!points || !points.length) return null;

  const width = 920;
  const height = 320;
  const leftPad = 64;
  const rightPad = 48;
  const topPad = 48;
  const bottomPad = 76;
  const chartWidth = width - leftPad - rightPad;
  const chartHeight = height - topPad - bottomPad;
  const stepX = points.length > 1 ? chartWidth / (points.length) : chartWidth;
  const maxCount = Math.max(1, ...points.map((p) => Math.max(p.totalCount || 0, p.maleCount || 0, p.femaleCount || 0)));

  const yFor = (v) => topPad + (1 - (Math.max(0, v || 0) / maxCount)) * chartHeight;

  const colors = { total: '#10b981', male: '#1d4ed8', female: '#db2777' };

  const groupWidth = Math.min(64, stepX * 0.9);
  const barWidth = Math.max(10, Math.floor((groupWidth - 8) / 3));
  const gap = 4;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Employee growth (grouped bars)" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`shadow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0b1220" floodOpacity="0.06" />
        </filter>
      </defs>

      {/* background panel */}
      <rect x={leftPad - 12} y={topPad - 10} width={chartWidth + 24} height={chartHeight + 20} rx={12} fill="var(--surface-panel, #fff)" stroke="var(--border-soft, #eef3ff)" />

      {/* y grid */}
      {Array.from({ length: 4 }).map((_, i) => {
        const val = Math.round((maxCount * i) / 3);
        const y = yFor(val);
        return (
          <g key={`tick-${i}`}>
            <line x1={leftPad} x2={width - rightPad} y1={y} y2={y} stroke="var(--border-soft, #f0f6ff)" />
            <text x={leftPad - 12} y={y + 4} fontSize="11" fill="var(--text-muted, #64748b)" textAnchor="end" fontWeight="700">{val}</text>
          </g>
        );
      })}

      {/* bars grouped per period */}
      {points.map((pt, idx) => {
        const xCenter = leftPad + idx * stepX + stepX / 2;
        const startX = xCenter - groupWidth / 2;
        const totalH = Math.max(0, chartHeight - (yFor(pt.totalCount || 0) - topPad));
        const maleH = Math.max(0, chartHeight - (yFor(pt.maleCount || 0) - topPad));
        const femaleH = Math.max(0, chartHeight - (yFor(pt.femaleCount || 0) - topPad));

        const totalX = startX;
        const maleX = startX + (barWidth + gap);
        const femaleX = startX + 2 * (barWidth + gap);

        return (
          <g key={`grp-${idx}`} onMouseEnter={() => setHoverIdx(idx)} onMouseLeave={() => setHoverIdx(-1)}>
            <rect x={totalX} y={topPad + (chartHeight - totalH)} width={barWidth} height={totalH} rx={4} fill={colors.total} opacity={0.96} style={{ filter: `url(#shadow-${uid})` }} />
            <rect x={maleX} y={topPad + (chartHeight - maleH)} width={barWidth} height={maleH} rx={4} fill={colors.male} opacity={0.98} />
            <rect x={femaleX} y={topPad + (chartHeight - femaleH)} width={barWidth} height={femaleH} rx={4} fill={colors.female} opacity={0.98} />

            {(idx % Math.max(1, Math.ceil(points.length / 6)) === 0 || idx === points.length - 1) ? (
              <text x={xCenter} y={height - 18} fontSize="12" textAnchor="middle" fill="var(--text-muted, #64748b)" fontWeight="800">{pt.label}</text>
            ) : null}
          </g>
        );
      })}

      {/* legend */}
      <g>
        <rect x={width - rightPad - 248} y={14} width={236} height={44} rx={12} fill="var(--surface-panel, #fff)" stroke="var(--border-soft, #eef3ff)" />
        <g transform={`translate(${width - rightPad - 228}, 34)`}>
          <g>
            <rect x={0} y={-8} width={14} height={14} rx={3} fill={colors.total} />
            <text x={20} y={4} fontSize="11" fill={colors.total} fontWeight="800">Total</text>
          </g>
          <g transform="translate(74,0)">
            <rect x={0} y={-8} width={14} height={14} rx={3} fill={colors.male} />
            <text x={20} y={4} fontSize="11" fill={colors.male} fontWeight="800">Male</text>
          </g>
          <g transform="translate(136,0)">
            <rect x={0} y={-8} width={14} height={14} rx={3} fill={colors.female} />
            <text x={20} y={4} fontSize="11" fill={colors.female} fontWeight="800">Female</text>
          </g>
        </g>
      </g>

      {/* title */}
      <text x={leftPad} y={28} fontSize="15" fill="var(--text-primary, #07104a)" fontWeight="900">{mode === 'monthly' ? 'Monthly Employee Registrations' : 'Yearly Employee Registrations'}</text>

      {/* hover tooltip */}
      {hoverIdx >= 0 ? (() => {
        const p = points[hoverIdx];
        const cx = leftPad + hoverIdx * stepX + stepX / 2;
        const boxW = 160;
        const tx = Math.min(width - rightPad - boxW - 8, Math.max(leftPad + 8, cx - boxW / 2));
        return (
          <g transform={`translate(${tx}, ${topPad + 8})`}>
            <rect x="0" y="0" width={boxW} height="76" rx="10" fill="var(--surface-strong, #07104a)" opacity="0.96" />
            <text x="12" y="18" fontSize="12" fill="#fff" fontWeight="800">{p.label}</text>
            <text x="12" y="36" fontSize="12" fill="#a7f3d0">Total: {p.totalCount || 0}</text>
            <text x="12" y="54" fontSize="12" fill="#bfdbfe">Male: {p.maleCount || 0}</text>
            <text x="92" y="54" fontSize="12" fill="#ffd6ea">Female: {p.femaleCount || 0}</text>
          </g>
        );
      })() : null}
    </svg>
  );
}
