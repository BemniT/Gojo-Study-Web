import React from "react";

const SEMESTERS = [
  { key: "semester1", label: "Semester 1" },
  { key: "semester2", label: "Semester 2" },
];

const statusColor = (pct) => (pct >= 75 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#dc2626");
const statusLabel = (pct) =>
  pct >= 75 ? "Excellent" : pct >= 50 ? "Good" : "Needs Improvement";

const formatCourseName = (key) =>
  String(key || "").replace("course_", "").replace(/_/g, " ").toUpperCase();

const isQuarterKey = (k) => /^(q\d+|quarter\d+|q_\d+)$/i.test(k);
const quarterNumOf = (value) => {
  const m = String(value || "").match(/\d+/);
  return m ? Number(m[0]) : 0;
};

const sumScore = (entries) => entries.reduce((s, a) => s + (a.score || 0), 0);
const sumMax = (entries) => entries.reduce((s, a) => s + (a.max || 0), 0);

const renderScore = (value) =>
  value === "" || value === null || value === undefined || value === 0 ? "-" : value;

function QuarterBlock({ quarterKey, quarterData }) {
  const label = (() => {
    const m = String(quarterKey || "").match(/\d+/);
    return m ? `Quarter ${m[0]}` : String(quarterKey).toUpperCase();
  })();

  const qAss = quarterData?.assessments || quarterData || {};
  const qAssEntries = Object.values(qAss);
  const qTotal = sumScore(qAssEntries);
  const qMax = sumMax(qAssEntries);
  const qPct = qMax ? (qTotal / qMax) * 100 : 0;
  const clr = statusColor(qPct);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: 8,
        borderRadius: 8,
        border: "1px solid #f1f5f9",
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>
          {qTotal} / {qMax}
        </div>
        <div
          style={{
            padding: "3px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 800,
            color: clr,
            border: "1px solid #e5e7eb",
          }}
        >
          {Math.round(qPct)}%
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginBottom: 8 }}>
        <div style={{ width: `${Math.max(0, Math.min(100, qPct))}%`, height: "100%", background: clr }} />
      </div>
      {Object.entries(qAss).length === 0 ? (
        <div style={{ color: "#8b8f95", fontSize: 12 }}>No marks</div>
      ) : (
        Object.entries(qAss).map(([k, a]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: "#111827" }}>
              <span>{a.name || k}</span>
              <span>
                {renderScore(a.score)} / {a.max}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CourseCard({ courseKey, studentCourseData, activeSemester }) {
  const data = studentCourseData?.[activeSemester];
  if (!data) return null;

  const assessments = data.assessments || {};
  const assessmentValues = Object.values(assessments);
  const total = sumScore(assessmentValues);
  const maxTotal = sumMax(assessmentValues);
  const percentage = maxTotal ? (total / maxTotal) * 100 : 0;
  const statusClr = statusColor(percentage);

  const quarterEntries = Object.entries(data || {})
    .filter(([k, v]) => isQuarterKey(k) && v && typeof v === "object")
    .sort((a, b) => quarterNumOf(a[0]) - quarterNumOf(b[0]));
  const hasQuarterFormat = quarterEntries.length > 0;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: "var(--surface-panel)",
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 10, color: "var(--text-primary)", textAlign: "left" }}>
        {formatCourseName(courseKey)}
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 8px",
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 800,
          marginBottom: 10,
          color: hasQuarterFormat ? "#1d4ed8" : "#0f766e",
          background: hasQuarterFormat ? "#dbeafe" : "#ccfbf1",
          border: "1px solid var(--border-soft)",
        }}
      >
        {hasQuarterFormat ? "Format: Quarter-based" : "Format: Semester-based"}
      </div>

      {hasQuarterFormat ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          {quarterEntries.map(([quarterKey, quarterData]) => (
            <QuarterBlock key={quarterKey} quarterKey={quarterKey} quarterData={quarterData} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Total</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#111827" }}>
              {total} / {maxTotal}
            </div>
            <div
              style={{
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 800,
                border: "1px solid #e5e7eb",
                color: statusClr,
                background: "#ffffff",
              }}
            >
              {Math.round(percentage)}%
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#e5e7eb", overflow: "hidden", marginBottom: 12 }}>
            <div style={{ width: `${Math.max(0, Math.min(100, percentage))}%`, height: "100%", background: statusClr }} />
          </div>
          {Object.entries(assessments).map(([key, a]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 600, color: "#111827" }}>
                <span>{a.name}</span>
                <span>
                  {renderScore(a.score)} / {a.max}
                </span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, textAlign: "left", fontWeight: 700, fontSize: 10, color: statusClr }}>
            {statusLabel(percentage)}
          </div>
          <div style={{ marginTop: 6, textAlign: "left", fontSize: 10, color: "#64748b" }}>
            {studentCourseData.teacherName || data.teacherName || "N/A"}
          </div>
        </>
      )}
    </div>
  );
}

export default function StudentPerformanceTab({
  studentMarksFlattened,
  activeSemester,
  setActiveSemester,
}) {
  const hasMarks = Object.keys(studentMarksFlattened || {}).length > 0;
  const entries = hasMarks
    ? Object.entries(studentMarksFlattened).filter(
        ([, courseData]) => Boolean(courseData?.[activeSemester])
      )
    : [];

  return (
    <div
      style={{
        background: "var(--surface-panel)",
        borderRadius: 12,
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-soft)",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "12px",
          borderBottom: "1px solid var(--border-soft)",
          paddingBottom: "6px",
        }}
      >
        {SEMESTERS.map(({ key, label }) => {
          const isActive = activeSemester === key;
          return (
            <button
              key={key}
              onClick={() => setActiveSemester(key)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "10px",
                fontWeight: 700,
                color: isActive ? "var(--accent-strong)" : "var(--text-muted)",
                padding: "6px 8px",
                borderBottom: isActive ? "2px solid var(--accent-strong)" : "2px solid transparent",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", padding: "10px" }}>
        {!hasMarks ? (
          <div
            style={{
              textAlign: "center",
              padding: 12,
              borderRadius: 12,
              background: "var(--surface-panel)",
              color: "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 600,
              border: "1px solid var(--border-soft)",
              gridColumn: "1 / -1",
            }}
          >
            No performance records
          </div>
        ) : (
          entries.map(([courseKey, studentCourseData], idx) => (
            <CourseCard
              key={`${courseKey}-${idx}`}
              courseKey={courseKey}
              studentCourseData={studentCourseData}
              activeSemester={activeSemester}
            />
          ))
        )}
      </div>
    </div>
  );
}
