import React from "react";
import styles from "./Schedule.module.css";

function ScheduleDays({
  loading,
  error,
  visibleDays,
  scopedSchedule,
  selectedGrade,
  selectedSection,
  parseGradeSection,
  isTeacherPeriod,
}) {
  if (loading) {
    return <p className={styles.centerMuted}>Loading timetable...</p>;
  }

  if (error) {
    return <p className={styles.centerError}>{error}</p>;
  }

  if (!visibleDays.length) {
    return (
      <div className={styles.dayCard}>
        <div className={styles.emptyText}>No timetable found for your current teacher scope.</div>
      </div>
    );
  }

  return visibleDays.map((day) => {
    const classes = scopedSchedule?.[day] || {};

    return (
      <section key={day} className={styles.dayCard}>
        <div className={styles.dayTitle}>{day}</div>

        {Object.entries(classes)
          .filter(([gradeLabel]) => {
            const { grade, section } = parseGradeSection(gradeLabel);
            if (selectedGrade !== "All" && grade !== selectedGrade) return false;
            if (selectedSection !== "All" && section !== selectedSection) return false;
            return true;
          })
          .map(([gradeLabel, periods]) => (
            <div key={`${day}_${gradeLabel}`} className={styles.gradeBlock}>
              <div className={styles.gradeHead}>{gradeLabel} Full Timetable</div>
              <table className={styles.scheduleTable}>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Subject</th>
                    <th>Time</th>
                    <th>Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(periods || {}).map(([periodName, info]) => {
                    const mine = isTeacherPeriod(gradeLabel, info);
                    const time = info?.time || periodName.match(/\((.*?)\)/)?.[1] || "N/A";

                    return (
                      <tr key={`${gradeLabel}_${periodName}`} className={mine ? styles.scheduleRowMine : ""}>
                        <td>{periodName}</td>
                        <td>{info?.subject || "-"}</td>
                        <td>{time}</td>
                        <td>{info?.teacherName || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
      </section>
    );
  });
}

export default ScheduleDays;
