import { useMemo, useState } from "react";

const formatSubjectName = (courseId = "") => {
  if (!courseId) return "";
  const clean = String(courseId)
    .replace(/^course_/, "")
    .replace(/_[0-9A-Za-z]+$/, "")
    .replace(/_/g, " ")
    .trim();
  return clean
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
};

const getProgress = (records) => {
  if (!records || !records.length) return 0;
  const presentCount = records.filter(
    (r) => r.status === "present" || r.status === "late"
  ).length;
  return Math.round((presentCount / records.length) * 100);
};

const normalizeAttendanceRecord = (a) => ({
  date: a.date || a.created_at,
  courseId: a.courseId || a.course || "Unknown Course",
  teacherName: a.teacherName || a.teacher || "Unknown Teacher",
  status: a.status || a.attendance_status || "absent",
});

const groupBySubject = (records) =>
  records.reduce((acc, cur) => {
    if (!acc[cur.courseId]) acc[cur.courseId] = [];
    acc[cur.courseId].push(cur);
    return acc;
  }, {});

/**
 * useAttendanceView
 *
 * Owns the right-drawer Attendance tab's UI state: daily/weekly/monthly
 * view toggle, optional course filter, per-subject expansion map, and
 * the derived `attendanceBySubject` shape that the tab component
 * consumes.
 *
 * Pure-function helpers (`formatSubjectName`, `getProgress`,
 * normalization, grouping) live at module scope.
 */
export default function useAttendanceView({ selectedStudent }) {
  const [attendanceView, setAttendanceView] = useState("daily");
  const [attendanceCourseFilter, setAttendanceCourseFilter] = useState("All");
  const [expandedCards, setExpandedCards] = useState({});

  const attendanceData = useMemo(() => {
    if (!selectedStudent?.attendance) return [];
    return selectedStudent.attendance.map(normalizeAttendanceRecord);
  }, [selectedStudent]);

  const attendanceBySubject = useMemo(() => groupBySubject(attendanceData), [attendanceData]);

  const toggleExpand = (key) => {
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return {
    attendanceView,
    setAttendanceView,
    attendanceCourseFilter,
    setAttendanceCourseFilter,
    expandedCards,
    toggleExpand,
    attendanceData,
    attendanceBySubject,
    getProgress,
    formatSubjectName,
  };
}
