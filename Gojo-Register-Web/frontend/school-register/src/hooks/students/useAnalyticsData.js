import { useEffect, useMemo, useState } from "react";
import { loadSchoolStudentsNode } from "../../utils/registerData";
import { fetchCachedJson } from "../../utils/rtdbCache";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const buildPaidSet = (monthNode) => {
  const paidSet = new Set();
  Object.entries(monthNode || {}).forEach(([sid, paidValue]) => {
    if (paidValue) paidSet.add(String(sid));
  });
  return paidSet;
};

const countPaidStudents = (students, paidSet) =>
  students.filter((s) => paidSet.has(String(s.studentId)) || paidSet.has(String(s.userId))).length;

export default function useAnalyticsData({ DB_ROOT, selectedYear, selectedMonth, periodMode, setSelectedYear }) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [monthlyPaidRaw, setMonthlyPaidRaw] = useState({});

  useEffect(() => {
    let cancelled = false;

    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const [studentsData, monthlyPaidData] = await Promise.all([
          loadSchoolStudentsNode({ rtdbBase: DB_ROOT }),
          fetchCachedJson(`${DB_ROOT}/monthlyPaid.json`, { ttlMs: 60000 }).catch(() => ({})),
        ]);

        if (cancelled) return;

        const list = Object.entries(studentsData).map(([studentId, studentNode]) => {
          const genderRaw = studentNode.gender || "Unknown";
          const name =
            studentNode.name ||
            [studentNode.firstName, studentNode.middleName, studentNode.lastName].filter(Boolean).join(" ") ||
            studentNode.basicStudentInformation?.name ||
            "Student";
          return {
            studentId,
            userId: studentNode.userId || "",
            grade: String(studentNode.grade || "Unknown"),
            section: studentNode.section || "N/A",
            gender: String(genderRaw).toLowerCase(),
            name,
          };
        });

        setStudents(list);
        setMonthlyPaidRaw(monthlyPaidData || {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnalyticsData();
    return () => { cancelled = true; };
  }, [DB_ROOT]);

  const allYears = useMemo(() => {
    const years = new Set();
    Object.keys(monthlyPaidRaw || {}).forEach((k) => {
      const [year] = String(k).split("-");
      if (year) years.add(year);
    });
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [monthlyPaidRaw]);

  useEffect(() => {
    if (!allYears.includes(selectedYear)) {
      setSelectedYear(allYears[0]);
    }
  }, [allYears, selectedYear, setSelectedYear]);

  const selectedMonthKey = `${selectedYear}-${selectedMonth}`;

  const summary = useMemo(() => {
    const totalStudents = students.length;
    const paidSet = buildPaidSet(monthlyPaidRaw?.[selectedMonthKey]);
    const paid = countPaidStudents(students, paidSet);
    const unpaid = Math.max(totalStudents - paid, 0);
    const paidRate = totalStudents > 0 ? Math.round((paid / totalStudents) * 100) : 0;
    return { totalStudents, paid, unpaid, paidRate };
  }, [students, monthlyPaidRaw, selectedMonthKey]);

  const monthlyTrend = useMemo(() => {
    return MONTHS.map((month) => {
      const paidSet = buildPaidSet(monthlyPaidRaw?.[`${selectedYear}-${month}`]);
      const paid = countPaidStudents(students, paidSet);
      const unpaid = Math.max(students.length - paid, 0);
      return {
        month,
        paid,
        unpaid,
        paidRate: students.length ? Number(((paid / students.length) * 100).toFixed(1)) : 0,
      };
    });
  }, [monthlyPaidRaw, selectedYear, students]);

  const gradeBreakdown = useMemo(() => {
    const paidSet = buildPaidSet(monthlyPaidRaw?.[selectedMonthKey]);
    const map = {};
    students.forEach((s) => {
      const key = s.grade || "Unknown";
      if (!map[key]) map[key] = { grade: key, paid: 0, unpaid: 0, total: 0 };
      const isPaid = paidSet.has(String(s.studentId)) || paidSet.has(String(s.userId));
      map[key].total += 1;
      if (isPaid) map[key].paid += 1; else map[key].unpaid += 1;
    });
    return Object.values(map).sort((a, b) => Number(a.grade) - Number(b.grade));
  }, [students, monthlyPaidRaw, selectedMonthKey]);

  const genderBreakdown = useMemo(() => {
    const paidSet = buildPaidSet(monthlyPaidRaw?.[selectedMonthKey]);
    const base = {
      male: { name: "Male", paid: 0, unpaid: 0, total: 0 },
      female: { name: "Female", paid: 0, unpaid: 0, total: 0 },
      other: { name: "Other", paid: 0, unpaid: 0, total: 0 },
      unknown: { name: "Unknown", paid: 0, unpaid: 0, total: 0 },
    };
    students.forEach((s) => {
      const genderKey = ["male", "female", "other"].includes(s.gender) ? s.gender : "unknown";
      const isPaid = paidSet.has(String(s.studentId)) || paidSet.has(String(s.userId));
      base[genderKey].total += 1;
      if (isPaid) base[genderKey].paid += 1; else base[genderKey].unpaid += 1;
    });
    return Object.values(base).filter((g) => g.total > 0);
  }, [students, monthlyPaidRaw, selectedMonthKey]);

  const yearlyTrend = useMemo(() => {
    return allYears
      .slice()
      .sort((a, b) => Number(a) - Number(b))
      .map((year) => {
        let paidTotal = 0;
        MONTHS.forEach((month) => {
          const paidSet = buildPaidSet(monthlyPaidRaw?.[`${year}-${month}`]);
          paidTotal += countPaidStudents(students, paidSet);
        });
        const yearlyExpected = students.length * 12;
        const unpaidTotal = Math.max(yearlyExpected - paidTotal, 0);
        const paidRate = yearlyExpected ? Number(((paidTotal / yearlyExpected) * 100).toFixed(1)) : 0;
        return { year, paid: paidTotal, unpaid: unpaidTotal, paidRate };
      });
  }, [allYears, monthlyPaidRaw, students]);

  const selectedYearSummary = useMemo(() => {
    const row = yearlyTrend.find((r) => String(r.year) === String(selectedYear));
    const expected = students.length * 12;
    if (row) {
      return { totalExpected: expected, paid: row.paid, unpaid: row.unpaid, paidRate: row.paidRate };
    }
    return { totalExpected: expected, paid: 0, unpaid: expected, paidRate: 0 };
  }, [yearlyTrend, selectedYear, students.length]);

  const yearlyGradeBreakdown = useMemo(() => {
    const map = {};
    students.forEach((s) => {
      const key = s.grade || "Unknown";
      if (!map[key]) map[key] = { grade: key, paid: 0, unpaid: 0, total: 0 };
      MONTHS.forEach((month) => {
        const monthNode = monthlyPaidRaw?.[`${selectedYear}-${month}`] || {};
        const isPaid = Boolean(monthNode?.[s.studentId] || monthNode?.[s.userId]);
        map[key].total += 1;
        if (isPaid) map[key].paid += 1; else map[key].unpaid += 1;
      });
    });
    return Object.values(map).sort((a, b) => Number(a.grade) - Number(b.grade));
  }, [students, monthlyPaidRaw, selectedYear]);

  const yearlyGenderBreakdown = useMemo(() => {
    const base = {
      male: { name: "Male", paid: 0, unpaid: 0, total: 0 },
      female: { name: "Female", paid: 0, unpaid: 0, total: 0 },
      other: { name: "Other", paid: 0, unpaid: 0, total: 0 },
      unknown: { name: "Unknown", paid: 0, unpaid: 0, total: 0 },
    };
    students.forEach((s) => {
      const genderKey = ["male", "female", "other"].includes(s.gender) ? s.gender : "unknown";
      MONTHS.forEach((month) => {
        const monthNode = monthlyPaidRaw?.[`${selectedYear}-${month}`] || {};
        const isPaid = Boolean(monthNode?.[s.studentId] || monthNode?.[s.userId]);
        base[genderKey].total += 1;
        if (isPaid) base[genderKey].paid += 1; else base[genderKey].unpaid += 1;
      });
    });
    return Object.values(base).filter((g) => g.total > 0);
  }, [students, monthlyPaidRaw, selectedYear]);

  const activeSummary = periodMode === "year"
    ? {
        totalStudents: selectedYearSummary.totalExpected,
        paid: selectedYearSummary.paid,
        unpaid: selectedYearSummary.unpaid,
        paidRate: selectedYearSummary.paidRate,
      }
    : summary;

  const activeGradeBreakdown = periodMode === "year" ? yearlyGradeBreakdown : gradeBreakdown;
  const activeGenderBreakdown = periodMode === "year" ? yearlyGenderBreakdown : genderBreakdown;
  const activeLabel = periodMode === "year" ? `This Year (${selectedYear})` : `${selectedMonth} ${selectedYear}`;
  const yearlyChartData = periodMode === "year"
    ? yearlyTrend.filter((row) => String(row.year) === String(selectedYear))
    : yearlyTrend;
  const selectedYearRateText = `${selectedYearSummary.paidRate}%`;

  return {
    loading,
    allYears,
    summary,
    monthlyTrend,
    yearlyTrend,
    activeSummary,
    activeGradeBreakdown,
    activeGenderBreakdown,
    activeLabel,
    yearlyChartData,
    selectedYearRateText,
  };
}
