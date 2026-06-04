import React from "react";
import styles from "./StudentFeedback.module.css";

function StudentFeedbackSummary({ totalResponses, averageRating, ratedResponses, supportShare, supportEntries, activeLessons }) {
  return (
    <section className={styles.summaryGrid}>
      <article className={`${styles.metricCard} ${styles.card}`}>
        <span>Total responses</span>
        <strong>{totalResponses}</strong>
        <small>All feedback entries in the active view</small>
      </article>

      <article className={`${styles.metricCard} ${styles.card}`}>
        <span>Average rating</span>
        <strong>{averageRating.toFixed(1)}</strong>
        <small>{ratedResponses} rated responses</small>
      </article>

      <article className={`${styles.metricCard} ${styles.card} ${styles.warningMetric}`}>
        <span>Support share</span>
        <strong>{supportShare}%</strong>
        <small>{supportEntries.length} responses need follow-up</small>
      </article>

      <article className={`${styles.metricCard} ${styles.card}`}>
        <span>Active lessons</span>
        <strong>{activeLessons}</strong>
        <small>Aggregated lesson summaries in this filter</small>
      </article>
    </section>
  );
}

export default StudentFeedbackSummary;
