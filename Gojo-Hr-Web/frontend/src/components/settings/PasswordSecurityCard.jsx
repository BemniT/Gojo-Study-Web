import React from 'react';
import { FaCheckCircle, FaShieldAlt, FaUserLock } from 'react-icons/fa';

export default function PasswordSecurityCard({
  currentPassword,
  password,
  confirmPassword,
  fieldErrors,
  setCurrentPassword,
  setPassword,
  setConfirmPassword,
  setFieldErrors,
  passwordChecks,
}) {
  return (
    <div className="settings-panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div className="settings-icon-badge"><FaUserLock /></div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Password Security</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>A password update is optional, but if you change it you must provide the current password first.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>Current password</label>
          <input
            type="password"
            className="settings-input"
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(event) => { setCurrentPassword(event.target.value); setFieldErrors((previous) => ({ ...previous, currentPassword: '' })); }}
          />
          {fieldErrors.currentPassword ? <div className="settings-field-error">{fieldErrors.currentPassword}</div> : null}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>New password</label>
          <input
            type="password"
            className="settings-input"
            placeholder="Enter a strong password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setFieldErrors((previous) => ({ ...previous, password: '', confirmPassword: previous.confirmPassword })); }}
          />
          {fieldErrors.password ? <div className="settings-field-error">{fieldErrors.password}</div> : null}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>Confirm password</label>
          <input
            type="password"
            className="settings-input"
            placeholder="Repeat the new password"
            value={confirmPassword}
            onChange={(event) => { setConfirmPassword(event.target.value); setFieldErrors((previous) => ({ ...previous, confirmPassword: '' })); }}
          />
          {fieldErrors.confirmPassword ? <div className="settings-field-error">{fieldErrors.confirmPassword}</div> : null}
        </div>
      </div>

      <div style={{ marginTop: 18, padding: 16, borderRadius: 16, border: '1px solid var(--border-soft)', background: 'var(--surface-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)' }}>
          <FaShieldAlt style={{ color: 'var(--accent)' }} /> Password rules
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {passwordChecks.map((rule) => (
            <div
              key={rule.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '0 12px',
                borderRadius: 12,
                border: `1px solid ${rule.ok ? 'var(--border-strong)' : 'var(--border-soft)'}`,
                background: rule.ok ? 'var(--accent-soft)' : 'var(--surface-panel)',
                color: rule.ok ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 700,
              }}
            >
              <FaCheckCircle style={{ opacity: rule.ok ? 1 : 0.35 }} />
              <span>{rule.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
