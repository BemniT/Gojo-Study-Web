import React from "react";
import { FaCalendarAlt } from "react-icons/fa";
import styles from "./Schedule.module.css";

function ScheduleHero({ selectedDay, summary }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroHead}>
        <div>
          <div className={styles.title}>Teaching Timetable Workspace</div>
          <div className={styles.subtitle}>
            See your own teaching timetable and the full timetable of the grade-sections you teach.
          </div>
        </div>
        <div className={styles.chipRow}>
          <span className={styles.chip}>
            <FaCalendarAlt style={{ marginRight: 6 }} /> Teacher View
          </span>
          <span className={styles.chip}>{selectedDay === "All" ? "All Days" : selectedDay}</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Grade Sections</div>
          <div className={styles.summaryValue}>{summary.classes}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Periods</div>
          <div className={styles.summaryValue}>{summary.totalPeriods}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>My Periods</div>
          <div className={styles.summaryValue}>{summary.myPeriods}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Active Days</div>
          <div className={styles.summaryValue}>{summary.activeDays}</div>
        </div>
      </div>
    </section>
  );
}

export default ScheduleHero;
