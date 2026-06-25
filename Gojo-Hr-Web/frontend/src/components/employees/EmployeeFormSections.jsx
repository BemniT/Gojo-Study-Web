import React from 'react';
import {
  COUNTRY_OPTIONS,
  ETHIOPIAN_BANK_OPTIONS,
  GRADUATION_YEAR_OPTIONS,
  HIGHEST_QUALIFICATION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
} from '../../utils/registerConstants';
import { formatFileSize } from '../../utils/imageCompress';

const fieldClass = (hasError) => `form-input ${hasError ? 'has-error' : ''}`;

const FieldError = ({ message }) =>
  message ? <span className="field-error">{message}</span> : null;

export function PersonalSection({
  formData,
  setFormValue,
  validationErrors,
  selectedFile,
  profileImageMeta,
  isOptimizingProfileImage,
  handleProfileImageSelection,
}) {
  return (
    <div className="fields-grid">
      <input placeholder="Employee ID (auto-generated)" className="form-input" value={formData.personal.employeeId} readOnly />
      <div className="field-stack">
        <input placeholder="First Name" className={fieldClass(validationErrors['personal.firstName'])} value={formData.personal.firstName} onChange={(e) => setFormValue('personal', 'firstName', e.target.value)} />
        <FieldError message={validationErrors['personal.firstName']} />
      </div>
      <div className="field-stack">
        <input placeholder="Middle Name" className={fieldClass(validationErrors['personal.middleName'])} value={formData.personal.middleName} onChange={(e) => setFormValue('personal', 'middleName', e.target.value)} />
        <FieldError message={validationErrors['personal.middleName']} />
      </div>
      <div className="field-stack">
        <input placeholder="Last Name" className={fieldClass(validationErrors['personal.lastName'])} value={formData.personal.lastName} onChange={(e) => setFormValue('personal', 'lastName', e.target.value)} />
        <FieldError message={validationErrors['personal.lastName']} />
      </div>
      <div className="field-stack">
        <input type="password" placeholder="Password" minLength={8} className={fieldClass(validationErrors['personal.password'])} value={formData.personal.password} onChange={(e) => setFormValue('personal', 'password', e.target.value)} />
        <FieldError message={validationErrors['personal.password']} />
      </div>
      <div className="field-stack">
        <label className="field-label">Date Of Birth</label>
        <input type="date" className={fieldClass(validationErrors['personal.dob'])} value={formData.personal.dob} onChange={(e) => setFormValue('personal', 'dob', e.target.value)} />
        <FieldError message={validationErrors['personal.dob']} />
      </div>
      <div className="field-stack">
        <input placeholder="Place of Birth" className={fieldClass(validationErrors['personal.placeOfBirth'])} value={formData.personal.placeOfBirth} onChange={(e) => setFormValue('personal', 'placeOfBirth', e.target.value)} />
        <FieldError message={validationErrors['personal.placeOfBirth']} />
      </div>
      <div className="field-stack">
        <select className={fieldClass(validationErrors['personal.nationality'])} value={formData.personal.nationality} onChange={(e) => setFormValue('personal', 'nationality', e.target.value)}>
          <option value="">Nationality</option>
          {COUNTRY_OPTIONS.filter(Boolean).map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
        <FieldError message={validationErrors['personal.nationality']} />
      </div>
      <div className="field-stack">
        <select className={fieldClass(validationErrors['personal.gender'])} value={formData.personal.gender} onChange={(e) => setFormValue('personal', 'gender', e.target.value)}>
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <FieldError message={validationErrors['personal.gender']} />
      </div>
      <input placeholder="National ID Number (optional)" className="form-input" value={formData.personal.nationalId} onChange={(e) => setFormValue('personal', 'nationalId', e.target.value)} />
      <div className="full-width">
        <label className="file-label">Profile Photo</label>
        <div className="file-upload-control">
          <div className="file-upload-copy">
            <span className="file-upload-title">Upload employee photo</span>
            <span className="file-upload-subtitle">Use a clear image in JPG, PNG, or WEBP format. The file is automatically compressed and converted to JPEG before upload to reduce storage size.</span>
          </div>
          <label className="file-upload-button" htmlFor="profile-photo-input">
            {isOptimizingProfileImage ? 'Compressing...' : selectedFile ? 'Change photo' : 'Choose photo'}
          </label>
        </div>
        <input id="profile-photo-input" type="file" accept="image/*" className="file-input-hidden" onChange={handleProfileImageSelection} />
        {isOptimizingProfileImage ? <div className="file-note">Compressing image and converting it to JPEG for upload...</div> : null}
        {selectedFile && !isOptimizingProfileImage ? (
          <div className="file-note">
            Selected file: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            {profileImageMeta?.originalSize && profileImageMeta.originalSize !== profileImageMeta.finalSize ? `, original ${formatFileSize(profileImageMeta.originalSize)}` : ''}
            {profileImageMeta?.wasConvertedToJpeg ? ', JPEG optimized' : ''}
            {profileImageMeta?.optimizationFailed ? ', original file kept' : ''}
          </div>
        ) : null}
      </div>
      <input placeholder="Blood Group (optional)" className="form-input" value={formData.personal.bloodGroup} onChange={(e) => setFormValue('personal', 'bloodGroup', e.target.value)} />
      <input placeholder="Religion (optional)" className="form-input" value={formData.personal.religion} onChange={(e) => setFormValue('personal', 'religion', e.target.value)} />
      <input placeholder="Disability Status (optional)" className="form-input full-width" value={formData.personal.disabilityStatus} onChange={(e) => setFormValue('personal', 'disabilityStatus', e.target.value)} />
    </div>
  );
}

export function ContactSection({ formData, setFormValue }) {
  return (
    <div className="fields-grid">
      <input placeholder="Primary Phone Number" className="form-input" value={formData.contact.phone1} onChange={(e) => setFormValue('contact', 'phone1', e.target.value)} />
      <input placeholder="Secondary Phone Number" className="form-input" value={formData.contact.phone2} onChange={(e) => setFormValue('contact', 'phone2', e.target.value)} />
      <input placeholder="Email Address" className="form-input" value={formData.contact.email} onChange={(e) => setFormValue('contact', 'email', e.target.value)} />
      <input placeholder="Alternative Email (optional)" className="form-input" value={formData.contact.altEmail} onChange={(e) => setFormValue('contact', 'altEmail', e.target.value)} />
      <textarea placeholder="Current Address" className="form-input full-width" value={formData.contact.address} onChange={(e) => setFormValue('contact', 'address', e.target.value)} />
      <input placeholder="City" className="form-input" value={formData.contact.city} onChange={(e) => setFormValue('contact', 'city', e.target.value)} />
      <input placeholder="Sub City" className="form-input" value={formData.contact.subCity} onChange={(e) => setFormValue('contact', 'subCity', e.target.value)} />
      <input placeholder="Woreda" className="form-input" value={formData.contact.woreda} onChange={(e) => setFormValue('contact', 'woreda', e.target.value)} />
    </div>
  );
}

export function EducationSection({ formData, setFormValue, validationErrors, selectedCertFile, setSelectedCertFile }) {
  return (
    <div className="fields-grid">
      <div className="field-stack">
        <select className={fieldClass(validationErrors['education.highestQualification'])} value={formData.education.highestQualification} onChange={(e) => setFormValue('education', 'highestQualification', e.target.value)}>
          <option value="">Highest Qualification</option>
          {HIGHEST_QUALIFICATION_OPTIONS.filter(Boolean).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <FieldError message={validationErrors['education.highestQualification']} />
      </div>
      <div className="field-stack">
        <select className={fieldClass(validationErrors['education.degreeType'])} value={formData.education.degreeType} onChange={(e) => setFormValue('education', 'degreeType', e.target.value)}>
          <option value="">Degree Type</option>
          <option value="Diploma">Diploma</option>
          <option value="BSc">BSc</option>
          <option value="MSc">MSc</option>
          <option value="PhD">PhD</option>
        </select>
        <FieldError message={validationErrors['education.degreeType']} />
      </div>
      <div className="field-stack">
        <input placeholder="Field of Study" className={fieldClass(validationErrors['education.fieldOfStudy'])} value={formData.education.fieldOfStudy} onChange={(e) => setFormValue('education', 'fieldOfStudy', e.target.value)} />
        <FieldError message={validationErrors['education.fieldOfStudy']} />
      </div>
      <div className="field-stack">
        <input placeholder="Institution Name" className={fieldClass(validationErrors['education.institution'])} value={formData.education.institution} onChange={(e) => setFormValue('education', 'institution', e.target.value)} />
        <FieldError message={validationErrors['education.institution']} />
      </div>
      <div className="field-stack">
        <select className={fieldClass(validationErrors['education.graduationYear'])} value={formData.education.graduationYear} onChange={(e) => setFormValue('education', 'graduationYear', e.target.value)}>
          <option value="">Year of Graduation</option>
          {GRADUATION_YEAR_OPTIONS.filter(Boolean).map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <FieldError message={validationErrors['education.graduationYear']} />
      </div>
      <div className="field-stack">
        <input placeholder="GPA" className={fieldClass(validationErrors['education.gpa'])} value={formData.education.gpa} onChange={(e) => setFormValue('education', 'gpa', e.target.value)} />
        <FieldError message={validationErrors['education.gpa']} />
      </div>
      <div className="field-stack full-width">
        <input placeholder="Additional Certifications (comma separated)" className={fieldClass(validationErrors['education.additionalCertifications'])} value={formData.education.additionalCertifications} onChange={(e) => setFormValue('education', 'additionalCertifications', e.target.value)} />
        <FieldError message={validationErrors['education.additionalCertifications']} />
      </div>
      <input placeholder="Professional License Number (optional)" className="form-input full-width" value={formData.education.professionalLicenseNumber} onChange={(e) => setFormValue('education', 'professionalLicenseNumber', e.target.value)} />
      <div className="field-stack full-width">
        <textarea placeholder="Work Experience (brief)" className={fieldClass(validationErrors['education.workExperience'])} value={formData.education.workExperience} onChange={(e) => setFormValue('education', 'workExperience', e.target.value)} />
        <FieldError message={validationErrors['education.workExperience']} />
      </div>
      <div className="full-width">
        <label className="file-label">Additional Certifications (PDF)</label>
        <input type="file" accept="application/pdf" className="form-input" onChange={(e) => { const f = e.target.files[0]; if (f) setSelectedCertFile(f); }} />
        {selectedCertFile ? <div className="file-note">Selected file: {selectedCertFile.name}</div> : null}
      </div>
    </div>
  );
}

export function FamilySection({ formData, setFormValue }) {
  return (
    <div className="fields-grid">
      <select className="form-input" value={formData.family.maritalStatus} onChange={(e) => setFormValue('family', 'maritalStatus', e.target.value)}>
        <option value="">Marital Status (optional)</option>
        {MARITAL_STATUS_OPTIONS.filter(Boolean).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <input placeholder="Spouse Name (optional)" className="form-input" value={formData.family.spouseName} onChange={(e) => setFormValue('family', 'spouseName', e.target.value)} />
      <input placeholder="Spouse Occupation (optional)" className="form-input" value={formData.family.spouseOccupation} onChange={(e) => setFormValue('family', 'spouseOccupation', e.target.value)} />
      <input placeholder="Number of Children (optional)" className="form-input" value={formData.family.numChildren} onChange={(e) => setFormValue('family', 'numChildren', e.target.value)} />
      <input placeholder="Children Names (comma separated) (optional)" className="form-input full-width" value={formData.family.childrenNames} onChange={(e) => setFormValue('family', 'childrenNames', e.target.value)} />
      <input placeholder="Father's Name" className="form-input" value={formData.family.fatherName} onChange={(e) => setFormValue('family', 'fatherName', e.target.value)} />
      <input placeholder="Mother's Name" className="form-input" value={formData.family.motherName} onChange={(e) => setFormValue('family', 'motherName', e.target.value)} />
    </div>
  );
}

export function EmploymentSection({
  formData,
  setFormData,
  setFormValue,
  validationErrors,
  clearValidationError,
  departmentOptions,
  availablePositions,
  positions,
  handleEmploymentTypeChange,
  isContractEmployment,
  employmentTypeHint,
}) {
  return (
    <div className="fields-grid">
      <div className="section-helper full-width">
        The employment section is required. Department, position, work type, category, hire date, work location, and shift must be filled before registration. Contract staff also require start and end dates.
        <div style={{ marginTop: 6, fontWeight: 700, color: '#334155' }}>{employmentTypeHint}</div>
      </div>

      <div className="field-stack">
        <select
          className={fieldClass(validationErrors['employment.departmentId'])}
          value={formData.employment.departmentId}
          onChange={(e) => {
            const nextDepartment = departmentOptions.find((item) => String(item.id) === e.target.value);
            setFormData((prev) => ({
              ...prev,
              employment: {
                ...(prev.employment || {}),
                departmentId: e.target.value,
                department: nextDepartment?.name || '',
                positionId: '',
                position: '',
              },
            }));
            clearValidationError('employment.departmentId');
            clearValidationError('employment.positionId');
          }}
        >
          <option value="">Department</option>
          {departmentOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <FieldError message={validationErrors['employment.departmentId']} />
      </div>

      <div className="field-stack">
        <select
          className={fieldClass(validationErrors['employment.positionId'])}
          value={formData.employment.positionId}
          onChange={(e) => {
            const nextPosition = positions.find((item) => String(item.id) === e.target.value);
            const nextDepartment = departmentOptions.find((item) => String(item.id) === String(nextPosition?.departmentId || formData.employment.departmentId || ''));
            setFormData((prev) => ({
              ...prev,
              employment: {
                ...(prev.employment || {}),
                departmentId: nextDepartment?.id || prev.employment.departmentId || '',
                department: nextDepartment?.name || prev.employment.department || '',
                positionId: e.target.value,
                position: nextPosition?.name || '',
                employeeCategory: prev.employment.employeeCategory || nextPosition?.name || '',
                category: prev.employment.category || nextPosition?.name || '',
              },
            }));
            clearValidationError('employment.positionId');
          }}
        >
          <option value="">Position / Title</option>
          {availablePositions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <FieldError message={validationErrors['employment.positionId']} />
      </div>

      <div className="field-stack">
        <select className={fieldClass(validationErrors['employment.employmentType'])} value={formData.employment.employmentType} onChange={(e) => handleEmploymentTypeChange(e.target.value)}>
          <option value="">Employment Type</option>
          <option value="Full-time">Full-time</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
        </select>
        <FieldError message={validationErrors['employment.employmentType']} />
      </div>

      <div className="field-stack">
        <select className={fieldClass(validationErrors['employment.employeeCategory'])} value={formData.employment.employeeCategory} onChange={(e) => setFormValue('employment', 'employeeCategory', e.target.value)}>
          <option value="">Employee Category</option>
          <option value="Teacher">Teacher</option>
          <option value="Director">Director</option>
          <option value="Vice Director">Vice Director</option>
          <option value="Finance">Finance</option>
          <option value="HR">HR</option>
          <option value="Administrative">Administrative</option>
        </select>
        <FieldError message={validationErrors['employment.employeeCategory']} />
      </div>

      <div className="field-stack">
        <label className="field-label">Work Start Date</label>
        <input type="date" className={fieldClass(validationErrors['employment.hireDate'])} value={formData.employment.hireDate} onChange={(e) => setFormValue('employment', 'hireDate', e.target.value)} />
        <FieldError message={validationErrors['employment.hireDate']} />
      </div>

      <div className="field-stack full-width">
        <div className="date-range-group">
          <div className="field-stack">
            <label className="field-label">Contract Start Date</label>
            <input
              type="date"
              className={fieldClass(validationErrors['employment.contractStartDate'])}
              value={formData.employment.contractStartDate}
              onChange={(e) => setFormValue('employment', 'contractStartDate', e.target.value)}
              disabled={!isContractEmployment}
              aria-label="Contract start date"
            />
            <FieldError message={validationErrors['employment.contractStartDate']} />
          </div>

          <div className="field-stack">
            <label className="field-label">Contract End Date</label>
            <input
              type="date"
              className={fieldClass(validationErrors['employment.contractEndDate'])}
              value={formData.employment.contractEndDate}
              onChange={(e) => setFormValue('employment', 'contractEndDate', e.target.value)}
              disabled={!isContractEmployment}
              min={formData.employment.contractStartDate || undefined}
              aria-label="Contract end date"
            />
            <FieldError message={validationErrors['employment.contractEndDate']} />
          </div>
        </div>
      </div>

      <div className="field-stack">
        <input placeholder="Work Location" className={fieldClass(validationErrors['employment.workLocation'])} value={formData.employment.workLocation} onChange={(e) => setFormValue('employment', 'workLocation', e.target.value)} />
        <FieldError message={validationErrors['employment.workLocation']} />
      </div>

      <div className="field-stack">
        <input placeholder="Reporting Manager" className="form-input" value={formData.employment.reportingManager} onChange={(e) => setFormValue('employment', 'reportingManager', e.target.value)} />
      </div>

      <div className="field-stack">
        <input placeholder="Work Shift" className={fieldClass(validationErrors['employment.workShift'])} value={formData.employment.workShift} onChange={(e) => setFormValue('employment', 'workShift', e.target.value)} />
        <FieldError message={validationErrors['employment.workShift']} />
      </div>

      <div className="field-stack">
        <select className="form-input" value={formData.employment.status} onChange={(e) => setFormValue('employment', 'status', e.target.value)}>
          <option value="">Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>
    </div>
  );
}

export function FinancialSection({ formData, setFormValue }) {
  return (
    <div className="fields-grid">
      <input placeholder="Basic Salary (optional)" className="form-input" value={formData.financial.basicSalary} onChange={(e) => setFormValue('financial', 'basicSalary', e.target.value)} />
      <input placeholder="Allowances (optional)" className="form-input" value={formData.financial.allowances} onChange={(e) => setFormValue('financial', 'allowances', e.target.value)} />
      <input placeholder="Overtime Rate (optional)" className="form-input" value={formData.financial.overtimeRate} onChange={(e) => setFormValue('financial', 'overtimeRate', e.target.value)} />
      <div className="checkbox-row">
        <input type="checkbox" checked={formData.financial.bonusEligibility} onChange={(e) => setFormValue('financial', 'bonusEligibility', e.target.checked)} />
        <label style={{ margin: 0 }}>Bonus Eligibility</label>
      </div>
      <select className="form-input" value={formData.financial.bankName} onChange={(e) => setFormValue('financial', 'bankName', e.target.value)}>
        <option value="">Bank Name (optional)</option>
        {ETHIOPIAN_BANK_OPTIONS.filter(Boolean).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <input placeholder="Bank Branch (optional)" className="form-input" value={formData.financial.bankBranch} onChange={(e) => setFormValue('financial', 'bankBranch', e.target.value)} />
      <input placeholder="Account Number (optional)" className="form-input" value={formData.financial.accountNumber} onChange={(e) => setFormValue('financial', 'accountNumber', e.target.value)} />
      <input placeholder="Account Holder Name (optional)" className="form-input" value={formData.financial.accountHolderName} onChange={(e) => setFormValue('financial', 'accountHolderName', e.target.value)} />
      <select className="form-input" value={formData.financial.paymentMethod} onChange={(e) => setFormValue('financial', 'paymentMethod', e.target.value)}>
        <option value="">Payment Method</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Cash">Cash</option>
      </select>
    </div>
  );
}
