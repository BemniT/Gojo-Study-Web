import React, { useState } from 'react';

export default function AttendanceTrendChart({ points = [], width = 700, height = 260, mode = 'bar' }) {
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  if (!points || !points.length) return null;

  const leftPad = 48;
  const rightPad = 36;
  const topPad = 28;
  const bottomPad = 48;
  const chartWidth = width - leftPad - rightPad;
  const chartHeight = height - topPad - bottomPad;
  const maxCount = Math.max(1, ...points.map((p) => Math.max(p.presentCount || 0, p.lateCount || 0, p.absentCount || 0)));
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
  const xForIndex = (index) => (points.length === 1 ? leftPad + chartWidth / 2 : leftPad + index * stepX);

  const yForCount = (v) => topPad + (1 - (Math.max(0, v || 0) / maxCount)) * chartHeight;
  const yForRate = (r) => topPad + (1 - (Math.max(0, Math.min(100, r || 0)) / 100)) * chartHeight;

  const groupWidth = Math.min(60, stepX * 0.9);
  const singleBarWidth = Math.max(6, Math.floor((groupWidth - 8) / 3));
  const gapBetweenBars = 4;
  const chartBottom = topPad + chartHeight;

  const countTicks = Array.from({ length: 4 }, (_, index) => {
    const rawValue = (maxCount * index) / 3;
    return { index, rawValue, label: Math.round(rawValue) };
  });
  const rateTicks = [0, 25, 50, 75, 100];
  const barColors = {
    present: 'var(--success, #16a34a)',
    late: 'var(--warning, #d97706)',
    absent: 'var(--danger, #dc2626)',
  };

  const ratePoints = points.map((p, i) => ({ x: xForIndex(i), y: yForRate(p.rate || 0) }));
  const rateLinePath = ratePoints.length ? `M ${ratePoints.map((pt) => `${pt.x},${pt.y}`).join(' L ')}` : '';
  const firstRateX = ratePoints.length ? ratePoints[0].x : leftPad;
  const lastRateX = ratePoints.length ? ratePoints[ratePoints.length - 1].x : leftPad;
  const rateAreaPath = ratePoints.length ? `M ${firstRateX},${chartBottom} L ${ratePoints.map((pt) => `${pt.x},${pt.y}`).join(' L ')} L ${lastRateX},${chartBottom} Z` : '';

  const hoveredPoint = hoveredIndex >= 0 ? points[hoveredIndex] : null;
  const hoveredMeta = hoveredIndex >= 0 ? ratePoints[hoveredIndex] : null;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Attendance trend" style={{ display: 'block', width: '100%', minHeight: height }}>
      <defs>
        <linearGradient id="attendanceAreaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent, #60a5fa)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent, #60a5fa)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <g>
        <rect x={leftPad} y={topPad} width={chartWidth} height={chartHeight} fill="var(--surface-panel, #fcfdff)" stroke="var(--border-soft, #e2e8f0)" rx={8} />
      </g>

      {countTicks.map((tick) => {
        const y = yForCount(tick.rawValue);
        return (
          <g key={`count-tick-${tick.index}-${tick.label}`}>
            <line x1={leftPad} x2={width - rightPad} y1={y} y2={y} stroke="var(--border-soft, #eef2ff)" strokeDasharray="4 6" />
            <text x={leftPad + 10} y={y + 4} textAnchor="start" fontSize="10" fill="var(--text-muted, #64748b)" fontWeight="700">{tick.label}</text>
          </g>
        );
      })}

      {rateTicks.map((tickValue) => {
        const y = yForRate(tickValue);
        return (
          <g key={`rate-tick-${tickValue}`}>
            <text x={width - rightPad - 10} y={y + 4} textAnchor="end" fontSize="10" fill="var(--accent-strong, #3157b7)" fontWeight="700">{tickValue}%</text>
          </g>
        );
      })}

      {mode === 'bar'
        ? points.map((point, index) => {
            const xCenter = xForIndex(index);
            const leftStart = xCenter - groupWidth / 2;
            const presentValue = Number(point.presentCount) || 0;
            const lateValue = Number(point.lateCount) || 0;
            const absentValue = Number(point.absentCount) || 0;

            const bars = [
              { key: 'present', value: presentValue, x: leftStart },
              { key: 'late', value: lateValue, x: leftStart + singleBarWidth + gapBetweenBars },
              { key: 'absent', value: absentValue, x: leftStart + (singleBarWidth + gapBetweenBars) * 2 },
            ];

            return (
              <g key={`bars-${point.date || index}-${index}`}>
                {bars.map((bar) => {
                  const topY = yForCount(bar.value);
                  const barHeight = Math.max(0, chartBottom - topY);
                  return (
                    <rect key={`${bar.key}-${index}`} x={bar.x} y={topY} width={singleBarWidth} height={barHeight} rx="2" fill={barColors[bar.key]} opacity={hoveredIndex === index ? 1 : 0.92} />
                  );
                })}
              </g>
            );
          })
        : null}

      {mode === 'line' && rateAreaPath ? <path d={rateAreaPath} fill="url(#attendanceAreaGradient)" /> : null}
      {mode === 'line' && rateLinePath ? <path d={rateLinePath} fill="none" stroke="#3157b7" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /> : null}

      {points.map((point, index) => {
        const x = xForIndex(index);
        const y = yForRate(point.rate);
        return (
          <g key={`rate-point-${index}`}>
            {mode === 'line' ? <circle cx={x} cy={y} r={hoveredIndex === index ? '5' : '4'} fill="#fff" stroke="#3157b7" strokeWidth="1.8" /> : null}
            {(index % Math.max(1, Math.ceil(points.length / 6)) === 0 || index === points.length - 1) ? (
              <text x={x} y={chartBottom + 18} textAnchor="middle" fontSize="10" fill="var(--text-muted, #64748b)" fontWeight="700">{point.label}</text>
            ) : null}
          </g>
        );
      })}

      {points.map((point, index) => {
        const xCenter = xForIndex(index);
        return (
          <rect
            key={`hover-zone-${point.date || index}`}
            x={xCenter - Math.max(22, stepX / 2)}
            y={topPad}
            width={Math.max(44, stepX)}
            height={chartHeight}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseMove={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(-1)}
          />
        );
      })}

      {hoveredPoint && hoveredMeta ? (
        <g pointerEvents="none">
          <line x1={hoveredMeta.x} x2={hoveredMeta.x} y1={topPad} y2={chartBottom} stroke="#c7d2fe" strokeDasharray="4 5" />
          <rect
            x={Math.max(leftPad, Math.min(width - rightPad - 168, hoveredMeta.x - 84))}
            y={topPad + 8}
            width="168"
            height="74"
            rx="12"
            fill="#ffffff"
            stroke="#dbeafe"
          />
          <text x={Math.max(leftPad + 12, Math.min(width - rightPad - 156, hoveredMeta.x - 72))} y={topPad + 28} fontSize="11" fill="#64748b" fontWeight="800">{hoveredPoint.label}</text>
          <text x={Math.max(leftPad + 12, Math.min(width - rightPad - 156, hoveredMeta.x - 72))} y={topPad + 46} fontSize="12" fill="#0f172a" fontWeight="700">Rate: {hoveredPoint.rate || 0}%</text>
          <text x={Math.max(leftPad + 12, Math.min(width - rightPad - 156, hoveredMeta.x - 72))} y={topPad + 62} fontSize="11" fill="#166534" fontWeight="700">Present: {hoveredPoint.presentCount || 0}</text>
          <text x={Math.max(leftPad + 82, Math.min(width - rightPad - 86, hoveredMeta.x - 2))} y={topPad + 62} fontSize="11" fill="#92400e" fontWeight="700">Late: {hoveredPoint.lateCount || 0}</text>
          <text x={Math.max(leftPad + 12, Math.min(width - rightPad - 156, hoveredMeta.x - 72))} y={topPad + 76} fontSize="11" fill="#991b1b" fontWeight="700">Absent: {hoveredPoint.absentCount || 0}</text>
        </g>
      ) : null}

      <g>
        <text x={leftPad} y={18} fontSize="11" fill="#475569" fontWeight="800">{mode === 'line' ? 'Attendance Rate Trend' : 'Attendance Records (count)'}</text>
        <g transform={`translate(${leftPad + 168}, 11)`}>
          {mode === 'bar' ? (
            <>
              <rect x="0" y="0" width="10" height="10" fill="#16a34a" rx="2" />
              <text x="14" y="9" fontSize="10" fill="#166534" fontWeight="700">Present</text>
              <rect x="74" y="0" width="10" height="10" fill="#d97706" rx="2" />
              <text x="88" y="9" fontSize="10" fill="#92400e" fontWeight="700">Late</text>
              <rect x="130" y="0" width="10" height="10" fill="#dc2626" rx="2" />
              <text x="144" y="9" fontSize="10" fill="#991b1b" fontWeight="700">Absent</text>
            </>
          ) : (
            <>
              <line x1="0" y1="5" x2="26" y2="5" stroke="#3157b7" strokeWidth="2.4" />
              <circle cx="13" cy="5" r="3" fill="#fff" stroke="#3157b7" strokeWidth="1.8" />
              <text x="32" y="9" fontSize="10" fill="#3157b7" fontWeight="700">Rate %</text>
            </>
          )}
        </g>
      </g>
    </svg>
  );
}
