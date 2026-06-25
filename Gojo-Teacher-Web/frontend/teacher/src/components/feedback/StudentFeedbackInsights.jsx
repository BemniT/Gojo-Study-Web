import React from "react";
import styles from "./StudentFeedback.module.css";

function StudentFeedbackInsights({ children }) {
  return <section className={styles.visualGrid}>{children}</section>;
}

export default StudentFeedbackInsights;
