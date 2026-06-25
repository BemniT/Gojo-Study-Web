import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBell, FaFacebookMessenger, FaCog } from 'react-icons/fa';
import './Dashboard.css';
import '../styles/global.css';
import './Register.css';
import AvatarBadge from '../components/AvatarBadge';
import {
  ContactSection,
  EducationSection,
  EmploymentSection,
  FamilySection,
  FinancialSection,
  PersonalSection,
} from '../components/employees/EmployeeFormSections';
import ReferenceManagerPanel from '../components/employees/ReferenceManagerPanel';
import CredentialsPanel from '../components/employees/CredentialsPanel';
import useHrSession from '../hooks/auth/useHrSession';
import useReferenceManager from '../hooks/employees/useReferenceManager';
import useEmployeeRegister from '../hooks/employees/useEmployeeRegister';
import { FORM_SECTIONS, ROLE_OPTIONS } from '../utils/registerConstants';

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

export default function Register() {
  const navigate = useNavigate();
  const { admin } = useHrSession();
  const [selectedRole, setSelectedRole] = useState('');

  const selectedRoleLabel = useMemo(
    () => ROLE_OPTIONS.find((role) => role.value === selectedRole)?.label || 'Employee',
    [selectedRole]
  );
  const getSelectedRoleLabel = useCallback(() => selectedRoleLabel, [selectedRoleLabel]);

  // Reference (departments / positions) manager
  const referenceState = useReferenceManager({
    onCreateDepartment: (createdDepartment) => {
      if (registerState.activeSection === 'employment') {
        registerState.setFormData((prev) => ({
          ...prev,
          employment: {
            ...(prev.employment || {}),
            departmentId: createdDepartment.id || prev.employment?.departmentId || '',
            department: createdDepartment.name || prev.employment?.department || '',
            positionId: '',
            position: '',
          },
        }));
      }
    },
    onCreatePosition: ({ createdPosition, linkedDepartment, departmentId }) => {
      if (registerState.activeSection === 'employment') {
        registerState.setFormData((prev) => ({
          ...prev,
          employment: {
            ...(prev.employment || {}),
            departmentId,
            department: linkedDepartment?.name || prev.employment?.department || '',
            positionId: createdPosition.id || prev.employment?.positionId || '',
            position: createdPosition.name || prev.employment?.position || '',
            employeeCategory: prev.employment?.employeeCategory || createdPosition.name || '',
            category: prev.employment?.category || createdPosition.name || '',
          },
        }));
      }
    },
  });

  const availablePositionsForDepartment = useCallback(
    (departmentId) => {
      if (!departmentId) return referenceState.positions;
      return referenceState.positions.filter((item) => String(item?.departmentId || '') === String(departmentId));
    },
    [referenceState.positions]
  );

  const registerState = useEmployeeRegister({
    departmentOptions: referenceState.departmentOptions,
    positions: referenceState.positions,
    availablePositionsForDepartment,
    getSelectedRoleLabel,
  });

  const currentIndex = Math.max(0, FORM_SECTIONS.findIndex((s) => s.key === registerState.activeSection));
  const lastIndex = FORM_SECTIONS.length - 1;
  const progressPercent = Math.round(((currentIndex + 1) / FORM_SECTIONS.length) * 100);
  const activeSectionLabel = FORM_SECTIONS.find((section) => section.key === registerState.activeSection)?.label || 'Section';

  const goToPrevSection = () => {
    if (currentIndex > 0) registerState.setActiveSection(FORM_SECTIONS[currentIndex - 1].key);
  };

  const goToNextSection = () => {
    const currentSectionKey = FORM_SECTIONS[currentIndex]?.key;
    if (currentSectionKey === 'personal' && !registerState.validatePersonalSection()) return;
    if (currentSectionKey === 'education' && !registerState.validateEducationSection()) return;
    if (currentSectionKey === 'employment' && !registerState.validateEmploymentSection()) return;
    if (currentIndex < lastIndex) registerState.setActiveSection(FORM_SECTIONS[currentIndex + 1].key);
  };

  const handleResetRole = () => {
    registerState.resetRegistrationForm();
    setSelectedRole('');
  };

  return (
    <div
      className="dashboard-page"
      style={{
        minHeight: '100vh',
        background: 'var(--page-bg)',
        color: 'var(--text-primary)',
        '--sidebar-width': 'clamp(230px, 16vw, 290px)',
        '--topbar-height': '64px',
      }}
    >
      <nav className="top-navbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 18px 0 20px', borderBottom: '1px solid var(--border-soft)', background: 'var(--surface-panel)', zIndex: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Gojo HR</h2>
        </div>

        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" title="Notifications" style={headerActionStyle}><FaBell /></button>
          <button type="button" title="Messages" onClick={() => navigate('/all-chat')} style={headerActionStyle}><FaFacebookMessenger /></button>
          <Link to="/settings" aria-label="Settings" style={headerActionStyle}><FaCog /></Link>
          <AvatarBadge src={admin.profileImage} name={admin.name || 'HR Office'} size={40} fontSize={14} />
        </div>
      </nav>

      <div className="google-dashboard" style={{ display: 'flex', gap: 14, padding: '18px 14px 18px', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>
        <div className="admin-sidebar-spacer" style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)', flex: '0 0 var(--sidebar-width)', pointerEvents: 'none' }} />

        <main className="google-main" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 'none', margin: 0, boxSizing: 'border-box', alignSelf: 'flex-start', height: 'calc(100vh - var(--topbar-height) - 36px)', maxHeight: 'calc(100vh - var(--topbar-height) - 36px)', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', position: 'relative', padding: '0 12px 12px 2px', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{ width: '100%', maxWidth: 1260 }}>
            <div className="register-shell">
              <div className="register-hero">
                <div className="register-hero-header">
                  <div>
                    <span className="register-badge">HR Workspace</span>
                    <h3 className="register-title">Employee Registration</h3>
                    <p className="register-subtitle">Create new staff records from the same dashboard layout and visual system used across the HR portal.</p>
                  </div>

                  <div className="register-hero-metrics">
                    <div className="register-metric">
                      <span className="register-metric-value">{referenceState.departmentOptions.length}</span>
                      <span className="register-metric-label">Departments</span>
                    </div>
                    <div className="register-metric">
                      <span className="register-metric-value">{referenceState.positions.length}</span>
                      <span className="register-metric-label">Positions</span>
                    </div>
                    <div className="register-metric">
                      <span className="register-metric-value">{selectedRole ? selectedRoleLabel : 'Choose'}</span>
                      <span className="register-metric-label">Current Role</span>
                    </div>
                  </div>
                </div>

                {referenceState.referenceError ? <div className="register-alert">{referenceState.referenceError}</div> : null}
                <div className="role-pill-wrap">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`role-pill ${selectedRole === role.value ? 'active' : ''}`}
                    >
                      {role.label}
                    </button>
                  ))}
                  {selectedRole && <button onClick={handleResetRole} className="role-reset">Reset role</button>}
                </div>
              </div>

              <ReferenceManagerPanel
                isExpanded={referenceState.isReferenceManagerExpanded}
                toggle={referenceState.toggleReferenceManager}
                referenceStatus={referenceState.referenceStatus}
                referenceForms={referenceState.referenceForms}
                referenceSubmitting={referenceState.referenceSubmitting}
                setReferenceFormValue={referenceState.setReferenceFormValue}
                handleCreateDepartment={referenceState.handleCreateDepartment}
                handleCreatePosition={referenceState.handleCreatePosition}
                departmentOptions={referenceState.departmentOptions}
              />

              {!selectedRole && (
                <div className="register-empty">
                  <h4>Select a role to start registration</h4>
                  <p>Choose Teacher, Management, Finance, or HR above to open the employee form. The page will keep the same dashboard layout as the rest of the HR portal while you complete each section.</p>
                </div>
              )}

              {registerState.createdCredentials ? (
                <CredentialsPanel
                  credentials={registerState.createdCredentials}
                  onCopy={registerState.copyCredentials}
                  onPrint={() => registerState.openCredentialSlip('print')}
                  onExportPdf={() => registerState.openCredentialSlip('pdf')}
                  onRegisterAnother={registerState.resetRegistrationForm}
                  onGoToEmployees={() => navigate('/employees')}
                />
              ) : null}

              {selectedRole && !registerState.createdCredentials && (
                <div className="register-layout">
                  <div className="register-left">
                    <p className="section-title">FORM SECTIONS</p>
                    {FORM_SECTIONS.map((section, index) => (
                      <button
                        key={section.key}
                        className={`section-btn ${registerState.activeSection === section.key ? 'active' : ''}`}
                        onClick={() => registerState.setActiveSection(section.key)}
                      >
                        <span className="section-index">{index + 1}</span>
                        <span>{section.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="form-card">
                    <div className="form-card-header">
                      <h3>{activeSectionLabel} Details</h3>
                      <span className="chip">{selectedRoleLabel}</span>
                    </div>

                    <div className="progress-wrap">
                      <div className="progress-meta">
                        <span>Step {currentIndex + 1} of {FORM_SECTIONS.length}</span>
                        <span>{progressPercent}% Completed</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>

                    {registerState.activeSection === 'personal' && (
                      <PersonalSection
                        formData={registerState.formData}
                        setFormValue={registerState.setFormValue}
                        validationErrors={registerState.validationErrors}
                        selectedFile={registerState.selectedFile}
                        profileImageMeta={registerState.profileImageMeta}
                        isOptimizingProfileImage={registerState.isOptimizingProfileImage}
                        handleProfileImageSelection={registerState.handleProfileImageSelection}
                      />
                    )}

                    {registerState.activeSection === 'contact' && (
                      <ContactSection formData={registerState.formData} setFormValue={registerState.setFormValue} />
                    )}

                    {registerState.activeSection === 'education' && (
                      <EducationSection
                        formData={registerState.formData}
                        setFormValue={registerState.setFormValue}
                        validationErrors={registerState.validationErrors}
                        selectedCertFile={registerState.selectedCertFile}
                        setSelectedCertFile={registerState.setSelectedCertFile}
                      />
                    )}

                    {registerState.activeSection === 'family' && (
                      <FamilySection formData={registerState.formData} setFormValue={registerState.setFormValue} />
                    )}

                    {registerState.activeSection === 'employment' && (
                      <EmploymentSection
                        formData={registerState.formData}
                        setFormData={registerState.setFormData}
                        setFormValue={registerState.setFormValue}
                        validationErrors={registerState.validationErrors}
                        clearValidationError={registerState.clearValidationError}
                        departmentOptions={referenceState.departmentOptions}
                        availablePositions={registerState.availablePositions}
                        positions={referenceState.positions}
                        handleEmploymentTypeChange={registerState.handleEmploymentTypeChange}
                        isContractEmployment={registerState.isContractEmployment}
                        employmentTypeHint={registerState.employmentTypeHint}
                      />
                    )}

                    {registerState.activeSection === 'financial' && (
                      <FinancialSection formData={registerState.formData} setFormValue={registerState.setFormValue} />
                    )}

                    <div className="form-actions">
                      {currentIndex > 0 && (<button className="secondary-btn" onClick={goToPrevSection}>Back</button>)}
                      {currentIndex < lastIndex ? (
                        <button className="submit-btn" onClick={goToNextSection}>Next</button>
                      ) : (
                        <button className="submit-btn" onClick={() => registerState.handleSubmitRegistration({ selectedRole })} disabled={registerState.submitting}>
                          {registerState.submitting ? 'Submitting...' : 'Submit Registration'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
