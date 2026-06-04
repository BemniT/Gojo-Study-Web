import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCachedJson } from "../utils/rtdbCache";
import { getRtdbRoot, RTDB_BASE_RAW } from "../api/rtdbScope";
import { resolveProfileImage } from "../utils/profileImage";
import {
  isActiveRecord,
  normalizeIdentifier,
} from "../utils/studentHelpers";
import {
  loadUserRecordsByIds,
  resolveTeacherSchoolCode,
} from "../utils/teacherData";
import {
  createPlaceholderAvatar,
  sanitizeProfileImage,
} from "../utils/chatHelpers";
import { isAcademicAdmin, isManagementEligible } from "../domain/adminClassifiers";

const DEFAULT_PROFILE_IMAGE = "/default-profile.png";

const resolveAvatarSrc = (rawValue, name) => {
  const sanitized = sanitizeProfileImage(rawValue);
  if (!sanitized || sanitized === DEFAULT_PROFILE_IMAGE) {
    return createPlaceholderAvatar(name);
  }
  return sanitized;
};

export function useAdmins({ searchTerm }) {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState("");
  const [rtdbBase, setRtdbBase] = useState(() => getRtdbRoot());

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("teacher") || "null");
    if (!stored) {
      navigate("/login");
      return;
    }
    setTeacher(stored);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const resolveSchool = async () => {
      if (!teacher?.schoolCode) {
        setResolvedSchoolCode("");
        setRtdbBase(getRtdbRoot());
        return;
      }

      const resolved = await resolveTeacherSchoolCode(teacher.schoolCode);
      if (cancelled) return;

      const schoolCode = String(resolved || teacher.schoolCode).trim();
      setResolvedSchoolCode(schoolCode);
      setRtdbBase(`${RTDB_BASE_RAW}/Platform1/Schools/${schoolCode}`);
    };

    resolveSchool();

    return () => {
      cancelled = true;
    };
  }, [teacher?.schoolCode]);

  const fetchAdmins = useCallback(async () => {
    if (!rtdbBase) {
      setAdmins([]);
      return;
    }

    setLoading(true);

    try {
      const [schoolAdminsNode, managementNode, hrNode, registerersNode] = await Promise.all([
        fetchCachedJson(`${rtdbBase}/School_Admins.json`, { ttlMs: 5 * 60 * 1000, fallbackValue: {} }),
        fetchCachedJson(`${rtdbBase}/Management.json`, { ttlMs: 5 * 60 * 1000, fallbackValue: {} }),
        fetchCachedJson(`${rtdbBase}/HR.json`, { ttlMs: 5 * 60 * 1000, fallbackValue: {} }),
        fetchCachedJson(`${rtdbBase}/Registerers.json`, { ttlMs: 5 * 60 * 1000, fallbackValue: {} }),
      ]);

      const schoolAdmins = schoolAdminsNode && typeof schoolAdminsNode === "object" ? schoolAdminsNode : {};
      const management = managementNode && typeof managementNode === "object" ? managementNode : {};
      const hr = hrNode && typeof hrNode === "object" ? hrNode : {};
      const registerers = registerersNode && typeof registerersNode === "object" ? registerersNode : {};

      const candidates = [];
      Object.entries(schoolAdmins).forEach(([recordKey, record]) => {
        candidates.push({ source: "school_admin", recordKey, record });
      });
      Object.entries(management).forEach(([recordKey, record]) => {
        candidates.push({ source: "management", recordKey, record });
      });
      Object.entries(hr).forEach(([recordKey, record]) => {
        candidates.push({ source: "hr", recordKey, record });
      });
      Object.entries(registerers).forEach(([recordKey, record]) => {
        candidates.push({ source: "registerer", recordKey, record });
      });

      const userIds = [
        ...new Set(
          candidates
            .map(({ record, recordKey }) => record?.userId || record?.userID || recordKey)
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        ),
      ];

      const users = await loadUserRecordsByIds({
        rtdbBase,
        schoolCode: resolvedSchoolCode,
        userIds,
      });

      const allAdmins = candidates
        .map(({ source, recordKey, record }) => {
          const userId = String(record?.userId || "").trim();
          const user = users?.[userId] || {};
          const resolvedUserId = userId || String(user?.userId || recordKey || "").trim();

          const name = user?.name || record?.name || record?.title || "Management";
          return {
            adminId:
              record?.adminId || record?.managementId || record?.hrId || record?.registererId || recordKey,
            source,
            recordKey,
            userId: resolvedUserId,
            username: user?.username || record?.username || "",
            name,
            email: user?.email || record?.email || "",
            phone: user?.phone || record?.phone || "",
            profileImage: resolveAvatarSrc(
              resolveProfileImage(
                user.profileImage,
                user.profile,
                user.avatar,
                record.profileImage,
                record.profile,
                DEFAULT_PROFILE_IMAGE
              ),
              name
            ),
            title: record?.title || user?.title || user?.role || source.replace("_", " "),
            role: user?.role || record?.role || source,
            status: record?.status || user?.status || (user?.isActive === true ? "active" : "inactive"),
            schoolCode: record?.schoolCode || user?.schoolCode || teacher?.schoolCode || "",
            department: record?.department || user?.department || "",
            office: record?.office || user?.office || "",
            position: record?.position || user?.position || "",
            responsibility: record?.responsibility || user?.responsibility || "",
            record,
            user,
          };
        })
        .filter((candidate) => candidate.userId)
        .filter((candidate) => isActiveRecord(candidate.record || candidate.user))
        .filter((candidate) => {
          if (candidate.source === "school_admin") {
            return isAcademicAdmin({ schoolAdmin: candidate.record, user: candidate.user });
          }
          return isManagementEligible({
            source: candidate.source,
            record: candidate.record,
            user: candidate.user,
          });
        })
        .filter((candidate) => candidate.name || candidate.email || candidate.userId)
        .filter((item, index, array) => array.findIndex((entry) => entry.userId === item.userId) === index)
        .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

      setAdmins(allAdmins);
      setError(allAdmins.length ? "" : "No management contacts found");
    } catch (fetchError) {
      console.error(fetchError);
      setAdmins([]);
      setError("Failed to fetch management contacts");
    } finally {
      setLoading(false);
    }
  }, [rtdbBase, resolvedSchoolCode, teacher?.schoolCode]);

  useEffect(() => {
    void fetchAdmins();
  }, [fetchAdmins]);

  const filteredAdmins = useMemo(() => {
    const q = String(searchTerm || "").toLowerCase();
    return admins.filter((admin) => {
      const haystack = `${admin.name} ${admin.email} ${admin.phone} ${admin.title} ${admin.username}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [admins, searchTerm]);

  return {
    teacher,
    teacherUserId: String(teacher?.userId || ""),
    resolvedSchoolCode,
    rtdbBase,
    admins,
    filteredAdmins,
    loading,
    error,
  };
}
