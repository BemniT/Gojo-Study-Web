import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaChartLine,
  FaChalkboardTeacher,
  FaChevronDown,
  FaCog,
  FaFacebookMessenger,
  FaFileAlt,
  FaHome,
  FaLock,
  FaPlay,
  FaSignOutAlt,
  FaSyncAlt,
  FaUsers,
} from "react-icons/fa";
import axios from "axios";
import { BACKEND_BASE , FIREBASE_DATABASE_URL} from "../config";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import usePromotionData from "../hooks/promotion/usePromotionData";
import useReRegisterDraft from "../hooks/promotion/useReRegisterDraft";
import useStudentReview from "../hooks/promotion/useStudentReview";
import useDecisions from "../hooks/promotion/useDecisions";
import ReRegisterModal from "../components/dashboard/promotion/ReRegisterModal";
import Step2StudentReview from "../components/dashboard/promotion/Step2StudentReview";
import RegisterSidebar from "../components/RegisterSidebar";
import ProfileAvatar from "../components/ProfileAvatar";
import {
  loadGradeManagementNode,
  loadSchoolInfoNode,
  loadSchoolParentsNode,
  loadSchoolStudentsNode,
  loadSchoolUsersNode,
} from "../utils/registerData";
import { fetchCachedJson } from "../utils/rtdbCache";

const PAGE_BG = "var(--page-bg)";

const cardStyle = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  boxShadow: "var(--shadow-panel)",
};

const ACTIONS = {
  promote: "promote",
  repeat: "repeat",
  graduate: "graduate",
  transfer: "transfer",
  withdraw: "withdraw",
};


const normalizeYearKey = (value) => String(value || "").trim();

const yearLabel = (key) => String(key || "").replace("_", "/");


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

const toBooleanActive = (value, defaultValue = true) => {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return defaultValue;
  return ["1", "true", "yes", "y", "on"].includes(text);
};

const generateTemporaryPassword = (length = 8) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function PromotionSystem() {
  const navigate = useNavigate();

  // ---------------- SESSION (registrar/finance + admin alias) ----------------
  const { finance, admin: adminBase, schoolCode, DB_ROOT } = useRegistrarSession();
  const admin = {
    ...adminBase,
    username: finance.username || "",
    role: String(finance.role || "registrar").toLowerCase(),
  };
  const DB_URL = DB_ROOT || FIREBASE_DATABASE_URL;

  const canConfirmPromotion =
    ["admin", "registrar", "school_admin"].includes(admin.role) || !admin.role;
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const [step, setStep] = useState(1);
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [maxGrade, setMaxGrade] = useState("12");


  const [runLocked] = useState(false);
  const [processedStudentIds, setProcessedStudentIds] = useState({});

  const notify = (type, text) => setFeedback({ type, text });

  // ---------------- PROMOTION DATA (years + grades + students + history) ----------------
  const {
    academicYears,
    currentAcademicYear,
    gradesMap,
    studentsMap,
    yearHistoryStudentsMap,
    yearHistoryLoading,
    loading,
    loadBaseData,
    loadYearHistoryStudents,
  } = usePromotionData({
    schoolCode,
    DB_URL,
    fromYear,
    setFromYear,
    toYear,
    setToYear,
    notify,
  });

  // ---------------- RE-REGISTER DRAFT (state + lightweight mutators) ----------------
  const {
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
    initReRegisterDraft,
    moveReRegisterIndex,
    updateDraftField,
    updateParentDraftField,
    addParentDraftRow,
    removeParentDraftRow,
  } = useReRegisterDraft({ toYear });

  const gradeKeys = useMemo(
    () => Object.keys(gradesMap || {}).sort((a, b) => Number(a) - Number(b)),
    [gradesMap]
  );

  const yearKeys = useMemo(
    () => Object.keys(academicYears || {}).sort((a, b) => b.localeCompare(a)),
    [academicYears]
  );

  // ---------------- STUDENT REVIEW (filters + derived memos for Step 2) ----------------
  const {
    gradeFilter,
    setGradeFilter,
    sectionFilter,
    setSectionFilter,
    studentSearch,
    setStudentSearch,
    studentsForFromYear,
    sectionOptionsByGrade,
    availableGrades,
    availableSections,
    visibleStudents,
    groupedVisibleStudents,
  } = useStudentReview({
    fromYear,
    toYear,
    yearHistoryStudentsMap,
    studentsMap,
    processedStudentIds,
    gradesMap,
    gradeKeys,
  });

  // ---------------- DECISIONS + SELECTION (per-student) ----------------
  const {
    decisions,
    setDecisions,
    selectedStudentsMap,
    setSelectedStudentsMap,
    confirmText,
    setConfirmText,
    updateDecision,
    toggleStudentSelection,
    setAllSelection,
    resetForStudents,
    effectiveDecision,
    selectedStudents,
    summary,
  } = useDecisions({
    studentsForFromYear,
    visibleStudents,
    maxGrade,
  });




  useEffect(() => {
    // Reset processed cache when year range changes.
    setProcessedStudentIds({});
    setDraftOverrides({});
  }, [fromYear, toYear]);






  const prepareReview = () => {
    if (!fromYear || !toYear) {
      notify("error", "Select From Year and To Year first.");
      return;
    }

    if (yearHistoryLoading) {
      notify("warning", "YearHistory is still loading. Please wait.");
      return;
    }

    if (studentsForFromYear.length === 0) {
      notify("warning", `No students found in YearHistory for ${yearLabel(fromYear)}.`);
      return;
    }

    resetForStudents(studentsForFromYear);
    setStep(2);
    notify("success", `Loaded ${studentsForFromYear.length} active students for review.`);
  };










  const loadParentSources = async () => {
    const [yearHistoryParentsMap, mainParentsMap] = await Promise.all([
      fetchCachedJson(`${DB_URL}/YearHistory/${fromYear}/Parents.json`, { ttlMs: 60000 }).catch(() => ({})),
      loadSchoolParentsNode({ rtdbBase: DB_URL }),
    ]);

    return {
      yearHistoryParentsMap: yearHistoryParentsMap || {},
      mainParentsMap: mainParentsMap || {},
    };
  };

  const buildReRegisterQueueItem = async (student, decision, parentSources) => {
    const { yearHistoryParentsMap, mainParentsMap } = parentSources || (await loadParentSources());
    const fullRes = await axios
      .get(`${DB_URL}/YearHistory/${fromYear}/Students/${student.studentId}.json`)
      .catch(() => ({ data: null }));

    const sourceStudent = fullRes.data || student.rawHistory || student.raw || {};
    const fromInfoParents = normalizeParents(sourceStudent.parentGuardianInformation?.parents);
    const linkedParentsMap = sourceStudent.parents || {};
    const seenParentIds = new Set(fromInfoParents.map((p) => String((p || {}).parentId || "").trim()).filter(Boolean));
    const mergedParents = [...fromInfoParents];

    Object.keys(linkedParentsMap).forEach((parentId) => {
      const pid = String(parentId || "").trim();
      if (!pid || seenParentIds.has(pid)) return;

      const linked = linkedParentsMap[pid] || {};
      const parentNode = yearHistoryParentsMap[pid] || mainParentsMap[pid] || {};
      mergedParents.push({
        parentId: pid,
        fullName: String(parentNode.name || "").trim(),
        relationship: String(linked.relationship || "Guardian").trim() || "Guardian",
        phone: String(parentNode.phone || "").trim(),
        alternativePhone: "",
        email: String(parentNode.email || "").trim(),
        occupation: String(parentNode.occupation || "").trim(),
        nationalIdNumber: String(parentNode.nationalIdNumber || "").trim(),
        systemAccountInformation: {
          username: pid,
          temporaryPassword: "",
          isActive: "true",
          role: "parent",
        },
      });
    });

    return {
      student,
      decision,
      fullStudent: {
        ...sourceStudent,
        parentGuardianInformation: {
          ...(sourceStudent.parentGuardianInformation || {}),
          parents: mergedParents,
        },
      },
      draftOverride: draftOverrides[student.studentId] || null,
    };
  };

  const openStudentDraftEditor = async (student) => {
    const decision = effectiveDecision(student);
    if (!(decision.action === ACTIONS.promote || decision.action === ACTIONS.repeat)) {
      notify("warning", "Only students staying in school can be edited from this table.");
      return;
    }

    setWorking(true);
    try {
      const parentSources = await loadParentSources();
      const queueItem = await buildReRegisterQueueItem(student, decision, parentSources);
      setReRegisterQueue([queueItem]);
      setReRegisterIndex(0);
      setReRegisterMode("edit");
      initReRegisterDraft(queueItem);
      setShowReRegisterModal(true);
      notify("", "");
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to open student editor.");
    } finally {
      setWorking(false);
    }
  };






  const handleSaveReRegister = async () => {
    if (!reRegisterDraft?.studentId) {
      notify("error", "Missing student to re-register.");
      return;
    }

    setReRegisterSaving(true);
    try {
      const parsed = reRegisterDraft?.sourceData || {};

      const form = reRegisterDraft.form || {};
      const fullName = [form.firstName, form.middleName, form.lastName]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
        .join(" ") || form.name || parsed.name || "Student";

      const parents = (reRegisterDraft.parents || []).map((parent) => ({
        parentId: String(parent.parentId || "").trim(),
        fullName: String(parent.fullName || "").trim(),
        relationship: String(parent.relationship || "Guardian").trim() || "Guardian",
        phone: String(parent.phone || "").trim(),
        alternativePhone: String(parent.alternativePhone || "").trim(),
        email: String(parent.email || "").trim(),
        occupation: String(parent.occupation || "").trim(),
        nationalIdNumber: String(parent.nationalIdNumber || "").trim(),
        systemAccountInformation: {
          username: String(parent.username || "").trim(),
          temporaryPassword: String(parent.temporaryPassword || "").trim(),
          isActive: String(parent.isActive || "true").trim() || "true",
          role: String(parent.role || "parent").trim() || "parent",
        },
      }));

      const yearSuffix = String(toYear || new Date().getFullYear()).match(/\d{4}/)?.[0]?.slice(-2) || String(new Date().getFullYear()).slice(-2);
  const schoolInfo = await loadSchoolInfoNode({ rtdbBase: DB_URL });
  const shortName = String(schoolInfo?.shortName || stored.shortName || stored.schoolShortName || "GP").trim() || "GP";
      const parentPrefix = `${shortName}P`;

  const existingParents = await loadSchoolParentsNode({ rtdbBase: DB_URL });
      const parentPattern = new RegExp(`^${parentPrefix}_(\\d{4})_${yearSuffix}$`);
      let maxParentSeq = 0;
      Object.keys(existingParents).forEach((key) => {
        const m = String(key || "").match(parentPattern);
        if (!m || !m[1]) return;
        const n = Number(m[1]);
        if (!Number.isNaN(n) && n > maxParentSeq) maxParentSeq = n;
      });

      const normalizedParents = parents
        .filter((row) => row.fullName || row.phone || row.email || row.parentId)
        .map((row) => {
          let parentId = row.parentId;
          if (!parentId) {
            maxParentSeq += 1;
            parentId = `${parentPrefix}_${String(maxParentSeq).padStart(4, "0")}_${yearSuffix}`;
          }
          const account = row.systemAccountInformation || {};
          return {
            ...row,
            parentId,
            systemAccountInformation: {
              username: String(account.username || parentId).trim() || parentId,
              temporaryPassword: String(account.temporaryPassword || generateTemporaryPassword(8)).trim(),
              isActive: String(account.isActive || "true").trim() || "true",
              role: String(account.role || "parent").trim() || "parent",
            },
          };
        });

      const merged = {
        ...(parsed || {}),
        studentId: reRegisterDraft.studentId,
        userId: reRegisterDraft.userId || form.userId || parsed.userId || "",
        name: fullName,
        firstName: form.firstName || "",
        middleName: form.middleName || "",
        lastName: form.lastName || "",
        grade: String(form.grade || ""),
        section: String(form.section || "").toUpperCase(),
        gender: form.gender || "",
        dob: form.dob || "",
        admissionDate: form.admissionDate || "",
        previousSchool: form.previousSchool || "",
        academicYear: toYear,
        status: String(form.status || "active"),
        nationalIdNumber: form.nationalIdNumber || "",
        phone: form.phone || "",
        email: form.email || "",
        reRegisteredAt: new Date().toISOString(),
        basicStudentInformation: {
          ...(parsed.basicStudentInformation || {}),
          studentId: reRegisterDraft.studentId,
          firstName: form.firstName || "",
          middleName: form.middleName || "",
          lastName: form.lastName || "",
          name: fullName,
          gender: form.gender || "",
          dob: form.dob || "",
          admissionDate: form.admissionDate || "",
          academicYear: toYear,
          grade: String(form.grade || ""),
          section: String(form.section || "").toUpperCase(),
          previousSchool: form.previousSchool || "",
          status: String(form.status || "active"),
          nationalIdNumber: form.nationalIdNumber || "",
        },
        parentGuardianInformation: {
          ...(parsed.parentGuardianInformation || {}),
          parents: normalizedParents,
        },
        addressInformation: {
          ...(parsed.addressInformation || {}),
          region: form.region || "",
          city: form.city || "",
          subCity: form.subCity || "",
          kebele: form.kebele || "",
          houseNumber: form.houseNumber || "",
        },
        financeInformation: {
          ...(parsed.financeInformation || {}),
          registrationFeePaid: form.registrationFeePaid || "yes",
          hasDiscount: form.hasDiscount || "no",
          discountAmount: form.discountAmount || "",
          paymentPlanType: form.paymentPlanType || "monthly",
          transportService: form.transportService || "no",
        },
        healthEmergency: {
          ...(parsed.healthEmergency || {}),
          bloodType: form.bloodType || "",
          medicalCondition: form.medicalCondition || "",
          emergencyContactName: form.emergencyContactName || "",
          emergencyPhone: form.emergencyPhone || "",
        },
        academicSetup: {
          ...(parsed.academicSetup || {}),
          stream: form.stream || "",
          specialProgram: form.specialProgram || "",
          languageOption: form.languageOption || "",
          electiveSubjects: form.electiveSubjects || "",
        },
        systemAccountInformation: {
          ...(parsed.systemAccountInformation || {}),
          username: form.username || reRegisterDraft.studentId,
          temporaryPassword: form.temporaryPassword || "",
          isActive: String(form.isActive || "true"),
          role: form.role || "student",
          userId: reRegisterDraft.userId || form.userId || parsed.userId || "",
        },
      };

      if (reRegisterMode === "edit") {
        const savedDraft = {
          ...reRegisterDraft,
          studentId: reRegisterDraft.studentId,
          userId: merged.userId || reRegisterDraft.userId || form.userId || parsed.userId || "",
          sourceData: merged,
          form: {
            ...form,
            name: fullName,
            grade: String(merged.grade || ""),
            section: String(merged.section || "").toUpperCase(),
            academicYear: toYear,
            status: String(merged.status || "active"),
            userId: merged.userId || reRegisterDraft.userId || form.userId || parsed.userId || "",
          },
          parents: normalizedParents,
        };

        setDraftOverrides((prev) => ({
          ...prev,
          [reRegisterDraft.studentId]: savedDraft,
        }));
        setDecisions((prev) => ({
          ...prev,
          [reRegisterDraft.studentId]: {
            ...(prev[reRegisterDraft.studentId] || {}),
            targetSection: String(savedDraft.form.section || "").toUpperCase(),
          },
        }));
        setShowReRegisterModal(false);
        setReRegisterQueue([]);
        setReRegisterIndex(0);
        setReRegisterDraft(null);
        setReRegisterMode("reregister");
        notify("success", "Student edit draft saved. It will be used during re-registration.");
        return;
      }

      await axios.patch(`${DB_URL}/Students/${reRegisterDraft.studentId}.json`, merged);

      // Lazy-load the Users node only when a student/parent lacks a stored userId.
      // In the common case (userId already set on both records) the 22 MB node is never downloaded.
      let lazyUsersMap = null;
      const getUsersMap = async () => {
        if (!lazyUsersMap) lazyUsersMap = await loadSchoolUsersNode({ rtdbBase: DB_URL });
        return lazyUsersMap;
      };

      const studentActive = true;
      const desiredStudentUsername = String(merged.systemAccountInformation?.username || merged.studentId || "").trim() || merged.studentId;

      let chosenStudentUserId = String(merged.userId || merged.systemAccountInformation?.userId || "").trim();
      let studentCandidates = [];
      if (!chosenStudentUserId) {
        const usersMap = await getUsersMap();
        studentCandidates = Object.entries(usersMap).filter(([, row]) => {
          const user = row || {};
          return String(user.studentId || "") === String(merged.studentId || "")
            || String(user.username || "").toLowerCase() === desiredStudentUsername.toLowerCase();
        });
        if (studentCandidates.length > 0) chosenStudentUserId = studentCandidates[0][0];
      }

      if (chosenStudentUserId) {
        await axios.patch(`${DB_URL}/Users/${chosenStudentUserId}.json`, {
          name: merged.name,
          email: merged.email || "",
          phone: merged.phone || "",
          username: desiredStudentUsername,
          studentId: merged.studentId,
          isActive: studentActive,
          role: "student",
          schoolCode,
        });

        const duplicateStudentUserIds = studentCandidates
          .map(([uid]) => uid)
          .filter((uid) => uid !== chosenStudentUserId);

        await Promise.all(
          duplicateStudentUserIds.map((uid) => axios.patch(`${DB_URL}/Users/${uid}.json`, { isActive: false }))
        );

        merged.userId = chosenStudentUserId;
        merged.systemAccountInformation = {
          ...(merged.systemAccountInformation || {}),
          userId: chosenStudentUserId,
          username: desiredStudentUsername,
          isActive: studentActive,
          role: "student",
        };

        await axios.patch(`${DB_URL}/Students/${reRegisterDraft.studentId}.json`, {
          userId: chosenStudentUserId,
          systemAccountInformation: merged.systemAccountInformation,
        });
      }

      await Promise.all(
        normalizedParents.map(async (parent) => {
          const account = parent.systemAccountInformation || {};
          const username = String(account.username || parent.parentId).trim() || parent.parentId;
          const isActive = true;
          const role = String(account.role || "parent").trim() || "parent";

          let parentUserId = "";
          let parentCandidates = [];
          // Prefer the direct userId stored on the parent record — avoids loading the full Users node
          if (existingParents[parent.parentId]?.userId) {
            parentUserId = String(existingParents[parent.parentId].userId || "");
          } else if (account.userId) {
            parentUserId = String(account.userId || "");
          } else {
            const usersMap = await getUsersMap();
            parentCandidates = Object.entries(usersMap).filter(([, row]) => {
              const user = row || {};
              return String(user.parentId || "") === String(parent.parentId || "")
                || String(user.username || "").toLowerCase() === username.toLowerCase();
            });

            Object.entries(usersMap).forEach(([uid, row]) => {
              if (parentUserId) return;
              const user = row || {};
              if (String(user.parentId || "") === parent.parentId) parentUserId = uid;
              if (!parentUserId && String(user.username || "").toLowerCase() === username.toLowerCase()) parentUserId = uid;
            });
          }

          if (!parentUserId && parentCandidates.length > 0) {
            parentUserId = parentCandidates[0][0];
          }

          const parentUserPayload = {
            userId: parentUserId || undefined,
            name: parent.fullName || "Parent",
            username,
            password: account.temporaryPassword || generateTemporaryPassword(8),
            email: parent.email || "",
            phone: parent.phone || "",
            profileImage: "/default-profile.png",
            role,
            isActive,
            schoolCode,
            parentId: parent.parentId,
            nationalIdNumber: parent.nationalIdNumber || "",
            nationalIdImage: existingParents[parent.parentId]?.nationalIdImage || "",
          };

          if (parentUserId) {
            await axios.patch(`${DB_URL}/Users/${parentUserId}.json`, parentUserPayload);
          }

          const duplicateParentUserIds = parentCandidates
            .map(([uid]) => uid)
            .filter((uid) => uid !== parentUserId);

          await Promise.all(
            duplicateParentUserIds.map((uid) => axios.patch(`${DB_URL}/Users/${uid}.json`, { isActive: false }))
          );

          await axios.patch(`${DB_URL}/Parents/${parent.parentId}.json`, {
            parentId: parent.parentId,
            userId: parentUserId || "",
            name: parent.fullName || "Parent",
            phone: parent.phone || "",
            email: parent.email || "",
            occupation: parent.occupation || "",
            nationalIdNumber: parent.nationalIdNumber || "",
            nationalIdImage: existingParents[parent.parentId]?.nationalIdImage || "",
            status: "active",
            schoolCode,
            updatedAt: new Date().toISOString(),
          });

          await axios.patch(`${DB_URL}/Students/${reRegisterDraft.studentId}/parents/${parent.parentId}.json`, {
            relationship: parent.relationship || "Guardian",
            userId: parentUserId || "",
            parentId: parent.parentId,
            linkedAt: new Date().toISOString(),
          });
        })
      );

      const isLast = reRegisterIndex >= reRegisterQueue.length - 1;
      const savedStudentId = reRegisterDraft.studentId;

      if (savedStudentId) {
        setProcessedStudentIds((prev) => ({ ...prev, [savedStudentId]: true }));
        setSelectedStudentsMap((prev) => ({ ...prev, [savedStudentId]: false }));
        setDecisions((prev) => {
          const next = { ...prev };
          delete next[savedStudentId];
          return next;
        });
      }

      if (isLast) {
        setShowReRegisterModal(false);
        setReRegisterQueue([]);
        setReRegisterIndex(0);
        setReRegisterDraft(null);
        notify("success", "Promotion done and re-registration details saved.");
      } else {
        moveReRegisterIndex(reRegisterIndex + 1);
      }
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to save re-registration.");
    } finally {
      setReRegisterSaving(false);
    }
  };




  const applyPromotion = async () => {
    if (!canConfirmPromotion) {
      notify("error", "Only admin/registrar can confirm promotion.");
      return;
    }

    if (!fromYear || !toYear) {
      notify("error", "Year selection is missing.");
      return;
    }

    if (normalizeYearKey(fromYear) === normalizeYearKey(toYear)) {
      notify("error", "From Year and To Year must be different.");
      return;
    }

    if (selectedStudents.length === 0) {
      notify("warning", "Select at least one student before confirming promotion.");
      return;
    }

    setWorking(true);
    try {
      const now = new Date().toISOString();

      await Promise.all(
        selectedStudents.map(async (student) => {
          const decision = effectiveDecision(student);
          if (decision.action === ACTIONS.promote || decision.action === ACTIONS.repeat) {
            // Re-register step is the source of truth for year/grade movement.
            return;
          }

          const source = student.raw || {};
          const sourceHistory = student.rawHistory || {};
          const seed = { ...(sourceHistory || {}), ...(source || {}) };
          const oldRecords = seed.records || {};
          const historyRecords = sourceHistory.records || {};
          const historyFromRecord = historyRecords[fromYear] || {
            academicYear: fromYear,
            grade: String(student.grade || sourceHistory.grade || ""),
            section: String(student.section || sourceHistory.section || ""),
            status: student.status || "active",
          };
          const fromRecord = historyFromRecord || oldRecords[fromYear] || {
            academicYear: fromYear,
            grade: String(student.grade || sourceHistory.grade || ""),
            section: String(student.section || sourceHistory.section || ""),
            status: student.status || "active",
          };

          const initialGrade = String(seed.grade || sourceHistory.grade || student.grade || "");
          const initialSection = String(seed.section || sourceHistory.section || student.section || "").toUpperCase();
          let nextGrade = initialGrade;
          let nextSection = initialSection;
          let nextStatus = String(seed.status || student.status || "active");

          const basePatch = {
            ...seed,
            // Ensure missing student root can be reconstructed from YearHistory snapshot.
            studentId: seed.studentId || student.studentId,
            userId: seed.userId || student.userId || "",
            name: seed.name || student.name || "Student",
            updatedAt: now,
            records: {
              ...oldRecords,
              [fromYear]: {
                ...fromRecord,
                academicYear: fromYear,
                sourceNode: "YearHistory",
              },
            },
          };

          if (decision.action === ACTIONS.graduate) {
            const targetRecord = {
              academicYear: toYear,
              grade: String(student.grade || ""),
              section: String(student.section || ""),
              status: "graduated",
              sourceAction: ACTIONS.graduate,
              graduatedAt: now,
              notes: decision.notes || "",
            };

            nextGrade = String(student.grade || initialGrade || "");
            nextSection = String(student.section || initialSection || "").toUpperCase();
            nextStatus = "graduated";
            basePatch.records[toYear] = targetRecord;
            basePatch.academicYear = toYear;
            basePatch.status = "graduated";
            basePatch.grade = nextGrade;
            basePatch.section = nextSection;
          }

          if (decision.action === ACTIONS.transfer || decision.action === ACTIONS.withdraw) {
            const statusAfterMove = decision.action === ACTIONS.transfer ? "transferred" : "withdrawn";
            const targetRecord = {
              academicYear: toYear,
              grade: String(student.grade || ""),
              section: String(student.section || ""),
              status: statusAfterMove,
              sourceAction: decision.action,
              updatedAt: now,
              notes: decision.notes || "",
            };

            nextGrade = String(student.grade || initialGrade || "");
            nextSection = String(student.section || initialSection || "").toUpperCase();
            nextStatus = statusAfterMove;
            basePatch.records[toYear] = targetRecord;
            basePatch.academicYear = toYear;
            basePatch.status = statusAfterMove;
            basePatch.grade = nextGrade;
            basePatch.section = nextSection;
          }

          basePatch.basicStudentInformation = {
            ...(seed.basicStudentInformation || {}),
            studentId: basePatch.studentId,
            name: basePatch.name,
            grade: nextGrade,
            section: nextSection,
            academicYear: toYear,
            status: nextStatus,
          };

          basePatch.systemAccountInformation = {
            ...(seed.systemAccountInformation || {}),
            userId: basePatch.userId || seed.systemAccountInformation?.userId || "",
            username: seed.systemAccountInformation?.username || basePatch.studentId,
            role: seed.systemAccountInformation?.role || "student",
          };

          await axios.patch(`${DB_URL}/Students/${student.studentId}.json`, basePatch);
        })
      );

      const reRegisterTargets = selectedStudents.filter((student) => {
        const action = effectiveDecision(student).action;
        return action === ACTIONS.promote || action === ACTIONS.repeat;
      });

      if (reRegisterTargets.length > 0) {
        const parentSources = await loadParentSources();
        const queue = await Promise.all(
          reRegisterTargets.map((student) => buildReRegisterQueueItem(student, effectiveDecision(student), parentSources))
        );

        // Lifecycle rule: rollover deactivates existing Users accounts only.
        // Collect deactivation IDs from direct references first to avoid downloading the 22 MB Users node.
        const deactivateUserIds = new Set();
        const parentIdsNeedingLookup = new Set();

        queue.forEach((entry) => {
          const fullStudent = entry.fullStudent || {};
          const studentUserId = String(fullStudent.userId || entry.student?.userId || "").trim();
          if (studentUserId) deactivateUserIds.add(studentUserId);

          const parentIds = new Set();
          Object.keys(fullStudent.parents || {}).forEach((pid) => {
            if (pid) parentIds.add(pid);
          });
          normalizeParents(fullStudent.parentGuardianInformation?.parents).forEach((p) => {
            const pid = String(p?.parentId || "").trim();
            if (pid) parentIds.add(pid);
          });

          parentIds.forEach((pid) => {
            const linkedParentUserId = String(fullStudent.parents?.[pid]?.userId || "").trim();
            if (linkedParentUserId) {
              deactivateUserIds.add(linkedParentUserId);
            } else {
              parentIdsNeedingLookup.add(pid);
            }
          });
        });

        // Only load the full Users node when parent records lack a direct userId reference (uncommon)
        if (parentIdsNeedingLookup.size > 0) {
          const usersMap = await loadSchoolUsersNode({ rtdbBase: DB_URL }); // uses 5-min TTL cache
          Object.entries(usersMap).forEach(([uid, row]) => {
            if (parentIdsNeedingLookup.has(String((row || {}).parentId || ""))) {
              deactivateUserIds.add(uid);
            }
          });
        }

        await Promise.all(
          [...deactivateUserIds].map((uid) => axios.patch(`${DB_URL}/Users/${uid}.json`, { isActive: false }))
        );

        setReRegisterQueue(queue);
        setReRegisterIndex(0);
        setReRegisterMode("reregister");
        initReRegisterDraft(queue[0]);
        setShowReRegisterModal(true);
      }

      setStep(3);
      setConfirmText("");
      notify("success", `Promotion confirmed. ${summary.promoteCount} promoted, ${summary.repeatCount} repeated, ${summary.graduateCount} graduated.`);
      await loadBaseData();
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to confirm promotion.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="dashboard-page" style={{ background: PAGE_BG, minHeight: "100vh" }}>
      <style>
        {`
          .ps-root { color: var(--text-primary); }
          .ps-dashboard { display: flex; gap: 14px; padding: 12px; }
          .ps-sidebar { width: 220px; }
          .ps-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .ps-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
          .ps-table { display: grid; grid-template-columns: 0.35fr 1.25fr 0.45fr 0.45fr 0.8fr 0.5fr 0.8fr 0.75fr; gap: 8px; align-items: center; }
          .ps-rereg-body { display: grid; grid-template-columns: 1fr; gap: 14px; }
          .ps-rereg-section { border: 1px solid var(--border-soft); border-radius: 12px; padding: 10px; background: var(--surface-muted); }
          .ps-rereg-section:hover { border-color: var(--border-strong); }
          .ps-rereg-section-title { font-size: 13px; font-weight: 800; color: var(--text-primary); margin: 0 0 8px; }
          .ps-rereg-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .ps-rereg-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
          .ps-rereg-field label { display: block; margin-bottom: 4px; font-size: 11px; font-weight: 700; color: var(--text-secondary); }
          .ps-rereg-field input, .ps-rereg-field select, .ps-rereg-field textarea { width: 100%; border: 1px solid var(--input-border); border-radius: 8px; padding: 7px 9px; font-size: 12px; box-sizing: border-box; background: var(--input-bg); color: var(--text-primary); }
          .ps-panel { background: var(--surface-panel); border: 1px solid var(--border-soft); border-radius: 16px; box-shadow: var(--shadow-panel); }
          .ps-kpi { position: relative; overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; }
          .ps-kpi::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--kpi-color, #2563eb); }
          .ps-kpi:hover { transform: translateY(-1px); box-shadow: 0 16px 28px color-mix(in srgb, var(--shadow-panel) 80%, transparent); }
          .ps-table-head { position: sticky; top: 0; z-index: 2; background: var(--surface-muted); }
          .ps-row { transition: background .2s ease; }
          .ps-row:hover { background: var(--surface-muted); }
          .ps-btn { border-radius: 9px; padding: 8px 12px; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: transform .15s ease, box-shadow .2s ease, background .2s ease; }
          .ps-btn:hover { transform: translateY(-1px); }
          .ps-btn:disabled { transform: none; cursor: not-allowed; opacity: .65; }
          .ps-btn-primary { border: 1px solid #1d4ed8; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; box-shadow: 0 10px 18px rgba(37, 99, 235, 0.25); }
          .ps-btn-soft { border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); background: var(--accent-soft); color: var(--accent-strong); }
          .ps-btn-danger { border: 1px solid #dc2626; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; box-shadow: 0 10px 18px rgba(220, 38, 38, 0.24); }
          .ps-step-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 900; color: var(--text-primary); margin-bottom: 10px; }
          .ps-step-chip { background: var(--accent-soft); color: var(--accent-strong); border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 800; }
          .ps-input, .ps-select { border: 1px solid var(--input-border); border-radius: 8px; padding: 8px 10px; font-size: 13px; background: var(--input-bg); color: var(--text-primary); }
          .ps-input:focus, .ps-select:focus, .ps-rereg-field input:focus, .ps-rereg-field select:focus, .ps-rereg-field textarea:focus { outline: none; border-color: var(--input-focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent); }
          .ps-hero-note { margin-top: 8px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); background: var(--accent-soft); color: var(--accent-strong); border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 800; }
          @media (max-width: 1180px) { .ps-dashboard { flex-direction: column; } .ps-sidebar { width: auto; } }
          @media (max-width: 980px) {
            .ps-grid-2 { grid-template-columns: 1fr; }
            .ps-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .ps-table { grid-template-columns: 1fr; }
            .ps-rereg-body { grid-template-columns: 1fr; }
            .ps-rereg-grid-2, .ps-rereg-grid-3 { grid-template-columns: 1fr; }
          }
          @media (max-width: 640px) {
            .ps-stats { grid-template-columns: 1fr; }
            .ps-dashboard { padding: 8px; }
          }
        `}
      </style>

      <nav className="top-navbar" style={{ borderBottom: "1px solid var(--border-soft)", background: "color-mix(in srgb, var(--surface-panel) 88%, transparent)", backdropFilter: "blur(6px)" }}>
        <h2 style={{ color: "var(--text-primary)", fontWeight: 900, letterSpacing: "0.2px" }}>Gojo Register Portal</h2>
        <div className="nav-right">
          <Link className="icon-circle" to="/dashboard"><FaBell /></Link>
          <Link className="icon-circle" to="/all-chat"><FaFacebookMessenger /></Link>
          <ProfileAvatar imageUrl={admin.profileImage} name={admin.name} size={38} className="profile-img" />
        </div>
      </nav>

      <div className="ps-dashboard ps-root">
        <RegisterSidebar user={admin} sticky fullHeight />
        <div className="main-content" style={{ padding: "10px 8px 20px", flex: 1, minWidth: 0, boxSizing: "border-box" }}>
          <div style={{ width: "min(100%, 1220px)", margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="ps-panel section-header-card" style={{ padding: 18 }}>
              <div className="section-header-card__row">
                <div>
                  <h1 className="section-header-card__title" style={{ fontSize: 24, fontWeight: 900 }}>Promotion System</h1>
                    <p className="section-header-card__subtitle" style={{ fontSize: 13 }}>
                      End-of-year workflow from YearHistory snapshot: review selected students, confirm actions, and complete re-registration.
                  </p>
                  <div className="ps-hero-note"><FaLock /> Confirm key: PROMOTE</div>
                </div>

                <button type="button" onClick={loadBaseData} className="ps-btn ps-btn-soft" disabled={loading || working}>
                  <FaSyncAlt /> Refresh
                </button>
              </div>
            </div>

            <div className="ps-stats">
              {[{
                  title: "YearHistory Students",
                value: studentsForFromYear.length,
                  hint: fromYear ? `Source: YearHistory/${fromYear}` : "No year selected",
                color: "#2563eb",
              }, {
                title: "Promote",
                value: summary.promoteCount,
                hint: "Move to next grade",
                color: "#0f766e",
              }, {
                title: "Repeat",
                value: summary.repeatCount,
                hint: "Stay in same grade",
                color: "#b45309",
              }, {
                title: "Graduate",
                value: summary.graduateCount,
                hint: "Final grade complete",
                color: "#7c3aed",
              }].map((item) => (
                <div key={item.title} className="ps-kpi" style={{ ...cardStyle, padding: 12, "--kpi-color": item.color }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{item.title}</span>
                    <FaUsers style={{ color: item.color }} />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 900, color: "var(--text-primary)" }}>{item.value}</div>
                  <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)" }}>{item.hint}</div>
                </div>
              ))}
            </div>

            {feedback.text ? (
              <div style={{ borderRadius: 12, padding: "10px 12px", fontSize: 13, fontWeight: 700, border: `1px solid ${feedback.type === "error" ? "#fecaca" : feedback.type === "warning" ? "#fde68a" : "#bfdbfe"}`, background: feedback.type === "error" ? "#fef2f2" : feedback.type === "warning" ? "#fffbeb" : "#eff6ff", color: feedback.type === "error" ? "#991b1b" : feedback.type === "warning" ? "#92400e" : "#1e3a8a" }}>
                {feedback.text}
              </div>
            ) : null}

            <div className="ps-panel" style={{ ...cardStyle, padding: 14 }}>
              <div className="ps-step-title">
                <span className="ps-step-chip">Step 1</span>
                Select Academic Year Range
              </div>

              <div className="ps-grid-2">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <select value={fromYear} onChange={(e) => setFromYear(e.target.value)} className="ps-select">
                    <option value="">From Year</option>
                    {yearKeys.map((key) => (
                      <option key={key} value={key}>{yearLabel(key)}</option>
                    ))}
                  </select>

                  <input value={toYear} onChange={(e) => setToYear(e.target.value)} placeholder="To Year e.g. 2027_2028" className="ps-input" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "120px auto", gap: 8, justifyContent: "end" }}>
                  <input value={maxGrade} onChange={(e) => setMaxGrade(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Max Grade" className="ps-input" />
                  <button onClick={prepareReview} className="ps-btn ps-btn-primary" disabled={loading || working || runLocked}>
                    <FaPlay /> Review Students
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
                Current Academic Year: {currentAcademicYear ? yearLabel(currentAcademicYear) : "Not set"}
                {" | Status: Ready"}
              </div>
            </div>

            {step >= 2 ? (
              <Step2StudentReview
                visibleStudents={visibleStudents}
                studentsForFromYear={studentsForFromYear}
                fromYear={fromYear}
                toYear={toYear}
                summary={summary}
                selectedStudentsMap={selectedStudentsMap}
                toggleStudentSelection={toggleStudentSelection}
                setAllSelection={setAllSelection}
                gradeFilter={gradeFilter}
                setGradeFilter={setGradeFilter}
                availableGrades={availableGrades}
                sectionFilter={sectionFilter}
                setSectionFilter={setSectionFilter}
                availableSections={availableSections}
                studentSearch={studentSearch}
                setStudentSearch={setStudentSearch}
                groupedVisibleStudents={groupedVisibleStudents}
                effectiveDecision={effectiveDecision}
                sectionOptionsByGrade={sectionOptionsByGrade}
                updateDecision={updateDecision}
                draftOverrides={draftOverrides}
                openStudentDraftEditor={openStudentDraftEditor}
                working={working}
                reRegisterSaving={reRegisterSaving}
              />
            ) : null}

            {step >= 2 ? (
              <div className="ps-panel" style={{ ...cardStyle, padding: 14 }}>
                <div className="ps-step-title">
                  <span className="ps-step-chip">Step 3</span>
                  Confirm Promotion
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type PROMOTE to confirm"
                    className="ps-input"
                  />

                  <button
                    onClick={applyPromotion}
                    className="ps-btn ps-btn-danger"
                    disabled={working || confirmText.trim().toUpperCase() !== "PROMOTE"}
                  >
                    <FaLock /> Confirm Promotion
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ReRegisterModal
        open={showReRegisterModal}
        draft={reRegisterDraft}
        mode={reRegisterMode}
        index={reRegisterIndex}
        queueLength={reRegisterQueue.length}
        saving={reRegisterSaving}
        onClose={() => setShowReRegisterModal(false)}
        onMoveIndex={moveReRegisterIndex}
        onUpdateField={updateDraftField}
        onUpdateParentField={updateParentDraftField}
        onAddParentRow={addParentDraftRow}
        onRemoveParentRow={removeParentDraftRow}
        onSave={handleSaveReRegister}
      />
    </div>
  );
}
