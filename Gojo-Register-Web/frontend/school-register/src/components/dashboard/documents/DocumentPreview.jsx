import React from "react";

const yearLabel = (key) => String(key || "").replace("_", "/");

const firstFilled = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const txt = String(value).trim();
    if (txt) return txt;
  }
  return "";
};

const getNameInitials = (value) => {
  const parts = String(value || "").split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "GS";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
};

export default function DocumentPreview({
  selectedStudent,
  selectedStudentPhotoUrl,
  documentType,
  transferReason,
  certificateNumber,
  currentAcademicYear,
  schoolName,
  schoolAddress,
  schoolPhone,
  schoolEmail,
  parentInfo,
  academicRecords,
  attendanceSummary,
  adminName,
}) {
    if (!selectedStudent) return null;

    const academicYearText = yearLabel(selectedStudent.academicYear || currentAcademicYear);
    const issueDateText = new Date().toLocaleDateString();
    const issue = new Date();
    const validUntil = `${issue.getFullYear() + 1}-${String(issue.getMonth() + 1).padStart(2, "0")}-${String(issue.getDate()).padStart(2, "0")}`;
    const studentDob = firstFilled(selectedStudent.row?.dob, selectedStudent.row?.basicStudentInformation?.dob, "N/A");
    const emergencyName = firstFilled(selectedStudent.row?.healthEmergency?.emergencyContactName, parentInfo?.[0]?.fullName, parentInfo?.[0]?.name, "N/A");
    const emergencyPhone = firstFilled(selectedStudent.row?.healthEmergency?.emergencyPhone, parentInfo?.[0]?.phone, "N/A");
    const bloodType = firstFilled(selectedStudent.row?.healthEmergency?.bloodType, "N/A");
    const addressText = firstFilled(
      selectedStudent.row?.addressInformation?.city,
      selectedStudent.row?.addressInformation?.region,
      schoolAddress,
      "N/A"
    );
    const studentReference = `GOJO/${new Date().getFullYear()}/${String(selectedStudent.studentId || "0000").slice(-4).padStart(4, "0")}`;
    const previewPaperStyle = {
      background: "#ffffff",
      border: "1px solid #cbd5e1",
      borderRadius: 10,
      padding: 32,
      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
      color: "#0f172a",
    };
    const previewHeadingStyle = {
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#0f172a",
      marginBottom: 10,
    };
    const tableHeaderCellStyle = {
      border: "1px solid #d7e7fb",
      padding: "8px 10px",
      textAlign: "left",
      fontSize: 11,
      fontWeight: 800,
      color: "#0f172a",
      background: "#F1F8FF",
    };
    const tableCellStyle = {
      border: "1px solid #d7e7fb",
      padding: "8px 10px",
      textAlign: "left",
      fontSize: 11,
      color: "#334155",
      verticalAlign: "top",
    };
    const summaryCardStyle = {
      border: "1px solid #cbd5e1",
      borderRadius: 6,
      padding: "12px 14px",
      background: "#ffffff",
    };
    const letterHeaderStyle = {
      display: "flex",
      justifyContent: "space-between",
      gap: 18,
      flexWrap: "wrap",
      paddingBottom: 14,
      borderBottom: "2px solid #0f172a",
      marginBottom: 18,
    };
    const letterMetaStyle = {
      minWidth: 240,
      fontSize: 12,
      color: "#475569",
      lineHeight: 1.7,
      textAlign: "right",
    };
    const letterInfoRowStyle = {
      display: "grid",
      gridTemplateColumns: "180px 1fr",
      borderBottom: "1px solid #e2e8f0",
    };
    const letterLabelStyle = {
      padding: "10px 12px",
      fontSize: 12,
      fontWeight: 800,
      color: "#475569",
      background: "#f8fafc",
    };
    const letterValueStyle = {
      padding: "10px 12px",
      fontSize: 12,
      color: "#0f172a",
    };

    if (documentType === "id_card") {
      const previewCardWidth = 400;
      const previewCardHeight = Math.round((previewCardWidth * 53.98) / 85.6);

      return (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={{ width: previewCardWidth, height: previewCardHeight, borderRadius: 16, overflow: "hidden", background: "#ffffff", border: "1px solid #0f172a", boxShadow: "0 10px 16px rgba(15, 23, 42, 0.08)", position: "relative" }}>
            <div style={{ position: "absolute", inset: "0 0 auto 0", height: 34, background: "#0f172a" }} />

            <div style={{ position: "relative", height: "100%", padding: 14, display: "grid", gridTemplateColumns: "68px 1fr", gap: 12 }}>
              <div style={{ marginTop: 30, width: 68, height: 84, borderRadius: 8, overflow: "hidden", border: "1px solid #cbd5e1", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 16, fontWeight: 800 }}>
                {selectedStudentPhotoUrl ? (
                  <img src={selectedStudentPhotoUrl} alt={`${selectedStudent.name} profile`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : getNameInitials(selectedStudent.name)}
              </div>

              <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 7.8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffffff" }}>Gojo Education Authority</div>
                    <div style={{ marginTop: 2, fontSize: 8.4, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffffff" }}>Student Identity Card</div>
                    <div style={{ marginTop: 12, fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{schoolName}</div>
                  </div>
                  <div style={{ padding: "4px 8px", borderRadius: 8, background: "#f8fafc", border: "1px solid #cbd5e1", color: "#334155", fontSize: 8.2, fontWeight: 800 }}>
                    {studentReference}
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Name</div>
                    <div style={{ fontSize: 13.5, color: "#0f172a", fontWeight: 800, lineHeight: 1.2 }}>{selectedStudent.name}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>ID No.</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 800 }}>{selectedStudent.studentId}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Grade</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 800 }}>{selectedStudent.grade}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Section</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 800 }}>{selectedStudent.section || "-"}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Year</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 800 }}>{academicYearText}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 8, alignItems: "baseline" }}>
                    <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Valid</div>
                    <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 800 }}>{validUntil}</div>
                  </div>
                </div>

                <div style={{ marginTop: "auto", borderTop: "1px solid #e2e8f0", paddingTop: 7, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 8.3, color: "#64748b", lineHeight: 1.55 }}>
                    Issued: {issueDateText}
                    <br />
                    Contact: {schoolPhone || schoolEmail || "N/A"}
                  </div>
                  <div style={{ fontSize: 8.3, color: "#334155", fontWeight: 800, textTransform: "uppercase" }}>
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ width: previewCardWidth, height: previewCardHeight, borderRadius: 16, overflow: "hidden", background: "#ffffff", border: "1px solid #0f172a", boxShadow: "0 10px 16px rgba(15, 23, 42, 0.08)", position: "relative" }}>
            <div style={{ position: "absolute", inset: "0 0 auto 0", height: 34, background: "#0f172a" }} />

            <div style={{ position: "relative", height: "100%", padding: 16, display: "flex", flexDirection: "column" }}>
              <div style={{ marginTop: 8, fontSize: 7.8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffffff" }}>Gojo Education Authority</div>
              <div style={{ marginTop: 2, fontSize: 8.4, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffffff" }}>Holder Information</div>
              <div style={{ marginTop: 12, fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em" }}>{schoolName}</div>

              <div style={{ marginTop: 12, display: "grid", gap: 7 }}>
                <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Emergency</div>
                  <div style={{ fontSize: 12.8, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>{emergencyName}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Phone</div>
                  <div style={{ fontSize: 12.8, fontWeight: 800, color: "#0f172a" }}>{emergencyPhone}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Blood Type</div>
                  <div style={{ fontSize: 12.8, fontWeight: 800, color: "#0f172a" }}>{bloodType}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 8, alignItems: "baseline", paddingBottom: 5, borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 8, color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Address</div>
                  <div style={{ fontSize: 11.8, fontWeight: 700, color: "#0f172a", lineHeight: 1.35 }}>{addressText}</div>
                </div>
              </div>

              <div style={{ marginTop: 10, borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
                <div style={{ fontSize: 8, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>Return Notice</div>
                <div style={{ marginTop: 5, fontSize: 10.2, color: "#475569", lineHeight: 1.55 }}>
                  If found, please return this card to the school administration office. This card remains the property of {schoolName}.
                </div>
              </div>

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
                <div style={{ fontSize: 8.3, color: "#64748b", lineHeight: 1.55 }}>
                  {schoolPhone || schoolEmail || "Contact not provided"}
                  <br />
                  Ref {studentReference}
                </div>
                <div style={{ width: 88, borderTop: "1px solid #94a3b8", paddingTop: 4, fontSize: 8.5, color: "#64748b" }}>
                  School stamp
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (documentType === "enrollment_letter") {
      return (
        <div style={{ ...previewPaperStyle, maxWidth: 840, margin: "0 auto" }}>
          <div style={letterHeaderStyle}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>{schoolName}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
                {[schoolAddress, schoolPhone, schoolEmail].filter(Boolean).join(" | ") || "School contact information"}
              </div>
              <div style={{ marginTop: 18, fontSize: 18, fontWeight: 800, letterSpacing: "0.06em", color: "#0f172a" }}>ENROLLMENT LETTER</div>
            </div>
            <div style={letterMetaStyle}>
              <div>Date: {issueDateText}</div>
              <div>Reference: {studentReference}</div>
              <div>Prepared by: {adminName}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Subject: Confirmation of enrollment for {selectedStudent.name}</div>
            <div>To whom it may concern,</div>
            <div style={{ marginTop: 14 }}>
              This is to formally certify that <strong style={{ color: "#0f172a" }}>{selectedStudent.name}</strong>, identified by student ID <strong style={{ color: "#0f172a" }}>{selectedStudent.studentId}</strong>, is a currently enrolled student of <strong style={{ color: "#0f172a" }}>{schoolName}</strong>. According to the official register office record, the student is assigned to <strong style={{ color: "#0f172a" }}>Grade {selectedStudent.grade}{selectedStudent.section ? ` ${selectedStudent.section}` : ""}</strong> for the <strong style={{ color: "#0f172a" }}>{academicYearText}</strong> academic year.
            </div>
          </div>

          <div style={{ marginTop: 22, border: "1px solid #cbd5e1" }}>
            {[
              ["Student Name", selectedStudent.name],
              ["Student ID", selectedStudent.studentId],
              ["Grade and Section", `Grade ${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ""}`],
              ["Academic Year", academicYearText],
              ["Status", selectedStudent.status],
            ].map(([label, value]) => (
              <div key={label} style={letterInfoRowStyle}>
                <div style={letterLabelStyle}>{label}</div>
                <div style={letterValueStyle}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
            This letter is issued upon request for official educational and administrative use. All information herein is based on the current school register and is valid as of the date of issue.
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 42, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
              Issued by the school register office.
            </div>
            <div style={{ width: 220, borderTop: "1px solid #94a3b8", paddingTop: 8, fontSize: 12, color: "#334155" }}>
              Registrar: {adminName}
            </div>
          </div>
        </div>
      );
    }

    if (documentType === "transfer_letter") {
      const transferRecords = academicRecords.length
        ? academicRecords
        : [{ year: selectedStudent.academicYear || currentAcademicYear, grade: selectedStudent.grade, section: selectedStudent.section, status: selectedStudent.status }];

      return (
        <div style={{ ...previewPaperStyle, maxWidth: 860, margin: "0 auto" }}>
          <div style={letterHeaderStyle}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>{schoolName}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
                {[schoolAddress, schoolPhone, schoolEmail].filter(Boolean).join(" | ") || "School contact information"}
              </div>
              <div style={{ marginTop: 18, fontSize: 18, fontWeight: 800, letterSpacing: "0.06em", color: "#0f172a" }}>TRANSFER LETTER</div>
            </div>
            <div style={letterMetaStyle}>
              <div>Date: {issueDateText}</div>
              <div>Reference: {studentReference}</div>
              <div>Prepared by: {adminName}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Subject: Transfer clearance for {selectedStudent.name}</div>
            <div>To whom it may concern,</div>
            <div style={{ marginTop: 14 }}>
              This letter confirms that <strong style={{ color: "#0f172a" }}>{selectedStudent.name}</strong>, student ID <strong style={{ color: "#0f172a" }}>{selectedStudent.studentId}</strong>, has been processed for transfer from <strong style={{ color: "#0f172a" }}>{schoolName}</strong>. The following information summarizes the student's registered academic status and the stated reason for transfer.
            </div>
          </div>

          <div style={{ marginTop: 22, border: "1px solid #cbd5e1" }}>
            {[
              ["Student Name", selectedStudent.name],
              ["Student ID", selectedStudent.studentId],
              ["Date of Birth", studentDob],
              ["Grade and Section", `Grade ${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ""}`],
              ["Academic Year", academicYearText],
            ].map(([label, value]) => (
              <div key={label} style={letterInfoRowStyle}>
                <div style={letterLabelStyle}>{label}</div>
                <div style={letterValueStyle}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={previewHeadingStyle}>Transfer Reason</div>
            <div style={{ border: "1px solid #cbd5e1", padding: "14px 16px", fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
              {transferReason || "No transfer reason recorded."}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={previewHeadingStyle}>Academic History</div>
            <table style={{ width: "100%", borderCollapse: "collapse", overflow: "hidden", borderRadius: 16 }}>
              <thead>
                <tr>
                  <th style={tableHeaderCellStyle}>Academic Year</th>
                  <th style={tableHeaderCellStyle}>Grade</th>
                  <th style={tableHeaderCellStyle}>Section</th>
                  <th style={tableHeaderCellStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transferRecords.map((r) => (
                  <tr key={`${r.year}_${r.grade}_${r.section}`}>
                    <td style={tableCellStyle}>{yearLabel(r.year)}</td>
                    <td style={tableCellStyle}>{r.grade || "-"}</td>
                    <td style={tableCellStyle}>{r.section || "-"}</td>
                    <td style={tableCellStyle}>{r.status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, maxWidth: 460 }}>
              This transfer letter is prepared from the official academic and administrative records maintained by {schoolName} and is issued for formal reference purposes.
            </div>
            <div style={{ width: 220, borderTop: "1px solid #94a3b8", paddingTop: 8, fontSize: 12, color: "#334155" }}>
              Registrar authorization
            </div>
          </div>
        </div>
      );
    }

    if (documentType === "profile_report") {
      const parents = parentInfo.length ? parentInfo : [{}];
      const records = academicRecords.length ? academicRecords : [{ year: selectedStudent.academicYear || currentAcademicYear, grade: selectedStudent.grade, section: selectedStudent.section, status: selectedStudent.status }];

      return (
        <div style={{ ...previewPaperStyle, maxWidth: 920, margin: "0 auto" }}>
          <div style={letterHeaderStyle}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>{schoolName}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6, maxWidth: 460, lineHeight: 1.6 }}>
                {[schoolAddress, schoolPhone, schoolEmail].filter(Boolean).join(" | ") || "School contact information"}
              </div>
              <div style={{ marginTop: 18, fontSize: 18, fontWeight: 800, letterSpacing: "0.06em", color: "#0f172a" }}>STUDENT PROFILE REPORT</div>
            </div>
            <div style={letterMetaStyle}>
              <div>Date: {issueDateText}</div>
              <div>Reference: {studentReference}</div>
              <div>Prepared by: {adminName}</div>
            </div>
          </div>

          <div style={{ border: "1px solid #cbd5e1" }}>
            {[
              ["Student Name", selectedStudent.name],
              ["Student ID", selectedStudent.studentId],
              ["Grade and Section", `Grade ${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ""}`],
              ["Academic Year", academicYearText],
              ["Date of Birth", studentDob],
              ["Status", selectedStudent.status],
              ["Address", addressText],
              ["Emergency Contact", `${emergencyName} (${emergencyPhone})`],
            ].map(([label, value]) => (
              <div key={label} style={letterInfoRowStyle}>
                <div style={letterLabelStyle}>{label}</div>
                <div style={letterValueStyle}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "0.62fr 1.38fr", gap: 16 }}>
            <div>
              <div style={previewHeadingStyle}>Attendance Summary</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={tableHeaderCellStyle}>Attendance</th>
                    <th style={tableHeaderCellStyle}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Present", attendanceSummary.present],
                    ["Absent", attendanceSummary.absent],
                    ["Late", attendanceSummary.late],
                    ["Total", attendanceSummary.total],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td style={tableCellStyle}>{label}</td>
                      <td style={tableCellStyle}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div style={previewHeadingStyle}>Parent And Guardian Information</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={tableHeaderCellStyle}>Name</th>
                    <th style={tableHeaderCellStyle}>Relationship</th>
                    <th style={tableHeaderCellStyle}>Phone</th>
                    <th style={tableHeaderCellStyle}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.map((p, idx) => (
                    <tr key={`${p?.parentId || "parent"}_${idx}`}>
                      <td style={tableCellStyle}>{firstFilled(p?.fullName, p?.name, "-")}</td>
                      <td style={tableCellStyle}>{firstFilled(p?.relationship, "-")}</td>
                      <td style={tableCellStyle}>{firstFilled(p?.phone, "-")}</td>
                      <td style={tableCellStyle}>{firstFilled(p?.email, "-")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={previewHeadingStyle}>Academic history</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderCellStyle}>Academic Year</th>
                  <th style={tableHeaderCellStyle}>Grade</th>
                  <th style={tableHeaderCellStyle}>Section</th>
                  <th style={tableHeaderCellStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={`${r.year}_${r.grade}_${r.section}`}>
                    <td style={tableCellStyle}>{yearLabel(r.year)}</td>
                    <td style={tableCellStyle}>{r.grade || "-"}</td>
                    <td style={tableCellStyle}>{r.section || "-"}</td>
                    <td style={tableCellStyle}>{r.status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const certNo = certificateNumber || "CERT-YYYY-00001";
    return (
      <div style={{ ...previewPaperStyle, maxWidth: 900, margin: "0 auto", border: "2px solid #0f172a", position: "relative" }}>
        <div style={{ border: "1px solid #cbd5e1", padding: 22 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#0f172a", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>Official School Certificate</div>
            <div style={{ marginTop: 10, fontSize: 34, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.05em" }}>{schoolName}</div>
            <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "0.04em" }}>CERTIFICATE OF ENROLLMENT</div>
            <div style={{ marginTop: 14, fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
              Certificate No. {certNo}
              <br />
              Issued on {issueDateText}
            </div>
          </div>

          <div style={{ marginTop: 34, textAlign: "center", fontSize: 16, lineHeight: 1.9, color: "#334155", maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
            This is to certify that <strong style={{ color: "#0f172a" }}>{selectedStudent.name}</strong>, bearing student identification number <strong style={{ color: "#0f172a" }}>{selectedStudent.studentId}</strong>, is officially enrolled at <strong style={{ color: "#0f172a" }}>{schoolName}</strong> in <strong style={{ color: "#0f172a" }}>Grade {selectedStudent.grade}{selectedStudent.section ? ` ${selectedStudent.section}` : ""}</strong> for the <strong style={{ color: "#0f172a" }}>{academicYearText}</strong> academic year. This certificate is issued by the school register office for official use and verification.
          </div>

          <div style={{ marginTop: 28 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderCellStyle}>Student</th>
                  <th style={tableHeaderCellStyle}>Student ID</th>
                  <th style={tableHeaderCellStyle}>Academic Year</th>
                  <th style={tableHeaderCellStyle}>Reference</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tableCellStyle}>{selectedStudent.name}</td>
                  <td style={tableCellStyle}>{selectedStudent.studentId}</td>
                  <td style={tableCellStyle}>{academicYearText}</td>
                  <td style={tableCellStyle}>{studentReference}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 42, display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ width: 220, borderTop: "1px solid #94a3b8", paddingTop: 8, fontSize: 12, color: "#334155" }}>
              Registrar: {adminName}
            </div>
            <div style={{ width: 220, height: 76, border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#64748b" }}>
              School stamp area
            </div>
        </div>
        </div>
      </div>
    );
}