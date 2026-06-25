import React, { useState } from "react";
import styles from "./Parents.module.css";

const TABS = ["Details", "Children", "Status"];

function DetailCell({ label, value, span }) {
  return (
    <div className={`${styles.detailCell} ${span ? styles.detailCellSpan : ""}`}>
      <div className={styles.detailCellLabel}>{label}</div>
      <div className={styles.detailCellValue}>{value || "—"}</div>
    </div>
  );
}

function DetailsTab({ parent }) {
  return (
    <div className={styles.detailsCard}>
      <div className={styles.detailsSectionTitle}>Parent Details</div>
      <div className={styles.detailsGrid}>
        <DetailCell label="Email" value={parent.email} />
        <DetailCell label="Phone" value={parent.phone} />
        <DetailCell
          label="Relationship(s)"
          value={
            parent.relationships?.length
              ? parent.relationships.join(", ")
              : "—"
          }
        />
        <DetailCell label="Age" value={parent.age} />
        <DetailCell
          label="City"
          value={
            parent.city ||
            (parent.address && typeof parent.address === "object"
              ? parent.address.city
              : null)
          }
        />
        <DetailCell label="Citizenship" value={parent.citizenship} />
        <DetailCell
          label="Status"
          value={
            parent.status
              ? parent.status.charAt(0).toUpperCase() + parent.status.slice(1)
              : "—"
          }
        />
        <DetailCell
          label="Address"
          value={
            typeof parent.address === "string"
              ? parent.address
              : parent.address
              ? parent.address.street || parent.address.city || null
              : null
          }
          span
        />
      </div>
    </div>
  );
}

function ChildrenTab({ parent }) {
  return (
    <div>
      {(parent.children || []).map((c) => (
        <div key={c.studentId} className={styles.childCard}>
          <div className={styles.childCardGlow} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, position: "relative", zIndex: 1 }}>
            <img
              src={c.profileImage}
              alt={c.name}
              onError={(e) => { e.currentTarget.src = "/default-profile.png"; }}
              className={styles.childAvatar}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.childName}>{c.name}</div>
                  <div className={styles.childId}>Student ID: {c.studentId || "—"}</div>
                </div>
                <span className={styles.childRelationBadge}>
                  {c.relationship ? `Relation: ${c.relationship}` : "Child"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                <span className={styles.childGradeChip}>Grade {c.grade || "—"}</span>
                <span className={styles.childSectionChip}>Section {c.section || "—"}</span>
                <span
                  className={styles.childSectionChip}
                  style={{
                    color: c.status === "Active" ? "#166534" : "#92400e",
                    background: c.status === "Active" ? "#dcfce7" : "#fef3c7",
                    border: c.status === "Active" ? "1px solid #86efac" : "1px solid #fcd34d",
                  }}
                >
                  {c.status || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.childMiniGrid}>
            {[
              ["Age", c.age],
              ["City", c.city],
              ["Citizenship", c.citizenship],
            ].map(([label, value]) => (
              <div key={label} className={styles.childMiniCell}>
                <div className={styles.childMiniLabel}>{label}</div>
                <div className={styles.childMiniValue}>{value || "—"}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", paddingTop: 2, position: "relative", zIndex: 1 }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: "linear-gradient(90deg, #93c5fd 0%, #2563eb 100%)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusTab({ parent }) {
  return (
    <div className={styles.statusCard}>
      <div style={{ borderRadius: 12, border: "1px solid #dbeafe", background: "#ffffff", padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1e3a8a" }}>Account Status</div>
          <span className={`${styles.statusBadge} ${parent?.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive}`}>
            {parent?.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: "#334155" }}>
          Joined:{" "}
          {parent?.createdAt ? new Date(parent.createdAt).toLocaleString() : "—"}
        </div>
      </div>

      <div className={styles.detailsGrid}>
        {[
          ["Parent ID", parent?.parentId || parent?.id],
          ["Username", parent?.username],
          ["Role", String(parent?.role || "parent").toUpperCase()],
          ["School Code", parent?.schoolCode],
          ["User ID", parent?.userId, true],
        ].map(([label, value, span]) => (
          <DetailCell key={label} label={label} value={value} span={span} />
        ))}
      </div>

      <div style={{ border: "1px solid var(--border-soft)", background: "#ffffff", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>Verification & Profile</div>
        <div style={{ fontSize: 10, color: "#475569" }}>
          National ID Number: {parent?.nationalIdNumber ? "Provided" : "Not provided"}
        </div>
        <div style={{ fontSize: 10, color: "#475569" }}>
          National ID Image: {parent?.nationalIdImage ? "Uploaded" : "Not uploaded"}
        </div>
        <div style={{ fontSize: 10, color: "#475569" }}>
          Occupation: {parent?.occupation || "Not specified"}
        </div>
      </div>
    </div>
  );
}

function ParentDetailPanel({ selectedParent, isPortrait, onClose }) {
  const [activeTab, setActiveTab] = useState("Details");

  if (!selectedParent) return null;

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
        <button onClick={onClose} className={styles.detailCloseButton}>×</button>

        <div className={styles.detailHero}>
          <div className={styles.detailAvatarFrame}>
            <img
              src={selectedParent.profileImage}
              alt={selectedParent.name}
              onError={(e) => { e.currentTarget.src = "/default-profile.png"; }}
              className={styles.detailAvatar}
            />
          </div>
          <h3 className={styles.detailName}>{selectedParent.name}</h3>
          <div className={styles.detailMeta}>{selectedParent.email}</div>
        </div>

        <div className={styles.tabBar}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`${styles.tabButton} ${activeTab === t ? styles.tabButtonActive : ""}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ paddingBottom: 40 }}>
          {activeTab === "Details" && <DetailsTab parent={selectedParent} />}
          {activeTab === "Children" && <ChildrenTab parent={selectedParent} />}
          {activeTab === "Status" && <StatusTab parent={selectedParent} />}
        </div>
      </aside>
    </>
  );
}

export default ParentDetailPanel;
