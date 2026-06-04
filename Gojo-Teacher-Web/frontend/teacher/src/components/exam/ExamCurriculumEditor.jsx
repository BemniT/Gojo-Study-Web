import React from "react";
import { FaBookOpen, FaPlus } from "react-icons/fa";
import styles from "./Exam.module.css";

function ExamCurriculumEditor({
  showCurriculumForm,
  setShowCurriculumForm,
  isMobile,
  newGrade,
  setNewGrade,
  newSubject,
  setNewSubject,
  newChapters,
  handleChapterChange,
  addChapter,
  removeChapter,
  curriculumSaving,
  handleCreateCurriculum,
  curriculumSuccess,
  curriculumError,
}) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeadRow}>
        <h3 className={styles.sectionTitle}>
          <FaBookOpen className={styles.sectionIcon} />
          Curriculum Chapters
        </h3>
        <button
          type="button"
          onClick={() => setShowCurriculumForm((value) => !value)}
          className={styles.toggleButton}
        >
          {showCurriculumForm ? "Hide Curriculum Editor" : "Open Curriculum Editor"}
        </button>
      </div>

      {showCurriculumForm ? (
        <form onSubmit={handleCreateCurriculum} className={styles.formStack}>
          <div className={isMobile ? styles.singleColumn : styles.twoColumnGrid}>
            <div className={styles.fieldBlock}>
              <label className={styles.label}>Grade</label>
              <input
                value={newGrade}
                onChange={(event) => setNewGrade(event.target.value)}
                placeholder="e.g. 7"
                required
                className={styles.input}
              />
            </div>
            <div className={styles.fieldBlock}>
              <label className={styles.label}>Subject</label>
              <input
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                placeholder="e.g. english"
                required
                className={styles.input}
              />
            </div>
          </div>

          {newChapters.map((chapter, index) => (
            <div key={`${chapter.id || "chapter"}-${index}`} className={styles.chapterCard}>
              <div className={isMobile ? styles.singleColumn : styles.chapterGrid}>
                <input
                  value={chapter.id}
                  onChange={(event) => handleChapterChange(index, "id", event.target.value)}
                  placeholder="Chapter ID (chapter_01)"
                  required
                  className={styles.input}
                />
                <input
                  value={chapter.title}
                  onChange={(event) => handleChapterChange(index, "title", event.target.value)}
                  placeholder="Chapter title"
                  required
                  className={styles.input}
                />
              </div>
              <div className={isMobile ? styles.singleColumn : styles.chapterActionGrid}>
                <input
                  value={chapter.contentUrl}
                  onChange={(event) => handleChapterChange(index, "contentUrl", event.target.value)}
                  placeholder="Content URL (optional)"
                  className={styles.input}
                />
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={Boolean(chapter.hasExam)}
                    onChange={(event) => handleChapterChange(index, "hasExam", event.target.checked)}
                  />
                  Has Exam
                </label>
                <button
                  type="button"
                  onClick={() => removeChapter(index)}
                  disabled={newChapters.length === 1}
                  className={styles.dangerButton}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className={styles.actionRow}>
            <button type="button" onClick={addChapter} className={styles.secondaryButton}>
              <FaPlus /> Add Chapter
            </button>
            <button type="submit" disabled={curriculumSaving} className={styles.primaryButton}>
              {curriculumSaving ? "Saving..." : "Save Curriculum"}
            </button>
          </div>

          {curriculumSuccess ? <div className={styles.successText}>{curriculumSuccess}</div> : null}
          {curriculumError ? <div className={styles.errorText}>{curriculumError}</div> : null}
        </form>
      ) : null}
    </section>
  );
}

export default ExamCurriculumEditor;
