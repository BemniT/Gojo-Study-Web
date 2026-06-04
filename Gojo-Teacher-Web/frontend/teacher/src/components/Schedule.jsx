import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../styles/global.css";
import styles from "./schedule/Schedule.module.css";
import ScheduleHero from "./schedule/ScheduleHero";
import ScheduleCourses from "./schedule/ScheduleCourses";
import ScheduleFilters from "./schedule/ScheduleFilters";
import ScheduleDays from "./schedule/ScheduleDays";
import MyScheduleDrawer from "./schedule/MyScheduleDrawer";
import { getRtdbRoot, RTDB_BASE_RAW } from "../api/rtdbScope";
import { getTeacherCourseContext } from "../api/teacherApi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const normalizeSubject = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const parseGradeSection = (rawValue) => {
  const normalized = String(rawValue || "").trim();
  if (!normalized) return { grade: "", section: "" };

  const compact = normalized.replace(/\s+/g, "");
  const digitsMatch = compact.match(/\d+/);
  const grade = digitsMatch ? digitsMatch[0] : "";

  let section = "";
  if (digitsMatch) {
    const sectionPart = compact.slice((digitsMatch.index || 0) + grade.length);
    section = (sectionPart.match(/[A-Za-z]+/)?.[0] || "").toUpperCase();
  }
  if (!section) section = (compact.match(/[A-Za-z]+/)?.[0] || "").toUpperCase();

  return { grade, section };
};

const toClassKey = (grade, section) => `${String(grade || "").trim()}_${String(section || "").trim().toUpperCase()}`;

const buildGradeLabelCandidates = (grade, section) => {
  const normalizedGrade = String(grade || "").trim();
  const normalizedSection = String(section || "").trim().toUpperCase();
  if (!normalizedGrade) return [];

  return [...new Set([
    `Grade ${normalizedGrade}${normalizedSection}`,
    `Grade ${normalizedGrade}${normalizedSection ? ` ${normalizedSection}` : ""}`.trim(),
    `${normalizedGrade}${normalizedSection}`,
    `${normalizedGrade}${normalizedSection ? ` ${normalizedSection}` : ""}`.trim(),
  ].filter(Boolean))];
};

function Timetable() {
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rtdbBase, setRtdbBase] = useState(() => getRtdbRoot());
  const [schoolBaseResolved, setSchoolBaseResolved] = useState(false);

  const [selectedGrade, setSelectedGrade] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  const [selectedDay, setSelectedDay] = useState("All");

  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 600 : true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false);

  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth;
      setSidebarOpen(width > 600);
      setIsMobile(width <= 900);
      if (width <= 900) setRightSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const storedTeacher = JSON.parse(localStorage.getItem("teacher") || "null");
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
        setRtdbBase(getRtdbRoot());
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
      } catch {
        // Fallback scan below handles missing mappings.
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
      } catch {
        // Keep final fallback below.
      }

      setRtdbBase(`${RTDB_BASE_RAW}/Platform1/Schools/${rawSchoolCode}`);
      setSchoolBaseResolved(true);
    };

    resolveSchoolBase();
  }, [teacher]);

  useEffect(() => {
    if (!teacher || !schoolBaseResolved || !rtdbBase) return;

    const fetchWorkspace = async () => {
      setLoading(true);
      setError("");
      try {
        const courseContext = await getTeacherCourseContext({ teacher, rtdbBase });
        const resolvedCourses = Array.isArray(courseContext?.courses) ? courseContext.courses : [];
        const gradeLabelCandidateGroups = [...new Map(
          resolvedCourses
            .map((course) => {
              const candidates = buildGradeLabelCandidates(course?.grade, course?.section || course?.secation);
              const classKey = toClassKey(course?.grade, course?.section || course?.secation);
              return [classKey || candidates.join("|"), candidates];
            })
            .filter(([, candidates]) => candidates.length)
        ).values()];

        let nextSchedule = {};

        if (gradeLabelCandidateGroups.length) {
          const dayEntries = await Promise.all(
            DAYS.map(async (day) => {
              const classEntries = await Promise.all(
                gradeLabelCandidateGroups.map(async (gradeLabels) => {
                  for (const gradeLabel of gradeLabels) {
                    const response = await axios
                      .get(`${rtdbBase}/Schedules/${encodeURIComponent(day)}/${encodeURIComponent(gradeLabel)}.json`)
                      .catch(() => ({ data: null }));
                    const periods = response?.data && typeof response.data === "object" ? response.data : null;
                    if (periods) {
                      return [gradeLabel, periods];
                    }
                  }

                  return null;
                })
              );

              const scopedClasses = Object.fromEntries(classEntries.filter(Boolean));
              return [day, scopedClasses];
            })
          );

          nextSchedule = Object.fromEntries(
            dayEntries.filter(([, classes]) => Object.keys(classes || {}).length)
          );
        } else {
          const scheduleRes = await axios.get(`${rtdbBase}/Schedules.json`).catch(() => ({ data: {} }));
          nextSchedule = scheduleRes.data || {};
        }

        setSchedule(nextSchedule);
        setTeacherCourses(resolvedCourses);
      } catch {
        setError("Failed to load timetable workspace.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [teacher, schoolBaseResolved, rtdbBase]);

  const handleLogout = async () => {
    await (window.__gojoTeacherLogout?.() ?? Promise.resolve());
    navigate("/login", { replace: true });
  };

  const teacherClassKeys = useMemo(() => {
    const set = new Set();
    (teacherCourses || []).forEach((course) => {
      const grade = String(course?.grade || "").trim();
      const section = String(course?.section || course?.secation || "").trim().toUpperCase();
      if (grade && section) set.add(toClassKey(grade, section));
    });
    return set;
  }, [teacherCourses]);

  const subjectsByClassKey = useMemo(() => {
    const map = {};
    (teacherCourses || []).forEach((course) => {
      const grade = String(course?.grade || "").trim();
      const section = String(course?.section || course?.secation || "").trim().toUpperCase();
      const classKey = toClassKey(grade, section);
      const subject = normalizeSubject(course?.subject || course?.name || "");
      if (!classKey) return;
      if (!map[classKey]) map[classKey] = new Set();
      if (subject) map[classKey].add(subject);
    });
    return map;
  }, [teacherCourses]);

  const isTeacherClass = (gradeLabel) => {
    const { grade, section } = parseGradeSection(gradeLabel);
    const classKey = toClassKey(grade, section);

    if (teacherClassKeys.size > 0) return teacherClassKeys.has(classKey);

    const dayKeys = Object.keys(schedule || {});
    return dayKeys.some((day) => {
      const periods = schedule?.[day]?.[gradeLabel] || {};
      return Object.values(periods).some((info) => String(info?.teacherName || "").trim() === String(teacher?.name || "").trim());
    });
  };

  const isTeacherPeriod = (gradeLabel, info) => {
    const teacherNameMatch = String(info?.teacherName || "").trim() === String(teacher?.name || "").trim();
    if (teacherNameMatch) return true;

    if (!teacherClassKeys.size) return false;

    const { grade, section } = parseGradeSection(gradeLabel);
    const classKey = toClassKey(grade, section);
    if (!teacherClassKeys.has(classKey)) return false;

    const scopedSubjects = subjectsByClassKey[classKey] || new Set();
    if (!scopedSubjects.size) return true;

    const subject = normalizeSubject(info?.subject || "");
    return scopedSubjects.has(subject);
  };

  const scopedSchedule = useMemo(() => {
    const next = {};

    Object.entries(schedule || {}).forEach(([day, classes]) => {
      const filteredClasses = Object.fromEntries(
        Object.entries(classes || {}).filter(([gradeLabel]) => isTeacherClass(gradeLabel))
      );
      if (Object.keys(filteredClasses).length) {
        next[day] = filteredClasses;
      }
    });

    return next;
  }, [schedule, teacherCourses, teacher]);

  const teacherSchedule = useMemo(() => {
    const filtered = {};

    Object.entries(scopedSchedule || {}).forEach(([day, classes]) => {
      Object.entries(classes || {}).forEach(([gradeLabel, periods]) => {
        Object.entries(periods || {}).forEach(([periodName, info]) => {
          if (!isTeacherPeriod(gradeLabel, info)) return;
          if (!filtered[day]) filtered[day] = {};
          if (!filtered[day][periodName]) filtered[day][periodName] = [];

          filtered[day][periodName].push({
            class: gradeLabel,
            subject: info?.subject || "-",
            time: info?.time || periodName.match(/\((.*?)\)/)?.[1] || "N/A",
          });
        });
      });
    });

    return filtered;
  }, [scopedSchedule, teacherCourses, teacher]);

  const { gradeOptions, sectionOptions } = useMemo(() => {
    const gradeSet = new Set();
    const sectionSet = new Set();

    Object.values(scopedSchedule || {}).forEach((classes) => {
      Object.keys(classes || {}).forEach((gradeKey) => {
        const { grade, section } = parseGradeSection(gradeKey);
        if (grade) gradeSet.add(grade);
        if (section) sectionSet.add(section);
      });
    });

    const sortedGrades = [...gradeSet].sort((a, b) => Number(a) - Number(b));

    let relevantSections = [...sectionSet];
    if (selectedGrade !== "All") {
      const scopedSet = new Set();
      Object.values(scopedSchedule || {}).forEach((classes) => {
        Object.keys(classes || {}).forEach((gradeKey) => {
          const { grade, section } = parseGradeSection(gradeKey);
          if (grade === selectedGrade && section) scopedSet.add(section);
        });
      });
      relevantSections = [...scopedSet];
    }

    return {
      gradeOptions: ["All", ...sortedGrades],
      sectionOptions: ["All", ...relevantSections.sort((a, b) => a.localeCompare(b))],
    };
  }, [scopedSchedule, selectedGrade]);

  useEffect(() => {
    if (selectedGrade !== "All" && !gradeOptions.includes(selectedGrade)) {
      setSelectedGrade("All");
    }
  }, [gradeOptions, selectedGrade]);

  useEffect(() => {
    if (selectedSection !== "All" && !sectionOptions.includes(selectedSection)) {
      setSelectedSection("All");
    }
  }, [sectionOptions, selectedSection]);

  const visibleDays = useMemo(() => {
    return DAYS.filter((day) => {
      if (selectedDay !== "All" && selectedDay !== day) return false;
      if (!scopedSchedule?.[day]) return false;
      return true;
    });
  }, [selectedDay, scopedSchedule]);

  const summary = useMemo(() => {
    let totalPeriods = 0;
    let myPeriods = 0;
    const classesSet = new Set();

    Object.values(scopedSchedule || {}).forEach((classes) => {
      Object.entries(classes || {}).forEach(([gradeLabel, periods]) => {
        classesSet.add(gradeLabel);
        Object.entries(periods || {}).forEach(([, info]) => {
          totalPeriods += 1;
          if (isTeacherPeriod(gradeLabel, info)) myPeriods += 1;
        });
      });
    });

    return {
      classes: classesSet.size,
      totalPeriods,
      myPeriods,
      activeDays: visibleDays.length,
    };
  }, [scopedSchedule, visibleDays, teacherCourses, teacher]);

  return (
    <div
      className={styles.page}
      style={{
        "--surface-panel": "#ffffff",
        "--surface-accent": "#eff6ff",
        "--surface-muted": "#f8fafc",
        "--surface-strong": "#e2e8f0",
        "--page-bg": "#ffffff",
        "--border-soft": "#e2e8f0",
        "--border-strong": "#cbd5e1",
        "--text-primary": "#0f172a",
        "--text-secondary": "#334155",
        "--text-muted": "#64748b",
        "--accent": "#007AFB",
        "--accent-soft": "#dbeafe",
        "--accent-strong": "#005ec2",
        "--sidebar-width": "clamp(230px, 16vw, 290px)",
      }}
    >
      <div className={styles.mainWrap}>
        <Sidebar
          active="timetable"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          teacher={teacher}
          handleLogout={handleLogout}
        />

        <main className={styles.main} style={{ marginRight: rightSidebarOpen && !isMobile ? 392 : 0 }}>
          <div className={styles.shell}>
            <ScheduleHero selectedDay={selectedDay} summary={summary} />
            <ScheduleCourses teacherCourses={teacherCourses} />
            <ScheduleFilters
              gradeOptions={gradeOptions}
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              sectionOptions={sectionOptions}
              selectedSection={selectedSection}
              setSelectedSection={setSelectedSection}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              days={DAYS}
            />
            <ScheduleDays
              loading={loading}
              error={error}
              visibleDays={visibleDays}
              scopedSchedule={scopedSchedule}
              selectedGrade={selectedGrade}
              selectedSection={selectedSection}
              parseGradeSection={parseGradeSection}
              isTeacherPeriod={isTeacherPeriod}
            />
          </div>
        </main>

        <MyScheduleDrawer
          rightSidebarOpen={rightSidebarOpen}
          setRightSidebarOpen={setRightSidebarOpen}
          loading={loading}
          teacherSchedule={teacherSchedule}
          days={DAYS}
        />
      </div>
    </div>
  );
}

export default Timetable;
