import React from "react";
import styles from "./StudentFeedback.module.css";

function StudentFeedbackTableSection({ lessonSummaryRows, formatSemesterLabel, formatDateLabel, formatDateTimeLabel, formatGenderMix }) {
  return (
    <section className={`${styles.card} ${styles.tableCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <h2>Recent lesson feedback</h2>
          <span>Aggregated lesson summaries only</span>
        </div>
        <div className={styles.toolbarNote}>No individual student names are shown here.</div>
      </div>

      <div className={styles.feedbackTableWrap}>
        <table className={styles.feedbackTable}>
          <thead>
            <tr>
              <th>Course</th>
              <th>Lesson</th>
              <th>Date</th>
              <th>Responses</th>
              <th>Avg rating</th>
              <th>Dominant understanding</th>
              <th>Support rate</th>
              <th>Gender mix</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {lessonSummaryRows.slice(0, 12).map((row) => (
              <tr key={row.lessonKey}>
                <td>{row.courseLabel}</td>
                <td>
                  <div className={styles.tablePrimary}>{row.lessonTopic}</div>
                  <div className={styles.tableSecondary}>{formatSemesterLabel(row.semesterId)} • {row.monthId} {row.weekId}</div>
                </td>
                <td>{formatDateLabel(row.date)}</td>
                <td>{row.totalResponses}</td>
                <td>{row.averageRating > 0 ? row.averageRating.toFixed(1) : "-"}</td>
                <td>
                  <span className={styles.statusPill}>
                    {row.dominantUnderstandingLabel}
                  </span>
                </td>
                <td>
                  <span className={`${styles.statusPill} ${row.supportRate >= 50 ? styles.needsSupport : row.supportRate >= 25 ? styles.watch : styles.strong}`}>
                    {row.supportRate}%
                  </span>
                </td>
                <td>{formatGenderMix(row.genderCounts)}</td>
                <td>{formatDateTimeLabel(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default StudentFeedbackTableSection;
