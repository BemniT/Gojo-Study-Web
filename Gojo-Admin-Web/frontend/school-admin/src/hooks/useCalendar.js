import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import EthiopicCalendar from "ethiopic-calendar";
import { BACKEND_BASE } from "../config.js";

export const CALENDAR_EVENTS_CACHE_TTL_MS = 5 * 60 * 1000;
export const CALENDAR_MANAGER_ROLES = new Set(["registrar", "registerer", "admin", "admins", "school_admin", "school_admins", "finance"]);

export const CALENDAR_EVENT_META = {
  academic: {
    label: "Academic",
    color: "var(--success)",
    background: "var(--success-soft)",
    border: "var(--success-border)",
    category: "academic",
    subType: "general",
  },
  "no-class": {
    label: "No class",
    color: "var(--warning)",
    background: "var(--warning-soft)",
    border: "var(--warning-border)",
    category: "no-class",
    subType: "general",
  },
};

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

const getCalendarEventKey = (category) => {
  if (category === "academic") {
    return "academic";
  }

  return "no-class";
};

const getCalendarEventMeta = (category) => {
  const eventKey = getCalendarEventKey(category);
  return CALENDAR_EVENT_META[eventKey] || CALENDAR_EVENT_META.academic;
};

const normalizeCalendarEvent = (eventId, eventValue) => {
  const legacyType = eventValue?.type || "academic";
  const category = eventValue?.category || (legacyType === "academic" ? "academic" : "no-class");
  const eventMeta = getCalendarEventMeta(category);

  return {
    id: eventId,
    title: eventValue?.title || eventMeta.label,
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
};

const sortCalendarEvents = (events) => [...events].sort((leftEvent, rightEvent) => {
  const dateComparison = String(leftEvent.gregorianDate || "").localeCompare(String(rightEvent.gregorianDate || ""));
  if (dateComparison !== 0) {
    return dateComparison;
  }

  return String(leftEvent.createdAt || "").localeCompare(String(rightEvent.createdAt || ""));
});

const formatCalendarDeadlineDate = (isoDate) => {
  if (!isoDate) {
    return "";
  }

  const parsedDate = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return isoDate;
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const uniqueNonEmptyValues = (values) => {
  const seen = new Set();
  const normalizedValues = [];

  values.forEach((value) => {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue || seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    normalizedValues.push(normalizedValue);
  });

  return normalizedValues;
};

const getCalendarEventsStorageKey = (schoolScopeCode) =>
  `dashboard_calendar_events_cache_${String(schoolScopeCode || "").trim().toLowerCase()}`;

const readCachedCalendarEvents = (schoolScopeCode) => {
  const normalizedSchoolScopeCode = String(schoolScopeCode || "").trim();
  if (!normalizedSchoolScopeCode) {
    return { events: [], isFresh: false };
  }

  try {
    const rawCache = localStorage.getItem(getCalendarEventsStorageKey(normalizedSchoolScopeCode));
    if (!rawCache) {
      return { events: [], isFresh: false };
    }

    const parsedCache = JSON.parse(rawCache);
    if (!parsedCache || !Array.isArray(parsedCache.events)) {
      return { events: [], isFresh: false };
    }

    const isFresh = Number(parsedCache.expiresAt || 0) > Date.now();
    return {
      events: parsedCache.events,
      isFresh,
    };
  } catch (error) {
    return { events: [], isFresh: false };
  }
};

const writeCachedCalendarEvents = (schoolScopeCode, events) => {
  const normalizedSchoolScopeCode = String(schoolScopeCode || "").trim();
  if (!normalizedSchoolScopeCode) {
    return;
  }

  try {
    localStorage.setItem(
      getCalendarEventsStorageKey(normalizedSchoolScopeCode),
      JSON.stringify({
        events,
        expiresAt: Date.now() + CALENDAR_EVENTS_CACHE_TTL_MS,
      })
    );
  } catch (error) {
    // Ignore localStorage write issues.
  }
};

const parseInitialCalendarDate = () => {
  const now = new Date();
  const currentEthiopicDate = EthiopicCalendar.ge(now.getFullYear(), now.getMonth() + 1, now.getDate());

  return {
    year: currentEthiopicDate.year,
    month: currentEthiopicDate.month,
  };
};

export function useCalendar({ schoolScopeCode, dbUrl, adminRole }) {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarEventsLoading, setCalendarEventsLoading] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => parseInitialCalendarDate());
  const [calendarEventForm, setCalendarEventForm] = useState({
    title: "",
    category: "no-class",
    subType: "general",
    notes: "",
  });
  const [calendarEventSaving, setCalendarEventSaving] = useState(false);
  const [selectedCalendarIsoDate, setSelectedCalendarIsoDate] = useState("");
  const [editingCalendarEventId, setEditingCalendarEventId] = useState("");
  const [calendarActionMessage, setCalendarActionMessage] = useState("");
  const [showCalendarEventModal, setShowCalendarEventModal] = useState(false);
  const [hoveredCalendarIsoDate, setHoveredCalendarIsoDate] = useState("");
  const [calendarModalContext, setCalendarModalContext] = useState("calendar");
  const [showAllUpcomingDeadlines, setShowAllUpcomingDeadlines] = useState(false);

  const canManageCalendar = CALENDAR_MANAGER_ROLES.has(String(adminRole || "admin").trim().toLowerCase().replace(/-/g, "_"));

  const getCalendarMonthLabel = useCallback(
    () => `${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]} ${calendarViewDate.year}`,
    [calendarViewDate.month, calendarViewDate.year]
  );

  const fetchCalendarEvents = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!schoolScopeCode) {
      setCalendarEvents([]);
      return [];
    }

    if (!forceRefresh) {
      const cachedCalendar = readCachedCalendarEvents(schoolScopeCode);
      if (cachedCalendar.events.length > 0) {
        setCalendarEvents(sortCalendarEvents(cachedCalendar.events));
      }

      if (cachedCalendar.isFresh) {
        setCalendarEventsLoading(false);
        return cachedCalendar.events;
      }
    }

    setCalendarEventsLoading(true);
    try {
      const res = await axios.get(`${BACKEND_BASE}/api/calendar_events`, {
        params: { schoolCode: schoolScopeCode },
      });
      const sourceEvents = Array.isArray(res?.data) ? res.data : [];
      const normalizedEvents = sourceEvents
        .map((eventItem) => normalizeCalendarEvent(eventItem.id, eventItem))
        .filter((eventItem) => eventItem.gregorianDate);

      const sortedEvents = sortCalendarEvents(normalizedEvents);
      setCalendarEvents(sortedEvents);
      writeCachedCalendarEvents(schoolScopeCode, sortedEvents);
      return sortedEvents;
    } catch (error) {
      console.error("Failed to load calendar events:", error);
      const cachedCalendar = readCachedCalendarEvents(schoolScopeCode);
      const cachedEvents = sortCalendarEvents(cachedCalendar.events || []);
      setCalendarEvents(cachedEvents);
      return cachedEvents;
    } finally {
      setCalendarEventsLoading(false);
    }
  }, [dbUrl, schoolScopeCode]);

  const handleSaveCalendarEvent = useCallback(async ({ selectedCalendarDay, editingCalendarEvent, calendarViewDateValue, createdBy = "" } = {}) => {
    if (!canManageCalendar) {
      alert("Only registrar or admin users can manage school calendar events.");
      return false;
    }

    if (!selectedCalendarDay) {
      alert("Select a calendar day first.");
      return false;
    }

    if (calendarModalContext === "deadline" && !calendarEventForm.title.trim()) {
      alert("Enter a deadline title.");
      return false;
    }

    setCalendarEventSaving(true);
    try {
      const normalizedCategory = calendarModalContext === "deadline" ? "academic" : calendarEventForm.category;
      const selectedEventMeta = getCalendarEventMeta(normalizedCategory);
      const payload = {
        title: calendarEventForm.title.trim() || selectedEventMeta.label,
        type: getCalendarEventKey(normalizedCategory),
        category: normalizedCategory,
        subType: "general",
        notes: calendarEventForm.notes.trim(),
        showInUpcomingDeadlines: calendarModalContext === "deadline" || Boolean(editingCalendarEvent?.showInUpcomingDeadlines),
        gregorianDate: selectedCalendarDay.isoDate,
        ethiopianDate: {
          year: calendarViewDateValue?.year || calendarViewDate.year,
          month: calendarViewDateValue?.month || calendarViewDate.month,
          day: selectedCalendarDay.ethDay,
        },
        createdAt: new Date().toISOString(),
        createdBy: String(createdBy || "").trim(),
      };

      if (editingCalendarEventId) {
        await axios.patch(`${BACKEND_BASE}/api/calendar_events/${editingCalendarEventId}`, {
          ...payload,
          schoolCode: schoolScopeCode,
        });
        setCalendarActionMessage("Calendar event updated successfully.");
      } else {
        await axios.post(`${BACKEND_BASE}/api/calendar_events`, {
          ...payload,
          schoolCode: schoolScopeCode,
        });
        setCalendarActionMessage("Calendar event saved successfully.");
      }

      setCalendarEventForm({ title: "", category: "no-class", subType: "general", notes: "" });
      setEditingCalendarEventId("");
      setShowCalendarEventModal(false);
      setCalendarModalContext("calendar");
      await fetchCalendarEvents({ forceRefresh: true });
      return true;
    } catch (error) {
      console.error("Failed to save calendar event:", error);
      alert("Failed to save calendar event.");
      return false;
    } finally {
      setCalendarEventSaving(false);
    }
  }, [
    canManageCalendar,
    calendarEventForm,
    calendarModalContext,
    calendarViewDate,
    editingCalendarEventId,
    fetchCalendarEvents,
    schoolScopeCode,
  ]);

  const handleDeleteCalendarEvent = useCallback(async (eventItem) => {
    if (!canManageCalendar) {
      alert("Only registrar or admin users can manage school calendar events.");
      return false;
    }

    if (eventItem.isDefault) {
      alert("Default Ethiopian special days cannot be deleted.");
      return false;
    }

    const selectedEventMeta = getCalendarEventMeta(eventItem.category);
    const shouldDelete = window.confirm(`Delete ${selectedEventMeta.label} on ${eventItem.gregorianDate}?`);
    if (!shouldDelete) {
      return false;
    }

    setCalendarEventSaving(true);
    try {
      await axios.delete(`${BACKEND_BASE}/api/calendar_events/${eventItem.id}`, {
        params: { schoolCode: schoolScopeCode },
      });
      if (editingCalendarEventId === eventItem.id) {
        setEditingCalendarEventId("");
        setCalendarEventForm({ title: "", category: "no-class", subType: "general", notes: "" });
      }
      setCalendarActionMessage("Calendar event deleted successfully.");
      await fetchCalendarEvents({ forceRefresh: true });
      return true;
    } catch (error) {
      console.error("Failed to delete calendar event:", error);
      alert("Failed to delete calendar event.");
      return false;
    } finally {
      setCalendarEventSaving(false);
    }
  }, [canManageCalendar, editingCalendarEventId, fetchCalendarEvents, schoolScopeCode]);

  useEffect(() => {
    if (!calendarActionMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCalendarActionMessage("");
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [calendarActionMessage]);

  useEffect(() => {
    setShowAllUpcomingDeadlines(false);
  }, [schoolScopeCode]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  return useMemo(() => ({
    calendarEvents,
    calendarEventsLoading,
    calendarViewDate,
    setCalendarViewDate,
    calendarEventForm,
    setCalendarEventForm,
    calendarEventSaving,
    setCalendarEventSaving,
    selectedCalendarIsoDate,
    setSelectedCalendarIsoDate,
    editingCalendarEventId,
    setEditingCalendarEventId,
    calendarActionMessage,
    setCalendarActionMessage,
    showCalendarEventModal,
    setShowCalendarEventModal,
    hoveredCalendarIsoDate,
    setHoveredCalendarIsoDate,
    calendarModalContext,
    setCalendarModalContext,
    showAllUpcomingDeadlines,
    setShowAllUpcomingDeadlines,
    canManageCalendar,
    fetchCalendarEvents,
    handleSaveCalendarEvent,
    handleDeleteCalendarEvent,
    getCalendarEventMeta,
    getCalendarEventKey,
    formatCalendarDeadlineDate,
    sortCalendarEvents,
    normalizeCalendarEvent,
  }), [
    calendarActionMessage,
    calendarEventForm,
    calendarEventSaving,
    calendarEvents,
    calendarEventsLoading,
    calendarModalContext,
    calendarViewDate,
    canManageCalendar,
    editingCalendarEventId,
    fetchCalendarEvents,
    handleDeleteCalendarEvent,
    handleSaveCalendarEvent,
    hoveredCalendarIsoDate,
    selectedCalendarIsoDate,
    showAllUpcomingDeadlines,
    showCalendarEventModal,
  ]);
}