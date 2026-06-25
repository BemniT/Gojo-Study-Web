import { useEffect, useMemo, useState } from "react";
import { loadSchoolStudentsNode } from "../../utils/registerData";
import { fetchCachedJson } from "../../utils/rtdbCache";

export default function useOverviewData({ DB_URL }) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [postsCount, setPostsCount] = useState(0);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        const [studentsObj, postsObj] = await Promise.all([
          loadSchoolStudentsNode({ rtdbBase: DB_URL }),
          fetchCachedJson(`${DB_URL}/posts.json`, { ttlMs: 60000 }).catch(() => ({})),
        ]);

        const studentRows = Object.entries(studentsObj).map(([studentId, studentNode]) => ({
          studentId,
          userId: studentNode?.userId || "",
          name:
            studentNode?.name ||
            [studentNode?.firstName, studentNode?.middleName, studentNode?.lastName].filter(Boolean).join(" ") ||
            studentNode?.basicStudentInformation?.name ||
            "No Name",
          profileImage: studentNode?.profileImage || "/default-profile.png",
          grade: studentNode?.grade || "-",
          section: studentNode?.section || "-",
          gender: String(studentNode?.gender || "").trim().toLowerCase(),
          status: String(studentNode?.status || "active").toLowerCase(),
          createdAt: studentNode?.createdAt || studentNode?.registeredAt || null,
        }));

        setStudents(studentRows);
        setPostsCount(Object.keys(postsObj || {}).length);
      } catch (error) {
        console.error("Overview fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, [DB_URL]);

  const summary = useMemo(() => {
    const totalStudents = students.length;
    const activeStudents = students.filter((s) => s.status !== "inactive").length;
    const inactiveStudents = totalStudents - activeStudents;
    const maleCount = students.filter((s) => ["male", "m", "boy"].includes(String(s.gender || "").toLowerCase())).length;
    const femaleCount = students.filter((s) => ["female", "f", "girl"].includes(String(s.gender || "").toLowerCase())).length;

    const gradeCounts = {};
    students.forEach((s) => {
      const gradeKey = String(s.grade || "-");
      gradeCounts[gradeKey] = (gradeCounts[gradeKey] || 0) + 1;
    });

    const topGrades = Object.entries(gradeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([grade, count]) => ({ grade, count }));

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthRegistrations = students.filter((student) => {
      if (!student.createdAt) return false;
      const registeredDate = new Date(student.createdAt);
      if (Number.isNaN(registeredDate.getTime())) return false;
      return registeredDate.getMonth() === currentMonth && registeredDate.getFullYear() === currentYear;
    });

    const recentStudents = [...thisMonthRegistrations]
      .sort((a, b) => {
        const x = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const y = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return y - x;
      })
      .slice(0, 8);

    const thisMonthRegistrationRate = totalStudents
      ? Math.round((thisMonthRegistrations.length / totalStudents) * 100)
      : 0;

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      maleCount,
      femaleCount,
      topGrades,
      recentStudents,
      thisMonthRegistrationCount: thisMonthRegistrations.length,
      thisMonthRegistrationRate,
    };
  }, [students]);

  return { loading, summary, postsCount };
}
