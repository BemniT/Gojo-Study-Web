import React from "react";
import { FaChevronLeft, FaChevronRight, FaClock } from "react-icons/fa";
import styles from "./Schedule.module.css";

function MyScheduleDrawer({ rightSidebarOpen, setRightSidebarOpen, loading, teacherSchedule, days }) {
  if (rightSidebarOpen) {
    return (
      <aside className={styles.myDrawer}>
        <div className={styles.myDrawerHead}>
          <div className={styles.myDrawerTitle}>My Course Timetable</div>
          <button type="button" className={styles.drawerIconBtn} onClick={() => setRightSidebarOpen(false)} title="Close">
            <FaChevronRight />
          </button>
        </div>

        <div className={styles.myDrawerBody}>
          {loading ? <div className={styles.emptyText}>Loading...</div> : null}

          {!loading && Object.keys(teacherSchedule).length === 0 ? (
            <div className={styles.emptyText}>No personal teaching slots found.</div>
          ) : null}

          {!loading
            ? days.map((day) => {
                const periods = teacherSchedule?.[day];
                if (!periods) return null;

                return (
                  <div key={`my_${day}`} className={styles.myDayCard}>
                    <div className={styles.myDayTitle}>{day}</div>
                    {Object.entries(periods).map(([periodName, entries]) => (
                      <div key={`my_${day}_${periodName}`} className={styles.myEntry}>
                        <div className={styles.myEntryPeriod}>{periodName}</div>
                        {entries.map((entry, index) => (
                          <div key={`my_${day}_${periodName}_${index}`} className={styles.myEntryText}>
                            <FaClock style={{ marginRight: 6, color: "#007AFB" }} />
                            <strong>{entry.class}</strong> - {entry.subject} ({entry.time})
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })
            : null}
        </div>
      </aside>
    );
  }

  return (
    <button type="button" className={styles.myToggleBtn} onClick={() => setRightSidebarOpen(true)}>
      <span>My</span>
      <FaChevronLeft />
    </button>
  );
}

export default MyScheduleDrawer;
