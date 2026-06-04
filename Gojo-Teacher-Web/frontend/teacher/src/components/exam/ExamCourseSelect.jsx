import React from "react";
import styles from "./Exam.module.css";

function ExamCourseSelect({
  selectedCourseId,
  setSelectedCourseId,
  courses,
  coursesLoading,
  courseError,
}) {
  return (
    <section className={styles.card}>
      <label className={styles.label}>Assigned Course</label>
      <select
        value={selectedCourseId}
        onChange={(event) => setSelectedCourseId(event.target.value)}
        className={styles.select}
      >
        <option value="">-- Select Course --</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {(course.subject || course.name || "Course")} - Grade {course.grade} Section {course.section}
          </option>
        ))}
      </select>
      {coursesLoading ? <div className={styles.helpText}>Loading teacher courses...</div> : null}
      {!coursesLoading && courseError ? <div className={styles.errorText}>{courseError}</div> : null}
    </section>
  );
}

export default ExamCourseSelect;
