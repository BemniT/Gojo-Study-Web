import { useEffect, useRef, useState } from "react";
import { getTeacherCourseContext } from "../api/teacherApi";
import { fetchCachedJson } from "../utils/rtdbCache";
import {
  loadStudentsByGradeSections,
  loadParentRecordsByIds,
  loadUserRecordsByIds,
  readSessionResource,
  writeSessionResource,
  extractAllowedGradeSectionsFromCourseContext,
  normalizeIdentifier,
} from "../utils/teacherData";
import {
  buildContactsSessionKey,
  collectStudentParentLinks,
  pickFirstNonEmpty,
  resolveAvatarSrc,
  isActiveRecord,
  normalizeTab,
} from "../utils/chatHelpers";
import { isAcademicAdmin, isManagementEligible } from "../domain/adminClassifiers";

const CONTACTS_SESSION_TTL_MS = 5 * 60 * 1000;
const CONTACTS_FETCH_COOLDOWN_MS = 20 * 1000;

export function useContacts({ teacherUserId, resolvedSchoolCode, teacherSchoolCode, rtdbBase, selectedTab, teacher }) {
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState({ student: false, parent: false, admin: false });
  const adminRecordCacheRef = useRef({
    school_admin: new Map(),
    management: new Map(),
    hr: new Map(),
    registerer: new Map(),
  });
  const contactsFetchInFlightRef = useRef({ student: false, parent: false, admin: false });
  const lastContactsFetchAtRef = useRef({ student: 0, parent: 0, admin: 0 });

  useEffect(() => {
    adminRecordCacheRef.current = {
      school_admin: new Map(),
      management: new Map(),
      hr: new Map(),
      registerer: new Map(),
    };
    contactsFetchInFlightRef.current = { student: false, parent: false, admin: false };
    lastContactsFetchAtRef.current = { student: 0, parent: 0, admin: 0 };
  }, [rtdbBase, resolvedSchoolCode, teacherSchoolCode]);

  const applyContactsForTab = (tab, contacts = []) => {
    const normalizedTab = normalizeTab(tab) || "student";
    const nextContacts = Array.isArray(contacts) ? contacts : [];

    if (normalizedTab === "student") {
      setStudents(nextContacts);
    } else if (normalizedTab === "parent") {
      setParents(nextContacts);
    } else {
      setAdmins(nextContacts);
    }

    writeSessionResource(buildContactsSessionKey(resolvedSchoolCode || teacherSchoolCode, normalizedTab), nextContacts);
    setLoadedTabs((previousState) => ({
      ...previousState,
      [normalizedTab]: true,
    }));
  };

  const loadStudentContacts = async (courseContext) => {
    const allowedGradeSections = extractAllowedGradeSectionsFromCourseContext(courseContext);
    if (!allowedGradeSections.size) {
      return [];
    }

    const studentRows = await loadStudentsByGradeSections({
      rtdbBase,
      schoolCode: resolvedSchoolCode || teacherSchoolCode,
      allowedGradeSections,
    });

    return studentRows.map((studentRow) => ({
      studentKey: studentRow.studentKey,
      userId: studentRow.userId,
      studentId: studentRow.studentId,
      name: studentRow.name,
      profileImage: studentRow.profileImage,
      grade: studentRow.grade,
      section: studentRow.section,
      raw: studentRow.raw,
      user: studentRow.user || null,
      type: "student",
    }));
  };

  const loadParentContacts = async (courseContext) => {
    const studentContacts = students.length ? students : await loadStudentContacts(courseContext);
    if (!students.length && studentContacts.length) {
      writeSessionResource(
        buildContactsSessionKey(resolvedSchoolCode || teacherSchoolCode, "student"),
        studentContacts
      );
    }

    const parentIdentifiers = [...new Set(
      studentContacts
        .flatMap((studentContact) => collectStudentParentLinks(studentContact))
        .flatMap((link) => [link?.parentId, link?.userId])
        .map(normalizeIdentifier)
        .filter(Boolean)
    )];

    if (!parentIdentifiers.length) {
      return [];
    }

    const parentRecordsById = await loadParentRecordsByIds({
      rtdbBase,
      schoolCode: resolvedSchoolCode || teacherSchoolCode,
      parentIds: parentIdentifiers,
    });
    const parentRecordList = Object.values(parentRecordsById || {});
    const parentUserIds = [...new Set(
      parentRecordList
        .map((parentRecord) => normalizeIdentifier(parentRecord?.userId))
        .filter(Boolean)
    )];
    const parentUsersById = await loadUserRecordsByIds({
      rtdbBase,
      schoolCode: resolvedSchoolCode || teacherSchoolCode,
      userIds: parentUserIds,
    });

    const contactsById = new Map();

    studentContacts.forEach((studentContact) => {
      collectStudentParentLinks(studentContact).forEach((link) => {
        const normalizedParentId = normalizeIdentifier(link?.parentId);
        const normalizedParentUserId = normalizeIdentifier(link?.userId);
        const parentRecord = parentRecordList.find((candidateRecord) => {
          const refs = [candidateRecord?.parentId, candidateRecord?.userId]
            .map(normalizeIdentifier)
            .filter(Boolean);
          return refs.includes(normalizedParentId) || refs.includes(normalizedParentUserId);
        }) || null;

        const parentUser = parentUsersById[normalizeIdentifier(parentRecord?.userId)] || null;
        const contactUserId = normalizeIdentifier(
          parentUser?.userId || parentRecord?.userId || normalizedParentUserId || normalizedParentId
        );
        if (!contactUserId) {
          return;
        }

        if (contactsById.has(contactUserId)) {
          return;
        }

        const displayName =
          parentUser?.name ||
          parentRecord?.name ||
          String(link?.name || "").trim() ||
          "Parent";

        contactsById.set(contactUserId, {
          userId: contactUserId,
          parentId: normalizeIdentifier(parentRecord?.parentId || normalizedParentId),
          name: displayName,
          profileImage: resolveAvatarSrc(
            parentUser?.profileImage ||
              parentUser?.profile ||
              parentUser?.avatar ||
              parentRecord?.profileImage ||
              parentRecord?.profile ||
              link?.profileImage,
            displayName
          ),
          type: "parent",
        });
      });
    });

    return [...contactsById.values()].sort((leftContact, rightContact) => leftContact.name.localeCompare(rightContact.name));
  };

  const loadAdminContacts = async () => {
    const [schoolAdminKeysNode, managementKeysNode, hrKeysNode, registererKeysNode] = await Promise.all([
      fetchCachedJson(`${rtdbBase}/School_Admins.json?shallow=true`, { ttlMs: CONTACTS_SESSION_TTL_MS, fallbackValue: {} }),
      fetchCachedJson(`${rtdbBase}/Management.json?shallow=true`, { ttlMs: CONTACTS_SESSION_TTL_MS, fallbackValue: {} }),
      fetchCachedJson(`${rtdbBase}/HR.json?shallow=true`, { ttlMs: CONTACTS_SESSION_TTL_MS, fallbackValue: {} }),
      fetchCachedJson(`${rtdbBase}/Registerers.json?shallow=true`, { ttlMs: CONTACTS_SESSION_TTL_MS, fallbackValue: {} }),
    ]);

    const fetchRecordsForSource = async (source, nodeName, keysNode) => {
      const cache = adminRecordCacheRef.current[source];
      const allKeys = Object.keys(keysNode || {});
      const missingKeys = allKeys.filter((recordKey) => !cache.has(recordKey));

      if (missingKeys.length) {
        await Promise.all(
          missingKeys.map(async (recordKey) => {
            const record = await fetchCachedJson(`${rtdbBase}/${nodeName}/${encodeURIComponent(recordKey)}.json`, {
              ttlMs: CONTACTS_SESSION_TTL_MS,
              fallbackValue: null,
            });
            cache.set(recordKey, record && typeof record === "object" ? record : null);
          })
        );
      }

      return allKeys
        .map((recordKey) => {
          const record = cache.get(recordKey);
          return record && typeof record === "object" ? { source, recordKey, record } : null;
        })
        .filter(Boolean);
    };

    const managementCandidates = [
      ...(await fetchRecordsForSource("school_admin", "School_Admins", schoolAdminKeysNode)),
      ...(await fetchRecordsForSource("management", "Management", managementKeysNode)),
      ...(await fetchRecordsForSource("hr", "HR", hrKeysNode)),
      ...(await fetchRecordsForSource("registerer", "Registerers", registererKeysNode)),
    ];

    const userIdentifiers = [...new Set(
      managementCandidates
        .flatMap(({ recordKey, record }) => [
          record?.userId,
          record?.userID,
          record?.uid,
          record?.account?.userId,
          record?.systemAccountInformation?.userId,
          recordKey,
          record?.adminId,
          record?.managementId,
          record?.hrId,
          record?.registererId,
        ])
        .map(normalizeIdentifier)
        .filter(Boolean)
    )];

    const usersById = await loadUserRecordsByIds({
      rtdbBase,
      schoolCode: resolvedSchoolCode || teacherSchoolCode,
      userIds: userIdentifiers,
    });

    const contactMap = new Map();
    managementCandidates.forEach(({ source, recordKey, record }) => {
      const userId = pickFirstNonEmpty(
        record?.userId,
        record?.userID,
        record?.uid,
        record?.account?.userId,
        record?.systemAccountInformation?.userId,
        usersById[recordKey]?.userId,
        usersById[record?.adminId || ""]?.userId,
        usersById[record?.managementId || ""]?.userId,
        usersById[record?.hrId || ""]?.userId,
        usersById[record?.registererId || ""]?.userId,
        recordKey
      );
      const user = usersById[userId] || usersById[recordKey] || {};
      const resolvedUserId = normalizeIdentifier(user?.userId || userId);
      if (!resolvedUserId) {
        return;
      }

      if (!isActiveRecord(record || user)) {
        return;
      }

      const eligible = source === "school_admin"
        ? isAcademicAdmin({ schoolAdmin: record, user }) || isManagementEligible({ source, record, user })
        : isManagementEligible({ source, record, user });
      if (!eligible) {
        return;
      }

      if (contactMap.has(resolvedUserId)) {
        return;
      }

      const name = user?.name || record?.name || record?.title || "Management";
      contactMap.set(resolvedUserId, {
        userId: resolvedUserId,
        name,
        profileImage: resolveAvatarSrc(
          user?.profileImage || user?.profile || user?.avatar || record?.profileImage || record?.profile,
          name
        ),
        title: record?.title || user?.title || user?.role || source.replace("_", " "),
        source,
        type: "admin",
      });
    });

    return [...contactMap.values()].sort((leftContact, rightContact) => leftContact.name.localeCompare(rightContact.name));
  };

  useEffect(() => {
    if (!teacherUserId || !(resolvedSchoolCode || teacherSchoolCode)) return;

    const normalizedTab = normalizeTab(selectedTab) || "student";
    const currentContacts = normalizedTab === "student" ? students : normalizedTab === "parent" ? parents : admins;
    const cachedContacts = readSessionResource(
      buildContactsSessionKey(resolvedSchoolCode || teacherSchoolCode, normalizedTab),
      { ttlMs: CONTACTS_SESSION_TTL_MS }
    );

    if (Array.isArray(cachedContacts) && !loadedTabs[normalizedTab]) {
      applyContactsForTab(normalizedTab, cachedContacts);
      return;
    }

    if (loadedTabs[normalizedTab] || currentContacts.length) {
      return;
    }

    if (contactsFetchInFlightRef.current[normalizedTab]) {
      return;
    }

    const now = Date.now();
    if (now - Number(lastContactsFetchAtRef.current[normalizedTab] || 0) < CONTACTS_FETCH_COOLDOWN_MS) {
      return;
    }

    contactsFetchInFlightRef.current[normalizedTab] = true;
    lastContactsFetchAtRef.current[normalizedTab] = now;

    let cancelled = false;

    const fetchUsers = async () => {
      try {
        setLoadingContacts(true);
        const courseContext = normalizedTab === "admin"
          ? null
          : await getTeacherCourseContext({ teacher, rtdbBase });

        let nextContacts = [];
        if (normalizedTab === "student") {
          nextContacts = await loadStudentContacts(courseContext);
        } else if (normalizedTab === "parent") {
          nextContacts = await loadParentContacts(courseContext);
        } else {
          nextContacts = await loadAdminContacts();
        }

        if (!cancelled) {
          applyContactsForTab(normalizedTab, nextContacts);
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        if (!cancelled) {
          applyContactsForTab(normalizedTab, []);
        }
      } finally {
        contactsFetchInFlightRef.current[normalizedTab] = false;
        if (!cancelled) {
          setLoadingContacts(false);
        }
      }
    };

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [
    teacherUserId,
    teacherSchoolCode,
    resolvedSchoolCode,
    rtdbBase,
    selectedTab,
    loadedTabs,
    admins,
    parents,
    students,
  ]);

  return { students, parents, admins, loadingContacts, loadedTabs };
}
