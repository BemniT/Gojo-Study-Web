import React from "react";
import styles from "./Exam.module.css";

function ExamHeader({ selectedCourse }) {
  return (
    <section className={styles.hero}>
      <h2 className={styles.heroTitle}>Assessment Builder</h2>
      <div className={styles.heroBadges}>
        <span className={styles.badgePrimary}>
          {selectedCourse
            ? `${selectedCourse.subject || selectedCourse.name} • Grade ${selectedCourse.grade} Section ${selectedCourse.section}`
            : "No course selected"}
        </span>
        <span className={styles.badgeSecondary}>Teacher View</span>
      </div>
    </section>
  );
}

export default ExamHeader;
