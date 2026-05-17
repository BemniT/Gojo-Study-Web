import React from "react";
import { FaSearch } from "react-icons/fa";
import { FixedSizeList as List } from "react-window";
import styles from "./Students.module.css";

function StudentList({
  searchTerm,
  setSearchTerm,
  chipStyle,
  selectedGrade,
  selectedSection,
  assignedGrades,
  assignedSectionsForSelectedGrade,
  selectedFilterLabel,
  loading,
  studentListError,
  filteredStudents,
  displayedStudents,
  isLoadingNext,
  onItemsRendered,
  selectedStudent,
  onSelectAllGrades,
  onSelectGrade,
  onSelectAllSections,
  onSelectSection,
  onSelectStudent,
  StudentRowComponent,
}) {
  return (
    <>
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.filterRow}>
        <button onClick={onSelectAllGrades} style={chipStyle(selectedGrade === "All" && selectedSection === "All")}>
          All Grades
        </button>
        {assignedGrades.map((gradeValue) => (
          <button
            key={`grade-${gradeValue}`}
            onClick={() => onSelectGrade(gradeValue)}
            style={chipStyle(selectedGrade === gradeValue)}
          >
            {`Grade ${gradeValue}`}
          </button>
        ))}
      </div>

      {selectedGrade !== "All" && (
        <div className={styles.sectionFilterRow}>
          <button
            onClick={onSelectAllSections}
            style={{
              ...chipStyle(selectedSection === "All"),
              boxShadow: selectedSection === "All" ? "0 0 0 2px var(--accent-soft)" : "none",
              transform: selectedSection === "All" ? "translateY(-1px)" : "none",
            }}
          >
            All Sections
          </button>
          {assignedSectionsForSelectedGrade.map((sec) => (
            <button key={sec} onClick={() => onSelectSection(sec)} style={chipStyle(selectedSection === sec)}>
              Section {sec}
            </button>
          ))}
        </div>
      )}

      <div className={styles.filterSummary}>
        {selectedFilterLabel}
      </div>
      {loading && <p className={styles.loadingText}>Loading students...</p>}
      {studentListError && <p className={styles.errorText}>{studentListError}</p>}
      {!loading && !studentListError && selectedGrade !== "All" && selectedSection === "All" && (
        <p className={styles.mutedText}>{`Showing all students in Grade ${selectedGrade}. Select a section to narrow down.`}</p>
      )}
      {!loading && !studentListError && filteredStudents.length === 0 && (
        <p className={styles.mutedText}>No students found.</p>
      )}

      <div className={styles.listStack}>
        <div className={styles.listResponsive}>
          <List
            height={500}
            itemCount={displayedStudents.length + (isLoadingNext ? 1 : 0)}
            itemSize={84}
            width="100%"
            onItemsRendered={onItemsRendered}
          >
            {({ index, style }) => {
              if (index === displayedStudents.length) {
                return (
                  <div style={style} className={styles.loadingRow}>
                    <div className={styles.loadingInline}>
                      <span className={styles.spinner} />
                      Loading...
                    </div>
                  </div>
                );
              }

              return (
                <div style={style} className={styles.listItemWrap}>
                  <StudentRowComponent
                    student={displayedStudents[index]}
                    number={index + 1}
                    selected={selectedStudent?.userId === displayedStudents[index]?.userId}
                    onClick={() => onSelectStudent(displayedStudents[index])}
                  />
                </div>
              );
            }}
          </List>
        </div>
      </div>
    </>
  );
}

export default StudentList;
