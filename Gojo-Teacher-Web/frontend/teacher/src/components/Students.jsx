import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import {
  FaUsers,
} from "react-icons/fa";
import "../styles/global.css";
import { API_BASE } from "../api/apiConfig";
import { getTeacherContext } from "../api/teacherApi";
import { getRtdbRoot } from "../api/rtdbScope";
import { useTeacherSession } from "../hooks/useTeacherSession";
import { useQuickChat } from "../hooks/useQuickChat";
import { useStudents } from "../hooks/useStudents";
import { useStudentAttendance } from "../hooks/useStudentAttendance";
import { useStudentPerformance } from "../hooks/useStudentPerformance";
import {
  buildChatSummaryPath,
  buildChatSummaryUpdate,
} from "../utils/chatRtdb";
import { formatTime, formatDateLabel } from "../utils/chatHelpers";
import {
  getChatId,
  formatSubjectName,
  computeAge,
  buildStudentConversationsSessionKey,
  normalizeIdentifier,
  findUserByIdentifiers,
  collectStudentParentLinks,
  resolveStudentParentInfo,
} from "../utils/studentHelpers";
import { resolveProfileImage } from "../utils/profileImage";
import {
  clearCachedChatSummary,
  fetchTeacherConversationSummaries,
  loadParentRecordsByIds,
  loadUserRecordsByIds,
  readSessionResource,
  resolveTeacherSchoolCode,
  writeSessionResource,
} from "../utils/teacherData";
import ProfileAvatar from "./ProfileAvatar";
import StudentList from "./students/StudentList";
import StudentDetailPanel from "./students/StudentDetailPanel";
import QuickChatPanel from "./students/QuickChatPanel";
import styles from "./students/Students.module.css";
import { fetchCachedJson } from "../utils/rtdbCache";

const STUDENT_CONVERSATIONS_SESSION_TTL_MS = 5 * 60 * 1000;
const QUICK_CHAT_HISTORY_LIMIT = 50;
const ATTENDANCE_RECENT_DATE_LIMITS = {
  daily: 45,
  weekly: 90,
  monthly: 180,
};

const formatQuarterLabel = (quarterKey) => {
  const quarterNumber = parseInt(String(quarterKey).replace(/^q/i, ""), 10);
  return Number.isFinite(quarterNumber)
    ? `Quarter ${quarterNumber}`
    : String(quarterKey).toUpperCase();
};

const chipStyle = (active) => ({
  padding: "6px 12px",
  borderRadius: "999px",
  background: active ? "var(--accent-strong)" : "var(--surface-accent)",
  color: active ? "#fff" : "var(--accent-strong)",
  cursor: "pointer",
  border: active ? "1px solid var(--accent-strong)" : "1px solid var(--border-strong)",
  fontSize: "11px",
  fontWeight: 700,
  whiteSpace: "nowrap",
  transition: "all 0.2s ease",
});

const StudentItem = ({ student, selected, onClick, number }) => (
  <div
    onClick={() => onClick(student)}
    className={`${styles.studentRow} ${selected ? styles.studentRowSelected : ""}`}
  >
    <div className={`${styles.studentIndex} ${selected ? styles.studentIndexSelected : ""}`}>{number}</div>

    <ProfileAvatar
      src={student.profileImage}
      name={student.name}
      alt={student.name}
      className={`${styles.studentAvatar} ${selected ? styles.studentAvatarSelected : ""}`}
    />
    <div>
      <h3 className={styles.studentName}>{student.name}</h3>
      <p className={styles.studentMeta}>
        Grade {student.grade} - Section {student.section}
      </p>
    </div>
  </div>
);

function StudentsPage() {
  // Responsive sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 600 : true);
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== "undefined" ? window.innerWidth < window.innerHeight : false
  );
  // Keep sidebar closed by default on phones and open on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 600) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleOrientationResize = () => {
      setIsPortrait(window.innerWidth < window.innerHeight);
    };

    window.addEventListener("resize", handleOrientationResize);
    return () => window.removeEventListener("resize", handleOrientationResize);
  }, []);

  const [error, setError] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sections, setSections] = useState([]);

  const [studentTab, setStudentTab] = useState("details");

  const [teacherInfo, setTeacherInfo] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState("daily");
  const [assignmentsData, setAssignmentsData] = useState({});
  const [teachersData, setTeachersData] = useState({});
  const [usersData, setUsersData] = useState({});
  const [parentsData, setParentsData] = useState({});
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [teacherNotes, setTeacherNotes] = useState([]);
  const [newTeacherNote, setNewTeacherNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  // default
  const [marksData, setMarksData] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentChatOpen, setStudentChatOpen] = useState(false);
  const [quickChatTab, setQuickChatTab] = useState("student");
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const userRecordCacheRef = useRef(new Map());
  const parentRecordCacheRef = useRef(new Map());
  const teacherRecordCacheRef = useRef(new Map());
  const { teacher, teacherUserId, teacherSchoolCode } = useTeacherSession();
  const [performance, setPerformance] = useState([]);
  const [attendanceView, setAttendanceView] = useState("daily");
  const [attendanceCourseFilter, setAttendanceCourseFilter] = useState("All");
  const [expandedCards, setExpandedCards] = useState({});
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeQuarterViews, setActiveQuarterViews] = useState({});

  const [courses, setCourses] = useState([]);

  const [activeSemester, setActiveSemester] = useState("semester2");

  const [studentMarks, setStudentMarks] = useState({});
// state: attendance entries for the selected student (normalized)
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  // Refs for posts (for scrolling/highlighting)
  const postRefs = useRef({});
  const navigate = useNavigate();

  // Messenger states (same behavior as Dashboard)
  const [showMessenger, setShowMessenger] = useState(false);
  const [conversations, setConversations] = useState([]); // only conversations that have unread messages for me
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState("");
  const lastConversationRefreshMessageKeyRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    const resolveSchoolCode = async () => {
      if (!teacherSchoolCode) {
        setResolvedSchoolCode("");
        return;
      }

      const resolved = await resolveTeacherSchoolCode(teacherSchoolCode);
      if (!cancelled) {
        setResolvedSchoolCode(resolved);
      }
    };

    resolveSchoolCode();

    return () => {
      cancelled = true;
    };
  }, [teacherSchoolCode]);

  useEffect(() => {
    if (!resolvedSchoolCode) return;

    if (String(teacher?.schoolCode || "") !== resolvedSchoolCode) {
      localStorage.setItem(
        "teacher",
        JSON.stringify({
          ...(teacher || {}),
          schoolCode: resolvedSchoolCode,
        })
      );
    }

    setTeacherInfo((prev) => (prev ? { ...prev, schoolCode: resolvedSchoolCode } : prev));
  }, [resolvedSchoolCode, teacher]);

  const rtdbBase = useMemo(() => {
    return getRtdbRoot();
  }, [resolvedSchoolCode]);

  const {
    quickChatTarget,
    setQuickChatTarget,
    messages,
    newMessageText,
    setNewMessageText,
    quickChatLoading,
    quickChatLoadingOlder,
    quickChatHasOlder,
    sendMessage,
    loadOlderMessages,
    quickChatMessagesRef,
    quickChatScrollRestoreRef,
  } = useQuickChat({
    teacherUserId,
    resolvedSchoolCode,
    rtdbBase,
  });

  const {
    students: fetchedStudents,
    loadingStudents,
    gradeSections: assignedGradeSections,
  } = useStudents({
    teacherUserId,
    resolvedSchoolCode,
    teacherSchoolCode,
    rtdbBase,
    selectedGrade,
    selectedSection,
    teacher: teacherInfo,
  });

  const {
    attendanceRecords,
    attendanceLoading,
    attendanceSummary,
  } = useStudentAttendance({
    selectedStudent,
    resolvedSchoolCode,
    rtdbBase,
  });

  const {
    performanceLoading: marksLoading,
    studentGrades: studentMarksFlattened,
  } = useStudentPerformance({
    selectedStudent,
    teacherUserId,
    resolvedSchoolCode,
  });

  const cacheUserRecord = (recordKey, userRecord) => {
    if (!userRecord || typeof userRecord !== "object") return;

    [recordKey, userRecord?.userId, userRecord?.username]
      .map(normalizeIdentifier)
      .filter(Boolean)
      .forEach((key) => {
        userRecordCacheRef.current.set(key, userRecord);
      });
  };

  const cacheParentRecord = (recordKey, parentRecord) => {
    if (!parentRecord || typeof parentRecord !== "object") return;

    [recordKey, parentRecord?.parentId, parentRecord?.userId]
      .map(normalizeIdentifier)
      .filter(Boolean)
      .forEach((key) => {
        parentRecordCacheRef.current.set(key, parentRecord);
      });
  };

  const cacheTeacherRecord = (recordKey, teacherRecord) => {
    if (!teacherRecord || typeof teacherRecord !== "object") return;

    [recordKey, teacherRecord?.teacherId, teacherRecord?.teacherKey, teacherRecord?.userId]
      .map(normalizeIdentifier)
      .filter(Boolean)
      .forEach((key) => {
        teacherRecordCacheRef.current.set(key, teacherRecord);
      });
  };

  const closeQuickChat = () => {
    setChatOpen(false);
    setQuickChatTarget(null);
    setQuickChatTab("student");
  };

  const openQuickChat = (target, tab = "student") => {
    const targetUserId = normalizeIdentifier(target?.userId);
    if (!targetUserId) return;

    setQuickChatTarget({
      ...target,
      userId: targetUserId,
      type: tab,
    });
    setQuickChatTab(tab);
    setChatOpen(true);
  };

  const loadUsersByIds = async (userIds = []) => {
    const normalizedUserIds = [...new Set(userIds.map(normalizeIdentifier).filter(Boolean))];
    if (!normalizedUserIds.length) return {};

    const schoolCode = resolvedSchoolCode || teacherSchoolCode;

    const cachedUsers = {};
    const missingUserIds = [];

    normalizedUserIds.forEach((userId) => {
      const cachedRecord = userRecordCacheRef.current.get(userId) || usersData?.[userId] || null;
      if (cachedRecord) {
        cachedUsers[userId] = cachedRecord;
        cacheUserRecord(userId, cachedRecord);
        return;
      }
      missingUserIds.push(userId);
    });

    if (!missingUserIds.length) return cachedUsers;

    const fetchedUsers = await loadUserRecordsByIds({
      rtdbBase,
      schoolCode,
      userIds: missingUserIds,
    });

    Object.entries(fetchedUsers || {}).forEach(([userId, userRecord]) => {
      if (!userRecord) return;
      cacheUserRecord(userId, userRecord);
    });

    if (Object.keys(fetchedUsers).length) {
      setUsersData((previousUsers) => ({
        ...(previousUsers || {}),
        ...fetchedUsers,
      }));
    }

    return {
      ...cachedUsers,
      ...fetchedUsers,
    };
  };

  const loadTeachersByIds = async (teacherIds = []) => {
    const normalizedTeacherIds = [...new Set(teacherIds.map(normalizeIdentifier).filter(Boolean))];
    if (!normalizedTeacherIds.length) return {};

    const cachedTeachers = {};
    const missingTeacherIds = [];

    normalizedTeacherIds.forEach((teacherId) => {
      const cachedRecord = teacherRecordCacheRef.current.get(teacherId) || teachersData?.[teacherId] || null;
      if (cachedRecord) {
        cachedTeachers[teacherId] = cachedRecord;
        cacheTeacherRecord(teacherId, cachedRecord);
        return;
      }
      missingTeacherIds.push(teacherId);
    });

    if (!missingTeacherIds.length) return cachedTeachers;

    const fullTeachersNode = await fetchCachedJson(`${rtdbBase}/Teachers.json`, {
      ttlMs: 5 * 60 * 1000,
      fallbackValue: {},
    });

    const fetchedEntries = await Promise.all(
      missingTeacherIds.map(async (teacherId) => {
        const directRecord = await fetchCachedJson(`${rtdbBase}/Teachers/${encodeURIComponent(teacherId)}.json`, {
          ttlMs: 5 * 60 * 1000,
          fallbackValue: null,
        });
        if (directRecord && typeof directRecord === "object" && !Array.isArray(directRecord)) {
          return [teacherId, directRecord];
        }

        const matchedTeacher = Object.entries(fullTeachersNode || {}).find(([recordKey, teacherRecord]) => {
          const refs = [recordKey, teacherRecord?.teacherId, teacherRecord?.teacherKey, teacherRecord?.userId]
            .map(normalizeIdentifier)
            .filter(Boolean);
          return refs.includes(teacherId);
        });

        return [teacherId, matchedTeacher?.[1] || null];
      })
    );

    const fetchedTeachers = {};
    fetchedEntries.forEach(([teacherId, teacherRecord]) => {
      if (!teacherRecord) return;
      fetchedTeachers[teacherId] = teacherRecord;
      cacheTeacherRecord(teacherId, teacherRecord);
    });

    if (Object.keys(fetchedTeachers).length) {
      setTeachersData((previousTeachers) => ({
        ...(previousTeachers || {}),
        ...fetchedTeachers,
      }));
    }

    return {
      ...cachedTeachers,
      ...fetchedTeachers,
    };
  };

  const loadParentsForStudent = async (student, usersObj = {}) => {
    if (!student) return {};

    const schoolCode = resolvedSchoolCode || teacherSchoolCode;

    const parentLinks = collectStudentParentLinks(
      student,
      findUserByIdentifiers({ ...(usersData || {}), ...(usersObj || {}) }, student?.userId) || null
    );
    const parentIdentifiers = [...new Set(
      parentLinks.flatMap((link) => [link?.parentId, link?.userId]).map(normalizeIdentifier).filter(Boolean)
    )];

    if (!parentIdentifiers.length) return {};

    const cachedParents = {};
    const missingParentIdentifiers = [];

    parentIdentifiers.forEach((parentIdentifier) => {
      const cachedRecord = parentRecordCacheRef.current.get(parentIdentifier) || parentsData?.[parentIdentifier] || null;
      if (cachedRecord) {
        cachedParents[parentIdentifier] = cachedRecord;
        cacheParentRecord(parentIdentifier, cachedRecord);
        return;
      }
      missingParentIdentifiers.push(parentIdentifier);
    });

    if (!missingParentIdentifiers.length) return cachedParents;

    const fetchedParents = await loadParentRecordsByIds({
      rtdbBase,
      schoolCode,
      parentIds: missingParentIdentifiers,
    });

    Object.entries(fetchedParents || {}).forEach(([parentIdentifier, parentRecord]) => {
      if (!parentRecord) return;
      cacheParentRecord(parentIdentifier, parentRecord);
    });

    if (Object.keys(fetchedParents).length) {
      setParentsData((previousParents) => ({
        ...(previousParents || {}),
        ...fetchedParents,
      }));
    }

    return {
      ...cachedParents,
      ...fetchedParents,
    };
  };

  const loadAttendanceByCourseIds = async (courseIds = []) => {
    const normalizedCourseIds = [...new Set(courseIds.map(normalizeIdentifier).filter(Boolean))];
    if (!normalizedCourseIds.length) return {};

    const schoolScopeKey = normalizeIdentifier(resolvedSchoolCode || teacherSchoolCode || "default");
    const attendanceDateLimit = ATTENDANCE_RECENT_DATE_LIMITS[attendanceView] || ATTENDANCE_RECENT_DATE_LIMITS.weekly;
    const cachedAttendance = {};
    const missingCourseIds = [];

    normalizedCourseIds.forEach((courseId) => {
      const cacheKey = `${schoolScopeKey}::${courseId}::${attendanceDateLimit}`;
      if (attendanceCourseCacheRef.current.has(cacheKey)) {
        cachedAttendance[courseId] = attendanceCourseCacheRef.current.get(cacheKey) || {};
        return;
      }
      missingCourseIds.push(courseId);
    });

    if (!missingCourseIds.length) return cachedAttendance;

    const fetchedEntries = await Promise.all(
      missingCourseIds.map(async (courseId) => {
        const response = await axios.get(`${rtdbBase}/Attendance/${encodeURIComponent(courseId)}.json`, {
          params: {
            orderBy: JSON.stringify("$key"),
            limitToLast: attendanceDateLimit,
          },
        }).catch(() => ({ data: {} }));
        const courseAttendance = response?.data && typeof response.data === "object" ? response.data : {};
        return [courseId, courseAttendance || {}];
      })
    );

    const fetchedAttendance = {};
    fetchedEntries.forEach(([courseId, courseAttendance]) => {
      const cacheKey = `${schoolScopeKey}::${courseId}::${attendanceDateLimit}`;
      attendanceCourseCacheRef.current.set(cacheKey, courseAttendance || {});
      fetchedAttendance[courseId] = courseAttendance || {};
    });

    return {
      ...cachedAttendance,
      ...fetchedAttendance,
    };
  };

  useEffect(() => {
    Object.entries(usersData || {}).forEach(([recordKey, userRecord]) => {
      cacheUserRecord(recordKey, userRecord);
    });
  }, [usersData]);

  useEffect(() => {
    Object.entries(parentsData || {}).forEach(([recordKey, parentRecord]) => {
      cacheParentRecord(recordKey, parentRecord);
    });
  }, [parentsData]);

  useEffect(() => {
    Object.entries(teachersData || {}).forEach(([recordKey, teacherRecord]) => {
      cacheTeacherRecord(recordKey, teacherRecord);
    });
  }, [teachersData]);

  useEffect(() => {
    const storedTeacher = JSON.parse(localStorage.getItem("teacher"));
    if (!storedTeacher) {
      navigate("/login"); // redirect if not logged in
      return;
    }
    const bootstrapTeacher = async () => {
      let nextTeacher = storedTeacher;

      if (!storedTeacher.schoolCode) {
        const context = await getTeacherContext({
          teacherId: storedTeacher.teacherId || storedTeacher.teacherKey || storedTeacher.username,
          userId: storedTeacher.userId,
        });

        if (context.success && context.teacher) {
          nextTeacher = { ...storedTeacher, ...context.teacher };
          localStorage.setItem("teacher", JSON.stringify(nextTeacher));
        }
      }

      fetchConversations(nextTeacher);
    };

    bootstrapTeacher();
  }, [navigate]);

  // ---------------- LOAD TEACHER INFO ----------------
  useEffect(() => {
    const storedTeacher = JSON.parse(localStorage.getItem("teacher"));
    if (!storedTeacher) {
      navigate("/login");
      return;
    }
    const bootstrapTeacherInfo = async () => {
      if (storedTeacher.schoolCode) {
        setTeacherInfo(storedTeacher);
        return;
      }

      const context = await getTeacherContext({
        teacherId: storedTeacher.teacherId || storedTeacher.teacherKey || storedTeacher.username,
        userId: storedTeacher.userId,
      });

      if (context.success && context.teacher) {
        const nextTeacher = { ...storedTeacher, ...context.teacher };
        localStorage.setItem("teacher", JSON.stringify(nextTeacher));
        setTeacherInfo(nextTeacher);
        return;
      }

      setTeacherInfo(storedTeacher);
      setError("Teacher school context is missing. Log in again if students stay empty.");
    };

    bootstrapTeacherInfo();
  }, [navigate]);

  // ---------------- FETCH NOTIFICATIONS (ENRICHED WITH ADMIN INFO) ----------------
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${API_BASE}/get_posts`);
        let postsData = res.data || [];
        if (!Array.isArray(postsData) && typeof postsData === "object") {
          postsData = Object.values(postsData);
        }

        // Get teacher from localStorage so we know who's seen what
        const teacher = JSON.parse(localStorage.getItem("teacher"));
        const seenPosts = getSeenPosts(teacher?.userId);

        const latest = postsData
          .slice()
          .sort((a, b) => {
            const ta = a.time ? new Date(a.time).getTime() : 0;
            const tb = b.time ? new Date(b.time).getTime() : 0;
            return tb - ta;
          })
          .filter((post) => post.postId && !seenPosts.includes(post.postId))
          .slice(0, 5)
          .map((post) => ({
            id: post.postId,
            title: post.message?.substring(0, 50) || "Untitled post",
            adminName: post.adminName || "Admin",
            adminProfile: post.adminProfile || "/default-profile.png",
          }));

        setNotifications(latest);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
  }, []);

  // --- 3. Handler to remove notification after clicked (and mark seen) ---
  const handleNotificationClick = (postId) => {
    if (!teacher || !postId) return;
    // Save to localStorage
    saveSeenPost(teacher.userId, postId);
    // Remove from UI right away
    setNotifications(prev => prev.filter((n) => n.id !== postId));
    setShowNotifications(false); // Optionally close the notification panel
  };

  function getSeenPosts(teacherId) {
    return JSON.parse(localStorage.getItem(`seen_posts_${teacherId}`)) || [];
  }

  function saveSeenPost(teacherId, postId) {
    const seen = getSeenPosts(teacherId);
    if (!seen.includes(postId)) {
      localStorage.setItem(`seen_posts_${teacherId}`, JSON.stringify([...seen, postId]));
    }
  }

  // ---------------- MESSENGER FUNCTIONS (same behavior as Dashboard) ----------------
  const fetchConversations = useCallback(async (currentTeacher = teacher, { force = false } = {}) => {
    try {
      const t = currentTeacher || JSON.parse(localStorage.getItem("teacher"));
      if (!t || !t.userId || !rtdbBase) {
        setConversations([]);
        return;
      }

      const cacheKey = buildStudentConversationsSessionKey(resolvedSchoolCode || t.schoolCode, t.userId);
      if (!force) {
        const cachedConversations = readSessionResource(cacheKey, {
          ttlMs: STUDENT_CONVERSATIONS_SESSION_TTL_MS,
        });
        if (Array.isArray(cachedConversations)) {
          setConversations(cachedConversations);
          return;
        }
      }

      const convs = await fetchTeacherConversationSummaries({
        rtdbBase,
        schoolCode: resolvedSchoolCode || t.schoolCode,
        teacherUserId: t.userId,
        unreadOnly: true,
      });

      setConversations(convs);
      writeSessionResource(cacheKey, convs);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setConversations([]);
    }
  }, [teacher, rtdbBase, resolvedSchoolCode]);

  const selectedTab = quickChatTab;

  useEffect(() => {
    const handleVisibilityRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      void fetchConversations(undefined, { force: true });
    };

    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [fetchConversations]);

  useEffect(() => {
    void fetchConversations(undefined, { force: true });
  }, [selectedTab, fetchConversations]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    const latestMessageKey = String(latestMessage?.id || latestMessage?.messageId || "").trim();
    if (!latestMessageKey) return;

    if (!lastConversationRefreshMessageKeyRef.current) {
      lastConversationRefreshMessageKeyRef.current = latestMessageKey;
      return;
    }

    if (lastConversationRefreshMessageKeyRef.current === latestMessageKey) {
      return;
    }

    lastConversationRefreshMessageKeyRef.current = latestMessageKey;
    void fetchConversations(undefined, { force: true });
  }, [messages, fetchConversations]);

  const handleMessengerToggle = async () => {
    setShowMessenger((s) => !s);
    await fetchConversations();
  };

  const handleOpenConversation = async (conv, index) => {
    if (!teacher || !conv) return;
    const { chatId, contact } = conv;

    // navigate to AllChat, pass full contact and chatId
    navigate("/all-chat", { state: { contact, chatId, tab: "student" } });

    // clear unread in RTDB for this teacher
    try {
      await axios.patch(
        `${rtdbBase}/${buildChatSummaryPath(teacher.userId, chatId)}.json`,
        buildChatSummaryUpdate({
          chatId,
          otherUserId: contact?.userId,
          unreadCount: 0,
          lastMessageSeen: true,
          lastMessageSeenAt: Date.now(),
        })
      );
      clearCachedChatSummary({
        rtdbBase,
        chatId,
        teacherUserId: teacher.userId,
      });
    } catch (err) {
      console.error("Failed to clear unread in DB:", err);
    }

    // remove from UI
    setConversations((prev) => prev.filter((_, i) => i !== index));
    setShowMessenger(false);
  };

  const totalUnreadMessages = conversations.reduce((sum, c) => sum + (c.unreadForMe || 0), 0);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const studentMatchesFilters = useCallback((student) => {
    if (selectedGrade !== "All" && student.grade !== selectedGrade) return false;
    if (selectedSection !== "All" && student.section !== selectedSection) return false;
    if (!normalizedSearch) return true;

    const haystack = [
      student.name,
      student.studentId,
      student.userId,
      student.email,
      student.grade,
      student.section,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  }, [normalizedSearch, selectedGrade, selectedSection]);
  const allStudents = fetchedStudents;
  const filteredStudents = allStudents.filter(studentMatchesFilters);
  const paginatedStudents = filteredStudents;
  const isLoading = loadingStudents;
  const isError = false;
  const queryError = null;
  const goNext = () => {};
  const hasMore = false;
  const isLoadingNext = false;

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // When user picks a student, set immediate fallback details (so UI won't crash),
  // then fetch Users node and resolve authoritative details (phone/gender/email/parent/dob->age).
  useEffect(() => {
    if (!selectedStudent) {
      setSelectedStudentDetails(null);
      return;
    }

    const fallbackParentInfo = resolveStudentParentInfo({
      student: selectedStudent,
      usersObj: usersData || {},
    });

    // immediate fallback derived from selectedStudent to avoid UI errors
    const fallback = {
      fullName: selectedStudent.name || "—",
      phone: selectedStudent.phone || selectedStudent.raw?.phone || "—",
      gender: selectedStudent.gender || selectedStudent.raw?.gender || "—",
      email: selectedStudent.email || "—",
      grade: selectedStudent.grade || "—",
      section: selectedStudent.section || "—",
      parentName:
        fallbackParentInfo?.parentName ||
        selectedStudent.parentName ||
        selectedStudent.raw?.parentName ||
        "—",
      parentPhone:
        fallbackParentInfo?.parentPhone ||
        selectedStudent.parentPhone ||
        selectedStudent.raw?.parentPhone ||
        "—",
      parentId: fallbackParentInfo?.parentId || selectedStudent.parentId || null,
      parentUserId: fallbackParentInfo?.parentUserId || selectedStudent.parentUserId || null,
      parentProfileImage:
        fallbackParentInfo?.parentProfileImage || selectedStudent.parentProfileImage || "/default-profile.png",
      dob: selectedStudent.dob || selectedStudent.raw?.dob || "—",
      age: selectedStudent.age ?? computeAge(selectedStudent.dob || selectedStudent.raw?.dob) ?? "—",
      profileImage: resolveProfileImage(
        selectedStudent.profileImage,
        selectedStudent.raw?.profileImage,
        selectedStudent.raw?.basicStudentInformation?.studentPhoto,
        selectedStudent.raw?.studentPhoto
      ),
    };

    setSelectedStudentDetails(fallback);

    let cancelled = false;
    const loadDetails = async () => {
      try {
        let usersObj = usersData || {};
        if (!findUserByIdentifiers(usersObj, selectedStudent.userId)) {
          const fetchedUsers = await loadUsersByIds([selectedStudent.userId]);
          usersObj = {
            ...(usersObj || {}),
            ...(fetchedUsers || {}),
          };
        }

        const userRec = findUserByIdentifiers(usersObj, selectedStudent.userId) || {};
        const parentInfo = resolveStudentParentInfo({
          student: selectedStudent,
          usersObj,
        });

        const phone = userRec?.phone || selectedStudent.phone || selectedStudent.raw?.phone || "—";
        const gender = userRec?.gender || selectedStudent.gender || selectedStudent.raw?.gender || "—";
        const email = userRec?.email || selectedStudent.email || "—";
        const dob = userRec?.dob || userRec?.birthDate || selectedStudent.dob || selectedStudent.raw?.dob || null;
        const age = computeAge(dob) ?? selectedStudent.age ?? "—";

        const details = {
          fullName: userRec?.name || selectedStudent.name || "—",
          phone,
          gender,
          email,
          grade: selectedStudent.grade || "—",
          section: selectedStudent.section || "—",
          parentId: parentInfo?.parentId || null,
          parentName:
            parentInfo?.parentName ||
            selectedStudent.raw?.parentName ||
            selectedStudent.parentName ||
            "—",
          parentPhone:
            parentInfo?.parentPhone ||
            selectedStudent.raw?.parentPhone ||
            selectedStudent.parentPhone ||
            "—",
          parentUserId: parentInfo?.parentUserId || null,
          parentProfileImage:
            parentInfo?.parentProfileImage ||
            selectedStudent?.raw?.parentProfileImage ||
            selectedStudent?.parentProfileImage ||
            "/default-profile.png",
          dob: dob || "—",
          age,
          profileImage: resolveProfileImage(
            userRec?.profileImage,
            userRec?.profile,
            userRec?.avatar,
            selectedStudent.profileImage,
            selectedStudent.raw?.profileImage,
            selectedStudent.raw?.basicStudentInformation?.studentPhoto,
            selectedStudent.raw?.studentPhoto
          ),
          userRec,
          parentRec: parentInfo?.parentRec || null,
          parentUserRec: parentInfo?.parentUserRec || null,
        };

        if (!cancelled) setSelectedStudentDetails(details);
      } catch (err) {
        console.error("Failed to derive student details", err);
        // keep fallback already set
      }
    };

    loadDetails();
    return () => { cancelled = true; };
  }, [selectedStudent, usersData, rtdbBase]);

  // Ensure parent info is resolved from Parents node if not already present
  useEffect(() => {
    if (!selectedStudent) return;
    let cancelled = false;

    const resolveParent = async () => {
      try {
        let usersObj = usersData || {};
        if (!findUserByIdentifiers(usersObj, selectedStudent.userId)) {
          const fetchedStudentUsers = await loadUsersByIds([selectedStudent.userId]);
          usersObj = {
            ...(usersObj || {}),
            ...(fetchedStudentUsers || {}),
          };
        }

        const parentsObj = await loadParentsForStudent(selectedStudent, usersObj);
        const parentUserIds = Object.values(parentsObj || {})
          .map((parentRecord) => normalizeIdentifier(parentRecord?.userId))
          .filter(Boolean);

        if (parentUserIds.length) {
          const fetchedParentUsers = await loadUsersByIds(parentUserIds);
          usersObj = {
            ...(usersObj || {}),
            ...(fetchedParentUsers || {}),
          };
        }

        const parentInfo = resolveStudentParentInfo({
          student: selectedStudent,
          usersObj,
          parentsObj,
        });

        if (!cancelled) {
          setSelectedStudentDetails((prev) => ({
            ...(prev || {}),
            parentId: parentInfo?.parentId || prev?.parentId || null,
            parentName: parentInfo?.parentName || prev?.parentName || "—",
            parentPhone: parentInfo?.parentPhone || prev?.parentPhone || "—",
            parentUserId: parentInfo?.parentUserId || prev?.parentUserId || null,
            parentProfileImage: resolveProfileImage(
              parentInfo?.parentProfileImage,
              prev?.parentProfileImage
            ),
            parentRec: parentInfo?.parentRec || prev?.parentRec || null,
            parentUserRec: parentInfo?.parentUserRec || prev?.parentUserRec || null,
          }));
        }
      } catch (err) {
        console.error("Error resolving parent info:", err);
      }
    };

    resolveParent();
    return () => (cancelled = true);
  }, [selectedStudent, rtdbBase, usersData]);

  useEffect(() => {
    if (selectedGrade === "All") {
      setSections([]);
      setSelectedSection("All");
    } else {
      const gradeSections = [
        ...new Set(
          allStudents.filter((s) => s.grade === selectedGrade).map((s) => s.section)
        ),
      ];
      setSections(gradeSections);

      if (!gradeSections.length) {
        setSelectedSection("All");
      } else if (selectedSection !== "All" && !gradeSections.includes(selectedSection)) {
        setSelectedSection(gradeSections[0]);
      }
    }
  }, [selectedGrade, allStudents, selectedSection]);

  const allFilteredStudents = filteredStudents;
  const displayedStudents = paginatedStudents;
  const studentListError = isError
    ? (queryError?.message || error || "Failed to load students")
    : error;

  const grades = [...new Set(allStudents.map((s) => s.grade))].sort();
  const assignedGrades = [...new Set(assignedGradeSections.map((item) => item.grade))].sort((leftGrade, rightGrade) => {
    const numericDiff = Number(leftGrade) - Number(rightGrade);
    if (!Number.isNaN(numericDiff) && numericDiff !== 0) return numericDiff;
    return String(leftGrade).localeCompare(String(rightGrade));
  });
  const assignedSectionsForSelectedGrade =
    selectedGrade === "All"
      ? []
      : [...new Set(
          assignedGradeSections
            .filter((item) => String(item.grade) === String(selectedGrade))
            .map((item) => item.section)
        )].sort();
  const selectedFilterLabel =
    selectedGrade === "All"
      ? "All grades"
      : selectedSection === "All"
      ? `Grade ${selectedGrade} (select section)`
      : `Grade ${selectedGrade} - Section ${selectedSection}`;

  const handleSelectAllGrades = () => {
    setSelectedGrade("All");
    setSelectedSection("All");
  };

  const handleSelectGrade = (gradeValue) => {
    const firstSectionForGrade = assignedGradeSections
      .filter((item) => String(item.grade) === String(gradeValue))
      .map((item) => item.section)
      .find(Boolean);

    setSelectedGrade(gradeValue);
    setSelectedSection(firstSectionForGrade || "All");
  };

  const handleSelectAllSections = () => {
    setSelectedSection("All");
  };

  const handleSelectSection = (sectionValue) => {
    setSelectedSection(sectionValue);
  };

  const attendanceBySubject = attendanceSummary.attendanceBySubject || {};
  const getProgress = attendanceSummary.getProgress;
  const getLatestRecordDate = attendanceSummary.getLatestRecordDate;

  const toggleExpand = (key) => {
    setExpandedCards((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const attendanceTabProps = {
    selectedStudent,
    attendanceLoading,
    attendanceView,
    setAttendanceView,
    attendanceBySubject,
    attendanceCourseFilter,
    attendanceSummary,
    getLatestRecordDate,
    getProgress,
    toggleExpand,
    expandedCards,
    formatSubjectName,
  };

  const handleLogout = async () => {
    await (window.__gojoTeacherLogout?.() ?? Promise.resolve());
    navigate("/login", { replace: true });
  };

  const availableSemesters = useMemo(() => {
    const semesters = new Set();

    Object.values(studentMarksFlattened || {}).forEach((studentCourseData) => {
      if (!studentCourseData || typeof studentCourseData !== "object") return;
      Object.keys(studentCourseData).forEach((key) => {
        if (/^semester\d+$/i.test(String(key || ""))) {
          semesters.add(String(key));
        }
      });
    });

    return [...semesters].sort((leftSemester, rightSemester) => {
      const leftNumber = parseInt(String(leftSemester).replace(/\D+/g, ""), 10) || 0;
      const rightNumber = parseInt(String(rightSemester).replace(/\D+/g, ""), 10) || 0;
      return leftNumber - rightNumber;
    });
  }, [studentMarksFlattened]);

  useEffect(() => {
    if (!availableSemesters.length) return;
    if (!availableSemesters.includes(activeSemester)) {
      setActiveSemester(availableSemesters[0]);
    }
  }, [activeSemester, availableSemesters]);

  useEffect(() => {
    setActiveQuarterViews({});
  }, [selectedStudent?.userId]);

  const semesterTabs = availableSemesters.length
    ? availableSemesters
    : ["semester1", "semester2"];

  const performanceTabProps = {
    semesterTabs,
    activeSemester,
    setActiveSemester,
    marksLoading,
    studentMarksFlattened,
    availableSemesters,
    activeQuarterViews,
    setActiveQuarterViews,
    formatQuarterLabel,
  };

  const statusColor = (status) => (status === "present" ? "#34a853" : status === "absent" ? "#ea4335" : "#fbbc05");

  // ---------------- teacher note ----------------
  useEffect(() => {
    if (!selectedStudent?.userId) return;

    async function fetchTeacherNotes() {
      try {
        const res = await axios.get(
          `${rtdbBase}/StudentNotes/${selectedStudent?.userId}.json`
        );

        if (!res.data) {
          setTeacherNotes([]);
          return;
        }

        const notesArr = Object.entries(res.data).map(([id, note]) => ({
          id,
          ...note,
        }));

        // newest first
        notesArr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setTeacherNotes(notesArr);
      } catch (err) {
        console.error("Failed to fetch teacher notes", err);
        setTeacherNotes([]);
      }
    }

    fetchTeacherNotes();
  }, [selectedStudent]);

  const saveTeacherNote = async () => {
    if (!newTeacherNote.trim() || !teacherInfo || !selectedStudent) return;

    setSavingNote(true);

    const noteData = {
      teacherId: teacherInfo.userId,
      teacherName: teacherInfo.name,
      note: newTeacherNote.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await axios.post(
        `${rtdbBase}/StudentNotes/${selectedStudent?.userId}.json`,
        noteData
      );

      setTeacherNotes((prev) => [noteData, ...prev]);
      setNewTeacherNote("");
    } catch (err) {
      console.error("Error saving note", err);
    } finally {
      setSavingNote(false);
    }
  };

  // Scroll chat to bottom when messages change
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    if (selectedStudent || !chatOpen) return;
    closeQuickChat();
  }, [selectedStudent, chatOpen]);

  useEffect(() => {
    const restoreSnapshot = quickChatScrollRestoreRef.current;
    const scrollContainer = quickChatMessagesRef.current;

    if (restoreSnapshot && scrollContainer) {
      scrollContainer.scrollTop =
        restoreSnapshot.previousScrollTop +
        (scrollContainer.scrollHeight - restoreSnapshot.previousScrollHeight);
      quickChatScrollRestoreRef.current = null;
      return;
    }

    if (!chatOpen) return;
    scrollToBottom(messages.length > QUICK_CHAT_HISTORY_LIMIT ? "auto" : "smooth");
  }, [messages]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenParentChat = async () => {
    let parentTarget = selectedStudentDetails;

    if (!selectedStudent) {
      alert("Please select a student first.");
      return;
    }

    if (!String(parentTarget?.parentUserId || "").trim()) {
      try {
        let usersObj = usersData || {};
        if (!findUserByIdentifiers(usersObj, selectedStudent.userId)) {
          const fetchedStudentUsers = await loadUsersByIds([selectedStudent.userId]);
          usersObj = {
            ...(usersObj || {}),
            ...(fetchedStudentUsers || {}),
          };
        }

        const parentsObj = await loadParentsForStudent(selectedStudent, usersObj);
        const parentUserIds = Object.values(parentsObj || {})
          .map((parentRecord) => normalizeIdentifier(parentRecord?.userId))
          .filter(Boolean);

        if (parentUserIds.length) {
          const fetchedParentUsers = await loadUsersByIds(parentUserIds);
          usersObj = {
            ...(usersObj || {}),
            ...(fetchedParentUsers || {}),
          };
        }

        const parentInfo = resolveStudentParentInfo({
          student: selectedStudent,
          usersObj,
          parentsObj,
        });

        if (parentInfo) {
          parentTarget = {
            ...(parentTarget || {}),
            ...parentInfo,
          };

          setSelectedStudentDetails((prev) => ({
            ...(prev || {}),
            parentId: parentInfo.parentId || prev?.parentId || null,
            parentName: parentInfo.parentName || prev?.parentName || "—",
            parentPhone: parentInfo.parentPhone || prev?.parentPhone || "—",
            parentUserId: parentInfo.parentUserId || prev?.parentUserId || null,
            parentProfileImage: parentInfo.parentProfileImage || prev?.parentProfileImage || "/default-profile.png",
            parentRec: parentInfo.parentRec || prev?.parentRec || null,
            parentUserRec: parentInfo.parentUserRec || prev?.parentUserRec || null,
          }));
        }
      } catch (error) {
        console.error("Failed to resolve parent chat target:", error);
      }
    }

    const parentUserId = String(parentTarget?.parentUserId || "").trim();
    if (!parentUserId) {
      alert("No parent found for this student.");
      return;
    }

    const parentName = parentTarget?.parentName || "Parent";
    const parentProfileImage = resolveProfileImage(
      parentTarget?.parentProfileImage,
      parentTarget?.parentRec?.profileImage,
      parentTarget?.parentRec?.profile,
      parentTarget?.parentUserRec?.profileImage,
      parentTarget?.parentUserRec?.profile,
      "/default-profile.png"
    );

    openQuickChat(
      {
        userId: parentUserId,
        name: parentName,
        profileImage: parentProfileImage,
        type: "parent",
      },
      "parent"
    );
  };

  const handleOpenStudentChat = () => {
    openQuickChat(
      {
        userId: selectedStudent?.userId,
        name: selectedStudent?.name,
        profileImage: resolveProfileImage(
          selectedStudentDetails?.profileImage,
          selectedStudent?.profileImage,
          "/default-profile.png"
        ),
        type: "student",
      },
      "student"
    );
  };

  const handleExpandQuickChat = () => {
    const targetUserId = normalizeIdentifier(quickChatTarget?.userId);
    if (!targetUserId) return;

    closeQuickChat();
    const chatId = getChatId(teacherUserId, targetUserId);
    navigate("/all-chat", {
      state: {
        user: quickChatTarget || selectedStudent,
        contact: quickChatTarget || selectedStudent,
        chatId,
        tab: quickChatTab || "student",
      },
    });
  };

  const handleStudentListItemsRendered = ({ visibleStopIndex }) => {
    if (visibleStopIndex >= displayedStudents.length - 3 && hasMore && !isLoadingNext) {
      goNext();
    }
  };

  useEffect(() => {
    const chatContainer = chatMessagesRef.current;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  const listShellWidth = isPortrait ? "100%" : "min(100%, 640px)";

  return (
    <div className={`${styles.pageRoot} dashboard-page`}>
      <div className={`${styles.dashboardShell} google-dashboard`}>
        <Sidebar
          active="students"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          teacher={teacher}
          handleLogout={handleLogout}
        />

        <div
          className={`${styles.sidebarSpacer} teacher-sidebar-spacer`}
        />

        {/* MAIN CONTENT */}
        <div className={styles.mainContent}>
           <div
             className={`${styles.studentListPanel} student-list-card-responsive`}
             style={{
               width: listShellWidth,
               marginRight: isPortrait ? 0 : "24px",
             }}
           >
            <div className={`${styles.sectionHeader} section-header-card`}>
              <h2 className={`${styles.sectionTitle} section-header-card__title`}>Students</h2>
              <div className="section-header-card__meta">
                <span>Total: {filteredStudents.length}</span>
                <span className="section-header-card__chip">Teacher View</span>
              </div>
            </div>

            <StudentList
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              chipStyle={chipStyle}
              selectedGrade={selectedGrade}
              selectedSection={selectedSection}
              assignedGrades={assignedGrades}
              assignedSectionsForSelectedGrade={assignedSectionsForSelectedGrade}
              selectedFilterLabel={selectedFilterLabel}
              loading={loading}
              studentListError={studentListError}
              filteredStudents={filteredStudents}
              displayedStudents={displayedStudents}
              isLoadingNext={isLoadingNext}
              onItemsRendered={handleStudentListItemsRendered}
              selectedStudent={selectedStudent}
              onSelectAllGrades={handleSelectAllGrades}
              onSelectGrade={handleSelectGrade}
              onSelectAllSections={handleSelectAllSections}
              onSelectSection={handleSelectSection}
              onSelectStudent={setSelectedStudent}
              StudentRowComponent={StudentItem}
            />
          </div>

          {/* RIGHT SIDEBAR */}
{selectedStudent ? (
  <>
    <StudentDetailPanel
      selectedStudent={selectedStudent}
      selectedStudentDetails={selectedStudentDetails}
      isPortrait={isPortrait}
      studentTab={studentTab}
      setStudentTab={setStudentTab}
      setSelectedStudent={setSelectedStudent}
      newTeacherNote={newTeacherNote}
      setNewTeacherNote={setNewTeacherNote}
      saveTeacherNote={saveTeacherNote}
      savingNote={savingNote}
      teacherNotes={teacherNotes}
      attendanceProps={attendanceTabProps}
      performanceProps={performanceTabProps}
    />
    <QuickChatPanel
      chatOpen={chatOpen}
      selectedStudent={selectedStudent}
      selectedStudentDetails={selectedStudentDetails}
      quickChatTarget={quickChatTarget}
      closeQuickChat={closeQuickChat}
      handleOpenParentChat={handleOpenParentChat}
      handleOpenStudentChat={handleOpenStudentChat}
      handleExpandQuickChat={handleExpandQuickChat}
      messages={messages}
      messagesEndRef={messagesEndRef}
      teacherUserId={teacherUserId}
      quickChatMessagesRef={quickChatMessagesRef}
      chatMessagesRef={chatMessagesRef}
      quickChatHasOlder={quickChatHasOlder}
      quickChatLoadingOlder={quickChatLoadingOlder}
      quickChatLoading={quickChatLoading}
      loadOlderMessages={loadOlderMessages}
      formatDateLabel={formatDateLabel}
      formatTime={formatTime}
      newMessageText={newMessageText}
      setNewMessageText={setNewMessageText}
      sendMessage={sendMessage}
    />
  </>
          ) : (
            <div
              className={styles.noSelectionPanel}
              style={{
                width: isPortrait ? "100%" : "380px",
                height: isPortrait ? "100vh" : "calc(100vh - 55px)",
                position: "fixed",
                right: 0,
                top: isPortrait ? 0 : "55px",
                borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
              }}
            >
              <div className={styles.noSelectionCard}>
                <div className={styles.noSelectionIcon}>
                  <FaUsers />
                </div>
                <h3 className={styles.noSelectionTitle}>
                  Student Details
                </h3>
                <p className={styles.noSelectionText}>
                  Select a student from the list to view profile, attendance, performance, and chat.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentsPage;

