import React from "react";
import ProfileAvatar from "../ProfileAvatar";
import AttendanceTab from "./AttendanceTab";
import PerformanceTab from "./PerformanceTab";
import styles from "./Students.module.css";

function StudentDetailPanel({
  selectedStudent,
  selectedStudentDetails,
  isPortrait,
  studentTab,
  setStudentTab,
  setSelectedStudent,
  newTeacherNote,
  setNewTeacherNote,
  saveTeacherNote,
  savingNote,
  teacherNotes,
  attendanceProps,
  performanceProps,
}) {
  if (!selectedStudent) return null;

  return (
    <div
      className={styles.detailPanel}
      style={{
        width: isPortrait ? "100%" : "380px",
        height: isPortrait ? "100vh" : "calc(100vh - 55px)",
        top: isPortrait ? 0 : "55px",
        borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
      }}
    >
      <button
        onClick={() => setSelectedStudent(null)}
        className={styles.detailCloseButton}
      >
        ×
      </button>

      <div className={styles.detailHero}>
        <div className={styles.detailAvatarFrame}>
          <ProfileAvatar
            src={selectedStudentDetails?.profileImage || selectedStudent.profileImage}
            name={selectedStudent.name}
            alt={selectedStudent.name}
            className={styles.detailAvatar}
          />
        </div>
        <h2 className={styles.detailName}>{selectedStudent.name}</h2>
        <p className={styles.detailMeta}>{selectedStudent.studentId}</p>
        <p className={styles.detailMeta}>
          <strong>Grade:</strong> {selectedStudent.grade}
          {selectedStudent.section}
        </p>
      </div>

      <div className={styles.tabBar}>
        {["details", "attendance", "performance"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStudentTab(tab)}
            className={`${styles.tabButton} ${studentTab === tab ? styles.tabButtonActive : ""}`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div>
        {studentTab === "details" && (
          <div className={styles.detailsCard}>
            <div>
              <div className={styles.detailsSectionTitle}>
                Student Profile
              </div>

              <div className={styles.detailsGrid}>
                {[
                  ["Phone", selectedStudentDetails?.phone],
                  ["Gender", selectedStudentDetails?.gender],
                  ["Email", selectedStudentDetails?.email],
                  ["Grade", selectedStudentDetails?.grade],
                  ["Section", selectedStudentDetails?.section],
                  ["Age", selectedStudentDetails?.age],
                  ["Birth Date", selectedStudentDetails?.dob],
                  ["Parent Name", selectedStudentDetails?.parentName],
                  ["Parent Phone", selectedStudentDetails?.parentPhone],
                ].map(([label, value]) => (
                  <div key={label} className={styles.detailCell}>
                    <div className={styles.detailCellInner}>
                      <div className={styles.detailCellLabel}>
                        {label}
                      </div>
                      <div className={styles.detailCellValue}>
                        {value || "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.commentsWrap}>
                <div className={styles.detailsSectionTitle}>
                  Teacher Comments
                </div>

                <div className={styles.commentInputCard}>
                  <textarea
                    value={newTeacherNote}
                    onChange={(e) => setNewTeacherNote(e.target.value)}
                    placeholder="Write an important comment about the student..."
                    className={styles.commentTextarea}
                  />

                  <div className={styles.commentActions}>
                    <button
                      onClick={saveTeacherNote}
                      disabled={savingNote}
                      className={styles.commentSubmitButton}
                    >
                      {savingNote ? "Saving..." : "Add Comment"}
                    </button>
                  </div>
                </div>

                <div className={styles.commentList}>
                  {teacherNotes.length === 0 ? (
                    <div className={styles.commentEmpty}>
                      No teacher comments yet
                    </div>
                  ) : (
                    teacherNotes.map((n) => (
                      <div key={n.id} className={styles.commentRow}>
                        <div className={styles.commentAvatar}>
                          {n.teacherName
                            ?.split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "T"}
                        </div>

                        <div className={styles.commentBubble}>
                          <div className={styles.commentAuthor}>{n.teacherName}</div>
                          <div className={styles.commentText}>{n.note}</div>
                          <div className={styles.commentTime}>
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {studentTab === "attendance" && <AttendanceTab {...attendanceProps} />}

        {studentTab === "performance" && <PerformanceTab {...performanceProps} />}
      </div>
    </div>
  );
}

export default StudentDetailPanel;
