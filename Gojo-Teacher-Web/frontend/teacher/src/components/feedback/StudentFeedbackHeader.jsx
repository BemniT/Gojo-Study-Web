import React from "react";
import styles from "./StudentFeedback.module.css";

function StudentFeedbackHeader({ coursesCount, rangeSummaryLabel, lastUpdatedLabel }) {
  return (
    <section className={styles.heroCard}>
      <div>
        <span className={styles.kicker}>Student Feedback</span>
        <h1 className={styles.heroTitle}>Lesson feedback analytics</h1>
        <p className={styles.heroCopy}>
          Read the class response quickly with clean visual graphs, lesson-level signals, and time-window controls. This view stays aggregate and does not show individual learners.
        </p>

        <div className={styles.heroMetaRow}>
          <span className={styles.heroChip}>{coursesCount} assigned courses</span>
          <span className={styles.heroChip}>{rangeSummaryLabel}</span>
          <span className={styles.heroChip}>Last update {lastUpdatedLabel}</span>
        </div>
      </div>
    </section>
  );
}

export default StudentFeedbackHeader;
