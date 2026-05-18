import { useState } from "react";

export const useTeacherSession = () => {
  const [teacher] = useState(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return {};
    }

    try {
      const rawValue = window.localStorage.getItem("teacher");
      return rawValue ? JSON.parse(rawValue) || {} : {};
    } catch (error) {
      return {};
    }
  });

  const teacherUserId = String(teacher?.userId || "");
  const teacherSchoolCode = String(teacher?.schoolCode || "").trim();

  return { teacher, teacherUserId, teacherSchoolCode };
};
