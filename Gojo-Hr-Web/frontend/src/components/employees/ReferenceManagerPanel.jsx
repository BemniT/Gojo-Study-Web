import React from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

export default function ReferenceManagerPanel({
  isExpanded,
  toggle,
  referenceStatus,
  referenceForms,
  referenceSubmitting,
  setReferenceFormValue,
  handleCreateDepartment,
  handleCreatePosition,
  departmentOptions,
}) {
  return (
    <div className="reference-manager">
      <div className="reference-manager-header">
        <div>
          <span className="register-badge">Reference Setup</span>
          <h3 className="reference-manager-title">Create Departments and Positions</h3>
          <p className="reference-manager-copy">Add new reference items directly into the school database using the same structure as your export: departments are saved with name, description, and status, and positions are saved with name plus department ID.</p>
        </div>
        <button type="button" className="reference-manager-toggle" onClick={toggle} aria-expanded={isExpanded} aria-label={isExpanded ? 'Collapse reference setup' : 'Expand reference setup'}>
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {referenceStatus.message ? (
        <div className={`reference-status ${referenceStatus.type === 'error' ? 'error' : 'success'}`}>{referenceStatus.message}</div>
      ) : null}

      {isExpanded ? (
        <div className="reference-manager-grid">
          <div className="reference-card">
            <h4 className="reference-card-title">New Department</h4>
            <p className="reference-card-copy">This creates a new node in Departments with the exact shape your database expects.</p>
            <div className="reference-form">
              <input
                type="text"
                className="form-input"
                placeholder="Department name"
                value={referenceForms.department.name}
                onChange={(e) => setReferenceFormValue('department', 'name', e.target.value)}
              />
              <textarea
                className="form-input"
                placeholder="Department description (optional)"
                value={referenceForms.department.description}
                onChange={(e) => setReferenceFormValue('department', 'description', e.target.value)}
              />
              <select
                className="form-input"
                value={referenceForms.department.status}
                onChange={(e) => setReferenceFormValue('department', 'status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="reference-actions">
                <button type="button" className="submit-btn" onClick={handleCreateDepartment} disabled={referenceSubmitting.department}>
                  {referenceSubmitting.department ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </div>
          </div>

          <div className="reference-card">
            <h4 className="reference-card-title">New Position</h4>
            <p className="reference-card-copy">Each new position is stored under Positions with its department link, so it can be used in registration and employee edits.</p>
            <div className="reference-form">
              <select
                className="form-input"
                value={referenceForms.position.departmentId}
                onChange={(e) => setReferenceFormValue('position', 'departmentId', e.target.value)}
                disabled={!departmentOptions.length}
              >
                <option value="">{departmentOptions.length ? 'Select department' : 'Create a department first'}</option>
                {departmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input
                type="text"
                className="form-input"
                placeholder="Position name"
                value={referenceForms.position.name}
                onChange={(e) => setReferenceFormValue('position', 'name', e.target.value)}
                disabled={!departmentOptions.length}
              />
              <div className="reference-actions">
                <button type="button" className="submit-btn" onClick={handleCreatePosition} disabled={referenceSubmitting.position || !departmentOptions.length}>
                  {referenceSubmitting.position ? 'Creating...' : 'Create Position'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
