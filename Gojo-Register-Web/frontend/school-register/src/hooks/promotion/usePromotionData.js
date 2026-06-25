import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_BASE } from "../../config";
import {
  loadGradeManagementNode,
  loadSchoolInfoNode,
  loadSchoolStudentsNode,
} from "../../utils/registerData";
import { fetchCachedJson } from "../../utils/rtdbCache";

const normalizeGradesPayload = (payload) => {
  const map = {};

  if (Array.isArray(payload)) {
    payload.forEach((row) => {
      if (!row || typeof row !== "object") return;
      const gradeKey = String(row.grade || "").trim();
      if (!gradeKey) return;
      map[gradeKey] = { ...row, grade: gradeKey, sections: row.sections || {} };
    });
    return map;
  }

  if (payload && typeof payload === "object") {
    Object.entries(payload).forEach(([key, row]) => {
      if (!row || typeof row !== "object") return;
      const gradeKey = String(row.grade || key || "").trim();
      if (!gradeKey || gradeKey === "null" || gradeKey === "undefined") return;
      map[gradeKey] = { ...row, grade: gradeKey, sections: row.sections || {} };
    });
  }

  return map;
};

const buildNextYearKey = (fromYearKey) => {
  const safe = String(fromYearKey || "").trim();
  const m = safe.match(/^(\d{4})_(\d{4})$/);
  if (!m) return "";
  const y1 = Number(m[1]);
  const y2 = Number(m[2]);
  return `${y1 + 1}_${y2 + 1}`;
};

/**
 * usePromotionData
 *
 * Owns the data-layer state for the promotion wizard:
 * - `academicYears`, `currentAcademicYear`, `gradesMap`, `studentsMap`
 * - `yearHistoryStudentsMap` + its loading flag
 * - `loading` (base data fetch)
 *
 * Plus three effects:
 * - Auto-derive `toYear` from `fromYear` (when the user picks a "from" year)
 * - Load base data once on mount or when `schoolCode` changes
 * - Reload year-history students whenever `fromYear` changes
 *
 * `notify` is invoked for user-facing error toasts so the page can keep
 * its existing `feedback` state without the hook owning that detail.
 */
export default function usePromotionData({
  schoolCode,
  DB_URL,
  fromYear,
  setFromYear,
  toYear,
  setToYear,
  notify,
}) {
  const [academicYears, setAcademicYears] = useState({});
  const [currentAcademicYear, setCurrentAcademicYear] = useState("");
  const [gradesMap, setGradesMap] = useState({});
  const [studentsMap, setStudentsMap] = useState({});
  const [yearHistoryStudentsMap, setYearHistoryStudentsMap] = useState({});
  const [yearHistoryLoading, setYearHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // ----- Auto-derive `toYear` from `fromYear` -----
  useEffect(() => {
    if (!fromYear) return;
    const computed = buildNextYearKey(fromYear);
    if (computed && computed !== toYear) setToYear(computed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromYear]);

  // ----- Base data loader -----
  const loadBaseData = async () => {
    if (!schoolCode) {
      notify?.("error", "Missing schoolCode in session. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const [yearsRes, dbYearsData, schoolInfo, gradesData, studentsData] = await Promise.all([
        axios
          .get(`${BACKEND_BASE}/api/academic-years`, { params: { schoolCode } })
          .catch(() => ({ data: {} })),
        fetchCachedJson(`${DB_URL}/AcademicYears.json`, { ttlMs: 60000 }).catch(() => ({})),
        loadSchoolInfoNode({ rtdbBase: DB_URL }),
        loadGradeManagementNode({ rtdbBase: DB_URL }),
        loadSchoolStudentsNode({ rtdbBase: DB_URL }),
      ]);

      const yearsPayload = yearsRes.data || {};
      const nextYears = yearsPayload.academicYears || dbYearsData || {};
      const derivedCurrent =
        Object.entries(nextYears || {}).find(([, row]) => !!row?.isCurrent)?.[0] || "";
      const nextCurrent =
        yearsPayload.currentAcademicYear ||
        schoolInfo?.currentAcademicYear ||
        derivedCurrent ||
        "";

      setAcademicYears(nextYears);
      setCurrentAcademicYear(nextCurrent);
      setFromYear?.((prev) => prev || nextCurrent || Object.keys(nextYears)[0] || "");
      setGradesMap(normalizeGradesPayload(gradesData || {}));
      setStudentsMap(studentsData || {});

      notify?.("", "");
    } catch (err) {
      notify?.(
        "error",
        err?.response?.data?.message || err?.message || "Failed to load promotion data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  // ----- Year-history students loader -----
  const loadYearHistoryStudents = async (yearKey) => {
    if (!yearKey || !schoolCode) {
      setYearHistoryStudentsMap({});
      return;
    }

    setYearHistoryLoading(true);
    try {
      const data = await fetchCachedJson(
        `${DB_URL}/YearHistory/${yearKey}/Students.json`,
        { ttlMs: 60000 }
      ).catch(() => ({}));
      setYearHistoryStudentsMap(data || {});
    } catch (err) {
      setYearHistoryStudentsMap({});
      notify?.(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load YearHistory students."
      );
    } finally {
      setYearHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadYearHistoryStudents(fromYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromYear, schoolCode]);

  return {
    // state
    academicYears,
    currentAcademicYear,
    gradesMap,
    studentsMap,
    yearHistoryStudentsMap,
    yearHistoryLoading,
    loading,
    // setters (exposed so the page can keep wiring inline UI handlers)
    setAcademicYears,
    setCurrentAcademicYear,
    setGradesMap,
    setStudentsMap,
    setYearHistoryStudentsMap,
    // actions
    loadBaseData,
    loadYearHistoryStudents,
  };
}
