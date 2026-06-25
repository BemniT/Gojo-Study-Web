import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import EthiopicCalendar from "ethiopic-calendar";
import {
  ETHIOPIAN_MONTHS,
  buildDefaultCalendarEvents,
  getCalendarEventKey,
  getCalendarEventMeta,
  normalizeCalendarEvent,
  sortCalendarEvents,
} from "../../utils/calendar";

const BLANK_EVENT_FORM = Object.freeze({
  title: "",
  category: "no-class",
  subType: "general",
  notes: "",
});

/**
 * useCalendar
 *
 * Owns the Register-Web Dashboard calendar layer:
 *   - 12 pieces of state (viewDate, events, form, modal, selection, etc.)
 *   - 4 fetch/CRUD handlers (load, create, edit, delete) + 4 modal helpers
 *   - All Ethiopian-calendar derivations (month label, day grid, events-by-date,
 *     monthly/upcoming-deadline rollups, selected-day events, etc.)
 *   - 4 effects: auto-clear action message, reset deadlines on schoolCode
 *     change, load events on schoolCode change, sync selected day on month flip
 *
 * Inputs are passed; module helpers (buildDefaultCalendarEvents, etc.) come
 * from utils/calendar.js so they can be reused by Overview/AcademicYear pages.
 */
export default function useCalendar({ schoolCode, dbRoot, admin, canManageCalendar }) {
  const [calendarViewDate, setCalendarViewDate] = useState(() => {
    const now = new Date();
    const currentEthiopicDate = EthiopicCalendar.ge(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { year: currentEthiopicDate.year, month: currentEthiopicDate.month };
  });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarEventsLoading, setCalendarEventsLoading] = useState(false);
  const [calendarEventForm, setCalendarEventForm] = useState({ ...BLANK_EVENT_FORM });
  const [calendarEventSaving, setCalendarEventSaving] = useState(false);
  const [selectedCalendarIsoDate, setSelectedCalendarIsoDate] = useState("");
  const [editingCalendarEventId, setEditingCalendarEventId] = useState("");
  const [calendarActionMessage, setCalendarActionMessage] = useState("");
  const [showCalendarEventModal, setShowCalendarEventModal] = useState(false);
  const [hoveredCalendarIsoDate, setHoveredCalendarIsoDate] = useState("");
  const [calendarModalContext, setCalendarModalContext] = useState("calendar");
  const [showAllUpcomingDeadlines, setShowAllUpcomingDeadlines] = useState(false);

  // ---------------- DERIVATIONS ----------------
  const calendarNow = new Date();
  const calendarTodayIsoDate = `${calendarNow.getFullYear()}-${String(calendarNow.getMonth() + 1).padStart(2, "0")}-${String(calendarNow.getDate()).padStart(2, "0")}`;
  const deadlineWindowEnd = new Date(calendarNow);
  deadlineWindowEnd.setDate(deadlineWindowEnd.getDate() + 30);
  const deadlineWindowEndIsoDate = `${deadlineWindowEnd.getFullYear()}-${String(deadlineWindowEnd.getMonth() + 1).padStart(2, "0")}-${String(deadlineWindowEnd.getDate()).padStart(2, "0")}`;

  const currentEthiopicDate = EthiopicCalendar.ge(
    calendarNow.getFullYear(),
    calendarNow.getMonth() + 1,
    calendarNow.getDate()
  );

  const calendarMonthLabel = `${ETHIOPIAN_MONTHS[calendarViewDate.month - 1]} ${calendarViewDate.year}`;
  const isCurrentCalendarMonth =
    calendarViewDate.year === currentEthiopicDate.year && calendarViewDate.month === currentEthiopicDate.month;
  const calendarToday = currentEthiopicDate.day;
  const calendarHighlightedDay = isCurrentCalendarMonth ? calendarToday : null;
  const calendarDaysInMonth = calendarViewDate.month === 13 ? (calendarViewDate.year % 4 === 3 ? 6 : 5) : 30;
  const calendarMonthStartGregorian = EthiopicCalendar.eg(calendarViewDate.year, calendarViewDate.month, 1);
  const calendarMonthEndGregorian = EthiopicCalendar.eg(
    calendarViewDate.year,
    calendarViewDate.month,
    calendarDaysInMonth
  );
  const calendarFirstWeekday = new Date(
    calendarMonthStartGregorian.year,
    calendarMonthStartGregorian.month - 1,
    calendarMonthStartGregorian.day
  ).getDay();

  const defaultCalendarEvents = useMemo(
    () => buildDefaultCalendarEvents(calendarViewDate.year),
    [calendarViewDate.year]
  );

  const mergedCalendarEvents = useMemo(
    () => sortCalendarEvents([...defaultCalendarEvents, ...calendarEvents]),
    [defaultCalendarEvents, calendarEvents]
  );

  const calendarEventsByDate = useMemo(
    () =>
      mergedCalendarEvents.reduce((eventsMap, eventItem) => {
        if (!eventsMap[eventItem.gregorianDate]) eventsMap[eventItem.gregorianDate] = [];
        eventsMap[eventItem.gregorianDate].push(eventItem);
        return eventsMap;
      }, {}),
    [mergedCalendarEvents]
  );

  const calendarDays = useMemo(() => {
    return Array.from({ length: calendarFirstWeekday + calendarDaysInMonth }, (_, index) => {
      const dayNumber = index - calendarFirstWeekday + 1;
      if (dayNumber <= 0) return null;

      const gregorianDate = EthiopicCalendar.eg(calendarViewDate.year, calendarViewDate.month, dayNumber);
      const isoDate = `${gregorianDate.year}-${String(gregorianDate.month).padStart(2, "0")}-${String(gregorianDate.day).padStart(2, "0")}`;

      return {
        ethDay: dayNumber,
        gregorianDate,
        isoDate,
        events: calendarEventsByDate[isoDate] || [],
      };
    });
  }, [calendarFirstWeekday, calendarDaysInMonth, calendarViewDate.year, calendarViewDate.month, calendarEventsByDate]);

  const monthlyCalendarEvents = useMemo(
    () =>
      sortCalendarEvents(
        calendarDays
          .filter(Boolean)
          .flatMap((dayItem) => dayItem.events.map((eventItem) => ({ ...eventItem, ethDay: dayItem.ethDay })))
      ),
    [calendarDays]
  );

  const upcomingDeadlineEvents = useMemo(
    () =>
      sortCalendarEvents(
        calendarEvents.filter(
          (eventItem) =>
            eventItem.showInUpcomingDeadlines &&
            eventItem.category === "academic" &&
            String(eventItem.gregorianDate || "") >= calendarTodayIsoDate &&
            String(eventItem.gregorianDate || "") <= deadlineWindowEndIsoDate
        )
      ),
    [calendarEvents, calendarTodayIsoDate, deadlineWindowEndIsoDate]
  );

  const visibleUpcomingDeadlineEvents = showAllUpcomingDeadlines
    ? upcomingDeadlineEvents
    : upcomingDeadlineEvents.slice(0, 3);

  const editingCalendarEvent =
    calendarEvents.find((eventItem) => eventItem.id === editingCalendarEventId) || null;
  const selectableCalendarDays = calendarDays.filter(Boolean);
  const selectedCalendarDay =
    calendarDays.find((dayItem) => dayItem?.isoDate === selectedCalendarIsoDate) || null;
  const selectedCalendarEvents = selectedCalendarDay?.events || [];

  // ---------------- HANDLERS ----------------
  const handleCalendarMonthChange = (monthOffset) => {
    setCalendarViewDate((currentDate) => {
      let { year, month } = currentDate;
      month += monthOffset;
      while (month < 1) {
        month += 13;
        year -= 1;
      }
      while (month > 13) {
        month -= 13;
        year += 1;
      }
      return { year, month };
    });
  };

  const loadCalendarEvents = async () => {
    if (!schoolCode) {
      setCalendarEvents([]);
      return;
    }

    setCalendarEventsLoading(true);
    try {
      const res = await axios.get(`${dbRoot}/CalendarEvents.json`);
      const rawEvents = res.data || {};
      const normalizedEvents = Object.entries(rawEvents)
        .map(([eventId, eventValue]) => normalizeCalendarEvent(eventId, eventValue))
        .filter((eventItem) => eventItem.gregorianDate);

      setCalendarEvents(sortCalendarEvents(normalizedEvents));
    } catch (err) {
      console.error("Failed to load calendar events:", err);
      setCalendarEvents([]);
    } finally {
      setCalendarEventsLoading(false);
    }
  };

  const handleCreateCalendarEvent = async () => {
    if (!canManageCalendar) {
      alert("Only registrar or admin users can manage school calendar events.");
      return;
    }

    if (!selectedCalendarDay) {
      alert("Select a calendar day first.");
      return;
    }

    if (calendarModalContext === "deadline" && !calendarEventForm.title.trim()) {
      alert("Enter a deadline title.");
      return;
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
        showInUpcomingDeadlines:
          calendarModalContext === "deadline" || Boolean(editingCalendarEvent?.showInUpcomingDeadlines),
        gregorianDate: selectedCalendarDay.isoDate,
        ethiopianDate: {
          year: calendarViewDate.year,
          month: calendarViewDate.month,
          day: selectedCalendarDay.ethDay,
        },
        createdAt: new Date().toISOString(),
        createdBy: admin?.userId || admin?.adminId || "",
      };

      if (editingCalendarEventId) {
        await axios.patch(`${dbRoot}/CalendarEvents/${editingCalendarEventId}.json`, payload);
        setCalendarActionMessage("Calendar event updated successfully.");
      } else {
        await axios.post(`${dbRoot}/CalendarEvents.json`, payload);
        setCalendarActionMessage("Calendar event saved successfully.");
      }

      setCalendarEventForm({ ...BLANK_EVENT_FORM });
      setEditingCalendarEventId("");
      setShowCalendarEventModal(false);
      setCalendarModalContext("calendar");
      await loadCalendarEvents();
    } catch (err) {
      console.error("Failed to save calendar event:", err);
      alert("Failed to save calendar event.");
    } finally {
      setCalendarEventSaving(false);
    }
  };

  const handleEditCalendarEvent = (eventItem) => {
    if (!canManageCalendar) return;
    if (eventItem.isDefault) return;

    setCalendarModalContext(eventItem.showInUpcomingDeadlines ? "deadline" : "calendar");
    setShowCalendarEventModal(true);

    const ethiopianDate =
      eventItem.ethiopianDate ||
      (() => {
        const [year, month, day] = String(eventItem.gregorianDate || "").split("-").map(Number);
        if (!year || !month || !day) return null;
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
  };

  const handleDeleteCalendarEvent = async (eventItem) => {
    if (!canManageCalendar) {
      alert("Only registrar or admin users can manage school calendar events.");
      return;
    }

    if (eventItem.isDefault) {
      alert("Default Ethiopian special days cannot be deleted.");
      return;
    }

    const selectedEventMeta = getCalendarEventMeta(eventItem.category);
    const shouldDelete = window.confirm(
      `Delete ${selectedEventMeta.label} on ${eventItem.gregorianDate}?`
    );
    if (!shouldDelete) return;

    setCalendarEventSaving(true);
    try {
      await axios.delete(`${dbRoot}/CalendarEvents/${eventItem.id}.json`);
      if (editingCalendarEventId === eventItem.id) {
        setEditingCalendarEventId("");
        setCalendarEventForm({ ...BLANK_EVENT_FORM });
      }
      setCalendarActionMessage("Calendar event deleted successfully.");
      await loadCalendarEvents();
    } catch (err) {
      console.error("Failed to delete calendar event:", err);
      alert("Failed to delete calendar event.");
    } finally {
      setCalendarEventSaving(false);
    }
  };

  const handleCancelCalendarEdit = () => {
    setEditingCalendarEventId("");
    setCalendarEventForm({ ...BLANK_EVENT_FORM });
    setCalendarModalContext("calendar");
    setShowCalendarEventModal(false);
  };

  const handleOpenCalendarEventModal = () => {
    if (!selectedCalendarIsoDate && selectableCalendarDays.length > 0) {
      setSelectedCalendarIsoDate(selectableCalendarDays[0].isoDate);
    }
    setEditingCalendarEventId("");
    setCalendarEventForm({ ...BLANK_EVENT_FORM });
    setCalendarModalContext("calendar");
    setShowCalendarEventModal(true);
  };

  const handleOpenDeadlineModal = () => {
    if (!selectedCalendarIsoDate && selectableCalendarDays.length > 0) {
      setSelectedCalendarIsoDate(selectableCalendarDays[0].isoDate);
    }
    setEditingCalendarEventId("");
    setCalendarEventForm({ title: "", category: "academic", subType: "general", notes: "" });
    setCalendarModalContext("deadline");
    setShowCalendarEventModal(true);
  };

  const handleCloseCalendarEventModal = () => {
    setEditingCalendarEventId("");
    setCalendarEventForm({ ...BLANK_EVENT_FORM });
    setCalendarModalContext("calendar");
    setShowCalendarEventModal(false);
  };

  // ---------------- EFFECTS ----------------
  // Auto-clear action message after a delay.
  useEffect(() => {
    if (!calendarActionMessage) return undefined;
    const timeoutId = window.setTimeout(() => setCalendarActionMessage(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [calendarActionMessage]);

  // Reset upcoming-deadlines toggle when school changes.
  useEffect(() => {
    setShowAllUpcomingDeadlines(false);
  }, [schoolCode]);

  // Reload events when school changes.
  useEffect(() => {
    loadCalendarEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  // Keep selected day visible across month changes.
  useEffect(() => {
    const preferredDay =
      calendarDays.find((dayItem) => dayItem?.ethDay === calendarHighlightedDay) ||
      calendarDays.find(Boolean) ||
      null;

    if (!preferredDay) {
      setSelectedCalendarIsoDate("");
      return;
    }

    const stillVisible = calendarDays.some((dayItem) => dayItem?.isoDate === selectedCalendarIsoDate);
    if (!stillVisible) {
      setSelectedCalendarIsoDate(preferredDay.isoDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarViewDate.year, calendarViewDate.month, calendarHighlightedDay, calendarDays.length]);

  return {
    // state
    calendarViewDate, setCalendarViewDate,
    calendarEvents, setCalendarEvents,
    calendarEventsLoading,
    calendarEventForm, setCalendarEventForm,
    calendarEventSaving,
    selectedCalendarIsoDate, setSelectedCalendarIsoDate,
    editingCalendarEventId, setEditingCalendarEventId,
    calendarActionMessage, setCalendarActionMessage,
    showCalendarEventModal, setShowCalendarEventModal,
    hoveredCalendarIsoDate, setHoveredCalendarIsoDate,
    calendarModalContext, setCalendarModalContext,
    showAllUpcomingDeadlines, setShowAllUpcomingDeadlines,
    // derivations
    calendarTodayIsoDate,
    deadlineWindowEndIsoDate,
    currentEthiopicDate,
    calendarMonthLabel,
    isCurrentCalendarMonth,
    calendarToday,
    calendarHighlightedDay,
    calendarDaysInMonth,
    calendarMonthStartGregorian,
    calendarMonthEndGregorian,
    calendarFirstWeekday,
    defaultCalendarEvents,
    mergedCalendarEvents,
    calendarEventsByDate,
    calendarDays,
    monthlyCalendarEvents,
    upcomingDeadlineEvents,
    visibleUpcomingDeadlineEvents,
    editingCalendarEvent,
    selectableCalendarDays,
    selectedCalendarDay,
    selectedCalendarEvents,
    // actions
    loadCalendarEvents,
    handleCalendarMonthChange,
    handleCreateCalendarEvent,
    handleEditCalendarEvent,
    handleDeleteCalendarEvent,
    handleCancelCalendarEdit,
    handleOpenCalendarEventModal,
    handleOpenDeadlineModal,
    handleCloseCalendarEventModal,
  };
}
