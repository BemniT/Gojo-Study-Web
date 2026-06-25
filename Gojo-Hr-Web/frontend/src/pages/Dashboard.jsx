import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AiFillPicture, AiFillVideoCamera } from 'react-icons/ai';
import { FaBell, FaFacebookMessenger, FaCog, FaUsers, FaBuilding, FaClipboardList, FaChalkboardTeacher, FaChartLine, FaChartPie, FaBirthdayCake, FaCalendarAlt, FaClock, FaArrowUp, FaArrowDown, FaMale, FaFemale, FaThumbsUp, FaTrashAlt, FaPlus } from 'react-icons/fa';
import { get, getDatabase, onValue, ref, update } from 'firebase/database';
import EthiopicCalendar from 'ethiopic-calendar';
import './Dashboard.css';
import '../styles/global.css';
import DashboardOverview from '../components/DashboardOverview';
import { app } from '../firebase';
import { getEmployeeJob, getEmployeeMeta, getEmployeeName, getEmployeeProfileImage, getEmployeesSnapshot } from '../hrData';
import { clearChatSummaryUnread, loadChatSummariesForContacts } from '../utils/chatSummary';
import {
  CALENDAR_MANAGER_ROLES,
  CHAT_DEFAULT_PROFILE,
  DASHBOARD_ATTENDANCE_CACHE_KEY,
  DASHBOARD_CALENDAR_CACHE_KEY,
  DASHBOARD_CHAT_ACTIVITY_CACHE_KEY,
  DASHBOARD_EMPLOYEES_CACHE_KEY,
  DASHBOARD_POSTS_CACHE_KEY,
  DEFAULT_PROFILE_IMAGE,
  ETHIOPIAN_MONTHS,
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_MAX_DIMENSION,
  POST_IMAGE_PREVIEW_MAX_BYTES,
  POST_IMAGE_PREVIEW_MAX_DIMENSION,
  POST_PAGE_SIZE,
  QUALIFICATION_GRAPH_CONFIG,
} from '../utils/dashboardConstants';
import { deleteCachedDashboardResource, getCachedDashboardResource, setCachedDashboardResource } from '../utils/dashboardCache';
import {
  formatActivityTime,
  formatFeedTimestamp,
  getConversationSortTime,
  getDashboardRoleLabel,
  normalizeAttendanceSummaryEntry,
  normalizeDashboardCollection,
  normalizeEducationQualification,
  readStoredDashboardSelection,
  resolveDashboardSelection,
} from '../utils/dashboardHelpers';
import {
  getPostFeedImageUrl,
  getPostFullMediaUrl,
  getPostId,
  getResolvedLikeCount,
  getSafeProfileImage,
  isLikelyVideoMedia,
  isPostLikedByActor,
  isVideoPostUrl,
  normalizePostLikes,
  normalizePostRecord,
  normalizePostsApiPayload,
} from '../utils/dashboardPosts';
import {
  CALENDAR_WEEK_DAYS,
  buildDefaultCalendarEvents,
  formatCalendarDeadlineDate,
  getCalendarEventKey,
  getCalendarEventKind,
  getCalendarEventMeta,
  getCalendarEventTone,
  mergeCalendarCollections,
  normalizeCalendarEvent,
  sortCalendarEvents,
  toIsoDateString,
} from '../utils/ethiopianCalendar';
import useHrSession from '../hooks/auth/useHrSession';
import useDashboardPosts from '../hooks/dashboard/useDashboardPosts';
import useDashboardPostComposer from '../hooks/dashboard/useDashboardPostComposer';
import Avatar from '../components/dashboard/charts/Avatar';
import GrowthTrendChart from '../components/dashboard/charts/GrowthTrendChart';
import AttendanceTrendChart from '../components/dashboard/charts/AttendanceTrendChart';
import { DonutChart, GenderBar, PositionChart } from '../components/dashboard/charts/SimpleCharts';

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [attendanceSummaryByDate, setAttendanceSummaryByDate] = useState({});
  const [attendancePeopleDetailByDate, setAttendancePeopleDetailByDate] = useState({});
  const [attendancePeopleLoading, setAttendancePeopleLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const { admin, setAdmin, hrUserId, schoolCode: activeSchoolCode, schoolNodePrefix, withSchoolPath } = useHrSession();
  const postOwnerId = admin?.adminId || admin?.hrId || admin?.id || admin?.userId || 'hr-admin';
  const currentLikeActorId = admin?.userId || admin?.id || admin?.adminId || admin?.hrId || 'hr-admin';
  const fileInputRef = useRef(null);
  const {
    posts,
    setPosts,
    postsCursor,
    setPostsCursor,
    hasMorePosts,
    setHasMorePosts,
    loadingMorePosts,
    pendingLikePostIds,
    expandedPostDescriptions,
    cachePostsFeed,
    upsertPostInState,
    loadMorePosts,
    handleLikePost,
    togglePostDescription,
  } = useDashboardPosts({ currentLikeActorId, postOwnerId });
  const {
    postText, setPostText,
    postMedia, postMediaPreviewFile, postMediaMeta,
    isOptimizingMedia, isPostSubmitting,
    targetRole, setTargetRole, targetOptions,
    showCreatePostModal, editingPostId,
    existingPostMediaUrl, existingPostPreviewUrl, existingPostMediaType,
    showDeletePostModal, pendingDeletePost, isDeletingPost,
    expandedPostImage,
    canSubmitPost, isPostComposerEditing, isPostOwnedByCurrentUser,
    openCreatePostModal, closePostComposerModal, handleStartEditPost,
    handleCloseDeletePostModal, handleRequestDeletePost,
    openExpandedPostImage, closeExpandedPostImage,
    handlePostMediaSelection, handleOpenPostMediaPicker,
    handleSubmitCreatePost, handleConfirmDeletePost,
  } = useDashboardPostComposer({
    admin, postOwnerId, currentLikeActorId, fileInputRef,
    upsertPostInState, setPosts, cachePostsFeed, postsCursor, hasMorePosts,
  });
  const db = useMemo(() => getDatabase(app), []);
  const navigate = useNavigate();
  const location = useLocation();
  const initialSidebarAction = location.state?.dashboardAction;
  const initialOpenNotifications = Boolean(location.state?.openNotifications);
  const initialDashboardSelection = initialSidebarAction
    ? resolveDashboardSelection(initialSidebarAction)
    : readStoredDashboardSelection();
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(initialOpenNotifications);
  const [chatSidebarData, setChatSidebarData] = useState({ unreadCount: 0, todayMessageCount: 0, recentContacts: [], unreadContacts: [] });
  const [calendarViewDate, setCalendarViewDate] = useState(() => {
    const now = new Date();
    const currentEthiopicDate = EthiopicCalendar.ge(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
    );

    return {
      year: currentEthiopicDate.year,
      month: currentEthiopicDate.month,
    };
  });
  const [dashboardView, setDashboardView] = useState(initialDashboardSelection.dashboardView);
  const [postFeedView, setPostFeedView] = useState(initialDashboardSelection.postFeedView);
  const [attendanceRecordView, setAttendanceRecordView] = useState('daily');
  const [attendanceChartMode, setAttendanceChartMode] = useState('bar');
  const [growthTrendView, setGrowthTrendView] = useState('monthly');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('present');
  const [showAttendancePeopleList, setShowAttendancePeopleList] = useState(false);
  const [selectedCalendarIsoDate, setSelectedCalendarIsoDate] = useState('');
  const [hoveredCalendarIsoDate, setHoveredCalendarIsoDate] = useState('');
  const [showAllUpcomingDeadlines, setShowAllUpcomingDeadlines] = useState(false);
  const [calendarEventsLoading, setCalendarEventsLoading] = useState(false);
  const [calendarEventForm, setCalendarEventForm] = useState({
    title: '',
    category: 'no-class',
    subType: 'general',
    notes: '',
  });
  const [calendarEventSaving, setCalendarEventSaving] = useState(false);
  const [editingCalendarEventId, setEditingCalendarEventId] = useState('');
  const [calendarActionMessage, setCalendarActionMessage] = useState('');
  const [showCalendarEventModal, setShowCalendarEventModal] = useState(false);
  const [calendarModalContext, setCalendarModalContext] = useState('calendar');
  const adminChatUserId = String(admin?.userId || admin?.id || '').trim();
  const dashboardChatUserId = adminChatUserId || hrUserId;
  const schoolPath = withSchoolPath;
  const roleCandidates = [
    admin?.role,
    admin?.userType,
    admin?.accountType,
    admin?.userRole,
    admin?.position,
    admin?.staffType,
  ]
    .map((value) => String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_'))
    .filter(Boolean);
  const canManageCalendar = roleCandidates.some((value) => CALENDAR_MANAGER_ROLES.has(value))
    || Boolean(admin?.userId || admin?.id || admin?.hrId || admin?.adminId);
  const calendarCacheKey = `${DASHBOARD_CALENDAR_CACHE_KEY}:${activeSchoolCode || 'global'}`;

  const loadCalendarEvents = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!activeSchoolCode) {
      setCalendarEvents([]);
      return;
    }

    setCalendarEventsLoading(true);

    const fetchCalendarEvents = async () => {
      const response = await api.get('/api/calendar_events');
      const rawEvents = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.events)
          ? response.data.events
          : [];

      return sortCalendarEvents(
        rawEvents
          .map((eventItem, index) => normalizeCalendarEvent(eventItem?.id || `event-${index}`, eventItem))
          .filter((eventItem) => eventItem.gregorianDate),
      );
    };

    try {
      const normalizedEvents = forceRefresh
        ? await fetchCalendarEvents()
        : await getCachedDashboardResource(calendarCacheKey, fetchCalendarEvents, 5 * 60 * 1000);

      setCalendarEvents(normalizedEvents);

      const todayIsoDate = toIsoDateString(new Date());
      setUpcomingCalendarEvents(
        normalizedEvents.filter((eventItem) => {
          if (!eventItem?.showInUpcomingDeadlines) return false;
          return String(eventItem.gregorianDate || '') >= todayIsoDate;
        }),
      );

      if (forceRefresh) {
        setCachedDashboardResource(calendarCacheKey, normalizedEvents);
      }
      setCalendarEvents(normalizedEvents);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      setCalendarEvents([]);
    } finally {
      setCalendarEventsLoading(false);
    }
  }, [activeSchoolCode, calendarCacheKey]);

  useEffect(() => {
    loadCalendarEvents().catch((error) => {
      console.error('Failed to initialize calendar events:', error);
    });
  }, [loadCalendarEvents]);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      try {
        let snapshot = await getEmployeesSnapshot(5 * 60 * 1000);
        if (cancelled) return;

        if (!Array.isArray(snapshot) || snapshot.length === 0) {
          snapshot = await getEmployeesSnapshot(0);
          if (cancelled) return;
        }

        setEmployees(Array.isArray(snapshot) ? snapshot : []);
      } catch (error) {
        console.error('Failed to load dashboard employees:', error);
        if (!cancelled) {
          setEmployees([]);
        }
      }
    }

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    getCachedDashboardResource(DASHBOARD_ATTENDANCE_CACHE_KEY, async () => {
      const response = await api.get('/api/employee_attendance/summary', {
        params: { days: 90 },
      });
      const map = response.data?.attendanceSummaryByDate;
      return map && typeof map === 'object' ? map : {};
    }, 45 * 1000)
      .then((map) => {
        if (!cancelled) {
          setAttendanceSummaryByDate(map);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setAttendanceSummaryByDate({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const count = employees.length;
  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean))).length || 3;
  const openPositions = Math.max(2, Math.round((count / 10))) ;

  const attendanceSeries = useMemo(() => {
    const dateEntries = Object.entries(attendanceSummaryByDate || {})
      .filter(([dateKey, summary]) => typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && summary && typeof summary === 'object')
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate));

    return dateEntries.map(([dateKey, summary]) => {
      return {
        date: dateKey,
        ...normalizeAttendanceSummaryEntry(summary),
      };
    });
  }, [attendanceSummaryByDate]);

  const attendanceDisplaySeries = useMemo(() => {
    const source = Array.isArray(attendanceSeries) ? attendanceSeries : [];
    if (!source.length) return [];

    if (attendanceRecordView === 'daily') {
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayRecord = source.find((item) => item.date === todayIso);

      const latestRecord = todayRecord || source[source.length - 1];

      if (!latestRecord) {
        return [];
      }

      return [{
        ...latestRecord,
        bucketKey: latestRecord.date,
        label: latestRecord.date === todayIso ? 'Today' : latestRecord.date,
      }];
    }

    const buckets = source.reduce((accumulator, item) => {
      const dateValue = new Date(`${item.date}T00:00:00`);
      if (Number.isNaN(dateValue.getTime())) {
        return accumulator;
      }

      let key = item.date;
      let label = item.date.slice(5);

      if (attendanceRecordView === 'weekly') {
        const day = dateValue.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        const weekStart = new Date(dateValue);
        weekStart.setDate(dateValue.getDate() + mondayOffset);
        const weekYear = weekStart.getFullYear();
        const weekMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
        const weekDay = String(weekStart.getDate()).padStart(2, '0');
        key = `${weekYear}-${weekMonth}-${weekDay}`;
        label = `Wk ${weekMonth}/${weekDay}`;
      }

      if (attendanceRecordView === 'monthly') {
        const monthYear = dateValue.getFullYear();
        const monthNumber = String(dateValue.getMonth() + 1).padStart(2, '0');
        key = `${monthYear}-${monthNumber}`;
        label = `${monthYear}/${monthNumber}`;
      }

      if (!accumulator[key]) {
        accumulator[key] = {
          bucketKey: key,
          label,
          total: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
        };
      }

      accumulator[key].total += item.total || 0;
      accumulator[key].presentCount += item.presentCount || 0;
      accumulator[key].lateCount += item.lateCount || 0;
      accumulator[key].absentCount += item.absentCount || 0;

      return accumulator;
    }, {});

    return Object.values(buckets)
      .sort((leftItem, rightItem) => String(leftItem.bucketKey).localeCompare(String(rightItem.bucketKey)))
      .map((bucket) => {
        const attendingCount = (bucket.presentCount || 0) + (bucket.lateCount || 0);
        const total = bucket.total || 0;
        return {
          date: bucket.bucketKey,
          label: bucket.label,
          total,
          presentCount: bucket.presentCount || 0,
          lateCount: bucket.lateCount || 0,
          absentCount: bucket.absentCount || 0,
          rate: total > 0 ? Math.round((attendingCount / total) * 100) : 0,
        };
      });
  }, [attendanceSeries, attendanceRecordView]);

  const employeesWithAttendanceFlag = employees.filter((employee) => typeof employee?.presentToday === 'boolean');
  const fallbackAttendanceRate = employeesWithAttendanceFlag.length
    ? `${Math.round((employeesWithAttendanceFlag.filter((employee) => employee.presentToday).length / employeesWithAttendanceFlag.length) * 100)}%`
    : '—';
  const latestAttendanceRate = attendanceDisplaySeries.length > 0
    ? `${attendanceDisplaySeries[attendanceDisplaySeries.length - 1].rate}%`
    : fallbackAttendanceRate;
  const attendanceRate = latestAttendanceRate;
  const attendanceLineDataRaw = attendanceSeries.length > 0
    ? attendanceSeries.slice(-6).map((item) => item.rate)
    : [];
  const attendanceLineData = attendanceLineDataRaw.length === 1
    ? [attendanceLineDataRaw[0], attendanceLineDataRaw[0]]
    : attendanceLineDataRaw;
  const latestAttendanceSnapshot = attendanceDisplaySeries.length > 0
    ? attendanceDisplaySeries[attendanceDisplaySeries.length - 1]
    : null;
  const attendanceChartPoints = useMemo(() => {
    const map = attendanceSummaryByDate || {};
    const todayIso = new Date().toISOString().slice(0, 10);
    const availableDates = Object.keys(map).filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey)).sort();
    const latestAvailableDate = availableDates[availableDates.length - 1] || todayIso;

    // DAILY: show that day's attendance as a single point (or empty)
    if (attendanceRecordView === 'daily') {
      const targetDate = map[todayIso] ? todayIso : latestAvailableDate;
      const p = normalizeAttendanceSummaryEntry(map[targetDate]);
      return [{ date: targetDate, label: targetDate === todayIso ? 'Today' : targetDate, ...p }];
    }

    // WEEKLY: show each day in the selected/most-recent week as its own point
    if (attendanceRecordView === 'weekly') {
      const refDate = (attendanceDisplaySeries && attendanceDisplaySeries.length > 0 && attendanceDisplaySeries[attendanceDisplaySeries.length - 1].date) || todayIso;
      const d = new Date(`${refDate}T00:00:00`);
      if (Number.isNaN(d.getTime())) return [];
      const day = d.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day; // Monday as first day
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() + mondayOffset);
      const days = Array.from({ length: 5 }, (_, i) => {
        const dt = new Date(weekStart);
        dt.setDate(weekStart.getDate() + i);
        const iso = toIsoDateString(dt);
        const meta = normalizeAttendanceSummaryEntry(map[iso]);
        const label = dt.toLocaleDateString('en-US', { weekday: 'short' });
        return { date: iso, label, ...meta };
      });
      return days;
    }

    // MONTHLY: show each week inside the selected/most-recent month as a point (week ranges)
    if (attendanceRecordView === 'monthly') {
      const refDate = (attendanceDisplaySeries && attendanceDisplaySeries.length > 0 && attendanceDisplaySeries[attendanceDisplaySeries.length - 1].date) || todayIso;
      const d = new Date(`${refDate}T00:00:00`);
      if (Number.isNaN(d.getTime())) return [];
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstOfMonth = new Date(year, month, 1);
      const lastOfMonth = new Date(year, month + 1, 0);

      // find the Monday on or before the first of month
      const firstDayWeekday = firstOfMonth.getDay();
      const firstWeekStart = new Date(firstOfMonth);
      firstWeekStart.setDate(firstOfMonth.getDate() - ((firstDayWeekday + 6) % 7));

      const weeks = [];
      let weekStart = new Date(firstWeekStart);
      while (weekStart <= lastOfMonth) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        // clamp to month
        const startClamp = new Date(Math.max(weekStart.getTime(), firstOfMonth.getTime()));
        const endClamp = new Date(Math.min(weekEnd.getTime(), lastOfMonth.getTime()));
        // accumulate days within this week
        let total = 0, presentCount = 0, lateCount = 0, absentCount = 0;
        for (let dt = new Date(startClamp); dt <= endClamp; dt.setDate(dt.getDate() + 1)) {
          const iso = toIsoDateString(dt);
          const meta = normalizeAttendanceSummaryEntry(map[iso]);
          total += meta.total; presentCount += meta.presentCount; lateCount += meta.lateCount; absentCount += meta.absentCount;
        }
        const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;
        const label = `${startClamp.getMonth() + 1}/${startClamp.getDate()}`;
        weeks.push({ date: `${toIsoDateString(startClamp)}_${toIsoDateString(endClamp)}`, label, total, presentCount, lateCount, absentCount, rate });
        weekStart.setDate(weekStart.getDate() + 7);
      }
      return weeks;
    }

    return [];
  }, [attendanceSummaryByDate, attendanceRecordView, attendanceDisplaySeries]);
  const recentAttendanceRecords = useMemo(() => {
    if (attendanceRecordView === 'daily') {
      return attendanceChartPoints.slice(0, 1);
    }

    if (attendanceRecordView === 'weekly') {
      return attendanceChartPoints;
    }

    return attendanceDisplaySeries.slice(-4).reverse();
  }, [attendanceChartPoints, attendanceDisplaySeries, attendanceRecordView]);

  const getAttendanceBucketMeta = (dateString, viewMode) => {
    const dateValue = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(dateValue.getTime())) {
      return { key: dateString, label: dateString };
    }

    if (viewMode === 'weekly') {
      const day = dateValue.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(dateValue);
      weekStart.setDate(dateValue.getDate() + mondayOffset);
      const weekYear = weekStart.getFullYear();
      const weekMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
      const weekDay = String(weekStart.getDate()).padStart(2, '0');
      return {
        key: `${weekYear}-${weekMonth}-${weekDay}`,
        label: `Wk ${weekMonth}/${weekDay}`,
      };
    }

    if (viewMode === 'monthly') {
      const monthYear = dateValue.getFullYear();
      const monthNumber = String(dateValue.getMonth() + 1).padStart(2, '0');
      return {
        key: `${monthYear}-${monthNumber}`,
        label: `${monthYear}/${monthNumber}`,
      };
    }

    return {
      key: dateString,
      label: dateString.slice(5),
    };
  };

  const todayIsoAttendanceDate = toIsoDateString(new Date());
  const attendancePeopleDateLabel = attendanceRecordView === 'daily'
    ? `Today (${todayIsoAttendanceDate})`
    : attendanceRecordView === 'weekly'
      ? 'All people in visible weekly records'
      : 'All people in visible monthly records';
  const employeeNameById = useMemo(() => {
    return (employees || []).reduce((accumulator, employee) => {
      const employeeId = employee?.id || employee?.employeeId || employee?.job?.employeeId || employee?.profileData?.job?.employeeId;
      if (!employeeId) return accumulator;

      const personal = employee?.personal || employee?.profileData?.personal || {};
      const fullName = employee?.name
        || employee?.fullName
        || [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ')
        || 'Employee';
      accumulator[String(employeeId)] = fullName;
      return accumulator;
    }, {});
  }, [employees]);
  const chatSidebarContacts = useMemo(() => {
    return (employees || [])
      .map((employee) => {
        const job = getEmployeeJob(employee);
        const meta = getEmployeeMeta(employee);
        const userId = String(employee?.userId || meta?.userId || '').trim();

        if (!userId || userId === dashboardChatUserId) {
          return null;
        }

        const roleValue = job?.employeeCategory || job?.category || job?.position || employee?.role || employee?.position || 'Staff';

        return {
          userId,
          name: getEmployeeName(employee) || `User ${userId}`,
          role: getDashboardRoleLabel(roleValue),
          profileImage: getSafeProfileImage(getEmployeeProfileImage(employee)) || CHAT_DEFAULT_PROFILE,
        };
      })
      .filter(Boolean);
  }, [dashboardChatUserId, employees]);
  const attendancePeopleDetailRange = useMemo(() => {
    if (!showAttendancePeopleList) {
      return null;
    }

    if (attendanceRecordView === 'daily') {
      const targetDate = attendanceChartPoints[0]?.date;
      return /^\d{4}-\d{2}-\d{2}$/.test(String(targetDate || ''))
        ? { startDate: targetDate, endDate: targetDate }
        : null;
    }

    if (attendanceRecordView === 'weekly') {
      const weeklyDates = attendanceChartPoints
        .map((point) => String(point?.date || ''))
        .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
        .sort();

      if (!weeklyDates.length) {
        return null;
      }

      return {
        startDate: weeklyDates[0],
        endDate: weeklyDates[weeklyDates.length - 1],
      };
    }

    const latestMonthlyBucket = String(attendanceDisplaySeries[attendanceDisplaySeries.length - 1]?.date || '');
    if (!/^\d{4}-\d{2}$/.test(latestMonthlyBucket)) {
      return null;
    }

    const [yearValue, monthValue] = latestMonthlyBucket.split('-').map((value) => Number(value));
    if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue)) {
      return null;
    }

    const startDate = `${latestMonthlyBucket}-01`;
    const monthEnd = new Date(yearValue, monthValue, 0);
    return {
      startDate,
      endDate: toIsoDateString(monthEnd),
    };
  }, [showAttendancePeopleList, attendanceRecordView, attendanceChartPoints, attendanceDisplaySeries]);

  useEffect(() => {
    if (!showAttendancePeopleList || !attendancePeopleDetailRange) {
      setAttendancePeopleLoading(false);
      return undefined;
    }

    let cancelled = false;
    const { startDate, endDate } = attendancePeopleDetailRange;
    const cacheKey = `dashboard:attendance-detail:${startDate}:${endDate}`;

    setAttendancePeopleLoading(true);
    setAttendancePeopleDetailByDate({});

    getCachedDashboardResource(cacheKey, async () => {
      if (startDate === endDate) {
        const response = await api.get('/api/employee_attendance', {
          params: { date: startDate },
        });
        const detailMap = response.data?.attendance;
        return detailMap && typeof detailMap === 'object'
          ? { [startDate]: detailMap }
          : {};
      }

      const response = await api.get('/api/employee_attendance/history', {
        params: { startDate, endDate },
      });
      const detailMap = response.data?.attendanceByDate;
      return detailMap && typeof detailMap === 'object' ? detailMap : {};
    }, 45 * 1000)
      .then((detailMap) => {
        if (!cancelled) {
          setAttendancePeopleDetailByDate(detailMap);
        }
      })
      .catch((error) => {
        console.error('Failed to load attendance detail:', error);
        if (!cancelled) {
          setAttendancePeopleDetailByDate({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAttendancePeopleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showAttendancePeopleList, attendancePeopleDetailRange]);

  const attendancePeopleList = useMemo(() => {
    const visibleBucketKeys = new Set((attendanceDisplaySeries || []).map((entry) => entry?.date).filter(Boolean));
    if (!visibleBucketKeys.size) return [];

    const normalizeStatus = (record) => {
      const rawStatus = String(record?.status || '').toLowerCase();
      if (rawStatus === 'present' || rawStatus === 'late' || rawStatus === 'absent') {
        return rawStatus;
      }
      return record?.present === true ? 'present' : 'absent';
    };

    const rows = [];

    Object.entries(attendancePeopleDetailByDate || {}).forEach(([sourceDate, recordMap]) => {
      if (!recordMap || typeof recordMap !== 'object') return;

      const bucketMeta = getAttendanceBucketMeta(sourceDate, attendanceRecordView);
      if (!visibleBucketKeys.has(bucketMeta.key)) return;

      Object.entries(recordMap).forEach(([employeeId, record]) => {
        rows.push({
          employeeId,
          status: normalizeStatus(record),
          name: employeeNameById[employeeId] || `Employee ${employeeId}`,
          sourceDate,
          bucketLabel: bucketMeta.label,
          bucketKey: bucketMeta.key,
        });
      });
    });

    return rows
      .filter((entry) => entry.status === attendanceStatusFilter)
      .sort((leftEntry, rightEntry) => {
        if (leftEntry.bucketKey !== rightEntry.bucketKey) {
          return attendanceRecordView === 'weekly'
            ? String(leftEntry.bucketKey).localeCompare(String(rightEntry.bucketKey))
            : String(rightEntry.bucketKey).localeCompare(String(leftEntry.bucketKey));
        }
        if (leftEntry.sourceDate !== rightEntry.sourceDate) {
          return attendanceRecordView === 'weekly'
            ? String(leftEntry.sourceDate).localeCompare(String(rightEntry.sourceDate))
            : String(rightEntry.sourceDate).localeCompare(String(leftEntry.sourceDate));
        }
        return leftEntry.name.localeCompare(rightEntry.name);
      });
  }, [attendancePeopleDetailByDate, attendanceDisplaySeries, attendanceRecordView, attendanceStatusFilter, employeeNameById]);

  // additional KPIs
  const leavesToday = employees.filter(e => e.presentToday === false).length;
  const avgTenure = employees.length ? (employees.reduce((s,e)=>{ if(e.hireDate){ const yrs = (Date.now() - new Date(e.hireDate).getTime())/(1000*60*60*24*365); return s + yrs } return s },0)/employees.length) : 0;
  const avgTenureFormatted = avgTenure ? `${avgTenure.toFixed(1)} yrs` : '—';
  const turnoverRate =  employees.length ? `${Math.round((employees.filter(e=>e.terminated === true).length / employees.length) * 100)}%` : '—';

  useEffect(() => {
    if (!dashboardChatUserId || !activeSchoolCode || !chatSidebarContacts.length) {
      setChatSidebarData({ unreadCount: 0, todayMessageCount: 0, recentContacts: [], unreadContacts: [] });
      setConversations([]);
      return undefined;
    }

    let cancelled = false;
    const cacheKey = `${DASHBOARD_CHAT_ACTIVITY_CACHE_KEY}:${activeSchoolCode}:${dashboardChatUserId}`;

    getCachedDashboardResource(cacheKey, async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = startOfToday.getTime() + 86400000;

      const entries = (await loadChatSummariesForContacts({
        db,
        schoolPath,
        ownerUserId: dashboardChatUserId,
        contacts: chatSidebarContacts,
      }))
        .sort((left, right) => {
          const timeDiff = Number(right.lastMessageTime || 0) - Number(left.lastMessageTime || 0);
          if (timeDiff !== 0) return timeDiff;
          return String(left.name || '').localeCompare(String(right.name || ''));
        });

      const conversations = entries.map((entry) => ({
        chatId: entry.chatId,
        contact: {
          userId: entry.userId,
          name: entry.name,
          role: entry.role,
          profileImage: entry.profileImage,
        },
        displayName: entry.name,
        profile: entry.profileImage,
        unreadForMe: entry.unreadCount,
        lastMessageText: entry.lastMessageText,
        lastMessageAt: entry.lastMessageTime,
      }));

      return {
        unreadCount: entries.reduce((sum, entry) => sum + Number(entry.unreadCount || 0), 0),
        todayMessageCount: entries.reduce((sum, entry) => (
          entry.lastMessageTime >= startOfToday.getTime() && entry.lastMessageTime < endOfToday
            ? sum + 1
            : sum
        ), 0),
        recentContacts: entries.slice(0, 4),
        unreadContacts: entries.filter((entry) => Number(entry.unreadCount || 0) > 0).slice(0, 4),
        conversations,
      };
    }, 2 * 60 * 1000)
      .then((data) => {
        if (cancelled) return;

        setChatSidebarData({
          unreadCount: Number(data?.unreadCount || 0),
          todayMessageCount: Number(data?.todayMessageCount || 0),
          recentContacts: Array.isArray(data?.recentContacts) ? data.recentContacts : [],
          unreadContacts: Array.isArray(data?.unreadContacts) ? data.unreadContacts : [],
        });
        setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
      })
      .catch((error) => {
        console.error('Failed to load dashboard chat activity:', error);
        if (!cancelled) {
          setChatSidebarData({ unreadCount: 0, todayMessageCount: 0, recentContacts: [], unreadContacts: [] });
          setConversations([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSchoolCode, chatSidebarContacts, dashboardChatUserId, db, schoolNodePrefix]);

  // upcoming birthdays within 30 days
  const upcomingBirthdays = employees.filter(e => e.birthDate).map(e => ({...e, birthDateObj: new Date(e.birthDate)})).filter(e=>{
    const now = new Date();
    const thisYear = new Date(now.getFullYear(), e.birthDateObj.getMonth(), e.birthDateObj.getDate());
    const diff = (thisYear - now)/(1000*60*60*24);
    return diff >=0 && diff <= 30;
  }).slice(0,6);

  // upcoming contract expirations
  const upcomingContracts = employees.filter(e=>e.contractEnd).map(e=>({...e, contractDateObj: new Date(e.contractEnd)})).filter(e=>{
    const now = new Date();
    const diff = (e.contractDateObj - now)/(1000*60*60*24);
    return diff >=0 && diff <= 90;
  }).slice(0,6);

  const parseDateSafe = (value) => {
    if (!value) return null;
    const dateObj = new Date(value);
    if (Number.isNaN(dateObj.getTime())) return null;
    return dateObj;
  };

  const getEmployeeHireDate = (employee) => {
    const raw = employee || {};
    const employment = raw.employment || raw.profileData?.employment || {};
    const job = { ...(raw.job || raw.profileData?.job || {}), ...employment };
    return (
      parseDateSafe(raw.hireDate) ||
      parseDateSafe(job.hireDate) ||
      parseDateSafe(job.startDate) ||
      parseDateSafe(job.employmentStartDate) ||
      parseDateSafe(raw.createdAt)
    );
  };

  const monthlyGrowthSeries = useMemo(() => {
    const monthCount = 12;
    const startMonths = Array.from({ length: monthCount }, (_, index) => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - index), 1);
    });

    function extractGender(e) {
      const raw = e || {};
      const g = (
        raw.gender ||
        raw.personal?.gender ||
        raw.profileData?.personal?.gender ||
        ''
      ).toString().toLowerCase();
      if (g.includes('f')) return 'female';
      if (g.includes('m')) return 'male';
      return;
    }

    return startMonths.map((monthStart) => {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth();
      let male = 0, female = 0, total = 0;
      employees.forEach(employee => {
        const hireDate = getEmployeeHireDate(employee);
        if (!hireDate) return;
        if (hireDate.getFullYear() === year && hireDate.getMonth() === month) {
          total++;
          const g = extractGender(employee);
          if (g === 'male') male++;
          else if (g === 'female') female++;
        }
      });
      return {
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        totalCount: total,
        maleCount: male,
        femaleCount: female,
      };
    });
  }, [employees]);

  const annualGrowthSeries = useMemo(() => {
    const yearCount = 6;
    const startYear = new Date().getFullYear() - (yearCount - 1);

    function extractGender(e) {
      const raw = e || {};
      const g = (
        raw.gender ||
        raw.personal?.gender ||
        raw.profileData?.personal?.gender ||
        ''
      ).toString().toLowerCase();
      if (g.includes('f')) return 'female';
      if (g.includes('m')) return 'male';
      return;
    }

    return Array.from({ length: yearCount }, (_, index) => {
      const year = startYear + index;
      let male = 0, female = 0, total = 0;
      employees.forEach(employee => {
        const hireDate = getEmployeeHireDate(employee);
        if (!hireDate) return;
        if (hireDate.getFullYear() === year) {
          total++;
          const g = extractGender(employee);
          if (g === 'male') male++;
          else if (g === 'female') female++;
        }
      });
      return {
        key: String(year),
        label: String(year),
        totalCount: total,
        maleCount: male,
        femaleCount: female,
      };
    });
  }, [employees]);

  const growthTrendPoints = growthTrendView === 'monthly' ? monthlyGrowthSeries : annualGrowthSeries;
  // convert periodic counts into cumulative (upward) series for monotonic growth lines
  const cumulativeGrowthPoints = useMemo(() => {
    if (!Array.isArray(growthTrendPoints) || growthTrendPoints.length === 0) return [];
    let runTotal = 0, runMale = 0, runFemale = 0;
    return growthTrendPoints.map((p) => {
      runTotal += Number(p.totalCount || 0);
      runMale += Number(p.maleCount || 0);
      runFemale += Number(p.femaleCount || 0);
      return {
        ...p,
        totalCount: runTotal,
        maleCount: runMale,
        femaleCount: runFemale,
      };
    });
  }, [growthTrendPoints]);
  // total across visible growth points (use totalCount field)
  const currentGrowthTotal = growthTrendPoints.reduce((sum, point) => sum + (Number(point.totalCount || 0)), 0);

  // find the period with the highest totalCount (peak year/month)
  const peakGrowthPoint = growthTrendPoints.reduce((best, point) => ((Number(point.totalCount || 0)) > (Number(best.totalCount || 0)) ? point : best), growthTrendPoints[0] || { label: '—', totalCount: 0 });
  const peakYear = peakGrowthPoint ? (peakGrowthPoint.label || peakGrowthPoint.key || '—') : '—';

  // growth trend based on real hire dates from the database (last 6 months)
  const months = 6;
  const monthStarts = Array.from({ length: months }, (_, index) => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
  });

  const unknownHireDateCount = employees.filter((employee) => !getEmployeeHireDate(employee)).length;

  const lineData = monthStarts.map((monthStart) => {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
    const hiredUpToMonthEnd = employees.reduce((total, employee) => {
      const hireDate = getEmployeeHireDate(employee);
      if (!hireDate) return total;
      return hireDate <= monthEnd ? total + 1 : total;
    }, 0);
    return unknownHireDateCount + hiredUpToMonthEnd;
  });

  // gender distribution for donut / cards
  function extractGender(e) {
    const raw = e || {};
    const g = (
      raw.gender ||
      raw.personal?.gender ||
      raw.profileData?.personal?.gender ||
      ''
    )
      .toString()
      .toLowerCase();
    if (g.includes('f')) return 'female';
    if (g.includes('m')) return 'male';
    return 'unknown';
  }

  const genderCounts = employees.reduce((acc, e) => {
    const g = extractGender(e);
    if (g) {
      acc[g] = (acc[g] || 0) + 1;
    }
    return acc;
  }, {});
  const maleCount = genderCounts.male || 0;
  const femaleCount = genderCounts.female || 0;
  const knownGenderTotal = Math.max(1, maleCount + femaleCount);
  const malePercentage = Math.round((maleCount / knownGenderTotal) * 100);
  const femalePercentage = Math.round((femaleCount / knownGenderTotal) * 100);
  const genderLeadLabel = maleCount === femaleCount ? 'Balanced' : maleCount > femaleCount ? 'Male lead' : 'Female lead';
  const genderValues = [maleCount, femaleCount];

  const notificationCount = upcomingBirthdays.length + upcomingContracts.length;
  const totalUnreadMessages = conversations.reduce((sum, conversation) => sum + Number(conversation?.unreadForMe || 0), 0);
  const unreadMessageCount = Number(chatSidebarData?.unreadCount ?? totalUnreadMessages ?? 0);
  const todayMessageCount = Number(chatSidebarData?.todayMessageCount || 0);
  const messageCount = unreadMessageCount;
  const totalNotifications = notificationCount + unreadMessageCount;
  const todayPostCount = posts.filter((post) => {
    if (!post?.time) return false;
    const postDate = new Date(post.time);
    return !Number.isNaN(postDate.getTime()) && postDate.toDateString() === new Date().toDateString();
  }).length;

  const handleCalendarMonthChange = (offset) => {
    setCalendarViewDate((currentDate) => {
      let nextYear = currentDate.year;
      let nextMonth = currentDate.month + offset;

      while (nextMonth < 1) {
        nextMonth += 13;
        nextYear -= 1;
      }

      while (nextMonth > 13) {
        nextMonth -= 13;
        nextYear += 1;
      }

      return {
        year: nextYear,
        month: nextMonth,
      };
    });
  };

  const calendarNow = new Date();
  const currentEthiopicDate = EthiopicCalendar.ge(
    calendarNow.getFullYear(),
    calendarNow.getMonth() + 1,
    calendarNow.getDate(),
  );
  const calendarDaysInMonth = calendarViewDate.month === 13
    ? calendarViewDate.year % 4 === 3
      ? 6
      : 5
    : 30;
  const calendarMonthStartGregorian = EthiopicCalendar.eg(
    calendarViewDate.year,
    calendarViewDate.month,
    1,
  );
  const calendarMonthEndGregorian = EthiopicCalendar.eg(
    calendarViewDate.year,
    calendarViewDate.month,
    calendarDaysInMonth,
  );
  const calendarFirstWeekday = new Date(
    calendarMonthStartGregorian.year,
    calendarMonthStartGregorian.month - 1,
    calendarMonthStartGregorian.day,
  ).getDay();
  const isCurrentCalendarMonth = calendarViewDate.year === currentEthiopicDate.year
    && calendarViewDate.month === currentEthiopicDate.month;
  const calendarHighlightedDay = isCurrentCalendarMonth ? currentEthiopicDate.day : null;
  const calendarMonthLabel = `${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]} ${calendarViewDate.year}`;

  const defaultCalendarEvents = buildDefaultCalendarEvents(calendarViewDate.year);
  const mergedCalendarEvents = sortCalendarEvents([
    ...defaultCalendarEvents,
    ...calendarEvents,
  ]);
  const calendarEventsByDate = mergedCalendarEvents.reduce((eventsMap, eventItem) => {
    const eventDate = String(eventItem.gregorianDate || '');
    if (!eventDate) {
      return eventsMap;
    }

    if (!eventsMap[eventDate]) {
      eventsMap[eventDate] = [];
    }

    eventsMap[eventDate].push(eventItem);
    return eventsMap;
  }, {});

  const calendarDays = Array.from(
    { length: calendarFirstWeekday + calendarDaysInMonth },
    (_, index) => {
      const dayNumber = index - calendarFirstWeekday + 1;
      if (dayNumber < 1 || dayNumber > calendarDaysInMonth) {
        return null;
      }

      const gregorianDate = EthiopicCalendar.eg(
        calendarViewDate.year,
        calendarViewDate.month,
        dayNumber,
      );
      const isoDate = `${gregorianDate.year}-${String(gregorianDate.month).padStart(2, '0')}-${String(gregorianDate.day).padStart(2, '0')}`;

      return {
        ethDay: dayNumber,
        isoDate,
        gregorianDate,
        events: calendarEventsByDate[isoDate] || [],
      };
    },
  );

  const monthlyCalendarEvents = sortCalendarEvents(
    [...calendarDays]
      .filter(Boolean)
      .flatMap((dayItem) => dayItem.events.map((eventItem) => ({ ...eventItem, ethDay: dayItem.ethDay }))),
  );

  const selectedCalendarDay = calendarDays.find((dayItem) => dayItem?.isoDate === selectedCalendarIsoDate) || null;
  const selectedCalendarEvents = selectedCalendarDay?.events || [];

  const deadlineWindowEnd = new Date(calendarNow);
  deadlineWindowEnd.setDate(deadlineWindowEnd.getDate() + 30);
  const deadlineWindowEndIsoDate = `${deadlineWindowEnd.getFullYear()}-${String(deadlineWindowEnd.getMonth() + 1).padStart(2, '0')}-${String(deadlineWindowEnd.getDate()).padStart(2, '0')}`;
  const dashboardDeadlineWindowEnd = new Date(calendarNow);
  dashboardDeadlineWindowEnd.setDate(dashboardDeadlineWindowEnd.getDate() + 120);
  const dashboardDeadlineWindowEndIsoDate = `${dashboardDeadlineWindowEnd.getFullYear()}-${String(dashboardDeadlineWindowEnd.getMonth() + 1).padStart(2, '0')}-${String(dashboardDeadlineWindowEnd.getDate()).padStart(2, '0')}`;
  const calendarTodayIsoDate = `${calendarNow.getFullYear()}-${String(calendarNow.getMonth() + 1).padStart(2, '0')}-${String(calendarNow.getDate()).padStart(2, '0')}`;

  const upcomingCalendarEvents = calendarEvents
    .filter((eventItem) => (
      eventItem.showInUpcomingDeadlines
      && eventItem.category === 'academic'
      && String(eventItem.gregorianDate || '') >= calendarTodayIsoDate
      && String(eventItem.gregorianDate || '') <= dashboardDeadlineWindowEndIsoDate
    ))
    .sort((leftItem, rightItem) => String(leftItem.gregorianDate || '').localeCompare(String(rightItem.gregorianDate || '')));

  const upcomingDeadlineEvents = calendarEvents
    .filter((eventItem) => (
      eventItem.showInUpcomingDeadlines
      && eventItem.category === 'academic'
      && String(eventItem.gregorianDate || '') >= calendarTodayIsoDate
      && String(eventItem.gregorianDate || '') <= deadlineWindowEndIsoDate
    ))
    .sort((leftItem, rightItem) => String(leftItem.gregorianDate || '').localeCompare(String(rightItem.gregorianDate || '')));

  const visibleUpcomingDeadlineEvents = showAllUpcomingDeadlines
    ? upcomingDeadlineEvents
    : upcomingDeadlineEvents.slice(0, 3);

  useEffect(() => {
    const preferredDay = calendarDays.find((dayItem) => dayItem?.ethDay === calendarHighlightedDay)
      || calendarDays.find(Boolean)
      || null;

    if (!preferredDay) {
      setSelectedCalendarIsoDate('');
      return;
    }

    const stillVisible = calendarDays.some((dayItem) => dayItem?.isoDate === selectedCalendarIsoDate);
    if (!stillVisible) {
      setSelectedCalendarIsoDate(preferredDay.isoDate);
    }
  }, [
    calendarViewDate.year,
    calendarViewDate.month,
    calendarHighlightedDay,
    calendarDays.length,
    selectedCalendarIsoDate,
  ]);

  const todayHires = employees.filter((employee) => {
    const hireDate = getEmployeeHireDate(employee);
    if (!hireDate) return false;
    return hireDate.toDateString() === new Date().toDateString();
  }).length;

  const recentConversations = conversations.slice(0, 5);
  const recentContacts = recentConversations
    .map((conversation) => ({
      userId: conversation?.contact?.userId || conversation?.chatId,
      chatId: conversation?.chatId,
      conversation,
      name: conversation?.displayName || conversation?.contact?.name || 'User',
      profileImage: getSafeProfileImage(conversation?.profile || conversation?.contact?.profileImage),
      role: conversation?.contact?.role || 'Staff',
      unreadCount: Number(conversation?.unreadForMe || 0),
      lastMessage: conversation?.lastMessageText || (Number(conversation?.unreadForMe || 0) > 0 ? `${Number(conversation?.unreadForMe || 0)} unread message${Number(conversation?.unreadForMe || 0) === 1 ? '' : 's'}` : 'Open chat'),
    }))
    .slice(0, 4);
  const normalizedEmployees = employees.map((employee) => {
    const employment = employee?.employment || employee?.profileData?.employment || {};
    const job = { ...(employee?.job || employee?.profileData?.job || {}), ...employment };
    const personal = employee?.personal || employee?.profileData?.personal || {};
    return {
      ...employee,
      _job: job,
      _personal: personal,
      _department: job.department || employee.department || 'Unassigned',
      _position: job.position || employee.position || employee.role || 'Staff',
      _status: (job.status || employee.status || '').toString().toLowerCase(),
      _name: employee.name || employee.fullName || [personal.firstName, personal.middleName, personal.lastName].filter(Boolean).join(' ') || 'Employee',
    };
  });

  const activeEmployeesCount = normalizedEmployees.filter((employee) => employee._status === 'active').length;
  const onLeaveEmployeesCount = normalizedEmployees.filter((employee) => employee._status === 'on leave').length;
  const terminatedEmployeesCount = normalizedEmployees.filter((employee) => employee._status === 'terminated').length;

  const departmentCounts = normalizedEmployees.reduce((accumulator, employee) => {
    accumulator[employee._department] = (accumulator[employee._department] || 0) + 1;
    return accumulator;
  }, {});

  const topDepartments = Object.entries(departmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const departmentCount = Object.keys(departmentCounts).length;
  const positionCount = new Set(normalizedEmployees.map((employee) => employee._position).filter(Boolean)).size;

  const recentHires = normalizedEmployees
    .map((employee) => {
      const hireDate = getEmployeeHireDate(employee);
      if (!hireDate) return null;

      return {
        name: employee._name,
        role: employee._position || employee._department || 'Staff',
        date: hireDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        timestamp: hireDate.getTime(),
      };
    })
    .filter(Boolean)
    .sort((leftItem, rightItem) => rightItem.timestamp - leftItem.timestamp)
    .slice(0, 4)
    .map(({ timestamp, ...item }) => item);

  const recentTerminations = normalizedEmployees
    .filter((employee) => employee.terminated || employee._status === 'terminated')
    .map((employee) => {
      const terminationDate = employee?.termination?.lastWorkingDate
        || employee?.termination?.terminatedAt
        || employee?.terminatedAt
        || employee?._job?.lastWorkingDate
        || '';

      return {
        name: employee._name,
        position: employee._position,
        department: employee._department,
        reason: employee?.termination?.reason || employee?.termination?.note || 'Termination recorded',
        date: terminationDate,
      };
    })
    .sort((leftItem, rightItem) => {
      const leftTime = leftItem.date ? new Date(leftItem.date).getTime() : 0;
      const rightTime = rightItem.date ? new Date(rightItem.date).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 4);

  // employment type counts (Full-time, Part-time, Contract, Other)
  const employmentCounts = normalizedEmployees.reduce((acc, e) => {
    const job = e._job || {};
    const raw = (job.employmentType || e.employmentType || job.type || job.contractType || '').toString().toLowerCase();
    let key = 'Other';
    if (raw.includes('full')) key = 'Full-time';
    else if (raw.includes('part')) key = 'Part-time';
    else if (raw.includes('contract') || raw.includes('temp') || raw.includes('short')) key = 'Contract';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const employmentOrder = ['Full-time', 'Part-time', 'Contract'];

  const overviewCardStyle = {
    background: 'linear-gradient(180deg, var(--surface-panel, #fff) 0%, var(--surface-muted, #f8faff) 100%)',
    border: '1px solid var(--border-soft, #dbe2f2)',
    borderRadius: 16,
    boxShadow: '0 10px 24px rgba(17,24,39,0.08)',
    padding: 16,
  };

  const widgetCardStyle = {
    background: 'var(--surface-panel, #fff)',
    borderRadius: 16,
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
    padding: '11px',
    border: '1px solid var(--border-soft, #dbe2f2)',
  };
  const rightRailCardStyle = {
    background: 'var(--surface-panel, #fff)',
    borderRadius: 16,
    border: '1px solid var(--border-soft, #dbe2f2)',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
  };
  const rightRailIconStyle = {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: '#F8FAFC',
    color: 'var(--text-primary, #111827)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    flexShrink: 0,
  };
  const rightRailIconButtonStyle = {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: '#F8FAFC',
    color: 'var(--text-secondary, #475569)',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
  };
  const rightRailPillStyle = {
    padding: '4px 8px',
    borderRadius: 999,
    background: '#F8FAFC',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    fontSize: 9,
    color: 'var(--text-secondary, #475569)',
    fontWeight: 800,
  };
  const softPanelStyle = {
    background: 'var(--surface-muted, #f8faff)',
    border: '1px solid var(--border-soft, #dbe2f2)',
    borderRadius: 10,
  };
  const smallStatStyle = {
    padding: '5px 8px',
    borderRadius: 12,
    background: 'var(--surface-panel, #fff)',
    border: '1px solid var(--border-soft, #dbe2f2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 72,
  };
  const FEED_SECTION_STYLE = {
    width: '100%',
    maxWidth: '680px',
    margin: '0 auto',
    boxSizing: 'border-box',
  };
  const shellCardStyle = {
    background: 'var(--surface-panel, #fff)',
    color: 'var(--text-primary, #111827)',
    borderRadius: 16,
    border: '1px solid var(--border-soft, #dbe2f2)',
    boxShadow: 'none',
  };
  const postSurfaceStyle = {
    background: 'var(--surface-panel)',
    color: 'var(--text-primary, #111827)',
    borderRadius: 10,
    border: '1px solid var(--border-soft, #dbe2f2)',
    boxShadow: 'none',
  };
  const sectionHeaderCardStyle = {
    ...shellCardStyle,
    padding: '12px 20px 18px',
    background: 'var(--surface-panel)',
    border: '1px solid var(--border-soft, #dbe2f2)',
  };
  const metricPillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 34,
    padding: '0 12px',
    borderRadius: 999,
    background: 'var(--surface-panel, #fff)',
    border: '1px solid var(--border-soft, #dbe2f2)',
    color: 'var(--text-secondary, #334155)',
    fontSize: 12,
    fontWeight: 700,
  };
  const headerActionStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 38,
    padding: '0 14px',
    borderRadius: 999,
    border: '1px solid var(--border-soft, #dbe2f2)',
    background: 'var(--surface-panel, #fff)',
    color: 'var(--text-secondary, #334155)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: 'none',
  };
  const formatFileSize = (bytes) => {
    const numericBytes = Number(bytes || 0);
    if (!numericBytes) return '0 KB';
    if (numericBytes >= 1024 * 1024) {
      return `${(numericBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.max(1, Math.round(numericBytes / 1024))} KB`;
  };
  const handleSidebarViewSelection = (action) => {
    const nextSelection = resolveDashboardSelection(action);
    setDashboardView(nextSelection.dashboardView);
    setPostFeedView(nextSelection.postFeedView);
  };

  const handleOpenConversation = async (conversation) => {
    if (!conversation?.contact?.userId) {
      navigate('/all-chat');
      return;
    }

    const nextChatId = String(conversation?.chatId || sortedChatId(dashboardChatUserId, conversation.contact.userId));
    const currentUnread = Number(conversation?.unreadForMe || conversation?.unreadCount || 0);

    navigate('/all-chat', { state: { contact: conversation.contact, chatId: nextChatId } });

    if (dashboardChatUserId && nextChatId) {
      try {
        await Promise.all([
          update(ref(db, schoolPath(`Chats/${nextChatId}/unread`)), { [dashboardChatUserId]: 0 }),
          clearChatSummaryUnread({
            db,
            schoolPath,
            ownerUserId: dashboardChatUserId,
            otherUserId: conversation.contact.userId,
            chatId: nextChatId,
          }),
        ]);
      } catch (error) {
        console.error('Failed to clear dashboard unread count:', error);
      }
    }

    setChatSidebarData((currentValue) => ({
      ...currentValue,
      unreadCount: Math.max(0, Number(currentValue?.unreadCount || 0) - currentUnread),
    }));

    setConversations((currentValue) => currentValue.map((item) => (
      item.chatId === nextChatId
        ? { ...item, unreadForMe: 0 }
        : item
    )));
  };

  useEffect(() => {
    const actionFromNavigation = location.state?.dashboardAction;
    const shouldOpenNotifications = Boolean(location.state?.openNotifications);

    if (!actionFromNavigation && !shouldOpenNotifications) {
      return;
    }

    if (actionFromNavigation) {
      handleSidebarViewSelection(actionFromNavigation);
    }

    if (shouldOpenNotifications) {
      setShowNotificationDropdown(true);
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    localStorage.setItem('hr_dashboard_sidebar_view_state', JSON.stringify({
      dashboardView,
      postFeedView,
    }));
    window.dispatchEvent(new Event('hr-dashboard-view-updated'));
  }, [dashboardView, postFeedView]);
  const visiblePosts = postFeedView === 'mine' ? posts.filter((post) => isPostOwnedByCurrentUser(post)) : posts;

  const shouldShowPostSeeMore = (message = '') => {
    if (!message) return false;
    return message.length > 180 || message.split(/\r?\n/).length > 3;
  };


  const handleCreateCalendarEvent = async () => {
    if (!canManageCalendar) {
      alert('Only HR or admin users can manage school calendar events.');
      return;
    }

    if (!selectedCalendarDay) {
      alert('Select a calendar day first.');
      return;
    }

    if (calendarModalContext === 'deadline' && !calendarEventForm.title.trim()) {
      alert('Enter a deadline title.');
      return;
    }

    setCalendarEventSaving(true);
    try {
      const normalizedCategory = calendarModalContext === 'deadline' ? 'academic' : calendarEventForm.category;
      const selectedEventMeta = getCalendarEventMeta(normalizedCategory);
      const payload = {
        title: calendarEventForm.title.trim() || selectedEventMeta.label,
        type: getCalendarEventKey(normalizedCategory),
        category: normalizedCategory,
        subType: 'general',
        notes: calendarEventForm.notes.trim(),
        showInUpcomingDeadlines: calendarModalContext === 'deadline'
          || Boolean(calendarEvents.find((eventItem) => eventItem.id === editingCalendarEventId)?.showInUpcomingDeadlines),
        gregorianDate: selectedCalendarDay.isoDate,
        ethiopianDate: {
          year: calendarViewDate.year,
          month: calendarViewDate.month,
          day: selectedCalendarDay.ethDay,
        },
        createdBy: currentLikeActorId || postOwnerId,
        userId: currentLikeActorId || postOwnerId,
      };

      if (editingCalendarEventId) {
        await api.patch(`/api/calendar_events/${editingCalendarEventId}`, payload);
        setCalendarActionMessage('Calendar event updated successfully.');
      } else {
        await api.post('/api/calendar_events', payload);
        setCalendarActionMessage('Calendar event saved successfully.');
      }

      setCalendarEventForm({ title: '', category: 'no-class', subType: 'general', notes: '' });
      setEditingCalendarEventId('');
      setShowCalendarEventModal(false);
      setCalendarModalContext('calendar');
      deleteCachedDashboardResource(calendarCacheKey);
      await loadCalendarEvents({ forceRefresh: true });
    } catch (error) {
      console.error('Failed to save calendar event:', error?.response?.data || error);
      alert(error?.response?.data?.message || 'Failed to save calendar event.');
    } finally {
      setCalendarEventSaving(false);
    }
  };

  const handleEditCalendarEvent = (eventItem) => {
    if (!canManageCalendar || eventItem.isDefault) return;

    setCalendarModalContext(eventItem.showInUpcomingDeadlines ? 'deadline' : 'calendar');
    setShowCalendarEventModal(true);

    const ethiopianDate = eventItem.ethiopianDate || (() => {
      const [year, month, day] = String(eventItem.gregorianDate || '').split('-').map(Number);
      if (!year || !month || !day) {
        return null;
      }

      return EthiopicCalendar.ge(year, month, day);
    })();

    if (ethiopianDate?.year && ethiopianDate?.month) {
      setCalendarViewDate({
        year: ethiopianDate.year,
        month: ethiopianDate.month,
      });
    }

    setSelectedCalendarIsoDate(eventItem.gregorianDate);
    setCalendarEventForm({
      title: eventItem.title || '',
      category: eventItem.category || (eventItem.type === 'academic' ? 'academic' : 'no-class'),
      subType: 'general',
      notes: eventItem.notes || '',
    });
    setEditingCalendarEventId(eventItem.id);
  };

  const handleDeleteCalendarEvent = async (eventItem) => {
    if (!canManageCalendar) {
      alert('Only HR or admin users can manage school calendar events.');
      return;
    }

    if (eventItem.isDefault) {
      alert('Default Ethiopian special days cannot be deleted.');
      return;
    }

    const selectedEventMeta = getCalendarEventMeta(eventItem.category);
    const shouldDelete = window.confirm(`Delete ${selectedEventMeta.label} on ${eventItem.gregorianDate}?`);
    if (!shouldDelete) {
      return;
    }

    setCalendarEventSaving(true);
    try {
      await api.delete(`/api/calendar_events/${eventItem.id}`, {
        data: {
          userId: currentLikeActorId || postOwnerId,
        },
      });

      if (editingCalendarEventId === eventItem.id) {
        setEditingCalendarEventId('');
        setCalendarEventForm({ title: '', category: 'no-class', subType: 'general', notes: '' });
      }

      setCalendarActionMessage('Calendar event deleted successfully.');
      deleteCachedDashboardResource(calendarCacheKey);
      await loadCalendarEvents({ forceRefresh: true });
    } catch (error) {
      console.error('Failed to delete calendar event:', error?.response?.data || error);
      alert(error?.response?.data?.message || 'Failed to delete calendar event.');
    } finally {
      setCalendarEventSaving(false);
    }
  };

  const handleOpenCalendarEventModal = () => {
    const selectableCalendarDays = calendarDays.filter(Boolean);
    if (!selectedCalendarIsoDate && selectableCalendarDays.length > 0) {
      setSelectedCalendarIsoDate(selectableCalendarDays[0].isoDate);
    }

    setEditingCalendarEventId('');
    setCalendarEventForm({ title: '', category: 'no-class', subType: 'general', notes: '' });
    setCalendarModalContext('calendar');
    setShowCalendarEventModal(true);
  };

  const handleOpenDeadlineModal = () => {
    const selectableCalendarDays = calendarDays.filter(Boolean);
    if (!selectedCalendarIsoDate && selectableCalendarDays.length > 0) {
      setSelectedCalendarIsoDate(selectableCalendarDays[0].isoDate);
    }

    setEditingCalendarEventId('');
    setCalendarEventForm({ title: '', category: 'academic', subType: 'general', notes: '' });
    setCalendarModalContext('deadline');
    setShowCalendarEventModal(true);
  };

  const handleCloseCalendarEventModal = () => {
    setEditingCalendarEventId('');
    setCalendarEventForm({ title: '', category: 'no-class', subType: 'general', notes: '' });
    setCalendarModalContext('calendar');
    setShowCalendarEventModal(false);
  };

  useEffect(() => {
    if (!calendarActionMessage) return undefined;

    const timeoutId = window.setTimeout(() => {
      setCalendarActionMessage('');
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [calendarActionMessage]);

  const handleAttendanceStatusCardClick = (statusValue) => {
    if (showAttendancePeopleList && attendanceStatusFilter === statusValue) {
      setShowAttendancePeopleList(false);
      return;
    }

    setAttendanceStatusFilter(statusValue);
    setShowAttendancePeopleList(true);
  };

  return (
    <div
      className="dashboard-page"
      style={{
        background: 'var(--page-bg)',
        minHeight: '100vh',
        color: 'var(--text-primary)',
        '--sidebar-width': 'clamp(230px, 16vw, 290px)',
        '--topbar-height': '64px',
      }}
    >
      <nav className="top-navbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 18px 0 20px', borderBottom: '1px solid var(--border-soft)', background: 'var(--surface-panel)', zIndex: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Gojo HR</h2>
        </div>

        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <button type="button" title="Notifications" onClick={() => setShowNotificationDropdown((prev) => !prev)} style={headerActionStyle}>
            <FaBell />
            {notificationCount > 0 ? (
              <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: 'var(--warning)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                {notificationCount}
              </span>
            ) : null}
          </button>
          {showNotificationDropdown ? (
            <div style={{ position: 'absolute', top: 48, right: 146, width: 320, maxHeight: 320, overflowY: 'auto', borderRadius: 14, border: '1px solid var(--border-soft)', background: 'var(--surface-panel)', boxShadow: 'none', zIndex: 1200 }}>
              <div style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, borderBottom: '1px solid var(--border-soft)' }}>Notifications</div>
              {notificationCount === 0 ? (
                <div style={{ padding: 14, fontSize: 12, color: 'var(--text-muted)' }}>No new notifications</div>
              ) : (
                <>
                  {upcomingBirthdays.slice(0, 4).map((item, index) => (
                    <div key={`bday-${index}`} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      Birthday reminder: {item.name || item.fullName || 'Employee'}
                    </div>
                  ))}
                  {upcomingContracts.slice(0, 4).map((item, index) => (
                    <div key={`contract-${index}`} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-soft)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      Contract reminder: {item.name || item.fullName || 'Employee'}
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : null}
          <button type="button" title="Messages" onClick={() => navigate('/all-chat')} style={headerActionStyle}>
            <FaFacebookMessenger />
          </button>
          <Link to="/settings" aria-label="Settings" style={headerActionStyle}>
            <FaCog />
          </Link>
          <Avatar src={admin.profileImage} alt="admin" name={admin.name || 'HR Office'} size={40} style={{ border: '1px solid var(--border-soft)' }} textSize={14} />
        </div>
      </nav>

      <div className="google-dashboard" style={{ display: 'flex', gap: 14, padding: '18px 14px 18px', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>
        <div
          className="teacher-sidebar-spacer"
          style={{
            width: 'var(--sidebar-width)',
            minWidth: 'var(--sidebar-width)',
            flex: '0 0 var(--sidebar-width)',
            pointerEvents: 'none',
          }}
        />

        <main className="main-content google-main" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 'none', margin: 0, boxSizing: 'border-box', alignSelf: 'flex-start', height: 'calc(100vh - var(--topbar-height) - 36px)', maxHeight: 'calc(100vh - var(--topbar-height) - 36px)', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', position: 'relative', top: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent', padding: '0 12px 12px 2px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: dashboardView === 'home' ? FEED_SECTION_STYLE.maxWidth : 1180 }}>
            {dashboardView === 'home' ? (
              <div className="section-header-card" style={{ ...sectionHeaderCardStyle, ...FEED_SECTION_STYLE, margin: '0 auto 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', height: 30, padding: '0 12px', borderRadius: 999, background: 'var(--accent-soft)', border: '1px solid var(--border-strong)', color: 'var(--accent-strong)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Gojo HR Workspace
                    </div>
                    <div>
                      <div className="section-header-card__title" style={{ fontSize: 22 }}>HR Updates Feed</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

          {dashboardView === 'home' ? (
            <>
              

                <div className="post-box" style={{ ...FEED_SECTION_STYLE, ...postSurfaceStyle, margin: '0 auto 14px', borderRadius: 10, overflow: 'hidden', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-panel, #fff)', border: 'none', boxShadow: 'none', padding: 0 }}>
                    <Avatar
                      src={admin.profileImage}
                      alt="me"
                      name={admin.name || 'HR Office'}
                      size={38}
                      style={{ border: '1px solid var(--border-soft, #dbe2f2)' }}
                      textSize={13}
                    />
                    <button
                      type="button"
                      onClick={openCreatePostModal}
                      style={{ flex: 1, height: 42, border: '1px solid #d9e2ef', background: '#f7faff', borderRadius: 999, padding: '0 16px', fontSize: 14, textAlign: 'left', color: 'var(--text-muted, #6b7280)', cursor: 'pointer' }}
                    >
                      What's on your mind?
                    </button>
                    <button
                      type="button"
                      onClick={openCreatePostModal}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--danger, #dc2626)', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}
                      title="Live video"
                    >
                      <AiFillVideoCamera />
                    </button>
                    <button
                      type="button"
                      onClick={openCreatePostModal}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--success, #16a34a)', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}
                      title="Photo"
                    >
                      <AiFillPicture />
                    </button>
                  </div>
                </div>

              <div className="posts-container" style={{ ...FEED_SECTION_STYLE, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visiblePosts.length === 0 ? (
                  <div style={{ background: 'var(--surface-panel, #fff)', border: '1px solid var(--border-soft, #dbe2f2)', borderRadius: 12, padding: '20px 16px', color: 'var(--text-muted, #6b7280)', textAlign: 'center' }}>
                    {postFeedView === 'mine' ? 'You have not created any posts yet.' : 'No posts yet. Create your first HR update.'}
                  </div>
                ) : (
                  visiblePosts.map((post) => {
                    const isOwnedByCurrentUser = isPostOwnedByCurrentUser(post);
                    const isLikedByCurrentUser = isPostLikedByActor(post, currentLikeActorId);
                    const resolvedLikeCount = getResolvedLikeCount(post);
                    const isLikePending = Boolean(pendingLikePostIds[post.postId]);

                    return (
                    <div key={post.postId} className="post-card facebook-post-card" style={{ ...postSurfaceStyle, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '12px 16px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
                          <div style={{ flexShrink: 0 }}>
                            <Avatar src={post.adminProfile} alt="profile" name={post.adminName || 'HR Office'} size={40} textSize={14} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary, #111827)', fontWeight: 700, lineHeight: 1.2 }}>{post.adminName || 'HR Office'}</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2, fontSize: 12, color: 'var(--text-muted, #6b7280)', fontWeight: 500 }}>
                              <span>{formatFeedTimestamp(post.time)}</span>
                              <span>·</span>
                              <span>{post.targetRole && post.targetRole !== 'all' ? `Visible to ${getDashboardRoleLabel(post.targetRole)}` : 'Visible to everyone'}</span>
                            </div>
                          </div>
                        </div>
                        {isOwnedByCurrentUser ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleStartEditPost(post)}
                              style={{ height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-panel, #fff)', color: 'var(--text-secondary, #475569)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestDeletePost(post)}
                              style={{ height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid var(--danger-border, #fca5a5)', background: 'var(--surface-panel, #fff)', color: 'var(--danger, #b91c1c)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              <FaTrashAlt style={{ width: 12, height: 12 }} />
                              <span>Delete</span>
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {post.message ? (() => {
                        const canExpandPost = shouldShowPostSeeMore(post.message);
                        const isPostExpanded = !!expandedPostDescriptions[post.postId];

                        return (
                          <div style={{ padding: '0 16px 10px', color: 'var(--text-primary, #111827)', fontSize: 15, lineHeight: 1.3333, wordBreak: 'break-word' }}>
                            <div
                              style={{
                                whiteSpace: 'pre-wrap',
                                overflow: canExpandPost && !isPostExpanded ? 'hidden' : 'visible',
                                display: canExpandPost && !isPostExpanded ? '-webkit-box' : 'block',
                                WebkitBoxOrient: canExpandPost && !isPostExpanded ? 'vertical' : 'initial',
                                WebkitLineClamp: canExpandPost && !isPostExpanded ? 4 : 'unset',
                              }}
                            >
                              {post.message}
                            </div>
                            {canExpandPost ? (
                              <button
                                type="button"
                                onClick={() => togglePostDescription(post.postId)}
                                style={{ border: 'none', background: 'transparent', padding: 0, marginTop: 6, color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                              >
                                {isPostExpanded ? 'See less' : 'See more'}
                              </button>
                            ) : null}
                          </div>
                        );
                      })() : (
                        <div style={{ padding: '0 16px 6px', minHeight: 56 }} />
                      )}

                      {getPostFullMediaUrl(post) ? (
                        <div style={{ background: '#000', borderTop: '1px solid #dadde1', borderBottom: '1px solid #dadde1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isLikelyVideoMedia(post.mediaType, getPostFullMediaUrl(post)) ? (
                            <video src={getPostFullMediaUrl(post)} controls preload="metadata" style={{ width: '100%', height: 'auto', maxHeight: 'min(78vh, 720px)', objectFit: 'contain', display: 'block', margin: '0 auto', background: '#000' }} />
                          ) : (
                            <button
                              type="button"
                              onClick={() => openExpandedPostImage(post)}
                              style={{ width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in' }}
                              aria-label="Open full post image"
                              title="Open full image"
                            >
                              <img src={getPostFeedImageUrl(post)} alt="post media" loading="lazy" decoding="async" style={{ width: '100%', height: 'auto', maxHeight: 'min(78vh, 720px)', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                            </button>
                          )}
                        </div>
                      ) : null}

                      <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-strong, #007afb)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FaThumbsUp style={{ width: 9, height: 9 }} />
                          </span>
                          <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{resolvedLikeCount} like{resolvedLikeCount === 1 ? '' : 's'}</span>
                        </div>
                        <div style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          {post.targetRole && post.targetRole !== 'all' ? `Visible to ${post.targetRole}` : 'Visible to everyone'}
                        </div>
                      </div>
                      <div style={{ margin: '0 16px', borderTop: '1px solid #e4e6eb' }} />
                      <div style={{ padding: '4px 8px 8px' }}>
                        <button
                          type="button"
                          onClick={() => handleLikePost(post.postId)}
                          disabled={isLikePending}
                          style={{ width: '100%', minHeight: 36, border: 'none', borderRadius: 8, background: 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: isLikePending ? 'progress' : 'pointer', color: isLikedByCurrentUser ? 'var(--accent-strong, #007afb)' : 'var(--text-secondary, #4b5563)', fontSize: 14, fontWeight: 700, opacity: isLikePending ? 0.82 : 1, transition: 'opacity 140ms ease, color 140ms ease' }}
                        >
                          <FaThumbsUp style={{ width: 14, height: 14 }} />
                          <span>{isLikedByCurrentUser ? 'Liked' : 'Like'}</span>
                        </button>
                      </div>
                    </div>
                  );
                  })
                )}

                {hasMorePosts ? (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                    <button
                      type="button"
                      onClick={loadMorePosts}
                      disabled={loadingMorePosts}
                      style={{ minWidth: 170, height: 42, padding: '0 18px', borderRadius: 999, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-panel, #fff)', color: 'var(--text-secondary, #334155)', fontSize: 13, fontWeight: 700, cursor: loadingMorePosts ? 'progress' : 'pointer', opacity: loadingMorePosts ? 0.82 : 1 }}
                    >
                      {loadingMorePosts ? 'Loading older posts...' : 'Load older posts'}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <DashboardOverview
              count={count}
              activeEmployeesCount={activeEmployeesCount}
              onLeaveEmployeesCount={onLeaveEmployeesCount}
              terminatedEmployeesCount={terminatedEmployeesCount}
              attendanceRecordView={attendanceRecordView}
              onChangeAttendanceRecordView={setAttendanceRecordView}
              attendanceChartMode={attendanceChartMode}
              onChangeAttendanceChartMode={setAttendanceChartMode}
              attendanceRate={attendanceRate}
              attendanceChartNode={attendanceChartPoints.length > 0 ? (
                <AttendanceTrendChart points={attendanceChartPoints} mode={attendanceChartMode} height={320} width={820} />
              ) : (
                <div style={{ padding: '56px 16px', textAlign: 'center', fontSize: 13, color: '#64748b', fontWeight: 700 }}>
                  Attendance graph will appear once attendance records are available.
                </div>
              )}
              latestAttendanceSnapshot={latestAttendanceSnapshot}
              onAttendanceStatusCardClick={handleAttendanceStatusCardClick}
              showAttendancePeopleList={showAttendancePeopleList}
              attendancePeopleLoading={attendancePeopleLoading}
              attendanceStatusFilter={attendanceStatusFilter}
              attendancePeopleDateLabel={attendancePeopleDateLabel}
              attendancePeopleList={attendancePeopleList}
              recentAttendanceRecords={recentAttendanceRecords}
              growthTrendView={growthTrendView}
              onChangeGrowthTrendView={setGrowthTrendView}
              currentGrowthTotal={currentGrowthTotal}
              peakGrowthPoint={peakGrowthPoint}
              growthTrendChartNode={<GrowthTrendChart points={growthTrendPoints} mode={growthTrendView} />}
              genderDonutNode={<DonutChart values={genderValues} colors={['#4b6cb7', '#ec4899', '#f59e0b']} size={130} />}
              genderBarNode={<GenderBar male={maleCount} female={femaleCount} width={250} height={86} />}
              maleCount={maleCount}
              femaleCount={femaleCount}
              positionChartNode={<PositionChart employees={normalizedEmployees.map((employee) => ({ position: employee._position, role: employee._position }))} maxBars={7} />}
              normalizedEmployeesLength={normalizedEmployees.length}
              employmentOrder={employmentOrder}
              employmentCounts={employmentCounts}
              topDepartments={topDepartments}
              departmentCount={departmentCount}
              positionCount={positionCount}
              avgTenureFormatted={avgTenureFormatted}
              turnoverRate={turnoverRate}
              leavesToday={leavesToday}
              todayHires={todayHires}
              todayPostCount={todayPostCount}
              notificationCount={notificationCount}
              recentHires={recentHires}
              upcomingCalendarEvents={upcomingCalendarEvents}
              recentTerminations={recentTerminations}
              upcomingBirthdays={upcomingBirthdays}
              upcomingContracts={upcomingContracts}
            />
          )}
          </div>
        </main>

        {dashboardView === 'home' ? (
        <>
        <div className="right-widgets-spacer" style={{ width: 'clamp(300px, 21vw, 360px)', minWidth: 300, maxWidth: 360, flex: '0 0 clamp(300px, 21vw, 360px)', marginLeft: 10, pointerEvents: 'none' }} />
        <div className="dashboard-widgets" onWheel={(event) => event.stopPropagation()} style={{ width: 'clamp(300px, 21vw, 360px)', minWidth: 300, maxWidth: 360, flex: '0 0 clamp(300px, 21vw, 360px)', display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'flex-start', height: 'calc(100vh - var(--topbar-height) - 36px)', maxHeight: 'calc(100vh - var(--topbar-height) - 36px)', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', position: 'fixed', top: 'calc(var(--topbar-height) + 18px)', right: 14, scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent', paddingLeft: 12, paddingRight: 2, paddingBottom: 12, marginLeft: 10, marginRight: 0, opacity: 0.98, borderLeft: 'none' }}>
          <div style={widgetCardStyle}>
            <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: 'var(--text-primary, #111827)' }}>Quick Statistics</h4>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div style={smallStatStyle}>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', fontWeight: 600 }}>Total Posts</div>
                <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: 'var(--text-primary, #111827)' }}>{posts.length}</div>
              </div>
              <div style={smallStatStyle}>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', fontWeight: 600 }}>Unread</div>
                <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: 'var(--text-primary, #111827)' }}>{unreadMessageCount}</div>
              </div>
              <div style={smallStatStyle}>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', fontWeight: 600 }}>Notifications</div>
                <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: 'var(--text-primary, #111827)' }}>{totalNotifications}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...widgetCardStyle, padding: '10px' }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, margin: 0, color: 'var(--text-primary, #111827)' }}>Today's Activity</h4>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...softPanelStyle, padding: '7px 8px', fontSize: 10 }}>
                  <span style={{ color: 'var(--text-secondary, #6b7280)', fontWeight: 600 }}>New Posts</span>
                  <strong style={{ color: 'var(--text-primary, #111827)' }}>{todayPostCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...softPanelStyle, padding: '7px 8px', fontSize: 10 }}>
                  <span style={{ color: 'var(--text-secondary, #6b7280)', fontWeight: 600 }}>Chats Active Today</span>
                  <strong style={{ color: 'var(--text-primary, #111827)' }}>{todayMessageCount}</strong>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary, #6b7280)', marginBottom: 6 }}>Recent Contacts</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentContacts.length === 0 ? (
                    <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', ...softPanelStyle, padding: '7px 8px' }}>
                      No recent chats yet
                    </div>
                  ) : (
                    recentContacts.map((contact, index) => (
                      <button
                        key={contact.userId || index}
                        type="button"
                        onClick={() => handleOpenConversation(contact.conversation)}
                        style={{ ...softPanelStyle, display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '6px 7px', cursor: 'pointer' }}
                      >
                        <Avatar src={contact.profileImage} alt={contact.name} name={contact.name || 'Employee'} size={24} textSize={10} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary, #111827)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.lastMessage || contact.role}</div>
                        </div>
                        {contact.unreadCount > 0 ? (
                          <div style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                            {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                          </div>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...rightRailCardStyle, overflow: 'hidden', position: 'relative' }}>
              <div style={{ padding: '14px 14px 12px', background: 'var(--surface-panel, #fff)', borderBottom: '1px solid rgba(15, 23, 42, 0.08)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={rightRailIconStyle}>
                      <FaCalendarAlt style={{ width: 14, height: 14 }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 900, margin: 0, color: 'var(--text-primary, #111827)', letterSpacing: '-0.02em' }}>School Calendar</h4>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary, #475569)', marginTop: 3, fontWeight: 800 }}>{calendarMonthLabel}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted, #64748b)', marginTop: 2, fontWeight: 500 }}>
                        {`${calendarMonthStartGregorian.day}/${calendarMonthStartGregorian.month}/${calendarMonthStartGregorian.year} - ${calendarMonthEndGregorian.day}/${calendarMonthEndGregorian.month}/${calendarMonthEndGregorian.year}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(-1)}
                      style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                      aria-label="Previous month"
                      title="Previous month"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(1)}
                      style={{ ...rightRailIconButtonStyle, fontSize: 17 }}
                      aria-label="Next month"
                      title="Next month"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ ...rightRailPillStyle, color: 'var(--text-primary, #111827)' }}>
                      {monthlyCalendarEvents.length} event{monthlyCalendarEvents.length === 1 ? '' : 's'}
                    </div>
                    <div style={{ ...rightRailPillStyle, color: canManageCalendar ? 'var(--text-primary, #111827)' : 'var(--text-secondary, #475569)' }}>
                      {canManageCalendar ? 'Manage access' : 'View only'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ margin: '12px', background: 'var(--surface-muted, #F8FAFC)', border: '1px solid var(--border-soft, #D7E7FB)', borderRadius: 12, padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 6 }}>
                  {CALENDAR_WEEK_DAYS.map((day) => (
                    <div key={day} style={{ textAlign: 'center', fontSize: 9, fontWeight: 800, color: 'var(--text-muted, #64748b)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                      {day}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
                  {calendarDays.map((day, index) => {
                    const isToday = day?.ethDay === calendarHighlightedDay;
                    const dayOfWeek = index % 7;
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const primaryEvent = day?.events?.[0] || null;
                    const isNoClassDay = primaryEvent?.category === 'no-class';
                    const isAcademicDay = primaryEvent?.category === 'academic';
                    const isSelected = day?.isoDate === selectedCalendarIsoDate;
                    const isHovered = day?.isoDate === hoveredCalendarIsoDate;
                    const dayBackground = day
                      ? isToday
                        ? 'var(--accent-soft, #E7F2FF)'
                        : isSelected
                          ? 'color-mix(in srgb, var(--accent-soft, #E7F2FF) 72%, white 28%)'
                          : isNoClassDay
                            ? 'color-mix(in srgb, var(--warning-soft, #FEE2E2) 58%, white 42%)'
                            : isAcademicDay
                              ? 'color-mix(in srgb, var(--accent-soft, #E7F2FF) 46%, white 54%)'
                              : isWeekend
                                ? 'color-mix(in srgb, var(--surface-muted, #F7FBFF) 82%, white 18%)'
                                : 'var(--surface-panel, #fff)'
                      : 'transparent';

                    return (
                      <button
                        type="button"
                        key={`${day?.ethDay || 'blank'}-${index}`}
                        onClick={() => day && setSelectedCalendarIsoDate(day.isoDate)}
                        onMouseEnter={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                        onMouseLeave={() => setHoveredCalendarIsoDate('')}
                        onFocus={() => day && setHoveredCalendarIsoDate(day.isoDate)}
                        onBlur={() => setHoveredCalendarIsoDate('')}
                        title={day?.events?.length ? day.events.map((eventItem) => eventItem.title).join(', ') : ''}
                        style={{
                          minHeight: 0,
                          aspectRatio: '1 / 1',
                          borderRadius: 10,
                          border: isToday
                            ? '1px solid var(--accent, #007AFB)'
                            : isSelected
                              ? '1px solid var(--accent-strong, #007AFB)'
                              : isHovered
                                ? '1px solid var(--border-strong, #B5D2F8)'
                                : isNoClassDay
                                  ? '1px solid var(--warning-border, #FCA5A5)'
                                  : '1px solid var(--border-soft, #D7E7FB)',
                          background: dayBackground,
                          color: isToday ? 'var(--accent-strong, #007AFB)' : day ? 'var(--text-secondary, #475569)' : 'transparent',
                          fontSize: 10,
                          fontWeight: isToday ? 800 : 700,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          padding: '5px 2px',
                          boxShadow: day && isSelected ? '0 8px 18px rgba(0, 122, 251, 0.12)' : 'none',
                          cursor: day ? 'pointer' : 'default',
                          outline: 'none',
                          transform: day && isSelected
                            ? 'translateY(-2px) scale(1.03)'
                            : day && isHovered
                              ? 'translateY(-1px)'
                              : 'translateY(0)',
                          transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        disabled={!day}
                      >
                        {day ? (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 800, color: isToday || isSelected ? 'var(--accent-strong, #007AFB)' : 'var(--text-primary, #111827)', lineHeight: 1 }}>{day.ethDay}</div>
                            <div style={{ fontSize: 8, color: isSelected ? 'var(--accent, #007AFB)' : 'var(--text-muted, #64748b)', lineHeight: 1 }}>{day.gregorianDate.day}/{day.gregorianDate.month}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 6 }}>
                              {day.events.slice(0, 2).map((eventItem) => (
                                <span
                                  key={eventItem.id}
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    background: getCalendarEventMeta(eventItem.category).color,
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        ) : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 12px 0', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--text-secondary, #475569)', fontWeight: 800, background: 'var(--surface-muted, #F8FAFC)', border: '1px solid rgba(220, 38, 38, 0.18)', borderRadius: 999, padding: '5px 8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning, #DC2626)' }} /> No class
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--text-secondary, #475569)', fontWeight: 800, background: 'var(--surface-muted, #F8FAFC)', border: '1px solid rgba(0, 122, 251, 0.18)', borderRadius: 999, padding: '5px 8px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent, #007AFB)' }} /> Academic
                </div>
                {canManageCalendar ? (
                  <button
                    type="button"
                    onClick={handleOpenCalendarEventModal}
                    style={{ ...rightRailIconButtonStyle, width: 30, height: 30, borderRadius: 999, color: 'var(--text-primary, #111827)' }}
                    aria-label="Add school calendar event"
                    title="Add school calendar event"
                  >
                    <FaPlus style={{ width: 12, height: 12 }} />
                  </button>
                ) : null}
              </div>

              {calendarActionMessage ? (
                <div style={{ margin: '10px 12px 0', borderRadius: 12, border: '1px solid rgba(0, 122, 251, 0.12)', background: 'var(--surface-muted, #F8FAFC)', color: 'var(--text-primary, #111827)', fontSize: 10, fontWeight: 800, padding: '8px 10px' }}>
                  {calendarActionMessage}
                </div>
              ) : null}

              <div style={{ margin: '12px', background: 'var(--surface-muted, #F8FAFC)', border: '1px solid var(--border-soft, #D7E7FB)', borderRadius: 12, padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-primary, #111827)' }}>
                      {selectedCalendarDay
                        ? `${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]} ${selectedCalendarDay.ethDay}, ${calendarViewDate.year}`
                        : 'Select a date'}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
                      {selectedCalendarDay
                        ? `Gregorian ${selectedCalendarDay.gregorianDate.day}/${selectedCalendarDay.gregorianDate.month}/${selectedCalendarDay.gregorianDate.year}`
                        : 'Choose a day to view or add calendar events.'}
                    </div>
                  </div>
                  {calendarEventsLoading ? (
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>Loading...</div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {selectedCalendarEvents.length === 0 ? (
                    <div style={{ fontSize: 9, color: 'var(--text-muted, #64748b)', background: 'var(--surface-muted, #F7FBFF)', borderRadius: 10, border: '1px solid var(--border-soft, #D7E7FB)', padding: '7px 9px' }}>
                      No school events on this day.
                    </div>
                  ) : (
                    selectedCalendarEvents.map((eventItem) => {
                      const eventMeta = getCalendarEventMeta(eventItem.category);

                      return (
                        <div
                          key={eventItem.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 7,
                            background: 'var(--surface-panel, #fff)',
                            border: `1px solid ${eventMeta.border}`,
                            borderRadius: 10,
                            padding: '7px 8px',
                          }}
                        >
                          <span style={{ width: 8, height: 8, marginTop: 4, borderRadius: '50%', background: eventMeta.color, flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-primary, #111827)' }}>{eventItem.title}</div>
                              {eventItem.isDefault ? (
                                <span style={{ padding: '2px 6px', borderRadius: 999, background: 'var(--accent-soft, #E7F2FF)', color: 'var(--accent-strong, #007AFB)', fontSize: 9, fontWeight: 800 }}>Default</span>
                              ) : null}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>{eventMeta.label}</div>
                            {eventItem.notes ? (
                              <div style={{ fontSize: 9, color: 'var(--text-secondary, #475569)', marginTop: 3 }}>{eventItem.notes}</div>
                            ) : null}
                          </div>
                          {canManageCalendar && !eventItem.isDefault ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleEditCalendarEvent(eventItem)}
                                style={{ height: 26, padding: '0 9px', borderRadius: 8, border: '1px solid var(--border-soft, #D7E7FB)', background: 'var(--surface-panel, #fff)', color: 'var(--text-secondary, #475569)', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCalendarEvent(eventItem)}
                                style={{ height: 26, padding: '0 9px', borderRadius: 8, border: '1px solid var(--danger-border, #fca5a5)', background: 'var(--surface-panel, #fff)', color: 'var(--danger, #b91c1c)', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div style={{ ...widgetCardStyle, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: 'var(--text-primary, #111827)' }}>Upcoming Deadlines</h4>
                {canManageCalendar ? (
                  <button
                    type="button"
                    onClick={handleOpenDeadlineModal}
                    style={{ ...rightRailIconButtonStyle, borderRadius: 999, color: 'var(--text-primary, #111827)' }}
                    aria-label="Add upcoming deadline"
                    title="Add upcoming deadline"
                  >
                    <FaPlus style={{ width: 11, height: 11 }} />
                  </button>
                ) : null}
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {calendarEventsLoading ? (
                  <div style={{ padding: '8px 9px', borderRadius: 10, border: '1px solid var(--border-soft, #D7E7FB)', background: 'var(--surface-muted, #F8FAFC)', fontSize: 10, color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>
                    Loading deadlines...
                  </div>
                ) : upcomingDeadlineEvents.length === 0 ? (
                  <div style={{ padding: '8px 9px', borderRadius: 10, border: '1px solid var(--border-soft, #D7E7FB)', background: 'var(--surface-muted, #F8FAFC)', fontSize: 10, color: 'var(--text-muted, #64748b)' }}>
                    No upcoming deadlines in the next 30 days.
                    {canManageCalendar ? (
                      <button
                        type="button"
                        onClick={handleOpenDeadlineModal}
                        style={{ marginTop: 8, height: 28, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--surface-panel, #fff)', color: 'var(--text-primary, #111827)', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}
                      >
                        Add deadline
                      </button>
                    ) : null}
                  </div>
                ) : (
                  visibleUpcomingDeadlineEvents.map((eventItem) => {
                    const eventMeta = getCalendarEventMeta(eventItem.category);

                    return (
                      <div
                        key={`deadline-${eventItem.id}`}
                        style={{
                          padding: '8px 9px',
                          borderRadius: 10,
                          border: `1px solid ${eventMeta.border}`,
                          background: 'var(--surface-muted, #F8FAFC)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-primary, #111827)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: eventMeta.color, flexShrink: 0 }} />
                            <span>{eventItem.title?.trim() || eventItem.notes?.trim() || 'Academic deadline'}</span>
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted, #64748b)', marginTop: 3 }}>
                            {eventMeta.label}
                          </div>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-secondary, #475569)', whiteSpace: 'nowrap' }}>
                          {formatCalendarDeadlineDate(eventItem.gregorianDate)}
                        </div>
                      </div>
                    );
                  })
                )}
                {!calendarEventsLoading && upcomingDeadlineEvents.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllUpcomingDeadlines((currentValue) => !currentValue)}
                    style={{ alignSelf: 'flex-start', height: 28, padding: '0 10px', borderRadius: 999, border: '1px solid rgba(15, 23, 42, 0.08)', background: 'var(--surface-panel, #fff)', color: 'var(--text-primary, #111827)', fontSize: 9, fontWeight: 800, cursor: 'pointer' }}
                  >
                    {showAllUpcomingDeadlines ? 'See less' : `See more (${upcomingDeadlineEvents.length - 3})`}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ ...widgetCardStyle, padding: '13px' }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary, #111827)' }}>Sponsored Links</h4>
            <ul style={{ margin: '10px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>
              <li style={{ color: '#1d4ed8', fontWeight: 600 }}>Gojo Study App</li>
              <li style={{ color: '#1d4ed8', fontWeight: 600 }}>Finance Portal</li>
              <li style={{ color: '#1d4ed8', fontWeight: 600 }}>Register Office</li>
            </ul>
          </div>
        </div>
        </>
        ) : null}
      </div>

      {showCreatePostModal ? (
        <>
          <div
            onClick={closePostComposerModal}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.18)', backdropFilter: 'blur(10px)', zIndex: 1200 }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1201, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, pointerEvents: 'none' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(640px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface-panel, #fff)', borderRadius: 28, border: '1px solid var(--border-soft, #dbe2f2)', boxShadow: 'none', pointerEvents: 'auto', position: 'relative' }}>
              <div style={{ position: 'relative', padding: '22px 24px 18px', borderBottom: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-panel, #fff)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 52 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', height: 28, padding: '0 12px', borderRadius: 999, background: 'var(--accent-soft, #E7F2FF)', border: '1px solid var(--border-strong, #B5D2F8)', color: 'var(--accent-strong, #007AFB)', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {isPostComposerEditing ? 'Edit Announcement' : 'School Announcement'}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary, #111827)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                    {isPostComposerEditing ? 'Edit your post' : 'Create a new post'}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary, #334155)', lineHeight: 1.5, maxWidth: 420 }}>
                    {isPostComposerEditing
                      ? 'Update the message, audience, or media before publishing the revised version.'
                      : 'Share polished announcements, reminders, and updates with the right audience.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closePostComposerModal}
                  style={{ position: 'absolute', right: 18, top: 18, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-panel, #fff)', width: 40, height: 40, borderRadius: '50%', fontSize: 22, color: 'var(--text-secondary, #6b7280)', cursor: 'pointer', lineHeight: 1 }}
                  aria-label="Close create post modal"
                  title="Close"
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '14px 16px', borderRadius: 20, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-muted, #f8faff)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <Avatar src={admin.profileImage} alt="me" name={admin.name || 'HR Office'} size={48} style={{ border: '2px solid var(--border-strong, #B5D2F8)', boxShadow: 'var(--shadow-glow, 0 0 0 2px rgba(0, 122, 251, 0.18))' }} textSize={16} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary, #111827)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{admin.name || 'HR Office'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>{isPostComposerEditing ? 'Editing from the HR dashboard' : 'Posting from the HR dashboard'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 170 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Audience
                    </div>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      style={{ height: 40, borderRadius: 12, border: '1px solid var(--input-border, #B5D2F8)', background: 'var(--input-bg, #fff)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #111827)', padding: '0 36px 0 12px', minWidth: 170, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)' }}
                      title="Post target role"
                    >
                      {targetOptions.map((role) => {
                        const label = role === 'all' ? 'All Users' : getDashboardRoleLabel(role);
                        return <option key={role} value={role}>{label}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-soft, #dbe2f2)', borderRadius: 24, background: 'var(--surface-panel, #fff)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px 12px', borderBottom: '1px solid color-mix(in srgb, var(--border-soft, #dbe2f2) 80%, transparent 20%)' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary, #111827)' }}>Post message</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>{postText.trim().length} characters</div>
                  </div>

                  <textarea
                    placeholder={isPostComposerEditing ? 'Update your announcement...' : 'Write a clear announcement for your school community...'}
                    value={postText}
                    onChange={(event) => setPostText(event.target.value)}
                    style={{ minHeight: 220, resize: 'vertical', border: 'none', background: 'transparent', borderRadius: 0, padding: '18px 18px 16px', fontSize: 19, lineHeight: 1.6, outline: 'none', color: 'var(--text-primary, #111827)', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ border: '1px solid var(--border-soft, #dbe2f2)', borderRadius: 20, padding: '14px 16px', background: 'var(--surface-panel, #fff)' }}>
                  <div className="fb-post-bottom" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #111827)' }}>Media and attachments</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>Add a photo or video to make the update stand out.</div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handlePostMediaSelection}
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                    />

                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 18px', background: 'linear-gradient(180deg, var(--surface-muted, #f8faff) 0%, #ffffff 100%)', borderRadius: 18, border: '1px dashed var(--border-strong, #B5D2F8)', boxSizing: 'border-box', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 260px' }}>
                        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--accent-soft, #E7F2FF)', border: '1px solid var(--border-strong, #B5D2F8)', color: 'var(--accent-strong, #007AFB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                          {(postMedia && String(postMedia.type || '').startsWith('video/')) || (!postMedia && isLikelyVideoMedia(existingPostMediaType, existingPostMediaUrl)) ? <AiFillVideoCamera /> : <AiFillPicture />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary, #111827)' }}>
                            {postMedia
                              ? 'Media ready to attach'
                              : existingPostMediaUrl
                                ? 'Current media will stay attached'
                                : 'Choose a photo or video'}
                          </div>
                          <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-muted, #64748b)', lineHeight: 1.45 }}>
                            {isOptimizingMedia
                              ? 'Optimizing your image before upload.'
                              : existingPostMediaUrl && !postMedia
                                ? 'Replace it with a new file or remove it below.'
                                : 'Images are automatically resized and converted to smaller JPEGs before upload.'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 999, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-panel, #fff)', color: 'var(--text-secondary, #334155)', fontSize: 11, fontWeight: 800, letterSpacing: '0.02em' }}>
                          <AiFillVideoCamera style={{ color: 'var(--danger, #dc2626)', fontSize: 15 }} />
                          Photos and videos
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenPostMediaPicker}
                          disabled={isOptimizingMedia}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, padding: '0 18px', borderRadius: 999, background: isOptimizingMedia ? 'var(--surface-strong, #DCEBFF)' : 'var(--accent, #007AFB)', border: 'none', cursor: isOptimizingMedia ? 'progress' : 'pointer', color: '#fff', fontSize: 13, fontWeight: 800, opacity: isOptimizingMedia ? 0.86 : 1, minWidth: 138 }}
                        >
                          <AiFillPicture style={{ fontSize: 17 }} />
                          <span>{isOptimizingMedia ? 'Optimizing...' : postMedia ? 'Change file' : 'Choose file'}</span>
                        </button>
                      </div>
                    </div>

                    {existingPostMediaUrl && !postMedia ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px', background: 'var(--surface-muted, #f8faff)', borderRadius: 16, border: '1px solid var(--border-soft, #dbe2f2)', boxSizing: 'border-box' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary, #111827)' }}>Current attachment</div>
                        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-soft, #dbe2f2)', background: '#ffffff' }}>
                          {isLikelyVideoMedia(existingPostMediaType, existingPostMediaUrl) ? (
                            <video src={existingPostMediaUrl} controls preload="metadata" style={{ width: '100%', maxHeight: 260, display: 'block', background: '#000' }} />
                          ) : (
                            <img src={existingPostPreviewUrl || existingPostMediaUrl} alt="Current attachment" loading="lazy" decoding="async" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block', background: '#ffffff' }} />
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                            Save to keep this attachment, or remove it before publishing.
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setExistingPostMediaUrl('');
                              setExistingPostPreviewUrl('');
                              setExistingPostMediaType('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            style={{ height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid var(--danger-border, #fca5a5)', background: 'var(--surface-panel, #fff)', color: 'var(--danger, #b91c1c)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Remove current media
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {postMedia ? (
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-muted, #f8faff)', borderRadius: 16, border: '1px solid var(--border-soft, #dbe2f2)', boxSizing: 'border-box' }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: String(postMedia.type || '').startsWith('video/') ? 'var(--warning-soft, #fff7ed)' : 'var(--success-soft, #E9FBF9)', color: String(postMedia.type || '').startsWith('video/') ? 'var(--danger, #dc2626)' : 'var(--success, #00B6A9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {String(postMedia.type || '').startsWith('video/') ? <AiFillVideoCamera style={{ fontSize: 20 }} /> : <AiFillPicture style={{ fontSize: 20 }} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary, #111827)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{postMedia.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
                            {postMediaMeta?.wasCompressed
                              ? `Optimized from ${formatFileSize(postMediaMeta.originalSize)} to ${formatFileSize(postMediaMeta.finalSize)}${postMediaMeta.wasConvertedToJpeg ? ' as JPEG' : ''}`
                              : `Ready to attach to this post${postMediaMeta?.wasConvertedToJpeg ? ' as JPEG' : ''}`}
                            {postMediaMeta?.hasPreviewVariant ? `, feed preview ${formatFileSize(postMediaMeta.previewFinalSize)}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPostMedia(null);
                            setPostMediaPreviewFile(null);
                            setPostMediaMeta(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          style={{ background: 'var(--surface-panel, #fff)', border: '1px solid var(--border-soft, #dbe2f2)', color: 'var(--text-secondary, #6b7280)', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
                          aria-label="Remove selected media"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 2 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', lineHeight: 1.5 }}>
                    {isPostComposerEditing
                      ? 'Your updated post will replace the current version in the HR feed as soon as you save.'
                      : 'Your post will appear in the HR feed immediately after publishing.'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={closePostComposerModal}
                      style={{ height: 44, padding: '0 18px', borderRadius: 999, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-panel, #fff)', color: 'var(--text-secondary, #334155)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitCreatePost}
                      disabled={!canSubmitPost || isPostSubmitting}
                      style={{ minWidth: 160, height: 46, border: 'none', background: canSubmitPost && !isPostSubmitting ? 'var(--accent, #007AFB)' : 'var(--surface-strong, #DCEBFF)', borderRadius: 999, color: canSubmitPost && !isPostSubmitting ? '#fff' : 'var(--text-muted, #64748b)', fontSize: 14, fontWeight: 800, letterSpacing: '0.01em', cursor: canSubmitPost && !isPostSubmitting ? 'pointer' : 'not-allowed', boxShadow: canSubmitPost && !isPostSubmitting ? '0 8px 18px rgba(0, 122, 251, 0.14)' : 'none' }}
                    >
                      {isOptimizingMedia
                        ? 'Optimizing...'
                        : isPostSubmitting
                          ? (isPostComposerEditing ? 'Saving...' : 'Publishing...')
                          : (isPostComposerEditing ? 'Save changes' : 'Publish post')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {expandedPostImage ? (
        <>
          <div
            onClick={closeExpandedPostImage}
            style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.72)', backdropFilter: 'blur(6px)', zIndex: 1205 }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1206, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
            <div onClick={(event) => event.stopPropagation()} style={{ position: 'relative', width: 'min(1080px, 100%)', maxHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={closeExpandedPostImage}
                style={{ position: 'absolute', top: -8, right: -8, width: 42, height: 42, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(15, 23, 42, 0.72)', color: '#fff', fontSize: 24, lineHeight: 1, cursor: 'pointer' }}
                aria-label="Close post image"
                title="Close"
              >
                ×
              </button>
              <img src={expandedPostImage.src} alt={expandedPostImage.alt} decoding="async" style={{ maxWidth: '100%', maxHeight: '92vh', objectFit: 'contain', borderRadius: 20, boxShadow: '0 24px 64px rgba(2, 6, 23, 0.35)', background: '#fff' }} />
            </div>
          </div>
        </>
      ) : null}

      {showDeletePostModal ? (
        <>
          <div
            onClick={handleCloseDeletePostModal}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.24)', backdropFilter: 'blur(8px)', zIndex: 1210 }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1211, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
            <div onClick={(event) => event.stopPropagation()} style={{ width: 'min(460px, 100%)', background: 'var(--surface-panel, #fff)', borderRadius: 24, border: '1px solid var(--border-soft, #dbe2f2)', overflow: 'hidden', pointerEvents: 'auto' }}>
              <div style={{ padding: '22px 24px 14px', borderBottom: '1px solid var(--border-soft, #dbe2f2)' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', height: 28, padding: '0 12px', borderRadius: 999, background: 'var(--warning-soft, #FEE2E2)', border: '1px solid var(--warning-border, #FCA5A5)', color: 'var(--danger, #b91c1c)', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Delete post
                </div>
                <div style={{ marginTop: 12, fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #111827)', lineHeight: 1.15 }}>Delete this post?</div>
                <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary, #334155)', lineHeight: 1.6 }}>
                  This will permanently remove the post from the HR feed for everyone in the school.
                </div>
              </div>

              <div style={{ padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {pendingDeletePost?.message ? (
                  <div style={{ borderRadius: 18, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-muted, #F7FBFF)', padding: '14px 16px', fontSize: 14, lineHeight: 1.55, color: 'var(--text-primary, #111827)', whiteSpace: 'pre-wrap' }}>
                    {pendingDeletePost.message}
                  </div>
                ) : null}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCloseDeletePostModal}
                    disabled={isDeletingPost}
                    style={{ height: 44, padding: '0 18px', borderRadius: 999, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-panel, #fff)', color: 'var(--text-secondary, #334155)', fontSize: 13, fontWeight: 700, cursor: isDeletingPost ? 'not-allowed' : 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeletePost}
                    disabled={isDeletingPost}
                    style={{ minWidth: 150, height: 46, border: 'none', borderRadius: 999, background: isDeletingPost ? 'var(--warning-border, #FCA5A5)' : 'var(--danger, #b91c1c)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: isDeletingPost ? 'not-allowed' : 'pointer' }}
                  >
                    {isDeletingPost ? 'Deleting...' : 'Delete post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {showCalendarEventModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'color-mix(in srgb, var(--text-primary, #111827) 26%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1220,
          }}
          onClick={handleCloseCalendarEventModal}
        >
          <div
            style={{
              width: 'min(470px, 100%)',
              background: 'var(--surface-panel, #fff)',
              borderRadius: 20,
              border: '1px solid var(--border-soft, #dbe2f2)',
              boxShadow: 'var(--shadow-panel, 0 14px 30px rgba(0, 122, 251, 0.14))',
              overflow: 'hidden',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ padding: '16px 16px 12px', background: 'linear-gradient(180deg, var(--surface-overlay, #F1F8FF) 0%, var(--surface-panel, #fff) 100%)', borderBottom: '1px solid var(--border-soft, #dbe2f2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary, #111827)' }}>
                  {editingCalendarEventId
                    ? 'Edit school calendar event'
                    : calendarModalContext === 'deadline'
                      ? 'Add upcoming deadline'
                      : 'Add school calendar event'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary, #334155)', marginTop: 4 }}>
                  {selectedCalendarDay
                    ? calendarModalContext === 'deadline'
                      ? `Choose the date for this upcoming deadline in ${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]}`
                      : `For Ethiopic day ${selectedCalendarDay.ethDay} in ${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]}`
                    : 'Select a day in the calendar first.'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCalendarEventModal}
                style={{ width: 34, height: 34, borderRadius: 999, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-overlay, #F1F8FF)', color: 'var(--text-secondary, #334155)', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}
                aria-label="Close calendar event modal"
              >
                ×
              </button>
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!canManageCalendar ? (
                <div style={{ fontSize: 10, color: 'var(--warning, #DC2626)', background: 'var(--warning-soft, #FEE2E2)', border: '1px solid var(--warning-border, #FCA5A5)', borderRadius: 10, padding: '8px 10px' }}>
                  View only. HR or admin access is required to add, edit, or delete school calendar events.
                </div>
              ) : null}

              <div style={{ border: '1px solid var(--border-soft, #dbe2f2)', borderRadius: 16, padding: 10, background: 'linear-gradient(180deg, var(--surface-overlay, #F1F8FF) 0%, var(--surface-panel, #fff) 100%)', boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 45%, transparent), var(--shadow-soft, 0 10px 24px rgba(0, 122, 251, 0.10))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-primary, #111827)' }}>Choose day from calendar</div>
                    <div style={{ fontSize: 9, color: 'var(--text-secondary, #334155)', marginTop: 2, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{calendarMonthLabel}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(-1)}
                      style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-overlay, #F1F8FF)', color: 'var(--text-primary, #111827)', cursor: 'pointer', fontSize: 16, lineHeight: 1, boxShadow: 'var(--shadow-soft, 0 10px 24px rgba(0, 122, 251, 0.10))' }}
                      aria-label="Previous Ethiopian month"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalendarMonthChange(1)}
                      style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-overlay, #F1F8FF)', color: 'var(--text-primary, #111827)', cursor: 'pointer', fontSize: 16, lineHeight: 1, boxShadow: 'var(--shadow-soft, 0 10px 24px rgba(0, 122, 251, 0.10))' }}
                      aria-label="Next Ethiopian month"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 5 }}>
                  {CALENDAR_WEEK_DAYS.map((dayLabel) => (
                    <div key={dayLabel} style={{ textAlign: 'center', fontSize: 8, fontWeight: 800, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {dayLabel}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
                  {calendarDays.map((dayItem, index) => {
                    const isSelectedDay = dayItem?.isoDate === selectedCalendarIsoDate;
                    const hasEvents = (dayItem?.events?.length || 0) > 0;
                    const isTodayDay = dayItem?.ethDay === calendarHighlightedDay;
                    const cellBackground = !dayItem
                      ? 'transparent'
                      : isTodayDay
                        ? 'linear-gradient(145deg, var(--accent-soft, #E7F2FF) 0%, color-mix(in srgb, var(--accent, #007AFB) 22%, var(--surface-overlay, #F1F8FF)) 100%)'
                        : isSelectedDay
                          ? 'linear-gradient(145deg, var(--surface-overlay, #F1F8FF) 0%, var(--accent-soft, #E7F2FF) 55%, color-mix(in srgb, var(--accent, #007AFB) 22%, var(--surface-overlay, #F1F8FF)) 100%)'
                          : hasEvents
                            ? 'linear-gradient(145deg, color-mix(in srgb, var(--warning-soft, #FEE2E2) 72%, var(--surface-panel, #fff)) 0%, var(--warning-soft, #FEE2E2) 100%)'
                            : 'linear-gradient(145deg, var(--surface-panel, #fff) 0%, var(--surface-overlay, #F1F8FF) 100%)';

                    return (
                      <button
                        key={`${dayItem?.isoDate || 'blank'}-${index}`}
                        type="button"
                        onClick={() => dayItem && setSelectedCalendarIsoDate(dayItem.isoDate)}
                        disabled={!dayItem || !canManageCalendar}
                        style={{
                          minHeight: 0,
                          aspectRatio: '1 / 1',
                          borderRadius: 10,
                          border: isTodayDay
                            ? '1px solid var(--accent, #007AFB)'
                            : isSelectedDay
                              ? '1px solid var(--accent-strong, #007AFB)'
                              : hasEvents
                                ? '1px solid var(--warning-border, #FCA5A5)'
                                : '1px solid transparent',
                          background: cellBackground,
                          color: !dayItem ? 'transparent' : isSelectedDay || isTodayDay ? 'var(--accent-strong, #007AFB)' : 'var(--text-primary, #111827)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          cursor: dayItem && canManageCalendar ? 'pointer' : 'default',
                          boxShadow: isSelectedDay
                            ? '0 0 0 1px color-mix(in srgb, var(--accent, #007AFB) 24%, transparent), 0 12px 22px color-mix(in srgb, var(--accent-strong, #007AFB) 18%, transparent)'
                            : isTodayDay
                              ? '0 10px 18px color-mix(in srgb, var(--accent-strong, #007AFB) 14%, transparent)'
                              : 'var(--shadow-soft, 0 10px 24px rgba(0, 122, 251, 0.10))',
                          padding: '4px 2px',
                          overflow: 'hidden',
                          position: 'relative',
                          transform: isSelectedDay ? 'translateY(-1px) scale(1.02)' : 'translateY(0) scale(1)',
                          transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease',
                        }}
                      >
                        {dayItem ? (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{dayItem.ethDay}</div>
                            <div style={{ fontSize: 8, color: isSelectedDay ? 'var(--accent-strong, #007AFB)' : 'var(--text-secondary, #334155)', lineHeight: 1 }}>{dayItem.gregorianDate.day}/{dayItem.gregorianDate.month}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 6 }}>
                              {dayItem.events.slice(0, 2).map((eventItem) => (
                                <span
                                  key={eventItem.id}
                                  style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: '50%',
                                    background: getCalendarEventMeta(eventItem.category).color,
                                    boxShadow: '0 0 0 2px color-mix(in srgb, var(--surface-panel, #fff) 82%, transparent)',
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        ) : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {calendarModalContext === 'deadline' ? (
                <div style={{ height: 42, borderRadius: 12, border: '1px solid var(--accent, #007AFB)', padding: '0 12px', fontSize: 12, color: 'var(--accent, #007AFB)', background: 'var(--accent-soft, #E7F2FF)', display: 'flex', alignItems: 'center', fontWeight: 800 }}>
                  Academic deadline
                </div>
              ) : (
                <select
                  value={calendarEventForm.category}
                  onChange={(event) => setCalendarEventForm((prev) => ({ ...prev, category: event.target.value, subType: 'general' }))}
                  disabled={!canManageCalendar}
                  style={{ height: 42, borderRadius: 12, border: '1px solid var(--input-border, #B5D2F8)', padding: '0 12px', fontSize: 12, color: 'var(--text-primary, #111827)', background: 'var(--input-bg, #fff)' }}
                >
                  <option value="no-class">No class day</option>
                  <option value="academic">Academic day</option>
                </select>
              )}

              {calendarModalContext === 'deadline' ? (
                <input
                  type="text"
                  value={calendarEventForm.title}
                  onChange={(event) => setCalendarEventForm((prev) => ({ ...prev, title: event.target.value }))}
                  disabled={!canManageCalendar}
                  placeholder="Deadline title"
                  style={{ height: 42, borderRadius: 12, border: '1px solid var(--input-border, #B5D2F8)', padding: '0 12px', fontSize: 12, color: 'var(--text-primary, #111827)', background: 'var(--input-bg, #fff)' }}
                />
              ) : null}

              <textarea
                value={calendarEventForm.notes}
                onChange={(event) => setCalendarEventForm((prev) => ({ ...prev, notes: event.target.value }))}
                disabled={!canManageCalendar}
                placeholder={calendarModalContext === 'deadline' ? 'Optional deadline note' : 'Optional note'}
                rows={3}
                style={{ borderRadius: 12, border: '1px solid var(--input-border, #B5D2F8)', padding: '12px', fontSize: 12, color: 'var(--text-primary, #111827)', background: 'var(--input-bg, #fff)', resize: 'vertical' }}
              />

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                <button
                  type="button"
                  onClick={handleCreateCalendarEvent}
                  disabled={calendarEventSaving || !selectedCalendarDay || !canManageCalendar}
                  style={{
                    flex: '1 1 180px',
                    height: 42,
                    borderRadius: 12,
                    border: 'none',
                    background: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? 'var(--surface-strong, #DCEBFF)' : 'linear-gradient(135deg, var(--accent, #007AFB) 0%, var(--accent-strong, #007AFB) 100%)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? 'not-allowed' : 'pointer',
                    boxShadow: calendarEventSaving || !selectedCalendarDay || !canManageCalendar ? 'none' : '0 12px 18px color-mix(in srgb, var(--accent-strong, #007AFB) 18%, transparent)',
                  }}
                >
                  {calendarEventSaving ? 'Saving...' : editingCalendarEventId ? 'Update calendar event' : 'Save calendar event'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseCalendarEventModal}
                  style={{ height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border-soft, #dbe2f2)', background: 'var(--surface-overlay, #F1F8FF)', color: 'var(--text-primary, #111827)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
