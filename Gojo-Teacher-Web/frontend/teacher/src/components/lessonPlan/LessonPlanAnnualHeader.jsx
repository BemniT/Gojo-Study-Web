import React from "react";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import styles from "./LessonPlan.module.css";

function LessonPlanAnnualHeader({ exportAnnualPlanExcel, exportAnnualPlanPdf, hasRows }) {
  return (
    <section className={styles.sectionHeadingCard}>
      <div>
        <div className={styles.sectionKicker}>Annual Plan</div>
        <h2 className={styles.sectionTitle}>Annual Plan Overview</h2>
        <p className={styles.sectionSubtitle}>Added months and weeks stay here, and you can export the full annual plan to Excel or PDF.</p>
      </div>
      <div className={styles.exportToolbar}>
        <button className={`${styles.actionButton} ${styles.ghostButton}`} onClick={exportAnnualPlanExcel} disabled={!hasRows}>
          <FaFileExcel /> Annual Excel
        </button>
        <button className={`${styles.actionButton} ${styles.ghostButton}`} onClick={exportAnnualPlanPdf} disabled={!hasRows}>
          <FaFilePdf /> Annual PDF
        </button>
      </div>
    </section>
  );
}

export default LessonPlanAnnualHeader;
