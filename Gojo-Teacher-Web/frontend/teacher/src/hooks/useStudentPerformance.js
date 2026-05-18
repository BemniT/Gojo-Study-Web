import { useEffect, useMemo, useState } from "react";
import { getTeacherCourseContext } from "../api/teacherApi";
import { getRtdbRoot, RTDB_BASE_RAW } from "../api/rtdbScope";
import { fetchCachedJson } from "../utils/rtdbCache";

const EMPTY_TEACHER_COURSE_CONTEXT = {
  success: false,
  teacherKey: "",
  teacherRecord: null,
  courses: [],
  courseIds: [],
  assignmentsByCourseId: {},
};

const normalizeIdentifier = (value) => String(value || "").trim();
const normalizeGrade = (value) => String(value ?? "").trim();
const normalizeSection = (value) => String(value ?? "").trim().toUpperCase();

export function useStudentPerformance({ selectedStudent, teacherUserId, resolvedSchoolCode }) {
  const [teacherCourseContext, setTeacherCourseContext] = useState(EMPTY_TEACHER_COURSE_CONTEXT);
  const [teacherCourseContextReady, setTeacherCourseContextReady] = useState(false);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [studentGrades, setStudentGrades] = useState({});

  const rtdbBase = useMemo(() => {
    if (resolvedSchoolCode) {
      return `${RTDB_BASE_RAW}/Platform1/Schools/${resolvedSchoolCode}`;
    }
    return getRtdbRoot();
  }, [resolvedSchoolCode]);

  const teacherContextInput = useMemo(() => {
    const storedTeacher = JSON.parse(localStorage.getItem("teacher") || "{}");
    return {
      ...storedTeacher,
      userId: teacherUserId || storedTeacher?.userId || "",
      schoolCode: resolvedSchoolCode || storedTeacher?.schoolCode || "",
    };
  }, [teacherUserId, resolvedSchoolCode]);

  useEffect(() => {
    if (!teacherUserId || !rtdbBase) {
      setTeacherCourseContext(EMPTY_TEACHER_COURSE_CONTEXT);
      setTeacherCourseContextReady(false);
      return;
    }

    let cancelled = false;

    const loadTeacherCourseContext = async () => {
      setTeacherCourseContextReady(false);
      const nextContext = await getTeacherCourseContext({
        teacher: teacherContextInput,
        rtdbBase,
      });
      if (cancelled) return;
      setTeacherCourseContext(nextContext || EMPTY_TEACHER_COURSE_CONTEXT);
      setTeacherCourseContextReady(true);
    };

    loadTeacherCourseContext();

    return () => {
      cancelled = true;
    };
  }, [teacherUserId, teacherContextInput, rtdbBase]);

  useEffect(() => {
    if (!selectedStudent || !resolvedSchoolCode || !rtdbBase || !teacherCourseContextReady) {
      setStudentGrades({});
      return;
    }

    const fetchMarksForStudent = async () => {
      setPerformanceLoading(true);
      try {
        const flattened = {};

        const selectedGradeKey = normalizeGrade(
          selectedStudent?.grade || selectedStudent?.raw?.basicStudentInformation?.grade
        );
        const selectedSectionKey = normalizeSection(
          selectedStudent?.section || selectedStudent?.raw?.basicStudentInformation?.section
        );
        const relevantCourses = (teacherCourseContext?.courses || []).filter((course) => {
          const courseGrade = normalizeGrade(course?.grade);
          const courseSection = normalizeSection(course?.section || course?.secation);

          if (selectedGradeKey && courseGrade && selectedGradeKey !== courseGrade) return false;
          if (selectedSectionKey && courseSection && selectedSectionKey !== courseSection) return false;
          return true;
        });

        const relevantCourseIds = [
          ...new Set(
            (relevantCourses.length ? relevantCourses : teacherCourseContext?.courses || [])
              .map((course) => normalizeIdentifier(course?.id || course?.courseId))
              .filter(Boolean)
          ),
        ];

        if (!relevantCourseIds.length) {
          setStudentGrades({});
          return;
        }

        const candidates = new Set(
          [
            selectedStudent.id,
            selectedStudent.studentId,
            selectedStudent.userId,
            selectedStudent.userId ? `student_${selectedStudent.userId}` : null,
          ].filter(Boolean)
        );

        const marksByCourse = await Promise.all(
          relevantCourseIds.map(async (courseId) => {
            const studentsMap = await fetchCachedJson(`${rtdbBase}/ClassMarks/${encodeURIComponent(courseId)}.json`, {
              ttlMs: 30 * 1000,
              fallbackValue: {},
              force: true,
            });
            return [courseId, studentsMap];
          })
        );

        marksByCourse.forEach(([courseKey, studentsMap]) => {
          if (!studentsMap || typeof studentsMap !== "object") return;

          const foundEntry = Object.entries(studentsMap).find(([studentKey, studentData]) => {
            if (candidates.has(studentKey)) return true;
            if (studentData && typeof studentData === "object") {
              if (studentData.userId && candidates.has(studentData.userId)) return true;
              if (studentData.studentId && candidates.has(studentData.studentId)) return true;
            }
            return false;
          });

          if (foundEntry) {
            const [, studentData] = foundEntry;
            flattened[courseKey] = studentData;
          }
        });

        setStudentGrades(flattened);
      } catch (err) {
        console.error("Failed to fetch marks:", err);
        setStudentGrades({});
      } finally {
        setPerformanceLoading(false);
      }
    };

    fetchMarksForStudent();
  }, [selectedStudent, resolvedSchoolCode, rtdbBase, teacherCourseContext, teacherCourseContextReady]);

  return {
    teacherCourseContext,
    performanceLoading,
    studentGrades,
  };
}
