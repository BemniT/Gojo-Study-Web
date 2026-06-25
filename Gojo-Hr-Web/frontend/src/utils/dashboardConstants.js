export const DASHBOARD_EMPLOYEES_CACHE_KEY = 'dashboard:employees:v2';
export const DASHBOARD_ATTENDANCE_CACHE_KEY = 'dashboard:attendance-summary:90:v1';
export const DASHBOARD_POSTS_CACHE_KEY = 'dashboard:posts:25';
export const DASHBOARD_CALENDAR_CACHE_KEY = 'dashboard:calendar:upcoming:120';
export const DASHBOARD_CHAT_ACTIVITY_CACHE_KEY = 'dashboard:chat-activity:v1';

export const POST_PAGE_SIZE = 25;
export const POST_IMAGE_MAX_DIMENSION = 1280;
export const POST_IMAGE_MAX_BYTES = 450 * 1024;
export const POST_IMAGE_PREVIEW_MAX_DIMENSION = 640;
export const POST_IMAGE_PREVIEW_MAX_BYTES = 140 * 1024;

export const DEFAULT_PROFILE_IMAGE = '/default-profile.png';
export const CHAT_DEFAULT_PROFILE = '/default-profile.png';

export const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit',
  'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];

export const ETHIOPIAN_WEEK_DAYS = ['እሑ', 'ሰኞ', 'ማክ', 'ረቡ', 'ሐሙ', 'ዓር', 'ቅዳ'];

export const DEFAULT_ETHIOPIAN_SPECIAL_DAYS = [
  { month: 1, day: 1, title: 'Enkutatash', notes: 'Ethiopian New Year.' },
  { month: 1, day: 17, title: 'Meskel', notes: 'Finding of the True Cross.' },
  { month: 4, day: 29, title: 'Genna', notes: 'Ethiopian Christmas.' },
  { month: 5, day: 11, title: 'Timkat', notes: 'Epiphany celebration.' },
  { month: 6, day: 23, title: 'Adwa Victory Day', notes: 'National remembrance day.' },
  { month: 8, day: 23, title: 'International Labour Day', notes: 'Public holiday.' },
  { month: 9, day: 1, title: "Patriots' Victory Day", notes: 'Public holiday.' },
  { month: 9, day: 20, title: 'Downfall of the Derg', notes: 'National public holiday.' },
];

export const YEAR_SPECIFIC_GOVERNMENT_CLOSURES_GREGORIAN = {
  2017: [
    { date: '2025-03-31', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2025-06-06', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2025-09-05', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
  2018: [
    { date: '2026-03-20', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2026-05-27', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2026-08-26', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
  2019: [
    { date: '2027-03-10', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2027-05-17', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2027-08-15', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
  2020: [
    { date: '2028-02-27', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2028-05-05', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2028-08-04', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
  2021: [
    { date: '2029-02-14', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2029-04-24', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2029-07-24', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
  2022: [
    { date: '2030-02-03', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2030-04-13', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2030-07-13', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
  2023: [
    { date: '2031-01-23', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2031-04-02', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2031-07-02', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
  2024: [
    { date: '2032-01-11', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2032-03-21', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2032-06-20', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
  2025: [
    { date: '2032-12-31', title: 'Eid al-Fitr', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2033-03-10', title: 'Eid al-Adha', notes: 'Government holiday (may vary by moon sighting).' },
    { date: '2033-06-09', title: 'Mawlid', notes: 'Government holiday (may vary by moon sighting).' },
  ],
};

export const CALENDAR_MANAGER_ROLES = new Set([
  'hr', 'hr_admin', 'hr_officer', 'human_resource', 'human_resources',
  'admin', 'admins', 'school_admin', 'school_admins', 'registrar', 'registerer',
]);

export const QUALIFICATION_GRAPH_CONFIG = [
  { key: 'Diploma', label: 'Diploma', color: '#0ea5e9' },
  { key: 'Degree', label: 'Degree', color: '#4b6cb7' },
  { key: 'Masters', label: 'Masters', color: '#8b5cf6' },
  { key: 'PhD', label: 'PhD', color: '#ec4899' },
  { key: 'Prof.', label: 'Prof.', color: '#f59e0b' },
  { key: 'Other', label: 'Other', color: '#64748b' },
];
