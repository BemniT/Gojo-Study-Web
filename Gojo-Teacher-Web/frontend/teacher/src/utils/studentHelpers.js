import { resolveProfileImage } from "./profileImage";

export const normalizeIdentifier = (value) => String(value || "").trim();

export const getChatId = (teacherUserId, otherUserId) => {
  const teacherId = String(teacherUserId || "").trim();
  const contactId = String(otherUserId || "").trim();
  return `${teacherId}_${contactId}`;
};

export const createQuickChatMessageId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const buildQuickChatMessageRows = (messagesNode = {}, teacherUserId = "") =>
  Object.entries(messagesNode || {})
    .map(([id, message]) => ({
      id,
      messageId: id,
      ...message,
      isTeacher: String(message?.senderId || "") === String(teacherUserId || ""),
    }))
    .sort(
      (leftMessage, rightMessage) =>
        Number(leftMessage?.timeStamp || 0) - Number(rightMessage?.timeStamp || 0)
    );

const normalizeGrade = (value) => String(value ?? "").trim();
const normalizeSection = (value) => String(value ?? "").trim().toUpperCase();

export const buildGradeSectionKey = (grade, section) => `${normalizeGrade(grade)}|${normalizeSection(section)}`;

export const normalizeTeacherRef = (value) => String(value || "").trim().replace(/^-+/, "").toUpperCase();

export const getStudentUserId = (student = {}) =>
  String(
    student?.userId ||
      student?.systemAccountInformation?.userId ||
      student?.account?.userId ||
      ""
  ).trim();

export const isActiveRecord = (record = {}) => {
  const raw = record?.status ?? record?.isActive;
  if (typeof raw === "boolean") return raw;
  const normalized = String(raw || "active").toLowerCase();
  return normalized === "active" || normalized === "true" || normalized === "1";
};

export const getWeekNumber = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return weekNo;
};

export const formatSubjectName = (courseId = "") => {
  if (!courseId) return "Unknown";
  const clean = String(courseId)
    .replace(/^course_/, "")
    .replace(/_[0-9A-Za-z]+$/, "")
    .replace(/_/g, " ")
    .trim();

  return clean
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
};

export const computeAge = (rawDob) => {
  if (!rawDob) return null;
  let d;
  if (typeof rawDob === "number") d = new Date(rawDob);
  else d = new Date(String(rawDob));
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};

export const buildStudentConversationsSessionKey = (schoolCode, teacherUserId) => {
  return `students_unread_conversations_${String(schoolCode || "global").toUpperCase()}_${String(teacherUserId || "").trim()}`;
};

export const findUserByUserId = (usersObj, userId) => {
  if (!usersObj || !userId) return null;
  const normalizedUserId = String(userId || "").trim();
  const directByKey = usersObj?.[normalizedUserId];
  if (directByKey) return directByKey;

  return (
    Object.entries(usersObj).find(([userKey, userValue]) => {
      return (
        String(userKey || "").trim() === normalizedUserId ||
        String(userValue?.userId || "").trim() === normalizedUserId
      );
    })?.[1] || null
  );
};

export const findUserByIdentifiers = (usersObj, ...identifiers) => {
  if (!usersObj) return null;

  const wanted = new Set(
    identifiers
      .flat()
      .map(normalizeIdentifier)
      .filter(Boolean)
  );

  if (!wanted.size) return null;

  for (const identifier of wanted) {
    if (usersObj?.[identifier]) return usersObj[identifier];
  }

  return (
    Object.entries(usersObj).find(([userKey, userValue]) => {
      const refs = [
        userKey,
        userValue?.userId,
        userValue?.parentId,
        userValue?.studentId,
        userValue?.teacherId,
        userValue?.adminId,
        userValue?.managementId,
        userValue?.hrId,
        userValue?.registererId,
        userValue?.employeeId,
        userValue?.username,
      ]
        .map(normalizeIdentifier)
        .filter(Boolean);

      return refs.some((ref) => wanted.has(ref));
    })?.[1] || null
  );
};

export const collectStudentParentLinks = (student = {}, userRec = null) => {
  const rawStudent = student?.raw || student || {};
  const links = [];

  const pushLink = (candidate = {}, fallbackParentId = "") => {
    const parentId = normalizeIdentifier(candidate?.parentId || candidate?.id || fallbackParentId);
    const userId = normalizeIdentifier(candidate?.userId || candidate?.parentUserId);
    const name = String(candidate?.name || candidate?.parentName || "").trim();
    const phone = String(candidate?.phone || candidate?.parentPhone || candidate?.phoneNumber || "").trim();
    const profileImage = resolveProfileImage(
      candidate?.profileImage,
      candidate?.profile,
      candidate?.parentProfileImage
    );

    if (!parentId && !userId && !name && !phone && profileImage === "/default-profile.png") {
      return;
    }

    links.push({
      parentId,
      userId,
      name,
      phone,
      profileImage,
    });
  };

  pushLink({
    parentId: rawStudent?.parentId,
    userId: rawStudent?.parentUserId,
    name: rawStudent?.parentName,
    phone: rawStudent?.parentPhone,
    parentProfileImage: rawStudent?.parentProfileImage,
  });

  pushLink({
    parentId: student?.parentId,
    userId: student?.parentUserId,
    name: student?.parentName,
    phone: student?.parentPhone,
    parentProfileImage: student?.parentProfileImage,
  });

  pushLink({
    parentId: userRec?.parentId,
    userId: userRec?.parentUserId,
  });

  Object.entries(rawStudent?.parents || {}).forEach(([parentKey, link]) => {
    pushLink(link, parentKey);
  });

  const guardianParents = rawStudent?.parentGuardianInformation?.parents;
  if (Array.isArray(guardianParents)) {
    guardianParents.forEach((link) => pushLink(link));
  } else if (guardianParents && typeof guardianParents === "object") {
    Object.entries(guardianParents).forEach(([parentKey, link]) => {
      pushLink(link, parentKey);
    });
  }

  const deduped = [];
  const seen = new Set();
  links.forEach((link) => {
    const key = `${link.parentId}__${link.userId}__${link.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(link);
  });

  return deduped;
};

export const resolveStudentParentInfo = ({ student, usersObj = {}, parentsObj = {} } = {}) => {
  if (!student) return null;

  const userRec = findUserByIdentifiers(usersObj, student?.userId) || null;
  const parentLinks = collectStudentParentLinks(student, userRec);

  const parentMatchesStudent = (parent = {}) => {
    const studentId = normalizeIdentifier(student?.studentId || student?.raw?.studentId);
    const studentUserId = normalizeIdentifier(student?.userId || student?.raw?.userId);
    const children = parent?.children || {};

    return Object.values(children).some((child) => {
      const childStudentId = normalizeIdentifier(child?.studentId);
      const childUserId = normalizeIdentifier(child?.userId);
      return (
        (studentId && childStudentId === studentId) ||
        (studentId && childUserId === studentId) ||
        (studentUserId && childUserId === studentUserId) ||
        (studentUserId && childStudentId === studentUserId)
      );
    });
  };

  let parentRec = null;
  let parentUserRec = null;
  let matchedLink = null;

  for (const link of parentLinks) {
    const parentId = normalizeIdentifier(link.parentId);
    const parentUserId = normalizeIdentifier(link.userId);

    if (parentId && parentsObj?.[parentId]) {
      parentRec = parentsObj[parentId];
    }

    if (!parentRec && (parentId || parentUserId)) {
      parentRec =
        Object.entries(parentsObj || {}).find(([parentKey, parentValue]) => {
          const refs = [parentKey, parentValue?.parentId, parentValue?.userId]
            .map(normalizeIdentifier)
            .filter(Boolean);
          return refs.some((ref) => ref === parentId || ref === parentUserId);
        })?.[1] || null;
    }

    parentUserRec = findUserByIdentifiers(
      usersObj,
      parentUserId,
      parentRec?.userId,
      parentId,
      parentRec?.parentId
    );

    if (parentRec || parentUserRec) {
      matchedLink = link;
      break;
    }
  }

  if (!parentRec) {
    const fallbackParentEntry =
      Object.entries(parentsObj || {}).find(([, parent]) => parentMatchesStudent(parent)) || null;

    if (fallbackParentEntry) {
      matchedLink = matchedLink || { parentId: fallbackParentEntry[0] };
      parentRec = fallbackParentEntry[1];
      parentUserRec = findUserByIdentifiers(
        usersObj,
        parentRec?.userId,
        fallbackParentEntry[0],
        parentRec?.parentId
      );
    }
  }

  if (!matchedLink && parentLinks.length) {
    matchedLink = parentLinks[0];
  }

  const parentUserId = normalizeIdentifier(
    parentUserRec?.userId || parentRec?.userId || matchedLink?.userId
  );
  const parentId = normalizeIdentifier(
    parentRec?.parentId || matchedLink?.parentId
  );
  const parentName =
    parentUserRec?.name ||
    parentRec?.name ||
    parentRec?.displayName ||
    matchedLink?.name ||
    "";
  const parentPhone =
    parentUserRec?.phone ||
    parentRec?.phone ||
    parentRec?.phoneNumber ||
    parentRec?.contact ||
    matchedLink?.phone ||
    "";
  const parentProfileImage = resolveProfileImage(
    parentUserRec?.profileImage,
    parentUserRec?.profile,
    parentRec?.profileImage,
    parentRec?.profile,
    matchedLink?.profileImage
  );

  if (!parentId && !parentUserId && !parentName && !parentPhone) {
    return null;
  }

  return {
    parentId,
    parentUserId,
    parentName,
    parentPhone,
    parentProfileImage,
    parentRec,
    parentUserRec,
    parentLink: matchedLink,
    userRec,
  };
};
