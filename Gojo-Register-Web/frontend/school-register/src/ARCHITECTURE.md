# Register Web — Frontend Architecture

A field guide for anyone touching this codebase, especially backend developers wiring up the new PostgreSQL/WebSocket/Redis/Cloudflare/Flask stack against it.

---

## The one rule

**Pages own composition. Hooks own data. Components own rendering.**

A page is layout + a few hook calls + a tree of components. If a page is reaching directly into Firebase, that logic belongs in a hook. If a hook is rendering JSX, that JSX belongs in a component.

This separation is what makes the backend swap survivable: when Firebase RTDB → PostgreSQL + WebSocket + Redis + Cloudflare + Flask, **only the hook internals change**. Page composition and rendering stay frozen.

---

## Folder layout

```
src/
├── pages/                    Layout + composition only. No fetches.
├── hooks/                    Data layer, grouped by domain.
│   ├── auth/                  useRegistrarSession
│   ├── chat/                  useConversations, useStudentChat, useParentChat,
│   │                          useAllChatContacts, useAllChatThread
│   ├── students/              useStudentsList, useStudentTabData, useStudentDetail,
│   │                          useStudentFullscreenForm, useStudentProfileEdit,
│   │                          useAttendanceView, useStudentRegister,
│   │                          useTransferWithdrawal, useAnalyticsData,
│   │                          useGradeManagement, useOverviewData
│   ├── parents/               useParentDetail, useParentsList
│   ├── posts/                 usePosts
│   ├── calendar/              useCalendar
│   ├── documents/             useDocumentData
│   ├── promotion/             usePromotionData, useReRegisterDraft,
│   │                          useStudentReview, useDecisions
│   └── notifications/         useTopbarNotifications
├── components/
│   ├── dashboard/            Page-section components, grouped by domain.
│   │   ├── layout/            DashboardSidebar, DashboardTopBar,
│   │   │                      QuickStatisticsCard, TodaysActivityCard,
│   │   │                      MyPostsStatisticsCard
│   │   ├── posts/             PostCard, PostsFeed, CreatePostModal, MyPostCard
│   │   ├── calendar/          CalendarWidget, CalendarEventModal
│   │   ├── students/          StudentListPanel, StudentDetailDrawer,
│   │   │                      StudentDetailsTab, StudentAttendanceTab,
│   │   │                      StudentPerformanceTab, StudentPaymentTab,
│   │   │                      StudentFullscreenModal, StudentChatPopup,
│   │   │                      StudentChatActionButtons, ConfirmStatusModal
│   │   ├── parents/           ParentListPanel, ParentDetailDrawer, ParentChatPopup
│   │   ├── promotion/         ReRegisterModal, Step2StudentReview
│   │   ├── documents/         DocumentPreview
│   │   ├── academic/          RolloverConfirmModal, HistoryStudentDetailModal
│   │   └── settings/          SecuritySettingsPanel, SchoolInformationPanel,
│   │                          AcademicConfigurationPanel, UserManagementPanel,
│   │                          DocumentTemplatesPanel, SystemPreferencesPanel,
│   │                          RolesNotificationsPanel, BackupDataPanel,
│   │                          SystemInformationPanel
│   └── (root-level components are page-agnostic primitives:
│        ProfileAvatar, RegisterSidebar, RegisterShell, Sidebar, etc.)
├── utils/                    Pure helpers (no React, no state).
│                              calendar, postHelpers, parentLinks, documentPdfs,
│                              schoolScope, passwordGen, analyticsExports,
│                              registerData, rtdbCache
├── api/                      RTDB scope helpers (buildSchoolRtdbBase, RTDB_BASE_RAW).
├── routes/                   Route definitions (AppRoutes.jsx).
├── styles/                   Global CSS.
├── App.jsx
├── main.jsx
└── ARCHITECTURE.md           ← you are here
```

---

## Where to look for what

| If you want to… | Look in |
|---|---|
| Change how chat fetches messages | `hooks/chat/useAllChatThread.js` (registrar↔user threads), `useStudentChat.js` / `useParentChat.js` (drawer popups) |
| Change how students get listed | `hooks/students/useStudentsList.js` |
| Change the registrar session bootstrap | `hooks/auth/useRegistrarSession.js` |
| Change the analytics aggregations | `hooks/students/useAnalyticsData.js` |
| Change Excel/PDF analytics export shapes | `utils/analyticsExports.js` |
| Change document PDF rendering | `utils/documentPdfs.js` |
| Change the school-scope resolver (multi-school lookup) | `utils/schoolScope.js` |
| Edit a settings panel | `components/dashboard/settings/*Panel.jsx` |
| See what RTDB paths are read/written | grep for `${DB_URL}/` or `${DB_ROOT}/` across `hooks/` |
| See what API endpoints are called | grep for `BACKEND_BASE` across `hooks/` and `pages/StudentRegister.jsx` flow |
| Add a new page | `pages/` — but the page should call hooks + render components, not fetch directly |

---

## The hook contract (backend-swap target)

Each domain hook exposes a stable signature that the page consumes. When the backend swaps stacks, ONLY the hook internals change. Highlighted contracts:

### `useRegistrarSession`

```js
const { finance, admin, schoolCode, DB_ROOT, loadingAdmin } = useRegistrarSession();
```

**Today:** Reads `localStorage["registrar"]` (legacy `"admin"` fallback), then hydrates from RTDB `Finance/{id}` → `School_Admins/{id}` → `Users/{userId}` to keep the profile fresh.

**Tomorrow:** Reads JWT from `Authorization` header, hits `GET /api/me` for the rich session payload. **Same return shape.**

### `useStudentsList` / `useStudentDetail` / `useStudentTabData`

Drive the Students page. The list hook owns search, grade/section filters, pagination cursor; the detail hook owns drawer state; the tab-data hook owns lazy per-tab fetches (attendance/performance/payments).

**Today:** Firebase RTDB `Students` + `Users` joins + per-tab nodes (`attendance/`, `student_performance/`, `monthlyPaid/`).

**Tomorrow:** `GET /api/students?...`, `GET /api/students/{id}`, `GET /api/students/{id}/attendance` etc. **Page code doesn't change.**

### `useAllChatThread`

```js
const {
  messages, messageInput, setMessageInput,
  editingMsgId, setEditingMsgId, activeMessageId, setActiveMessageId,
  typing, lastSeen, chatEndRef,
  sendMessage, deleteMessage, handleTyping, updateUnreadForSelected,
} = useAllChatThread({ DB_ROOT, DB_PATH, financeUserId, selectedChatUser });
```

**Today:** Firebase RTDB `onValue` listeners on `Chats/{key}/messages`, `Chats/{key}/typing`, `Users/{otherId}/lastSeen`. Sends via `push()` + `update()`.

**Tomorrow:** WebSocket `socket.on("chat:message")`, `socket.on("chat:typing")`, `socket.on("presence")`. Sends via `socket.emit("chat:send", payload)` or `POST /api/chats/{key}/messages`. **Same surface.**

### `useStudentRegister`

```js
const {
  activeAcademicYear, loadingAcademicYear,
  gradeOptions, sectionsByGrade,
  idLoading, nextAvailableStudentId,
  submitting, handleSubmit,
} = useStudentRegister({
  schoolCode, DB_URL, form, setForm, parents, setParents,
  studentPhoto, setStudentPhoto, studentNationalIdImage, setStudentNationalIdImage,
  parentProfileFiles, setParentProfileFiles, parentNationalIdFiles, setParentNationalIdFiles,
  setMessage, setOpenStep,
  basicComplete, parentComplete, addressComplete, financeComplete,
  todayDate,
});
```

**Today:** Reads school config from RTDB, auto-generates studentId / parentIds using a scan of `Students.json?shallow=true`, posts FormData to `${BACKEND_BASE}/register/student` (the existing Flask endpoint).

**Tomorrow:** ID generation runs server-side as part of the POST request. Hook only needs to render previews from the server's "next-id" probe endpoint. Same `handleSubmit` signature, same return shape.

### `useTransferWithdrawal`

```js
const {
  loading, working, feedback, notify,
  academicYears, currentAcademicYear, activeStudents,
  loadBaseData, runStatusChange,
} = useTransferWithdrawal({ schoolCode, DB_URL, admin });
```

**Today:** Loads active students + academic-year metadata, then `runStatusChange` archives to `YearHistory/{year}/Students/{id}`, sets associated Users `isActive=false`, cleans up orphan parents.

**Tomorrow:** `POST /api/students/{id}/status` with `{ action, note, destinationSchool, password }`. Backend owns the cascade. **Same surface.**

### `useGradeManagement`

```js
const {
  gradesMap, gradeKeys, feedback, loading, working,
  activeAcademicYear, stats,
  sectionStudentList, sectionOccupancy, sectionMaxDraft, setSectionMaxDraft,
  loadData, createGrade, addSection, updateSectionMax, deleteSection, deleteGrade,
} = useGradeManagement({ schoolCode, DB_URL, selectedGrade, setSelectedGrade, selectedSection, setSelectedSection });
```

**Today:** CRUDs `GradeManagement/grades/{n}/sections/{key}` on RTDB.

**Tomorrow:** `GET/POST/PATCH/DELETE /api/schools/{code}/grades/...`. **Same surface.**

### `useAnalyticsData`

```js
const {
  loading, allYears, summary, monthlyTrend, yearlyTrend,
  activeSummary, activeGradeBreakdown, activeGenderBreakdown,
  activeLabel, yearlyChartData, selectedYearRateText,
} = useAnalyticsData({ DB_ROOT, selectedYear, selectedMonth, periodMode, setSelectedYear });
```

**Today:** Pulls students + the full `monthlyPaid` node, computes all aggregations client-side.

**Tomorrow:** Aggregations move to SQL views / a `GET /api/analytics/payments?year=...&month=...` endpoint that returns pre-computed shapes. **Same surface.**

---

## Domain map — pages ↔ hooks ↔ components

| Page | Hooks it composes | Components it renders |
|---|---|---|
| `Dashboard.jsx` | `useRegistrarSession`, `usePosts`, `useCalendar`, `useConversations`, `useTopbarNotifications` | `DashboardSidebar`, `DashboardTopBar`, `PostsFeed`, `CalendarWidget`, `CreatePostModal`, `CalendarEventModal`, `QuickStatisticsCard`, `TodaysActivityCard` |
| `MyPosts.jsx` | `useRegistrarSession`, `usePosts`, `useCalendar`, `useTopbarNotifications` | `MyPostCard`, `DashboardTopBar`, `MyPostsStatisticsCard` |
| `Students.jsx` | `useRegistrarSession`, `useStudentsList`, `useStudentDetail`, `useStudentTabData`, `useStudentFullscreenForm`, `useStudentProfileEdit`, `useAttendanceView`, `useStudentChat` | `StudentListPanel`, `StudentDetailDrawer` (composes `StudentDetailsTab`, `StudentAttendanceTab`, `StudentPerformanceTab`, `StudentPaymentTab`), `StudentFullscreenModal`, `StudentChatPopup`, `StudentChatActionButtons` |
| `Parents.jsx` | `useRegistrarSession`, `useParentsList`, `useParentDetail`, `useParentChat`, `useTopbarNotifications` | `ParentListPanel`, `ParentDetailDrawer`, `ParentChatPopup`, `DashboardTopBar` |
| `PromotionSystem.jsx` | `useRegistrarSession`, `usePromotionData`, `useReRegisterDraft`, `useStudentReview`, `useDecisions` | `ReRegisterModal`, `Step2StudentReview` |
| `DocumentGeneration.jsx` | `useRegistrarSession`, `useDocumentData` | `DocumentPreview` (uses `utils/documentPdfs.js` for jsPDF rendering) |
| `AcademicYearManagement.jsx` | `useRegistrarSession` | `RolloverConfirmModal`, `HistoryStudentDetailModal` |
| `SettingsPage.jsx` | (still uses inline storedAdmin — legacy auth path; see § Known issues) | `SecuritySettingsPanel`, `SchoolInformationPanel`, `AcademicConfigurationPanel`, `UserManagementPanel`, `DocumentTemplatesPanel`, `SystemPreferencesPanel`, `RolesNotificationsPanel`, `BackupDataPanel`, `SystemInformationPanel` |
| `StudentRegister.jsx` | `useRegistrarSession`, `useStudentRegister` | (form rendered inline — single-page wizard) |
| `TransferWithdrawal.jsx` | `useRegistrarSession`, `useTransferWithdrawal` | `ConfirmStatusModal` |
| `Analatics.jsx` | `useRegistrarSession`, `useAnalyticsData`, `useTopbarNotifications` | `DashboardTopBar` (recharts charts rendered inline; exports in `utils/analyticsExports.js`) |
| `GradeManagement.jsx` | `useRegistrarSession`, `useGradeManagement` | (table rendered inline) |
| `AllChat.jsx` | `useRegistrarSession`, `useAllChatContacts`, `useAllChatThread` | (thread + sidebar rendered inline) |
| `Overview.jsx` | `useRegistrarSession`, `useOverviewData` | (cards rendered inline) |

---

## Conventions

- **Imports are relative.** Use `../../` etc. — there's no path alias.
- **Hooks export default** (one hook per file).
- **Components export default OR named** depending on whether the file has one or several.
- **No `prompt`/`alert`/`confirm` in new code.** (`usePosts.handleEdit` still uses `prompt` — flagged for follow-up.)
- **No direct Firebase calls in pages.** All RTDB/Storage access lives in hooks or `utils/`.
- **All RTDB URLs route through `FIREBASE_DATABASE_URL`** (config.js). Never hard-code another project's URL.
- **`utils/rtdbCache.js`** owns the localStorage TTL cache used by all `loadSchool*Node` helpers in `utils/registerData.js`.
- **Per-portal hooks, no shared package.** Hooks/components live inside this portal; copy patterns from Admin-Web, don't import from it.

---

## Adding a new feature — the dissection pattern

1. **Start with the page.** What's the user-facing flow?
2. **Identify the data layer.** What does it fetch / send / subscribe to? → That's a hook.
3. **Identify the rendered pieces.** Each visually-bounded chunk that takes props → a component.
4. **Wire:** page calls hook(s), passes hook output as props to component(s).
5. **Stop when** the page is mostly `<Component {...slice} />` calls.

If you find yourself writing a `useEffect` inside a page, you're probably about to violate the rule. Push it into a hook.

---

## Backend-swap checklist (when the new stack lands)

For each hook, swap the internal implementation:

- [ ] **`useRegistrarSession`** — `/api/me` + JWT instead of localStorage + RTDB user hydration.
- [ ] **`useStudentsList` / `useStudentDetail` / `useStudentTabData`** — REST endpoints backed by PostgreSQL + Redis cache; keep return shape identical.
- [ ] **`useParentsList` / `useParentDetail`** — same pattern.
- [ ] **`useAllChatThread` / `useStudentChat` / `useParentChat`** — replace `onValue` listeners with WebSocket events; replace Firebase Storage upload with Cloudflare R2.
- [ ] **`useStudentRegister`** — push ID-generation to the server (atomic); hook keeps preview probes only.
- [ ] **`useTransferWithdrawal`** — single POST that does the YearHistory archive + user deactivation server-side.
- [ ] **`useGradeManagement`** — `/api/schools/{code}/grades` CRUD endpoints.
- [ ] **`useAnalyticsData`** — pre-aggregated `/api/analytics/payments` endpoint.
- [ ] **`usePosts` / `useCalendar` / `useTopbarNotifications`** — REST + (for notifications) WebSocket.
- [ ] **`utils/registerData.js`** — body swaps to fetch from REST; signatures unchanged.
- [ ] **`utils/rtdbCache.js`** — retire (Redis owns caching now) OR keep as a thin browser-side TTL cache for read-mostly endpoints.

Hook signatures stay the same. Page code stays the same. Components stay the same. **That's the payoff.**

---

## Known issues / follow-up cleanup

- **`usePosts.handleEdit`** still uses native `prompt()`. Port the `EditPostModal` from Admin-Web (Phase 1 cleanup).
- **`useRegistrarSession`** falls back to `localStorage.getItem("admin")` for back-compat. Drop after the new auth flow lands.
- **`SettingsPage.jsx`** has NOT been migrated to `useRegistrarSession` — its auth-mutation flow (profile picture upload, password change, 2FA) is tangled with `storedAdmin` / `persistAdmin` / `persistStoredSession`. Plan a dedicated session for it.
- **`PromotionSystem.jsx handleSaveReRegister`** (~360 lines) still lives on the page. Intertwined with 8+ setters; acceptable trade-off until backend swap simplifies it.
- **`AcademicYearManagement.jsx`** history-students loader is still inline. Could become `useYearHistoryStudents` (~50 lines).
