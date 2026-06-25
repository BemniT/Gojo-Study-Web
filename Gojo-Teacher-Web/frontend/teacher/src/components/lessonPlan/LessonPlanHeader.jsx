import React from "react";
import { FaBookOpen, FaFilter } from "react-icons/fa";
import styles from "./LessonPlan.module.css";

function LessonPlanHeader({ selectedCourse, weeks, selectedSemesterId, totalExpected, totalSubmitted, pendingWeeks, saveStatusStyle, saveStatusText, autoSaveEnabled, setAutoSaveEnabled, saveHelperText }) {
  return (
    <section className={styles.headerCard}>
      <div>
        <h1 className={styles.title}>Lessons Planning Studio</h1>
        <p className={styles.subtitle}>
          Professional weekly planning built on AssessmentTemplates, LessonPlans, LessonDailyLogs, and LessonSubmissions.
        </p>
        <div className={styles.contextStrip}>
          {selectedCourse?.subject ? <span className={styles.contextPill}>Course: {selectedCourse.subject}</span> : null}
          {selectedCourse?.grade ? <span className={styles.contextPill}>Grade {selectedCourse.grade}</span> : null}
          {selectedCourse?.section ? <span className={styles.contextPill}>Section {selectedCourse.section}</span> : null}
        </div>
        <div className={styles.metrics}>
          <span className={styles.metricChip}><FaBookOpen /> Week Rows: {weeks.length}</span>
          <span className={styles.metricChip}><FaFilter /> Semester: {selectedSemesterId || "-"}</span>
        </div>
        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Expected Days</div>
            <div className={styles.summaryValue}>{totalExpected}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Submitted Days</div>
            <div className={styles.summaryValue}>{totalSubmitted}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Pending Weeks</div>
            <div className={styles.summaryValue}>{pendingWeeks}</div>
          </div>
        </div>
        <div className={styles.saveStrip}>
          <span className={styles.savePill} style={saveStatusStyle}>{saveStatusText}</span>
          <button
            type="button"
            className={`${styles.toggleButton} ${autoSaveEnabled ? styles.toggleOn : styles.toggleOff}`}
            onClick={() => setAutoSaveEnabled((previousValue) => !previousValue)}
          >
            <span className={styles.toggleTrack}>
              <span className={styles.toggleThumb} />
            </span>
            <span>{autoSaveEnabled ? "Auto Save On" : "Auto Save Off"}</span>
          </button>
        </div>
        <p className={styles.helperCopy}>{saveHelperText}</p>
      </div>
    </section>
  );
}

export default LessonPlanHeader;
