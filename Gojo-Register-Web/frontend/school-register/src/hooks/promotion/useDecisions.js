import { useMemo, useState } from "react";

export const ACTIONS = {
  promote: "promote",
  repeat: "repeat",
  graduate: "graduate",
  transfer: "transfer",
  withdraw: "withdraw",
};

const isFinalGrade = (grade, maxGrade) => Number(grade) >= Number(maxGrade);

const getDefaultAction = (student, maxGrade) =>
  isFinalGrade(student.grade, maxGrade) ? ACTIONS.graduate : ACTIONS.promote;

const buildDefaultDecision = (student, maxGrade) => {
  const action = getDefaultAction(student, maxGrade);
  const nextGrade =
    action === ACTIONS.promote ? String(Number(student.grade || 0) + 1) : student.grade;
  return {
    action,
    targetGrade: action === ACTIONS.graduate ? student.grade : nextGrade,
    targetSection: student.section || "",
    notes: "",
  };
};

/**
 * useDecisions
 *
 * Owns the promotion-decision state cluster:
 * - `decisions`: per-student override (action / targetGrade / targetSection / notes)
 * - `selectedStudentsMap`: per-student checkbox map for Step 2
 * - `processedStudentIds`: students already saved this run (excluded from the list)
 * - `confirmText`: the "type PROMOTE to confirm" gate input
 *
 * Plus the derived helpers the page and Step 2 consume:
 * - `effectiveDecision(student)` resolves the per-student decision
 * - `selectedStudents` filters `studentsForFromYear` by the checkbox map
 * - `summary` counts per-action totals over the selected students
 *
 * Bulk actions:
 * - `resetForStudents(students)` seeds defaults + clears the checkbox map
 * - `toggleStudentSelection(id)`, `setAllSelection(checked)` for the table
 */
export default function useDecisions({ studentsForFromYear, visibleStudents, maxGrade }) {
  const [decisions, setDecisions] = useState({});
  const [selectedStudentsMap, setSelectedStudentsMap] = useState({});
  const [confirmText, setConfirmText] = useState("");

  const updateDecision = (studentId, patch) => {
    setDecisions((prev) => {
      const current = prev[studentId] || {};
      return {
        ...prev,
        [studentId]: { ...current, ...patch },
      };
    });
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentsMap((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const setAllSelection = (checked) => {
    const next = {};
    visibleStudents.forEach((student) => {
      next[student.studentId] = checked;
    });
    setSelectedStudentsMap((prev) => ({ ...prev, ...next }));
  };

  const resetForStudents = (students) => {
    const next = {};
    const selected = {};
    students.forEach((student) => {
      next[student.studentId] = buildDefaultDecision(student, maxGrade);
      selected[student.studentId] = false;
    });
    setDecisions(next);
    setSelectedStudentsMap(selected);
  };

  const effectiveDecision = (student) => {
    const row = decisions[student.studentId] || buildDefaultDecision(student, maxGrade);
    const action = row.action || getDefaultAction(student, maxGrade);

    let targetGrade = row.targetGrade || student.grade;
    if (action === ACTIONS.promote) targetGrade = String(Number(student.grade || 0) + 1);
    if (action === ACTIONS.repeat) targetGrade = String(student.grade || "");
    if (action === ACTIONS.graduate) targetGrade = String(student.grade || "");

    const targetSection = String(row.targetSection || student.section || "").toUpperCase();

    return { ...row, action, targetGrade, targetSection };
  };

  const selectedStudents = useMemo(
    () =>
      (studentsForFromYear || []).filter(
        (student) => !!selectedStudentsMap[student.studentId]
      ),
    [studentsForFromYear, selectedStudentsMap]
  );

  const summary = useMemo(() => {
    let promoteCount = 0;
    let repeatCount = 0;
    let graduateCount = 0;
    let transferCount = 0;
    let withdrawCount = 0;

    selectedStudents.forEach((student) => {
      const action = effectiveDecision(student).action;
      if (action === ACTIONS.promote) promoteCount += 1;
      if (action === ACTIONS.repeat) repeatCount += 1;
      if (action === ACTIONS.graduate) graduateCount += 1;
      if (action === ACTIONS.transfer) transferCount += 1;
      if (action === ACTIONS.withdraw) withdrawCount += 1;
    });

    return {
      total: selectedStudents.length,
      totalLoaded: (studentsForFromYear || []).length,
      promoteCount,
      repeatCount,
      graduateCount,
      transferCount,
      withdrawCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentsForFromYear, selectedStudents, decisions, maxGrade]);

  return {
    // state
    decisions,
    setDecisions,
    selectedStudentsMap,
    setSelectedStudentsMap,
    confirmText,
    setConfirmText,
    // mutators
    updateDecision,
    toggleStudentSelection,
    setAllSelection,
    resetForStudents,
    // derived
    effectiveDecision,
    selectedStudents,
    summary,
  };
}
