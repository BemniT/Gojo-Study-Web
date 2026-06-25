import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function exportAnalyticsExcel({
  schoolCode,
  selectedYear,
  selectedMonth,
  periodMode,
  activeSummary,
  activeGradeBreakdown,
  activeGenderBreakdown,
  monthlyTrend,
  yearlyTrend,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gojo Register Portal";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 24 },
  ];
  summarySheet.addRows([
    { metric: "School Code", value: schoolCode || "N/A" },
    { metric: "Selected Year", value: selectedYear },
    { metric: "View Mode", value: periodMode === "year" ? "This Year" : "Monthly" },
    { metric: "Selected Month", value: periodMode === "year" ? "All Months" : selectedMonth },
    { metric: periodMode === "year" ? "Total Expected Payments" : "Total Students", value: activeSummary.totalStudents },
    { metric: "Paid", value: activeSummary.paid },
    { metric: "Unpaid", value: activeSummary.unpaid },
    { metric: "Payment Rate", value: `${activeSummary.paidRate}%` },
  ]);

  const gradeSheet = workbook.addWorksheet("Grade Breakdown");
  gradeSheet.columns = [
    { header: "Grade", key: "grade", width: 16 },
    { header: "Total", key: "total", width: 14 },
    { header: "Paid", key: "paid", width: 14 },
    { header: "Unpaid", key: "unpaid", width: 14 },
    { header: "Rate", key: "rate", width: 14 },
  ];
  activeGradeBreakdown.forEach((row) => {
    const rate = row.total ? `${Math.round((row.paid / row.total) * 100)}%` : "0%";
    gradeSheet.addRow({
      grade: `Grade ${row.grade}`,
      total: row.total,
      paid: row.paid,
      unpaid: row.unpaid,
      rate,
    });
  });

  const genderSheet = workbook.addWorksheet("Gender Breakdown");
  genderSheet.columns = [
    { header: "Gender", key: "name", width: 18 },
    { header: "Total", key: "total", width: 14 },
    { header: "Paid", key: "paid", width: 14 },
    { header: "Unpaid", key: "unpaid", width: 14 },
  ];
  activeGenderBreakdown.forEach((row) => genderSheet.addRow(row));

  const trendSheet = workbook.addWorksheet("Monthly Trend");
  trendSheet.columns = [
    { header: "Month", key: "month", width: 14 },
    { header: "Paid", key: "paid", width: 14 },
    { header: "Unpaid", key: "unpaid", width: 14 },
    { header: "Paid Rate", key: "paidRate", width: 14 },
  ];
  monthlyTrend.forEach((row) => trendSheet.addRow({ ...row, paidRate: `${row.paidRate}%` }));

  const yearlySheet = workbook.addWorksheet("Yearly Trend");
  yearlySheet.columns = [
    { header: "Year", key: "year", width: 14 },
    { header: "Paid", key: "paid", width: 16 },
    { header: "Unpaid", key: "unpaid", width: 16 },
    { header: "Paid Rate", key: "paidRate", width: 16 },
  ];
  yearlyTrend.forEach((row) => yearlySheet.addRow({ ...row, paidRate: `${row.paidRate}%` }));

  const applyHeaderStyle = (sheet) => {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  };
  [summarySheet, gradeSheet, genderSheet, trendSheet, yearlySheet].forEach(applyHeaderStyle);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `finance-analytics-${selectedYear}-${selectedMonth}.xlsx`);
}

export function exportAnalyticsPdf({
  schoolCode,
  selectedYear,
  selectedMonth,
  periodMode,
  summary,
  activeSummary,
  activeGradeBreakdown,
  activeGenderBreakdown,
  yearlyTrend,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text("Gojo Register Portal - Payment Analytics Report", 40, 40);
  doc.setFontSize(10);
  doc.text(`School: ${schoolCode || "N/A"}`, 40, 58);
  doc.text(`Period: ${selectedMonth} ${selectedYear}`, 40, 72);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 86);

  autoTable(doc, {
    startY: 102,
    head: [["Metric", "Value"]],
    body: [
      ["Total Students", summary.totalStudents],
      [periodMode === "year" ? "Total Expected Payments" : "Total Students", activeSummary.totalStudents],
      ["Paid", activeSummary.paid],
      ["Unpaid", activeSummary.unpaid],
      ["Payment Rate", `${activeSummary.paidRate}%`],
    ],
    theme: "grid",
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    head: [["Grade", "Total", "Paid", "Unpaid", "Rate"]],
    body: activeGradeBreakdown.map((row) => [
      `Grade ${row.grade}`,
      row.total,
      row.paid,
      row.unpaid,
      `${row.total ? Math.round((row.paid / row.total) * 100) : 0}%`,
    ]),
    theme: "grid",
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    head: [["Gender", "Total", "Paid", "Unpaid"]],
    body: activeGenderBreakdown.map((row) => [row.name, row.total, row.paid, row.unpaid]),
    theme: "grid",
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    head: [["Year", "Paid", "Unpaid", "Paid Rate"]],
    body: yearlyTrend.map((row) => [row.year, row.paid, row.unpaid, `${row.paidRate}%`]),
    theme: "grid",
  });

  doc.save(`finance-analytics-${selectedYear}-${selectedMonth}.pdf`);
}
