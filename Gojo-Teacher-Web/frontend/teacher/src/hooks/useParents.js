import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTeacherCourseContext } from "../api/teacherApi";
import { getRtdbRoot, RTDB_BASE_RAW } from "../api/rtdbScope";
import { usePaginatedProxy } from "./usePaginatedProxy";
import { resolveProfileImage } from "../utils/profileImage";
import {
  extractAllowedGradeSectionsFromCourseContext,
  loadParentRecordsByIds,
  loadStudentsByGradeSections,
  loadUserRecordsByIds,
  normalizeIdentifier,
  resolveTeacherSchoolCode,
} from "../utils/teacherData";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_COURSE_CONTEXT = {
  success: false,
  teacherKey: "",
  teacherRecord: null,
  courses: [],
  courseIds: [],
  assignmentsByCourseId: {},
};

const DEFAULT_PROFILE_IMAGE = "/default-profile.png";

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const getInitials = (name) => {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "U";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
};

const createPlaceholderAvatar = (name) => {
  const initials = getInitials(name);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#2563eb'/><stop offset='100%' stop-color='#0ea5e9'/></linearGradient></defs><rect width='160' height='160' rx='80' fill='url(#g)'/><text x='50%' y='53%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Segoe UI, Arial, sans-serif' font-size='56' font-weight='700'>${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const sanitizeProfileImage = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_PROFILE_IMAGE;
  const lower = raw.toLowerCase();
  if (lower.startsWith("file://") || lower.startsWith("content://")) return DEFAULT_PROFILE_IMAGE;
  return raw;
};

export const resolveAvatarSrc = (rawValue, name) => {
  const sanitized = sanitizeProfileImage(rawValue);
  if (!sanitized || sanitized === DEFAULT_PROFILE_IMAGE) return createPlaceholderAvatar(name);
  return sanitized;
};

// ─── collectStudentParentLinks ────────────────────────────────────────────────

export const collectStudentParentLinks = (student = {}) => {
  const rawStudent = student?.raw || student || {};
  const links = [];

  const pushLink = (candidate = {}, fallbackParentId = "") => {
    const parentId = normalizeIdentifier(candidate?.parentId || candidate?.id || fallbackParentId);
    const userId = normalizeIdentifier(candidate?.userId || candidate?.parentUserId);
    const name = String(candidate?.name || candidate?.parentName || "").trim();
    const phone = String(candidate?.phone || candidate?.parentPhone || candidate?.phoneNumber || "").trim();
    const relationship = String(candidate?.relationship || candidate?.relation || "").trim();
    const profileImage = resolveProfileImage(
      candidate?.profileImage,
      candidate?.profile,
      candidate?.parentProfileImage
    );
    if (!parentId && !userId && !name && !phone && !relationship && profileImage === DEFAULT_PROFILE_IMAGE) return;
    links.push({ parentId, userId, name, phone, relationship, profileImage });
  };

  pushLink({
    parentId: rawStudent?.parentId,
    userId: rawStudent?.parentUserId,
    name: rawStudent?.parentName,
    phone: rawStudent?.parentPhone,
    parentProfileImage: rawStudent?.parentProfileImage,
  });

  Object.entries(rawStudent?.parents || {}).forEach(([key, link]) => pushLink(link, key));

  const gp = rawStudent?.parentGuardianInformation?.parents;
  if (Array.isArray(gp)) gp.forEach((link) => pushLink(link));
  else if (gp && typeof gp === "object") Object.entries(gp).forEach(([key, link]) => pushLink(link, key));

  const deduped = [];
  const seen = new Set();
  links.forEach((link) => {
    const key = `${link.parentId}__${link.userId}__${link.name}__${link.relationship}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(link);
  });

  return deduped;
};

// ─── isActiveRecord ───────────────────────────────────────────────────────────

const isActiveRecord = (record = {}) => {
  const raw = record?.status ?? record?.isActive;
  if (typeof raw === "boolean") return raw;
  const normalized = String(raw || "active").toLowerCase();
  return normalized === "active" || normalized === "true" || normalized === "1";
};

// ─── useParents hook ──────────────────────────────────────────────────────────

export function useParents({ searchTerm }) {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState("");
  const [teacherCourseContext, setTeacherCourseContext] = useState(EMPTY_COURSE_CONTEXT);
  const [teacherCourseContextReady, setTeacherCourseContextReady] = useState(false);

  // Load teacher from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("teacher"));
    if (!stored) { navigate("/login"); return; }
    setTeacher(stored);
  }, [navigate]);

  // Resolve school code
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (!teacher?.schoolCode) { setResolvedSchoolCode(""); return; }
      const resolved = await resolveTeacherSchoolCode(teacher.schoolCode);
      if (!cancelled) setResolvedSchoolCode(resolved);
    };
    resolve();
    return () => { cancelled = true; };
  }, [teacher?.schoolCode]);

  // Sync resolved school code back to localStorage / state
  useEffect(() => {
    if (!resolvedSchoolCode) return;
    const current = JSON.parse(localStorage.getItem("teacher") || "{}");
    if (String(current?.schoolCode || "") === resolvedSchoolCode) return;
    const next = { ...current, schoolCode: resolvedSchoolCode };
    localStorage.setItem("teacher", JSON.stringify(next));
    setTeacher(next);
  }, [resolvedSchoolCode]);

  const RTDB_BASE = useMemo(() => {
    if (resolvedSchoolCode) return `${RTDB_BASE_RAW}/Platform1/Schools/${resolvedSchoolCode}`;
    return getRtdbRoot();
  }, [resolvedSchoolCode]);

  // Load teacher course context
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!teacher || !RTDB_BASE) {
        setTeacherCourseContext(EMPTY_COURSE_CONTEXT);
        setTeacherCourseContextReady(false);
        return;
      }
      setTeacherCourseContextReady(false);
      try {
        const ctx = await getTeacherCourseContext({ teacher, rtdbBase: RTDB_BASE });
        if (!cancelled) setTeacherCourseContext(ctx || EMPTY_COURSE_CONTEXT);
      } catch {
        if (!cancelled) setTeacherCourseContext(EMPTY_COURSE_CONTEXT);
      } finally {
        if (!cancelled) setTeacherCourseContextReady(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [teacher, RTDB_BASE]);

  // ─── Data fetcher ──────────────────────────────────────────────────────────

  const fetchParentsData = useCallback(async () => {
    if (!teacher || !RTDB_BASE || !teacherCourseContextReady) return [];

    const schoolCode = normalizeIdentifier(resolvedSchoolCode || teacher?.schoolCode);
    const allowedGradeSections = extractAllowedGradeSectionsFromCourseContext(teacherCourseContext);
    if (!allowedGradeSections.size) return [];

    const visibleStudents = await loadStudentsByGradeSections({
      rtdbBase: RTDB_BASE,
      schoolCode,
      allowedGradeSections,
    });
    if (!visibleStudents.length) return [];

    const parentLinksByStudent = visibleStudents.map((s) => ({
      studentRow: s,
      links: collectStudentParentLinks(s),
    }));

    const parentIdentifiers = [
      ...new Set(
        parentLinksByStudent
          .flatMap(({ links }) => links)
          .flatMap((l) => [l?.parentId, l?.userId])
          .map(normalizeIdentifier)
          .filter(Boolean)
      ),
    ];

    const parentRecordsByIdentifier = await loadParentRecordsByIds({
      rtdbBase: RTDB_BASE,
      schoolCode,
      parentIds: parentIdentifiers,
    });

    const parentRecords = [
      ...new Map(
        Object.values(parentRecordsByIdentifier || {})
          .filter(Boolean)
          .map((r) => [`${normalizeIdentifier(r?.parentId)}__${normalizeIdentifier(r?.userId)}`, r])
      ).values(),
    ];

    const parentUserIds = [
      ...new Set(
        [
          ...parentLinksByStudent.flatMap(({ links }) => links.map((l) => l?.userId)),
          ...parentRecords.map((r) => r?.userId),
        ]
          .map(normalizeIdentifier)
          .filter(Boolean)
      ),
    ];

    const parentUsersById = await loadUserRecordsByIds({
      rtdbBase: RTDB_BASE,
      schoolCode,
      userIds: parentUserIds,
    });

    const findParentRecord = (link = {}) => {
      const linkRefs = [link?.parentId, link?.userId].map(normalizeIdentifier).filter(Boolean);
      if (!linkRefs.length) return null;
      return (
        parentRecords.find((r) => {
          const refs = [r?.parentId, r?.userId].map(normalizeIdentifier).filter(Boolean);
          return linkRefs.some((lr) => refs.includes(lr));
        }) || null
      );
    };

    const parentsByKey = new Map();

    parentLinksByStudent.forEach(({ studentRow, links }) => {
      const uniqueLinks = [
        ...new Map(
          (links || [])
            .filter((l) => normalizeIdentifier(l?.parentId || l?.userId))
            .map((l) => [
              `${normalizeIdentifier(l?.parentId || l?.userId)}__${String(l?.relationship || "")}`,
              l,
            ])
        ).values(),
      ];

      uniqueLinks.forEach((link) => {
        const parentRecord = findParentRecord(link);
        const parentUser =
          parentUsersById[normalizeIdentifier(parentRecord?.userId || link?.userId)] || null;
        const parentUserId = normalizeIdentifier(
          parentUser?.userId || parentRecord?.userId || link?.userId
        );
        const parentKey = normalizeIdentifier(
          parentRecord?.parentId || link?.parentId || parentUserId
        );
        if (!parentKey || !parentUserId) return;

        const parentName =
          parentUser?.name || parentRecord?.name || String(link?.name || "").trim() || "Parent";

        const existing = parentsByKey.get(parentKey) || {
          id: parentKey,
          userId: parentUserId,
          name: parentName,
          email: parentUser?.email || parentRecord?.email || "N/A",
          phone: parentUser?.phone || parentRecord?.phone || String(link?.phone || "").trim(),
          profileImage: resolveAvatarSrc(
            resolveProfileImage(
              parentUser?.profileImage,
              parentUser?.profile,
              parentUser?.avatar,
              parentRecord?.profileImage,
              parentRecord?.profile,
              link?.profileImage,
              DEFAULT_PROFILE_IMAGE
            ),
            parentName
          ),
          children: [],
          relationships: [],
          age: parentRecord?.age || parentUser?.age || null,
          city:
            parentRecord?.city ||
            parentUser?.city ||
            parentRecord?.address?.city ||
            null,
          citizenship:
            parentRecord?.citizenship ||
            parentUser?.citizenship ||
            parentRecord?.nationality ||
            null,
          status: parentRecord?.status || "Active",
          isActive:
            typeof parentUser?.isActive === "boolean"
              ? parentUser.isActive
              : isActiveRecord(parentRecord || parentUser || {}),
          createdAt: parentRecord?.createdAt || null,
          parentId: parentRecord?.parentId || parentKey,
          username:
            parentUser?.username ||
            parentRecord?.username ||
            parentRecord?.parentId ||
            parentKey,
          role: parentUser?.role || parentRecord?.role || "parent",
          schoolCode:
            parentRecord?.schoolCode || parentUser?.schoolCode || schoolCode || "",
          occupation: parentRecord?.occupation || parentUser?.occupation || "",
          nationalIdNumber:
            parentRecord?.nationalIdNumber || parentUser?.nationalIdNumber || "",
          nationalIdImage:
            parentRecord?.nationalIdImage || parentUser?.nationalIdImage || "",
          address: parentRecord?.address || parentUser?.address || null,
        };

        const studentName = studentRow?.name || "No Name";
        const nextChild = {
          studentId: studentRow?.studentId,
          name: studentName,
          grade: studentRow?.grade || "",
          section: studentRow?.section || "",
          profileImage: resolveAvatarSrc(studentRow?.profileImage, studentName),
          userId: studentRow?.userId,
          relationship: String(link?.relationship || "").trim() || "—",
          age: studentRow?.raw?.age || studentRow?.user?.age || null,
          city:
            studentRow?.raw?.city ||
            studentRow?.user?.city ||
            studentRow?.raw?.address?.city ||
            null,
          citizenship:
            studentRow?.raw?.citizenship ||
            studentRow?.user?.citizenship ||
            studentRow?.raw?.nationality ||
            null,
          address: studentRow?.raw?.address || studentRow?.user?.address || null,
          status: studentRow?.raw?.status || "Active",
        };

        const existingChildIdx = existing.children.findIndex(
          (c) => String(c?.studentId || "") === String(nextChild.studentId || "")
        );
        if (existingChildIdx === -1) {
          existing.children.push(nextChild);
        } else {
          existing.children[existingChildIdx] = {
            ...existing.children[existingChildIdx],
            ...nextChild,
          };
        }

        existing.relationships = Array.from(
          new Set([...(existing.relationships || []), nextChild.relationship].filter(Boolean))
        );
        parentsByKey.set(parentKey, existing);
      });
    });

    return [...parentsByKey.values()]
      .filter(
        (p) =>
          p?.userId &&
          p?.isActive !== false &&
          Array.isArray(p.children) &&
          p.children.length > 0
      )
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [teacher, RTDB_BASE, resolvedSchoolCode, teacherCourseContext, teacherCourseContextReady]);

  // ─── Filter ────────────────────────────────────────────────────────────────

  const normalizedSearch = (searchTerm || "").trim().toLowerCase();
  const parentMatchesFilters = useCallback(
    (parent) => {
      if (!normalizedSearch) return true;
      const childText = (parent.children || [])
        .map((c) => `${c.name} ${c.studentId} ${c.grade} ${c.section}`)
        .join(" ");
      const haystack = `${parent.name || ""} ${parent.userId || ""} ${parent.email || ""} ${parent.phone || ""} ${childText}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    },
    [normalizedSearch]
  );

  // ─── Paginated proxy ───────────────────────────────────────────────────────

  const {
    items: paginatedParents,
    allItems: allParents,
    filteredItems: filteredParents,
    isLoading: isLoadingParents,
    isError: isErrorParents,
    error: parentsQueryError,
    goNext,
    hasMore,
    isLoadingNext,
  } = usePaginatedProxy(
    fetchParentsData,
    [
      "parents",
      {
        teacherUserId: teacher?.userId || null,
        schoolCode: normalizeIdentifier(resolvedSchoolCode || teacher?.schoolCode),
        rtdbBase: RTDB_BASE || null,
        courseIds: [...(teacherCourseContext?.courseIds || [])].sort(),
      },
    ],
    {
      enabled: !!teacher?.userId && !!RTDB_BASE && teacherCourseContextReady,
      filterFn: parentMatchesFilters,
      resetKeys: [searchTerm],
      infiniteScroll: true,
    }
  );

  return {
    teacher,
    teacherId: teacher?.userId || "",
    RTDB_BASE,
    resolvedSchoolCode,
    allParents,
    paginatedParents,
    filteredParents,
    isLoadingParents,
    isErrorParents,
    parentsQueryError,
    goNext,
    hasMore,
    isLoadingNext,
    setTeacher,
  };
}
