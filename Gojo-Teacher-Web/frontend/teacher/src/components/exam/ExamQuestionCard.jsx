import React from "react";
import styles from "./Exam.module.css";

function ExamQuestionCard({ question, index, isMobile, onChange, onRemove, canRemove }) {
  return (
    <div className={styles.questionCard}>
      <div className={styles.questionHead}>
        <span className={styles.questionTitle}>Question {index + 1}</span>
        {canRemove ? (
          <button type="button" onClick={onRemove} className={styles.dangerButton}>
            Remove
          </button>
        ) : null}
      </div>

      <div className={styles.fieldBlock}>
        <label className={styles.label}>Question</label>
        <input
          value={question.question}
          onChange={(event) => onChange(index, "question", event.target.value)}
          required
          className={styles.input}
        />
      </div>

      <div className={isMobile ? styles.singleColumn : styles.twoColumnGrid}>
        {Object.keys(question.options).map((option) => (
          <div key={`${index}-${option}`} className={styles.fieldBlock}>
            <label className={styles.label}>Option {option}</label>
            <input
              value={question.options[option]}
              onChange={(event) => onChange(index, "options", { [option]: event.target.value })}
              required
              className={styles.input}
            />
          </div>
        ))}
      </div>

      <div className={isMobile ? styles.singleColumn : styles.twoColumnGrid}>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Correct Option</label>
          <select
            value={question.correct}
            onChange={(event) => onChange(index, "correct", event.target.value)}
            className={styles.input}
          >
            {Object.keys(question.options).map((option) => (
              <option key={`${index}-correct-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Points</label>
          <input
            type="number"
            value={question.points}
            min={1}
            onChange={(event) => onChange(index, "points", event.target.value)}
            required
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.fieldBlock}>
        <label className={styles.label}>Explanation (optional)</label>
        <input
          value={question.explanation}
          onChange={(event) => onChange(index, "explanation", event.target.value)}
          className={styles.input}
        />
      </div>
    </div>
  );
}

export default ExamQuestionCard;
