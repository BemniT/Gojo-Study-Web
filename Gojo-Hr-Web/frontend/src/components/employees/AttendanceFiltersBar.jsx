import React from 'react';
import { FaFilter, FaSearch } from 'react-icons/fa';

const filterLabelStyle = { fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' };
const filterInputStyle = { height: 42, borderRadius: 14, border: '1px solid var(--input-border)', padding: '0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--input-bg)' };
const filterIconStyle = { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 };

export default function AttendanceFiltersBar({
  selectedDate,
  setSelectedDate,
  selectedPosition,
  setSelectedPosition,
  positions,
  searchTerm,
  setSearchTerm,
  autoSaveEnabled,
  setAutoSaveEnabled,
  autoSaveLabel,
  autoSaveState,
  onClear,
  onSave,
  isBusy,
}) {
  return (
    <section style={{ marginTop: 16, background: 'var(--surface-panel)', borderRadius: 22, border: '1px solid var(--border-soft)', padding: 18, boxShadow: 'var(--shadow-panel)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: '1 1 720px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={filterLabelStyle}>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={filterInputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
            <label style={filterLabelStyle}>Position</label>
            <div style={{ position: 'relative' }}>
              <FaFilter style={filterIconStyle} />
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                style={{ ...filterInputStyle, width: '100%', padding: '0 14px 0 40px', cursor: 'pointer' }}
              >
                <option value="">All positions</option>
                {positions.length
                  ? positions.map((p) => <option key={p} value={p}>{p}</option>)
                  : <option disabled>No positions</option>
                }
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 280, flex: '1 1 280px' }}>
            <label style={filterLabelStyle}>Search</label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={filterIconStyle} />
              <input
                placeholder="Search by name or employee ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...filterInputStyle, width: '100%', padding: '0 14px 0 40px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <button
              type="button"
              onClick={() => setAutoSaveEnabled((prev) => !prev)}
              aria-pressed={autoSaveEnabled}
              style={{
                height: 40,
                border: `1px solid ${autoSaveEnabled ? '#bfdbfe' : '#dbe4ef'}`,
                borderRadius: 999,
                padding: '0 14px',
                fontWeight: 800,
                cursor: 'pointer',
                background: autoSaveEnabled ? '#eff6ff' : '#fff',
                color: autoSaveEnabled ? '#007afb' : '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 34, height: 20, borderRadius: 999,
                  background: autoSaveEnabled ? '#007afb' : '#cbd5e1',
                  position: 'relative', transition: 'background 0.18s ease', flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute', top: 2,
                    left: autoSaveEnabled ? 16 : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.18)',
                    transition: 'left 0.18s ease',
                  }}
                />
              </span>
              Auto-save
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: autoSaveState === 'error' ? '#b91c1c' : '#64748b' }}>
              {autoSaveLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onClear}
            style={{ height: 40, border: '1px solid #dbe4ef', borderRadius: 12, padding: '0 14px', fontWeight: 800, cursor: 'pointer', background: '#fff', color: '#334155' }}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isBusy}
            style={{ height: 40, border: '1px solid #007afb', borderRadius: 12, padding: '0 18px', fontWeight: 800, cursor: isBusy ? 'not-allowed' : 'pointer', background: '#007afb', color: '#fff', opacity: isBusy ? 0.7 : 1 }}
          >
            {isBusy ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>
    </section>
  );
}
