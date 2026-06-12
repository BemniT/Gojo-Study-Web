import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

export const loadImageAsDataUrl = async (url) => {
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

const COLORS = {
  navy: [15, 23, 42],
  blue: [0, 122, 251],
  blueDeep: [0, 95, 204],
  teal: [0, 182, 169],
  slate: [51, 65, 85],
  muted: [100, 116, 139],
  line: [215, 231, 251],
  soft: [241, 248, 255],
  softAlt: [247, 251, 255],
  white: [255, 255, 255],
  greenSoft: [233, 251, 249],
  amber: [146, 64, 14],
  amberSoft: [255, 247, 237],
};

// ----- Internal drawing helpers (curried by per-document builders) -----

const makeDrawingHelpers = (doc, pageWidth, ctx) => {
  const setTextColor = (color) => doc.setTextColor(...color);
  const setDrawColor = (color) => doc.setDrawColor(...color);
  const setFillColor = (color) => doc.setFillColor(...color);

  const drawFormalHeader = ({ title, reference, subject }) => {
    const { schoolName, schoolAddress, schoolPhone, schoolEmail, issueDate, adminName } = ctx;
    setTextColor(COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(schoolName, 40, 56);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    setTextColor(COLORS.slate);
    const headerLines = [schoolAddress, schoolPhone, schoolEmail].filter(Boolean).join("   |   ");
    if (headerLines) {
      doc.text(doc.splitTextToSize(headerLines, pageWidth - 240), 40, 74);
    }

    setTextColor(COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, pageWidth / 2, 108, { align: "center" });

    setDrawColor(COLORS.navy);
    doc.setLineWidth(1.2);
    doc.line(40, 86, pageWidth - 40, 86);
    doc.setDrawColor(COLORS.line);
    doc.setLineWidth(1);
    doc.line(40, 118, pageWidth - 40, 118);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    setTextColor(COLORS.slate);
    doc.text(`Date: ${issueDate}`, pageWidth - 40, 56, { align: "right" });
    doc.text(`Reference: ${reference}`, pageWidth - 40, 72, { align: "right" });
    doc.text(`Prepared by: ${adminName}`, pageWidth - 40, 88, { align: "right" });

    if (subject) {
      setTextColor(COLORS.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.text(`Subject: ${subject}`, 40, 144);
      return 164;
    }
    return 138;
  };

  const drawFieldRows = (startY, rows, options = {}) => {
    const labelWidth = options.labelWidth || 130;
    const rowHeight = options.rowHeight || 22;
    const width = options.width || pageWidth - 80;
    const x = options.x || 40;

    rows.forEach(([label, value], index) => {
      const rowY = startY + index * rowHeight;
      if (index % 2 === 0) {
        setFillColor(COLORS.softAlt);
        doc.rect(x, rowY - 14, width, rowHeight, "F");
      }
      setTextColor(COLORS.muted);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(label, x + 12, rowY);
      setTextColor(COLORS.slate);
      doc.setFont("helvetica", "normal");
      doc.text(String(value || "-"), x + labelWidth, rowY);
    });

    setDrawColor(COLORS.line);
    doc.rect(x, startY - 20, width, rows.length * rowHeight + 6);
    return startY + rows.length * rowHeight;
  };

  const drawSignatureLine = (x, y, width, label) => {
    setDrawColor(COLORS.muted);
    doc.line(x, y, x + width, y);
    setTextColor(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(label, x, y + 14);
  };

  return { setTextColor, setDrawColor, setFillColor, drawFormalHeader, drawFieldRows, drawSignatureLine };
};

// ----- Per-document builders -----

const buildIdCard = (doc, pageWidth, ctx, helpers) => {
  const { setTextColor, setDrawColor, setFillColor } = helpers;
  const { selectedStudent, schoolName, studentReference, academicYearText, issueDate, validUntil, schoolContact, emergencyName, emergencyPhone, bloodType, addressText, photoDataUrl } = ctx;

  const mmToPt = 2.834645669;
  const cardWidth = 85.6 * mmToPt;
  const cardHeight = 53.98 * mmToPt;
  const frontX = 36;
  const frontY = 140;
  const backX = frontX + cardWidth + 18;
  const topBandHeight = 30;
  const photoX = frontX + 14;
  const photoY = frontY + 42;
  const photoW = 44;
  const photoH = 54;
  const labelX = frontX + 66;
  const valueX = frontX + 125;

  [frontX, backX].forEach((cardX) => {
    setFillColor(COLORS.white);
    doc.roundedRect(cardX, frontY, cardWidth, cardHeight, 10, 10, "F");
    setDrawColor(COLORS.navy);
    doc.setLineWidth(1);
    doc.roundedRect(cardX, frontY, cardWidth, cardHeight, 10, 10);
  });

  // Front
  setFillColor(COLORS.navy);
  doc.roundedRect(frontX, frontY, cardWidth, topBandHeight, 10, 10, "F");
  setTextColor(COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text(String(schoolName).toUpperCase(), frontX + 12, frontY + 13);
  doc.setFontSize(8.3);
  doc.text("STUDENT IDENTITY CARD", frontX + 12, frontY + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(studentReference, frontX + cardWidth - 12, frontY + 18, { align: "right" });

  setFillColor(COLORS.softAlt);
  doc.roundedRect(photoX, photoY, photoW, photoH, 7, 7, "F");
  setDrawColor(COLORS.line);
  doc.roundedRect(photoX, photoY, photoW, photoH, 7, 7);
  if (photoDataUrl) {
    const format = photoDataUrl.includes("image/png") ? "PNG" : "JPEG";
    doc.addImage(photoDataUrl, format, photoX + 1.5, photoY + 1.5, photoW - 3, photoH - 3);
  } else {
    setTextColor(COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(getNameInitials(selectedStudent.name), photoX + photoW / 2, photoY + 24, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text("PHOTO", photoX + photoW / 2, photoY + 37, { align: "center" });
  }

  setTextColor(COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(selectedStudent.name, labelX, frontY + 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.7);
  doc.text("ID NO.", labelX, frontY + 61);
  doc.text("GRADE", labelX, frontY + 74);
  doc.text("SECTION", labelX, frontY + 87);
  doc.text("ACADEMIC YEAR", labelX, frontY + 100);

  doc.setFont("helvetica", "bold");
  doc.text(String(selectedStudent.studentId), valueX, frontY + 61);
  doc.text(String(selectedStudent.grade || "-"), valueX, frontY + 74);
  doc.text(String(selectedStudent.section || "-"), valueX, frontY + 87);
  doc.text(academicYearText, valueX, frontY + 100);

  setDrawColor(COLORS.line);
  doc.line(frontX + 12, frontY + 108, frontX + cardWidth - 12, frontY + 108);
  setTextColor(COLORS.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.text(`Issued: ${issueDate}`, frontX + 12, frontY + 119);
  doc.text(`Valid until: ${validUntil}`, frontX + 12, frontY + 128);
  doc.text(`Contact: ${schoolContact}`, frontX + 12, frontY + 137);

  // Back
  setFillColor(COLORS.navy);
  doc.roundedRect(backX, frontY, cardWidth, topBandHeight, 10, 10, "F");
  setTextColor(COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text(String(schoolName).toUpperCase(), backX + 12, frontY + 13);
  doc.setFontSize(8.3);
  doc.text("HOLDER INFORMATION", backX + 12, frontY + 24);

  setTextColor(COLORS.navy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.7);
  doc.text("EMERGENCY CONTACT", backX + 12, frontY + 48);
  doc.text("PHONE", backX + 12, frontY + 62);
  doc.text("BLOOD TYPE", backX + 12, frontY + 76);
  doc.text("ADDRESS", backX + 12, frontY + 90);

  doc.setFont("helvetica", "bold");
  doc.text(String(emergencyName), backX + 88, frontY + 48);
  doc.text(String(emergencyPhone), backX + 88, frontY + 62);
  doc.text(String(bloodType), backX + 88, frontY + 76);
  doc.text(doc.splitTextToSize(addressText, cardWidth - 100), backX + 88, frontY + 90);

  setDrawColor(COLORS.line);
  doc.line(backX + 12, frontY + 108, backX + cardWidth - 12, frontY + 108);
  setTextColor(COLORS.slate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("If found, return to the school administration office.", backX + 12, frontY + 119);
  doc.setFont("helvetica", "normal");
  doc.text(schoolContact, backX + 12, frontY + 128);
  doc.text(studentReference, backX + cardWidth - 12, frontY + 128, { align: "right" });
};

const buildEnrollmentLetter = (doc, pageWidth, ctx, helpers) => {
  const { drawFormalHeader, drawFieldRows, drawSignatureLine } = helpers;
  const { selectedStudent, schoolName, studentReference, academicYearText, adminName } = ctx;

  const startY = drawFormalHeader({
    title: "ENROLLMENT LETTER",
    reference: studentReference,
    subject: `Confirmation of enrollment for ${selectedStudent.name}`,
  });

  doc.setTextColor(...COLORS.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("To whom it may concern,", 40, startY + 18);

  const paragraph = doc.splitTextToSize(
    `This is to formally certify that ${selectedStudent.name}, identified by student ID ${selectedStudent.studentId}, is a currently enrolled student of ${schoolName}. According to the official register office record, the student is assigned to Grade ${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ""} for the ${academicYearText} academic year.`,
    pageWidth - 80
  );
  doc.text(paragraph, 40, startY + 46);

  const detailsY = startY + 46 + paragraph.length * 16 + 24;
  drawFieldRows(detailsY + 20, [
    ["Student Name", selectedStudent.name],
    ["Student ID", selectedStudent.studentId],
    ["Grade and Section", `${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ""}`],
    ["Academic Year", academicYearText],
    ["Status", selectedStudent.status],
  ]);

  const closingY = detailsY + 148;
  const closing = doc.splitTextToSize(
    "This letter is issued upon request for official educational and administrative use. All information herein is based on the current school register and is valid as of the date of issue.",
    pageWidth - 80
  );
  doc.text(closing, 40, closingY);

  const signY = closingY + closing.length * 16 + 56;
  drawSignatureLine(44, signY, 200, `Registrar: ${adminName}`);
  drawSignatureLine(pageWidth - 244, signY, 200, "School stamp");
};

const buildTransferLetter = (doc, pageWidth, ctx, helpers) => {
  const { setTextColor, setDrawColor, drawFormalHeader, drawSignatureLine } = helpers;
  const { selectedStudent, schoolName, studentReference, academicYearText, studentDob, transferReason, records } = ctx;

  const startY = drawFormalHeader({
    title: "TRANSFER LETTER",
    reference: studentReference,
    subject: `Transfer clearance for ${selectedStudent.name}`,
  });

  doc.setTextColor(...COLORS.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("To whom it may concern,", 40, startY + 18);

  const intro = doc.splitTextToSize(
    `This letter confirms that ${selectedStudent.name}, student ID ${selectedStudent.studentId}, has been processed for transfer from ${schoolName}. The details below summarize the student's registered academic status and the stated reason for transfer.`,
    pageWidth - 80
  );
  doc.text(intro, 40, startY + 46);

  autoTable(doc, {
    startY: startY + 74,
    theme: "grid",
    head: [["Student", "ID", "Date of Birth", "Grade", "Academic Year"]],
    body: [[
      selectedStudent.name,
      selectedStudent.studentId,
      studentDob,
      `${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ""}`,
      academicYearText,
    ]],
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { textColor: COLORS.slate, fontSize: 10 },
    styles: { lineColor: COLORS.line, lineWidth: 1 },
    margin: { left: 40, right: 40 },
  });

  const reasonY = (doc.lastAutoTable?.finalY || startY) + 18;
  setTextColor(COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Transfer Reason", 40, reasonY + 4);
  setDrawColor(COLORS.line);
  doc.rect(40, reasonY + 12, pageWidth - 80, 64);
  setTextColor(COLORS.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.text(doc.splitTextToSize(transferReason || "No transfer reason recorded.", pageWidth - 104), 52, reasonY + 34);

  autoTable(doc, {
    startY: reasonY + 94,
    theme: "grid",
    head: [["Academic Year", "Grade", "Section", "Status"]],
    body: records.map((r) => [yearLabel(r.year), r.grade || "-", r.section || "-", r.status || "-"]),
    headStyles: { fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { textColor: COLORS.slate, fontSize: 10 },
    alternateRowStyles: { fillColor: COLORS.softAlt },
    styles: { lineColor: COLORS.line, lineWidth: 1 },
    margin: { left: 40, right: 40 },
  });

  const noteY = (doc.lastAutoTable?.finalY || reasonY + 94) + 28;
  setTextColor(COLORS.slate);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(doc.splitTextToSize(`This transfer letter is prepared from the official academic and administrative records maintained by ${schoolName} and is issued for formal reference purposes.`, pageWidth - 88), 40, noteY);
  drawSignatureLine(40, noteY + 54, 200, "Registrar authorization");
};

const buildProfileReport = (doc, pageWidth, ctx, helpers) => {
  const { drawFormalHeader, drawFieldRows } = helpers;
  const { selectedStudent, studentReference, academicYearText, studentDob, addressText, emergencyName, emergencyPhone, attendanceSummary, parents, records } = ctx;

  const startY = drawFormalHeader({
    title: "STUDENT PROFILE REPORT",
    reference: studentReference,
    subject: `Student record summary for ${selectedStudent.name}`,
  });

  drawFieldRows(startY + 20, [
    ["Student Name", selectedStudent.name],
    ["Student ID", selectedStudent.studentId],
    ["Grade and Section", `${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ""}`],
    ["Academic Year", academicYearText],
    ["Date of Birth", studentDob],
    ["Status", selectedStudent.status],
    ["Address", addressText],
    ["Emergency Contact", `${emergencyName} (${emergencyPhone})`],
  ], { rowHeight: 20 });

  autoTable(doc, {
    startY: startY + 208,
    theme: "grid",
    head: [["Attendance", "Count"]],
    body: [["Present", attendanceSummary.present], ["Absent", attendanceSummary.absent], ["Late", attendanceSummary.late], ["Total", attendanceSummary.total]],
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { textColor: COLORS.slate, fontSize: 10 },
    styles: { lineColor: COLORS.line, lineWidth: 1 },
    margin: { left: 40, right: pageWidth / 2 + 10 },
  });

  autoTable(doc, {
    startY: startY + 208,
    theme: "grid",
    head: [["Parent", "Relationship", "Phone", "Email"]],
    body: parents.map((p) => [
      firstFilled(p?.fullName, p?.name, "-"),
      firstFilled(p?.relationship, "-"),
      firstFilled(p?.phone, "-"),
      firstFilled(p?.email, "-"),
    ]),
    headStyles: { fillColor: COLORS.blue, textColor: COLORS.white, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { textColor: COLORS.slate, fontSize: 10 },
    alternateRowStyles: { fillColor: COLORS.softAlt },
    styles: { lineColor: COLORS.line, lineWidth: 1 },
    margin: { left: pageWidth / 2 + 20, right: 40 },
  });

  autoTable(doc, {
    startY: Math.max(doc.lastAutoTable?.finalY || 0, startY + 318) + 20,
    theme: "grid",
    head: [["Academic Year", "Grade", "Section", "Status"]],
    body: records.map((r) => [yearLabel(r.year), r.grade || "-", r.section || "-", r.status || "-"]),
    headStyles: { fillColor: COLORS.teal, textColor: COLORS.white, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { textColor: COLORS.slate, fontSize: 10 },
    alternateRowStyles: { fillColor: COLORS.softAlt },
    styles: { lineColor: COLORS.line, lineWidth: 1 },
    margin: { left: 40, right: 40 },
  });
};

const buildEnrollmentCertificate = (doc, pageWidth, pageHeight, ctx, helpers) => {
  const { setTextColor, setDrawColor, drawSignatureLine } = helpers;
  const { selectedStudent, schoolName, studentReference, academicYearText, issueDate, certNo, adminName } = ctx;

  setDrawColor(COLORS.navy);
  doc.setLineWidth(1.5);
  doc.rect(34, 34, pageWidth - 68, pageHeight - 68);
  setDrawColor(COLORS.line);
  doc.rect(46, 46, pageWidth - 92, pageHeight - 92);

  setTextColor(COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("OFFICIAL SCHOOL CERTIFICATE", pageWidth / 2, 82, { align: "center" });
  doc.setFontSize(28);
  doc.text(schoolName, pageWidth / 2, 122, { align: "center" });
  doc.setFontSize(22);
  doc.text("CERTIFICATE OF ENROLLMENT", pageWidth / 2, 156, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.text(`Certificate No. ${certNo}`, pageWidth / 2, 188, { align: "center" });
  doc.text(`Issued on ${issueDate}`, pageWidth / 2, 206, { align: "center" });

  setTextColor(COLORS.slate);
  doc.setFontSize(14);
  const certificateLines = doc.splitTextToSize(
    `This is to certify that ${selectedStudent.name}, bearing student identification number ${selectedStudent.studentId}, is officially enrolled at ${schoolName} in Grade ${selectedStudent.grade}${selectedStudent.section ? ` ${selectedStudent.section}` : ""} for the ${academicYearText} academic year. This certificate is issued by the school register office for official use and verification.`,
    430
  );
  doc.text(certificateLines, pageWidth / 2, 286, { align: "center" });

  autoTable(doc, {
    startY: 390,
    theme: "grid",
    head: [["Student", "Student ID", "Academic Year", "Reference"]],
    body: [[selectedStudent.name, selectedStudent.studentId, academicYearText, studentReference]],
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { textColor: COLORS.slate, fontSize: 10, halign: "center" },
    styles: { lineColor: COLORS.line, lineWidth: 1 },
    margin: { left: 92, right: 92 },
  });

  drawSignatureLine(88, 620, 180, `Registrar: ${adminName}`);
  setDrawColor(COLORS.line);
  doc.rect(pageWidth - 250, 572, 150, 70);
  setTextColor(COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("School stamp area", pageWidth - 175, 612, { align: "center" });
};

/**
 * buildDocumentPdf
 *
 * Renders one of the 5 supported document types into a fresh jsPDF
 * document and returns `{ doc, fileName }`. The caller is responsible
 * for `doc.save(fileName)`, recording metadata, and showing UI feedback.
 *
 * Document types: id_card, enrollment_letter, transfer_letter,
 * profile_report, enrollment_certificate.
 */
export const buildDocumentPdf = (documentType, ctx) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const helpers = makeDrawingHelpers(doc, pageWidth, ctx);

  if (documentType === "id_card") buildIdCard(doc, pageWidth, ctx, helpers);
  else if (documentType === "enrollment_letter") buildEnrollmentLetter(doc, pageWidth, ctx, helpers);
  else if (documentType === "transfer_letter") buildTransferLetter(doc, pageWidth, ctx, helpers);
  else if (documentType === "profile_report") buildProfileReport(doc, pageWidth, ctx, helpers);
  else if (documentType === "enrollment_certificate") buildEnrollmentCertificate(doc, pageWidth, pageHeight, ctx, helpers);

  const fileName = `${documentType}_${ctx.selectedStudent?.studentId}_${Date.now()}.pdf`;
  return { doc, fileName };
};
