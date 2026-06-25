import { createGeneratedPassword } from './passwordGen';

export function createInitialFormData() {
  return {
    personal: { employeeId: '', firstName: '', middleName: '', lastName: '', password: createGeneratedPassword(8), dob: '', placeOfBirth: '', nationality: '', gender: '', nationalId: '', profileImageName: '', bloodGroup: '', religion: '', disabilityStatus: '' },
    contact: { phone1: '', phone2: '', email: '', altEmail: '', address: '', city: '', subCity: '', woreda: '' },
    education: { highestQualification: '', degreeType: '', fieldOfStudy: '', institution: '', graduationYear: '', gpa: '', additionalCertifications: '', professionalLicenseNumber: '', workExperience: '' },
    family: { maritalStatus: '', spouseName: '', spouseOccupation: '', numChildren: '', childrenNames: '', fatherName: '', motherName: '' },
    employment: { departmentId: '', department: '', positionId: '', position: '', employmentType: '', employeeCategory: '', category: '', hireDate: '', contractStartDate: '', contractEndDate: '', workLocation: '', reportingManager: '', workShift: '', status: '' },
    financial: { basicSalary: '', allowances: '', overtimeRate: '', bonusEligibility: false, bankName: '', bankBranch: '', accountNumber: '', accountHolderName: '', paymentMethod: '' },
  };
}

export function createInitialReferenceForms() {
  return {
    department: { name: '', description: '', status: 'active' },
    position: { name: '', departmentId: '' },
  };
}
