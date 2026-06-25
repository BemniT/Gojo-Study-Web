import React from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import ExamQuestionCard from "./ExamQuestionCard";
import styles from "./Exam.module.css";

function ExamAssessmentForm({
  isMobile,
  selectedCourse,
  selectedGradeKey,
  selectedSubjectKey,
  chapterId,
  setChapterId,
  assessmentType,
  setAssessmentType,
  durationMinutes,
  setDurationMinutes,
  totalQuestions,
  setTotalQuestions,
  passScore,
  setPassScore,
  published,
  setPublished,
  chapterOptions,
  questions,
  handleQuestionChange,
  addQuestion,
  removeQuestion,
  saving,
  handleSubmit,
  success,
  error,
}) {
  return (
    <form onSubmit={handleSubmit} className={styles.card}>
      <div className={isMobile ? styles.singleColumn : styles.twoColumnGrid}>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Grade</label>
          <input value={selectedCourse?.grade || ""} readOnly className={styles.input} />
        </div>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Subject</label>
          <input value={selectedCourse?.subject || selectedCourse?.name || ""} readOnly className={styles.input} />
        </div>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Chapter</label>
          <select
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
            required
            className={styles.select}
          >
            <option value="">Select Chapter</option>
            {chapterOptions.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.title} ({chapter.id})
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Assessment Type</label>
          <select value={assessmentType} onChange={(event) => setAssessmentType(event.target.value)} className={styles.select}>
            <option value="Quiz">Quiz</option>
            <option value="Worksheet">Worksheet</option>
            <option value="Exam">Exam</option>
          </select>
        </div>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Duration (minutes)</label>
          <input type="number" value={durationMinutes} min={1} onChange={(event) => setDurationMinutes(event.target.value)} required className={styles.input} />
        </div>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Total Questions</label>
          <input type="number" value={totalQuestions} min={1} onChange={(event) => setTotalQuestions(event.target.value)} required className={styles.input} />
        </div>
        <div className={styles.fieldBlock}>
          <label className={styles.label}>Pass Score</label>
          <input type="number" value={passScore} min={1} onChange={(event) => setPassScore(event.target.value)} required className={styles.input} />
        </div>
        <div className={styles.publishBlock}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
            Publish now
          </label>
        </div>
      </div>

      <h3 className={styles.questionsTitle}>Questions</h3>

      {questions.map((question, index) => (
        <ExamQuestionCard
          key={`question-${index}`}
          question={question}
          index={index}
          isMobile={isMobile}
          onChange={handleQuestionChange}
          onRemove={() => removeQuestion(index)}
          canRemove={questions.length > 1}
        />
      ))}

      <div className={styles.actionRow}>
        <button type="button" onClick={addQuestion} className={styles.secondaryButton}>
          <FaPlus /> Add Question
        </button>
        <button type="submit" disabled={saving} className={styles.primaryButton}>
          <FaSave /> {saving ? "Saving..." : "Save Assessment"}
        </button>
      </div>

      {success ? <div className={styles.successText}>{success}</div> : null}
      {error ? <div className={styles.errorText}>{error}</div> : null}
    </form>
  );
}

export default ExamAssessmentForm;
