import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BACKEND_BASE } from "../../config";
import {
  loadSchoolInfoNode,
  loadSchoolParentsNode,
  loadSchoolStudentsNode,
  loadSchoolUsersNode,
} from "../../utils/registerData";
import { fetchCachedJson } from "../../utils/rtdbCache";
import { persistResolvedSchoolSession, resolveSchoolScope } from "../../utils/schoolScope";

const normalizeParents = (node) => {
  if (Array.isArray(node)) return node;
  if (node && typeof node === "object") return Object.values(node);
  return [];
};

const getStudentStatus = (student = {}) =>
  String(student.status || student.basicStudentInformation?.status || "active").toLowerCase();

const getLinkedParentIds = (studentNode = {}) => {
  const parentIds = new Set();
  Object.keys(studentNode?.parents || {}).forEach((pid) => {
    if (pid) parentIds.add(String(pid));
  });
  normalizeParents(studentNode?.parentGuardianInformation?.parents).forEach((parent) => {
    const pid = String(parent?.parentId || "").trim();
    if (pid) parentIds.add(pid);
  });
  return [...parentIds];
};

const studentReferencesParent = (studentNode = {}, parentId) => {
  if (!parentId) return false;
  const canonicalParentId = String(parentId);
  if (studentNode?.parents && studentNode.parents[canonicalParentId]) return true;
  return normalizeParents(studentNode?.parentGuardianInformation?.parents).some(
    (parent) => String(parent?.parentId || "").trim() === canonicalParentId
  );
};

export default function useTransferWithdrawal({ schoolCode, DB_URL: initialDbUrl, admin }) {
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState(schoolCode);
  const [resolvedDbUrl, setResolvedDbUrl] = useState(initialDbUrl);
  const DB_URL = String(resolvedDbUrl || initialDbUrl || "").trim();
  const activeSchoolCode = String(resolvedSchoolCode || schoolCode || "").trim();

  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [academicYears, setAcademicYears] = useState({});
  const [currentAcademicYear, setCurrentAcademicYear] = useState("");
  const [studentsMap, setStudentsMap] = useState({});
  const [parentsMap, setParentsMap] = useState({});

  const notify = (type, text) => setFeedback({ type, text });

  useEffect(() => {
    const resolveScope = async () => {
      if (!schoolCode) return;
      try {
        const resolvedScope = await resolveSchoolScope(schoolCode);
        const nextResolvedSchoolCode = String(resolvedScope?.schoolCode || schoolCode || "").trim();
        const nextResolvedDbUrl = String(resolvedScope?.dbUrl || initialDbUrl || "").trim();
        const resolvedSchoolInfo = resolvedScope?.schoolInfo || {};

        setResolvedSchoolCode(nextResolvedSchoolCode);
        setResolvedDbUrl(nextResolvedDbUrl);

        if (nextResolvedSchoolCode && nextResolvedSchoolCode !== schoolCode) {
          persistResolvedSchoolSession(nextResolvedSchoolCode, String(resolvedSchoolInfo?.shortName || "").trim());
        }
      } catch (error) {
        console.error("Failed to resolve transfer/withdrawal school scope:", error);
        setResolvedSchoolCode(String(schoolCode || "").trim());
        setResolvedDbUrl(initialDbUrl);
      }
    };
    resolveScope();
  }, [schoolCode, initialDbUrl]);

  const loadBaseData = async () => {
    if (!activeSchoolCode) {
      notify("error", "Missing schoolCode in session. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const [yearsRes, dbYearsData, schoolInfo, studentsData, parentsData] = await Promise.all([
        axios.get(`${BACKEND_BASE}/api/academic-years`, { params: { schoolCode: activeSchoolCode } }).catch(() => ({ data: {} })),
        fetchCachedJson(`${DB_URL}/AcademicYears.json`, { ttlMs: 60000 }).catch(() => ({})),
        loadSchoolInfoNode({ rtdbBase: DB_URL }),
        loadSchoolStudentsNode({ rtdbBase: DB_URL }),
        loadSchoolParentsNode({ rtdbBase: DB_URL }),
      ]);

      const yearsPayload = yearsRes.data || {};
      const nextYears = yearsPayload.academicYears || dbYearsData || {};
      const derivedCurrent = Object.entries(nextYears || {}).find(([, row]) => !!row?.isCurrent)?.[0] || "";
      const nextCurrent = yearsPayload.currentAcademicYear || schoolInfo?.currentAcademicYear || derivedCurrent || "";

      setAcademicYears(nextYears);
      setCurrentAcademicYear(nextCurrent);
      setStudentsMap(studentsData || {});
      setParentsMap(parentsData || {});

      notify("", "");
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to load transfer/withdrawal data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, [activeSchoolCode, DB_URL]);

  const activeStudents = useMemo(() => {
    const list = [];
    Object.entries(studentsMap || {}).forEach(([studentId, row]) => {
      const student = row || {};
      const status = getStudentStatus(student);
      if (status !== "active") return;

      const name =
        student.name ||
        [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ") ||
        student.basicStudentInformation?.name ||
        "Student";

      list.push({
        studentId,
        name,
        grade: String(student.grade || student.basicStudentInformation?.grade || ""),
        section: String(student.section || student.basicStudentInformation?.section || "").toUpperCase(),
        userId: student.userId || student.systemAccountInformation?.userId || "",
        raw: student,
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [studentsMap]);

  const copyParentsToYearHistory = async (yearKey, studentNode) => {
    const parentIds = getLinkedParentIds(studentNode);
    await Promise.all(
      parentIds.map(async (pid) => {
        const parentPayload = parentsMap[pid] || {
          parentId: pid,
          name: "Parent",
          schoolCode: activeSchoolCode,
        };
        await axios.patch(`${DB_URL}/YearHistory/${yearKey}/Parents/${pid}.json`, {
          ...(parentPayload || {}),
          parentId: pid,
          schoolCode: activeSchoolCode,
          movedAt: new Date().toISOString(),
        });
      })
    );
  };

  const setUsersActiveByStudent = async (studentNode, isActive) => {
    const studentId = String(studentNode?.studentId || "");
    const studentUserId = String(studentNode?.userId || studentNode?.systemAccountInformation?.userId || "");
    const usernames = new Set([
      String(studentNode?.systemAccountInformation?.username || "").toLowerCase(),
      String(studentNode?.username || "").toLowerCase(),
    ].filter(Boolean));

    const patchUserIds = new Set();
    if (studentUserId) patchUserIds.add(studentUserId);

    if (patchUserIds.size === 0) {
      const users = await loadSchoolUsersNode({ rtdbBase: DB_URL });
      Object.entries(users).forEach(([uid, row]) => {
        const user = row || {};
        const uname = String(user.username || "").toLowerCase();
        if (String(user.studentId || "") === studentId) patchUserIds.add(uid);
        if (usernames.has(uname)) patchUserIds.add(uid);
      });
    }

    await Promise.all(
      [...patchUserIds].map((uid) => axios.patch(`${DB_URL}/Users/${uid}.json`, { isActive }))
    );
  };

  const cleanupParentsAfterStudentRemoval = async (studentNode, selectedStudentId) => {
    const studentId = String(studentNode?.studentId || selectedStudentId || "").trim();
    if (!studentId) return;

    const linkedParentIds = getLinkedParentIds(studentNode);
    if (linkedParentIds.length === 0) return;

    const remainingStudents = Object.entries(studentsMap || {}).filter(([sid]) => String(sid) !== studentId);

    await Promise.all(
      linkedParentIds.map(async (parentId) => {
        const parentRecord = parentsMap[parentId] || (await axios.get(`${DB_URL}/Parents/${parentId}.json`).catch(() => ({ data: null }))).data || null;
        const nextChildrenEntries = Object.entries(parentRecord?.children || {}).filter(
          ([, childLink]) => String(childLink?.studentId || "") !== studentId
        );
        const nextChildren = Object.fromEntries(nextChildrenEntries);
        const stillLinkedElsewhere = remainingStudents.some(([, studentRow]) => studentReferencesParent(studentRow || {}, parentId));

        if (!stillLinkedElsewhere) {
          await axios.delete(`${DB_URL}/Parents/${parentId}.json`).catch(() => {});

          const parentUserIds = new Set();
          const directUserId = String(parentRecord?.userId || studentNode?.parents?.[parentId]?.userId || "").trim();
          if (directUserId) {
            parentUserIds.add(directUserId);
          } else {
            const users = await loadSchoolUsersNode({ rtdbBase: DB_URL });
            Object.entries(users).forEach(([uid, userRow]) => {
              if (String(userRow?.parentId || "").trim() === String(parentId)) {
                parentUserIds.add(uid);
              }
            });
          }

          await Promise.all([...parentUserIds].map((uid) => axios.delete(`${DB_URL}/Users/${uid}.json`).catch(() => {})));
          return;
        }

        await axios.patch(`${DB_URL}/Parents/${parentId}.json`, {
          children: Object.keys(nextChildren).length ? nextChildren : null,
        }).catch(() => {});
      })
    );
  };

  const runStatusChange = async ({ selectedStudent, actionType, note, destinationSchool, registererPassword }) => {
    if (!selectedStudent) {
      notify("error", "Select a student first.");
      return { ok: false };
    }
    if (!currentAcademicYear) {
      notify("error", "Current academic year is missing.");
      return { ok: false };
    }
    if (!registererPassword) {
      return { ok: false, passwordError: "Enter your registerer password to continue." };
    }
    if (!admin.userId) {
      return { ok: false, passwordError: "Missing registerer session. Please login again." };
    }

    const finalStatus = actionType === "withdraw" ? "withdrawn" : actionType === "graduate" ? "graduated" : "transferred";
    setWorking(true);
    try {
      const currentUserRes = await axios.get(`${DB_URL}/Users/${admin.userId}.json`).catch(() => ({ data: null }));
      const currentUser = currentUserRes.data || null;
      const expectedPassword = String(currentUser?.password || "");

      if (!expectedPassword || expectedPassword !== registererPassword) {
        return { ok: false, passwordError: "Incorrect registerer password." };
      }

      const now = new Date().toISOString();
      const studentNode = selectedStudent.raw || {};

      const archivedPayload = {
        ...(studentNode || {}),
        studentId: selectedStudent.studentId,
        name: selectedStudent.name,
        grade: selectedStudent.grade,
        section: selectedStudent.section,
        academicYear: currentAcademicYear,
        status: finalStatus,
        transferAction: actionType,
        transferNote: note || "",
        destinationSchool: destinationSchool || "",
        movedAt: now,
        movedBy: admin.adminId || admin.username || "registrar",
        records: {
          ...(studentNode.records || {}),
          [currentAcademicYear]: {
            ...(studentNode.records?.[currentAcademicYear] || {}),
            academicYear: currentAcademicYear,
            grade: selectedStudent.grade,
            section: selectedStudent.section,
            status: finalStatus,
            sourceAction: actionType,
            movedAt: now,
            note: note || "",
            destinationSchool: destinationSchool || "",
          },
        },
      };

      await axios.patch(`${DB_URL}/YearHistory/${currentAcademicYear}/Students/${selectedStudent.studentId}.json`, archivedPayload);
      await copyParentsToYearHistory(currentAcademicYear, studentNode);
      await setUsersActiveByStudent(studentNode, false);
      await cleanupParentsAfterStudentRemoval(studentNode, selectedStudent.studentId);
      await axios.delete(`${DB_URL}/Students/${selectedStudent.studentId}.json`);

      notify("success", `${selectedStudent.name} moved to YearHistory as ${finalStatus}.`);
      await loadBaseData();
      return { ok: true };
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to process student status change.");
      return { ok: false };
    } finally {
      setWorking(false);
    }
  };

  return {
    loading,
    working,
    feedback,
    notify,
    academicYears,
    currentAcademicYear,
    studentsMap,
    parentsMap,
    activeStudents,
    loadBaseData,
    runStatusChange,
  };
}
