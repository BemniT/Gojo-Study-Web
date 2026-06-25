/**
 * Pure helpers for resolving parent ⇄ student relationships in the
 * Register-Web parents page. Lives outside any React hook so the
 * parent-detail loader and the parent-list loader can both consume
 * the same logic.
 */

export const findStudentMatchById = (studentsData, maybeStudentId) => {
  if (!maybeStudentId) return null;

  if (studentsData?.[maybeStudentId]) {
    return { key: maybeStudentId, record: studentsData[maybeStudentId] };
  }

  const matchedEntry = Object.entries(studentsData || {}).find(
    ([studentKey, studentRecord]) =>
      String(studentKey) === String(maybeStudentId) ||
      String(studentRecord?.studentId || studentRecord?.id || "") === String(maybeStudentId) ||
      String(
        studentRecord?.use || studentRecord?.userId || studentRecord?.user || ""
      ) === String(maybeStudentId)
  );

  if (!matchedEntry) return null;
  return { key: matchedEntry[0], record: matchedEntry[1] };
};

export const getResolvedParentChildLinks = ({
  parentRecord,
  parentRecordKey,
  parentUserId,
  studentsData,
}) => {
  const parentIds = new Set(
    [parentRecordKey, parentRecord?.parentId]
      .filter(Boolean)
      .map((value) => String(value))
  );
  const parentUserIds = new Set(
    [parentUserId, parentRecord?.userId].filter(Boolean).map((value) => String(value))
  );
  const childMap = new Map();

  const addChildLink = (rawLink, fallbackStudentId = null) => {
    const studentMatch = findStudentMatchById(
      studentsData,
      rawLink?.studentId || rawLink?.student_id || rawLink?.id || fallbackStudentId
    );
    if (!studentMatch?.record) return;

    const canonicalStudentId =
      studentMatch.record?.studentId || studentMatch.record?.id || studentMatch.key;
    if (!canonicalStudentId) return;

    const childKey = String(canonicalStudentId);
    const existing = childMap.get(childKey) || {};

    childMap.set(childKey, {
      studentId: childKey,
      relationship:
        rawLink?.relationship ||
        rawLink?.relation ||
        rawLink?.childRelationship ||
        existing.relationship ||
        null,
    });
  };

  Object.values(parentRecord?.children || {}).forEach((childLink) =>
    addChildLink(childLink)
  );

  Object.entries(studentsData || {}).forEach(([studentKey, studentRecord]) => {
    const studentParents = studentRecord?.parents || {};
    Object.entries(studentParents).forEach(([studentParentKey, studentParentLink]) => {
      const matchesParent =
        parentIds.has(String(studentParentKey)) ||
        parentIds.has(String(studentParentLink?.parentId)) ||
        parentUserIds.has(String(studentParentLink?.userId)) ||
        parentUserIds.has(String(studentParentLink?.user)) ||
        parentUserIds.has(String(studentParentLink?.userid));
      if (matchesParent) {
        addChildLink(studentParentLink, studentKey);
      }
    });
  });

  return Array.from(childMap.values());
};
