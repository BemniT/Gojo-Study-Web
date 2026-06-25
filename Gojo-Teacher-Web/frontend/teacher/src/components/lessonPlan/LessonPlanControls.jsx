import React from "react";
import styles from "./LessonPlan.module.css";
import { ETHIOPIAN_MONTHS } from "./useLessonPlanData";

function LessonPlanControls({
  academicYear,
  setAcademicYear,
  academicYearOptions,
  selectedCourseId,
  setSelectedCourseId,
  coursesLoading,
  courses,
  selectedSemesterId,
  setSelectedSemesterId,
  semesterIds,
  newMonthId,
  setNewMonthId,
  newWeekId,
  setNewWeekId,
  newExpectedDays,
  setNewExpectedDays,
  saving,
  handleCreateWeekPlan,
  flushPendingDrafts,
  setPanelOpen,
  setActiveWeek,
}) {
  return (
    <section className={styles.controlsCard}>
      <label className={styles.controlField}>
        <span>Academic Year</span>
        <select
          value={academicYear}
          onChange={async (event) => {
            const nextYear = event.target.value;
            if (nextYear === academicYear) return;
            const canSwitch = await flushPendingDrafts();
            if (canSwitch === false) return;
            setAcademicYear(nextYear);
            setPanelOpen(false);
            setActiveWeek(null);
          }}
        >
          <option value="">Select year</option>
          {academicYearOptions.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </label>

      <label className={styles.controlField}>
        <span>Course</span>
        <select
          value={selectedCourseId}
          onChange={async (event) => {
            const nextCourseId = event.target.value;
            if (nextCourseId === selectedCourseId) return;
            const canSwitch = await flushPendingDrafts();
            if (canSwitch === false) return;
            setSelectedCourseId(nextCourseId);
            setPanelOpen(false);
            setActiveWeek(null);
          }}
          disabled={coursesLoading}
        >
          <option value="">{coursesLoading ? "Loading courses..." : "Select course"}</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {(course.subject || course.name || course.id)} {course.grade ? `- G${course.grade}` : ""}{course.section ? `${course.section}` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.controlField}>
        <span>Semester</span>
        <select
          value={selectedSemesterId}
          onChange={async (event) => {
            const nextSemesterId = event.target.value;
            if (nextSemesterId === selectedSemesterId) return;
            const canSwitch = await flushPendingDrafts();
            if (canSwitch === false) return;
            setSelectedSemesterId(nextSemesterId);
            setPanelOpen(false);
            setActiveWeek(null);
          }}
        >
          {semesterIds.map((semesterId) => (
            <option key={semesterId} value={semesterId}>{semesterId}</option>
          ))}
        </select>
      </label>

      <label className={styles.controlField}>
        <span>Month</span>
        <select value={newMonthId} onChange={(event) => setNewMonthId(event.target.value)}>
          {ETHIOPIAN_MONTHS.map((monthId) => (
            <option key={monthId} value={monthId}>{monthId}</option>
          ))}
        </select>
      </label>

      <label className={styles.controlField}>
        <span>Week</span>
        <select value={newWeekId} onChange={(event) => setNewWeekId(event.target.value)}>
          <option value="W1">W1</option>
          <option value="W2">W2</option>
          <option value="W3">W3</option>
          <option value="W4">W4</option>
        </select>
      </label>

      <label className={styles.controlField}>
        <span>Expected Days</span>
        <input type="number" min={1} max={7} value={newExpectedDays} onChange={(event) => setNewExpectedDays(Number(event.target.value || 5))} />
      </label>

      <label className={styles.controlField}>
        <span>Create Plan</span>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.primaryButton}`}
          onClick={handleCreateWeekPlan}
          disabled={saving}
        >
          Add Week Plan
        </button>
      </label>
    </section>
  );
}

export default LessonPlanControls;
