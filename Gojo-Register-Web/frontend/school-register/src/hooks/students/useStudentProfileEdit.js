import { useState } from "react";
import axios from "axios";

const USER_FIELDS_TO_SYNC = ["name", "email", "phone", "profileImage", "username"];

/**
 * useStudentProfileEdit
 *
 * Owns the right-drawer Details-tab quick edit: `editForm` state,
 * `editingProfile` toggle, `savingProfile` flag, and a save action that
 * tries (1) RTDB Students PATCH (+ Users sync), (2) Users PATCH if no
 * studentId, or (3) backend /register/student fallback.
 *
 * Distinct from `useStudentFullscreenForm` (which is the per-section
 * bulk editor inside the fullscreen modal); this hook covers the
 * lightweight 9-field profile editor in the side drawer.
 */
export default function useStudentProfileEdit({
  dbUrl,
  backendBase,
  selectedStudent,
  setSelectedStudent,
  setStudents,
}) {
  const [editingProfile, setEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const startEditProfile = () => {
    if (!selectedStudent) return;
    setEditForm({ ...(selectedStudent || {}) });
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setEditForm({});
  };

  const finishWithMerge = (mergedPayload, matcher) => {
    const updated = { ...(selectedStudent || {}), ...(mergedPayload || {}) };
    setSelectedStudent(updated);
    setStudents((prev) =>
      prev.map((p) => (matcher(p) ? { ...(p || {}), ...(mergedPayload || {}) } : p))
    );
    setEditingProfile(false);
    setEditForm({});
  };

  const saveProfileEdits = async () => {
    if (!selectedStudent) return;
    setSavingProfile(true);

    try {
      const payload = { ...(editForm || {}) };

      // Primary: RTDB Students PATCH (+ sync Users node when available)
      if (selectedStudent.studentId) {
        await axios.patch(
          `${dbUrl}/Students/${selectedStudent.studentId}.json`,
          payload
        );

        if (selectedStudent.userId) {
          const userPayload = {};
          USER_FIELDS_TO_SYNC.forEach((k) => {
            if (typeof payload[k] !== "undefined") userPayload[k] = payload[k];
          });
          if (Object.keys(userPayload).length > 0) {
            await axios.patch(
              `${dbUrl}/Users/${selectedStudent.userId}.json`,
              userPayload
            );
          }
        }

        finishWithMerge(payload, (p) => p.studentId === selectedStudent.studentId);
        return;
      }

      // Secondary: Users PATCH when there's no studentId
      if (selectedStudent.userId) {
        await axios.patch(`${dbUrl}/Users/${selectedStudent.userId}.json`, payload);
        finishWithMerge(payload, (p) => p.userId === selectedStudent.userId);
        return;
      }

      // Fallback: backend register/student endpoint
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      const res = await fetch(`${backendBase}/register/student`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save via backend");

      const mergedPayload = data || payload;
      finishWithMerge(
        mergedPayload,
        (p) =>
          (p.userId && data?.userId && p.userId === data.userId) ||
          (p.studentId && data?.studentId && p.studentId === data.studentId)
      );
    } catch (err) {
      console.error("Save profile error:", err);
      alert("Could not save profile: " + (err.message || err));
    } finally {
      setSavingProfile(false);
    }
  };

  return {
    editingProfile,
    editForm,
    setEditForm,
    savingProfile,
    startEditProfile,
    cancelEditProfile,
    saveProfileEdits,
  };
}
