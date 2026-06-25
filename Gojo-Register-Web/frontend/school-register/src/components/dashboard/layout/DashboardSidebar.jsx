import React from "react";
import { Link } from "react-router-dom";
import {
  FaHome,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaExchangeAlt,
  FaFolderOpen,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaChevronDown,
} from "react-icons/fa";
import ProfileAvatar from "../../ProfileAvatar";

const SIDEBAR_SECTION_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const SIDEBAR_SECTION_TITLE_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  fontSize: 12,
  fontWeight: 800,
  color: "var(--text-primary)",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "linear-gradient(135deg, var(--surface-accent) 0%, var(--surface-panel) 100%)",
  cursor: "pointer",
};

const SIDEBAR_SECTION_CHILDREN_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginLeft: 10,
  paddingLeft: 10,
  borderLeft: "2px solid var(--border-strong)",
};

const SIDEBAR_LINK_BASE_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  marginLeft: 10,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-secondary)",
  borderRadius: 12,
  background: "var(--surface-muted)",
  border: "1px solid var(--border-soft)",
};

const SIDEBAR_LINK_ACTIVE_STYLE = {
  background: "var(--accent-strong)",
  color: "#ffffff",
  border: "1px solid var(--accent-strong)",
  boxShadow: "var(--shadow-glow)",
};

const SIDEBAR_SECTION_ROUTES = {
  dashboard: ["/dashboard", "/my-posts", "/overview"],
  academic: ["/academic-years", "/grade-management", "/promotion-system"],
  student: ["/students", "/student-register", "/parents"],
  status: ["/transfer-withdrawal"],
  documents: ["/document-generation"],
  reports: ["/analytics"],
  system: ["/settings"],
};

const SECTIONS = [
  {
    key: "dashboard",
    icon: FaHome,
    label: "Dashboard",
    links: [
      { to: "/dashboard", label: "Home" },
      { to: "/my-posts", label: "My Posts" },
      { to: "/overview", label: "Overview" },
    ],
  },
  {
    key: "academic",
    icon: FaUserGraduate,
    label: "Academic",
    links: [
      { to: "/academic-years", label: "Academic Year" },
      { to: "/grade-management", label: "Grade Management" },
      { to: "/promotion-system", label: "Promotion System" },
    ],
  },
  {
    key: "student",
    icon: FaChalkboardTeacher,
    label: "Student",
    links: [
      { to: "/students", label: "Student" },
      { to: "/student-register", label: "Register Student" },
      { to: "/parents", label: "Student Parent" },
    ],
  },
  {
    key: "status",
    icon: FaExchangeAlt,
    label: "Student Status",
    links: [{ to: "/transfer-withdrawal", label: "Transfer & Withdrawal" }],
  },
  {
    key: "documents",
    icon: FaFolderOpen,
    label: "Documents",
    links: [{ to: "/document-generation", label: "Document Generation" }],
  },
  {
    key: "reports",
    icon: FaChartLine,
    label: "Reports",
    links: [{ to: "/analytics", label: "Analytics" }],
  },
  {
    key: "system",
    icon: FaCog,
    label: "System",
    links: [{ to: "/settings", label: "Settings" }],
  },
];

const handleLogout = () => {
  localStorage.removeItem("admin");
  localStorage.removeItem("registrar");
  window.location.href = "/login";
};

export default function DashboardSidebar({
  admin,
  currentPath,
  sidebarSections,
  toggleSidebarSection,
  isOverlayModalOpen,
}) {
  const isSectionActive = (key) =>
    (SIDEBAR_SECTION_ROUTES[key] || []).includes(currentPath);

  const getSectionButtonStyle = (key) =>
    sidebarSections[key] || isSectionActive(key)
      ? {
          ...SIDEBAR_SECTION_TITLE_STYLE,
          background: "linear-gradient(135deg, var(--accent-soft) 0%, var(--surface-accent) 100%)",
          border: isSectionActive(key) ? "2px solid var(--accent)" : "1px solid var(--border-strong)",
          boxShadow: isSectionActive(key) ? "var(--shadow-glow)" : "var(--shadow-soft)",
          color: "var(--text-primary)",
        }
      : SIDEBAR_SECTION_TITLE_STYLE;

  const getLinkStyle = (path) =>
    currentPath === path
      ? { ...SIDEBAR_LINK_BASE_STYLE, ...SIDEBAR_LINK_ACTIVE_STYLE }
      : SIDEBAR_LINK_BASE_STYLE;

  return (
    <div
      className="google-sidebar"
      style={{
        width: "clamp(230px, 16vw, 290px)",
        minWidth: 230,
        padding: 14,
        borderRadius: 24,
        background: "var(--surface-panel)",
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-panel)",
        height: "calc(100vh - 24px)",
        overflowY: "auto",
        alignSelf: "flex-start",
        position: "sticky",
        top: 24,
        scrollbarWidth: "thin",
        scrollbarColor: "transparent transparent",
        opacity: isOverlayModalOpen ? 0.45 : 1,
        filter: isOverlayModalOpen ? "blur(1px)" : "none",
        pointerEvents: isOverlayModalOpen ? "none" : "auto",
        transition: "opacity 180ms ease, filter 180ms ease",
      }}
    >
      {/* Sidebar profile */}
      <div
        className="sidebar-profile"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "16px 14px",
          marginBottom: 8,
          borderRadius: 18,
          background: "linear-gradient(180deg, var(--surface-accent) 0%, var(--surface-panel) 100%)",
          border: "1px solid var(--border-strong)",
          boxShadow: "inset 0 1px 0 color-mix(in srgb, white 8%, transparent)",
        }}
      >
        <div
          className="sidebar-img-circle"
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            overflow: "hidden",
            border: "3px solid var(--border-strong)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <ProfileAvatar
            className="img-circle"
            imageUrl={admin?.profileImage}
            name={admin?.name || "Register Office"}
            alt={admin?.name || "profile"}
            size={58}
          />
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--surface-accent)",
            border: "1px solid var(--border-strong)",
            color: "var(--accent)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Register Office
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 800,
            color: "var(--text-primary)",
            textAlign: "center",
          }}
        >
          {admin?.name || "Admin Name"}
        </h3>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
          {admin?.adminId || "username"}
        </p>
      </div>

      {/* Sidebar menu */}
      <div
        className="sidebar-menu"
        style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}
      >
        {SECTIONS.map(({ key, icon: Icon, label, links }) => (
          <div key={key} style={SIDEBAR_SECTION_STYLE}>
            <button
              type="button"
              onClick={() => toggleSidebarSection(key)}
              style={getSectionButtonStyle(key)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon style={{ width: 15, height: 15, color: "var(--accent-strong)" }} /> {label}
              </span>
              <FaChevronDown
                style={{
                  width: 12,
                  height: 12,
                  color: "var(--accent)",
                  transform: sidebarSections[key] ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 160ms ease",
                }}
              />
            </button>
            {sidebarSections[key] ? (
              <div style={SIDEBAR_SECTION_CHILDREN_STYLE}>
                {links.map((link) => (
                  <Link
                    key={link.to}
                    className="sidebar-btn"
                    to={link.to}
                    style={getLinkStyle(link.to)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        <button
          className="sidebar-btn logout-btn"
          onClick={handleLogout}
          style={{
            ...SIDEBAR_LINK_BASE_STYLE,
            marginLeft: 0,
            justifyContent: "center",
            color: "var(--danger)",
            background: "var(--danger-soft)",
            border: "1px solid var(--danger-border)",
          }}
        >
          <FaSignOutAlt style={{ width: 15, height: 15 }} /> Logout
        </button>
      </div>
    </div>
  );
}
