import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { loadGradeManagementNode, loadSchoolInfoNode, loadSchoolStudentsNode } from "../../utils/registerData";
import { persistResolvedSchoolSession, resolveSchoolScope } from "../../utils/schoolScope";

const isValidGradeKey = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12;
};

export default function useGradeManagement({
  schoolCode,
  DB_URL: initialDbUrl,
  selectedGrade,
  setSelectedGrade,
  selectedSection,
  setSelectedSection,
}) {
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState(schoolCode);
  const [resolvedDbUrl, setResolvedDbUrl] = useState(initialDbUrl);
  const activeDbUrl = resolvedDbUrl || initialDbUrl;

  const [gradesMap, setGradesMap] = useState({});
  const [studentsMap, setStudentsMap] = useState({});
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [activeAcademicYear, setActiveAcademicYear] = useState("");
  const [sectionMaxDraft, setSectionMaxDraft] = useState({});

  const notify = (type, text) => setFeedback({ type, text });

  const gradeKeys = useMemo(
    () => Object.keys(gradesMap || {}).sort((a, b) => Number(a) - Number(b)),
    [gradesMap]
  );

  const stats = useMemo(() => {
    let totalSections = 0;
    let totalCapacity = 0;

    gradeKeys.forEach((grade) => {
      const sections = (gradesMap[grade] || {}).sections || {};
      totalSections += Object.keys(sections).length;
      Object.values(sections).forEach((sectionNode) => {
        totalCapacity += Number(sectionNode?.maxStudents || 0);
      });
    });

    const activeStudentCount = Object.values(studentsMap || {}).filter((studentNode) => {
      const row = studentNode || {};
      if (!activeAcademicYear) return true;
      return String(row.academicYear || "") === String(activeAcademicYear);
    }).length;

    return { totalGrades: gradeKeys.length, totalSections, totalCapacity, activeStudentCount };
  }, [gradeKeys, gradesMap, studentsMap, activeAcademicYear]);

  const sectionStudentList = useMemo(() => {
    if (!selectedGrade || !selectedSection) return [];

    const out = [];
    Object.entries(studentsMap || {}).forEach(([studentId, studentNode]) => {
      const row = studentNode || {};
      if (String(row.grade || "") !== String(selectedGrade)) return;
      if (String(row.section || "").toUpperCase() !== String(selectedSection || "").toUpperCase()) return;
      if (activeAcademicYear && String(row.academicYear || "") !== String(activeAcademicYear)) return;

      out.push({
        studentId,
        name:
          row.name ||
          [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ") ||
          row.basicStudentInformation?.name ||
          "Student",
        grade: row.grade || "",
        section: row.section || "",
        academicYear: row.academicYear || "",
      });
    });

    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [studentsMap, selectedGrade, selectedSection, activeAcademicYear]);

  const sectionOccupancy = useMemo(() => {
    const occupancy = {};
    Object.values(studentsMap || {}).forEach((studentNode) => {
      const row = studentNode || {};
      if (activeAcademicYear && String(row.academicYear || "") !== String(activeAcademicYear)) return;
      const grade = String(row.grade || "");
      const section = String(row.section || "").toUpperCase();
      if (!grade || !section) return;
      const key = `${grade}__${section}`;
      occupancy[key] = (occupancy[key] || 0) + 1;
    });
    return occupancy;
  }, [studentsMap, activeAcademicYear]);

  const loadData = async (options = {}) => {
    const force = Boolean(options?.force);
    if (!schoolCode) {
      notify("error", "Missing schoolCode in session. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const resolvedScope = await resolveSchoolScope(schoolCode, { force });
      const nextResolvedSchoolCode = String(resolvedScope?.schoolCode || schoolCode || "").trim();
      const nextResolvedDbUrl = String(resolvedScope?.dbUrl || initialDbUrl || "").trim();
      const resolvedSchoolInfo = resolvedScope?.schoolInfo || {};

      setResolvedSchoolCode(nextResolvedSchoolCode);
      setResolvedDbUrl(nextResolvedDbUrl);

      if (nextResolvedSchoolCode && nextResolvedSchoolCode !== schoolCode) {
        persistResolvedSchoolSession(nextResolvedSchoolCode, String(resolvedSchoolInfo?.shortName || "").trim());
      }

      const [rawGrades, studentsData, schoolInfo] = await Promise.all([
        loadGradeManagementNode({ rtdbBase: nextResolvedDbUrl, force }),
        loadSchoolStudentsNode({ rtdbBase: nextResolvedDbUrl }),
        Object.keys(resolvedSchoolInfo).length > 0
          ? Promise.resolve(resolvedSchoolInfo)
          : loadSchoolInfoNode({ rtdbBase: nextResolvedDbUrl }),
      ]);

      const nextGrades = Object.fromEntries(
        Object.entries(rawGrades || {}).filter(([gradeKey]) => isValidGradeKey(gradeKey))
      );

      setGradesMap(nextGrades);
      setStudentsMap(studentsData || {});
      setActiveAcademicYear(String(schoolInfo?.currentAcademicYear || ""));

      const sorted = Object.keys(nextGrades).sort((a, b) => Number(a) - Number(b));
      const firstGrade = sorted[0] || "";

      setSelectedGrade((prev) => {
        if (prev && nextGrades[prev]) return prev;
        return firstGrade;
      });

      setSelectedSection((prev) => {
        if (!prev) return "";
        const currentGrade = selectedGrade && nextGrades[selectedGrade] ? selectedGrade : firstGrade;
        const sections = (nextGrades[currentGrade] || {}).sections || {};
        return sections[prev] ? prev : "";
      });

      notify("", "");
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to load grade management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolCode]);

  useEffect(() => {
    const nextDraft = {};
    gradeKeys.forEach((grade) => {
      const sections = ((gradesMap[grade] || {}).sections || {});
      Object.entries(sections).forEach(([sectionKey, sectionNode]) => {
        nextDraft[`${grade}__${String(sectionKey).toUpperCase()}`] = String(sectionNode?.maxStudents || 40);
      });
    });
    setSectionMaxDraft(nextDraft);
  }, [gradesMap, gradeKeys]);

  const createGrade = async (newGradeInput, { onSuccess } = {}) => {
    const value = String(newGradeInput || "").replace(/[^0-9]/g, "");
    if (!value) {
      notify("error", "Please enter a grade.");
      return;
    }

    const gradeNum = Number(value);
    if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 12) {
      notify("error", "Grade must be from 1 to 12.");
      return;
    }

    const gradeKey = String(gradeNum);
    if (gradesMap[gradeKey]) {
      notify("warning", `Grade ${gradeKey} already exists.`);
      setSelectedGrade(gradeKey);
      return;
    }

    setWorking(true);
    try {
      await axios.patch(`${activeDbUrl}/GradeManagement/grades/${gradeKey}.json`, {
        grade: gradeKey,
        sections: {},
        createdAt: new Date().toISOString(),
      });
      setSelectedGrade(gradeKey);
      setSelectedSection("");
      await loadData({ force: true });
      notify("success", `Grade ${gradeKey} created successfully.`);
      if (onSuccess) onSuccess();
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to create grade.");
    } finally {
      setWorking(false);
    }
  };

  const addSection = async (newSection, newSectionMax, { onSuccess } = {}) => {
    if (!selectedGrade) {
      notify("error", "Please choose a grade first.");
      return;
    }

    const sectionKey = String(newSection || "").trim().toUpperCase();
    if (!sectionKey) {
      notify("error", "Please enter section name (A, B, C...).");
      return;
    }

    const maxStudents = Number(newSectionMax || 0);
    if (!Number.isInteger(maxStudents) || maxStudents < 1) {
      notify("error", "Max students must be a positive number.");
      return;
    }

    const existingSections = ((gradesMap[selectedGrade] || {}).sections || {});
    if (existingSections[sectionKey]) {
      notify("warning", `Section ${sectionKey} already exists in Grade ${selectedGrade}.`);
      setSelectedSection(sectionKey);
      return;
    }

    setWorking(true);
    try {
      await axios.patch(`${activeDbUrl}/GradeManagement/grades/${selectedGrade}/sections/${sectionKey}.json`, {
        section: sectionKey,
        maxStudents,
        createdAt: new Date().toISOString(),
      });

      setSelectedSection(sectionKey);
      await loadData({ force: true });
      notify("success", `Section ${sectionKey} added to Grade ${selectedGrade}.`);
      if (onSuccess) onSuccess();
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to add section.");
    } finally {
      setWorking(false);
    }
  };

  const updateSectionMax = async (gradeKey, sectionKey) => {
    const draftKey = `${gradeKey}__${String(sectionKey || "").toUpperCase()}`;
    const maxStudents = Number(sectionMaxDraft[draftKey] || 0);

    if (!Number.isInteger(maxStudents) || maxStudents < 1) {
      notify("error", "Max students must be a positive number.");
      return;
    }

    setWorking(true);
    try {
      await axios.patch(`${activeDbUrl}/GradeManagement/grades/${gradeKey}/sections/${sectionKey}.json`, {
        maxStudents,
        updatedAt: new Date().toISOString(),
      });

      await loadData({ force: true });
      notify("success", `Section ${sectionKey} max updated to ${maxStudents}.`);
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to update max students.");
    } finally {
      setWorking(false);
    }
  };

  const deleteSection = async (gradeKey, sectionKey) => {
    const key = `${gradeKey}__${String(sectionKey || "").toUpperCase()}`;
    const occupied = Number(sectionOccupancy[key] || 0);

    if (occupied > 0) {
      notify("warning", `Section ${sectionKey} has ${occupied} students. Move them before deleting.`);
      return;
    }

    const confirmed = window.confirm(`Delete section ${sectionKey} from Grade ${gradeKey}?`);
    if (!confirmed) return;

    setWorking(true);
    try {
      await axios.delete(`${activeDbUrl}/GradeManagement/grades/${gradeKey}/sections/${sectionKey}.json`);

      if (selectedGrade === gradeKey && selectedSection === sectionKey) {
        setSelectedSection("");
      }

      await loadData({ force: true });
      notify("success", `Section ${sectionKey} deleted from Grade ${gradeKey}.`);
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to delete section.");
    } finally {
      setWorking(false);
    }
  };

  const deleteGrade = async (gradeKey) => {
    const sections = (gradesMap[gradeKey] || {}).sections || {};
    if (Object.keys(sections).length > 0) {
      notify("warning", `Grade ${gradeKey} still has sections. Delete sections first.`);
      return;
    }

    const studentsInGrade = Object.values(studentsMap || {}).filter((studentNode) => {
      const row = studentNode || {};
      if (String(row.grade || "") !== String(gradeKey)) return false;
      if (activeAcademicYear && String(row.academicYear || "") !== String(activeAcademicYear)) return false;
      return true;
    }).length;

    if (studentsInGrade > 0) {
      notify("warning", `Grade ${gradeKey} has ${studentsInGrade} students and cannot be deleted.`);
      return;
    }

    const confirmed = window.confirm(`Delete Grade ${gradeKey}? This action cannot be undone.`);
    if (!confirmed) return;

    setWorking(true);
    try {
      await axios.delete(`${activeDbUrl}/GradeManagement/grades/${gradeKey}.json`);

      if (selectedGrade === gradeKey) {
        setSelectedGrade("");
        setSelectedSection("");
      }

      await loadData({ force: true });
      notify("success", `Grade ${gradeKey} deleted.`);
    } catch (err) {
      notify("error", err?.response?.data?.message || err?.message || "Failed to delete grade.");
    } finally {
      setWorking(false);
    }
  };

  return {
    gradesMap,
    gradeKeys,
    feedback,
    loading,
    working,
    activeAcademicYear,
    stats,
    sectionStudentList,
    sectionOccupancy,
    sectionMaxDraft,
    setSectionMaxDraft,
    loadData,
    createGrade,
    addSection,
    updateSectionMax,
    deleteSection,
    deleteGrade,
  };
}
