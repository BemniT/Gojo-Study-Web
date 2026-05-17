import { useEffect, useMemo, useState } from "react";
import { getTeacherCourseContext } from "../api/teacherApi";
import { loadParentRecordsByIds, loadStudentsByGradeSections } from "../utils/teacherData";
import { resolveProfileImage } from "../utils/profileImage";
import {
  buildGradeSectionKey,
  computeAge,
  getStudentUserId,
} from "../utils/studentHelpers";

const normalizeGrade = (value) => String(value ?? "").trim();
const normalizeSection = (value) => String(value ?? "").trim().toUpperCase();
const normalizeIdentifier = (value) => String(value || "").trim();

export function useStudents({
  teacherUserId,
  resolvedSchoolCode,
  teacherSchoolCode,
  rtdbBase,
  selectedGrade,
  selectedSection,
  teacher,
}) {
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadedGradeSections, setLoadedGradeSections] = useState([]);

  const applyGradeSectionFilter = (students = []) => {
    return (students || []).filter((student) => {
      if (selectedGrade !== "All" && student.grade !== selectedGrade) return false;
      if (selectedSection !== "All" && student.section !== selectedSection) return false;
      return true;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const fetchStudents = async () => {
      if (!teacherUserId || !resolvedSchoolCode || !rtdbBase || !teacher) {
        if (!cancelled) {
          setAllStudents([]);
          setLoadedGradeSections([]);
          setLoadingStudents(false);
        }
        return;
      }

      setLoadingStudents(true);

      try {
        const courseContext = (await getTeacherCourseContext({ teacher, rtdbBase })) || {
          courses: [],
          courseIds: [],
        };
        const schoolCode = resolvedSchoolCode || teacherSchoolCode;

        const allowedGradeSections = new Set(
          (courseContext?.courses || [])
            .map((course) => buildGradeSectionKey(course?.grade, course?.section || course?.secation))
            .filter((value) => value !== "|")
        );

        (courseContext?.courseIds || []).forEach((courseId) => {
          const raw = String(courseId || "").trim();
          const body = raw.startsWith("course_") ? raw.slice("course_".length) : raw;
          const last = body.split("_").filter(Boolean).at(-1) || "";
          const match = last.match(/^(\d+)([A-Za-z].*)$/);
          if (!match) return;
          const grade = String(match[1] || "").trim();
          const section = String(match[2] || "").trim().toUpperCase();
          if (grade && section) {
            allowedGradeSections.add(`${grade}|${section}`);
          }
        });

        if (!allowedGradeSections.size) {
          if (!cancelled) {
            setAllStudents([]);
            setLoadedGradeSections([]);
          }
          return;
        }

        const studentRows = await loadStudentsByGradeSections({
          rtdbBase,
          schoolCode,
          allowedGradeSections,
        });

        const parentIdentifiers = [
          ...new Set(
            (studentRows || [])
              .flatMap((studentRow) => {
                const raw = studentRow?.raw || {};
                return [
                  raw?.parentId,
                  raw?.parentUserId,
                  studentRow?.parentId,
                  studentRow?.parentUserId,
                ];
              })
              .map(normalizeIdentifier)
              .filter(Boolean)
          ),
        ];

        const parentRecords = parentIdentifiers.length
          ? await loadParentRecordsByIds({
              rtdbBase,
              schoolCode,
              parentIds: parentIdentifiers,
            })
          : {};

        const studentsArr = (studentRows || [])
          .map((studentRow) => {
            const studentId = studentRow?.studentId || studentRow?.studentKey || studentRow?.userId;
            const s = studentRow?.raw || {};
            const studentUserId = studentRow?.userId || getStudentUserId(s);
            const user = studentRow?.user || null;

            const normalizedStudentGrade = normalizeGrade(s.grade || s.basicStudentInformation?.grade);
            const normalizedStudentSection = normalizeSection(s.section || s.basicStudentInformation?.section);

            const candidateParentId = normalizeIdentifier(
              s.parentId || studentRow?.parentId || s.parentUserId || studentRow?.parentUserId
            );
            const parentRec = parentRecords?.[candidateParentId] || null;

            const parentName =
              s.parentName ||
              s.parent?.name ||
              user?.parentName ||
              parentRec?.name ||
              s.rawParentName ||
              null;

            const parentPhone =
              s.parentPhone ||
              s.parent?.phone ||
              user?.parentPhone ||
              parentRec?.phone ||
              parentRec?.phoneNumber ||
              s.rawParentPhone ||
              null;

            const rawDob = user?.dob || user?.birthDate || s.dob || s.birthDate || null;
            const age = computeAge(rawDob);

            return {
              ...s,
              studentId: s.studentId || studentId,
              userId: studentUserId,
              name: studentRow?.name || user?.name || s.name || s?.basicStudentInformation?.name || "Unknown",
              email: user?.email || s.email || "",
              profileImage: resolveProfileImage(
                studentRow?.profileImage,
                user?.profileImage,
                user?.profile,
                user?.avatar,
                s?.profileImage,
                s?.basicStudentInformation?.studentPhoto,
                s?.studentPhoto
              ),
              phone: user?.phone || s.phone || "",
              gender: user?.gender || s.gender || "",
              grade: normalizedStudentGrade,
              section: normalizedStudentSection,
              dob: rawDob,
              age,
              parentName: parentName || null,
              parentPhone: parentPhone || null,
              raw: s,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        const assignedPairs = [...allowedGradeSections]
          .map((value) => {
            const [grade, section] = String(value || "").split("|");
            return {
              grade: String(grade || "").trim(),
              section: String(section || "").trim().toUpperCase(),
            };
          })
          .filter((item) => item.grade && item.section)
          .sort((a, b) => {
            const gradeDiff = Number(a.grade) - Number(b.grade);
            if (!Number.isNaN(gradeDiff) && gradeDiff !== 0) return gradeDiff;
            if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
            return a.section.localeCompare(b.section);
          });

        if (!cancelled) {
          setAllStudents(studentsArr);
          setLoadedGradeSections(assignedPairs);
        }
      } catch (error) {
        if (!cancelled) {
          setAllStudents([]);
          setLoadedGradeSections([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingStudents(false);
        }
      }
    };

    fetchStudents();

    return () => {
      cancelled = true;
    };
  }, [teacherUserId, resolvedSchoolCode, teacherSchoolCode, rtdbBase, selectedGrade, selectedSection, teacher]);

  const students = useMemo(() => applyGradeSectionFilter(allStudents), [allStudents, selectedGrade, selectedSection]);
  const gradeSections = loadedGradeSections;

  return { students, loadingStudents, gradeSections };
}
