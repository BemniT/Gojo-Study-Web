/**
 * @file useStoredTeacher.js
 * @description Utility functions for reading and writing the teacher session data and profile fetch timestamp in localStorage.
 */

/**
 * Reads and parses the teacher object from localStorage.
 * @returns {object} The parsed teacher object, or {} if the key is missing or invalid.
 */
export function getStoredTeacher() {
  try {
    return JSON.parse(localStorage.getItem("teacher") || "{}") || {};
  } catch {
    return {};
  }
}

/**
 * Persists the teacher object to localStorage under the "teacher" key.
 * @param {object} teacherData - The teacher data object to persist.
 * @returns {void}
 */
export function setStoredTeacher(teacherData) {
  try {
    localStorage.setItem("teacher", JSON.stringify(teacherData));
  } catch (err) {
    console.error("Failed to save teacher to localStorage:", err);
  }
}

/**
 * Reads the teacher profile fetch timestamp from localStorage.
 * @returns {number} The stored timestamp, or 0 if missing or invalid.
 */
export function getTeacherProfileFetchedAt() {
  try {
    return Number(localStorage.getItem("teacherProfileFetchedAt") || 0);
  } catch {
    return 0;
  }
}

/**
 * Saves the teacher profile fetch timestamp to localStorage as a string.
 * @param {number} timestamp - The timestamp value to store.
 * @returns {void}
 */
export function setTeacherProfileFetchedAt(timestamp) {
  try {
    localStorage.setItem("teacherProfileFetchedAt", String(timestamp));
  } catch (err) {
    console.error("Failed to save profile fetch timestamp:", err);
  }
}
