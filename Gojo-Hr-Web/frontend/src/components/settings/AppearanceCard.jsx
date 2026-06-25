import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';

export default function AppearanceCard({ theme, isDark, setTheme }) {
  return (
    <div className="settings-panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div className="settings-icon-badge">{isDark ? <FaMoon /> : <FaSun />}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Appearance</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Switch between light and dark mode for the full HR portal. Changes apply instantly.</div>
        </div>
      </div>

      <div className="settings-theme-toggle">
        <button type="button" className={`settings-theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
          <span className="settings-theme-option-icon"><FaSun /></span>
          <span>
            <span className="settings-theme-option-title">Light mode</span>
            <span className="settings-theme-option-copy">Bright surfaces for daytime work and print-friendly review.</span>
          </span>
        </button>
        <button type="button" className={`settings-theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
          <span className="settings-theme-option-icon"><FaMoon /></span>
          <span>
            <span className="settings-theme-option-title">Dark mode</span>
            <span className="settings-theme-option-copy">Lower-glare screens with the existing shared dark palette.</span>
          </span>
        </button>
      </div>
    </div>
  );
}
