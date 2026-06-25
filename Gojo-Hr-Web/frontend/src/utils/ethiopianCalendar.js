import EthiopicCalendar from 'ethiopic-calendar';
import { DEFAULT_ETHIOPIAN_SPECIAL_DAYS, YEAR_SPECIFIC_GOVERNMENT_CLOSURES_GREGORIAN } from './dashboardConstants';

// --- Year-specific Islamic holidays (Eid al-Fitr / al-Adha / Mawlid) -------
const buildYearSpecificGovernmentClosures = (ethiopianYear) => {
  const gregorianEvents = YEAR_SPECIFIC_GOVERNMENT_CLOSURES_GREGORIAN[ethiopianYear] || [];

  return gregorianEvents
    .map((eventItem) => {
      const [year, month, day] = String(eventItem.date || '').split('-').map(Number);
      if (!year || !month || !day) return null;

      const ethiopianDate = EthiopicCalendar.ge(year, month, day);
      if (ethiopianDate.year !== ethiopianYear) return null;

      return {
        month: ethiopianDate.month,
        day: ethiopianDate.day,
        title: eventItem.title,
        notes: eventItem.notes,
      };
    })
    .filter(Boolean);
};

// --- Orthodox Easter (movable) -------------------------------------------
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

const buildMovableOrthodoxClosures = (ethiopianYear) => {
  const movableEvents = [];
  const seenEventKeys = new Set();

  [ethiopianYear + 7, ethiopianYear + 8].forEach((gregorianYear) => {
    const easterDate = getOrthodoxEasterDate(gregorianYear);
    const goodFridayDate = new Date(easterDate);
    goodFridayDate.setDate(goodFridayDate.getDate() - 2);

    [
      { title: 'Siklet', notes: 'Good Friday school closure.', date: goodFridayDate },
      { title: 'Fasika', notes: 'Orthodox Easter school closure.', date: easterDate },
    ].forEach((eventItem) => {
      const ethDate = EthiopicCalendar.ge(
        eventItem.date.getFullYear(),
        eventItem.date.getMonth() + 1,
        eventItem.date.getDate(),
      );

      if (ethDate.year !== ethiopianYear) return;

      const eventKey = `${ethDate.year}-${ethDate.month}-${ethDate.day}-${eventItem.title}`;
      if (seenEventKeys.has(eventKey)) return;

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

export const buildDefaultCalendarEvents = (ethiopianYear) => [
  ...DEFAULT_ETHIOPIAN_SPECIAL_DAYS,
  ...buildMovableOrthodoxClosures(ethiopianYear),
  ...buildYearSpecificGovernmentClosures(ethiopianYear),
].map((eventItem) => {
  const gregorianDate = EthiopicCalendar.eg(ethiopianYear, eventItem.month, eventItem.day);
  const isoDate = `${gregorianDate.year}-${String(gregorianDate.month).padStart(2, '0')}-${String(gregorianDate.day).padStart(2, '0')}`;

  return {
    id: `default-${ethiopianYear}-${eventItem.month}-${eventItem.day}`,
    title: eventItem.title,
    type: 'no-class',
    category: 'no-class',
    subType: 'general',
    notes: eventItem.notes,
    gregorianDate: isoDate,
    ethiopianDate: { year: ethiopianYear, month: eventItem.month, day: eventItem.day },
    createdAt: '',
    createdBy: 'system-default',
    isDefault: true,
    showInUpcomingDeadlines: false,
    source: 'default-closure',
  };
});

// --- Gregorian holiday helpers --------------------------------------------
export function isGregorianLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function toIsoDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOrthodoxHolidayEasterDate(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julianDate = new Date(Date.UTC(year, month - 1, day));
  julianDate.setUTCDate(julianDate.getUTCDate() + 13);
  return new Date(julianDate.getUTCFullYear(), julianDate.getUTCMonth(), julianDate.getUTCDate());
}

export function getRecurringHolidayEvents(year) {
  const orthodoxEaster = getOrthodoxHolidayEasterDate(year);
  const orthodoxGoodFriday = new Date(orthodoxEaster);
  orthodoxGoodFriday.setDate(orthodoxGoodFriday.getDate() - 2);
  const ethiopianNewYearDay = isGregorianLeapYear(year + 1) ? 12 : 11;

  return [
    { slug: 'gregorian-new-year', title: 'New Year', date: new Date(year, 0, 1), notes: 'Gregorian New Year public holiday' },
    { slug: 'ethiopian-christmas', title: 'Christmas (Genna)', date: new Date(year, 0, 7), notes: 'Ethiopian Christmas public holiday' },
    { slug: 'timkat', title: 'Timkat', date: new Date(year, 0, 19), notes: 'Epiphany public holiday' },
    { slug: 'adwa-victory', title: 'Adwa Victory Day', date: new Date(year, 2, 2), notes: 'Public holiday commemorating the Battle of Adwa' },
    { slug: 'good-friday', title: 'Siklet (Good Friday)', date: orthodoxGoodFriday, notes: 'Orthodox Good Friday holiday' },
    { slug: 'easter', title: 'Fasika (Easter)', date: orthodoxEaster, notes: 'Orthodox Easter holiday' },
    { slug: 'labour-day', title: 'Labour Day', date: new Date(year, 4, 1), notes: 'International Workers Day public holiday' },
    { slug: 'patriots-day', title: 'Patriots Victory Day', date: new Date(year, 4, 5), notes: 'Patriots Victory Day public holiday' },
    { slug: 'derg-downfall', title: 'Downfall of the Derg', date: new Date(year, 4, 28), notes: 'National public holiday' },
    { slug: 'ethiopian-new-year', title: 'Enkutatash (Ethiopian New Year)', date: new Date(year, 8, ethiopianNewYearDay), notes: 'Ethiopian New Year public holiday' },
    { slug: 'meskel', title: 'Meskel', date: new Date(year, 8, 27), notes: 'Finding of the True Cross public holiday' },
  ].map((eventItem) => ({
    id: `builtin-holiday-${year}-${eventItem.slug}`,
    title: eventItem.title,
    category: 'Holiday',
    notes: eventItem.notes,
    gregorianDate: toIsoDateString(eventItem.date),
    showInUpcomingDeadlines: false,
    source: 'builtin-holiday',
  }));
}

export function mergeCalendarCollections(primaryEvents = [], secondaryEvents = []) {
  const seenKeys = new Set();
  const merged = [];

  [...primaryEvents, ...secondaryEvents].forEach((eventItem, index) => {
    const isoDate = String(eventItem?.gregorianDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return;

    const titleKey = String(eventItem?.title || eventItem?.category || `event-${index}`).trim().toLowerCase();
    const dedupeKey = `${isoDate}::${titleKey}`;
    if (seenKeys.has(dedupeKey)) return;

    seenKeys.add(dedupeKey);
    merged.push({
      ...(eventItem || {}),
      id: String(eventItem?.id || dedupeKey),
      gregorianDate: isoDate,
    });
  });

  return merged.sort((leftEvent, rightEvent) => {
    const dateCompare = String(leftEvent.gregorianDate || '').localeCompare(String(rightEvent.gregorianDate || ''));
    if (dateCompare !== 0) return dateCompare;
    return String(leftEvent.title || '').localeCompare(String(rightEvent.title || ''));
  });
}

export function getCalendarEventKind(eventItem = {}) {
  const haystack = `${eventItem?.category || ''} ${eventItem?.title || ''} ${eventItem?.notes || ''}`.toLowerCase();
  if (/(no class|holiday|break|vacation|closure|closed|off day|public holiday)/.test(haystack)) {
    return 'no-class';
  }
  return 'academic';
}

export const CALENDAR_EVENT_META = {
  academic: {
    label: 'Academic',
    color: 'var(--accent)',
    background: 'var(--accent-soft)',
    border: 'rgba(0, 122, 251, 0.18)',
  },
  'no-class': {
    label: 'No class',
    color: 'var(--warning)',
    background: 'var(--warning-soft)',
    border: 'var(--warning-border)',
  },
};

export const CALENDAR_WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getCalendarEventKey(category) {
  if (category === 'academic') return 'academic';
  return 'no-class';
}

export function getCalendarEventMeta(category) {
  if (category === 'academic') return CALENDAR_EVENT_META.academic;
  return CALENDAR_EVENT_META['no-class'];
}

export function normalizeCalendarEvent(eventId, eventValue) {
  const legacyType = eventValue?.type || 'academic';
  const category = eventValue?.category || (legacyType === 'academic' ? 'academic' : 'no-class');

  return {
    id: eventId,
    title: eventValue?.title || getCalendarEventMeta(category).label,
    type: getCalendarEventKey(category),
    category,
    subType: eventValue?.subType || 'general',
    notes: eventValue?.notes || '',
    gregorianDate: eventValue?.gregorianDate || '',
    ethiopianDate: eventValue?.ethiopianDate || null,
    createdAt: eventValue?.createdAt || '',
    createdBy: eventValue?.createdBy || '',
    showInUpcomingDeadlines: Boolean(eventValue?.showInUpcomingDeadlines),
    isDefault: false,
  };
}

export function sortCalendarEvents(events) {
  return [...events].sort((leftEvent, rightEvent) => {
    const dateComparison = String(leftEvent.gregorianDate || '').localeCompare(String(rightEvent.gregorianDate || ''));
    if (dateComparison !== 0) return dateComparison;
    return String(leftEvent.createdAt || '').localeCompare(String(rightEvent.createdAt || ''));
  });
}

export function formatCalendarDeadlineDate(isoDate) {
  if (!isoDate) return '';
  const parsedDate = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return '';
  return parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getCalendarEventTone(eventKind = 'academic') {
  if (eventKind === 'no-class') {
    return {
      border: '1px solid var(--warning-border, #fdba74)',
      background: 'var(--warning-soft, #fff7ed)',
      color: 'var(--warning, #d97706)',
      dot: 'var(--warning, #d97706)',
      label: 'No Class',
    };
  }

  return {
    border: '1px solid var(--success-border, #a5f3fc)',
    background: 'var(--success-soft, #ecfeff)',
    color: 'var(--success, #0f766e)',
    dot: 'var(--success, #0f766e)',
    label: 'Academic',
  };
}
