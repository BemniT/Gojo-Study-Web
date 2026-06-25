import { useState } from "react";

const generateTemporaryPassword = (length = 8) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const firstFilled = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const normalizeParents = (node) => {
  if (Array.isArray(node)) return node;
  if (node && typeof node === "object") return Object.values(node);
  return [];
};

const emptyParentRow = () => ({
  parentId: "",
  fullName: "",
  relationship: "Guardian",
  phone: "",
  alternativePhone: "",
  email: "",
  occupation: "",
  nationalIdNumber: "",
  username: "",
  temporaryPassword: generateTemporaryPassword(8),
  isActive: "true",
  role: "parent",
});

const buildSourceParents = (parentInfo = {}) =>
  normalizeParents(parentInfo.parents).map((row) => {
    const item = row || {};
    const accountInfo = item.systemAccountInformation || {};
    return {
      parentId: firstFilled(item.parentId),
      fullName: firstFilled(item.fullName, item.name),
      relationship: firstFilled(item.relationship, "Guardian"),
      phone: firstFilled(item.phone),
      alternativePhone: firstFilled(item.alternativePhone),
      email: firstFilled(item.email),
      occupation: firstFilled(item.occupation),
      nationalIdNumber: firstFilled(item.nationalIdNumber),
      username: firstFilled(accountInfo.username),
      temporaryPassword: firstFilled(accountInfo.temporaryPassword),
      isActive: firstFilled(accountInfo.isActive, "true"),
      role: firstFilled(accountInfo.role, "parent"),
    };
  });

const buildDraftFromQueueItem = (queueItem, toYear) => {
  if (!queueItem) return null;

  const decision = queueItem.decision || {};
  const existingDraft = queueItem.draftOverride || {};
  const existingForm = existingDraft.form || {};
  const source =
    existingDraft.sourceData ||
    queueItem.fullStudent ||
    queueItem.student?.raw ||
    queueItem.student?.rawHistory ||
    {};

  const basic = source.basicStudentInformation || {};
  const address = source.addressInformation || {};
  const finance = source.financeInformation || {};
  const health = source.healthEmergency || {};
  const academic = source.academicSetup || {};
  const account = source.systemAccountInformation || {};
  const parentInfo = source.parentGuardianInformation || {};

  const normalizedSourceParents = buildSourceParents(parentInfo);
  const parents = (existingDraft.parents || []).length
    ? existingDraft.parents
    : normalizedSourceParents;

  const firstName = firstFilled(existingForm.firstName, basic.firstName, source.firstName);
  const middleName = firstFilled(existingForm.middleName, basic.middleName, source.middleName);
  const lastName = firstFilled(existingForm.lastName, basic.lastName, source.lastName);
  const builtName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
  const resolvedStatus = firstFilled(existingForm.status, source.status, basic.status, "active");

  const form = {
    firstName,
    middleName,
    lastName,
    grade: firstFilled(decision.targetGrade, existingForm.grade, source.grade, basic.grade, queueItem.student?.grade),
    section: firstFilled(
      decision.targetSection,
      existingForm.section,
      source.section,
      basic.section,
      queueItem.student?.section
    ).toUpperCase(),
    gender: firstFilled(existingForm.gender, source.gender, basic.gender),
    dob: firstFilled(existingForm.dob, source.dob, basic.dob, source.dateOfBirth),
    admissionDate: firstFilled(existingForm.admissionDate, source.admissionDate, basic.admissionDate),
    studentNumber: firstFilled(existingForm.studentNumber, source.studentId, queueItem.student?.studentId),
    academicYear: firstFilled(toYear, existingForm.academicYear, source.academicYear, basic.academicYear),
    previousSchool: firstFilled(existingForm.previousSchool, source.previousSchool, basic.previousSchool),
    nationalIdNumber: firstFilled(existingForm.nationalIdNumber, source.nationalIdNumber, basic.nationalIdNumber),
    status: resolvedStatus === "graduated" ? "active" : resolvedStatus,
    region: firstFilled(existingForm.region, address.region),
    city: firstFilled(existingForm.city, address.city),
    subCity: firstFilled(existingForm.subCity, address.subCity),
    kebele: firstFilled(existingForm.kebele, address.kebele),
    houseNumber: firstFilled(existingForm.houseNumber, address.houseNumber),
    registrationFeePaid: firstFilled(existingForm.registrationFeePaid, finance.registrationFeePaid, "yes"),
    hasDiscount: firstFilled(existingForm.hasDiscount, finance.hasDiscount, "no"),
    discountAmount: firstFilled(existingForm.discountAmount, finance.discountAmount),
    paymentPlanType: firstFilled(existingForm.paymentPlanType, finance.paymentPlanType, "monthly"),
    transportService: firstFilled(existingForm.transportService, finance.transportService, "no"),
    bloodType: firstFilled(existingForm.bloodType, health.bloodType),
    medicalCondition: firstFilled(existingForm.medicalCondition, health.medicalCondition),
    emergencyContactName: firstFilled(existingForm.emergencyContactName, health.emergencyContactName),
    emergencyPhone: firstFilled(existingForm.emergencyPhone, health.emergencyPhone),
    stream: firstFilled(existingForm.stream, academic.stream),
    specialProgram: firstFilled(existingForm.specialProgram, academic.specialProgram),
    languageOption: firstFilled(existingForm.languageOption, academic.languageOption),
    electiveSubjects: firstFilled(existingForm.electiveSubjects, academic.electiveSubjects),
    username: firstFilled(existingForm.username, account.username, source.username, source.studentId),
    temporaryPassword: firstFilled(existingForm.temporaryPassword, account.temporaryPassword),
    isActive: firstFilled(existingForm.isActive, account.isActive, source.isActive, "true"),
    role: firstFilled(existingForm.role, account.role, "student"),
    phone: firstFilled(existingForm.phone, source.phone),
    email: firstFilled(existingForm.email, source.email),
    name: firstFilled(existingForm.name, source.name, basic.name, builtName, queueItem.student?.name, "Student"),
    userId: firstFilled(existingForm.userId, existingDraft.userId, source.userId, queueItem.student?.userId),
  };

  return {
    studentId: firstFilled(existingDraft.studentId, queueItem.student?.studentId, source.studentId),
    userId: firstFilled(existingDraft.userId, form.userId),
    sourceData: source,
    form,
    parents: parents.length ? parents : [emptyParentRow()],
  };
};

/**
 * useReRegisterDraft
 *
 * Owns the re-register draft state cluster and its lightweight mutators:
 * - showReRegisterModal, reRegisterQueue, reRegisterIndex, reRegisterDraft,
 *   reRegisterSaving, reRegisterMode, draftOverrides
 * - updateDraftField, updateParentDraftField, addParentDraftRow,
 *   removeParentDraftRow, initReRegisterDraft, moveReRegisterIndex
 *
 * Heavy operations (`handleSaveReRegister`, `buildReRegisterQueueItem`)
 * stay on the page because they need to also mutate `decisions`,
 * `processedStudentIds`, `selectedStudentsMap`, etc.
 *
 * `toYear` is passed in so `buildDraftFromQueueItem` can default the
 * draft's academic year correctly.
 */
export default function useReRegisterDraft({ toYear }) {
  const [showReRegisterModal, setShowReRegisterModal] = useState(false);
  const [reRegisterQueue, setReRegisterQueue] = useState([]);
  const [reRegisterIndex, setReRegisterIndex] = useState(0);
  const [reRegisterDraft, setReRegisterDraft] = useState(null);
  const [reRegisterSaving, setReRegisterSaving] = useState(false);
  const [reRegisterMode, setReRegisterMode] = useState("reregister");
  const [draftOverrides, setDraftOverrides] = useState({});

  const initReRegisterDraft = (queueItem) => {
    setReRegisterDraft(buildDraftFromQueueItem(queueItem, toYear));
  };

  const moveReRegisterIndex = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= reRegisterQueue.length) return;
    setReRegisterIndex(nextIndex);
    initReRegisterDraft(reRegisterQueue[nextIndex]);
  };

  const updateDraftField = (field, value) => {
    setReRegisterDraft((prev) => ({
      ...prev,
      form: { ...(prev?.form || {}), [field]: value },
    }));
  };

  const updateParentDraftField = (index, key, value) => {
    setReRegisterDraft((prev) => ({
      ...prev,
      parents: (prev?.parents || []).map((parent, idx) =>
        idx === index ? { ...parent, [key]: value } : parent
      ),
    }));
  };

  const addParentDraftRow = () => {
    setReRegisterDraft((prev) => ({
      ...prev,
      parents: [...(prev?.parents || []), emptyParentRow()],
    }));
  };

  const removeParentDraftRow = (index) => {
    setReRegisterDraft((prev) => {
      const current = prev?.parents || [];
      if (current.length <= 1) return prev;
      return { ...prev, parents: current.filter((_, idx) => idx !== index) };
    });
  };

  return {
    // state
    showReRegisterModal,
    setShowReRegisterModal,
    reRegisterQueue,
    setReRegisterQueue,
    reRegisterIndex,
    setReRegisterIndex,
    reRegisterDraft,
    setReRegisterDraft,
    reRegisterSaving,
    setReRegisterSaving,
    reRegisterMode,
    setReRegisterMode,
    draftOverrides,
    setDraftOverrides,
    // mutators
    initReRegisterDraft,
    moveReRegisterIndex,
    updateDraftField,
    updateParentDraftField,
    addParentDraftRow,
    removeParentDraftRow,
  };
}
