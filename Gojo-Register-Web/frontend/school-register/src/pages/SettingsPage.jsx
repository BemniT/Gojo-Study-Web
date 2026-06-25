import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { generateSecret, verify } from "../utils/totp";
import useDarkMode from "../hooks/useDarkMode";
import {
  buildSchoolRoot,
  cacheSchoolSettings,
  DEFAULT_PREFERENCES,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_TEMPLATE_SETTINGS,
  formatDateForSettings,
  getCachedSchoolSettings,
  getUserRole,
  MANAGED_ROLES,
  persistStoredSession,
  readStoredRegistrar,
} from "../utils/registerSettings";
import { persistResolvedSchoolSession, resolveSchoolScope } from "../utils/schoolScope";
import ProfileAvatar from "../components/ProfileAvatar";
import SecuritySettingsPanel from "../components/dashboard/settings/SecuritySettingsPanel";
import SchoolInformationPanel from "../components/dashboard/settings/SchoolInformationPanel";
import AcademicConfigurationPanel from "../components/dashboard/settings/AcademicConfigurationPanel";
import UserManagementPanel from "../components/dashboard/settings/UserManagementPanel";
import DocumentTemplatesPanel from "../components/dashboard/settings/DocumentTemplatesPanel";
import SystemPreferencesPanel from "../components/dashboard/settings/SystemPreferencesPanel";
import RolesNotificationsPanel from "../components/dashboard/settings/RolesNotificationsPanel";
import BackupDataPanel from "../components/dashboard/settings/BackupDataPanel";
import SystemInformationPanel from "../components/dashboard/settings/SystemInformationPanel";
import {
  loadGradeManagementNode,
  loadSchoolInfoNode,
  loadSchoolParentsNode,
  loadSchoolStudentsNode,
  loadSchoolTeachersNode,
} from "../utils/registerData";
import { fetchCachedJson } from "../utils/rtdbCache";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

function buildRecoveryCodes() {
  return Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10).toUpperCase());
}

function downloadJsonFile(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export default function SettingsPage() {
  const storedAdmin = readStoredRegistrar();
  const [darkMode, toggleDarkMode] = useDarkMode();
  const currentRole = getUserRole(storedAdmin);
  const cachedSettings = getCachedSchoolSettings(storedAdmin.schoolCode || "");

  const [admin, setAdmin] = useState(storedAdmin);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [appSettings, setAppSettings] = useState(cachedSettings);

  const [schoolInfo, setSchoolInfo] = useState({});
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    shortName: "",
    logoUrl: "",
    addressLine: "",
    city: "",
    region: "",
    country: "Ethiopia",
    phone: "",
    email: "",
    website: "",
    motto: "",
  });
  const [academicForm, setAcademicForm] = useState({
    currentAcademicYear: "",
    sectionNamingSystem: "Alphabetical (A, B, C)",
    promotionPassMark: "50",
    maxStudentsPerSection: "45",
  });
  const [templateForm, setTemplateForm] = useState(DEFAULT_TEMPLATE_SETTINGS);
  const [preferencesForm, setPreferencesForm] = useState(DEFAULT_PREFERENCES);
  const [securityForm, setSecurityForm] = useState({
    name: storedAdmin.name || "",
    username: storedAdmin.username || "",
    newPassword: "",
    confirmPassword: "",
    sessionTimeout: "30",
    twoFactorEnabled: false,
    twoFactorSecret: "",
    twoFactorRecoveryCodes: [],
  });
  const [selectedProfileFile, setSelectedProfileFile] = useState(null);
  const [profileImage, setProfileImage] = useState(storedAdmin.profileImage || "/default-profile.png");
  const [counts, setCounts] = useState({ students: 0, parents: 0, teachers: 0, registerers: 0, sections: 0, grades: 0 });
  const [permissionsForm, setPermissionsForm] = useState({
    ...DEFAULT_ROLE_PERMISSIONS,
    ...(cachedSettings.permissions || {}),
  });
  const [selectedRole, setSelectedRole] = useState(MANAGED_ROLES.includes(currentRole) ? currentRole : "registerer");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupStats, setBackupStats] = useState({ snapshots: 0, lastSnapshot: "" });

  const schoolCode = storedAdmin.schoolCode || "";
  const [resolvedSchoolCode, setResolvedSchoolCode] = useState(schoolCode);
  const [resolvedDbRoot, setResolvedDbRoot] = useState(buildSchoolRoot(schoolCode));
  const dbRoot = String(resolvedDbRoot || buildSchoolRoot(schoolCode) || "").trim();
  const activeSchoolCode = String(resolvedSchoolCode || schoolCode || "").trim();
  const backupRoot = activeSchoolCode ? `${dbRoot.replace(`/Schools/${activeSchoolCode}`, "")}/SchoolBackups/${activeSchoolCode}` : "";

  const notify = (type, text) => setFeedback({ type, text });

  const persistAdmin = (updatedAdmin) => {
    setAdmin(updatedAdmin);
    persistStoredSession(updatedAdmin);
  };

  const syncSettingsCache = (settingsPatch) => {
    const normalized = cacheSchoolSettings(activeSchoolCode, settingsPatch);
    setAppSettings(normalized);
    return normalized;
  };

  useEffect(() => {
    const resolveScope = async () => {
      if (!schoolCode) return;

      try {
        const resolvedScope = await resolveSchoolScope(schoolCode);
        const nextResolvedSchoolCode = String(resolvedScope?.schoolCode || schoolCode || "").trim();
        const nextResolvedDbRoot = String(resolvedScope?.dbUrl || buildSchoolRoot(schoolCode) || "").trim();
        const resolvedSchoolInfo = resolvedScope?.schoolInfo || {};

        setResolvedSchoolCode(nextResolvedSchoolCode);
        setResolvedDbRoot(nextResolvedDbRoot);

        if (nextResolvedSchoolCode && nextResolvedSchoolCode !== schoolCode) {
          persistResolvedSchoolSession(nextResolvedSchoolCode, String(resolvedSchoolInfo?.shortName || "").trim());
        }
      } catch (error) {
        console.error("Failed to resolve settings school scope:", error);
        setResolvedSchoolCode(String(schoolCode || "").trim());
        setResolvedDbRoot(buildSchoolRoot(schoolCode));
      }
    };

    resolveScope();
  }, [schoolCode]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      if (!activeSchoolCode) {
        setLoading(false);
        notify("error", "No school session found. Please sign in again.");
        return;
      }

      try {
        setLoading(true);

        const [nextSchoolInfo, gradesMap, studentsData, parentsData, teachersData, registerersData, backups] = await Promise.all([
          loadSchoolInfoNode({ rtdbBase: dbRoot }),
          loadGradeManagementNode({ rtdbBase: dbRoot }),
          loadSchoolStudentsNode({ rtdbBase: dbRoot }),
          loadSchoolParentsNode({ rtdbBase: dbRoot }),
          loadSchoolTeachersNode({ rtdbBase: dbRoot }),
          fetchCachedJson(`${dbRoot}/Registerers.json`, { ttlMs: 60000, fallbackValue: {} }).catch(() => ({})),
          backupRoot ? fetchCachedJson(`${backupRoot}.json`, { ttlMs: 60000, fallbackValue: {} }).catch(() => ({})) : Promise.resolve({}),
        ]);

        if (cancelled) return;

        const normalizedBackups = backups && typeof backups === "object" ? backups : {};
        const normalizedRegisterers = registerersData && typeof registerersData === "object" ? registerersData : {};

        const normalizedSettings = syncSettingsCache(nextSchoolInfo);
        const academicSettings = normalizedSettings.academic || {};
        const documentTemplates = normalizedSettings.documentTemplates || {};
        const preferences = normalizedSettings.preferences || {};
        const security = normalizedSettings.security || {};
        const sortedBackups = Object.values(normalizedBackups)
          .filter((entry) => entry && typeof entry === "object")
          .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());

        const gradeKeys = Object.keys(gradesMap || {}).filter(Boolean).sort((a, b) => Number(a) - Number(b));
        const sectionCount = gradeKeys.reduce((total, gradeKey) => total + Object.keys(gradesMap?.[gradeKey]?.sections || {}).length, 0);

        setSchoolInfo(nextSchoolInfo);
        setSchoolForm({
          name: nextSchoolInfo.name || "",
          shortName: nextSchoolInfo.shortName || storedAdmin.shortName || storedAdmin.schoolShortName || "",
          logoUrl: nextSchoolInfo.logoUrl || "",
          addressLine: nextSchoolInfo?.address?.line1 || nextSchoolInfo.address || "",
          city: nextSchoolInfo.city || nextSchoolInfo?.address?.city || "",
          region: nextSchoolInfo.region || nextSchoolInfo?.address?.region || "",
          country: nextSchoolInfo.country || nextSchoolInfo?.address?.country || "Ethiopia",
          phone: String(nextSchoolInfo.phone || ""),
          email: nextSchoolInfo.email || "",
          website: nextSchoolInfo.website || "",
          motto: nextSchoolInfo.motto || "",
        });
        setAcademicForm({
          currentAcademicYear: nextSchoolInfo.currentAcademicYear || "",
          sectionNamingSystem: academicSettings.sectionNamingSystem || "Alphabetical (A, B, C)",
          promotionPassMark: String(academicSettings.promotionPassMark || "50"),
          maxStudentsPerSection: String(academicSettings.maxStudentsPerSection || "45"),
        });
        setTemplateForm({
          ...DEFAULT_TEMPLATE_SETTINGS,
          ...documentTemplates,
        });
        setPreferencesForm({
          ...DEFAULT_PREFERENCES,
          ...preferences,
        });
        setSecurityForm((prev) => ({
          ...prev,
          name: storedAdmin.name || prev.name || "",
          username: storedAdmin.username || prev.username || "",
          sessionTimeout: String(security.sessionTimeout || "30"),
          twoFactorEnabled: Boolean(security.twoFactorEnabled),
          twoFactorSecret: String(security.twoFactorSecret || ""),
          twoFactorRecoveryCodes: Array.isArray(security.twoFactorRecoveryCodes) ? security.twoFactorRecoveryCodes : [],
          newPassword: "",
          confirmPassword: "",
        }));
        setPermissionsForm(normalizedSettings.permissions || DEFAULT_ROLE_PERMISSIONS);
        setBackupStats({
          snapshots: Object.keys(normalizedBackups).length,
          lastSnapshot: sortedBackups[0]?.createdAt || "",
        });
        setProfileImage(storedAdmin.profileImage || "/default-profile.png");
        setCounts({
          students: Object.keys(studentsData || {}).length,
          parents: Object.keys(parentsData || {}).length,
          teachers: Object.keys(teachersData || {}).length,
          registerers: Object.keys(normalizedRegisterers).length,
          grades: gradeKeys.length,
          sections: sectionCount,
        });
      } catch (error) {
        console.error("Failed to load settings data:", error);
        if (!cancelled) notify("error", "Failed to load settings data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [activeSchoolCode, backupRoot, dbRoot, storedAdmin.name, storedAdmin.profileImage, storedAdmin.schoolShortName, storedAdmin.shortName, storedAdmin.username]);

  useEffect(() => {
    if (!securityForm.twoFactorEnabled || securityForm.twoFactorSecret) return;

    setSecurityForm((prev) => ({
      ...prev,
      twoFactorSecret: generateSecret(),
      twoFactorRecoveryCodes: prev.twoFactorRecoveryCodes?.length ? prev.twoFactorRecoveryCodes : buildRecoveryCodes(),
    }));
  }, [securityForm.twoFactorEnabled, securityForm.twoFactorRecoveryCodes, securityForm.twoFactorSecret]);

  const systemInfo = useMemo(() => {
    const storageSignals = [schoolInfo.logoUrl, profileImage].filter(Boolean).length;
    return {
      version: "Register v1",
      serverStatus: schoolCode ? "Connected" : "Offline",
      lastUpdate: formatDateForSettings(schoolInfo.createdAt || schoolInfo.updatedAt, preferencesForm),
      storageUsage: `${storageSignals} media assets configured | ${backupStats.snapshots} cloud snapshots`,
    };
  }, [backupStats.snapshots, preferencesForm, profileImage, schoolCode, schoolInfo.createdAt, schoolInfo.logoUrl, schoolInfo.updatedAt]);

  const updateSchoolForm = (key, value) => setSchoolForm((prev) => ({ ...prev, [key]: value }));
  const updateAcademicForm = (key, value) => setAcademicForm((prev) => ({ ...prev, [key]: value }));
  const updateTemplateForm = (key, value) => setTemplateForm((prev) => ({ ...prev, [key]: value }));
  const updatePreferencesForm = (key, value) => setPreferencesForm((prev) => ({ ...prev, [key]: value }));
  const updateSecurityForm = (key, value) => setSecurityForm((prev) => ({ ...prev, [key]: value }));
  const updateRolePermission = (role, key, value) => setPermissionsForm((prev) => ({
    ...prev,
    [role]: {
      ...(prev[role] || {}),
      [key]: value,
    },
  }));

  const saveSchoolInformation = async () => {
    try {
      setSavingKey("school");
      await axios.patch(`${dbRoot}/schoolInfo.json`, {
        name: schoolForm.name,
        shortName: schoolForm.shortName,
        logoUrl: schoolForm.logoUrl,
        phone: schoolForm.phone,
        email: schoolForm.email,
        website: schoolForm.website,
        motto: schoolForm.motto,
        city: schoolForm.city,
        region: schoolForm.region,
        country: schoolForm.country,
        address: {
          ...(schoolInfo.address || {}),
          line1: schoolForm.addressLine,
          city: schoolForm.city,
          region: schoolForm.region,
          country: schoolForm.country,
        },
      });
      setSchoolInfo((prev) => ({
        ...prev,
        name: schoolForm.name,
        shortName: schoolForm.shortName,
        logoUrl: schoolForm.logoUrl,
        phone: schoolForm.phone,
        email: schoolForm.email,
        website: schoolForm.website,
        motto: schoolForm.motto,
        city: schoolForm.city,
        region: schoolForm.region,
        country: schoolForm.country,
        address: {
          ...(prev.address || {}),
          line1: schoolForm.addressLine,
          city: schoolForm.city,
          region: schoolForm.region,
          country: schoolForm.country,
        },
      }));
      notify("success", "School information updated.");
    } catch (error) {
      console.error("Failed to save school information:", error);
      notify("error", "Failed to save school information.");
    } finally {
      setSavingKey("");
    }
  };

  const saveAcademicConfiguration = async () => {
    try {
      setSavingKey("academic");
      const nextSettings = {
        ...(schoolInfo.settings || {}),
        academic: {
          ...((schoolInfo.settings || {}).academic || {}),
          sectionNamingSystem: academicForm.sectionNamingSystem,
          promotionPassMark: Number(academicForm.promotionPassMark || 0),
          maxStudentsPerSection: Number(academicForm.maxStudentsPerSection || 0),
        },
      };
      await axios.patch(`${dbRoot}/schoolInfo.json`, {
        currentAcademicYear: academicForm.currentAcademicYear,
        settings: nextSettings,
      });
      setSchoolInfo((prev) => ({
        ...prev,
        currentAcademicYear: academicForm.currentAcademicYear,
        settings: {
          ...(prev.settings || {}),
          academic: {
            ...((prev.settings || {}).academic || {}),
            sectionNamingSystem: academicForm.sectionNamingSystem,
            promotionPassMark: Number(academicForm.promotionPassMark || 0),
            maxStudentsPerSection: Number(academicForm.maxStudentsPerSection || 0),
          },
        },
      }));
      syncSettingsCache(nextSettings);
      notify("success", "Academic configuration updated.");
    } catch (error) {
      console.error("Failed to save academic configuration:", error);
      notify("error", "Failed to save academic configuration.");
    } finally {
      setSavingKey("");
    }
  };

  const saveTemplates = async () => {
    try {
      setSavingKey("templates");
      const nextSettings = {
        ...(schoolInfo.settings || {}),
        documentTemplates: { ...templateForm },
      };
      await axios.patch(`${dbRoot}/schoolInfo.json`, {
        settings: nextSettings,
      });
      setSchoolInfo((prev) => ({
        ...prev,
        settings: {
          ...(prev.settings || {}),
          documentTemplates: { ...templateForm },
        },
      }));
      syncSettingsCache(nextSettings);
      notify("success", "Document template defaults updated.");
    } catch (error) {
      console.error("Failed to save document templates:", error);
      notify("error", "Failed to save document templates.");
    } finally {
      setSavingKey("");
    }
  };

  const savePreferences = async () => {
    try {
      setSavingKey("preferences");
      const nextSettings = {
        ...(schoolInfo.settings || {}),
        preferences: { ...preferencesForm },
      };
      await axios.patch(`${dbRoot}/schoolInfo.json`, {
        settings: nextSettings,
      });
      setSchoolInfo((prev) => ({
        ...prev,
        settings: {
          ...(prev.settings || {}),
          preferences: { ...preferencesForm },
        },
      }));
      syncSettingsCache(nextSettings);
      notify("success", "System preferences updated.");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      notify("error", "Failed to save system preferences.");
    } finally {
      setSavingKey("");
    }
  };

  const savePermissions = async () => {
    try {
      setSavingKey("permissions");
      const nextSettings = {
        ...(schoolInfo.settings || {}),
        permissions: { ...permissionsForm },
      };

      await axios.patch(`${dbRoot}/schoolInfo.json`, {
        settings: nextSettings,
      });

      setSchoolInfo((prev) => ({
        ...prev,
        settings: {
          ...(prev.settings || {}),
          permissions: { ...permissionsForm },
        },
      }));

      syncSettingsCache(nextSettings);
      notify("success", `${selectedRole.charAt(0).toUpperCase()}${selectedRole.slice(1)} permissions updated.`);
    } catch (error) {
      console.error("Failed to save permissions:", error);
      notify("error", "Failed to save role permissions.");
    } finally {
      setSavingKey("");
    }
  };

  const saveSecurity = async () => {
    if (securityForm.newPassword && securityForm.newPassword !== securityForm.confirmPassword) {
      notify("error", "New password and confirmation do not match.");
      return;
    }

    const twoFactorSecret = securityForm.twoFactorEnabled
      ? (securityForm.twoFactorSecret || generateSecret())
      : "";
    const twoFactorRecoveryCodes = securityForm.twoFactorEnabled
      ? (securityForm.twoFactorRecoveryCodes?.length ? securityForm.twoFactorRecoveryCodes : buildRecoveryCodes())
      : [];

    const twoFactorResult = securityForm.twoFactorEnabled
      ? await verify({
          secret: twoFactorSecret,
          token: String(twoFactorCode || "").trim(),
        }).catch(() => ({ valid: false }))
      : { valid: true };

    if (securityForm.twoFactorEnabled && !twoFactorResult.valid) {
      notify("error", "Enter a valid authenticator code to enable two-factor authentication.");
      return;
    }

    try {
      setSavingKey("security");

      const userPatch = {
        name: securityForm.name,
        username: securityForm.username,
      };

      if (securityForm.newPassword) {
        userPatch.password = securityForm.newPassword;
      }

      if (admin.userId) {
        await axios.patch(`${dbRoot}/Users/${admin.userId}.json`, userPatch);
      }

      let nextProfileImage = profileImage;

      if (selectedProfileFile && admin.userId) {
        // Upload to Firebase Storage — store a URL in RTDB instead of a base64 blob
        const ext = selectedProfileFile.name.split(".").pop() || "jpg";
        const imgRef = storageRef(storage, `profileImages/register/${admin.userId}.${ext}`);
        await uploadBytes(imgRef, selectedProfileFile, { contentType: selectedProfileFile.type || "image/jpeg" });
        const nextProfileImage = await getDownloadURL(imgRef);
        await axios.patch(`${dbRoot}/Users/${admin.userId}.json`, { profileImage: nextProfileImage });
        setProfileImage(nextProfileImage);
        const updatedAdmin = { ...admin, profileImage: nextProfileImage, name: securityForm.name, username: securityForm.username };
        persistAdmin(updatedAdmin);
      } else {
        persistAdmin({ ...admin, name: securityForm.name, username: securityForm.username, role: currentRole });
      }

      const nextSettings = {
        ...(schoolInfo.settings || {}),
        security: {
          ...((schoolInfo.settings || {}).security || {}),
          sessionTimeout: Number(securityForm.sessionTimeout || 0),
          twoFactorEnabled: Boolean(securityForm.twoFactorEnabled),
          twoFactorSecret,
          twoFactorRecoveryCodes,
        },
      };

      await axios.patch(`${dbRoot}/schoolInfo.json`, {
        settings: nextSettings,
      });

      setSelectedProfileFile(null);
      setSecurityForm((prev) => ({
        ...prev,
        newPassword: "",
        confirmPassword: "",
        twoFactorSecret,
        twoFactorRecoveryCodes,
      }));
      setTwoFactorCode("");
      syncSettingsCache(nextSettings);
      notify("success", "Security and account settings updated.");
    } catch (error) {
      console.error("Failed to save security settings:", error);
      notify("error", "Failed to update security settings.");
    } finally {
      setSavingKey("");
    }
  };

  const exportSchoolData = async () => {
    try {
      setSavingKey("backupExport");
      const response = await axios.get(`${dbRoot}.json`).catch(() => ({ data: {} }));
      downloadJsonFile(`register-backup-${schoolCode || "school"}-${Date.now()}.json`, response.data || {});
      notify("success", "School backup downloaded.");
    } catch (error) {
      console.error("Failed to export school backup:", error);
      notify("error", "Failed to export school data.");
    } finally {
      setSavingKey("");
    }
  };

  const createCloudSnapshot = async () => {
    if (!backupRoot) {
      notify("error", "Missing school code. Cannot create backup snapshot.");
      return;
    }

    try {
      setSavingKey("backupSnapshot");
      const response = await axios.get(`${dbRoot}.json`).catch(() => ({ data: {} }));
      const snapshotId = `${Date.now()}`;
      await axios.put(`${backupRoot}/${snapshotId}.json`, {
        createdAt: new Date().toISOString(),
        createdBy: admin.userId || admin.username || "registerer",
        data: response.data || {},
      });
      setBackupStats((prev) => ({ snapshots: prev.snapshots + 1, lastSnapshot: new Date().toISOString() }));
      notify("success", "Cloud snapshot created.");
    } catch (error) {
      console.error("Failed to create cloud snapshot:", error);
      notify("error", "Failed to create cloud backup snapshot.");
    } finally {
      setSavingKey("");
    }
  };

  const restoreSchoolBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setSavingKey("backupRestore");
      const text = await file.text();
      const parsed = JSON.parse(text || "{}");

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        notify("error", "Backup file is not a valid school data export.");
        return;
      }

      if (!window.confirm("Restore this backup? This will replace the current school data.")) {
        return;
      }

      if (backupRoot) {
        const currentData = await axios.get(`${dbRoot}.json`).catch(() => ({ data: {} }));
        await axios.put(`${backupRoot}/pre_restore_${Date.now()}.json`, {
          createdAt: new Date().toISOString(),
          createdBy: admin.userId || admin.username || "registerer",
          reason: "Automatic snapshot before restore",
          data: currentData.data || {},
        });
      }

      await axios.put(`${dbRoot}.json`, parsed);
      syncSettingsCache(parsed.schoolInfo || parsed);
      notify("success", "Backup restored. Reloading settings...");
      window.location.reload();
    } catch (error) {
      console.error("Failed to restore backup:", error);
      notify("error", "Failed to restore backup file.");
    } finally {
      setSavingKey("");
    }
  };

  const pageStyle = {
    padding: "10px 4px 28px",
    minWidth: 0,
    boxSizing: "border-box",
    color: "var(--text-primary)",
  };
  const shellStyle = {
    width: "min(100%, 1220px)",
    margin: 0,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.75fr) minmax(320px, 0.9fr)",
    gap: 14,
    alignItems: "start",
  };
  const panelStyle = {
    background: "var(--surface-panel)",
    border: "1px solid var(--border-soft)",
    borderRadius: 16,
    boxShadow: "var(--shadow-soft)",
  };
  const sectionStyle = {
    ...panelStyle,
    padding: 18,
  };
  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-secondary)",
  };
  const inputStyle = {
    width: "100%",
    border: "1px solid var(--input-border)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    outline: "none",
  };
  const textareaStyle = {
    ...inputStyle,
    minHeight: 94,
    resize: "vertical",
  };
  const primaryButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid var(--accent-strong)",
    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%)",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "var(--shadow-glow)",
  };
  const subtleButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid var(--border-strong)",
    background: "var(--surface-panel)",
    color: "var(--accent-strong)",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  };

  return (
    <div style={pageStyle}>
      <div style={{ width: "min(100%, 1220px)", margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="section-header-card" style={{ padding: 20 }}>
          <div className="section-header-card__row">
            <div>
              <h1 className="section-header-card__title" style={{ fontSize: 28, fontWeight: 900 }}>Settings</h1>
              <p className="section-header-card__subtitle" style={{ fontSize: 14 }}>
                A cleaner registrar settings workspace with school information, academic configuration, user tools, templates, and security in one place.
              </p>
            </div>
            <div className="section-header-card__actions">
              <span className="section-header-card__chip">School: {schoolCode || "Unknown"}</span>
              <span className="section-header-card__chip">{loading ? "Loading..." : `Users: ${counts.registerers + counts.teachers}`}</span>
            </div>
          </div>
        </div>

        {feedback.text ? (
          <div
            style={{
              ...panelStyle,
              padding: "12px 14px",
              borderColor: feedback.type === "error" ? "var(--danger-border)" : "var(--border-strong)",
              background: feedback.type === "error" ? "var(--danger-soft)" : "var(--surface-accent)",
              color: feedback.type === "error" ? "var(--danger)" : "var(--accent-strong)",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {feedback.text}
          </div>
        ) : null}

        <div style={shellStyle}>
          <div style={{ display: "grid", gap: 14 }}>
            <SchoolInformationPanel
              schoolForm={schoolForm}
              updateSchoolForm={updateSchoolForm}
              savingKey={savingKey}
              saveSchoolInformation={saveSchoolInformation}
            />

            <AcademicConfigurationPanel
              academicForm={academicForm}
              updateAcademicForm={updateAcademicForm}
              savingKey={savingKey}
              saveAcademicConfiguration={saveAcademicConfiguration}
              counts={counts}
              loading={loading}
            />

            <UserManagementPanel counts={counts} loading={loading} />

            <DocumentTemplatesPanel
              templateForm={templateForm}
              updateTemplateForm={updateTemplateForm}
              savingKey={savingKey}
              saveTemplates={saveTemplates}
            />

            <SecuritySettingsPanel
              securityForm={securityForm}
              updateSecurityForm={updateSecurityForm}
              profileImage={profileImage}
              setSelectedProfileFile={setSelectedProfileFile}
              savingKey={savingKey}
              saveSecurity={saveSecurity}
              twoFactorCode={twoFactorCode}
              setTwoFactorCode={setTwoFactorCode}
            />
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <SystemPreferencesPanel
              preferencesForm={preferencesForm}
              updatePreferencesForm={updatePreferencesForm}
              savingKey={savingKey}
              savePreferences={savePreferences}
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
            />
            <RolesNotificationsPanel
              preferencesForm={preferencesForm}
              updatePreferencesForm={updatePreferencesForm}
              permissionsForm={permissionsForm}
              updateRolePermission={updateRolePermission}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              savingKey={savingKey}
              savePermissions={savePermissions}
            />
            <BackupDataPanel
              savingKey={savingKey}
              exportSchoolData={exportSchoolData}
              createCloudSnapshot={createCloudSnapshot}
              onRestoreFile={restoreSchoolBackup}
              dbRoot={dbRoot}
              backupStats={backupStats}
              preferencesForm={preferencesForm}
            />
            <SystemInformationPanel systemInfo={systemInfo} />
          </div>
        </div>
      </div>
    </div>
  );
}
