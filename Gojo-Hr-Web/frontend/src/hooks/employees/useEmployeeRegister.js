import { useCallback, useMemo, useState } from 'react';
import api from '../../api';
import { downloadCredentialSlipPdf, openCredentialSlipPrint } from '../../utils/credentialSlip';
import { compressImageToJpeg } from '../../utils/imageCompress';
import { createInitialFormData } from '../../utils/registerForm';

export default function useEmployeeRegister({ departmentOptions, positions, availablePositionsForDepartment, getSelectedRoleLabel }) {
  const [formData, setFormData] = useState(() => createInitialFormData());
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [profileImageMeta, setProfileImageMeta] = useState(null);
  const [isOptimizingProfileImage, setIsOptimizingProfileImage] = useState(false);
  const [selectedCertFile, setSelectedCertFile] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  const setFormValue = useCallback((section, key, value) => {
    const errorKey = `${section}.${key}`;
    setFormData((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: value } }));
    setValidationErrors((prev) => {
      if (!prev[errorKey]) return prev;
      const nextErrors = { ...prev };
      delete nextErrors[errorKey];
      return nextErrors;
    });
  }, []);

  const clearValidationError = useCallback((errorKey) => {
    setValidationErrors((prev) => {
      if (!prev[errorKey]) return prev;
      const nextErrors = { ...prev };
      delete nextErrors[errorKey];
      return nextErrors;
    });
  }, []);

  const handleEmploymentTypeChange = useCallback((nextEmploymentType) => {
    setFormData((prev) => ({
      ...prev,
      employment: {
        ...prev.employment,
        employmentType: nextEmploymentType,
        contractStartDate: nextEmploymentType === 'Contract' ? prev.employment.contractStartDate || '' : '',
        contractEndDate: nextEmploymentType === 'Contract' ? prev.employment.contractEndDate || '' : '',
        status: prev.employment.status || 'Active',
      },
    }));
    clearValidationError('employment.employmentType');
    if (nextEmploymentType !== 'Contract') {
      clearValidationError('employment.contractStartDate');
      clearValidationError('employment.contractEndDate');
    }
  }, [clearValidationError]);

  const resetRegistrationForm = useCallback(() => {
    setSelectedFile(null);
    setProfileImageMeta(null);
    setIsOptimizingProfileImage(false);
    setSelectedCertFile(null);
    setActiveSection('personal');
    setCreatedCredentials(null);
    setValidationErrors({});
    setFormData(createInitialFormData());
  }, []);

  const handleProfileImageSelection = useCallback(async (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) {
      setSelectedFile(null);
      setProfileImageMeta(null);
      setFormValue('personal', 'profileImageName', '');
      return;
    }

    setIsOptimizingProfileImage(true);
    try {
      const optimizedResult = await compressImageToJpeg(file);
      setSelectedFile(optimizedResult.file);
      setProfileImageMeta({
        originalSize: optimizedResult.originalSize,
        finalSize: optimizedResult.finalSize,
        wasCompressed: optimizedResult.wasCompressed,
        wasConvertedToJpeg: optimizedResult.wasConvertedToJpeg,
      });
      setFormValue('personal', 'profileImageName', optimizedResult.file?.name || file.name);
    } catch (error) {
      console.error(error);
      setSelectedFile(file);
      setProfileImageMeta({
        originalSize: Number(file.size || 0),
        finalSize: Number(file.size || 0),
        wasCompressed: false,
        wasConvertedToJpeg: false,
        optimizationFailed: true,
      });
      setFormValue('personal', 'profileImageName', file.name);
    } finally {
      setIsOptimizingProfileImage(false);
      event.target.value = '';
    }
  }, [setFormValue]);

  const validatePersonalSection = useCallback(() => {
    const nextErrors = {};
    const personal = formData.personal || {};

    if (!String(personal.firstName || '').trim()) nextErrors['personal.firstName'] = 'First name is required.';
    if (!String(personal.middleName || '').trim()) nextErrors['personal.middleName'] = 'Middle name is required.';
    if (!String(personal.lastName || '').trim()) nextErrors['personal.lastName'] = 'Last name is required.';
    if (!String(personal.password || '').trim()) nextErrors['personal.password'] = 'Password is required.';
    if (String(personal.password || '').trim() && String(personal.password || '').trim().length < 8) {
      nextErrors['personal.password'] = 'Password must be at least 8 characters.';
    }
    if (!String(personal.dob || '').trim()) nextErrors['personal.dob'] = 'Date of birth is required.';
    if (!String(personal.placeOfBirth || '').trim()) nextErrors['personal.placeOfBirth'] = 'Place of birth is required.';
    if (!String(personal.nationality || '').trim()) nextErrors['personal.nationality'] = 'Nationality is required.';
    if (!String(personal.gender || '').trim()) nextErrors['personal.gender'] = 'Gender is required.';

    setValidationErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length) {
      setActiveSection('personal');
      return false;
    }
    return true;
  }, [formData.personal]);

  const validateEducationSection = useCallback(() => {
    const nextErrors = {};
    const education = formData.education || {};

    if (!String(education.highestQualification || '').trim()) nextErrors['education.highestQualification'] = 'Highest qualification is required.';
    if (!String(education.degreeType || '').trim()) nextErrors['education.degreeType'] = 'Degree type is required.';
    if (!String(education.fieldOfStudy || '').trim()) nextErrors['education.fieldOfStudy'] = 'Field of study is required.';
    if (!String(education.institution || '').trim()) nextErrors['education.institution'] = 'Institution name is required.';
    if (!String(education.graduationYear || '').trim()) nextErrors['education.graduationYear'] = 'Graduation year is required.';
    if (!String(education.gpa || '').trim()) nextErrors['education.gpa'] = 'GPA is required.';
    if (!String(education.workExperience || '').trim()) nextErrors['education.workExperience'] = 'Work experience is required. Use N/A if none.';

    setValidationErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length) {
      setActiveSection('education');
      return false;
    }
    return true;
  }, [formData.education]);

  const validateEmploymentSection = useCallback(() => {
    const nextErrors = {};
    const employment = formData.employment || {};

    if (!String(employment.departmentId || '').trim()) nextErrors['employment.departmentId'] = 'Department is required.';
    if (!String(employment.positionId || '').trim()) nextErrors['employment.positionId'] = 'Position is required.';
    if (!String(employment.employmentType || '').trim()) nextErrors['employment.employmentType'] = 'Employment type is required.';
    if (!String(employment.employeeCategory || '').trim()) nextErrors['employment.employeeCategory'] = 'Employee category is required.';
    if (!String(employment.hireDate || '').trim()) nextErrors['employment.hireDate'] = 'Hire date is required.';
    if (!String(employment.workLocation || '').trim()) nextErrors['employment.workLocation'] = 'Work location is required.';
    if (!String(employment.workShift || '').trim()) nextErrors['employment.workShift'] = 'Work shift is required.';

    if (employment.employmentType === 'Contract') {
      if (!String(employment.contractStartDate || '').trim()) nextErrors['employment.contractStartDate'] = 'Contract start date is required for contract staff.';
      if (!String(employment.contractEndDate || '').trim()) nextErrors['employment.contractEndDate'] = 'Contract end date is required for contract staff.';
      if (employment.contractStartDate && employment.contractEndDate && employment.contractEndDate < employment.contractStartDate) {
        nextErrors['employment.contractEndDate'] = 'Contract end date must be after the start date.';
      }
    }

    setValidationErrors((prev) => ({ ...prev, ...nextErrors }));
    if (Object.keys(nextErrors).length) {
      setActiveSection('employment');
      return false;
    }
    return true;
  }, [formData.employment]);

  const availablePositions = useMemo(
    () => availablePositionsForDepartment(formData.employment.departmentId),
    [availablePositionsForDepartment, formData.employment.departmentId]
  );

  const employmentType = formData.employment.employmentType;
  const isContractEmployment = employmentType === 'Contract';
  const employmentTypeHint = employmentType === 'Full-time'
    ? 'Hire date is the employee\'s official start date. Full-time employees do not use contract start and end dates.'
    : employmentType === 'Part-time'
      ? 'Hire date is still the official start date. Part-time employees keep the same required employment details, but contract dates are not used.'
      : employmentType === 'Contract'
        ? 'Hire date shows when the employee started work. Contract start and end dates are required to define the agreement period.'
        : 'Choose the work type to show how the employment dates should be used.';

  const handleSubmitRegistration = useCallback(async ({ selectedRole }) => {
    setSubmitting(true);
    try {
      if (!selectedRole) {
        throw new Error('Please select a role before submitting.');
      }
      if (!validatePersonalSection() || !validateEducationSection() || !validateEmploymentSection()) {
        setSubmitting(false);
        return;
      }

      const selectedDepartment = departmentOptions.find((item) => String(item.id) === String(formData.employment.departmentId));
      const selectedPositionRecord = positions.find((item) => String(item.id) === String(formData.employment.positionId));
      const employmentSection = {
        ...formData.employment,
        departmentId: formData.employment.departmentId || selectedPositionRecord?.departmentId || '',
        department: formData.employment.department || selectedDepartment?.name || '',
        positionId: formData.employment.positionId || '',
        position: formData.employment.position || selectedPositionRecord?.name || '',
        employeeCategory: formData.employment.employeeCategory || formData.employment.category || formData.employment.position || selectedPositionRecord?.name || selectedRole,
        category: formData.employment.category || formData.employment.employeeCategory || formData.employment.position || selectedPositionRecord?.name || selectedRole,
        status: formData.employment.status || 'Active',
      };
      const normalizedProfileData = {
        ...formData,
        employment: employmentSection,
        family: { ...(formData.family || {}), maritalStatus: formData.family?.maritalStatus || '' },
      };

      const payload = new FormData();
      payload.append('role', selectedRole);
      payload.append('name', `${formData.personal.firstName || ''} ${formData.personal.middleName || ''} ${formData.personal.lastName || ''}`.trim());
      payload.append('password', formData.personal.password || 'password123');
      payload.append('email', formData.contact.email || '');
      payload.append('phone', formData.contact.phone1 || '');
      payload.append('profileData', JSON.stringify(normalizedProfileData));

      if (selectedFile) payload.append('profile', selectedFile);
      if (selectedCertFile) payload.append('additionalCert', selectedCertFile);

      const response = await api.post(`/register/${selectedRole}`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const responseData = response?.data || {};
      setSubmitting(false);
      setCreatedCredentials({
        name: `${formData.personal.firstName || ''} ${formData.personal.middleName || ''} ${formData.personal.lastName || ''}`.trim() || 'Employee',
        role: getSelectedRoleLabel(),
        employeeId: responseData.employeeId || 'Not available',
        loginUsername: responseData.loginUsername || responseData.roleId || responseData.employeeId || 'Not available',
        password: formData.personal.password,
      });
    } catch (e) {
      setSubmitting(false);
      console.error(e);
      const serverError = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Registration failed';
      alert(serverError);
    }
  }, [departmentOptions, formData, getSelectedRoleLabel, positions, selectedCertFile, selectedFile, validateEducationSection, validateEmploymentSection, validatePersonalSection]);

  const copyCredentials = useCallback(async () => {
    if (!createdCredentials) return;
    const credentialText = [
      `Name: ${createdCredentials.name}`,
      `Role: ${createdCredentials.role}`,
      `Employee ID: ${createdCredentials.employeeId}`,
      `Portal Username: ${createdCredentials.loginUsername}`,
      `Password: ${createdCredentials.password}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(credentialText);
      alert('Credentials copied.');
    } catch (error) {
      console.error(error);
      alert(credentialText);
    }
  }, [createdCredentials]);

  const openCredentialSlip = useCallback(async (mode = 'print') => {
    if (!createdCredentials) return;
    if (mode === 'pdf') {
      try {
        await downloadCredentialSlipPdf(createdCredentials);
      } catch (error) {
        console.error(error);
        alert('Unable to export the credential slip as PDF.');
      }
      return;
    }
    if (!openCredentialSlipPrint(createdCredentials)) {
      alert('Allow pop-ups to print or save the credential slip.');
    }
  }, [createdCredentials]);

  return {
    formData,
    setFormData,
    validationErrors,
    setFormValue,
    clearValidationError,
    selectedFile,
    profileImageMeta,
    isOptimizingProfileImage,
    selectedCertFile,
    setSelectedCertFile,
    createdCredentials,
    submitting,
    activeSection,
    setActiveSection,
    handleEmploymentTypeChange,
    handleProfileImageSelection,
    handleSubmitRegistration,
    resetRegistrationForm,
    validatePersonalSection,
    validateEducationSection,
    validateEmploymentSection,
    availablePositions,
    employmentTypeHint,
    isContractEmployment,
    copyCredentials,
    openCredentialSlip,
  };
}
