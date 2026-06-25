import React from "react";
import { FaFilter } from "react-icons/fa";
import styles from "./StudentFeedback.module.css";

function StudentFeedbackToolbar({
  courses,
  selectedCourseId,
  setSelectedCourseId,
  availableSemesters,
  selectedSemesterId,
  setSelectedSemesterId,
  rangeSummaryLabel,
  dateRangeOptions,
  dateRange,
  setDateRange,
  focusOptions,
  focusFilter,
  setFocusFilter,
  formatCourseLabel,
  formatSemesterLabel,
}) {
  return (
    <section className={styles.toolbarCard}>
      <div className={styles.toolbarHead}>
        <div className={styles.toolbarTitle}>
          <FaFilter />
          <span>Filter feedback</span>
        </div>
        <div className={styles.toolbarNote}>{rangeSummaryLabel}</div>
      </div>

      <div className={styles.toolbarControls}>
        <label className={styles.selectField}>
          <span>Course</span>
          <select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
            <option value="all">All assigned courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{formatCourseLabel(course)}</option>
            ))}
          </select>
        </label>

        <label className={styles.selectField}>
          <span>Semester</span>
          <select value={selectedSemesterId} onChange={(event) => setSelectedSemesterId(event.target.value)}>
            <option value="all">All semesters</option>
            {availableSemesters.map((semesterId) => (
              <option key={semesterId} value={semesterId}>{formatSemesterLabel(semesterId)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.toolbarSwitches}>
        <div className={styles.switchCluster}>
          <span className={styles.switchLabel}>Date range</span>
          <div className={styles.pillRow} role="tablist" aria-label="Analytics date range">
            {dateRangeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.pill} ${dateRange === option.id ? styles.pillActive : ""}`}
                onClick={() => setDateRange(option.id)}
                aria-pressed={dateRange === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.switchCluster}>
          <span className={styles.switchLabel}>Focus</span>
          <div className={styles.pillRow} role="tablist" aria-label="Feedback focus filters">
            {focusOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.pill} ${focusFilter === option.id ? styles.pillActive : ""}`}
                onClick={() => setFocusFilter(option.id)}
                aria-pressed={focusFilter === option.id}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default StudentFeedbackToolbar;
