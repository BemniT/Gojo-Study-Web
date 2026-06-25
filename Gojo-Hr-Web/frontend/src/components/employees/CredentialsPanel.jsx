import React from 'react';

const CREDENTIAL_FIELDS = [
  { key: 'name', label: 'Employee name' },
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'loginUsername', label: 'Portal username' },
  { key: 'password', label: 'Temporary password' },
];

export default function CredentialsPanel({
  credentials,
  onCopy,
  onPrint,
  onExportPdf,
  onRegisterAnother,
  onGoToEmployees,
}) {
  return (
    <div className="credentials-panel">
      <h3 className="credentials-title">Employee Created</h3>
      <p className="credentials-subtitle">Share these credentials with the employee. Keep the employee ID for records, and use the portal username plus password for login.</p>

      <div className="credentials-grid">
        {CREDENTIAL_FIELDS.map((field) => (
          <div key={field.key} className="credentials-card">
            <span className="credentials-label">{field.label}</span>
            <span className="credentials-value">{credentials[field.key]}</span>
          </div>
        ))}
      </div>

      <div className="credentials-actions">
        <button className="submit-btn" type="button" onClick={onCopy}>Copy Credentials</button>
        <button className="secondary-btn" type="button" onClick={onPrint}>Print Slip</button>
        <button className="secondary-btn" type="button" onClick={onExportPdf}>Export PDF</button>
        <button className="secondary-btn" type="button" onClick={onRegisterAnother}>Register Another</button>
        <button className="secondary-btn" type="button" onClick={onGoToEmployees}>Go To Employees</button>
      </div>
    </div>
  );
}
