import React, { useMemo, useState } from "react";
import { isActiveRecord } from "../../utils/studentHelpers";
import styles from "./Admins.module.css";

const normalizeValueForCompare = (value) => String(value ?? "").trim().toLowerCase();

const normalizeFieldLabel = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatDateTime = (value) => {
  if (!value && value !== 0) return "";
  const asNumber = Number(value);
  const date = Number.isFinite(asNumber) && asNumber > 0 ? new Date(asNumber) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const uniqueRows = (rows = [], blocked = new Set()) => {
  const seen = new Set();
  return rows.filter((row) => {
    const label = normalizeFieldLabel(row?.label);
    const value = String(row?.value || "").trim();
    if (!label || !value) return false;

    const valueKey = normalizeValueForCompare(value);
    const labelKey = normalizeValueForCompare(label);
    const signature = `${labelKey}__${valueKey}`;

    if (seen.has(signature)) return false;
    if (blocked.has(valueKey)) return false;

    seen.add(signature);
    return true;
  });
};

function InfoCell({ label, value, span }) {
  return (
    <div className={`${styles.infoCell} ${span ? styles.infoCellSpan : ""}`}>
      <div className={styles.infoLabel}>{label}</div>
      <div className={styles.infoValue}>{value || "-"}</div>
    </div>
  );
}

function AdminDetailPanel({ selectedAdmin, isPortrait, onClose }) {
  const [adminTab, setAdminTab] = useState("details");

  const detailBlockedValues = useMemo(() => {
    if (!selectedAdmin) return new Set();

    const blockedValues = [
      selectedAdmin.adminId,
      selectedAdmin.userId,
      selectedAdmin.source,
      selectedAdmin.email,
      selectedAdmin.phone,
      selectedAdmin.title,
      selectedAdmin.role,
      selectedAdmin.department,
      selectedAdmin.office,
      selectedAdmin.position,
      selectedAdmin.schoolCode,
      selectedAdmin.status,
      selectedAdmin.username,
      selectedAdmin.name,
    ].map(normalizeValueForCompare);

    return new Set(blockedValues.filter(Boolean));
  }, [selectedAdmin]);

  const statusRows = useMemo(() => {
    if (!selectedAdmin) return [];

    const record = selectedAdmin.record || {};
    const user = selectedAdmin.user || {};

    const rows = [
      ["Last Login", formatDateTime(user?.lastLogin || record?.lastLogin)],
      ["Updated At", formatDateTime(user?.updatedAt || record?.updatedAt)],
      ["Created At", formatDateTime(user?.createdAt || record?.createdAt)],
      ["Access Level", user?.accessLevel || record?.accessLevel],
      ["Primary Department", user?.primaryDepartment || record?.primaryDepartment],
      ["Shift", user?.shift || record?.shift],
      ["Employment Type", user?.employmentType || record?.employmentType],
    ].map(([label, value]) => ({ label, value: String(value || "").trim() }));

    return uniqueRows(rows, detailBlockedValues);
  }, [selectedAdmin, detailBlockedValues]);

  const notesRows = useMemo(() => {
    if (!selectedAdmin) return [];

    const record = selectedAdmin.record || {};
    const user = selectedAdmin.user || {};
    const blocked = new Set([...detailBlockedValues]);
    statusRows.forEach((item) => blocked.add(normalizeValueForCompare(item?.value)));

    const candidateEntries = [
      ["Responsibilities", selectedAdmin?.responsibility || record?.responsibility],
      ["Summary", record?.summary || user?.summary],
      ["Bio", record?.bio || user?.bio],
      ["Specialization", record?.specialization || user?.specialization],
      ["Qualification", record?.qualification || user?.qualification],
      ["Experience", record?.experience || user?.experience],
      ["Office Hours", record?.officeHours || user?.officeHours],
      ["Address", record?.address || user?.address],
      ["Notes", record?.notes || user?.notes],
      ["Remarks", record?.remarks || user?.remarks],
      ["Emergency Contact", record?.emergencyContact || user?.emergencyContact],
      ["Alternate Phone", record?.alternatePhone || user?.alternatePhone],
    ];

    const rows = candidateEntries.map(([label, value]) => {
      if (value && typeof value === "object") {
        return {
          label,
          value: Object.entries(value)
            .map(([key, itemValue]) => `${normalizeFieldLabel(key)}: ${String(itemValue || "").trim()}`)
            .filter(Boolean)
            .join(" | "),
        };
      }
      return { label, value: String(value || "").trim() };
    });

    return uniqueRows(rows, blocked);
  }, [selectedAdmin, detailBlockedValues, statusRows]);

  if (!selectedAdmin) return null;

  return (
    <>
      <div className={styles.detailOverlay} onClick={onClose} />
      <aside
        className={styles.detailPanel}
        style={{
          width: isPortrait ? "100%" : "380px",
          height: isPortrait ? "100vh" : "calc(100vh - 55px)",
          top: isPortrait ? 0 : "55px",
          borderLeft: isPortrait ? "none" : "1px solid var(--border-soft)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <button onClick={onClose} className={styles.detailCloseButton}>x</button>

        <div className={styles.detailHero}>
          <div className={styles.detailAvatarFrame}>
            <img src={selectedAdmin.profileImage} alt={selectedAdmin.name} className={styles.detailAvatar} />
          </div>
          <h3 className={styles.detailName}>{selectedAdmin.name}</h3>
          <div className={styles.detailMeta}>{selectedAdmin.username || selectedAdmin.email}</div>
        </div>

        <div className={styles.tabBar}>
          {["details", "status", "notes"].map((tab) => (
            <button
              key={tab}
              onClick={() => setAdminTab(tab)}
              className={`${styles.tabButton} ${adminTab === tab ? styles.tabButtonActive : ""}`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {adminTab === "details" && (
          <div className={styles.panelCard}>
            <div className={styles.sectionTitleSmall}>Management Profile</div>
            <div className={styles.infoGrid}>
              <InfoCell label="ID" value={selectedAdmin.adminId || selectedAdmin.userId} />
              <InfoCell label="Source" value={String(selectedAdmin.source || "management").replace("_", " ")} />
              <InfoCell label="Email" value={selectedAdmin.email} />
              <InfoCell label="Phone" value={selectedAdmin.phone} />
              <InfoCell label="Title" value={selectedAdmin.title} />
              <InfoCell label="Role" value={selectedAdmin.role} />
              <InfoCell label="Department" value={selectedAdmin.department} />
              <InfoCell label="Office" value={selectedAdmin.office} />
              <InfoCell label="Position" value={selectedAdmin.position} />
              <InfoCell label="School Code" value={selectedAdmin.schoolCode} />
              <InfoCell
                label="Status"
                value={selectedAdmin.status ? `${selectedAdmin.status.charAt(0).toUpperCase()}${selectedAdmin.status.slice(1)}` : ""}
              />
              <InfoCell label="User ID" value={selectedAdmin.userId} span />
            </div>
          </div>
        )}

        {adminTab === "status" && (
          <div className={styles.panelCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div className={styles.sectionTitleSmall}>Current Status</div>
              <span className={`${styles.statusBadge} ${isActiveRecord(selectedAdmin?.record || selectedAdmin?.user) ? styles.statusActive : styles.statusInactive}`}>
                {isActiveRecord(selectedAdmin?.record || selectedAdmin?.user) ? "Active" : "Inactive"}
              </span>
            </div>

            {statusRows.length === 0 ? (
              <div style={{ fontSize: 11, color: "#64748b" }}>No additional status information found.</div>
            ) : (
              <div className={styles.infoGrid}>
                {statusRows.map((item, index) => (
                  <InfoCell key={`${item.label}-${index}`} label={item.label} value={item.value} />
                ))}
              </div>
            )}
          </div>
        )}

        {adminTab === "notes" && (
          <div className={styles.panelCard}>
            <div className={styles.sectionTitleSmall}>Notes and Context</div>
            {notesRows.length === 0 ? (
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
                No unique notes available beyond Details and Status for this profile.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {notesRows.map((item, index) => (
                  <div key={`${item.label}-${index}`} className={styles.infoCell}>
                    <div className={styles.infoLabel}>{item.label}</div>
                    <div className={styles.infoValue}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export default AdminDetailPanel;
