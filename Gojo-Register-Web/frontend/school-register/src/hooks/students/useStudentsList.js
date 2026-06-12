import { useEffect, useMemo, useState } from "react";
import {
  loadGradeManagementNode,
  loadSchoolInfoNode,
  loadSchoolStudentsNode,
} from "../../utils/registerData";

const isValidGradeKey = (value) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 12;
};

const normalizeAcademicYear = (value) =>
  String(value || "").trim().replace(/\//g, "_");

/**
 * useStudentsList
 *
 * Owns the Students page's list data layer for Register-Web: fetch students
 * + grade options + active academic year, plus the derived filter views
 * (filteredStudentsBase, currentYearStudents, lastYearStudents,
 * assignedGrades, assignedSectionsForSelectedGrade).
 *
 * UI state (selectedGrade, selectedSection, searchTerm) stays on the page and
 * is passed in. `setSelectedGrade` is also passed so the fetch effect can
 * reset a stale grade when the managed grade list changes.
 */
export default function useStudentsList({
  dbUrl,
  selectedGrade,
  setSelectedGrade,
  selectedSection,
  searchTerm,
}) {
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState("");

  useEffect(() => {
    if (!dbUrl) return;

    let cancelled = false;

    const fetchStudents = async () => {
      try {
        setStudentsLoading(true);
        const [studentsData, schoolInfo, gradesData] = await Promise.all([
          loadSchoolStudentsNode({ rtdbBase: dbUrl }),
          loadSchoolInfoNode({ rtdbBase: dbUrl }),
          loadGradeManagementNode({ rtdbBase: dbUrl }),
        ]);
        if (cancelled) return;

        const activeAcademicYear = schoolInfo?.currentAcademicYear || "";
        setCurrentAcademicYear(activeAcademicYear);

        const managedGrades = Object.keys(gradesData || {})
          .filter((gradeKey) => isValidGradeKey(gradeKey))
          .sort((a, b) => Number(a) - Number(b));
        setGradeOptions(managedGrades);
        setSelectedGrade((prev) => {
          if (prev === "All") return prev;
          return managedGrades.includes(String(prev)) ? prev : "All";
        });

        const studentList = Object.keys(studentsData || {}).map((id) => {
          const student = studentsData[id] || {};
          const name =
            student.name ||
            [student.firstName, student.middleName, student.lastName]
              .filter(Boolean)
              .join(" ") ||
            student.basicStudentInformation?.name ||
            "No Name";
          return {
            studentId: id,
            userId: student.userId,
            name,
            profileImage: student.profileImage || "/default-profile.png",
            grade: student.grade,
            section: student.section,
            academicYear: student.academicYear || "",
            email: student.email || student.basicStudentInformation?.email || "",
          };
        });

        setStudents(studentList);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    };

    fetchStudents();

    return () => {
      cancelled = true;
    };
  }, [dbUrl, setSelectedGrade]);

  // ---------------- DERIVATIONS ----------------
  const previousAcademicYearKey = useMemo(() => {
    const text = String(currentAcademicYear || "").trim();
    if (!text) return "";
    const normalized = text.replace("/", "_");
    const parts = normalized.split("_");
    if (parts.length !== 2) return "";
    const start = Number(parts[0]);
    if (Number.isNaN(start)) return "";
    return `${start - 1}_${start}`;
  }, [currentAcademicYear]);

  const filteredStudentsBase = useMemo(() => {
    const normalizedSearch = (searchTerm || "").trim().toLowerCase();
    return students.filter((s) => {
      if (selectedGrade !== "All" && String(s.grade) !== String(selectedGrade)) return false;
      if (selectedSection !== "All" && String(s.section) !== String(selectedSection)) return false;

      if (!normalizedSearch) return true;

      const haystack = [s.name, s.studentId, s.userId, s.email, s.grade, s.section]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [students, selectedGrade, selectedSection, searchTerm]);

  const currentYearStudents = useMemo(() => {
    if (!currentAcademicYear) return filteredStudentsBase;
    const normalizedCurrentYear = normalizeAcademicYear(currentAcademicYear);
    return filteredStudentsBase.filter(
      (student) => normalizeAcademicYear(student.academicYear) === normalizedCurrentYear
    );
  }, [filteredStudentsBase, currentAcademicYear]);

  const lastYearStudents = useMemo(() => {
    if (!previousAcademicYearKey) return [];
    return filteredStudentsBase.filter(
      (student) =>
        String(student.academicYear || "").trim() === String(previousAcademicYearKey).trim()
    );
  }, [filteredStudentsBase, previousAcademicYearKey]);

  const assignedGrades = useMemo(() => {
    const source = gradeOptions.length
      ? gradeOptions
      : [...new Set(students.map((student) => student.grade).filter(Boolean))];

    return [...new Set(source.map((gradeValue) => String(gradeValue)))].sort(
      (leftGrade, rightGrade) => {
        const numericDiff = Number(leftGrade) - Number(rightGrade);
        if (!Number.isNaN(numericDiff) && numericDiff !== 0) return numericDiff;
        return String(leftGrade).localeCompare(String(rightGrade));
      }
    );
  }, [gradeOptions, students]);

  const assignedSectionsForSelectedGrade = useMemo(() => {
    if (selectedGrade === "All") return [];

    return [...new Set(
      students
        .filter((student) => String(student.grade) === String(selectedGrade))
        .map((student) => student.section)
        .filter(Boolean)
    )].sort((leftSection, rightSection) =>
      String(leftSection).localeCompare(String(rightSection))
    );
  }, [students, selectedGrade]);

  return {
    students,
    setStudents,
    studentsLoading,
    gradeOptions,
    setGradeOptions,
    currentAcademicYear,
    setCurrentAcademicYear,
    previousAcademicYearKey,
    filteredStudentsBase,
    currentYearStudents,
    lastYearStudents,
    assignedGrades,
    assignedSectionsForSelectedGrade,
  };
}
