import { useEffect, useState } from "react";
import axios from "axios";

const SECTION_KEYS = ["basic", "parent", "address", "finance", "health", "academic", "system"];

const SECTION_TO_RTDB_FIELD = {
  basic: "basicStudentInformation",
  parent: "parentGuardianInformation",
  address: "addressInformation",
  finance: "financeInformation",
  health: "healthEmergency",
  academic: "academicSetup",
  system: "systemAccountInformation",
};

const USER_FIELD_CANDIDATES = [
  "name",
  "email",
  "phone",
  "profileImage",
  "username",
  "dob",
  "gender",
  "nationality",
  "nationalIdNumber",
  "nationalIdImageUrl",
];

const stringifyIfObject = (value) => {
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }
  return value ?? "";
};

const parseEditableValue = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
};

const normalizeEditableMap = (obj = {}) => {
  const out = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    out[key] = parseEditableValue(value);
  });
  return out;
};

const mapSectionToFormValues = (section = {}) =>
  Object.fromEntries(
    Object.entries(section).map(([k, v]) => [k, stringifyIfObject(v)])
  );

/**
 * useStudentFullscreenForm
 *
 * Owns the fullscreen student-profile editor: form state, collapse map,
 * per-field updaters, and the save flow that PATCHes both /Students/{id}
 * and /Users/{userId} on RTDB.
 *
 * The form resets every time the modal opens for a different student
 * (or when the underlying registrationSections data refreshes) so users
 * always see the latest persisted values when they re-enter edit mode.
 */
export default function useStudentFullscreenForm({
  dbUrl,
  selectedStudent,
  setSelectedStudent,
  setStudents,
  studentFullscreenOpen,
  registrationSections,
  excludedAdditionalKeys,
}) {
  const [fullscreenEditing, setFullscreenEditing] = useState(false);
  const [fullscreenSaving, setFullscreenSaving] = useState(false);
  const [fullscreenSectionCollapsed, setFullscreenSectionCollapsed] = useState({});
  const [fullscreenEditForm, setFullscreenEditForm] = useState({ sections: {}, additional: {} });

  const resetFullscreenEditFormFromSelected = () => {
    if (!selectedStudent) return;

    const sectionsForm = Object.fromEntries(
      SECTION_KEYS.map((key) => [key, mapSectionToFormValues(registrationSections?.[key] || {})])
    );

    const additionalSource = Object.fromEntries(
      Object.entries(selectedStudent || {}).filter(
        ([key]) => !excludedAdditionalKeys.includes(key)
      )
    );

    const additionalForm = Object.fromEntries(
      Object.entries(additionalSource).map(([k, v]) => [k, stringifyIfObject(v)])
    );

    setFullscreenEditForm({ sections: sectionsForm, additional: additionalForm });
    setFullscreenSectionCollapsed(
      Object.fromEntries([...SECTION_KEYS, "additional"].map((k) => [k, false]))
    );
  };

  useEffect(() => {
    if (!studentFullscreenOpen || !selectedStudent) return;
    resetFullscreenEditFormFromSelected();
    setFullscreenEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentFullscreenOpen, selectedStudent, registrationSections, excludedAdditionalKeys]);

  const toggleFullscreenSection = (sectionKey) => {
    setFullscreenSectionCollapsed((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const updateFullscreenSectionField = (sectionKey, fieldKey, value) => {
    setFullscreenEditForm((prev) => ({
      ...prev,
      sections: {
        ...(prev.sections || {}),
        [sectionKey]: {
          ...((prev.sections || {})[sectionKey] || {}),
          [fieldKey]: value,
        },
      },
    }));
  };

  const updateFullscreenAdditionalField = (fieldKey, value) => {
    setFullscreenEditForm((prev) => ({
      ...prev,
      additional: {
        ...(prev.additional || {}),
        [fieldKey]: value,
      },
    }));
  };

  const saveFullscreenEdits = async () => {
    if (!selectedStudent?.studentId) return;

    setFullscreenSaving(true);
    try {
      const normalizedSections = Object.fromEntries(
        SECTION_KEYS.map((key) => [
          key,
          normalizeEditableMap(fullscreenEditForm.sections?.[key] || {}),
        ])
      );

      const normalizedAdditional = normalizeEditableMap(fullscreenEditForm.additional || {});

      const studentPayload = {
        ...Object.fromEntries(
          SECTION_KEYS.map((key) => [SECTION_TO_RTDB_FIELD[key], normalizedSections[key]])
        ),
        ...normalizedAdditional,
      };

      await axios.patch(
        `${dbUrl}/Students/${selectedStudent.studentId}.json`,
        studentPayload
      );

      if (selectedStudent.userId) {
        const userPayload = {};
        USER_FIELD_CANDIDATES.forEach((field) => {
          if (typeof normalizedAdditional[field] !== "undefined") {
            userPayload[field] = normalizedAdditional[field];
          }
        });

        if (!userPayload.name && normalizedSections.basic?.studentFullName) {
          userPayload.name = normalizedSections.basic.studentFullName;
        }
        if (!userPayload.username && normalizedSections.system?.studentUsername) {
          userPayload.username = normalizedSections.system.studentUsername;
        }

        if (Object.keys(userPayload).length > 0) {
          await axios.patch(`${dbUrl}/Users/${selectedStudent.userId}.json`, userPayload);
        }
      }

      const updatedSelected = {
        ...(selectedStudent || {}),
        ...studentPayload,
        name:
          normalizedAdditional.name ||
          normalizedSections.basic?.studentFullName ||
          selectedStudent.name,
        profileImage: normalizedAdditional.profileImage || selectedStudent.profileImage,
        email: normalizedAdditional.email || selectedStudent.email,
        phone: normalizedAdditional.phone || selectedStudent.phone,
        username:
          normalizedAdditional.username ||
          normalizedSections.system?.studentUsername ||
          selectedStudent.username,
      };

      setSelectedStudent(updatedSelected);
      setStudents((prev) =>
        prev.map((item) =>
          item.studentId === selectedStudent.studentId
            ? {
                ...item,
                name: updatedSelected.name || item.name,
                profileImage: updatedSelected.profileImage || item.profileImage,
                email: updatedSelected.email || item.email,
                grade: updatedSelected.grade || item.grade,
                section: updatedSelected.section || item.section,
              }
            : item
        )
      );

      setFullscreenEditing(false);
      alert("Student information updated successfully.");
    } catch (err) {
      console.error("Fullscreen save error:", err);
      alert("Could not save student information: " + (err.message || err));
    } finally {
      setFullscreenSaving(false);
    }
  };

  return {
    fullscreenEditing,
    setFullscreenEditing,
    fullscreenSaving,
    fullscreenSectionCollapsed,
    fullscreenEditForm,
    toggleFullscreenSection,
    updateFullscreenSectionField,
    updateFullscreenAdditionalField,
    resetFullscreenEditFormFromSelected,
    saveFullscreenEdits,
  };
}
