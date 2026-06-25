import { useRef, useState } from "react";
import axios from "axios";
import {
  loadUserRecordById,
  loadMarksForStudent,
  loadAttendanceForStudent,
  loadParentRecordsByIds,
  loadUserRecordsByIds,
  normalizeParentLinks,
} from "../../utils/registerData";

const computeAge = (dob) => {
  if (!dob) return null;
  try {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  } catch {
    return null;
  }
};

const fetchRtdbStudent = async (dbUrl, studentId) => {
  if (!studentId) return {};
  try {
    const res = await axios.get(`${dbUrl}/Students/${studentId}.json`);
    return res.data || {};
  } catch {
    return {};
  }
};

const buildParentInfo = (parentLink, parentNode, parentUser) => {
  const parentUserId = parentNode.userId || parentLink.userId;
  if (!parentUserId && !parentLink.name) return null;
  return {
    parentId: parentLink.parentId || parentNode.parentId || null,
    userId: parentUserId || null,
    name: parentUser.name || parentNode.name || parentLink.name || "Parent",
    phone:
      parentUser.phone ||
      parentUser.phoneNumber ||
      parentNode.phone ||
      parentLink.phone ||
      null,
    relationship: parentLink.relationship || null,
    profileImage:
      parentUser.profileImage ||
      parentNode.profileImage ||
      parentLink.profileImage ||
      "/default-profile.png",
  };
};

/**
 * useStudentDetail
 *
 * Owns `selectedStudent` state and the heavy student-selection load:
 * user record, marks, attendance, RTDB student record, and parent
 * resolution (parent records + parent user records).
 *
 * Uses a request-id ref so quick consecutive selections don't race —
 * only the latest request's result writes to state.
 */
export default function useStudentDetail({ dbUrl, activeSchoolCode, onOpenDrawer }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const studentSelectionRequestRef = useRef(0);

  const selectStudent = async (s) => {
    const requestId = studentSelectionRequestRef.current + 1;
    studentSelectionRequestRef.current = requestId;

    setSelectedStudent((prev) => {
      const isSameStudent = String(prev?.studentId || "") === String(s?.studentId || "");
      if (isSameStudent) {
        return {
          ...prev,
          ...s,
          profileImage: s?.profileImage || prev?.profileImage || "",
        };
      }
      return { ...s };
    });

    if (onOpenDrawer) onOpenDrawer();

    try {
      const user =
        (await loadUserRecordById({
          rtdbBase: dbUrl,
          schoolCode: activeSchoolCode,
          userId: s.userId,
        })) || {};

      const studentMarksObj = await loadMarksForStudent({
        rtdbBase: dbUrl,
        student: s,
        allowLegacy: true,
      });

      const attendanceData = await loadAttendanceForStudent({
        rtdbBase: dbUrl,
        student: s,
        courseIds: Object.keys(studentMarksObj || {}),
      });

      const rtStudent = await fetchRtdbStudent(dbUrl, s.studentId);

      const dobRaw = user?.dob || rtStudent?.dob || s?.dob;
      const age = computeAge(dobRaw);

      // Resolve parents
      const parentsList = [];
      let parentName = null;
      let parentPhone = null;
      try {
        const parentLinks = normalizeParentLinks({
          ...(rtStudent || {}),
          parents: rtStudent?.parents || s?.parents || {},
          parentGuardianInformation:
            rtStudent?.parentGuardianInformation ||
            s?.parentGuardianInformation ||
            {},
        });

        const parentIds = parentLinks.map((link) => link.parentId).filter(Boolean);
        const directParentUserIds = parentLinks.map((link) => link.userId).filter(Boolean);

        const parentRecords = await loadParentRecordsByIds({
          rtdbBase: dbUrl,
          schoolCode: activeSchoolCode,
          parentIds,
        });

        const parentUsers = await loadUserRecordsByIds({
          rtdbBase: dbUrl,
          schoolCode: activeSchoolCode,
          userIds: [
            ...new Set(
              [
                ...Object.values(parentRecords || {}).map((rec) => rec?.userId),
                ...directParentUserIds,
              ].filter(Boolean)
            ),
          ],
        });

        parentLinks.forEach((parentLink) => {
          const parentNode = parentRecords?.[parentLink.parentId] || {};
          const parentUser = parentUsers?.[parentNode.userId || parentLink.userId] || {};
          const info = buildParentInfo(parentLink, parentNode, parentUser);
          if (!info) return;
          parentsList.push(info);
          if (!parentName) parentName = info.name;
          if (!parentPhone) parentPhone = info.phone;
        });
      } catch {
        // ignore parent-resolution errors; keep the partial result
      }

      // Stale-request guard — drop result if a newer selection came in
      if (studentSelectionRequestRef.current !== requestId) return;

      setSelectedStudent((prev) => ({
        ...(prev || {}),
        ...s,
        ...rtStudent,
        ...user,
        marks: studentMarksObj,
        attendance: attendanceData,
        age,
        parents: parentsList,
        parentName,
        parentPhone,
      }));
    } catch (err) {
      if (studentSelectionRequestRef.current === requestId) {
        console.error("Error fetching student data:", err);
      }
    }
  };

  return {
    selectedStudent,
    setSelectedStudent,
    selectStudent,
    studentSelectionRequestRef,
  };
}
