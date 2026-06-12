import { useEffect, useState } from "react";
import axios from "axios";
import { loadMarksForStudent } from "../../utils/registerData";

/**
 * useStudentTabData
 *
 * Tab data for the currently-selected student: marks (loaded whenever the
 * student changes) and payment history (loaded lazily when the Payment tab
 * is opened). Both effects guard against stale results with a `cancelled`
 * flag so quick student switches don't race.
 */
export default function useStudentTabData({ dbUrl, selectedStudent, studentTab }) {
  const [studentMarks, setStudentMarks] = useState({});
  const [paymentHistory, setPaymentHistory] = useState({});

  // Marks — load whenever the selected student changes
  useEffect(() => {
    if (!selectedStudent?.studentId) {
      setStudentMarks({});
      return undefined;
    }

    let cancelled = false;

    const fetchMarks = async () => {
      try {
        const marksObj = await loadMarksForStudent({
          rtdbBase: dbUrl,
          student: selectedStudent,
          allowLegacy: true,
        });
        if (!cancelled) setStudentMarks(marksObj);
      } catch (err) {
        console.error("Marks fetch error:", err);
        if (!cancelled) setStudentMarks({});
      }
    };

    fetchMarks();
    return () => {
      cancelled = true;
    };
  }, [selectedStudent, dbUrl]);

  // Payment history — lazy load when the Payment tab opens
  useEffect(() => {
    if (studentTab !== "payment" || !selectedStudent) return undefined;

    let cancelled = false;

    const fetchPaymentHistory = async () => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const year = new Date().getFullYear();
      const studentKey =
        selectedStudent?.studentId ||
        selectedStudent?.userId ||
        String(selectedStudent?.id || "");
      const out = {};

      await Promise.all(
        months.map(async (m) => {
          const key = `${year}-${m}`;
          try {
            const res = await axios
              .get(`${dbUrl}/monthlyPaid/${key}.json`)
              .catch(() => ({ data: {} }));
            const node = res.data || {};
            out[key] = !!(node && (node[studentKey] || node[String(studentKey)]));
          } catch {
            out[key] = false;
          }
        })
      );

      if (!cancelled) setPaymentHistory(out);
    };

    fetchPaymentHistory();
    return () => {
      cancelled = true;
    };
  }, [studentTab, selectedStudent, dbUrl]);

  return {
    studentMarks,
    setStudentMarks,
    paymentHistory,
    setPaymentHistory,
  };
}
