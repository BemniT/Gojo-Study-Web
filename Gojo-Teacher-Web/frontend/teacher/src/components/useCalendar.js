/**
 * @file useCalendar.js
 * @description React hook that manages Ethiopian calendar state, event loading, and CRUD operations for school calendar events.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import EthiopicCalendar from "ethiopic-calendar";
import axios from "axios";
import { fetchCachedJson } from "../utils/rtdbCache";
import { readSessionResource, writeSessionResource } from "../utils/teacherData";

const ETHIOPIAN_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miyazya",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
];

const DEFAULT_ETHIOPIAN_SPECIAL_DAYS = [
  { month: 1, day: 1, title: "Enkutatash", notes: "Ethiopian New Year." },
  { month: 1, day: 17, title: "Meskel", notes: "Finding of the True Cross." },
  { month: 4, day: 29, title: "Genna", notes: "Ethiopian Christmas." },
  { month: 5, day: 11, title: "Timkat", notes: "Epiphany celebration." },
  { month: 6, day: 23, title: "Adwa Victory Day", notes: "National remembrance day." },
  { month: 8, day: 23, title: "International Labour Day", notes: "Public holiday." },
  { month: 9, day: 1, title: "Patriots' Victory Day", notes: "Public holiday." },
  { month: 9, day: 20, title: "Downfall of the Derg", notes: "National public holiday." },
];

const YEAR_SPECIFIC_GOVERNMENT_CLOSURES_GREGORIAN = {
  2017: [
    { date: "2025-03-31", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2025-06-06", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2025-09-05", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
  2018: [
    { date: "2026-03-20", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2026-05-27", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2026-08-26", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
  2019: [
    { date: "2027-03-10", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2027-05-17", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2027-08-15", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
  2020: [
    { date: "2028-02-27", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2028-05-05", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2028-08-04", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
  2021: [
    { date: "2029-02-14", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2029-04-24", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2029-07-24", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
  2022: [
    { date: "2030-02-03", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2030-04-13", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2030-07-13", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
  2023: [
    { date: "2031-01-23", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2031-04-02", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2031-07-02", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
  2024: [
    { date: "2032-01-11", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2032-03-21", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2032-06-20", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
  2025: [
    { date: "2032-12-31", title: "Eid al-Fitr", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2033-03-10", title: "Eid al-Adha", notes: "Government holiday (may vary by moon sighting)." },
    { date: "2033-06-09", title: "Mawlid", notes: "Government holiday (may vary by moon sighting)." },
  ],
};

const CALENDAR_MANAGER_ROLES = new Set([
  "registrar",
  "registerer",
  "admin",
  "admins",
  "school_admin",
  "school_admins",
]);

const CALENDAR_WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CALENDAR_EVENT_META = {
  academic: {
    label: "Academic",
    color: "var(--success)",
    background: "var(--success-soft)",
    border: "var(--success-border)",
  },
  "no-class": {
    label: "No class",
    color: "var(--warning)",
    background: "var(--warning-soft)",
    border: "var(--warning-border)",
  },
};

const buildYearSpecificGovernmentClosures = (ethiopianYear) => {
  const gregorianEvents = YEAR_SPECIFIC_GOVERNMENT_CLOSURES_GREGORIAN[ethiopianYear] || [];

  return gregorianEvents
    .map((eventItem) => {
      const [year, month, day] = String(eventItem.date || "").split("-").map(Number);
      if (!year || !month || !day) {
        return null;
      }

      const ethiopianDate = EthiopicCalendar.ge(year, month, day);
      if (ethiopianDate.year !== ethiopianYear) {
        return null;
      }

      return {
        month: ethiopianDate.month,
        day: ethiopianDate.day,
        title: eventItem.title,
        notes: eventItem.notes,
      };
    })
    .filter(Boolean);
};

// Calculates the Gregorian date of Orthodox Easter for a given Gregorian year using the Julian calendar formula.
const getOrthodoxEasterDate = (gregorianYear) => {
  const a = gregorianYear % 4;
  const b = gregorianYear % 7;
  const c = gregorianYear % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;

  const julianDateAsGregorian = new Date(gregorianYear, julianMonth - 1, julianDay);
  julianDateAsGregorian.setDate(julianDateAsGregorian.getDate() + 13);
  return julianDateAsGregorian;
};

// Computes movable Orthodox holiday dates (Siklet and Fasika) in Ethiopian calendar for the given Ethiopian year.
const buildMovableOrthodoxClosures = (ethiopianYear) => {
  const movableEvents = [];
  const seenEventKeys = new Set();

  [ethiopianYear + 7, ethiopianYear + 8].forEach((gregorianYear) => {
    const easterDate = getOrthodoxEasterDate(gregorianYear);
    const goodFridayDate = new Date(easterDate);
    goodFridayDate.setDate(goodFridayDate.getDate() - 2);

    [
      {
        title: "Siklet",
        notes: "Good Friday school closure.",
        date: goodFridayDate,
      },
      {
        title: "Fasika",
        notes: "Orthodox Easter school closure.",
        date: easterDate,
      },
    ].forEach((eventItem) => {
      const ethDate = EthiopicCalendar.ge(
        eventItem.date.getFullYear(),
        eventItem.date.getMonth() + 1,
        eventItem.date.getDate()
      );

      if (ethDate.year !== ethiopianYear) {
        return;
      }

      const eventKey = `${ethDate.year}-${ethDate.month}-${ethDate.day}-${eventItem.title}`;
      if (seenEventKeys.has(eventKey)) {
        return;
      }

      seenEventKeys.add(eventKey);
      movableEvents.push({
        month: ethDate.month,
        day: ethDate.day,
        title: eventItem.title,
        notes: eventItem.notes,
      });
    });
  });

  return movableEvents;
};

// Assembles all default no-class events (fixed holidays, movable Orthodox, and Islamic closures) for the given Ethiopian year.
const buildDefaultCalendarEvents = (ethiopianYear) =>
  [
    ...DEFAULT_ETHIOPIAN_SPECIAL_DAYS,
    ...buildMovableOrthodoxClosures(ethiopianYear),
    ...buildYearSpecificGovernmentClosures(ethiopianYear),
  ].map((eventItem) => {
    const gregorianDate = EthiopicCalendar.eg(
      ethiopianYear,
      eventItem.month,
      eventItem.day
    );
    const isoDate = `${gregorianDate.year}-${String(gregorianDate.month).padStart(
      2,
      "0"
    )}-${String(gregorianDate.day).padStart(2, "0")}`;

    return {
      id: `default-${ethiopianYear}-${eventItem.month}-${eventItem.day}`,
      title: eventItem.title,
      type: "no-class",
      category: "no-class",
      subType: "general",
      notes: eventItem.notes,
      gregorianDate: isoDate,
      ethiopianDate: {
        year: ethiopianYear,
        month: eventItem.month,
        day: eventItem.day,
      },
      createdAt: "",
      createdBy: "system-default",
      isDefault: true,
      showInUpcomingDeadlines: false,
      source: "default-closure",
    };
  });

// Formats year, month, and day integers into a zero-padded ISO date string (YYYY-MM-DD).
const formatIsoDate = (year, month, day) => {
  if (!year || !month || !day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// Extracts the YYYY-MM bucket key from an ISO date string.
const toCalendarBucketKey = (isoDate) => {
  const match = String(isoDate || "").trim().match(/^(\d{4}-\d{2})-/);
  return match?.[1] || "";
};

// Returns an array of all YYYY-MM bucket keys between two ISO dates, inclusive.
const collectCalendarBucketKeysBetween = (startIsoDate, endIsoDate) => {
  const startMatch = String(startIsoDate || "").trim().match(/^(\d{4})-(\d{2})-/);
  const endMatch = String(endIsoDate || "").trim().match(/^(\d{4})-(\d{2})-/);
  if (!startMatch || !endMatch) return [];

  let currentYear = Number(startMatch[1]);
  let currentMonth = Number(startMatch[2]);
  const endYear = Number(endMatch[1]);
  const endMonth = Number(endMatch[2]);
  const keys = [];

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    keys.push(`${currentYear}-${String(currentMonth).padStart(2, "0")}`);
    currentMonth += 1;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
  }

  return keys;
};

// Combines bucket keys for the visible calendar month and the upcoming deadline window into a deduplicated array.
const buildCalendarBucketKeys = ({
  visibleMonthStartIsoDate,
  visibleMonthEndIsoDate,
  todayIsoDate,
  deadlineEndIsoDate,
}) => {
  return [...new Set([
    ...collectCalendarBucketKeysBetween(visibleMonthStartIsoDate, visibleMonthEndIsoDate),
    ...collectCalendarBucketKeysBetween(todayIsoDate, deadlineEndIsoDate),
  ])];
};

// Strips and normalises a calendar event object to the shape written to Firebase.
const toCalendarStoragePayload = (eventValue = {}) => ({
  title: String(eventValue?.title || "").trim(),
  type: String(eventValue?.type || "").trim(),
  category: String(eventValue?.category || "no-class").trim(),
  subType: String(eventValue?.subType || "general").trim(),
  notes: String(eventValue?.notes || "").trim(),
  gregorianDate: String(eventValue?.gregorianDate || "").trim(),
  ethiopianDate: eventValue?.ethiopianDate || null,
  createdAt: eventValue?.createdAt || "",
  createdBy: eventValue?.createdBy || "",
  showInUpcomingDeadlines: Boolean(eventValue?.showInUpcomingDeadlines),
});

/**
 * Manages Ethiopian calendar view state, school calendar events, deadlines, and all related CRUD operations.
 * @param {{ effectiveSchoolCode: string, DB_ROOT: string, teacherId: string, canManageCalendar: boolean }} params
 * @returns {{ calendarViewDate: object, calendarDays: Array, mergedCalendarEvents: Array,
 *   upcomingDeadlineEvents: Array, loadCalendarEvents: Function, handleCreateCalendarEvent: Function,
 *   handleEditCalendarEvent: Function, handleDeleteCalendarEvent: Function,
 *   handleConfirmedDelete: Function, handleOpenCalendarEventModal: Function,
 *   handleOpenDeadlineModal: Function, handleCloseCalendarEventModal: Function }}
 */
export function useCalendar({ effectiveSchoolCode, DB_ROOT, teacherId, canManageCalendar }) {
  const [calendarViewDate, setCalendarViewDate] = useState(() => ({
    year: EthiopicCalendar.ge(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    ).year,
    month: EthiopicCalendar.ge(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate()
    ).month,
  }));
  const [selectedCalendarIsoDate, setSelectedCalendarIsoDate] = useState("");
  const [hoveredCalendarIsoDate, setHoveredCalendarIsoDate] = useState("");
  const [showAllUpcomingDeadlines, setShowAllUpcomingDeadlines] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarEventsLoading, setCalendarEventsLoading] = useState(false);
  const [calendarEventForm, setCalendarEventForm] = useState({
    title: "",
    category: "no-class",
    subType: "general",
    notes: "",
  });
  const [calendarEventSaving, setCalendarEventSaving] = useState(false);
  const [editingCalendarEventId, setEditingCalendarEventId] = useState("");
  const [calendarActionMessage, setCalendarActionMessage] = useState("");
  const [calendarErrorMessage, setCalendarErrorMessage] = useState("");
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState(null);
  const [showCalendarEventModal, setShowCalendarEventModal] = useState(false);
  const [calendarModalContext, setCalendarModalContext] = useState("calendar");

  // Returns the canonical event-type key ("academic" or "no-class") for the given category.
  const getCalendarEventKey = useCallback((category) => {
    if (category === "academic") return "academic";
    return "no-class";
  }, []);

  // Returns the display metadata (label, color, background) for the given event category.
  const getCalendarEventMeta = useCallback((category) => {
    if (category === "academic") return CALENDAR_EVENT_META.academic;
    return CALENDAR_EVENT_META["no-class"];
  }, []);

  // Normalises a raw Firebase calendar event entry into a consistent event object.
  const normalizeCalendarEvent = useCallback((eventId, eventValue) => {
    const legacyType = eventValue?.type || "academic";
    const category =
      eventValue?.category ||
      (legacyType === "academic" ? "academic" : "no-class");

    return {
      id: eventId,
      title: eventValue?.title || getCalendarEventMeta(category).label,
      type: getCalendarEventKey(category),
      category,
      subType: "general",
      notes: eventValue?.notes || "",
      gregorianDate: eventValue?.gregorianDate || "",
      ethiopianDate: eventValue?.ethiopianDate || null,
      createdAt: eventValue?.createdAt || "",
      createdBy: eventValue?.createdBy || "",
      showInUpcomingDeadlines: Boolean(eventValue?.showInUpcomingDeadlines),
      isDefault: false,
    };
  }, [getCalendarEventKey, getCalendarEventMeta]);

  // Maps all entries in a Firebase calendar node to normalised event objects, filtering out those without a date.
  const normalizeCalendarEventsFromNode = useCallback((calendarNode = {}) =>
    Object.entries(calendarNode || {})
      .map(([eventId, eventValue]) => normalizeCalendarEvent(eventId, eventValue))
      .filter((eventItem) => eventItem.gregorianDate), [normalizeCalendarEvent]);

  // Sorts an array of calendar events chronologically by Gregorian date then creation time.
  const sortCalendarEvents = useCallback((events) =>
    [...events].sort((leftEvent, rightEvent) => {
      const dateComparison = String(leftEvent.gregorianDate || "").localeCompare(
        String(rightEvent.gregorianDate || "")
      );
      if (dateComparison !== 0) return dateComparison;
      return String(leftEvent.createdAt || "").localeCompare(
        String(rightEvent.createdAt || "")
      );
    }), []);

  // Formats an ISO date string into a short human-readable label (e.g. "Jan 5").
  const formatCalendarDeadlineDate = useCallback((isoDate) => {
    if (!isoDate) return "";
    const parsedDate = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return "";
    return parsedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, []);

  // Advances or retreats the visible calendar month by the given signed offset.
  const handleCalendarMonthChange = useCallback((offset) => {
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
  }, []);

  const calendarNow = new Date();
  const currentEthiopicDate = EthiopicCalendar.ge(
    calendarNow.getFullYear(),
    calendarNow.getMonth() + 1,
    calendarNow.getDate()
  );
  const calendarDaysInMonth =
    calendarViewDate.month === 13
      ? calendarViewDate.year % 4 === 3
        ? 6
        : 5
      : 30;
  const calendarMonthStartGregorian = EthiopicCalendar.eg(
    calendarViewDate.year,
    calendarViewDate.month,
    1
  );
  const calendarMonthEndGregorian = EthiopicCalendar.eg(
    calendarViewDate.year,
    calendarViewDate.month,
    calendarDaysInMonth
  );
  const calendarMonthStartIsoDate = formatIsoDate(
    calendarMonthStartGregorian.year,
    calendarMonthStartGregorian.month,
    calendarMonthStartGregorian.day
  );
  const calendarMonthEndIsoDate = formatIsoDate(
    calendarMonthEndGregorian.year,
    calendarMonthEndGregorian.month,
    calendarMonthEndGregorian.day
  );
  const calendarFirstWeekday = new Date(
    calendarMonthStartGregorian.year,
    calendarMonthStartGregorian.month - 1,
    calendarMonthStartGregorian.day
  ).getDay();
  const isCurrentCalendarMonth =
    calendarViewDate.year === currentEthiopicDate.year &&
    calendarViewDate.month === currentEthiopicDate.month;
  const calendarHighlightedDay = isCurrentCalendarMonth
    ? currentEthiopicDate.day
    : null;

  const calendarMonthLabel = `${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]} ${calendarViewDate.year}`;

  const defaultCalendarEvents = useMemo(
    () => buildDefaultCalendarEvents(calendarViewDate.year),
    [calendarViewDate.year]
  );
  const mergedCalendarEvents = useMemo(
    () => sortCalendarEvents([
      ...defaultCalendarEvents,
      ...calendarEvents,
    ]),
    [calendarEvents, defaultCalendarEvents, sortCalendarEvents]
  );

  const calendarEventsByDate = useMemo(
    () => mergedCalendarEvents.reduce((eventsMap, eventItem) => {
      const eventDate = String(eventItem.gregorianDate || "");
      if (!eventDate) return eventsMap;
      if (!eventsMap[eventDate]) {
        eventsMap[eventDate] = [];
      }
      eventsMap[eventDate].push(eventItem);
      return eventsMap;
    }, {}),
    [mergedCalendarEvents]
  );

  const calendarDays = useMemo(
    () => Array.from(
      { length: calendarFirstWeekday + calendarDaysInMonth },
      (_, index) => {
        const dayNumber = index - calendarFirstWeekday + 1;
        if (dayNumber < 1 || dayNumber > calendarDaysInMonth) return null;

        const gregorianDate = EthiopicCalendar.eg(
          calendarViewDate.year,
          calendarViewDate.month,
          dayNumber
        );
        const isoDate = `${gregorianDate.year}-${String(gregorianDate.month).padStart(
          2,
          "0"
        )}-${String(gregorianDate.day).padStart(2, "0")}`;

        return {
          ethDay: dayNumber,
          isoDate,
          gregorianDate,
          events: calendarEventsByDate[isoDate] || [],
        };
      }
    ),
    [calendarDaysInMonth, calendarEventsByDate, calendarFirstWeekday, calendarViewDate.month, calendarViewDate.year]
  );

  const monthlyCalendarEvents = useMemo(
    () => sortCalendarEvents(
      [...calendarDays]
        .filter(Boolean)
        .flatMap((dayItem) => dayItem.events.map((eventItem) => ({ ...eventItem, ethDay: dayItem.ethDay })))
    ),
    [calendarDays, sortCalendarEvents]
  );

  const selectedCalendarDay = useMemo(
    () => calendarDays.find((dayItem) => dayItem?.isoDate === selectedCalendarIsoDate) || null,
    [calendarDays, selectedCalendarIsoDate]
  );
  const selectedCalendarEvents = selectedCalendarDay?.events || [];

  const deadlineWindowEnd = new Date(calendarNow);
  deadlineWindowEnd.setDate(deadlineWindowEnd.getDate() + 30);
  const deadlineWindowEndIsoDate = formatIsoDate(
    deadlineWindowEnd.getFullYear(),
    deadlineWindowEnd.getMonth() + 1,
    deadlineWindowEnd.getDate()
  );
  const calendarTodayIsoDate = formatIsoDate(
    calendarNow.getFullYear(),
    calendarNow.getMonth() + 1,
    calendarNow.getDate()
  );

  const calendarBucketKeys = useMemo(
    () =>
      buildCalendarBucketKeys({
        visibleMonthStartIsoDate: calendarMonthStartIsoDate,
        visibleMonthEndIsoDate: calendarMonthEndIsoDate,
        todayIsoDate: calendarTodayIsoDate,
        deadlineEndIsoDate: deadlineWindowEndIsoDate,
      }),
    [calendarMonthStartIsoDate, calendarMonthEndIsoDate, calendarTodayIsoDate, deadlineWindowEndIsoDate]
  );

  const upcomingDeadlineEvents = useMemo(
    () => calendarEvents
      .filter(
        (eventItem) =>
          eventItem.showInUpcomingDeadlines &&
          eventItem.category === "academic" &&
          String(eventItem.gregorianDate || "") >= calendarTodayIsoDate &&
          String(eventItem.gregorianDate || "") <= deadlineWindowEndIsoDate
      )
      .sort((a, b) => String(a.gregorianDate || "").localeCompare(String(b.gregorianDate || ""))),
    [calendarEvents, calendarTodayIsoDate, deadlineWindowEndIsoDate]
  );

  const visibleUpcomingDeadlineEvents = showAllUpcomingDeadlines
    ? upcomingDeadlineEvents
    : upcomingDeadlineEvents.slice(0, 3);

  // Fetches calendar events for the current bucket keys from session cache or Firebase and updates state.
  const loadCalendarEvents = useCallback(async (options = {}) => {
    if (!effectiveSchoolCode) {
      setCalendarEvents([]);
      return;
    }

    const forceRefresh = Boolean(options?.force);
    setCalendarEventsLoading(true);
    try {
      const bucketNodes = await Promise.all(
        calendarBucketKeys.map((bucketKey) => {
          const bucketCacheKey = `calendar_bucket_${effectiveSchoolCode}_${bucketKey}`;
          if (!forceRefresh) {
            const cachedBucket = readSessionResource(bucketCacheKey, { ttlMs: 300000 });
            if (cachedBucket !== null && cachedBucket !== undefined) {
              return Promise.resolve(cachedBucket);
            }
          }
          return fetchCachedJson(
            `${DB_ROOT}/CalendarEventsByMonth/${encodeURIComponent(bucketKey)}.json`,
            { ttlMs: 5 * 60 * 1000, fallbackValue: {}, force: forceRefresh }
          ).then((bucketData) => {
            writeSessionResource(bucketCacheKey, bucketData ?? {});
            return bucketData;
          });
        })
      );

      let normalizedEvents = bucketNodes.flatMap((bucketNode) =>
        normalizeCalendarEventsFromNode(bucketNode)
      );

      if (!normalizedEvents.length) {
        const fullFetchKey = `calEventsFullFetched_${effectiveSchoolCode}`;
        if (!sessionStorage.getItem(fullFetchKey)) {
          const rawEvents = await fetchCachedJson(`${DB_ROOT}/CalendarEvents.json`, {
            ttlMs: 5 * 60 * 1000,
            fallbackValue: {},
            force: forceRefresh,
          });

          normalizedEvents = normalizeCalendarEventsFromNode(rawEvents).filter((eventItem) =>
            calendarBucketKeys.includes(toCalendarBucketKey(eventItem.gregorianDate))
          );

          sessionStorage.setItem(fullFetchKey, "1");
          if (normalizedEvents.length) {
            await Promise.all(
              normalizedEvents
                .map((eventItem) => {
                  const bucketKey = toCalendarBucketKey(eventItem.gregorianDate);
                  if (!bucketKey || !eventItem.id) return null;

                  return axios
                    .put(
                      `${DB_ROOT}/CalendarEventsByMonth/${encodeURIComponent(bucketKey)}/${encodeURIComponent(eventItem.id)}.json`,
                      toCalendarStoragePayload(eventItem)
                    )
                    .catch(() => null);
                })
                .filter(Boolean)
            );
          }
        }
      }

      const sortedEvents = sortCalendarEvents(normalizedEvents);
      setCalendarEvents(sortedEvents);
    } catch (err) {
      console.error("Failed to load calendar events:", err);
      setCalendarEvents([]);
    } finally {
      setCalendarEventsLoading(false);
    }
  }, [DB_ROOT, calendarBucketKeys, effectiveSchoolCode, normalizeCalendarEventsFromNode, sortCalendarEvents]);

  // Validates and saves (creates or updates) a calendar event to Firebase, then refreshes the event list.
  const handleCreateCalendarEvent = useCallback(async () => {
    if (!effectiveSchoolCode) {
      setCalendarErrorMessage("Please select a school before saving calendar events.");
      return;
    }

    if (!canManageCalendar) {
      setCalendarErrorMessage("Only registrar or admin users can manage calendar events.");
      return;
    }

    if (!selectedCalendarDay) {
      setCalendarErrorMessage("Please select a calendar day first.");
      return;
    }

    if (calendarModalContext === "deadline" && !calendarEventForm.title.trim()) {
      setCalendarErrorMessage("Please enter a deadline title.");
      return;
    }

    setCalendarEventSaving(true);
    try {
      const existingEvent = editingCalendarEventId
        ? calendarEvents.find((eventItem) => eventItem.id === editingCalendarEventId) || null
        : null;
      const normalizedCategory =
        calendarModalContext === "deadline" ? "academic" : calendarEventForm.category;
      const selectedEventMeta = getCalendarEventMeta(normalizedCategory);
      const payload = {
        title: calendarEventForm.title.trim() || selectedEventMeta.label,
        type: getCalendarEventKey(normalizedCategory),
        category: normalizedCategory,
        subType: "general",
        notes: calendarEventForm.notes.trim(),
        showInUpcomingDeadlines:
          calendarModalContext === "deadline" ||
          Boolean(existingEvent?.showInUpcomingDeadlines),
        gregorianDate: selectedCalendarDay.isoDate,
        ethiopianDate: {
          year: calendarViewDate.year,
          month: calendarViewDate.month,
          day: selectedCalendarDay.ethDay,
        },
        createdAt: new Date().toISOString(),
        createdBy: teacherId || "",
      };
      const nextBucketKey = toCalendarBucketKey(payload.gregorianDate);

      if (editingCalendarEventId) {
        await axios.patch(`${DB_ROOT}/CalendarEvents/${editingCalendarEventId}.json`, payload);
        if (nextBucketKey) {
          await axios.put(
            `${DB_ROOT}/CalendarEventsByMonth/${encodeURIComponent(nextBucketKey)}/${encodeURIComponent(editingCalendarEventId)}.json`,
            payload
          );
        }

        const previousBucketKey = toCalendarBucketKey(existingEvent?.gregorianDate);
        if (previousBucketKey && previousBucketKey !== nextBucketKey) {
          await axios
            .delete(
              `${DB_ROOT}/CalendarEventsByMonth/${encodeURIComponent(previousBucketKey)}/${encodeURIComponent(editingCalendarEventId)}.json`
            )
            .catch(() => null);
        }
        setCalendarActionMessage("Calendar event updated successfully.");
      } else {
        const createRes = await axios.post(`${DB_ROOT}/CalendarEvents.json`, payload);
        const createdEventId = String(createRes?.data?.name || "").trim();
        if (createdEventId && nextBucketKey) {
          await axios.put(
            `${DB_ROOT}/CalendarEventsByMonth/${encodeURIComponent(nextBucketKey)}/${encodeURIComponent(createdEventId)}.json`,
            payload
          );
        }
        setCalendarActionMessage("Calendar event saved successfully.");
      }

      setCalendarEventForm({ title: "", category: "no-class", subType: "general", notes: "" });
      setEditingCalendarEventId("");
      setShowCalendarEventModal(false);
      setCalendarModalContext("calendar");
      const changedBucketKey = toCalendarBucketKey(payload.gregorianDate);
      if (changedBucketKey) {
        writeSessionResource(`calendar_bucket_${effectiveSchoolCode}_${changedBucketKey}`, null);
      }
      if (editingCalendarEventId) {
        const previousBucketKeyForCache = toCalendarBucketKey(existingEvent?.gregorianDate);
        if (previousBucketKeyForCache && previousBucketKeyForCache !== changedBucketKey) {
          writeSessionResource(`calendar_bucket_${effectiveSchoolCode}_${previousBucketKeyForCache}`, null);
        }
      }
      await loadCalendarEvents();
    } catch (err) {
      console.error("Failed to save calendar event:", err);
      setCalendarErrorMessage("Failed to save calendar event. Please try again.");
    } finally {
      setCalendarEventSaving(false);
    }
  }, [
    DB_ROOT,
    calendarEventForm.category,
    calendarEventForm.notes,
    calendarEventForm.title,
    calendarEvents,
    calendarModalContext,
    calendarViewDate.month,
    calendarViewDate.year,
    canManageCalendar,
    editingCalendarEventId,
    effectiveSchoolCode,
    getCalendarEventKey,
    getCalendarEventMeta,
    loadCalendarEvents,
    selectedCalendarDay,
    teacherId,
  ]);

  // Populates the event form with an existing event's data and opens the edit modal.
  const handleEditCalendarEvent = useCallback((eventItem) => {
    if (!canManageCalendar || eventItem.isDefault) return;

    setCalendarModalContext(eventItem.showInUpcomingDeadlines ? "deadline" : "calendar");
    setShowCalendarEventModal(true);

    const ethiopianDate =
      eventItem.ethiopianDate ||
      (() => {
        const [year, month, day] = String(eventItem.gregorianDate || "")
          .split("-")
          .map(Number);
        if (!year || !month || !day) {
          return null;
        }
        return EthiopicCalendar.ge(year, month, day);
      })();

    if (ethiopianDate?.year && ethiopianDate?.month) {
      setCalendarViewDate({ year: ethiopianDate.year, month: ethiopianDate.month });
    }

    setSelectedCalendarIsoDate(eventItem.gregorianDate);
    setCalendarEventForm({
      title: eventItem.title || "",
      category: eventItem.category || (eventItem.type === "academic" ? "academic" : "no-class"),
      subType: "general",
      notes: eventItem.notes || "",
    });
    setEditingCalendarEventId(eventItem.id);
  }, [canManageCalendar]);

  // Validates delete permissions and sets the pending-delete event to trigger the confirmation prompt.
  const handleDeleteCalendarEvent = useCallback(async (eventItem) => {
    if (!canManageCalendar) {
      setCalendarErrorMessage("Only registrar or admin users can manage calendar events.");
      return;
    }

    if (eventItem.isDefault) {
      setCalendarErrorMessage("Default Ethiopian special days cannot be deleted.");
      return;
    }

    setPendingDeleteEvent(eventItem);
    return;
  }, [canManageCalendar]);

  // Permanently deletes a confirmed event from Firebase and refreshes the event list.
  const handleConfirmedDelete = useCallback(async (eventItem) => {
    if (!effectiveSchoolCode) {
      setCalendarErrorMessage("Please select a school before deleting calendar events.");
      return;
    }

    setCalendarEventSaving(true);
    try {
      await axios.delete(`${DB_ROOT}/CalendarEvents/${eventItem.id}.json`);
      const bucketKey = toCalendarBucketKey(eventItem.gregorianDate);
      if (bucketKey) {
        await axios
          .delete(
            `${DB_ROOT}/CalendarEventsByMonth/${encodeURIComponent(bucketKey)}/${encodeURIComponent(eventItem.id)}.json`
          )
          .catch(() => null);
      }
      if (editingCalendarEventId === eventItem.id) {
        setEditingCalendarEventId("");
        setCalendarEventForm({ title: "", category: "no-class", subType: "general", notes: "" });
      }
      setPendingDeleteEvent(null);
      setCalendarActionMessage("Calendar event deleted successfully.");
      const changedBucketKey = toCalendarBucketKey(eventItem.gregorianDate);
      if (changedBucketKey) {
        writeSessionResource(`calendar_bucket_${effectiveSchoolCode}_${changedBucketKey}`, null);
      }
      await loadCalendarEvents();
    } catch (err) {
      console.error("Failed to delete calendar event:", err);
      setCalendarErrorMessage("Failed to delete calendar event. Please try again.");
    } finally {
      setCalendarEventSaving(false);
    }
  }, [DB_ROOT, editingCalendarEventId, effectiveSchoolCode, loadCalendarEvents]);

  // Resets the event form and opens the calendar-event creation modal.
  const handleOpenCalendarEventModal = useCallback(() => {
    const selectableCalendarDays = calendarDays.filter(Boolean);
    if (!selectedCalendarIsoDate && selectableCalendarDays.length > 0) {
      setSelectedCalendarIsoDate(selectableCalendarDays[0].isoDate);
    }
    setEditingCalendarEventId("");
    setCalendarEventForm({ title: "", category: "no-class", subType: "general", notes: "" });
    setCalendarModalContext("calendar");
    setShowCalendarEventModal(true);
  }, [calendarDays, selectedCalendarIsoDate]);

  // Resets the event form and opens the deadline creation modal with academic category pre-selected.
  const handleOpenDeadlineModal = useCallback(() => {
    const selectableCalendarDays = calendarDays.filter(Boolean);
    if (!selectedCalendarIsoDate && selectableCalendarDays.length > 0) {
      setSelectedCalendarIsoDate(selectableCalendarDays[0].isoDate);
    }
    setEditingCalendarEventId("");
    setCalendarEventForm({ title: "", category: "academic", subType: "general", notes: "" });
    setCalendarModalContext("deadline");
    setShowCalendarEventModal(true);
  }, [calendarDays, selectedCalendarIsoDate]);

  // Resets the event form state and closes the calendar event modal.
  const handleCloseCalendarEventModal = useCallback(() => {
    setEditingCalendarEventId("");
    setCalendarEventForm({ title: "", category: "no-class", subType: "general", notes: "" });
    setCalendarModalContext("calendar");
    setShowCalendarEventModal(false);
  }, []);

  useEffect(() => {
    const preferredDay =
      calendarDays.find((dayItem) => dayItem?.ethDay === calendarHighlightedDay) ||
      calendarDays.find(Boolean) ||
      null;

    if (!preferredDay) {
      setSelectedCalendarIsoDate("");
      return;
    }

    const stillVisible = calendarDays.some(
      (dayItem) => dayItem?.isoDate === selectedCalendarIsoDate
    );
    if (!stillVisible) {
      setSelectedCalendarIsoDate(preferredDay.isoDate);
    }
  }, [
    calendarViewDate.year,
    calendarViewDate.month,
    calendarHighlightedDay,
    calendarDays.length,
    selectedCalendarIsoDate,
    calendarDays,
  ]);

  useEffect(() => {
    if (!calendarActionMessage) return undefined;
    const timeoutId = window.setTimeout(() => {
      setCalendarActionMessage("");
    }, 2600);
    return () => window.clearTimeout(timeoutId);
  }, [calendarActionMessage]);

  useEffect(() => {
    if (!calendarErrorMessage) return undefined;
    const timeoutId = window.setTimeout(() => {
      setCalendarErrorMessage("");
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [calendarErrorMessage]);

  useEffect(() => {
    setShowAllUpcomingDeadlines(false);
    loadCalendarEvents();
  }, [effectiveSchoolCode, calendarViewDate.year, calendarViewDate.month, loadCalendarEvents]);

  return {
    ETHIOPIAN_MONTHS,
    CALENDAR_WEEK_DAYS,
    CALENDAR_MANAGER_ROLES,
    CALENDAR_EVENT_META,
    calendarViewDate,
    setCalendarViewDate,
    selectedCalendarIsoDate,
    setSelectedCalendarIsoDate,
    hoveredCalendarIsoDate,
    setHoveredCalendarIsoDate,
    showAllUpcomingDeadlines,
    setShowAllUpcomingDeadlines,
    calendarEvents,
    setCalendarEvents,
    calendarEventsLoading,
    setCalendarEventsLoading,
    calendarEventForm,
    setCalendarEventForm,
    calendarEventSaving,
    setCalendarEventSaving,
    editingCalendarEventId,
    setEditingCalendarEventId,
    calendarActionMessage,
    setCalendarActionMessage,
    calendarErrorMessage,
    setCalendarErrorMessage,
    pendingDeleteEvent,
    setPendingDeleteEvent,
    showCalendarEventModal,
    setShowCalendarEventModal,
    calendarModalContext,
    setCalendarModalContext,
    currentEthiopicDate,
    calendarDaysInMonth,
    calendarMonthStartGregorian,
    calendarMonthEndGregorian,
    calendarMonthStartIsoDate,
    calendarMonthEndIsoDate,
    calendarFirstWeekday,
    isCurrentCalendarMonth,
    calendarHighlightedDay,
    calendarMonthLabel,
    defaultCalendarEvents,
    mergedCalendarEvents,
    calendarEventsByDate,
    calendarDays,
    monthlyCalendarEvents,
    selectedCalendarDay,
    selectedCalendarEvents,
    deadlineWindowEnd,
    deadlineWindowEndIsoDate,
    calendarTodayIsoDate,
    calendarBucketKeys,
    upcomingDeadlineEvents,
    visibleUpcomingDeadlineEvents,
    normalizeCalendarEvent,
    normalizeCalendarEventsFromNode,
    sortCalendarEvents,
    getCalendarEventKey,
    getCalendarEventMeta,
    formatCalendarDeadlineDate,
    handleCalendarMonthChange,
    loadCalendarEvents,
    handleCreateCalendarEvent,
    handleEditCalendarEvent,
    handleDeleteCalendarEvent,
    handleConfirmedDelete,
    handleOpenCalendarEventModal,
    handleOpenDeadlineModal,
    handleCloseCalendarEventModal,
  };
}
