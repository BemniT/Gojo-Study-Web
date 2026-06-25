import { useEffect, useState } from "react";
import { BACKEND_BASE } from "../../config";
import { fetchCachedJson } from "../../utils/rtdbCache";
import { loadGradeManagementNode, loadSchoolInfoNode } from "../../utils/registerData";
import { persistResolvedSchoolSession, resolveSchoolScope } from "../../utils/schoolScope";
import { generateTemporaryPassword } from "../../utils/passwordGen";

const parseAcademicYearSuffix = (yearInput) => {
  const raw = String(yearInput || "").trim();
  if (!raw) return "";
  const fourDigitYear = raw.match(/\d{4}/);
  if (fourDigitYear && fourDigitYear[0]) return fourDigitYear[0].slice(-2);
  const twoDigitYear = raw.match(/\d{2}/);
  return twoDigitYear && twoDigitYear[0] ? twoDigitYear[0] : "";
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isValidGradeKey = (value) => { const n = Number(value); return Number.isInteger(n) && n >= 1 && n <= 12; };
const normalizeSectionKey = (value) => String(value || "").trim().toUpperCase();

export default function useStudentRegister({
  schoolCode,
  DB_URL,
  form,
  setForm,
  parents,
  setParents,
  studentPhoto,
  setStudentPhoto,
  studentNationalIdImage,
  setStudentNationalIdImage,
  parentProfileFiles,
  setParentProfileFiles,
  parentNationalIdFiles,
  setParentNationalIdFiles,
  setMessage,
  setOpenStep,
  basicComplete,
  parentComplete,
  addressComplete,
  financeComplete,
  todayDate,
}) {
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState(schoolCode);
  const [resolvedDbUrl, setResolvedDbUrl] = useState(DB_URL);
  const [schoolShortName, setSchoolShortName] = useState("");
  const [nextAvailableStudentId, setNextAvailableStudentId] = useState("");
  const [activeAcademicYear, setActiveAcademicYear] = useState("");
  const [loadingAcademicYear, setLoadingAcademicYear] = useState(false);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [sectionsByGrade, setSectionsByGrade] = useState({});
  const [idLoading, setIdLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const resolveScope = async () => {
      if (!schoolCode) return;
      try {
        const resolvedScope = await resolveSchoolScope(schoolCode);
        const nextResolvedSchoolCode = String(resolvedScope?.schoolCode || schoolCode || "").trim();
        const nextResolvedDbUrl = String(resolvedScope?.dbUrl || DB_URL || "").trim();
        const resolvedSchoolInfo = resolvedScope?.schoolInfo || {};

        setResolvedSchoolCode(nextResolvedSchoolCode);
        setResolvedDbUrl(nextResolvedDbUrl);

        if (nextResolvedSchoolCode && nextResolvedSchoolCode !== schoolCode) {
          persistResolvedSchoolSession(nextResolvedSchoolCode, String(resolvedSchoolInfo?.shortName || "").trim());
        }
      } catch (error) {
        console.error("Failed to resolve student register school scope:", error);
        setResolvedSchoolCode(String(schoolCode || "").trim());
        setResolvedDbUrl(DB_URL);
      }
    };
    resolveScope();
  }, [schoolCode, DB_URL]);

  const activeSchoolCode = String(resolvedSchoolCode || schoolCode || "").trim();
  const activeDbUrl = String(resolvedDbUrl || DB_URL || "").trim();

  useEffect(() => {
    const fetchActiveAcademicYear = async () => {
      if (!activeSchoolCode || !activeDbUrl) return;
      setLoadingAcademicYear(true);
      try {
        const schoolInfo = await loadSchoolInfoNode({ rtdbBase: activeDbUrl, force: true });
        const currentYear = schoolInfo?.currentAcademicYear || "";
        const normalizedYear = String(currentYear || "").trim();
        setActiveAcademicYear(normalizedYear);
        setForm((prev) => ({ ...prev, academicYear: normalizedYear }));
      } catch (error) {
        console.error("Failed to fetch active academic year:", error);
        setActiveAcademicYear("");
        setForm((prev) => ({ ...prev, academicYear: "" }));
      } finally {
        setLoadingAcademicYear(false);
      }
    };
    fetchActiveAcademicYear();
  }, [activeSchoolCode, activeDbUrl]);

  useEffect(() => {
    const fetchGradeManagement = async () => {
      if (!activeSchoolCode || !activeDbUrl) return;
      try {
        const rawGrades = await loadGradeManagementNode({ rtdbBase: activeDbUrl, force: true });
        const gradesObj = Object.fromEntries(
          Object.entries(rawGrades || {}).filter(([gradeKey]) => isValidGradeKey(gradeKey))
        );
        const grades = Object.keys(gradesObj).sort((a, b) => Number(a) - Number(b));

        const nextSections = {};
        grades.forEach((grade) => {
          const sections = Object.keys((gradesObj?.[grade]?.sections || {}))
            .map((sectionKey) => normalizeSectionKey(sectionKey))
            .filter(Boolean)
            .sort((a, b) => String(a).localeCompare(String(b)));
          nextSections[grade] = sections;
        });

        setGradeOptions(grades);
        setSectionsByGrade(nextSections);

        setForm((prev) => {
          const next = { ...prev };
          if (prev.grade && !grades.includes(String(prev.grade || ""))) {
            next.grade = "";
          }
          const activeGrade = String(next.grade || "");
          const allowedSections = nextSections[activeGrade] || [];
          if (!activeGrade || !allowedSections.includes(String(prev.section || "").toUpperCase())) {
            next.section = "";
          }
          return next;
        });
      } catch (error) {
        console.error("Failed to load grade management:", error);
      }
    };
    fetchGradeManagement();
  }, [activeSchoolCode, activeDbUrl]);

  const generateStudentNumber = async (yearInput) => {
    const yearSuffix = parseAcademicYearSuffix(yearInput);
    if (!activeSchoolCode || !activeDbUrl || !yearSuffix) {
      setForm((prev) => ({ ...prev, studentNumber: "", username: "" }));
      return "";
    }

    setIdLoading(true);
    try {
      let shortName = (schoolShortName || "").trim();
      if (!shortName) {
        const schoolInfo = await loadSchoolInfoNode({ rtdbBase: activeDbUrl, force: true });
        const fetchedShortName = schoolInfo?.shortName || "";
        shortName = String(fetchedShortName || "").trim();
      }
      if (!shortName) {
        setForm((prev) => ({ ...prev, studentNumber: "", username: "" }));
        return "";
      }
      setSchoolShortName(shortName);

      const studentsObj = await fetchCachedJson(`${activeDbUrl}/Students.json?shallow=true`, {
        ttlMs: 2 * 60 * 1000,
        fallbackValue: {},
        force: true,
      }).catch(() => ({}));
      const safeShortName = escapeRegex(String(shortName) + "S");
      const pattern = new RegExp(`^${safeShortName}_(\\d{4})_${yearSuffix}$`);

      let maxSeq = 0;
      Object.keys(studentsObj || {}).forEach((studentKey) => {
        const match = String(studentKey || "").match(pattern);
        if (match && match[1]) {
          const seqNum = Number(match[1]);
          if (!Number.isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
        }
      });

      const nextSeq = String(maxSeq + 1).padStart(4, "0");
      const generatedId = `${shortName}S_${nextSeq}_${yearSuffix}`;
      setNextAvailableStudentId(generatedId);
      setForm((prev) => ({ ...prev, studentNumber: generatedId, username: generatedId }));
      return generatedId;
    } catch (err) {
      console.error("Failed to auto-generate student number:", err);
      setNextAvailableStudentId("");
      setForm((prev) => ({ ...prev, studentNumber: "", username: "" }));
      return "";
    } finally {
      setIdLoading(false);
    }
  };

  const generateParentIds = async (yearInput, parentCount = parents.length) => {
    const yearSuffix = parseAcademicYearSuffix(yearInput);
    if (!activeSchoolCode || !activeDbUrl || !yearSuffix || parentCount <= 0) {
      setParents((prev) => prev.map((parent) => ({ ...parent, parentId: "" })));
      return [];
    }

    try {
      let shortName = (schoolShortName || "").trim();
      if (!shortName) {
        const schoolInfo = await loadSchoolInfoNode({ rtdbBase: activeDbUrl, force: true });
        const fetchedShortName = schoolInfo?.shortName || "";
        shortName = String(fetchedShortName || "").trim();
      }
      if (!shortName) {
        setParents((prev) => prev.map((parent) => ({ ...parent, parentId: "" })));
        return [];
      }
      setSchoolShortName(shortName);

      const parentsObj = await fetchCachedJson(`${activeDbUrl}/Parents.json?shallow=true`, {
        ttlMs: 2 * 60 * 1000,
        fallbackValue: {},
        force: true,
      }).catch(() => ({}));
      const safePrefix = escapeRegex(`${shortName}P`);
      const pattern = new RegExp(`^${safePrefix}_(\\d{4})_${yearSuffix}$`);

      let maxSeq = 0;
      Object.keys(parentsObj || {}).forEach((parentKey) => {
        const match = String(parentKey || "").match(pattern);
        if (match && match[1]) {
          const seqNum = Number(match[1]);
          if (!Number.isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
        }
      });

      const generatedParentIds = Array.from({ length: parentCount }, (_, index) => `${shortName}P_${String(maxSeq + index + 1).padStart(4, "0")}_${yearSuffix}`);

      setParents((prev) => prev.map((parent, index) => ({
        ...parent,
        parentId: generatedParentIds[index] || "",
        username: parent.username || generatedParentIds[index] || "",
        temporaryPassword: parent.temporaryPassword || generateTemporaryPassword(8),
      })));
      return generatedParentIds;
    } catch (err) {
      console.error("Failed to auto-generate parent IDs:", err);
      setParents((prev) => prev.map((parent) => ({ ...parent, parentId: "" })));
      return [];
    }
  };

  useEffect(() => {
    if (!activeSchoolCode) return;
    if (!form.academicYear) {
      setForm((prev) => ({ ...prev, studentNumber: "", username: "" }));
      return;
    }
    const timer = setTimeout(() => {
      generateStudentNumber(form.academicYear);
    }, 250);
    return () => clearTimeout(timer);
  }, [form.academicYear, activeSchoolCode, activeDbUrl]);

  useEffect(() => {
    if (!activeSchoolCode || !form.academicYear || parents.length === 0) return;
    generateParentIds(form.academicYear, parents.length);
  }, [form.academicYear, activeSchoolCode, activeDbUrl, parents.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      if (!activeSchoolCode) {
        setMessage("Missing schoolCode in session. Please login again.");
        setSubmitting(false);
        return;
      }

      if (!activeAcademicYear) {
        setMessage("No active academic year is set. Please set/activate Academic Year first.");
        setOpenStep(1);
        setSubmitting(false);
        return;
      }

      const studentTempPassword = (form.temporaryPassword || "").trim() || generateTemporaryPassword(8);

      const ensuredStudentId = await generateStudentNumber(activeAcademicYear);
      if (!ensuredStudentId) {
        setMessage("Could not auto-generate Student ID. Please provide Academic Year and ensure school shortName exists.");
        setOpenStep(1);
        setSubmitting(false);
        return;
      }

      if (!basicComplete) {
        setMessage("Please complete Step 1 (Basic Student Information).\n");
        setOpenStep(1);
        setSubmitting(false);
        return;
      }
      if (!parentComplete) {
        setMessage("Please complete Step 2 (Parent / Guardian Information).\n");
        setOpenStep(2);
        setSubmitting(false);
        return;
      }
      if (!addressComplete) {
        setMessage("Please complete Step 3 (Address Information).\n");
        setOpenStep(3);
        setSubmitting(false);
        return;
      }
      if (!financeComplete) {
        setMessage("Please complete Step 4 (Finance Information).\n");
        setOpenStep(4);
        setSubmitting(false);
        return;
      }

      const generatedParentIds = await generateParentIds(activeAcademicYear, parents.length);
      const parentsWithIds = parents.map((parent, index) => ({ ...parent, parentId: generatedParentIds[index] || parent.parentId || "", originalIndex: index }));
      const validParents = parentsWithIds.filter((p) => p.parentId && p.fullName.trim() && p.phone.trim());
      if (validParents.length === 0) {
        setMessage("At least one parent/guardian with parentId, full name and phone is required.");
        setSubmitting(false);
        return;
      }

      const fd = new FormData();
      Object.entries({ ...form, academicYear: activeAcademicYear, temporaryPassword: studentTempPassword, studentNumber: ensuredStudentId }).forEach(([k, v]) => fd.append(k, v));

      const fullName = [form.firstName, form.middleName, form.lastName]
        .map((v) => (v || "").trim())
        .filter(Boolean)
        .join(" ");

      fd.append("name", fullName);
      fd.append("password", studentTempPassword);

      const validParentsWithFiles = [];
      validParents.forEach((parent, index) => {
        const profileImageField = `parentProfileImage_${index}`;
        const nationalIdImageField = `parentNationalIdImage_${index}`;
        const { originalIndex, ...parentPayload } = parent;
        validParentsWithFiles.push({ ...parentPayload, profileImageField, nationalIdImageField });
        const parentProfileFile = parentProfileFiles[originalIndex];
        if (parentProfileFile) fd.append(profileImageField, parentProfileFile);
        const parentFile = parentNationalIdFiles[originalIndex];
        if (parentFile) fd.append(nationalIdImageField, parentFile);
      });

      fd.append("parents", JSON.stringify(validParentsWithFiles));

      if (studentPhoto) fd.append("studentPhoto", studentPhoto);
      if (studentNationalIdImage) fd.append("studentNationalIdImage", studentNationalIdImage);

      fd.append("schoolCode", activeSchoolCode);

      const res = await fetch(`${BACKEND_BASE}/register/student`, { method: "POST", body: fd });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessage(`Student registered. studentId: ${data.studentId || ""}`);
        setForm({
          firstName: "", middleName: "", lastName: "",
          grade: "", section: "", gender: "", dob: "",
          admissionDate: todayDate, studentNumber: "",
          academicYear: activeAcademicYear,
          previousSchool: "", nationalIdNumber: "", status: "active",
          region: "", city: "", subCity: "", kebele: "", houseNumber: "",
          registrationFeePaid: "yes", hasDiscount: "no", discountAmount: "",
          paymentPlanType: "monthly", transportService: "no",
          bloodType: "", medicalCondition: "", emergencyContactName: "", emergencyPhone: "",
          stream: "", specialProgram: "", languageOption: "", electiveSubjects: "",
          username: "", temporaryPassword: generateTemporaryPassword(8),
          isActive: "true", role: "student",
        });
        setParents([
          {
            parentId: "", fullName: "", relationship: "Father",
            phone: "", alternativePhone: "", email: "", occupation: "",
            nationalIdNumber: "", profileImage: "",
            username: "", temporaryPassword: generateTemporaryPassword(8),
            isActive: "true", role: "parent",
          },
        ]);
        setStudentPhoto(null);
        setStudentNationalIdImage(null);
        setParentProfileFiles({});
        setParentNationalIdFiles({});
      } else {
        setMessage(data.message || "Registration failed.");
      }
    } catch (err) {
      setMessage("Server error. Check console.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    activeSchoolCode,
    activeDbUrl,
    activeAcademicYear,
    loadingAcademicYear,
    gradeOptions,
    sectionsByGrade,
    idLoading,
    nextAvailableStudentId,
    submitting,
    handleSubmit,
  };
}
