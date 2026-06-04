import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { get, ref, set, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../styles/global.css";
import styles from "./exam/Exam.module.css";
import ExamHeader from "./exam/ExamHeader";
import ExamCourseSelect from "./exam/ExamCourseSelect";
import ExamCurriculumEditor from "./exam/ExamCurriculumEditor";
import ExamAssessmentForm from "./exam/ExamAssessmentForm";
import { db, schoolPath } from "../firebase";
import { getRtdbRoot, RTDB_BASE_RAW } from "../api/rtdbScope";
import { getTeacherCourseContext } from "../api/teacherApi";

const RTDB_BASE = getRtdbRoot();
const getViewportWidth = () => (typeof window !== "undefined" ? window.innerWidth : 1024);

const initialChapter = { id: "", title: "", contentUrl: "", hasExam: false, order: 1 };
const initialQuestion = {
  question: "",
  options: { A: "", B: "", C: "", D: "" },
  correct: "A",
  points: 1,
  explanation: "",
};

const normalizeCourseSubject = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toTitleCase = (value) =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const parseVirtualCourseFromId = (courseId) => {
  const normalized = String(courseId || "").trim();
  if (!normalized.startsWith("course_")) {
    return {
      id: normalized,
      subject: normalized,
      name: normalized,
      grade: "",
      section: "",
      virtual: true,
    };
  }

  const body = normalized.slice("course_".length);
  const parts = body.split("_").filter(Boolean);
  const gradeSection = parts.at(-1) || "";
  const match = gradeSection.match(/^(\d+)([A-Za-z].*)$/);
  const subjectRaw = normalizeCourseSubject(parts.slice(0, -1).join(" "));

  return {
    id: normalized,
    subject: toTitleCase(subjectRaw),
    name: toTitleCase(subjectRaw),
    grade: match?.[1] || "",
    section: String(match?.[2] || "").toUpperCase(),
    virtual: true,
  };
};

const getStoredTeacher = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("teacher");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    window.__gojoClearTeacherState?.();
    return null;
  }
};

function Exam() {
  const [sidebarOpen, setSidebarOpen] = useState(() => getViewportWidth() > 600);
  const [isMobile, setIsMobile] = useState(() => getViewportWidth() <= 600);
  const [teacher, setTeacher] = useState(null);
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseError, setCourseError] = useState("");
  const [rtdbBase, setRtdbBase] = useState("");
  const [schoolBaseResolved, setSchoolBaseResolved] = useState(false);

  const [showCurriculumForm, setShowCurriculumForm] = useState(false);
  const [newGrade, setNewGrade] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newChapters, setNewChapters] = useState([{ ...initialChapter }]);
  const [curriculumSaving, setCurriculumSaving] = useState(false);
  const [curriculumSuccess, setCurriculumSuccess] = useState("");
  const [curriculumError, setCurriculumError] = useState("");

  const [chapterId, setChapterId] = useState("");
  const [assessmentType, setAssessmentType] = useState("Exam");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalQuestions, setTotalQuestions] = useState(1);
  const [passScore, setPassScore] = useState(1);
  const [published, setPublished] = useState(false);
  const [questions, setQuestions] = useState([{ ...initialQuestion }]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [chapterOptions, setChapterOptions] = useState([]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const selectedGradeKey = useMemo(() => {
    const gradeValue = String(selectedCourse?.grade || "").trim();
    return gradeValue ? `grade_${gradeValue}` : "";
  }, [selectedCourse]);

  const selectedSubjectKey = useMemo(
    () => String(selectedCourse?.subject || selectedCourse?.name || "").trim().toLowerCase(),
    [selectedCourse]
  );

  useEffect(() => {
    const handleResize = () => {
      const width = getViewportWidth();
      setSidebarOpen(width > 600);
      setIsMobile(width <= 600);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      handleResize();
      return () => window.removeEventListener("resize", handleResize);
    }

    return undefined;
  }, []);

  useEffect(() => {
    const storedTeacher = getStoredTeacher();
    if (!storedTeacher) {
      navigate("/login");
      return;
    }
    setTeacher(storedTeacher);
  }, [navigate]);

  useEffect(() => {
    const resolveSchoolBase = async () => {
      if (!teacher) return;
      setSchoolBaseResolved(false);

      const rawSchoolCode = String(teacher?.schoolCode || "").trim();
      if (!rawSchoolCode) {
        setRtdbBase(RTDB_BASE);
        setSchoolBaseResolved(true);
        return;
      }

      if (rawSchoolCode.startsWith("ET-")) {
        setRtdbBase(`${RTDB_BASE_RAW}/Platform1/Schools/${rawSchoolCode}`);
        setSchoolBaseResolved(true);
        return;
      }

      try {
        const shortCode = rawSchoolCode.toUpperCase();
        const mapRes = await axios.get(`${RTDB_BASE_RAW}/Platform1/schoolCodeIndex/${shortCode}.json`);
        const mappedCode = String(mapRes?.data || "").trim();
        if (mappedCode) {
          setRtdbBase(`${RTDB_BASE_RAW}/Platform1/Schools/${mappedCode}`);
          setSchoolBaseResolved(true);
          return;
        }
      } catch (err) {
        console.error("School code mapping lookup failed:", err);
      }

      try {
        const schoolsRes = await axios.get(`${RTDB_BASE_RAW}/Platform1/Schools.json`);
        const schoolsObj = schoolsRes?.data && typeof schoolsRes.data === "object" ? schoolsRes.data : {};
        const shortCode = rawSchoolCode.toUpperCase();
        const fallbackMatch = Object.entries(schoolsObj).find(([schoolCode, schoolNode]) => {
          const nodeShort = String(
            schoolNode?.schoolInfo?.shortName ||
              schoolNode?.schoolInfo?.shortCode ||
              schoolNode?.schoolCode ||
              ""
          )
            .trim()
            .toUpperCase();
          return nodeShort === shortCode || String(schoolCode || "").toUpperCase().includes(shortCode);
        });

        if (fallbackMatch?.[0]) {
          setRtdbBase(`${RTDB_BASE_RAW}/Platform1/Schools/${fallbackMatch[0]}`);
          setSchoolBaseResolved(true);
          return;
        }
      } catch (err) {
        console.error("School fallback scan failed:", err);
      }

      setRtdbBase(`${RTDB_BASE_RAW}/Platform1/Schools/${rawSchoolCode}`);
      setSchoolBaseResolved(true);
    };

    resolveSchoolBase();
  }, [teacher]);

  useEffect(() => {
    if (!teacher || !schoolBaseResolved || !rtdbBase) return;

    const fetchCourses = async () => {
      setCoursesLoading(true);
      setCourseError("");
      try {
        const context = await getTeacherCourseContext({ teacher, rtdbBase });
        let teacherCourses = (context.courses || []).map((course) => {
          const defaults = parseVirtualCourseFromId(course?.id);
          return {
            ...course,
            id: course?.id || defaults.id,
            subject: course?.subject || course?.name || defaults.subject,
            name: course?.name || course?.subject || defaults.name,
            grade: String(course?.grade || defaults.grade || "").trim(),
            section: String(course?.section || course?.secation || defaults.section || "")
              .trim()
              .toUpperCase(),
          };
        });

        if (!teacherCourses.length) {
          const [coursesRes, courseStatsRes] = await Promise.all([
            axios.get(`${rtdbBase}/Courses.json`).catch(() => ({ data: {} })),
            axios.get(`${rtdbBase}/SchoolExams/CourseStats.json`).catch(() => ({ data: {} })),
          ]);

          const coursesMap = coursesRes.data || {};
          const courseStats = courseStatsRes.data || {};
          const fallbackIds = new Set([
            ...Object.keys(coursesMap),
            ...Object.keys(courseStats),
          ]);

          teacherCourses = Array.from(fallbackIds)
            .filter(Boolean)
            .map((courseId) => {
              const stored = coursesMap?.[courseId] || {};
              const virtual = parseVirtualCourseFromId(courseId);
              const activityScore = Math.max(
                0,
                Number(courseStats?.[courseId]?.totalSubmissions || 0),
                Number(courseStats?.[courseId]?.totalAssessments || 0)
              );
              return {
                ...virtual,
                id: courseId,
                subject: stored.subject || stored.name || virtual.subject,
                name: stored.name || stored.subject || virtual.name,
                grade: String(stored.grade || virtual.grade || "").trim(),
                section: String(stored.section || stored.secation || virtual.section || "").trim().toUpperCase(),
                _activityScore: activityScore,
              };
            })
            .sort((a, b) => (b._activityScore || 0) - (a._activityScore || 0))
            .map(({ _activityScore, ...rest }) => rest);
        }

        setCourses((prev) => (teacherCourses.length ? teacherCourses : prev));
        if (teacherCourses.length > 0) {
          setSelectedCourseId((prev) => {
            if (prev && teacherCourses.some((c) => c.id === prev)) return prev;
            return teacherCourses[0].id;
          });
          setCourseError("");
        } else {
          setCourseError("No assigned courses found for this teacher.");
        }
      } catch (err) {
        console.error("Error fetching teacher courses:", err);
        setCourseError("Failed to load courses. Please try again.");
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [teacher, schoolBaseResolved, rtdbBase]);

  useEffect(() => {
    if (!selectedGradeKey || !selectedSubjectKey) {
      setChapterOptions([]);
      setChapterId("");
      return;
    }

    const fetchChapters = async () => {
      try {
        const snapshot = await get(ref(db, schoolPath(`Curriculum/${selectedGradeKey}/${selectedSubjectKey}/chapters`)));
        const data = snapshot.val() || {};
        const chapters = Object.entries(data).map(([id, val]) => ({ id, title: val?.title || id }));
        setChapterOptions(chapters);

        setChapterId((prev) => {
          if (prev && chapters.some((c) => c.id === prev)) return prev;
          return chapters[0]?.id || "";
        });
      } catch {
        setChapterOptions([]);
        setChapterId("");
      }
    };

    fetchChapters();
  }, [selectedGradeKey, selectedSubjectKey]);

  useEffect(() => {
    if (!selectedCourse) {
      setNewGrade("");
      setNewSubject("");
      return;
    }

    setNewGrade(String(selectedCourse.grade || ""));
    setNewSubject(String(selectedCourse.subject || selectedCourse.name || "").trim().toLowerCase());
  }, [selectedCourse]);

  const handleChapterChange = (idx, field, value) => {
    setNewChapters((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const addChapter = () =>
    setNewChapters((prev) => [...prev, { ...initialChapter, order: prev.length + 1 }]);

  const removeChapter = (idx) => {
    if (newChapters.length === 1) return;
    setNewChapters((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (field === "options") {
        updated[idx].options = { ...updated[idx].options, ...value };
      } else {
        updated[idx][field] = value;
      }
      return updated;
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...initialQuestion }]);
    setTotalQuestions((n) => n + 1);
  };

  const removeQuestion = (idx) => {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    setTotalQuestions((n) => Math.max(1, n - 1));
  };

  const handleCreateCurriculum = async (event) => {
    event.preventDefault();
    setCurriculumSaving(true);
    setCurriculumSuccess("");
    setCurriculumError("");

    try {
      if (!newGrade || !newSubject) throw new Error("Course grade and subject are required");

      const gradeKey = newGrade.startsWith("grade_") ? newGrade : `grade_${newGrade}`;
      const subjectKey = String(newSubject).trim().toLowerCase();
      const chaptersObj = {};

      newChapters.forEach((chapter, index) => {
        if (!chapter.id) throw new Error("Each chapter must include an ID");
        chaptersObj[chapter.id] = {
          ...chapter,
          order: index + 1,
        };
      });

      await update(ref(db, schoolPath(`Curriculum/${gradeKey}/${subjectKey}`)), {
        subjectName: subjectKey,
        totalChapters: newChapters.length,
        chapters: chaptersObj,
      });

      setCurriculumSuccess("Curriculum saved successfully.");
      setNewChapters([{ ...initialChapter }]);
    } catch (err) {
      setCurriculumError(err?.message || "Failed to save curriculum");
    } finally {
      setCurriculumSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      if (!selectedGradeKey || !selectedSubjectKey || !chapterId) {
        throw new Error("Course and chapter are required before saving an assessment");
      }

      const examKey = `${selectedSubjectKey}_${selectedGradeKey}`;
      const questionsObj = {};
      questions.forEach((q, index) => {
        questionsObj[`q_${String(index + 1).padStart(3, "0")}`] = q;
      });

      await set(ref(db, schoolPath(`Exams/${examKey}/${chapterId}`)), {
        durationMinutes: Number(durationMinutes),
        totalQuestions: Number(totalQuestions),
        passScore: Number(passScore),
        published,
        assessmentType,
        questions: questionsObj,
        examId: `${examKey}_${chapterId}`,
      });

      setSuccess(`${assessmentType} saved successfully.`);
    } catch (err) {
      setError(err?.message || "Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page} style={{ "--sidebar-width": "clamp(230px, 16vw, 290px)" }}>
      <div className={styles.mainWrap}>
        <Sidebar
          active="exam"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          teacher={teacher}
          handleLogout={async () => {
            await (window.__gojoTeacherLogout?.() ?? Promise.resolve());
            navigate("/login", { replace: true });
          }}
        />

        <div className={styles.sidebarSpacer} />

        <div className={styles.main} style={{ padding: isMobile ? "0 10px" : "0 18px" }}>
          <div className={styles.shell}>
            <ExamHeader selectedCourse={selectedCourse} />

            <ExamCourseSelect
              selectedCourseId={selectedCourseId}
              setSelectedCourseId={setSelectedCourseId}
              courses={courses}
              coursesLoading={coursesLoading}
              courseError={courseError}
            />

            <ExamCurriculumEditor
              showCurriculumForm={showCurriculumForm}
              setShowCurriculumForm={setShowCurriculumForm}
              isMobile={isMobile}
              newGrade={newGrade}
              setNewGrade={setNewGrade}
              newSubject={newSubject}
              setNewSubject={setNewSubject}
              newChapters={newChapters}
              handleChapterChange={handleChapterChange}
              addChapter={addChapter}
              removeChapter={removeChapter}
              curriculumSaving={curriculumSaving}
              handleCreateCurriculum={handleCreateCurriculum}
              curriculumSuccess={curriculumSuccess}
              curriculumError={curriculumError}
            />

            <ExamAssessmentForm
              isMobile={isMobile}
              selectedCourse={selectedCourse}
              selectedGradeKey={selectedGradeKey}
              selectedSubjectKey={selectedSubjectKey}
              chapterId={chapterId}
              setChapterId={setChapterId}
              assessmentType={assessmentType}
              setAssessmentType={setAssessmentType}
              durationMinutes={durationMinutes}
              setDurationMinutes={setDurationMinutes}
              totalQuestions={totalQuestions}
              setTotalQuestions={setTotalQuestions}
              passScore={passScore}
              setPassScore={setPassScore}
              published={published}
              setPublished={setPublished}
              chapterOptions={chapterOptions}
              questions={questions}
              handleQuestionChange={handleQuestionChange}
              addQuestion={addQuestion}
              removeQuestion={removeQuestion}
              saving={saving}
              handleSubmit={handleSubmit}
              success={success}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Exam;
