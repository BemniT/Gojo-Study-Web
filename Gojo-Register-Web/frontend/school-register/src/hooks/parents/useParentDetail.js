import { useEffect, useState } from "react";
import axios from "axios";
import {
  loadSchoolParentsNode,
  loadSchoolStudentsNode,
} from "../../utils/registerData";
import {
  findStudentMatchById,
  getResolvedParentChildLinks,
} from "../../utils/parentLinks";

const computeAge = (dob) => {
  if (!dob) return null;
  try {
    const d = typeof dob === "number" ? new Date(dob) : new Date(String(dob));
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  } catch {
    return null;
  }
};

const buildParentInfo = ({ selectedParentId, parentRecord, userInfo, childLinks, selectedParent }) => {
  const dobRaw =
    userInfo?.dob || userInfo?.birthDate || parentRecord?.dob || parentRecord?.birthDate || null;
  const age = parentRecord?.age || userInfo?.age || computeAge(dobRaw) || null;
  const rels = childLinks.map((link) => link.relationship).filter(Boolean);

  return {
    userId: selectedParentId,
    parentId: parentRecord?.parentId || selectedParent?.parentId || "N/A",
    name: userInfo.name || userInfo.username || "No Name",
    username: userInfo.username || null,
    email: userInfo.email || "N/A",
    phone: userInfo.phone || parentRecord?.phone || "N/A",
    isActive: userInfo.isActive ?? parentRecord?.isActive ?? true,
    job: userInfo.job || parentRecord?.job || null,
    relationships: rels,
    age: age ?? "—",
    city:
      parentRecord?.city ||
      (parentRecord?.address && parentRecord.address.city) ||
      userInfo.city ||
      "—",
    citizenship: parentRecord?.citizenship || userInfo.citizenship || "—",
    status: parentRecord?.status || (userInfo.isActive ? "Active" : "Inactive") || "N/A",
    address: parentRecord?.address || userInfo.address || null,
    additionalInfo: parentRecord?.additionalInfo || "N/A",
    createdAt: parentRecord?.createdAt || userInfo.createdAt || "N/A",
    profileImage: userInfo.profileImage || "/default-profile.png",
  };
};

const buildChildSummary = (childLink, studentsData, parentRecord) => {
  const studentMatch = findStudentMatchById(studentsData, childLink.studentId);
  const studentRecord = studentMatch?.record;
  if (!studentRecord) return null;

  // Fall back to studentRecord for display fields rather than a Users-node
  // lookup — the page would have thrown a ReferenceError here previously
  // (`usersData` was never in scope). studentRecord carries name + image.
  return {
    studentId: studentRecord.studentId || studentMatch?.key || childLink.studentId,
    name:
      studentRecord.name ||
      studentRecord.username ||
      "N/A",
    email: studentRecord.email || "N/A",
    grade: studentRecord.grade || "N/A",
    section: studentRecord.section || "N/A",
    parentPhone: parentRecord?.phone || "N/A",
    relationship: childLink.relationship || "N/A",
    profileImage: studentRecord.profileImage || "/default-profile.png",
  };
};

/**
 * useParentDetail
 *
 * Owns the selected-parent enrichment: resolves the parent record, the
 * parent's Users-node record (direct path lookup), and the linked
 * children. Returns `{ parentInfo, children }` for the detail drawer.
 *
 * Re-runs when DB or selected parent change. Stale-result guarded.
 */
export default function useParentDetail({ DB, selectedParent, setSelectedParent }) {
  const [parentInfo, setParentInfo] = useState(null);
  const [children, setChildren] = useState([]);

  const selectedParentId = selectedParent?.userId || null;

  useEffect(() => {
    if (!selectedParentId) {
      setParentInfo(null);
      setChildren([]);
      return undefined;
    }

    let cancelled = false;

    const fetchParentInfoAndChildren = async () => {
      try {
        const [parentsData, studentsData] = await Promise.all([
          loadSchoolParentsNode({ rtdbBase: DB }),
          loadSchoolStudentsNode({ rtdbBase: DB }),
        ]);

        const parentRecordEntry =
          Object.entries(parentsData).find(
            ([parentKey, p]) =>
              String(p?.userId) === String(selectedParentId) ||
              String(parentKey) === String(selectedParentId)
          ) || [];
        const parentRecordKey = parentRecordEntry[0] || null;
        const parentRecord = parentRecordEntry[1] || null;

        // Direct path Users lookup avoids the 22 MB full Users node download.
        const userInfo = await axios
          .get(`${DB}/Users/${selectedParentId}.json`)
          .then((r) => r.data || {})
          .catch(() => ({}));

        const resolvedChildLinks = getResolvedParentChildLinks({
          parentRecord,
          parentRecordKey,
          parentUserId: selectedParentId,
          studentsData,
        });

        const info = buildParentInfo({
          selectedParentId,
          parentRecord,
          userInfo,
          childLinks: resolvedChildLinks,
          selectedParent,
        });

        if (cancelled) return;
        setParentInfo(info);
        setSelectedParent((prev) => {
          if (!prev || String(prev.userId) !== String(selectedParentId)) return prev;
          return { ...prev, ...info };
        });

        const childrenList = resolvedChildLinks
          .map((childLink) => buildChildSummary(childLink, studentsData, parentRecord))
          .filter(Boolean);

        if (cancelled) return;
        setChildren(childrenList);
      } catch (err) {
        console.error("Error fetching parent info and children:", err);
        if (cancelled) return;
        setParentInfo(null);
        setChildren([]);
      }
    };

    fetchParentInfoAndChildren();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DB, selectedParentId]);

  return {
    parentInfo,
    setParentInfo,
    children,
    setChildren,
  };
}
