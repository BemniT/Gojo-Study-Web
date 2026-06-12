import { useEffect, useMemo, useState } from "react";

const isAlreadyReRegisteredToYear = (studentRoot = {}, targetYear = "") => {
  const year = String(targetYear || "").trim();
  if (!year) return false;

  const rootAcademicYear = String(studentRoot?.academicYear || "").trim();
  const basicAcademicYear = String(
    studentRoot?.basicStudentInformation?.academicYear || ""
  ).trim();
  const recordsToYear = studentRoot?.records?.[year] || null;
  const hasReRegisterStamp = !!studentRoot?.reRegisteredAt;

  if ((rootAcademicYear === year || basicAcademicYear === year) && hasReRegisterStamp) return true;
  if (
    recordsToYear &&
    ["promote", "repeat"].includes(String(recordsToYear.sourceAction || "").toLowerCase())
  )
    return true;

  return false;
};

const buildStudentRow = (studentId, historyRow, rootRow) => {
  const grade = String(
    historyRow.grade ||
      rootRow.grade ||
      ""
  );
  // (kept for parity with previous resolution order — left commented for clarity)

  return {
    studentId,
    userId: historyRow.userId || rootRow.userId || "",
    name:
      historyRow.name ||
      rootRow.name ||
      [
        historyRow.firstName || rootRow.firstName,
        historyRow.middleName || rootRow.middleName,
        historyRow.lastName || rootRow.lastName,
      ]
        .filter(Boolean)
        .join(" ") ||
      historyRow.basicStudentInformation?.name ||
      rootRow.basicStudentInformation?.name ||
      "Student",
    grade,
    raw: rootRow,
    rawHistory: historyRow,
  };
};

const sortStudents = (list) =>
  list.sort((a, b) => {
    const gradeDiff = Number(a.grade || 0) - Number(b.grade || 0);
    if (gradeDiff !== 0) return gradeDiff;
    const sectionDiff = String(a.section || "").localeCompare(String(b.section || ""));
    if (sectionDiff !== 0) return sectionDiff;
    return a.name.localeCompare(b.name);
  });

/**
 * useStudentReview
 *
 * Owns the filter UI state (grade / section / search) and all the
 * derived memos that drive Step 2's student table:
 * - `studentsForFromYear`: the canonical list of reviewable students
 * - `sectionOptionsByGrade`: section options keyed by grade for the
 *   row's target-section dropdown
 * - `availableGrades`, `availableSections`: dropdown options for the
 *   filter row
 * - `visibleStudents`: filtered slice
 * - `groupedVisibleStudents`: grouped by grade -> section for rendering
 *
 * Also runs an effect that resets `sectionFilter` to "all" whenever
 * `gradeFilter` changes to a value with no matching sections.
 */
export default function useStudentReview({
  fromYear,
  toYear,
  yearHistoryStudentsMap,
  studentsMap,
  processedStudentIds,
  gradesMap,
  gradeKeys,
}) {
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");

  const studentsForFromYear = useMemo(() => {
    if (!fromYear) return [];

    const list = [];
    Object.entries(yearHistoryStudentsMap || {}).forEach(([studentId, node]) => {
      if (processedStudentIds[studentId]) return;

      const historyRow = node || {};
      const rootRow = studentsMap[studentId] || {};

      if (isAlreadyReRegisteredToYear(rootRow, toYear)) return;

      const rootRecords = rootRow.records || {};
      const historyRecord = (historyRow.records || {})[fromYear] || null;
      const rootRecord = rootRecords[fromYear] || null;

      const currentStatus = String(
        historyRecord?.status ||
          rootRecord?.status ||
          historyRow.status ||
          rootRow.status ||
          "active"
      ).toLowerCase();
      if (["graduated", "transferred", "withdrawn"].includes(currentStatus)) return;

      const grade = String(
        historyRecord?.grade ||
          rootRecord?.grade ||
          historyRow.grade ||
          rootRow.grade ||
          ""
      );
      const section = String(
        historyRecord?.section ||
          rootRecord?.section ||
          historyRow.section ||
          rootRow.section ||
          ""
      ).toUpperCase();

      if (!grade) return;

      const baseRow = buildStudentRow(studentId, historyRow, rootRow);
      list.push({
        ...baseRow,
        grade,
        section,
        status: currentStatus || "active",
      });
    });

    return sortStudents(list);
  }, [yearHistoryStudentsMap, studentsMap, fromYear, toYear, processedStudentIds]);

  // Auto-reset section filter when grade selection no longer contains it.
  useEffect(() => {
    if (gradeFilter === "all") {
      setSectionFilter("all");
      return;
    }
    const sectionsForGrade = new Set(
      studentsForFromYear
        .filter((student) => String(student.grade || "") === String(gradeFilter))
        .map((student) => String(student.section || "").trim().toUpperCase())
        .filter(Boolean)
    );
    if (sectionFilter !== "all" && !sectionsForGrade.has(sectionFilter)) {
      setSectionFilter("all");
    }
  }, [gradeFilter, sectionFilter, studentsForFromYear]);

  const sectionOptionsByGrade = useMemo(() => {
    const map = {};
    (gradeKeys || []).forEach((grade) => {
      const sections = (gradesMap[grade] || {}).sections || {};
      map[grade] = Object.keys(sections).sort((a, b) => a.localeCompare(b));
    });
    return map;
  }, [gradeKeys, gradesMap]);

  const availableGrades = useMemo(() => {
    return [
      ...new Set(
        studentsForFromYear
          .map((student) => String(student.grade || "").trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => Number(a) - Number(b));
  }, [studentsForFromYear]);

  const availableSections = useMemo(() => {
    const base =
      gradeFilter === "all"
        ? studentsForFromYear
        : studentsForFromYear.filter(
            (student) => String(student.grade || "") === String(gradeFilter)
          );

    return [
      ...new Set(
        base
          .map((student) => String(student.section || "").trim().toUpperCase())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [studentsForFromYear, gradeFilter]);

  const visibleStudents = useMemo(() => {
    const query = String(studentSearch || "").trim().toLowerCase();
    return studentsForFromYear.filter((student) => {
      if (gradeFilter !== "all" && String(student.grade || "") !== String(gradeFilter)) return false;
      if (
        sectionFilter !== "all" &&
        String(student.section || "").trim().toUpperCase() !== sectionFilter
      )
        return false;
      if (!query) return true;
      const haystack = [student.name, student.studentId, student.grade, student.section]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [studentsForFromYear, gradeFilter, sectionFilter, studentSearch]);

  const groupedVisibleStudents = useMemo(() => {
    const groups = visibleStudents.reduce((acc, student) => {
      const grade = String(student.grade || "-");
      const section = String(student.section || "-").trim().toUpperCase() || "-";
      if (!acc[grade]) acc[grade] = {};
      if (!acc[grade][section]) acc[grade][section] = [];
      acc[grade][section].push(student);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([grade, sections]) => ({
        grade,
        sections: Object.entries(sections)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([section, students]) => ({
            section,
            students: [...students].sort((a, b) => a.name.localeCompare(b.name)),
          })),
      }));
  }, [visibleStudents]);

  return {
    // filter state
    gradeFilter,
    setGradeFilter,
    sectionFilter,
    setSectionFilter,
    studentSearch,
    setStudentSearch,
    // derived
    studentsForFromYear,
    sectionOptionsByGrade,
    availableGrades,
    availableSections,
    visibleStudents,
    groupedVisibleStudents,
  };
}
