import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { getTeacherCourseContext } from "../api/teacherApi";
import { useTeacherSession } from "./useTeacherSession";
import { fetchCachedJson } from "../utils/rtdbCache";
import { loadUserRecordsByIds } from "../utils/teacherData";
import { getWeekNumber } from "../utils/studentHelpers";

const ATTENDANCE_RECENT_DATE_LIMITS = {
  daily: 45,
  weekly: 90,
  monthly: 180,
};

const normalizeIdentifier = (value) => String(value || "").trim();
const normalizeGrade = (value) => String(value ?? "").trim();
const normalizeSection = (value) => String(value ?? "").trim().toUpperCase();

export function useStudentAttendance({ selectedStudent, resolvedSchoolCode, rtdbBase }) {
  const { teacher, teacherUserId } = useTeacherSession();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const teacherRecordCacheRef = useRef(new Map());
  const attendanceCourseCacheRef = useRef(new Map());

  const loadUsersByIds = useCallback(
    async (userIds = []) => {
      const normalizedUserIds = [...new Set(userIds.map(normalizeIdentifier).filter(Boolean))];
      if (!normalizedUserIds.length) return {};

      const fetchedUsers = await loadUserRecordsByIds({
        rtdbBase,
        schoolCode: resolvedSchoolCode,
        userIds: normalizedUserIds,
      });

      return fetchedUsers || {};
    },
    [rtdbBase, resolvedSchoolCode]
  );

  const loadTeachersByIds = useCallback(
    async (teacherIds = []) => {
      const normalizedTeacherIds = [...new Set(teacherIds.map(normalizeIdentifier).filter(Boolean))];
      if (!normalizedTeacherIds.length) return {};

      const cachedTeachers = {};
      const missingTeacherIds = [];

      normalizedTeacherIds.forEach((teacherId) => {
        const cachedRecord = teacherRecordCacheRef.current.get(teacherId) || null;
        if (cachedRecord) {
          cachedTeachers[teacherId] = cachedRecord;
          return;
        }
        missingTeacherIds.push(teacherId);
      });

      if (!missingTeacherIds.length) return cachedTeachers;

      const fullTeachersNode = await fetchCachedJson(`${rtdbBase}/Teachers.json`, {
        ttlMs: 5 * 60 * 1000,
        fallbackValue: {},
      });

      const fetchedEntries = await Promise.all(
        missingTeacherIds.map(async (teacherId) => {
          const directRecord = await fetchCachedJson(`${rtdbBase}/Teachers/${encodeURIComponent(teacherId)}.json`, {
            ttlMs: 5 * 60 * 1000,
            fallbackValue: null,
          });
          if (directRecord && typeof directRecord === "object" && !Array.isArray(directRecord)) {
            return [teacherId, directRecord];
          }

          const matchedTeacher = Object.entries(fullTeachersNode || {}).find(([recordKey, teacherRecord]) => {
            const refs = [recordKey, teacherRecord?.teacherId, teacherRecord?.teacherKey, teacherRecord?.userId]
              .map(normalizeIdentifier)
              .filter(Boolean);
            return refs.includes(teacherId);
          });

          return [teacherId, matchedTeacher?.[1] || null];
        })
      );

      const fetchedTeachers = {};
      fetchedEntries.forEach(([teacherId, teacherRecord]) => {
        if (!teacherRecord) return;
        fetchedTeachers[teacherId] = teacherRecord;
        teacherRecordCacheRef.current.set(teacherId, teacherRecord);
      });

      return {
        ...cachedTeachers,
        ...fetchedTeachers,
      };
    },
    [rtdbBase]
  );

  const loadAttendanceByCourseIds = useCallback(
    async (courseIds = []) => {
      const normalizedCourseIds = [...new Set(courseIds.map(normalizeIdentifier).filter(Boolean))];
      if (!normalizedCourseIds.length) return {};

      const schoolScopeKey = normalizeIdentifier(resolvedSchoolCode || "default");
      const attendanceDateLimit = ATTENDANCE_RECENT_DATE_LIMITS.monthly;
      const cachedAttendance = {};
      const missingCourseIds = [];

      normalizedCourseIds.forEach((courseId) => {
        const cacheKey = `${schoolScopeKey}::${courseId}::${attendanceDateLimit}`;
        if (attendanceCourseCacheRef.current.has(cacheKey)) {
          cachedAttendance[courseId] = attendanceCourseCacheRef.current.get(cacheKey) || {};
          return;
        }
        missingCourseIds.push(courseId);
      });

      if (!missingCourseIds.length) return cachedAttendance;

      const fetchedEntries = await Promise.all(
        missingCourseIds.map(async (courseId) => {
          const response = await axios.get(`${rtdbBase}/Attendance/${encodeURIComponent(courseId)}.json`, {
            params: {
              orderBy: JSON.stringify("$key"),
              limitToLast: attendanceDateLimit,
            },
          }).catch(() => ({ data: {} }));
          const courseAttendance = response?.data && typeof response.data === "object" ? response.data : {};
          return [courseId, courseAttendance || {}];
        })
      );

      const fetchedAttendance = {};
      fetchedEntries.forEach(([courseId, courseAttendance]) => {
        const cacheKey = `${schoolScopeKey}::${courseId}::${attendanceDateLimit}`;
        attendanceCourseCacheRef.current.set(cacheKey, courseAttendance || {});
        fetchedAttendance[courseId] = courseAttendance || {};
      });

      return {
        ...cachedAttendance,
        ...fetchedAttendance,
      };
    },
    [rtdbBase, resolvedSchoolCode]
  );

  useEffect(() => {
    if (
      (!selectedStudent?.studentId && !selectedStudent?.userId) ||
      !rtdbBase ||
      !teacherUserId
    ) {
      setAttendanceRecords([]);
      return;
    }

    let cancelled = false;
    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const courseContext = await getTeacherCourseContext({ teacher, rtdbBase });
        const selectedGradeKey = normalizeGrade(selectedStudent?.grade || selectedStudent?.raw?.basicStudentInformation?.grade);
        const selectedSectionKey = normalizeSection(selectedStudent?.section || selectedStudent?.raw?.basicStudentInformation?.section);
        const relevantCourses = (courseContext?.courses || []).filter((course) => {
          const courseGrade = normalizeGrade(course?.grade);
          const courseSection = normalizeSection(course?.section || course?.secation);

          if (selectedGradeKey && courseGrade && selectedGradeKey !== courseGrade) return false;
          if (selectedSectionKey && courseSection && selectedSectionKey !== courseSection) return false;
          return true;
        });

        const relevantCourseIds = [...new Set(
          (relevantCourses.length ? relevantCourses : courseContext?.courses || [])
            .map((course) => normalizeIdentifier(course?.id || course?.courseId))
            .filter(Boolean)
        )];

        if (!relevantCourseIds.length) {
          if (!cancelled) setAttendanceRecords([]);
          return;
        }

        const assignmentsObj = courseContext?.assignmentsByCourseId || {};
        const teacherIds = relevantCourseIds
          .map((courseId) => assignmentsObj?.[courseId]?.teacherId || assignmentsObj?.[courseId]?.teacherRecordKey)
          .map(normalizeIdentifier)
          .filter(Boolean);

        const [raw, teachersObj] = await Promise.all([
          loadAttendanceByCourseIds(relevantCourseIds),
          loadTeachersByIds(teacherIds),
        ]);

        const teacherUserIds = Object.values(teachersObj || {})
          .map((teacherRecord) => normalizeIdentifier(teacherRecord?.userId))
          .filter(Boolean);
        const fetchedTeacherUsers = teacherUserIds.length ? await loadUsersByIds(teacherUserIds) : {};
        const usersObj = {
          ...(fetchedTeacherUsers || {}),
        };

        const normalized = [];

        Object.entries(raw).forEach(([courseId, dates]) => {
          if (!dates || typeof dates !== "object") return;
          Object.entries(dates).forEach(([dateKey, studentsMap]) => {
            if (!studentsMap || typeof studentsMap !== "object") return;

            const studentEntry = studentsMap[selectedStudent.studentId] ?? studentsMap[selectedStudent.userId];

            let record = studentEntry;
            if (!record && studentsMap.students) {
              record = studentsMap.students[selectedStudent.studentId] ?? studentsMap.students[selectedStudent.userId];
            }

            if (!record) {
              const found = Object.entries(studentsMap).find(([, v]) => {
                if (!v || typeof v !== "object") return false;
                if (v.userId && (String(v.userId) === String(selectedStudent.userId) || String(v.userId) === String(selectedStudent.studentId))) return true;
                return false;
              });
              if (found) record = found[1];
            }

            if (!record) return;

            let status = "absent";
            let teacherName = "";
            let subject = courseId;

            if (typeof record === "string") {
              status = record;
            } else if (typeof record === "object") {
              status = record.status || record.attendance_status || Object.values(record)[0] || "present";

              teacherName = record.teacherName || record.teacher || record.tutor || "";

              if (!teacherName) {
                const teacherId = record.teacherId || record.teacherKey || null;
                if (teacherId && teachersObj[teacherId]) {
                  const tRec = teachersObj[teacherId];
                  if (tRec.userId) {
                    const userRec = Object.values(usersObj).find((u) => String(u?.userId) === String(tRec.userId));
                    teacherName = userRec?.name || tRec.name || teacherName;
                  } else {
                    teacherName = tRec.name || teacherName;
                  }
                }
              }

              if (!teacherName) {
                const teacherUserIdFromRecord = record.teacherUserId || record.teacherUser || record.takenBy || null;
                if (teacherUserIdFromRecord) {
                  const userRec = Object.values(usersObj).find((u) => String(u?.userId) === String(teacherUserIdFromRecord));
                  if (userRec) teacherName = userRec.name || teacherName;
                }
              }

              subject = record.subject || courseId;
            }

            if (!teacherName) {
              const assignment = assignmentsObj[courseId];
              const assignedTeacherKey = assignment?.teacherId || assignment?.teacherRecordKey;
              if (assignedTeacherKey) {
                const tRec = teachersObj[assignedTeacherKey];
                if (tRec) {
                  if (tRec.userId) {
                    const userRec = Object.values(usersObj).find((u) => String(u?.userId) === String(tRec.userId));
                    teacherName = userRec?.name || tRec.name || teacherName;
                  } else {
                    teacherName = tRec.name || teacherName;
                  }
                }
              }
            }

            normalized.push({
              courseId,
              date: dateKey,
              status: String(status).toLowerCase(),
              teacherName,
              subject,
            });
          });
        });

        if (!cancelled) {
          normalized.sort((a, b) => new Date(b.date) - new Date(a.date));
          setAttendanceRecords(normalized);
        }
      } catch (err) {
        console.error("Attendance fetch error:", err);
        if (!cancelled) setAttendanceRecords([]);
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    };

    fetchAttendance();
    return () => {
      cancelled = true;
    };
  }, [selectedStudent, resolvedSchoolCode, rtdbBase, teacher, teacherUserId, loadAttendanceByCourseIds, loadTeachersByIds, loadUsersByIds]);

  const attendanceSummary = useMemo(() => {
    const attendanceData = attendanceRecords.map((r) => ({
      date: r.date,
      courseId: r.courseId,
      teacherName: r.teacherName || "",
      status: r.status || "absent",
    }));

    const attendanceBySubject = attendanceData.reduce((acc, rec) => {
      const key = rec.courseId || rec.subject || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    }, {});

    const getProgress = (records) => {
      if (!records || records.length === 0) return 0;
      const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;
      return Math.round((presentCount / records.length) * 100);
    };

    const getLatestRecordDate = (records = []) => {
      return records.reduce((latest, record) => {
        const recordDate = new Date(record?.date);
        if (Number.isNaN(recordDate.getTime())) return latest;
        if (!latest || recordDate > latest) return recordDate;
        return latest;
      }, null);
    };

    const getRecordsForView = (records = [], attendanceView = "daily") => {
      const latestRecordDate = getLatestRecordDate(records) || new Date();
      const latestDateLabel = latestRecordDate.toDateString();
      const latestWeek = getWeekNumber(latestRecordDate);
      const latestMonth = latestRecordDate.getMonth();
      const latestYear = latestRecordDate.getFullYear();

      const dayRecords = records.filter((r) => {
        const recordDate = new Date(r.date);
        return !Number.isNaN(recordDate.getTime()) && recordDate.toDateString() === latestDateLabel;
      });
      const weekRecords = records.filter((r) => {
        const recordDate = new Date(r.date);
        return (
          !Number.isNaN(recordDate.getTime()) &&
          recordDate.getFullYear() === latestYear &&
          getWeekNumber(recordDate) === latestWeek
        );
      });
      const monthRecords = records.filter((r) => {
        const recordDate = new Date(r.date);
        return (
          !Number.isNaN(recordDate.getTime()) &&
          recordDate.getFullYear() === latestYear &&
          recordDate.getMonth() === latestMonth
        );
      });

      return attendanceView === "daily"
        ? dayRecords
        : attendanceView === "weekly"
        ? weekRecords
        : monthRecords;
    };

    return {
      attendanceData,
      attendanceBySubject,
      getProgress,
      getLatestRecordDate,
      getWeekNumber,
      getRecordsForView,
    };
  }, [attendanceRecords]);

  return { attendanceRecords, attendanceLoading, attendanceSummary };
}
