import { useEffect, useState } from "react";
import {
  loadSchoolInfoNode,
  loadSchoolStudentsNode,
} from "../../utils/registerData";
import { fetchCachedJson } from "../../utils/rtdbCache";

const YEAR_HISTORY_TTL_MS = 10 * 60 * 1000;

/**
 * useDocumentData
 *
 * Owns the data layer for the DocumentGeneration page:
 * - `schoolInfo` (school metadata)
 * - `currentAcademicYear` (derived from schoolInfo)
 * - `studentsMap` (top-level Students node)
 * - `yearHistoryMap` (compact YearHistory: only the per-year Students sub-node)
 * - `loading` flag for the fetch
 *
 * Avoids the 15 MB full YearHistory download by using a shallow index
 * to discover year keys, then fetching only `/YearHistory/{y}/Students.json`
 * per year. Each year fetch is cached for 10 min via `fetchCachedJson`.
 */
export default function useDocumentData({ DB_URL, activeSchoolCode, notify }) {
  const [loading, setLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({});
  const [currentAcademicYear, setCurrentAcademicYear] = useState("");
  const [studentsMap, setStudentsMap] = useState({});
  const [yearHistoryMap, setYearHistoryMap] = useState({});

  const loadData = async () => {
    if (!activeSchoolCode) {
      notify?.("error", "Missing schoolCode in session. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const [nextSchoolInfo, studentsData] = await Promise.all([
        loadSchoolInfoNode({ rtdbBase: DB_URL }),
        loadSchoolStudentsNode({ rtdbBase: DB_URL }),
      ]);

      setSchoolInfo(nextSchoolInfo || {});
      setCurrentAcademicYear(String(nextSchoolInfo?.currentAcademicYear || "").trim());
      setStudentsMap(studentsData || {});

      // Load YearHistory using a shallow index to discover year keys, then
      // fetch only the Students sub-node per year — avoids downloading the
      // full 15 MB YearHistory blob.
      const yearIndex = await fetchCachedJson(
        `${DB_URL}/YearHistory.json?shallow=true`,
        { ttlMs: YEAR_HISTORY_TTL_MS }
      ).catch(() => ({}));

      const yearKeys = Object.keys(yearIndex || {});
      const yearStudentsFetches = yearKeys.map((yk) =>
        fetchCachedJson(`${DB_URL}/YearHistory/${yk}/Students.json`, {
          ttlMs: YEAR_HISTORY_TTL_MS,
        })
          .then((s) => [yk, s || {}])
          .catch(() => [yk, {}])
      );

      const yearStudentsEntries = await Promise.all(yearStudentsFetches);
      const compactYearHistory = Object.fromEntries(
        yearStudentsEntries.map(([yk, students]) => [yk, { Students: students }])
      );
      setYearHistoryMap(compactYearHistory);

      notify?.("", "");
    } catch (err) {
      notify?.(
        "error",
        err?.response?.data?.message || err?.message || "Failed to load document generation data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchoolCode, DB_URL]);

  return {
    loading,
    schoolInfo,
    currentAcademicYear,
    studentsMap,
    yearHistoryMap,
    loadData,
  };
}
