import { normalizeRole } from "../utils/chatHelpers";

const ACADEMIC_KEYWORDS = [
  "academic",
  "academics",
  "principal",
  "vice principal",
  "dean",
  "curriculum",
];

const MANAGEMENT_KEYWORDS = [
  "academic",
  "academics",
  "principal",
  "vice principal",
  "dean",
  "curriculum",
  "admin",
  "management",
  "hr",
  "human resource",
  "register",
  "registrar",
];

export const isAcademicAdmin = ({ schoolAdmin = {}, user = {} } = {}) => {
  const role = normalizeRole(user?.role || user?.userType || schoolAdmin?.role);
  const text = [
    schoolAdmin?.title,
    schoolAdmin?.department,
    schoolAdmin?.office,
    schoolAdmin?.position,
    schoolAdmin?.responsibility,
    user?.title,
    user?.department,
    user?.position,
    user?.responsibility,
    role,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text.trim()) {
    return role === "admin" || role === "school_admin" || role === "school_admins";
  }

  return ACADEMIC_KEYWORDS.some((keyword) => text.includes(keyword));
};

export const isManagementEligible = ({ source = "", record = {}, user = {} } = {}) => {
  const role = normalizeRole(user?.role || user?.userType || record?.role || source);
  const text = [
    source,
    role,
    record?.title,
    record?.department,
    record?.office,
    record?.position,
    record?.responsibility,
    user?.title,
    user?.department,
    user?.position,
    user?.responsibility,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return MANAGEMENT_KEYWORDS.some((keyword) => text.includes(keyword));
};
