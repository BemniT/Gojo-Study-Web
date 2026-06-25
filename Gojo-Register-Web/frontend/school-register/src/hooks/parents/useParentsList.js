import { useEffect, useMemo, useState } from "react";
import {
  loadSchoolParentsNode,
  loadSchoolStudentsNode,
} from "../../utils/registerData";
import {
  findStudentMatchById,
  getResolvedParentChildLinks,
} from "../../utils/parentLinks";

const findParentRecordByUserId = (parentsData, canonicalUserId) => {
  if (!canonicalUserId) return null;
  return (
    parentsData?.[canonicalUserId] ||
    Object.entries(parentsData || {}).find(
      ([parentKey, p]) =>
        String(parentKey) === String(canonicalUserId) ||
        String(p?.userId) === String(canonicalUserId)
    )?.[1] ||
    null
  );
};

const studentDisplayName = (studentRecord) =>
  studentRecord?.name ||
  [studentRecord?.firstName, studentRecord?.middleName, studentRecord?.lastName]
    .filter(Boolean)
    .join(" ") ||
  studentRecord?.basicStudentInformation?.name ||
  null;

const resolveFirstChildPreview = (parentsData, studentsData, canonicalUserId) => {
  const parentRecord = findParentRecordByUserId(parentsData, canonicalUserId);
  const parentRecordEntry = Object.entries(parentsData || {}).find(
    ([parentKey, parentValue]) =>
      String(parentKey) === String(canonicalUserId) ||
      String(parentValue?.userId) === String(canonicalUserId)
  );
  const childLinks = getResolvedParentChildLinks({
    parentRecord,
    parentRecordKey: parentRecordEntry?.[0] || parentRecord?.parentId || canonicalUserId,
    parentUserId: canonicalUserId,
    studentsData,
  });
  if (!childLinks.length) {
    return { name: null, relationship: null, childCount: 0 };
  }

  const firstLink = childLinks[0] || {};
  const studentMatch = findStudentMatchById(studentsData, firstLink.studentId);
  const studentRecord = studentMatch?.record;
  if (!studentRecord) {
    return {
      name: null,
      relationship: firstLink.relationship || null,
      childCount: childLinks.length,
    };
  }
  return {
    name: studentDisplayName(studentRecord),
    relationship: firstLink.relationship || null,
    childCount: childLinks.length,
  };
};

const buildParentRow = (parentKey, parentRecord, parentsData, studentsData) => {
  const p = parentRecord || {};
  const canonicalUserId = p.userId || parentKey;
  const firstChild = resolveFirstChildPreview(parentsData, studentsData, canonicalUserId);
  return {
    userId: canonicalUserId,
    parentId: p.parentId || parentKey || "N/A",
    name: p.fullName || p.name || "No Name",
    email: p.email || "N/A",
    childName: firstChild?.name || "N/A",
    childRelationship: firstChild?.relationship || "N/A",
    childCount: firstChild?.childCount || 0,
    profileImage: p.profileImage || "/default-profile.png",
    phone: p.phone || p.phoneNumber || "N/A",
    age: p.age || null,
    city: p.city || (p.address && p.address.city) || null,
    citizenship: p.citizenship || null,
    job: p.job || null,
    address: p.address || null,
  };
};

const SEARCH_FIELDS = ["name", "email", "phone", "city", "job", "citizenship"];

/**
 * useParentsList
 *
 * Loads the school's Parents node + Students node once and builds a
 * flat parent list row including the first-child preview for the
 * left-side parent list. Avoids the 22 MB Users node download by
 * sourcing display fields from the Parents node directly.
 *
 * Exposes `parents`, `loadingParents`, plus a derived `filteredParents`
 * memo driven by the page's `searchTerm`.
 */
export default function useParentsList({ DB, searchTerm = "" }) {
  const [parents, setParents] = useState([]);
  const [loadingParents, setLoadingParents] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchParents = async () => {
      setLoadingParents(true);
      try {
        const [parentsData, studentsData] = await Promise.all([
          loadSchoolParentsNode({ rtdbBase: DB }),
          loadSchoolStudentsNode({ rtdbBase: DB }),
        ]);

        const parentList = Object.entries(parentsData || {}).map(
          ([parentKey, parentRecord]) =>
            buildParentRow(parentKey, parentRecord, parentsData, studentsData)
        );

        if (cancelled) return;
        setParents(parentList);
      } catch (err) {
        console.error("Error fetching parents:", err);
        if (cancelled) return;
        setParents([]);
      } finally {
        if (!cancelled) setLoadingParents(false);
      }
    };

    fetchParents();
    return () => {
      cancelled = true;
    };
  }, [DB]);

  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
  const filteredParents = useMemo(() => {
    if (!normalizedSearch) return parents;
    return (parents || []).filter((p) => {
      const hay = SEARCH_FIELDS.map((field) => p?.[field])
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(normalizedSearch);
    });
  }, [parents, normalizedSearch]);

  return {
    parents,
    setParents,
    loadingParents,
    filteredParents,
  };
}
