import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaChartLine,
  FaChalkboardTeacher,
  FaChevronDown,
  FaCog,
  FaDownload,
  FaFacebookMessenger,
  FaFileAlt,
  FaHome,
  FaPrint,
  FaSearch,
  FaSignOutAlt,
  FaSyncAlt,
} from "react-icons/fa";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { BACKEND_BASE } from "../config";
import { buildSchoolRtdbBase } from "../api/rtdbScope";
import useRegistrarSession from "../hooks/auth/useRegistrarSession";
import useDocumentData from "../hooks/documents/useDocumentData";
import { buildDocumentPdf } from "../utils/documentPdfs";
import DocumentPreview from "../components/dashboard/documents/DocumentPreview";
import RegisterSidebar from "../components/RegisterSidebar";
import ProfileAvatar from "../components/ProfileAvatar";
import { loadSchoolInfoNode, loadSchoolStudentsNode } from "../utils/registerData";
import { fetchCachedJson } from "../utils/rtdbCache";
import { persistResolvedSchoolSession, resolveSchoolScope } from "../utils/schoolScope";

const DOC_TYPES = {
  id_card: "Student ID Card",
  enrollment_letter: "Enrollment Letter",
  transfer_letter: "Transfer Letter",
  profile_report: "Student Profile Report",
  enrollment_certificate: "Certificate of Enrollment",
};

const cardStyle = {
  background: "var(--surface-panel)",
  border: "1px solid var(--border-soft)",
  borderRadius: 14,
  boxShadow: "var(--shadow-panel)",
};

const yearLabel = (key) => String(key || "").replace("_", "/");

const normalizeRows = (node) => {
  if (Array.isArray(node)) return node;
  if (node && typeof node === "object") return Object.values(node);
  return [];
};

const firstFilled = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const txt = String(value).trim();
    if (txt) return txt;
  }
  return "";
};

const getNameInitials = (value) => {
  const parts = String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "GS";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

export default function DocumentGeneration() {
  const navigate = useNavigate();

  // ---------------- SESSION (registrar/finance + admin alias) ----------------
  const { finance, admin: adminBase, schoolCode, DB_ROOT } = useRegistrarSession();
  const admin = { ...adminBase, username: finance.username || "" };

  const initialDbUrl = DB_ROOT || buildSchoolRtdbBase(schoolCode);
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState(schoolCode);
  const [resolvedDbUrl, setResolvedDbUrl] = useState(initialDbUrl);
  const DB_URL = String(resolvedDbUrl || initialDbUrl || "").trim();
  const activeSchoolCode = String(resolvedSchoolCode || schoolCode || "").trim();

  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });


  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [documentType, setDocumentType] = useState("id_card");
  const [transferReason, setTransferReason] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState("");
  const heroStyle = {
    maxWidth: 760,
    margin: "0 auto 12px",
    position: "relative",
    overflow: "hidden",
  };
  const inputShellStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--input-border)",
    borderRadius: 8,
    padding: "8px 10px",
    background: "var(--input-bg)",
  };
  const selectStyle = {
    width: "100%",
    border: "1px solid var(--input-border)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    boxSizing: "border-box",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
  };
  const inputStyle = {
    width: "100%",
    border: "1px solid var(--input-border)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    boxSizing: "border-box",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
  };
  const secondaryButtonStyle = {
    border: "1px solid var(--border-soft)",
    background: "var(--surface-panel)",
    color: "var(--text-secondary)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
  };

  const notify = (type, text) => setFeedback({ type, text });

  useEffect(() => {
    const resolveScope = async () => {
      if (!schoolCode) return;

      try {
        const resolvedScope = await resolveSchoolScope(schoolCode);
        const nextResolvedSchoolCode = String(resolvedScope?.schoolCode || schoolCode || "").trim();
        const nextResolvedDbUrl = String(resolvedScope?.dbUrl || initialDbUrl || "").trim();
        const resolvedSchoolInfo = resolvedScope?.schoolInfo || {};

        setResolvedSchoolCode(nextResolvedSchoolCode);
        setResolvedDbUrl(nextResolvedDbUrl);

        if (nextResolvedSchoolCode && nextResolvedSchoolCode !== schoolCode) {
          persistResolvedSchoolSession(nextResolvedSchoolCode, String(resolvedSchoolInfo?.shortName || "").trim());
        }
      } catch (error) {
        console.error("Failed to resolve document generation school scope:", error);
        setResolvedSchoolCode(String(schoolCode || "").trim());
        setResolvedDbUrl(initialDbUrl);
      }
    };

    resolveScope();
  }, [schoolCode, initialDbUrl]);

  // ---------------- DOCUMENT DATA (school info + students + year history) ----------------
  const {
    loading,
    schoolInfo,
    currentAcademicYear,
    studentsMap,
    yearHistoryMap,
    loadData,
  } = useDocumentData({ DB_URL, activeSchoolCode, notify });

  const mergedStudents = useMemo(() => {
    const map = { ...(studentsMap || {}) };

    Object.values(yearHistoryMap || {}).forEach((yearNode) => {
      const studentsNode = (yearNode || {}).Students || {};
      Object.entries(studentsNode).forEach(([studentId, row]) => {
        if (!map[studentId]) map[studentId] = row || {};
      });
    });

    return map;
  }, [studentsMap, yearHistoryMap]);

  const studentList = useMemo(() => {
    const list = [];
    Object.entries(mergedStudents || {}).forEach(([studentId, row]) => {
      const s = row || {};
      const name =
        s.name ||
        [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ") ||
        s.basicStudentInformation?.name ||
        "Student";

      list.push({
        studentId,
        name,
        grade: firstFilled(s.grade, s.basicStudentInformation?.grade),
        section: String(firstFilled(s.section, s.basicStudentInformation?.section)).toUpperCase(),
        academicYear: firstFilled(s.academicYear, s.basicStudentInformation?.academicYear, currentAcademicYear),
        status: firstFilled(s.status, s.basicStudentInformation?.status, "active"),
        row: s,
      });
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [mergedStudents, currentAcademicYear]);

  const filteredStudents = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return studentList;
    return studentList.filter((s) => {
      return String(s.studentId).toLowerCase().includes(q)
        || String(s.name).toLowerCase().includes(q)
        || String(s.grade).toLowerCase().includes(q)
        || String(s.section).toLowerCase().includes(q);
    });
  }, [studentList, search]);

  const selectedStudent = useMemo(
    () => studentList.find((s) => s.studentId === selectedStudentId) || null,
    [studentList, selectedStudentId]
  );

  const attendanceSummary = useMemo(() => {
    const attendanceRows = normalizeRows(selectedStudent?.row?.attendance);
    if (!attendanceRows.length) return { present: 0, absent: 0, late: 0, total: 0 };

    let present = 0;
    let absent = 0;
    let late = 0;
    attendanceRows.forEach((a) => {
      const st = String(a?.status || a?.attendance_status || "").toLowerCase();
      if (st === "present") present += 1;
      else if (st === "late") late += 1;
      else absent += 1;
    });

    return {
      present,
      absent,
      late,
      total: attendanceRows.length,
    };
  }, [selectedStudent]);

  const academicRecords = useMemo(() => {
    const records = selectedStudent?.row?.records || {};
    return Object.entries(records)
      .map(([year, row]) => ({
        year,
        grade: firstFilled(row?.grade),
        section: firstFilled(row?.section),
        status: firstFilled(row?.status),
      }))
      .sort((a, b) => String(a.year).localeCompare(String(b.year)));
  }, [selectedStudent]);

  const parentInfo = useMemo(() => {
    const list = normalizeRows(selectedStudent?.row?.parentGuardianInformation?.parents);
    if (list.length > 0) return list;

    const fallback = selectedStudent?.row?.parents || {};
    return Object.entries(fallback).map(([parentId, link]) => ({
      parentId,
      relationship: link?.relationship || "Guardian",
      fullName: "",
      phone: "",
      email: "",
    }));
  }, [selectedStudent]);

  const schoolName = firstFilled(schoolInfo?.name, schoolInfo?.schoolName, "Gojo Academy");
  const schoolPhone = firstFilled(schoolInfo?.phone, schoolInfo?.phoneNumber, "");
  const schoolEmail = firstFilled(schoolInfo?.email, "");
  const schoolAddress = firstFilled(schoolInfo?.address, schoolInfo?.city, "");

  const selectedStudentPhotoUrl = useMemo(() => {
    if (!selectedStudent) return "";

    const row = selectedStudent.row || {};

    // Read profileImage directly from the student record — no Users node needed
    const url = firstFilled(
      row.profileImage,
      row.basicStudentInformation?.studentPhoto,
      row.basicStudentInformation?.profileImage
    );

    return url === "/default-profile.png" ? "" : url;
  }, [selectedStudent]);

  const loadImageAsDataUrl = async (url) => {
    if (!url) return "";
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  };

  const buildCertificateNumber = async () => {
    const year = String(new Date().getFullYear());
    const docsRes = await axios.get(`${DB_URL}/GeneratedDocuments.json`).catch(() => ({ data: {} }));
    const docs = docsRes.data || {};

    let maxSeq = 0;
    Object.values(docs).forEach((row) => {
      const cert = String(row?.certificateNumber || "");
      const m = cert.match(/^CERT-(\d{4})-(\d{5})$/);
      if (!m || m[1] !== year) return;
      const seq = Number(m[2]);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    });

    return `CERT-${year}-${String(maxSeq + 1).padStart(5, "0")}`;
  };

  const handleGeneratePreview = async () => {
    if (!selectedStudent) {
      notify("error", "Select a student first.");
      return;
    }

    if (documentType === "transfer_letter" && !transferReason.trim()) {
      notify("warning", "Please add transfer reason for transfer letter.");
      return;
    }

    if (documentType === "enrollment_certificate") {
      const cert = await buildCertificateNumber();
      setCertificateNumber(cert);
    }

    setPreviewReady(true);
    notify("success", `${DOC_TYPES[documentType]} preview generated.`);
  };

  const saveGeneratedMeta = async (fileName) => {
    if (!selectedStudent) return;
    const key = `${Date.now()}_${selectedStudent.studentId}`;
    await axios.patch(`${DB_URL}/GeneratedDocuments/${key}.json`, {
      key,
      schoolCode: activeSchoolCode,
      studentId: selectedStudent.studentId,
      studentName: selectedStudent.name,
      documentType,
      documentName: DOC_TYPES[documentType],
      fileName,
      certificateNumber: certificateNumber || "",
      generatedBy: admin.adminId || admin.username || "registrar",
      generatedAt: new Date().toISOString(),
      academicYear: selectedStudent.academicYear || currentAcademicYear || "",
    }).catch(() => null);
  };

  const exportPdf = async () => {
    if (!selectedStudent) {
      notify("error", "Select a student first.");
      return;
    }
    if (!previewReady) {
      notify("warning", "Generate preview first.");
      return;
    }

    setGenerating(true);
    try {
      const issueDate = new Date().toLocaleDateString();
      const academicYearText = yearLabel(selectedStudent.academicYear || currentAcademicYear);
      const photoDataUrl = await loadImageAsDataUrl(selectedStudentPhotoUrl);
      const studentDob = firstFilled(selectedStudent.row?.dob, selectedStudent.row?.basicStudentInformation?.dob, "N/A");
      const schoolContact = schoolPhone || schoolEmail || "N/A";
      const studentReference = `GOJO/${new Date().getFullYear()}/${String(selectedStudent.studentId || "0000").slice(-4).padStart(4, "0")}`;
      const emergencyName = firstFilled(selectedStudent.row?.healthEmergency?.emergencyContactName, parentInfo?.[0]?.fullName, parentInfo?.[0]?.name, "N/A");
      const emergencyPhone = firstFilled(selectedStudent.row?.healthEmergency?.emergencyPhone, parentInfo?.[0]?.phone, "N/A");
      const bloodType = firstFilled(selectedStudent.row?.healthEmergency?.bloodType, "N/A");
      const addressText = firstFilled(
        selectedStudent.row?.addressInformation?.city,
        selectedStudent.row?.addressInformation?.region,
        schoolAddress,
        "N/A"
      );
      const issue = new Date();
      const validUntil = `${issue.getFullYear() + 1}-${String(issue.getMonth() + 1).padStart(2, "0")}-${String(issue.getDate()).padStart(2, "0")}`;
      const parents = parentInfo.length ? parentInfo : [{}];
      const records = academicRecords.length
        ? academicRecords
        : [{ year: selectedStudent.academicYear || currentAcademicYear, grade: selectedStudent.grade, section: selectedStudent.section, status: selectedStudent.status }];
      const certNo = documentType === "enrollment_certificate"
        ? (certificateNumber || await buildCertificateNumber())
        : "";

      if (documentType === "enrollment_certificate" && !certificateNumber) {
        setCertificateNumber(certNo);
      }

      const { doc, fileName } = buildDocumentPdf(documentType, {
        selectedStudent,
        schoolName,
        schoolAddress,
        schoolPhone,
        schoolEmail,
        adminName: admin.name,
        issueDate,
        validUntil,
        academicYearText,
        studentReference,
        studentDob,
        schoolContact,
        emergencyName,
        emergencyPhone,
        bloodType,
        addressText,
        photoDataUrl,
        parents,
        records,
        parentInfo,
        academicRecords,
        attendanceSummary,
        transferReason,
        certNo,
      });

      doc.save(fileName);
      await saveGeneratedMeta(fileName);
      notify("success", `${DOC_TYPES[documentType]} exported as PDF.`);
    } catch (err) {
      notify("error", err?.message || "Failed to export PDF.");
    } finally {
      setGenerating(false);
    }
  };

  const printPreview = () => {
    const section = document.getElementById("doc-preview-area");
    if (!section) {
      notify("warning", "Generate preview first.");
      return;
    }

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>${DOC_TYPES[documentType]}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            .box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; }
            h2,h3,p { margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-size: 12px; }
          </style>
        </head>
        <body>${section.innerHTML}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };


  return (
    <div className="dashboard-page" style={{ background: "var(--page-bg)", minHeight: "100vh" }}>
      <nav className="top-navbar" style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--surface-panel)" }}>
        <h2 style={{ color: "var(--text-primary)", fontWeight: 800, letterSpacing: "0.2px" }}>Gojo Register Portal</h2>
        <div className="nav-right">
          <Link className="icon-circle" to="/dashboard"><FaBell /></Link>
          <Link className="icon-circle" to="/all-chat"><FaFacebookMessenger /></Link>
          <ProfileAvatar imageUrl={admin.profileImage} name={admin.name} size={38} className="profile-img" />
        </div>
      </nav>

      <div className="google-dashboard" style={{ display: "flex", gap: 14, padding: "12px" }}>
        <RegisterSidebar user={admin} sticky fullHeight />

        <div className="main-content google-main" style={{ padding: "10px 20px 20px", flex: 1, minWidth: 0, boxSizing: "border-box" }}>
          <div className="section-header-card" style={heroStyle}>
            <div className="section-header-card__title" style={{ fontSize: 17 }}>Document Generation System</div>
            <div className="section-header-card__subtitle">Generate official school documents in one click: preview, export PDF, print.</div>
          </div>

          <div style={{ maxWidth: 980, margin: "0 auto", ...cardStyle, padding: 16 }}>
            {feedback.text ? (
              <div style={{ marginBottom: 12, color: feedback.type === "error" ? "#b91c1c" : feedback.type === "warning" ? "#92400e" : "#166534", background: feedback.type === "error" ? "#fff1f2" : feedback.type === "warning" ? "#fffbeb" : "#ecfdf3", border: `1px solid ${feedback.type === "error" ? "#fecdd3" : feedback.type === "warning" ? "#fde68a" : "#86efac"}`, borderRadius: 10, padding: "8px 10px", fontSize: 12, fontWeight: 700 }}>
                {feedback.text}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Search Student</label>
                  <div style={inputShellStyle}>
                    <FaSearch style={{ color: "var(--text-muted)" }} />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, grade, section" style={{ border: "none", outline: "none", width: "100%", fontSize: 13 }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Select Student</label>
                  <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} style={selectStyle}>
                    <option value="">Choose student</option>
                    {filteredStudents.map((s) => (
                      <option key={s.studentId} value={s.studentId}>
                        {s.name} ({s.studentId}) - G{s.grade}{s.section ? ` ${s.section}` : ""}
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                    Showing {filteredStudents.length} of {studentList.length}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Document Type</label>
                  <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} style={selectStyle}>
                    {Object.entries(DOC_TYPES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {documentType === "transfer_letter" ? (
                  <div>
                    <label style={{ display: "block", marginBottom: 4, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Transfer Reason</label>
                    <input value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="Reason for transfer" style={inputStyle} />
                  </div>
                ) : <div />}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={handleGeneratePreview} disabled={loading || !selectedStudentId} style={{ border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: loading || !selectedStudentId ? "not-allowed" : "pointer", opacity: loading || !selectedStudentId ? 0.65 : 1 }}>
                  Generate
                </button>
                <button onClick={exportPdf} disabled={generating || !previewReady || !selectedStudentId} style={{ border: "1px solid #0f766e", background: "#0f766e", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: generating || !previewReady || !selectedStudentId ? "not-allowed" : "pointer", opacity: generating || !previewReady || !selectedStudentId ? 0.65 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <FaDownload /> {generating ? "Exporting..." : "Download PDF"}
                </button>
                <button onClick={printPreview} disabled={!previewReady || !selectedStudentId} style={{ ...secondaryButtonStyle, cursor: !previewReady || !selectedStudentId ? "not-allowed" : "pointer", opacity: !previewReady || !selectedStudentId ? 0.65 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <FaPrint /> Print
                </button>
              </div>

              <div id="doc-preview-area" style={{ marginTop: 6, border: "1px solid var(--border-soft)", borderRadius: 12, padding: 14, background: "var(--surface-muted)", minHeight: 180 }}>
                {previewReady && selectedStudent ? (
                  <DocumentPreview
                    selectedStudent={selectedStudent}
                    selectedStudentPhotoUrl={selectedStudentPhotoUrl}
                    documentType={documentType}
                    transferReason={transferReason}
                    certificateNumber={certificateNumber}
                    currentAcademicYear={currentAcademicYear}
                    schoolName={schoolName}
                    schoolAddress={schoolAddress}
                    schoolPhone={schoolPhone}
                    schoolEmail={schoolEmail}
                    parentInfo={parentInfo}
                    academicRecords={academicRecords}
                    attendanceSummary={attendanceSummary}
                    adminName={admin.name}
                  />
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Preview area. Select student and click Generate.</div>
                )}
              </div>

              <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                School: {schoolName} {schoolAddress ? `| ${schoolAddress}` : ""} {schoolPhone ? `| ${schoolPhone}` : ""} {schoolEmail ? `| ${schoolEmail}` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
