import React from "react";
import { FaFileAlt } from "react-icons/fa";

const ACTIONS = {
  promote: "promote",
  repeat: "repeat",
  graduate: "graduate",
  transfer: "transfer",
  withdraw: "withdraw",
};

const cardStyle = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  boxShadow: "var(--shadow-panel)",
};

const yearLabel = (key) => String(key || "").replace("_", "/");

function StudentRow({
  student,
  decision,
  sectionOpts,
  selected,
  hasDraftOverride,
  canEditInfo,
  busy,
  onToggle,
  onUpdate,
  onEdit,
}) {
  return (
    <div className="ps-row" style={{ borderTop: "1px solid var(--border-soft)", padding: "10px 12px" }}>
      <div className="ps-table">
        <div>
          <input type="checkbox" checked={selected} onChange={() => onToggle(student.studentId)} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {student.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{student.studentId}</div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700 }}>{student.grade}</div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{student.section || "-"}</div>

        <select
          value={decision.action}
          onChange={(e) => onUpdate(student.studentId, { action: e.target.value })}
          className="ps-select"
          style={{ padding: "6px 8px", fontSize: 12 }}
        >
          <option value={ACTIONS.promote}>Promote</option>
          <option value={ACTIONS.repeat}>Repeat</option>
          <option value={ACTIONS.graduate}>Graduate</option>
          <option value={ACTIONS.transfer}>Transfer</option>
          <option value={ACTIONS.withdraw}>Withdraw</option>
        </select>

        <div style={{ fontSize: 12, fontWeight: 700 }}>
          {decision.action === ACTIONS.graduate ||
          decision.action === ACTIONS.transfer ||
          decision.action === ACTIONS.withdraw
            ? "-"
            : decision.targetGrade}
        </div>

        {decision.action === ACTIONS.promote || decision.action === ACTIONS.repeat ? (
          <select
            value={decision.targetSection}
            onChange={(e) => onUpdate(student.studentId, { targetSection: e.target.value })}
            className="ps-select"
            style={{ padding: "6px 8px", fontSize: 12 }}
          >
            <option value="">Select</option>
            {(sectionOpts.length ? sectionOpts : [student.section || "A"]).map((s) => (
              <option key={s} value={String(s).toUpperCase()}>
                {String(s).toUpperCase()}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>-</div>
        )}

        <div>
          <button
            type="button"
            onClick={() => onEdit(student)}
            disabled={!canEditInfo || busy}
            className="ps-btn"
            title={
              canEditInfo
                ? "Edit student information before re-registration"
                : "Editing is only available for promote or repeat actions"
            }
            style={{
              width: "100%",
              justifyContent: "center",
              border: `1px solid ${
                canEditInfo
                  ? "color-mix(in srgb, var(--accent) 28%, transparent)"
                  : "var(--border-soft)"
              }`,
              background: canEditInfo ? "var(--accent-soft)" : "var(--surface-panel)",
              color: canEditInfo ? "var(--accent-strong)" : "var(--text-muted)",
              padding: "6px 8px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            <FaFileAlt /> {hasDraftOverride ? "Edit Draft" : "Edit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Step2StudentReview({
  // Header counts
  visibleStudents,
  studentsForFromYear,
  fromYear,
  toYear,
  summary,
  // Selection
  selectedStudentsMap,
  toggleStudentSelection,
  setAllSelection,
  // Filters
  gradeFilter,
  setGradeFilter,
  availableGrades,
  sectionFilter,
  setSectionFilter,
  availableSections,
  studentSearch,
  setStudentSearch,
  // Grouped data + decision helpers
  groupedVisibleStudents,
  effectiveDecision,
  sectionOptionsByGrade,
  updateDecision,
  // Draft overrides + editor
  draftOverrides,
  openStudentDraftEditor,
  // Busy flags
  working,
  reRegisterSaving,
}) {
  const editorBusy = working || reRegisterSaving;
  const resetFilters = () => {
    setGradeFilter("all");
    setSectionFilter("all");
    setStudentSearch("");
  };

  return (
    <div className="ps-panel" style={{ ...cardStyle, overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 14px",
          fontWeight: 900,
          color: "var(--text-primary)",
          borderBottom: "1px solid var(--border-soft)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span>
          Step 2 - Review Student Decisions ({visibleStudents.length} visible of {studentsForFromYear.length})
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {yearLabel(fromYear)} {"->"} {yearLabel(toYear)}
        </span>
      </div>

      {/* Summary + Select All */}
      <div
        style={{
          ...cardStyle,
          margin: 12,
          padding: 10,
          border: "1px solid var(--border-soft)",
          background: "var(--surface-muted)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span>
            Selected: {summary.total} / {summary.totalLoaded}
          </span>
          <span>Visible: {visibleStudents.length}</span>
          <span>Promote: {summary.promoteCount}</span>
          <span>Repeat: {summary.repeatCount}</span>
          <span>Graduate: {summary.graduateCount}</span>
          <span>Transfer: {summary.transferCount}</span>
          <span>Withdraw: {summary.withdrawCount}</span>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setAllSelection(true)} className="ps-btn ps-btn-soft" style={{ padding: "6px 10px", fontSize: 11 }}>
            Select All
          </button>
          <button
            onClick={() => setAllSelection(false)}
            className="ps-btn"
            style={{
              border: "1px solid var(--border-soft)",
              background: "var(--surface-panel)",
              color: "var(--text-secondary)",
              padding: "6px 10px",
              fontSize: 11,
            }}
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          ...cardStyle,
          margin: "0 12px 12px",
          padding: 10,
          border: "1px solid var(--border-soft)",
          background: "var(--surface-panel)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="ps-select">
            <option value="all">All Grades</option>
            {availableGrades.map((grade) => (
              <option key={grade} value={grade}>{`Grade ${grade}`}</option>
            ))}
          </select>

          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="ps-select">
            <option value="all">All Sections</option>
            {availableSections.map((section) => (
              <option key={section} value={section}>{`Section ${section}`}</option>
            ))}
          </select>

          <input
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by student name or ID"
            className="ps-input"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="ps-btn"
            style={{
              border: "1px solid var(--border-soft)",
              background: "var(--surface-muted)",
              color: "var(--text-secondary)",
              justifyContent: "center",
            }}
          >
            Reset Filters
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
          Students are now grouped by grade and section so the registerer can review one class level at a time.
        </div>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, margin: "0 12px 12px", overflow: "hidden" }}>
        <div
          className="ps-table-head"
          style={{
            ...cardStyle,
            borderRadius: 0,
            border: "none",
            borderBottom: "1px solid var(--border-soft)",
            boxShadow: "none",
            padding: "10px 12px",
            background: "var(--surface-muted)",
          }}
        >
          <div className="ps-table" style={{ fontSize: 12, fontWeight: 900, color: "var(--text-secondary)" }}>
            <div>Select</div>
            <div>Student</div>
            <div>Grade</div>
            <div>Section</div>
            <div>Action</div>
            <div>To Grade</div>
            <div>To Section</div>
            <div>Edit Info</div>
          </div>
        </div>

        <div style={{ maxHeight: 460, overflow: "auto" }}>
          {groupedVisibleStudents.length === 0 ? (
            <div style={{ padding: "18px 14px", fontSize: 13, color: "var(--text-muted)" }}>
              No students match the current grade filter, section filter, or search.
            </div>
          ) : (
            groupedVisibleStudents.map((gradeGroup) => (
              <div key={gradeGroup.grade}>
                <div
                  style={{
                    padding: "10px 12px",
                    borderTop: "1px solid var(--border-soft)",
                    borderBottom: "1px solid var(--border-soft)",
                    background: "color-mix(in srgb, var(--accent) 8%, var(--surface-muted))",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>{`Grade ${gradeGroup.grade}`}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>
                    {gradeGroup.sections.reduce(
                      (count, sectionGroup) => count + sectionGroup.students.length,
                      0
                    )}{" "}
                    students
                  </div>
                </div>

                {gradeGroup.sections.map((sectionGroup) => (
                  <div key={`${gradeGroup.grade}-${sectionGroup.section}`}>
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "var(--surface-panel)",
                        borderBottom: "1px solid var(--border-soft)",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {`Section ${sectionGroup.section}`}
                    </div>

                    {sectionGroup.students.map((student) => {
                      const decision = effectiveDecision(student);
                      const sectionOpts = sectionOptionsByGrade[decision.targetGrade] || [];
                      const canEditInfo =
                        decision.action === ACTIONS.promote || decision.action === ACTIONS.repeat;
                      return (
                        <StudentRow
                          key={student.studentId}
                          student={student}
                          decision={decision}
                          sectionOpts={sectionOpts}
                          selected={!!selectedStudentsMap[student.studentId]}
                          hasDraftOverride={!!draftOverrides[student.studentId]}
                          canEditInfo={canEditInfo}
                          busy={editorBusy}
                          onToggle={toggleStudentSelection}
                          onUpdate={updateDecision}
                          onEdit={openStudentDraftEditor}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
