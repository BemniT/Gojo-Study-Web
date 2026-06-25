import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBell,
  FaChevronDown,
  FaExchangeAlt,
  FaFacebookMessenger,
  FaFileAlt,
  FaHome,
  FaSearch,
  FaSyncAlt,
  FaUserTimes,
  FaUsers,
} from "react-icons/fa";
import { buildSchoolRtdbBase } from "../api/rtdbScope";
import RegisterSidebar from "../components/RegisterSidebar";
import ProfileAvatar from "../components/ProfileAvatar";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import useTransferWithdrawal from "../hooks/students/useTransferWithdrawal";
import ConfirmStatusModal from "../components/dashboard/students/ConfirmStatusModal";

const PAGE_BG = "linear-gradient(180deg, var(--page-bg) 0%, var(--page-bg-secondary) 100%)";

const cardStyle = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  boxShadow: "var(--shadow-panel)",
};

const summaryCardStyle = {
  border: "1px solid var(--border-soft)",
  borderRadius: 10,
  padding: 10,
  background: "var(--surface-muted)",
};

const fieldLabelStyle = {
  display: "block",
  marginBottom: 4,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-secondary)",
};

const searchBarShellStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)",
  boxShadow: "var(--shadow-soft)",
  boxSizing: "border-box",
};

const searchBarInputStyle = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 13,
  fontWeight: 600,
};

const selectShellStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)",
  boxShadow: "var(--shadow-soft)",
  boxSizing: "border-box",
};

const selectInputStyle = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 13,
  fontWeight: 700,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
};

const selectChevronStyle = {
  width: 30,
  height: 30,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  color: "var(--accent-strong)",
  flexShrink: 0,
  pointerEvents: "none",
};

const textFieldShellStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)",
  boxShadow: "var(--shadow-soft)",
  boxSizing: "border-box",
};

const textFieldInputStyle = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 13,
  fontWeight: 600,
};

const textAreaShellStyle = {
  display: "grid",
  gridTemplateColumns: "32px minmax(0, 1fr)",
  alignItems: "start",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-muted) 100%)",
  boxShadow: "var(--shadow-soft)",
  boxSizing: "border-box",
};

const textAreaInputStyle = {
  width: "100%",
  minHeight: 78,
  border: "none",
  outline: "none",
  resize: "vertical",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 13,
  fontWeight: 600,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const fieldIconBoxStyle = {
  width: 32,
  height: 32,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--surface-accent)",
  color: "var(--accent-strong)",
  flexShrink: 0,
};

const selectedCardStyle = {
  marginTop: 12,
  border: "1px solid var(--border-soft)",
  borderRadius: 14,
  padding: 14,
  background: "linear-gradient(135deg, var(--surface-accent) 0%, var(--surface-muted) 100%)",
  boxShadow: "var(--shadow-soft)",
};

const searchResultsPanelStyle = {
  marginTop: 8,
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  background: "var(--surface-panel)",
  boxShadow: "var(--shadow-soft)",
  overflow: "hidden",
};

const searchResultButtonStyle = (isActive) => ({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 12px",
  background: isActive ? "var(--surface-accent)" : "transparent",
  border: "none",
  borderBottom: "1px solid var(--border-soft)",
  cursor: "pointer",
  textAlign: "left",
});

const heroActionStyle = {
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.15)",
  color: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
};

const dangerButtonStyle = {
  border: "1px solid var(--danger)",
  background: "var(--danger)",
  color: "#fff",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 800,
};

const yearLabel = (key) => String(key || "").replace("_", "/");

export default function TransferWithdrawal() {
  const { admin, schoolCode } = useRegistrarSession();
  const initialDbUrl = buildSchoolRtdbBase(schoolCode);

  const {
    loading,
    working,
    feedback,
    notify,
    academicYears,
    currentAcademicYear,
    activeStudents,
    loadBaseData,
    runStatusChange,
  } = useTransferWithdrawal({ schoolCode, DB_URL: initialDbUrl, admin });

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [actionType, setActionType] = useState("transfer_out");
  const [note, setNote] = useState("");
  const [destinationSchool, setDestinationSchool] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [registererPassword, setRegistererPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const selectedStudent = useMemo(
    () => activeStudents.find((s) => s.studentId === selectedStudentId) || null,
    [activeStudents, selectedStudentId]
  );

  const filteredActiveStudents = useMemo(() => {
    const q = String(studentSearch || "").trim().toLowerCase();
    if (!q) return activeStudents;
    return activeStudents.filter((student) => {
      const id = String(student.studentId || "").toLowerCase();
      const name = String(student.name || "").toLowerCase();
      const grade = String(student.grade || "").toLowerCase();
      const section = String(student.section || "").toLowerCase();
      return id.includes(q) || name.includes(q) || grade.includes(q) || section.includes(q);
    });
  }, [activeStudents, studentSearch]);

  const actionLabel = useMemo(() => {
    if (actionType === "withdraw") return "Withdraw";
    if (actionType === "graduate") return "Graduate";
    return "Transfer Out";
  }, [actionType]);

  const feedbackStyles = useMemo(() => {
    if (feedback.type === "error") {
      return { color: "var(--danger)", background: "var(--danger-soft)", border: "1px solid var(--danger-border)" };
    }
    if (feedback.type === "warning") {
      return { color: "var(--warning)", background: "var(--warning-soft)", border: "1px solid var(--warning-border)" };
    }
    return { color: "var(--success)", background: "var(--success-soft)", border: "1px solid var(--success-border)" };
  }, [feedback.type]);

  const openConfirmModal = () => {
    if (!selectedStudent) {
      notify("error", "Select a student first.");
      return;
    }
    if (!currentAcademicYear) {
      notify("error", "Current academic year is missing.");
      return;
    }
    setRegistererPassword("");
    setPasswordError("");
    setShowConfirmModal(true);
  };

  const handleSelectStudentChoice = (studentId) => {
    setSelectedStudentId(studentId);
    setStudentSearch("");
  };

  const handleConfirm = async () => {
    const result = await runStatusChange({
      selectedStudent,
      actionType,
      note,
      destinationSchool,
      registererPassword,
    });
    if (result.passwordError) {
      setPasswordError(result.passwordError);
      return;
    }
    if (result.ok) {
      setShowConfirmModal(false);
      setSelectedStudentId("");
      setStudentSearch("");
      setNote("");
      setDestinationSchool("");
      setPasswordError("");
    }
  };

  return (
    <div className="dashboard-page" style={{ background: PAGE_BG, height: "100vh", overflow: "hidden" }}>
      <nav className="top-navbar" style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface-overlay)", boxShadow: "var(--shadow-soft)", backdropFilter: "blur(10px)" }}>
        <h2 style={{ color: "var(--text-primary)", fontWeight: 800, letterSpacing: "0.2px" }}>Gojo Register Portal</h2>
        <div className="nav-right">
          <Link className="icon-circle" to="/dashboard"><FaBell /></Link>
          <Link className="icon-circle" to="/all-chat"><FaFacebookMessenger /></Link>
          <ProfileAvatar imageUrl={admin.profileImage} name={admin.name} size={38} className="profile-img" />
        </div>
      </nav>

      <div className="google-dashboard" style={{ display: "flex", gap: 14, padding: "12px", height: "calc(100vh - 73px)", overflow: "hidden" }}>
        <RegisterSidebar user={admin} sticky fullHeight />

        <div className="main-content google-main" style={{ padding: "10px 20px 20px", flex: 1, minWidth: 0, boxSizing: "border-box", height: "100%", overflowY: "auto", overflowX: "hidden" }}>
          <div className="section-header-card" style={{ width: "100%", margin: "0 0 12px" }}>
            <div className="section-header-card__row">
              <div>
                <div className="section-header-card__title" style={{ fontSize: 17 }}>Transfer & Withdrawal</div>
                <div className="section-header-card__subtitle">Update student exit status and archive records to YearHistory.</div>
              </div>
              <button type="button" onClick={loadBaseData} disabled={loading || working} style={{ ...heroActionStyle, cursor: loading || working ? "not-allowed" : "pointer", opacity: loading || working ? 0.65 : 1 }}>
                <FaSyncAlt /> Refresh
              </button>
            </div>
          </div>

          <div style={{ width: "100%", ...cardStyle, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 12 }}>
              {[{
                title: "Active Students",
                value: activeStudents.length,
                hint: "Eligible for status change",
              }, {
                title: "Current Year",
                value: currentAcademicYear ? yearLabel(currentAcademicYear) : "-",
                hint: "Archive destination",
              }, {
                title: "Academic Years",
                value: Object.keys(academicYears || {}).length,
                hint: "Configured years",
              }].map((item) => (
                <div key={item.title} style={summaryCardStyle}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{item.title}</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>{item.value}</div>
                  <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)" }}>{item.hint}</div>
                </div>
              ))}
            </div>

            {feedback.text ? (
              <div style={{ marginBottom: 12, ...feedbackStyles, borderRadius: 10, padding: "8px 10px", fontSize: 12, fontWeight: 700 }}>
                {feedback.text}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: "var(--text-primary)", fontWeight: 800 }}>Transfer Out / Withdraw / Graduate</h3>
              </div>

              <div style={{ display: "grid", gap: 9 }}>
                <div>
                  <label style={fieldLabelStyle}>Search Active Student</label>
                  <div style={searchBarShellStyle}>
                    <div style={fieldIconBoxStyle}>
                      <FaSearch size={13} />
                    </div>
                    <input
                      style={searchBarInputStyle}
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search by name, student ID, grade, or section"
                    />
                    <div style={{ flexShrink: 0, padding: "5px 9px", borderRadius: 999, background: "var(--surface-panel)", border: "1px solid var(--border-soft)", color: "var(--text-muted)", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {filteredActiveStudents.length} match{filteredActiveStudents.length === 1 ? "" : "es"}
                    </div>
                  </div>
                  {studentSearch.trim() ? (
                    <div style={searchResultsPanelStyle}>
                      {filteredActiveStudents.length > 0 ? (
                        filteredActiveStudents.slice(0, 8).map((student, index, visibleStudents) => (
                          <button
                            key={student.studentId}
                            type="button"
                            onClick={() => handleSelectStudentChoice(student.studentId)}
                            style={{
                              ...searchResultButtonStyle(selectedStudentId === student.studentId),
                              borderBottom: index === visibleStudents.length - 1 ? "none" : "1px solid var(--border-soft)",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {student.name}
                              </div>
                              <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)" }}>
                                {student.studentId} • Grade {student.grade || "-"}{student.section ? ` • ${student.section}` : ""}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: selectedStudentId === student.studentId ? "var(--accent-strong)" : "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                              {selectedStudentId === student.studentId ? "Selected" : "Choose"}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div style={{ padding: "12px", fontSize: 12, color: "var(--text-muted)" }}>
                          No active student matches this search.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label style={fieldLabelStyle}>Select Active Student</label>
                  <div style={selectShellStyle}>
                    <div style={fieldIconBoxStyle}>
                      <FaUsers size={13} />
                    </div>
                    <select style={selectInputStyle} value={selectedStudentId} onChange={(e) => handleSelectStudentChoice(e.target.value)}>
                      <option value="">Choose student</option>
                      {filteredActiveStudents.map((student) => (
                        <option key={student.studentId} value={student.studentId}>
                          {student.name} ({student.studentId}) - G{student.grade}{student.section ? ` ${student.section}` : ""}
                        </option>
                      ))}
                    </select>
                    <div style={selectChevronStyle}>
                      <FaChevronDown size={11} />
                    </div>
                    <div style={{ flexShrink: 0, padding: "5px 9px", borderRadius: 999, background: selectedStudentId ? "var(--surface-accent)" : "var(--surface-panel)", border: "1px solid var(--border-soft)", color: selectedStudentId ? "var(--accent-strong)" : "var(--text-muted)", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {selectedStudentId ? "Selected" : "Choose"}
                    </div>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                    Showing {filteredActiveStudents.length} of {activeStudents.length} active students
                  </div>
                </div>

                <div>
                  <label style={fieldLabelStyle}>Action</label>
                  <div style={selectShellStyle}>
                    <div style={fieldIconBoxStyle}>
                      <FaExchangeAlt size={13} />
                    </div>
                    <select style={selectInputStyle} value={actionType} onChange={(e) => setActionType(e.target.value)}>
                      <option value="transfer_out">Transfer Out</option>
                      <option value="withdraw">Dropout / Withdraw</option>
                      <option value="graduate">Graduate</option>
                    </select>
                    <div style={selectChevronStyle}>
                      <FaChevronDown size={11} />
                    </div>
                    <div style={{ flexShrink: 0, padding: "5px 9px", borderRadius: 999, background: "var(--surface-panel)", border: "1px solid var(--border-soft)", color: "var(--text-muted)", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {actionLabel}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={fieldLabelStyle}>Destination School (for transfer)</label>
                  <div style={textFieldShellStyle}>
                    <div style={fieldIconBoxStyle}>
                      <FaHome size={13} />
                    </div>
                    <input
                      style={textFieldInputStyle}
                      value={destinationSchool}
                      onChange={(e) => setDestinationSchool(e.target.value)}
                      placeholder="Optional"
                    />
                    <div style={{ flexShrink: 0, padding: "5px 9px", borderRadius: 999, background: destinationSchool.trim() ? "var(--surface-accent)" : "var(--surface-panel)", border: "1px solid var(--border-soft)", color: destinationSchool.trim() ? "var(--accent-strong)" : "var(--text-muted)", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {destinationSchool.trim() ? "Set" : "Optional"}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={fieldLabelStyle}>Reason / Note</label>
                  <div style={textAreaShellStyle}>
                    <div style={fieldIconBoxStyle}>
                      <FaFileAlt size={13} />
                    </div>
                    <textarea
                      rows={3}
                      style={textAreaInputStyle}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Reason, reference, or registrar note"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <button onClick={openConfirmModal} disabled={working || !selectedStudentId || loading} style={{ ...dangerButtonStyle, cursor: working || !selectedStudentId || loading ? "not-allowed" : "pointer", opacity: working || !selectedStudentId || loading ? 0.65 : 1, display: "inline-flex", alignItems: "center", gap: 8, minWidth: 190, justifyContent: "center", boxShadow: "0 12px 26px rgba(185, 28, 28, 0.18)" }}>
                    <FaUserTimes /> Save Status Change
                  </button>
                </div>
              </div>
            </div>

            {selectedStudent ? (
              <div style={selectedCardStyle}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--accent-strong)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Selected Student</div>
                <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{selectedStudent.name}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {selectedStudent.studentId} • Grade {selectedStudent.grade || "-"}{selectedStudent.section ? ` • ${selectedStudent.section}` : ""}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmStatusModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        working={working}
        selectedStudent={selectedStudent}
        actionLabel={actionLabel}
        currentAcademicYear={currentAcademicYear}
        registererPassword={registererPassword}
        setRegistererPassword={setRegistererPassword}
        passwordError={passwordError}
        setPasswordError={setPasswordError}
      />
    </div>
  );
}
