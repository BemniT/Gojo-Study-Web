import React from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaCog, FaFacebookMessenger, FaMoon, FaSun } from 'react-icons/fa';
import './Dashboard.css';
import '../styles/global.css';
import './HRSettings.css';
import { useTheme } from '../theme/ThemeContext';
import AvatarBadge from '../components/AvatarBadge';
import ProfileImageCard from '../components/settings/ProfileImageCard';
import AppearanceCard from '../components/settings/AppearanceCard';
import PasswordSecurityCard from '../components/settings/PasswordSecurityCard';
import useHrSettings from '../hooks/auth/useHrSettings';

const headerActionStyle = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 38,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid var(--border-soft, #dbe2f2)',
  background: 'var(--surface-panel, #fff)',
  color: 'var(--text-secondary, #334155)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
};

const ALERT_STYLES = {
  success: { border: '1px solid var(--success-border)', background: 'var(--success-soft)', color: 'var(--success)' },
  error: { border: '1px solid var(--danger-border)', background: 'var(--danger-soft)', color: 'var(--danger)' },
  warning: { border: '1px solid var(--warning-border)', background: 'var(--warning-soft)', color: 'var(--warning)' },
  info: { border: '1px solid var(--border-soft)', background: 'var(--surface-muted)', color: 'var(--text-primary)' },
};

const themePaletteFor = (isDark) => ({
  '--surface-panel': isDark ? '#0f172a' : '#FFFFFF',
  '--surface-accent': isDark ? '#14213b' : '#F1F8FF',
  '--surface-muted': isDark ? '#111c31' : '#F7FBFF',
  '--surface-strong': isDark ? '#1e293b' : '#DCEBFF',
  '--page-bg': isDark ? '#08111f' : '#FFFFFF',
  '--border-soft': isDark ? '#243247' : '#D7E7FB',
  '--border-strong': isDark ? '#2f4f77' : '#B5D2F8',
  '--text-primary': isDark ? '#e5eefb' : '#0f172a',
  '--text-secondary': isDark ? '#c5d4ea' : '#334155',
  '--text-muted': isDark ? '#94a3b8' : '#64748b',
  '--accent': isDark ? '#60a5fa' : '#007AFB',
  '--accent-soft': isDark ? 'rgba(59, 130, 246, 0.18)' : '#E7F2FF',
  '--accent-strong': isDark ? '#3b82f6' : '#007AFB',
  '--success': isDark ? '#4ade80' : '#16a34a',
  '--success-soft': isDark ? 'rgba(20, 83, 45, 0.32)' : '#eefbf3',
  '--success-border': isDark ? 'rgba(74, 222, 128, 0.35)' : '#bbf7d0',
  '--warning': isDark ? '#fbbf24' : '#d97706',
  '--warning-soft': isDark ? 'rgba(120, 53, 15, 0.3)' : '#fffbeb',
  '--warning-border': isDark ? 'rgba(251, 191, 36, 0.34)' : '#fde68a',
  '--danger': isDark ? '#f87171' : '#dc2626',
  '--danger-soft': isDark ? 'rgba(127, 29, 29, 0.28)' : '#fff1f2',
  '--danger-border': isDark ? 'rgba(248, 113, 113, 0.32)' : '#fecaca',
  '--shadow-soft': isDark ? '0 10px 24px rgba(2, 6, 23, 0.26)' : '0 10px 24px rgba(0, 122, 251, 0.10)',
  '--shadow-panel': isDark ? '0 14px 30px rgba(2, 6, 23, 0.32)' : '0 14px 30px rgba(0, 122, 251, 0.14)',
  '--shadow-glow': isDark ? '0 0 0 2px rgba(59, 130, 246, 0.24)' : '0 0 0 2px rgba(0, 122, 251, 0.18)',
  '--sidebar-width': 'clamp(230px, 16vw, 290px)',
  '--topbar-height': '64px',
});

export default function HRSettings() {
  const { theme, isDark, setTheme } = useTheme();
  const {
    admin,
    displayName,
    username,
    profileImage,
    resolvedPreviewImage,
    profileImageMeta,
    isOptimizingImage,
    currentPassword,
    password,
    confirmPassword,
    fieldErrors,
    setFieldErrors,
    setCurrentPassword,
    setPassword,
    setConfirmPassword,
    passwordChecks,
    isSaving,
    message,
    messageType,
    handleFileChange,
    handleSave,
    resetFormToStoredAdmin,
  } = useHrSettings();

  return (
    <div
      className="dashboard-page"
      style={{ minHeight: '100vh', background: 'var(--page-bg)', color: 'var(--text-primary)', ...themePaletteFor(isDark) }}
    >
      <nav className="top-navbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 18px 0 20px', borderBottom: '1px solid var(--border-soft)', background: 'var(--surface-panel)', zIndex: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Gojo HR</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" title="Notifications" style={headerActionStyle}><FaBell /></button>
          <Link to="/all-chat" aria-label="Messages" style={headerActionStyle}><FaFacebookMessenger /></Link>
          <Link to="/settings" aria-label="Settings" style={{ ...headerActionStyle, color: '#007AFB', borderColor: '#bfdbfe', background: '#eff6ff' }}><FaCog /></Link>
          <AvatarBadge src={admin.profileImage} name={admin.name || 'HR Office'} size={40} fontSize={14} />
        </div>
      </nav>

      <div className="google-dashboard" style={{ display: 'flex', gap: 14, padding: '18px 14px 18px', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>
        <div className="admin-sidebar-spacer" style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)', flex: '0 0 var(--sidebar-width)', pointerEvents: 'none' }} />

        <main className="google-main" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 'none', margin: 0, boxSizing: 'border-box', alignSelf: 'flex-start', height: 'calc(100vh - var(--topbar-height) - 36px)', maxHeight: 'calc(100vh - var(--topbar-height) - 36px)', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', position: 'relative', padding: '0 12px 12px 2px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: 1160, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section style={{ background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)', border: '1px solid var(--border-soft)', borderRadius: 22, padding: '22px 24px', boxShadow: '0 20px 46px rgba(15, 23, 42, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 760 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', minHeight: 30, padding: '0 12px', borderRadius: 999, border: '1px solid var(--border-strong)', background: 'var(--surface-accent)', color: 'var(--accent)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>Account Settings</span>
                <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>HR Profile & Security</h3>
                <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)' }}>Update your account identity, replace your profile image, and set a stronger password with validation before any save is allowed.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 12, minWidth: 'min(100%, 420px)' }}>
                <div className="settings-theme-chip">
                  {isDark ? <FaMoon /> : <FaSun />}
                  <span>{theme === 'dark' ? 'Dark mode on' : 'Light mode on'}</span>
                </div>
              </div>
            </section>

            {message ? (
              <div style={{ padding: '12px 14px', borderRadius: 14, fontSize: 13, fontWeight: 700, ...ALERT_STYLES[messageType] }}>
                {message}
              </div>
            ) : null}

            <section style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
              <ProfileImageCard
                resolvedPreviewImage={resolvedPreviewImage}
                displayName={displayName}
                fallbackName={admin?.name}
                profileImage={profileImage}
                profileImageMeta={profileImageMeta}
                isOptimizingImage={isOptimizingImage}
                onFileChange={handleFileChange}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="settings-panel" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <div className="settings-icon-badge"><FaCog /></div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Profile Details</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Edit the main identity fields stored for the HR account.</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>Display name</label>
                      <input className="settings-input readonly" value={displayName} readOnly aria-readonly="true" />
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Display name is managed by the system and cannot be changed here.</div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)' }}>Username</label>
                      <input className="settings-input readonly" value={username} readOnly aria-readonly="true" />
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Username is locked for HR accounts and cannot be edited here.</div>
                    </div>
                  </div>
                </div>

                <AppearanceCard theme={theme} isDark={isDark} setTheme={setTheme} />

                <PasswordSecurityCard
                  currentPassword={currentPassword}
                  password={password}
                  confirmPassword={confirmPassword}
                  fieldErrors={fieldErrors}
                  setCurrentPassword={setCurrentPassword}
                  setPassword={setPassword}
                  setConfirmPassword={setConfirmPassword}
                  setFieldErrors={setFieldErrors}
                  passwordChecks={passwordChecks}
                />

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={resetFormToStoredAdmin} type="button" style={{ minWidth: 132, height: 46, borderRadius: 14, padding: '0 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', color: 'var(--text-secondary)', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.04)' }}>
                    Cancel
                  </button>
                  <button onClick={handleSave} type="button" disabled={isSaving || isOptimizingImage} style={{ minWidth: 154, height: 46, borderRadius: 14, padding: '0 18px', fontSize: 14, fontWeight: 800, cursor: isSaving || isOptimizingImage ? 'not-allowed' : 'pointer', border: 'none', color: '#ffffff', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)', boxShadow: 'var(--shadow-glow)', opacity: isSaving || isOptimizingImage ? 0.7 : 1 }}>
                    {isOptimizingImage ? 'Optimizing...' : isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
