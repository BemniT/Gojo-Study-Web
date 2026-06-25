import { useEffect, useMemo, useState } from "react";
import {
  buildConversationSummaryMap,
  fetchConversationSummaries,
  loadSchoolParentsNode,
  loadSchoolStudentsNode,
  loadSchoolTeachersNode,
  loadUserRecordsByIds,
} from "../../utils/registerData";

const makeIsSelfUser = (financeUserId, financeAccountId) => (value) => {
  const target = String(value || "");
  if (!target) return false;
  return [financeUserId, financeAccountId]
    .map((v) => String(v || ""))
    .filter(Boolean)
    .includes(target);
};

export default function useAllChatContacts({
  DB_ROOT,
  schoolCode,
  financeUserId,
  financeAccountId,
  location,
}) {
  const isSelfUser = useMemo(
    () => makeIsSelfUser(financeUserId, financeAccountId),
    [financeUserId, financeAccountId]
  );

  const passedUser = useMemo(() => {
    const normalize = (u, fallbackType = "student") => {
      if (!u?.userId) return null;
      if (isSelfUser(u.userId) || isSelfUser(u.id) || isSelfUser(u.financeId) || isSelfUser(u.adminId)) {
        return null;
      }
      return {
        ...u,
        type: u?.type || fallbackType,
        name: u?.name || u?.username || "User",
        profileImage: u?.profileImage || "/default-profile.png",
      };
    };

    if (location.state?.user) return normalize(location.state.user, location.state?.user?.type || "student");

    if (location.state?.teacher) {
      const t = location.state.teacher;
      return normalize(
        {
          userId: t?.userId || "",
          name: t?.name || t?.username || "Teacher",
          profileImage: t?.profileImage || "/default-profile.png",
          type: location.state?.userType || "teacher",
        },
        "teacher"
      );
    }

    return null;
  }, [location.state, isSelfUser]);

  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedTab, setSelectedTab] = useState(
    passedUser?.type === "parent" || passedUser?.type === "teacher" ? passedUser.type : "student"
  );
  const [selectedChatUser, setSelectedChatUser] = useState(passedUser);

  useEffect(() => {
    if (!passedUser?.userId) return;
    if (isSelfUser(passedUser.userId) || isSelfUser(passedUser.id)) return;
    setSelectedChatUser((prev) =>
      String(prev?.userId || "") === String(passedUser.userId) ? prev : passedUser
    );
    if (["student", "parent", "teacher"].includes(passedUser?.type)) {
      setSelectedTab(passedUser.type);
    }
  }, [passedUser, isSelfUser]);

  useEffect(() => {
    const fetchPeople = async () => {
      if (!financeUserId) return;

      try {
        const [studentsData, parentsData, teachersData] = await Promise.all([
          loadSchoolStudentsNode({ rtdbBase: DB_ROOT }),
          loadSchoolParentsNode({ rtdbBase: DB_ROOT }),
          loadSchoolTeachersNode({ rtdbBase: DB_ROOT }),
        ]);

        const summaries = await fetchConversationSummaries({
          rtdbBase: DB_ROOT,
          currentUserId: financeUserId,
          includeWithoutLastMessage: true,
        });
        const summariesByUserId = buildConversationSummaryMap(summaries);

        const allDirectoryUserIds = Array.from(
          new Set(
            [...Object.values(studentsData || {}), ...Object.values(parentsData || {}), ...Object.values(teachersData || {})]
              .map((record) => String(record?.userId || "").trim())
              .filter(Boolean)
          )
        );

        const summaryUserIds = new Set(
          summaries.map((s) => String(s?.contact?.userId || s?.otherUserId || "").trim()).filter(Boolean)
        );
        const targetUserIds = allDirectoryUserIds.length <= 200
          ? allDirectoryUserIds
          : allDirectoryUserIds.filter((uid) => summaryUserIds.has(uid));

        const usersById = await loadUserRecordsByIds({
          rtdbBase: DB_ROOT,
          schoolCode,
          userIds: targetUserIds,
        });

        const findUserNode = (userId) => usersById[String(userId || "").trim()] || {};

        const buildList = (sourceMap, type) => {
          const rows = Object.entries(sourceMap || {})
            .map(([id, node]) => {
              const userId = node?.userId;
              if (!userId) return null;
              if (isSelfUser(userId) || isSelfUser(id) || isSelfUser(node?.financeId) || isSelfUser(node?.adminId)) {
                return null;
              }

              const user = findUserNode(userId);
              const summary = summariesByUserId[String(userId || "").trim()] || null;
              const unread = Number(summary?.unreadForMe || 0);

              return {
                id,
                type,
                userId,
                name: user.name || user.username || `${type} ${id}`,
                profileImage: user.profileImage || "/default-profile.png",
                lastSeen: user.lastSeen || null,
                lastMsgTime: Number(summary?.lastMessageTime || 0),
                lastMsgText: summary?.lastMessageText || "",
                unread,
              };
            })
            .filter(Boolean);

          const uniqueByUserId = new Map();
          for (const row of rows) {
            const key = String(row.userId || "");
            const existing = uniqueByUserId.get(key);
            if (!existing) {
              uniqueByUserId.set(key, row);
              continue;
            }

            const shouldReplace = Number(row.lastMsgTime || 0) >= Number(existing.lastMsgTime || 0);
            const merged = shouldReplace ? { ...existing, ...row } : { ...row, ...existing };
            merged.unread = Math.max(Number(existing.unread || 0), Number(row.unread || 0));
            merged.lastMsgTime = Math.max(Number(existing.lastMsgTime || 0), Number(row.lastMsgTime || 0));
            uniqueByUserId.set(key, merged);
          }

          return Array.from(uniqueByUserId.values()).sort(
            (a, b) => Number(b.lastMsgTime || 0) - Number(a.lastMsgTime || 0)
          );
        };

        const studentList = buildList(studentsData, "student");
        const parentList = buildList(parentsData, "parent");
        const teacherList = buildList(teachersData, "teacher");

        setStudents(studentList);
        setParents(parentList);
        setTeachers(teacherList);

        const allUsers = [...studentList, ...parentList, ...teacherList];
        const selectedIsValid = allUsers.some(
          (u) => String(u?.userId || "") === String(selectedChatUser?.userId || "")
        );

        const hasExplicitTarget = Boolean(passedUser?.userId || location.state?.studentId);

        if (!selectedChatUser || !selectedIsValid) {
          if (location.state?.studentId) {
            const matchedStudent = studentList.find(
              (s) => String(s.id) === String(location.state.studentId)
            );
            if (matchedStudent) {
              setSelectedTab("student");
              setSelectedChatUser(matchedStudent);
              return;
            }
          }

          if (hasExplicitTarget) {
            const first = studentList[0] || parentList[0] || teacherList[0] || null;
            setSelectedChatUser(first);
          } else {
            setSelectedChatUser(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch chat users:", err);
      }
    };

    fetchPeople();
  }, [DB_ROOT, schoolCode, financeUserId, financeAccountId, location.state?.studentId, passedUser?.userId, selectedChatUser, isSelfUser]);

  return {
    students,
    parents,
    teachers,
    selectedTab,
    setSelectedTab,
    selectedChatUser,
    setSelectedChatUser,
  };
}
