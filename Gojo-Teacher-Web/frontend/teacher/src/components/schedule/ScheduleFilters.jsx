import React from "react";
import styles from "./Schedule.module.css";

function ScheduleFilters({
  gradeOptions,
  selectedGrade,
  setSelectedGrade,
  sectionOptions,
  selectedSection,
  setSelectedSection,
  selectedDay,
  setSelectedDay,
  days,
}) {
  return (
    <section className={styles.filterCard}>
      <div className={styles.filterGrid}>
        <div className={styles.filterPanel}>
          <div className={styles.filterTitle}>Filter by Grade</div>
          <div className={styles.filterRow}>
            {gradeOptions.map((grade) => (
              <button
                key={grade}
                type="button"
                className={`${styles.filterPill} ${selectedGrade === grade ? styles.filterPillActive : ""}`}
                onClick={() => setSelectedGrade(grade)}
              >
                {grade === "All" ? "All Grades" : `Grade ${grade}`}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterPanel}>
          <div className={styles.filterTitle}>Filter by Section</div>
          <div className={styles.filterRow}>
            {sectionOptions.map((section) => (
              <button
                key={section}
                type="button"
                className={`${styles.filterPill} ${selectedSection === section ? styles.filterPillActive : ""}`}
                onClick={() => setSelectedSection(section)}
              >
                {section === "All" ? "All Sections" : section}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.filterTitle}>Filter by Day</div>
      <div className={styles.filterRow}>
        {["All", ...days].map((day) => (
          <button
            key={day}
            type="button"
            className={`${styles.filterPill} ${selectedDay === day ? styles.filterPillActive : ""}`}
            onClick={() => setSelectedDay(day)}
          >
            {day}
          </button>
        ))}
      </div>
    </section>
  );
}

export default ScheduleFilters;
