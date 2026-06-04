import React from "react";
import { FaBookOpen } from "react-icons/fa";
import styles from "./Schedule.module.css";

function ScheduleCourses({ teacherCourses }) {
  return (
    <section className={styles.coursesCard}>
      <div className={styles.coursesTitle}>My Assigned Courses</div>
      <div className={styles.coursesGrid}>
        {!teacherCourses.length ? (
          <span className={styles.coursePill}>No course assignment found yet</span>
        ) : (
          teacherCourses.map((course) => (
            <span key={course.id} className={styles.coursePill}>
              <FaBookOpen />
              {course.subject || course.name} . G{course.grade}
              {String(course.section || "").toUpperCase()}
            </span>
          ))
        )}
      </div>
    </section>
  );
}

export default ScheduleCourses;
