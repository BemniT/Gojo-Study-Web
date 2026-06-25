# Gojo Study Web Platform

## Overview

Gojo Study Web is a comprehensive, multi-tenant school management platform built as a monorepo. It provides six specialized web applications covering every operational domain of a school ecosystem — from student registration and teacher management to HR, finance, company-level analytics, and administration.

The platform is built on a **React + Python Flask + Firebase** stack. All sub-applications share a common Firebase Realtime Database and Firebase Storage backend, organized under a multi-school architecture.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Repository Structure](#repository-structure)
3. [Sub-Applications](#sub-applications)
   - [Gojo-Admin-Web](#1-gojo-admin-web--school-administration)
   - [Gojo-Finance-Web](#2-gojo-finance-web--financial-management)
   - [Gojo-Hr-Web](#3-gojo-hr-web--human-resources)
   - [Gojo-Register-Web](#4-gojo-register-web--student-registration)
   - [Gojo-Teacher-Web](#5-gojo-teacher-web--teacher-portal)
   - [Gojo-Company-Web](#6-gojo-company-web--company-analytics)
4. [Technology Stack](#technology-stack)
5. [Firebase Database Schema](#firebase-database-schema)
6. [Environment Configuration](#environment-configuration)
7. [Getting Started](#getting-started)
8. [API Reference](#api-reference)
9. [Deployment](#deployment)
10. [Performance & Optimization](#performance--optimization)
11. [Development Guidelines](#development-guidelines)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Gojo Study Web                          │
│                  (Monorepo / Multi-Tenant)                   │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────▼────────┐
    │  Firebase       │
    │  Realtime DB    │◄──── Shared across all sub-apps
    │  Firebase       │
    │  Storage        │
    └────────┬────────┘
             │
  ┌──────────▼──────────────────────────────────────────────┐
  │  Platform1 > Schools > {schoolCode} > [collections]     │
  └──────────────────────────────────────────────────────────┘
             │
  ┌──────────┴──────────────────────────────────────────────┐
  │         Six Specialized Flask REST APIs                  │
  │  (each app has its own backend + React frontend)         │
  └──────────────────────────────────────────────────────────┘
```

Each sub-application is self-contained with its own:
- Python Flask backend (REST API)
- React 18 + Vite frontend
- Firebase Admin SDK integration
- Independent `.env` configuration

---

## Repository Structure

```
Gojo-Study-Web/
├── Gojo-Admin-Web/               # School administration dashboard
│   ├── frontend/school-admin/    # React + Vite frontend
│   └── correct_posts_structure.md
│
├── Gojo-Finance-Web/             # Financial management system
│   ├── frontend/                 # React + Vite frontend
│   ├── finance_app.py            # Flask REST API
│   └── firebase_config.py
│
├── Gojo-Hr-Web/                  # Human resources management
│   ├── backend/                  # Flask API + utilities
│   │   ├── hr_app.py             # Main Flask application
│   │   ├── firebase_config.py
│   │   ├── requirements.txt
│   │   └── backfill_*.py         # Data migration/optimization scripts
│   ├── frontend/                 # React + Vite frontend
│   ├── README.md
│   └── ENV_SETUP.md
│
├── Gojo-Register-Web/            # Student registration system
│   ├── frontend/school-register/ # React + Vite frontend
│   ├── register_app.py           # Flask REST API
│   └── firebase_config.py
│
├── Gojo-Teacher-Web/             # Teacher portal
│   ├── frontend/teacher/         # React + Vite frontend (with React Query)
│   └── app.py                    # Flask REST API
│
├── Gojo-Company-Web/             # Company-level analytics
│   ├── frontend/                 # React + Vite frontend
│   ├── backend/
│   │   ├── gojo_app.py           # Flask REST API
│   │   └── requirements.txt
│   └── render.yaml               # Render deployment config
│
├── .vscode/                      # Shared VS Code workspace settings
├── CRITICAL_FIXES_REQUIRED.md    # Priority performance issues
├── CODE_OPTIMIZATION_GUIDE.md    # Line-level optimization guide
├── ULTRA_OPTIMIZATION_ROADMAP.md # Long-term optimization roadmap
├── FIREBASE_STRESS_TEST_REPORT.md
├── OPTIMIZATION_COST_COMPARISON.md
└── TEAM_COORDINATION_GUIDE.md
```

---

## Sub-Applications

### 1. Gojo-Admin-Web — School Administration

**Purpose:** The full school administration portal used by school administrators to manage every aspect of school operations — from student and teacher management to scheduling, academic configuration, exam workflows, financial oversight, and real-time communication with teachers, students, and parents.

**Path:** [Gojo-Admin-Web/](Gojo-Admin-Web/)

**Frontend Entry:** [Gojo-Admin-Web/frontend/school-admin/src/](Gojo-Admin-Web/frontend/school-admin/src/)

**Backend Base URL:** `http://127.0.0.1:5001` (development)

---

#### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18, Vite |
| Routing | React Router v6 |
| Server state / caching | TanStack Query (React Query v5) |
| List virtualization | react-window |
| Charts | Recharts |
| Drag & drop | react-beautiful-dnd |
| PDF export | jsPDF + jspdf-autotable |
| Excel export | ExcelJS + file-saver |
| HTTP client | Axios |
| Database | Firebase Realtime Database |
| File storage | Firebase Storage |
| Date utilities | date-fns |

---

#### Authentication & Authorization

- Admin logs in via `/login` — credentials are POST'd to `/api/login`
- On success the server returns `{ adminId, userId, name, role, schoolCode, profileImage }`
- Valid roles: `school_admins`, `school_admin`, `admin`, `admins` (case-insensitive, dash/underscore tolerant)
- Session is stored in `localStorage` and protected by a `RequireAdmin` route guard
- **All data is school-scoped** — every Firebase path is prefixed with `Platform1/Schools/{schoolCode}/`, so each admin only ever sees their own school
- **Sensitive operations** (deactivating a teacher, disabling a student account) trigger `AdminVerifyModal` — the admin must re-enter their credentials before the action proceeds

---

#### Pages & Routes

| Route | Page | What the admin can do |
|-------|------|----------------------|
| `/dashboard` | Dashboard | Read the school activity feed (posts/announcements), create new posts targeting specific groups (students, teachers, parents, or everyone), edit/delete own posts, see unread message badges |
| `/my-posts` | My Posts | View and manage all posts created by this admin |
| `/overview` | Overview | School-wide analytics: total students, active/inactive split, male/female ratio, new registrations this month with trend chart, students-per-grade breakdown (bar chart + progress bars) |
| `/teachers` | Teachers | Full teacher management (see detail below) |
| `/students` | Students | Full student management (see detail below) |
| `/parents` | Parents | Full parent management (see detail below) |
| `/schedule` | Schedule | Class schedule builder for all grades/sections |
| `/assign-teacher` | Assign Teacher | Map teachers to grades and subjects |
| `/academic-year` | Academic Year | Manage academic years, view year-over-year enrollment history |
| `/subject-management` | Subject Management | Configure grades, sections, and subject listings |
| `/assessment` | Assessment | Assessment configuration (in progress) |
| `/exams` | Exams | Exam period and category setup (in progress) |
| `/results` | Results | Exam results viewer (in progress) |
| `/report-cards` | Report Cards | Report card generation and distribution (in progress) |
| `/all-chat` | All Chat | Unified inbox — messages from teachers, students, and parents in one view |
| `/message-control` | Message Control | Message routing and filtering rules |
| `/student-chat` | Student Chat | Direct messaging with a specific student |
| `/teacher-register` | Teacher Register | Register a new teacher account |
| `/student-register` | Student Register | Register a new student |
| `/parent-register` | Parent Register | Register a new parent/guardian |
| `/settings` | Settings | Admin preferences and app configuration |

---

#### Teacher Management (detailed)

The Teachers page is a full management interface. When an admin opens it they can:

- See all teachers in a virtualized, scrollable list (handles large rosters without browser slowdown)
- Filter teachers by the grade they teach, or search by name/subject
- Click any teacher to open a **detail sidebar** with three tabs:
  - **Details tab** — full profile: name, email, phone, assigned subjects, account status, profile photo
  - **Schedule tab** — the teacher's complete weekly timetable showing which class they teach each period
  - **Lesson Plans tab** — browse the teacher's lesson plans week by week as submitted through the Teacher Portal
- **Activate / Deactivate** a teacher account (requires admin re-authentication)
- **Chat** with any teacher inline via a chat popup without leaving the page
- **Export** a teacher's timetable as a PDF

---

#### Student Management (detailed)

The Students page gives the admin a 360° view of every student. Clicking a student opens a multi-tab detail panel:

- **Basic info** — name, grade, section, date of birth, gender, profile photo
- **Parent/Guardian info** — linked parent accounts and relationship
- **Address & contact** — home address, phone numbers
- **Health info** — medical notes, conditions
- **Academic info** — enrolled courses, assigned teacher per subject
- **Finance tab** — full payment history, outstanding balance, fee records
- **Attendance tab** — attendance records filtered by date and course, summary statistics
- **Performance tab** — marks and grades per subject and semester

Additional actions:
- Edit any field in the student's profile
- Activate / deactivate the student account (requires re-authentication)
- Chat directly with a student from inside the detail panel
- Filter the full list by grade, section, or search by name

---

#### Parent Management (detailed)

- View all parent/guardian accounts in a searchable, filterable list
- Click a parent to open a detail panel showing:
  - Parent profile (name, email, phone, address)
  - All linked children with their grade and section
  - Relationship type (mother, father, guardian, etc.)
  - Account activation status
- Activate / deactivate parent accounts
- Chat with parents directly in-app

---

#### Class Schedule Builder

- View and edit the master timetable for any grade/section combination
- Drag-and-drop subjects into time slots
- Assign teachers to periods and verify there are no conflicts
- Check teacher workload across the week
- Export the completed schedule as a PDF

---

#### Academic Configuration

- **Academic Years** — create new academic years, set the current active year, and browse historical enrollment data year-over-year
- **Subject Management** — define which subjects exist for each grade, configure sections (e.g. Grade 9 has sections A, B, C), and set the number of periods per subject per week

---

#### Real-Time Communication

The admin has three ways to communicate:

1. **Posts feed** (`/dashboard`) — publish school-wide announcements visible to selected roles (teachers, students, parents, or all). Posts appear in the feeds of the Teacher Portal, Student Portal, and HR system.
2. **All Chat** (`/all-chat`) — a unified inbox aggregating conversations with every teacher, student, and parent. Unread counts are shown per sender in the navbar.
3. **Inline chat popups** — when browsing the Teachers or Students pages, the admin can open a chat window for any individual without navigating away.

---

#### Analytics & Overview

The `/overview` page provides at-a-glance school metrics:

- Total student enrollment with active vs. inactive breakdown
- Gender distribution (male/female percentages)
- New student registrations this month vs. last month (trend chart)
- Enrollment count per grade rendered as a bar chart and percentage progress bars
- Quick-action shortcuts to register teachers, students, or parents

---

#### State Management Architecture

| Concern | How it is handled |
|---------|------------------|
| Remote data (API + Firebase) | React Query — automatic caching, background refetch, stale-while-revalidate |
| UI state (modals, tabs, selections) | Local `useState` per component |
| Real-time messages | Firebase RTDB `onValue` listeners, active only when the chat is open |
| Session / auth | `localStorage` read by `useAdminSession()` hook |
| Frequent Firebase reads | `rtdbCache.js` — in-memory cache layer to deduplicate repeated reads |

---

#### Firebase Database Nodes Used

```
Platform1/Schools/{schoolCode}/
├── Users/                    # All user accounts (admin, teacher, student, parent)
├── Teachers/                 # Teacher profiles and assignments
├── Students/                 # Student profiles
├── Parents/                  # Parent/guardian profiles
├── Posts/                    # School announcements
├── PostNotifications/        # Per-user read status for posts
├── Chats/                    # Direct message threads
├── ChatSummaries/            # Conversation metadata (last message, unread count)
├── Schedule/                 # Class timetables by grade/section
├── TeacherDirectory/         # Quick-lookup index for teacher search
├── StudentDirectory/         # Quick-lookup index for student search
├── GradeManagement/
│   └── grades/{grade}/
│       └── sectionSubjectTeachers/   # Teacher-to-subject-to-section mapping
├── TeacherAssignments/       # Teacher-to-course assignment records
├── AcademicYears/            # Academic year configurations
├── LessonPlans/              # Teacher lesson plans (by week)
├── Assessments/              # Assessment configurations
├── Attendance/               # Daily student attendance records
└── Payments/                 # Student fee payment records
```

---

#### Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Admin authentication |
| POST | `/api/register` | Register teacher / student / parent |
| GET | `/api/admin/{id}` | Fetch admin profile |
| GET | `/api/get_posts` | Fetch school post feed |
| POST | `/api/create_post` | Publish a new post/announcement |
| DELETE | `/api/delete_post/{id}` | Delete a post |
| GET | `/api/get_post_notifications/{adminId}` | Get unread post notifications |
| POST | `/api/mark_post_notification_read` | Mark a post notification as read |
| GET | `/api/unread_messages/{userId}` | Unread message count per sender |
| GET | `/api/users_lookup` | Batch-fetch user profiles by ID list |
| GET | `/api/school-node-read` | Read any node from the school's Firebase tree |
| PUT | `/api/school-node` | Write / update any node in the school's Firebase tree |

---

#### Key Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAdminSession()` | Read and validate the admin session from localStorage |
| `usePosts()` | Posts feed CRUD — create, edit, delete, paginate |
| `useConversations()` | Aggregate unread message counts across all conversations |
| `useTeachersList()` | Paginated, filterable teacher list |
| `useTeacherChat()` | Real-time chat with a specific teacher |
| `useTeacherSchedule()` | Weekly schedule for a selected teacher |
| `useTeacherLessonPlans()` | Lesson plans by week for a selected teacher |
| `useStudentsList()` | Paginated student list with grade/section filters |
| `useStudentPerformance()` | Marks, attendance records, and payment history for a student |
| `useStudentChat()` | Real-time chat with a specific student |
| `useParentsList()` | Searchable/filterable parent list |
| `useParentDetail()` | Parent profile and linked children |
| `useParentChat()` | Real-time chat with a specific parent |
| `useTopbarNotifications()` | Polls unread counts for the navbar badge |
| `useAcademicYears()` | Academic year CRUD operations |
| `useCalendar()` | Calendar event creation and management |
| `useDarkMode()` | Application-wide theme toggling |

---

#### Pages Still Under Development

The following routes exist in the router but are not yet fully implemented:

| Route | Status |
|-------|--------|
| `/assign-teacher` | UI scaffold only — backend wiring incomplete |
| `/assessment` | Placeholder — assessment creation not wired |
| `/exams` | Stub — exam period config not connected |
| `/results` | Stub — results display not connected |
| `/report-cards` | Stub — report card generation not implemented |
| `/message-control` | Placeholder — routing rules not implemented |

---

### 2. Gojo-Finance-Web — Financial Management

**Purpose:** Finance department portal for managing school fees, payments, salaries, and financial reporting.

**Path:** [Gojo-Finance-Web/](Gojo-Finance-Web/)

**Tech Stack:**
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+, Flask, Firebase Admin SDK |
| Frontend | React 18, Vite |
| Database | Firebase Realtime Database |
| Storage | Firebase Storage |

**Key Features:**
- School node caching with 30-minute TTL to reduce Firebase reads
- Platform lookup indexing for fast multi-school queries
- Finance record management with user-school mapping
- File upload support to Firebase Storage

**Backend Entry:** [Gojo-Finance-Web/finance_app.py](Gojo-Finance-Web/finance_app.py)

---

### 3. Gojo-Hr-Web — Human Resources

**Purpose:** Full HR management system covering employee profiles, attendance, activity feed (posts), chat, and notifications.

**Path:** [Gojo-Hr-Web/](Gojo-Hr-Web/)

**Tech Stack:**
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+, Flask, Flask-CORS, Firebase Admin SDK, Pillow |
| Frontend | React 18, Vite, React Router |
| Database | Firebase Realtime Database |
| Storage | Firebase Storage (with immutable cache headers) |

**Key Features:**
- Employee profile image upload with optimized cache headers
- Post feed with pagination and server-side preview image generation
- Chat with summary-first architecture (reduces reads by ~70%)
- In-process employee summary cache (TTL-based)
- Attendance backfill and pre-computation utilities

**Backend Entry:** [Gojo-Hr-Web/backend/hr_app.py](Gojo-Hr-Web/backend/hr_app.py)

**Utility Scripts:**

| Script | Purpose |
|--------|---------|
| `backfill_post_previews.py` | Generate preview images for existing posts |
| `backfill_profile_image_cache_headers.py` | Apply immutable cache headers to existing profile images |
| `backfill_attendance_summaries.py` | Pre-compute attendance summary data |
| `backfill_chat_summaries.py` | Generate chat metadata summaries |

**Documentation:** [Gojo-Hr-Web/README.md](Gojo-Hr-Web/README.md) · [Gojo-Hr-Web/ENV_SETUP.md](Gojo-Hr-Web/ENV_SETUP.md)

---

### 4. Gojo-Register-Web — Student Registration & Enrollment

**Purpose:** The full student lifecycle management portal used by school registerers. It handles everything from registering new students, parents, and teachers — through daily student management, grade promotion, transfers, withdrawals, and document generation — all the way to the critical year-end academic rollover that archives the current year and resets the school for the next one.

**Path:** [Gojo-Register-Web/](Gojo-Register-Web/)

**Frontend Entry:** [Gojo-Register-Web/frontend/school-register/src/](Gojo-Register-Web/frontend/school-register/src/)

**Backend Entry:** [Gojo-Register-Web/register_app.py](Gojo-Register-Web/register_app.py)

**Backend Base URL:** `http://127.0.0.1:5001` (development)

---

#### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+, Flask, Flask-CORS, Firebase Admin SDK |
| Frontend | React 18, Vite, Tailwind CSS |
| Routing | React Router v6 |
| Charts | Recharts |
| PDF export | jsPDF + jspdf-autotable |
| Excel export | ExcelJS + file-saver |
| Date handling | date-fns, ethiopic-calendar |
| Two-factor auth | otplib (TOTP) |
| HTTP client | Axios |
| Database | Firebase Realtime Database |
| File storage | Firebase Storage |

---

#### Who Uses This App

Only users with role `"registerer"` and a username starting with `GSR_` can log in. Registerer accounts are created through a dedicated self-registration form (`/registerer-register`) and are scoped to a single school via `schoolCode`. All data the registerer sees or writes is locked to their school's Firebase node.

**Session storage format (localStorage):**
```json
{
  "registrarId": "...",
  "userId": "...",
  "name": "...",
  "username": "GSR_XXXX_YY",
  "schoolCode": "...",
  "role": "registerer",
  "profileImage": "..."
}
```

---

#### Pages & Routes

| Route | Page | What the registerer can do |
|-------|------|---------------------------|
| `/login` | Login | Enter GSR username and password to access the portal |
| `/registerer-register` | Registerer Register | Self-register a new registerer account for a school |
| `/dashboard` | Dashboard | Read school announcements, create and publish posts targeting specific roles, see unread message counts |
| `/my-posts` | My Posts | View, edit, and delete posts created by this registerer |
| `/overview` | Overview | School-wide stats: total students, active/inactive counts, gender breakdown, grade distribution |
| `/student-register` | Student Register | Multi-step form to register a new student (see full field list below) |
| `/parent-register` | Parent Register | Register a parent/guardian and link them to existing students |
| `/teacher-register` | Teacher Register | Register a teacher with dynamic course assignments |
| `/students` | Students | Browse all students, search, filter by grade/section, view full profile, edit details, view marks and attendance, chat |
| `/parents` | Parents | Browse all parents, search, view linked children, chat |
| `/academic-years` | Academic Year Management | Create and activate academic years, and run the guarded year-end rollover |
| `/grede-management` | Grade Management | Define grades (1–12), manage sections within each grade |
| `/promotion-system` | Promotion System | Promote, repeat, or graduate students at year end |
| `/transfer-withdrawal` | Transfer & Withdrawal | Mark students as transferred to another school or withdrawn |
| `/document-generation` | Document Generation | Generate official student documents as PDFs |
| `/analytics` | Analytics | Student performance reports, attendance summaries, grade distribution charts |
| `/all-chat` | All Chat | Unified inbox — messages from students, parents, and teachers |
| `/student-chat` | Student Chat | Direct chat with a specific student |
| `/parent-chat` | Parent Chat | Direct chat with a specific parent |
| `/settings` | Settings | School info, role permissions, two-factor auth (TOTP), theme, document templates |

---

#### Registration Forms — Full Field Reference

**Student Registration** (`/student-register`) is a multi-section form:

| Section | Fields |
|---------|--------|
| Basic Info | firstName, middleName, lastName, grade (1–12), section, gender, dateOfBirth, studentPhoto (file upload) |
| Academic Setup | academicYear, stream, specialProgram, languageOption, electiveSubjects |
| Address | region, city, subCity, kebele, houseNumber |
| Finance | registrationFeePaid, hasDiscount, discountAmount, paymentPlanType (monthly/quarterly/annual), transportService |
| Health & Emergency | bloodType, medicalCondition, emergencyContactName, emergencyPhone |
| Documents | studentNationalIdImage (file upload) |
| Inline Parent (repeatable) | fullName, relationship, phone, alternativePhone, email, occupation, nationalIdNumber, profileImage, temporaryPassword |
| System Account | username (auto = studentId), temporaryPassword (auto-generated), role (default: "student") |

**Parent Registration** (`/parent-register`):
- name, username, phone, password
- Children (multiple): select existing student → specify relationship (Mother / Father / Guardian / Other)

**Registerer Registration** (`/registerer-register`):
- schoolCode, name, password, email, phone, gender
- Username is auto-generated in `GSR_XXXX_YY` format

**Teacher Registration** (`/teacher-register`):
- name, username (optional, auto-generated), password, email, phone, gender
- Courses (dynamic, add multiple): grade, section, subject

---

#### ID Generation System

All IDs follow a standardized format:

| Role | Format | Example |
|------|--------|---------|
| Student | `GES_XXXX_YY` | `GES_0042_25` |
| Parent | `GPR_XXXX_YY` | `GPR_0018_25` |
| Registerer | `GSR_XXXX_YY` | `GSR_0003_25` |
| Teacher | `GET_XXXX_YY` | `GET_0011_25` |

Where `XXXX` is a zero-padded sequence number and `YY` is the 2-digit year.

---

#### Academic Year Rollover — Guarded System

The rollover is the most critical and dangerous operation in the platform — it archives the current academic year and resets the school database for the next year. A multi-step safety guard prevents accidental execution.

**Step 1 — Arm the rollover**
- The registerer must enter their own password to verify identity
- Must type an exact confirmation phrase: `ROLL OVER FROM YYYY_YYYY TO YYYY_YYYY`
- Must choose a mandatory delay: 1 hour, 6 hours, 12 hours, or 24 hours
- The system records the `executeAfter` timestamp and locks the trigger

**Step 2 — Wait (countdown lock)**
- The rollover cannot be executed before the countdown expires
- The registerer can cancel during this window
- The UI shows a live countdown

**Step 3 — Execute rollover** (only available after countdown)
- Archives to `YearHistory/{year}/`: Students, Parents, ClassMarks, LessonPlans
- Records rollover metadata: counts of promoted, repeated, graduated, withdrawn students
- Resets yearly nodes to empty: Chats, Attendance, SchoolExams, Employees_Attendance, CalendarEvents, StudentBookNotes, Schedules
- Deletes active Students and Parents nodes (already archived)
- Deactivates all student and parent user accounts
- Runs **automatic promotion logic**:
  - Calculates each student's average mark from ClassMarks
  - Compares against the configurable pass mark (default 50%)
  - Pass → promoted to next grade (or graduated if final grade)
  - Fail → repeated in current grade
  - Withdrawn/graduated students are deactivated

**Rollover history** is stored at `RolloverControl/History/` for audit purposes, recording who armed it, when, and the outcome.

---

#### Student Management (detailed)

On the `/students` page the registerer can:

- Browse all students in a searchable, filterable list (by grade, section, or name)
- Click a student to open a full detail sidebar with tabs:
  - **Profile** — all personal info (name, grade, gender, DOB, photo, address, health)
  - **Attendance** — attendance records by date and course
  - **Marks** — grades per subject and semester
  - **Finance** — payment history, outstanding balance
- **Edit** any field in the student profile
- **Chat** directly with the student from inside the detail panel
- Deactivate / reactivate a student account

---

#### Document Generation

The `/document-generation` page lets the registerer produce official school documents as downloadable PDFs:

| Document Type | Description |
|---------------|-------------|
| Student ID Card | Printable ID with photo, name, grade, school name |
| Enrollment Letter | Official letter confirming enrollment |
| Transfer Letter | Letter for students transferring to another school |
| Profile Report | Full student data summary |
| Certificate of Enrollment | Formal enrollment certificate |

Documents are generated client-side using jsPDF and can be downloaded immediately.

---

#### Promotion & Transfer System

**Promotion System** (`/promotion-system`):
- Select individual students or batch-select by grade
- Actions: Promote (move to next grade), Repeat (stay in current grade), Graduate (exit final grade)
- Updates the student's `academicYear` field and records the decision

**Transfer & Withdrawal** (`/transfer-withdrawal`):
- Mark a student as transferred to another school (status: `transferred`)
- Mark a student as withdrawn (status: `withdrawn`, account deactivated)
- Status changes are recorded with a timestamp in the student's history

---

#### Caching Architecture

Two layers of caching keep Firebase read costs low:

| Layer | Where | TTL | What is cached |
|-------|-------|-----|---------------|
| Server-side | Flask in-process dict | 30 minutes | Students, Parents, Teachers, Users nodes — shared across all registerer sessions |
| Client-side | localStorage + in-memory | 5–30 minutes | Same nodes, per browser tab |

Cache is automatically invalidated after any write operation (register student, register parent, etc.) so the next read fetches fresh data.

---

#### Firebase Database Nodes Used

```
Platform1/Schools/{schoolCode}/
├── Users/                    # All user accounts (student, parent, teacher, registerer)
├── Students/                 # Full student profiles
├── Parents/                  # Parent/guardian profiles and child links
├── Teachers/                 # Teacher profiles and course assignments
├── Registerers/              # Registerer accounts
├── Posts/                    # Announcements published by registerer
├── Chats/                    # Direct message threads
├── ClassMarks/               # Student grades per subject
├── AcademicYears/            # Year configurations and active year
├── YearHistory/              # Archived data from past years
│   └── {year}/
│       ├── Students/
│       ├── Parents/
│       ├── ClassMarks/
│       ├── LessonPlans/
│       └── rolloverMeta/     # Promoted/repeated/graduated/withdrawn counts
├── RolloverControl/
│   ├── Pending/              # Currently armed rollover request
│   └── History/             # All past rollover attempts (audit log)
├── schoolInfo/               # Current academic year, school settings, pass mark config
├── GradeManagement/          # Grade and section structure
├── Attendance/               # Daily attendance records
└── Schedules/                # Class timetables
```

**Firebase Storage paths:**
```
students/{schoolCode}_{timestamp}_{filename}         # Student photos
national_ids/students/{schoolCode}_{timestamp}_{filename}  # Student national IDs
parents/{schoolCode}_{timestamp}_{filename}          # Parent photos
national_ids/parents/{schoolCode}_{timestamp}_{filename}   # Parent national IDs
posts/{filename}                                     # Post media
```

---

#### Backend API Endpoints

**Authentication:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Registerer login — verifies role is `"registerer"` and username starts with `GSR_` |

**Registration:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register/student` | Register student — generates ID, uploads photos, creates Users + Students + optional Parents nodes |
| POST | `/api/register/parent` | Register parent — generates ID, links to existing students |
| POST | `/api/register/teacher` | Register teacher — generates ID, stores course assignments |
| POST | `/api/register/registerer` | Create registerer account — generates GSR username |

**Students / Nodes:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nodes/Students` | Cached students node (30-min TTL) |
| GET | `/api/nodes/Parents` | Cached parents node |
| GET | `/api/nodes/Teachers` | Cached teachers node |
| GET | `/api/nodes/Users` | Cached users node |
| GET | `/api/get_students` | Student list using cache |

**Posts:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/create_post` | Publish announcement targeting specific roles |
| GET | `/api/get_posts` | Fetch all posts (optional schoolCode filter) |
| GET | `/api/get_my_posts/<owner_id>` | Get posts created by this registerer |
| POST | `/api/like_post` | Toggle like on a post |

**Academic Year & Rollover:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/academic-years` | List all academic years and the current active year |
| POST | `/academic-years/create` | Create a new academic year (auto-normalizes format to `YYYY_YYYY`) |
| POST | `/academic-years/activate` | Set a year as the current active year |
| POST | `/academic-years/archive` | Archive a completed year |
| GET | `/academic-years/rollover/pending` | Check if a rollover is currently armed |
| POST | `/academic-years/rollover/arm` | Arm the rollover — requires password verify, confirmation phrase, and delay choice |
| POST | `/academic-years/rollover/cancel` | Cancel an armed rollover (only the initiator can cancel) |
| POST | `/academic-years/rollover` | Execute rollover after countdown expires — archives, resets, and promotes |

---

#### Settings & Configuration

The `/settings` page lets the registerer configure:

- **School info** — school name, logo, contact details
- **Role permissions** — which roles can perform which actions (`MANAGED_ROLES`)
- **Two-factor authentication** — generate and verify TOTP secrets (via otplib) for account security
- **Document templates** — customize headers and footers for generated PDFs
- **Theme** — toggle dark / light mode (persisted in localStorage)

---

### 5. Gojo-Teacher-Web — Teacher Portal

**Purpose:** The complete day-to-day working environment for teachers. A teacher uses this portal to view their assigned courses and students, take daily attendance, enter and manage student marks across multiple assessment components, write and submit lesson plans (weekly and annual), communicate with students and parents, create exams with question banks, view student performance history, and manage school calendar events. The app is fully scoped to the teacher's school and their assigned courses — a teacher can only see and modify data for the courses they are assigned to.

**Path:** [Gojo-Teacher-Web/](Gojo-Teacher-Web/)

**Frontend Entry:** [Gojo-Teacher-Web/frontend/teacher/src/](Gojo-Teacher-Web/frontend/teacher/src/)

**Backend Entry:** [Gojo-Teacher-Web/app.py](Gojo-Teacher-Web/app.py)

**Documentation:** [Gojo-Teacher-Web/ENV_SETUP.md](Gojo-Teacher-Web/ENV_SETUP.md)

**Backend Base URL:** `http://localhost:5001` (development)

---

#### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+, Flask, Flask-CORS, Firebase Admin SDK, Werkzeug (pbkdf2 password hashing) |
| Frontend | React 18, Vite |
| Routing | React Router v6 |
| Server state / caching | TanStack Query (React Query v5) |
| HTTP client | Axios |
| PDF export | jsPDF + jspdf-autotable |
| Excel export | XLSX |
| Date handling | date-fns, ethiopic-calendar |
| Database | Firebase Realtime Database |
| File storage | Firebase Cloud Storage |
| Push notifications | Firebase Cloud Messaging (FCM) |

---

#### Authentication & Authorization

**Login flow:**
1. Teacher enters their username (format: `SCHOOLPREFIX_NNNN_YY`, e.g. `GMIT_0001_26`)
2. The frontend extracts the 3-letter school prefix from the username
3. Backend resolves the full `schoolCode` from the `schoolCodeIndex` lookup node
4. Backend searches the `Teachers` node for the matching teacher and verifies the password (pbkdf2 hashed)
5. A Flask server-side session is created and the teacher object is stored in `localStorage`

**Session object stored in `localStorage`:**
```json
{
  "teacherId": "GMIT_0001_26",
  "teacherKey": "GMIT_0001_26",
  "userId": "...",
  "username": "GMIT_0001_26",
  "name": "John Doe",
  "role": "teacher",
  "schoolCode": "ET-XXXXX",
  "profileImage": "https://...",
  "hasPasswordSet": true
}
```

**Scoping rules:**
- Every Firebase read and write is prefixed with `Platform1/Schools/{schoolCode}/`
- The RTDB proxy endpoint enforces this — teachers cannot access data from other schools
- Write operations are restricted to specific allowed node prefixes: `Chats`, `Chat_Summaries`, `TeacherPosts`, `LessonPlans`, `LessonPlanSubmissions`, `SchoolExams`, `CalendarEvents`
- Calendar event management is further restricted to teachers with roles: `admin`, `director`, `school_admin`, `registerer`, or `registrar`

**Password security:**
- Passwords are hashed with Werkzeug's `pbkdf2` algorithm (not plain text)
- Teachers can change their password via `/settings` — old password must be verified first
- Minimum 8 characters, must contain both letters and numbers

---

#### Pages & Routes

| Route | Page | What the teacher can do |
|-------|------|------------------------|
| `/login` | Login | Enter school-prefixed username and password |
| `/register` | Register | Register a new teacher, student, or parent account |
| `/dashboard` | Dashboard | Read announcements from admin, like posts, see upcoming events, access quick stats |
| `/students` | Students | Browse assigned students, search by name, filter by grade/section, view full student profile with attendance and marks, take quick notes, chat |
| `/marks` | Marks / Grades | Enter student marks per course, per assessment component (mark20, mark30, mark50) |
| `/attendance` | Attendance | Record daily attendance for each course — mark students present or absent |
| `/lesson-plan` | Lesson Plan | Write and submit lesson plans — both annual curriculum overview and detailed weekly/daily plans |
| `/exam` | Exam | Create exams with multiple-choice question banks, link to curriculum chapters, publish to students |
| `/all-chat` | All Chat | Full-screen messaging interface — conversations with students, parents, other teachers |
| `/parents` | Parents | View parent accounts linked to students in the teacher's courses, chat with parents |
| `/timetable` | Timetable | View the teacher's weekly class schedule |
| `/admins` | Admin Page | View school administrators, manage calendar events (if authorized) |
| `/student-feedback` | Student Feedback | Add, edit, and delete notes about individual students |
| `/settings` | Settings | Update profile image, change password, toggle dark mode, toggle autosave behavior |

---

#### Attendance Feature (detailed)

The `/attendance` page is the teacher's daily tool for recording who is present.

**How it works:**
- Teacher selects a **course** from a dropdown (only their assigned courses appear)
- Teacher selects a **date** using a date picker (ISO format `YYYY-MM-DD`)
- The system loads the student roster for that course
- Each student is shown with their profile photo and a toggle switch (Present / Absent)
- Attendance is stored as `{studentId: true}` for present, `{studentId: false}` for absent

**Auto-save:**
- 900ms debounce — changes are saved automatically 0.9 seconds after the teacher stops toggling
- Auto-save can be turned off in Settings; in manual mode the teacher must click Save explicitly
- While unsaved changes exist, switching course or date is blocked to prevent data loss
- Save status is displayed in real time: `idle → pending → saving → saved / error`

**Firebase path written:** `Attendance/{courseId}/{date}`

---

#### Marks / Grades Feature (detailed)

The `/marks` page is where the teacher enters assessment scores for each student.

**Grading components (3 components sum to 100):**

| Field | Max Score | Description |
|-------|-----------|-------------|
| `mark20` | 20 | Continuous assessment component 1 |
| `mark30` | 30 | Continuous assessment component 2 |
| `mark50` | 50 | Final exam score |
| `mark100` | 100 | Auto-calculated total |

**How it works:**
- Teacher selects a course
- All students in that course are listed with input fields for each mark component
- Bulk update: all marks are sent in a single `POST /api/course/{courseId}/update-marks` call
- Auto-save with 900ms debounce (same pattern as attendance)

**Firebase path written:** `ClassMarks/{courseId}/{studentId}`

---

#### Lesson Plan Feature (detailed)

The `/lesson-plan` page has two views that work together: an **Annual Plan** (full-year curriculum overview) and a **Weekly Plan** (detailed day-by-day breakdown).

**Annual Plan fields (one row per week of the year):**

| Field | Description |
|-------|-------------|
| Month | Ethiopian calendar month (Meskerem through Pagume — 13 months) |
| Week | Week number within the month (W1 – W13) |
| Objective | Learning objective for the week |
| Topic | Subject matter / chapter topic |
| Method | Teaching method used |
| Material | Resources and materials required |
| Assessment | How students will be assessed |
| Expected Days | How many teaching days planned |
| Submitted Days | How many days were actually submitted in the daily log |
| Progress % | Auto-calculated: submitted ÷ expected |
| Status | Ahead / On Track / Behind / Not Started |

**Weekly Plan fields (one entry per teaching day):**

| Field | Description |
|-------|-------------|
| Week Topic | Overall topic for the week |
| Day Name | Monday / Tuesday / ... |
| Date | Actual calendar date |
| Content | Lesson content covered |
| Objectives | Day-specific learning objectives |
| Materials | Materials used for this lesson |
| Activities | Classroom activities |
| Assessment | Assessment method for the day |

**Daily submission log:** Once a day's lesson is completed the teacher marks it as submitted. This creates an entry in `LessonPlanSubmissions` that updates the submitted count on the Annual Plan automatically.

**Auto-save:** 900ms debounce, same save-state indicator as attendance and marks. Tracks dirty state separately for Annual Plan rows and Daily log entries.

**Ethiopian Calendar months used in lesson planning:**
```
Meskerem, Tekemt, Hedar, Tahsas, Ter, Yekatit,
Megabit, Miazia, Ginbot, Sene, Hamle, Nehase, Pagume
```

**Export options (both views):**
- **PDF** — landscape format with title, teacher name, course, academic year header, and full data table
- **Excel** — merged title row, auto-sized columns, metadata rows, full data

**Firebase paths used:**
```
LessonPlans/{teacherId}/{academicYear}/courses/{courseId}/
  ├── meta/           — last updated week, timestamps
  ├── annual/         — all annual plan rows
  └── weeks/{weekKey}/ — daily plans per week

LessonPlanSubmissions/{teacherId}/{academicYear}/{courseId}/entries/{dayKey}
```

---

#### Exam Feature (detailed)

The `/exam` page lets teachers build a question bank organized by curriculum chapter and create assessments from it.

**Curriculum structure:**
```
Curriculum/{gradeKey}/{subject}/
  chapters/
    {chapterId}/
      title: "Chapter 1 — ..."
      contentUrl: "..."
      order: 1
      hasExam: true
```

**Question structure (multiple-choice):**
```json
{
  "question": "What is ...?",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct": "A",
  "points": 1,
  "explanation": "..."
}
```

**Assessment types:** Exam, Quiz, Assignment

**Exam record stored at:** `Exams/{courseId}/{examId}` with fields: `chapterId`, `assessmentType`, `durationMinutes`, `totalQuestions`, `passScore`, `published`, `questions[]`

---

#### Chat / Messaging Feature (detailed)

The `/all-chat` page is a full-screen messaging interface. Teachers can have conversations with students, parents, and other teachers.

**Chat key generation:**
- Every conversation has a deterministic key built from both user IDs, sorted alphabetically: `userId1_userId2`
- The system checks all candidate orderings to find the existing conversation node

**Message structure:**
```
Chats/{chatKey}/messages/{messageId}/
  senderId, senderName, senderProfile
  text, type (text | image | video)
  timeStamp, mediaUrl
  seen: {userId: true}
  reactions: {emoji: {userId: true}}

Chat_Summaries/{userId}/{chatKey}/
  otherUserId, otherUserName, otherUserProfile
  lastMessageText, lastMessageType, lastMessageTime
  unreadCount, lastMessageSeen
```

**Pagination:** 50 messages loaded per page; older messages load on scroll

**Real-time sync:** Firebase `onValue` listeners on the active conversation. Polling every 2 minutes when the app is visible and the user is active; stops after 2 minutes of inactivity.

**Quick chat:** From the Students page the teacher can open a 50-message inline chat popup without navigating away from the student list.

---

#### Student View (detailed)

From the `/students` page the teacher can:

- Browse all students in their assigned courses, filter by grade and section, search by name
- Click a student to open a **detail panel** with three tabs:

| Tab | What is shown |
|-----|---------------|
| Details | Name, grade, section, gender, age, DOB, student ID, username, linked parent names and relationships |
| Attendance | Attendance records for the last 45 / 90 / 180 days, percentage present/absent, daily/weekly/monthly breakdowns |
| Performance | Marks per subject per semester, exam score breakdown by component (mark20/mark30/mark50), grade comparison |

- **Teacher notes** — add, edit, or delete personal notes about a student (stored at `StudentNotes/{studentId}`)
- **Quick chat** — open a chat popup with the student directly from the panel

---

#### Backend API Endpoints

**Authentication:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teacher_login` | Login — resolves school from username prefix, verifies password, creates session |
| POST | `/api/teacher/logout` | Invalidate session |
| POST | `/api/teacher/verify-password` | Re-verify current password (used before sensitive actions) |
| POST | `/api/teacher/change-password` | Change password with old/new validation |

**Teacher & Course Context:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teacher_context` | Full teacher profile: name, photo, school, role |
| GET | `/api/teacher/<teacherKey>/courses` | All courses assigned to this teacher |
| GET | `/api/teacher/<userId>/students` | All students across all the teacher's courses, with marks |
| GET | `/api/course/<courseId>/students` | Students in one specific course, optionally with marks |
| GET | `/api/students/by-grade-sections` | Students filtered by an array of grade/section pairs |
| GET | `/api/parents/by-ids` | Batch-fetch parent records by ID list |

**Marks:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/course/<courseId>/update-marks` | Bulk update all student marks for a course (mark20, mark30, mark50) |

**Lesson Plans:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lesson-plans/save-week` | Save one week's daily plan |
| POST | `/api/lesson-plans/save-annual` | Save annual plan rows |
| GET | `/api/lesson-plans/<teacherId>` | Fetch lesson plans for this teacher (by academicYear and courseId) |
| POST | `/api/lesson-plans/submit-daily` | Submit a daily lesson log entry (marks it as completed) |
| GET | `/api/lesson-plans/submissions` | Get all daily submission entries |
| POST | `/api/lesson-plans/migrate` | Migrate legacy lesson plan format to current schema |

**Posts:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/get_posts` | Fetch posts targeted at teachers (2-minute server-side cache) |
| POST | `/api/mark_teacher_post_seen` | Mark a post as seen by this teacher |
| POST | `/api/like_post` | Toggle like on a post |

**Registration:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register/teacher` | Register a new teacher — generates `SCHXXX_NNNN_YY` ID |
| POST | `/register/student` | Register a new student — generates `GES_NNNN_YY` ID |
| POST | `/register/parent` | Register a parent and link to existing students |
| GET | `/generate/student_id` | Atomically get the next available student ID |

**Storage & Notifications:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/<userId>/profile-image` | Upload teacher profile image to Cloud Storage |
| POST | `/api/storage/delete-by-url` | Delete a Cloud Storage object by its public URL |
| POST | `/api/fcm/send` | Send FCM push notification to a device token |
| GET | `/api/fcm/health` | FCM service health check |

**Firebase RTDB Proxy:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET / PUT / PATCH / POST / DELETE | `/api/rtdb-proxy/<node_path>` | Generic school-scoped proxy for reading and writing any Firebase node. Supports `orderBy`, `startAt`, `endAt`, `equalTo`, `limitToFirst`, `limitToLast` query params. All paths are automatically prefixed with the teacher's school scope. |

---

#### Firebase Database Nodes — Complete Map

**Reads:**
```
Platform1/Schools/{schoolCode}/
├── Users/{userId}                              # Teacher profile
├── Teachers/{teacherKey}                       # Teacher record and status
├── TeacherAssignments/                         # Which courses this teacher is assigned to
├── Courses/{courseId}                          # Course details (subject, grade, section)
├── GradeManagement/grades/                     # Grade and section structure
├── Students/ (by grade/section)               # Students in assigned courses
├── ClassMarks/{courseId}/{studentId}           # Student marks
├── Attendance/{courseId}/{date}               # Attendance records
├── Chats/{chatKey}/messages/                  # Chat message history
├── Chat_Summaries/{userId}/                   # Conversation list with unread counts
├── Posts/                                     # Admin announcements (filtered by targetRole)
├── TeacherPosts/                              # Teacher-specific posts
├── StudentNotes/{studentId}                   # Personal notes about students
├── LessonPlans/{teacherId}/{academicYear}/    # All lesson plan data
├── LessonPlanSubmissions/                     # Daily submission log
├── AcademicYears/                             # Current and past academic years
├── Curriculum/{gradeKey}/{subject}            # Curriculum chapters and content
├── Exams/{courseId}                           # Exam definitions and questions
├── SchoolExams/{courseId}                     # School-level exam config
├── Parents/{parentId}                         # Parent profiles
├── Schedules/{courseId}                       # Class timetable
└── CalendarEvents/                            # School calendar events
```

**Writes:**
```
├── Attendance/{courseId}/{date}               # Save attendance records
├── ClassMarks/{courseId}/{studentId}          # Save student marks
├── LessonPlans/{teacherId}/{academicYear}/    # Save annual + weekly plans
├── LessonPlanSubmissions/                     # Submit daily lesson log
├── Chats/{chatKey}/messages/{messageId}       # Send a chat message
├── Chat_Summaries/{userId}/{chatKey}          # Update conversation summary
├── TeacherPosts/{postId}                      # Mark post as seen
├── Posts/{postId}/likes                       # Like / unlike a post
├── StudentNotes/{studentId}                   # Add / edit / delete student notes
├── Users/{userId}                             # Update profile image
├── Teachers/{teacherKey}                      # Update profile image
├── CalendarEvents/                            # Create/edit events (if authorized)
└── SchoolExams/{courseId}                     # Save school exam configurations
```

---

#### State Management & Caching

| Data | Cache Layer | TTL |
|------|------------|-----|
| Teacher course context | React Query | 10 minutes |
| Teacher record | React Query | 10 minutes |
| Student roster | React Query | 60 minutes |
| Parent lookup | React Query | 5 minutes |
| Posts feed | Server-side Flask dict | 2 minutes |
| Chat summaries | Cleared on new message | — |
| RTDB node reads | `rtdbCache.js` in-memory + localStorage | 5–30 minutes by node type |

**Auto-save debounce timing (all three features):**
- Lesson plans: 900ms
- Attendance: 900ms
- Marks: 900ms

---

#### Key Custom Hooks

| Hook | Purpose |
|------|---------|
| `useTeacherSession()` | Read the logged-in teacher from localStorage and resolve their school code |
| `useLessonPlanData()` | Full lesson plan state — weeks, daily logs, dirty tracking, auto-save, migration from old format |
| `useChatMessages()` | Load and sync chat messages for one conversation, with pagination |
| `useContacts()` | Load the teacher's full contact list (students, parents, other teachers) |
| `useQuickChat()` | Inline chat with a single student without navigating away |
| `useStudents()` | Load students for the teacher's grade/section assignments with caching |
| `useStudentAttendance()` | Load a student's attendance history with date range filtering |
| `useStudentPerformance()` | Load a student's marks and grade breakdown |
| `usePaginatedProxy()` | Paginate results from the RTDB proxy endpoint |
| `usePresence()` | Track and display user online/offline status |
| `useDarkMode()` | Application-wide theme toggling |

---

### 6. Gojo-Company-Web — Company Analytics

**Purpose:** Company/organization-level analytics dashboard providing high-level visibility into school performance, student progress, and exam results across multiple schools.

**Path:** [Gojo-Company-Web/](Gojo-Company-Web/)

**Tech Stack:**
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+, Flask, Firebase Admin SDK, pypdf, gunicorn |
| Frontend | React 18, Vite |
| Deployment | Render (render.yaml configured) |
| Database | Firebase Realtime Database |

**Key Features:**
- Multi-school data aggregation
- PDF report generation
- Role-based access control
- Department and position management

**Key Pages:**

| Page | Description |
|------|-------------|
| `SchoolOverview.jsx` | School-level performance metrics |
| `StudentProgressPage.jsx` | Individual and cohort progress tracking |
| `StudentResultsPage.jsx` | Exam results viewer |
| `ExamPage.jsx` | Exam analytics across schools |
| `Books.jsx` | Educational resources library |

**Backend Entry:** [Gojo-Company-Web/backend/gojo_app.py](Gojo-Company-Web/backend/gojo_app.py)

**Deployment Config:** [Gojo-Company-Web/render.yaml](Gojo-Company-Web/render.yaml) — [Gojo-Company-Web/backend/RENDER_DEPLOY.md](Gojo-Company-Web/backend/RENDER_DEPLOY.md)

---

## Technology Stack

### Global Stack Summary

| Category | Technology | Version |
|----------|-----------|---------|
| Frontend framework | React | 18.x |
| Frontend build tool | Vite | Latest |
| Backend framework | Python Flask | 3.8+ |
| CORS | Flask-CORS | Latest |
| Database | Firebase Realtime Database | Latest |
| File storage | Firebase Storage | Latest |
| Authentication | Firebase Auth / Session-based | Latest |
| Firebase Admin SDK | firebase-admin (Python) | Latest |
| Firebase Client SDK | firebase (JS) | 12.x |
| HTTP client | Axios | 1.5+ |
| Image processing | Pillow (Python) | Latest |
| Virtualized lists | react-window | 1.8.x |
| Data fetching/cache | TanStack Query (React Query) | v5 |
| PDF generation | jsPDF + jspdf-autotable | Latest |
| Excel I/O | xlsx | 0.18.x |
| Production server | gunicorn | Latest |
| Deployment (Company) | Render | - |

---

## Firebase Database Schema

All data lives under a single Firebase Realtime Database project, organized by platform and school:

```
Platform1/
└── Schools/
    └── {schoolCode}/
        ├── Users/
        │   └── {userId}/
        │       ├── username
        │       ├── email
        │       ├── role          # "teacher" | "hrStaff" | "finance" | "admin"
        │       ├── hrId          # (HR staff only)
        │       ├── teacherId     # (Teachers only)
        │       └── schoolAdminId # (Admins only)
        │
        ├── Students/
        │   └── {studentId}/
        │       ├── name
        │       ├── grade
        │       ├── section
        │       ├── userId
        │       └── contactInfo/
        │
        ├── Teachers/
        │   └── {teacherId}/
        │       ├── name
        │       ├── email
        │       ├── userId
        │       └── subjects[]
        │
        ├── Parents/
        │   └── {parentId}/
        │       ├── name
        │       ├── userId
        │       └── studentIds[]
        │
        ├── Finance/
        │   └── {recordId}/
        │       ├── type          # "fee" | "salary" | "payment"
        │       ├── amount
        │       ├── date
        │       └── userId
        │
        ├── Courses/
        │   └── {courseId}/
        │       ├── name
        │       ├── grade
        │       ├── section
        │       └── teacherId
        │
        ├── ClassMarks/
        │   └── {studentId}/
        │       └── {courseId}/
        │           └── {examType}: score
        │
        ├── Attendance/
        │   └── {date}/
        │       └── {studentId}: present|absent
        │
        ├── Chat_Summaries/
        │   └── {chatId}/
        │       ├── lastMessage
        │       ├── lastTimestamp
        │       └── unreadCount
        │
        └── Posts/
            └── {postId}/
                ├── content
                ├── authorId
                ├── timestamp
                ├── mediaUrl
                └── previewUrl
```

### Firebase Indexes (Required)

The following indexes must be configured in `firebase.json` for query performance:

```json
{
  "rules": {
    "Platform1": {
      "Schools": {
        "$schoolCode": {
          "Students": {
            ".indexOn": ["userId", "grade", "section", "name"]
          },
          "Teachers": {
            ".indexOn": ["userId", "email"]
          },
          "Parents": {
            ".indexOn": ["userId"]
          },
          "Users": {
            ".indexOn": ["userId", "username", "email", "role"]
          }
        }
      }
    }
  }
}
```

---

## Environment Configuration

Each sub-application requires a `.env` file. Below are the required variables per app.

### HR Web (Backend)

```env
# Gojo-Hr-Web/backend/.env
SCHOOL_CODE=your_school_code
SECRET_KEY=your_flask_secret_key
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
```

### HR Web (Frontend — Development)

```env
# Gojo-Hr-Web/frontend/.env.development
VITE_API_BASE_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### HR Web (Frontend — Production)

```env
# Gojo-Hr-Web/frontend/.env.production
VITE_API_BASE_URL=https://your-production-api.com
# (same Firebase keys as development)
```

> All other sub-apps follow the same pattern. See each app's `ENV_SETUP.md` for the full variable list.

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.8+
- **pip** (Python package manager)
- **Firebase project** with Realtime Database and Storage enabled
- **Firebase service account key** (JSON file)

### Running a Sub-Application (Example: HR Web)

**1. Clone the repository**

```bash
git clone <repository-url>
cd Gojo-Study-Web
```

**2. Set up the backend**

```bash
cd Gojo-Hr-Web/backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Firebase credentials and school code
python hr_app.py
```

The backend starts on `http://localhost:5000` by default.

**3. Set up the frontend**

```bash
cd Gojo-Hr-Web/frontend
npm install
cp .env.development.example .env.development
# Edit .env.development with your Firebase config and API URL
npm run dev
```

The frontend starts on `http://localhost:5173` by default.

### Running Other Sub-Applications

Each app follows the same pattern:

| Sub-App | Backend Entry | Frontend Directory |
|---------|--------------|-------------------|
| Admin | *(Firebase direct)* | `Gojo-Admin-Web/frontend/school-admin/` |
| Finance | `finance_app.py` | `Gojo-Finance-Web/frontend/` |
| HR | `backend/hr_app.py` | `Gojo-Hr-Web/frontend/` |
| Register | `register_app.py` | `Gojo-Register-Web/frontend/school-register/` |
| Teacher | `app.py` | `Gojo-Teacher-Web/frontend/teacher/` |
| Company | `backend/gojo_app.py` | `Gojo-Company-Web/frontend/` |

---

## API Reference

All backends expose a Flask REST API. Common endpoints shared across apps:

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate user, returns session cookie |
| POST | `/api/logout` | Invalidate session |
| GET | `/api/health` | Health check / liveness probe |

### HR Web — Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees (paginated) |
| GET | `/api/employees/<id>` | Get employee by ID |
| POST | `/api/employees` | Create new employee |
| PUT | `/api/employees/<id>` | Update employee |
| POST | `/api/upload/profile` | Upload employee profile image |

### HR Web — Posts Feed

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | Paginated activity feed |
| POST | `/api/posts` | Create new post |
| POST | `/api/upload/post-media` | Upload post media |

### HR Web — Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | Get attendance records |
| POST | `/api/attendance` | Record attendance |

### Teacher Web

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teacher_login` | Teacher authentication |
| GET | `/api/lesson-plans` | Get lesson plans |
| POST | `/api/lesson-plans` | Create lesson plan |
| GET | `/api/grades` | Get student grades |
| POST | `/api/grades` | Submit grades |

### Register Web

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new student |
| POST | `/api/upload/document` | Upload student document |
| GET | `/api/registrations` | List registrations |

### Finance Web

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance` | Get finance records |
| POST | `/api/finance` | Create finance entry |
| GET | `/api/schools` | List schools (with 30-min cache) |

### Company Web

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schools` | Multi-school overview data |
| GET | `/api/students/progress` | Student progress aggregation |
| GET | `/api/exams` | Exam results across schools |
| GET | `/api/reports` | Generate PDF report |

---

## Deployment

### Company Web — Render

The Company web backend is configured for deployment on [Render](https://render.com) via [Gojo-Company-Web/render.yaml](Gojo-Company-Web/render.yaml).

```yaml
# render.yaml (summary)
services:
  - type: web
    name: gojo-company-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn gojo_app:app
```

See [Gojo-Company-Web/backend/RENDER_DEPLOY.md](Gojo-Company-Web/backend/RENDER_DEPLOY.md) for full deployment instructions.

### Other Sub-Apps

All other Flask backends can be deployed to any Python-compatible host (Railway, Fly.io, AWS, etc.) using `gunicorn`:

```bash
gunicorn hr_app:app --bind 0.0.0.0:$PORT
```

All React frontends can be built and deployed as static files:

```bash
npm run build
# Deploy the dist/ directory to Netlify, Vercel, Firebase Hosting, etc.
```

---

## Performance & Optimization

### Current Status

> See [CRITICAL_FIXES_REQUIRED.md](CRITICAL_FIXES_REQUIRED.md) for the full priority list.

| Issue | Impact | Status |
|-------|--------|--------|
| Students page loads 5,000+ rows without pagination | Browser crashes, 5–10s load time | Pending |
| No React-Window virtualization on large lists | High memory / slow scroll | Pending (done in Teacher-Web) |
| No Firebase database indexes | Slow queries on large collections | Pending |
| Polling for notifications every 60s | ~8.4M extra reads/month | Pending |
| Profile images re-downloaded on every request | High bandwidth cost | Fixed in HR-Web |
| No React Query / client caching | Redundant API calls | Done in Teacher-Web |

### Implemented Optimizations (HR-Web — Reference Implementation)

- **Server-side node cache** — 30-minute in-process TTL cache reduces Firebase reads
- **Chat summary architecture** — stores `lastMessage` + `unreadCount` at the summary node; avoids reading full chat history on load
- **Immutable cache headers** — new profile image uploads use `Cache-Control: public, max-age=31536000, immutable`
- **Post feed pagination** — cursor-based, loads 20 posts per page
- **Post preview images** — server-generated thumbnails so clients never download full-resolution media on list views

### Target Metrics (After Full Optimization)

| Metric | Current | Target |
|--------|---------|--------|
| Dashboard load time | 5–10 s | < 1 s |
| Daily Firebase reads | ~2.4 M | ~800 K |
| Monthly Firebase cost | ~$912 | ~$220 |

### Optimization Resources

| Document | Purpose |
|----------|---------|
| [CRITICAL_FIXES_REQUIRED.md](CRITICAL_FIXES_REQUIRED.md) | Priority issues and risk assessment |
| [CODE_OPTIMIZATION_GUIDE.md](CODE_OPTIMIZATION_GUIDE.md) | Line-level implementation guide |
| [ULTRA_OPTIMIZATION_ROADMAP.md](ULTRA_OPTIMIZATION_ROADMAP.md) | Multi-phase optimization roadmap |
| [FIREBASE_STRESS_TEST_REPORT.md](FIREBASE_STRESS_TEST_REPORT.md) | Load testing results and bottleneck analysis |
| [OPTIMIZATION_COST_COMPARISON.md](OPTIMIZATION_COST_COMPARISON.md) | Before/after cost projections |
| [TEAM_COORDINATION_GUIDE.md](TEAM_COORDINATION_GUIDE.md) | Team task allocation and timeline |

---

## Development Guidelines

### Project Conventions

- All frontends use **React 18 + Vite** (JSX, not TypeScript)
- All backends use **Python Flask** with **firebase-admin** SDK
- Firebase credentials are **never committed** — use `.env` files and a gitignored `serviceAccountKey.json`
- Each sub-app has its own `frontend/.env.development` and `frontend/.env.production`

### Git Workflow

The project uses a single `main` branch. Feature work should be done in topic branches and merged via pull request.

```bash
git checkout -b feature/your-feature-name
# ... make changes ...
git push origin feature/your-feature-name
# Open a PR to main
```

### Adding a New Sub-Application

1. Create a new directory: `Gojo-<Name>-Web/`
2. Scaffold Flask backend with `firebase_config.py`, `requirements.txt`, `.env.example`
3. Scaffold frontend with `npm create vite@latest`
4. Follow the HR-Web pattern as the reference implementation
5. Add a `README.md` and `ENV_SETUP.md` inside the new directory

### Code Quality

- Run `npm run lint` before committing frontend code
- Keep Firebase reads minimal — use server-side caching where possible
- Implement pagination on any list endpoint that can return > 100 items
- Use React Query for client-side data fetching in new frontend code

### Security Notes

- Never expose the Firebase service account key (`serviceAccountKey.json`) in version control
- Backend APIs use session-based authentication — always validate the session before reading/writing Firebase data
- Firebase Storage rules should restrict read/write to authenticated users only
- Use HTTPS in production for all API and Firebase traffic

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This project is proprietary. All rights reserved.
