import React from "react";
import { useNavigate } from "react-router-dom";
import { FaFacebookMessenger, FaCommentDots } from "react-icons/fa";

const BUTTON_BASE = {
  position: "fixed",
  width: "140px",
  height: "48px",
  borderRadius: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 10,
  padding: "0 12px",
  color: "#fff",
  cursor: "pointer",
  boxShadow: "var(--shadow-glow)",
  transition: "transform 0.16s ease",
};

const ICON_BOX = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "rgba(255,255,255,0.14)",
};

const BADGE_BASE = {
  position: "absolute",
  top: -8,
  right: 8,
  color: "#fff",
  borderRadius: "999px",
  fontSize: 10,
  fontWeight: 800,
  padding: "2px 6px",
  border: "2px solid #fff",
  lineHeight: 1,
};

export default function StudentChatActionButtons({ selectedStudent, studentChatOpen, stackChatActions }) {
  const navigate = useNavigate();

  if (!selectedStudent || studentChatOpen) return null;

  const openParentChat = () => {
    if (!selectedStudent?.userId) {
      alert("Please select a student first.");
      return;
    }
    const firstParent = (selectedStudent?.parents || [])[0];
    if (!firstParent?.userId) {
      alert("No parent found for this student.");
      return;
    }
    navigate("/all-chat", {
      state: {
        user: {
          userId: firstParent.userId,
          name: firstParent.name || selectedStudent.parentName || "Parent",
          profileImage: firstParent.profileImage || "/default-profile.png",
          type: "parent",
        },
      },
    });
  };

  const openStudentChat = () => {
    if (!selectedStudent?.userId) {
      alert("Please select a student first.");
      return;
    }
    navigate("/all-chat", {
      state: {
        user: {
          userId: selectedStudent.userId,
          name: selectedStudent.name,
          profileImage: selectedStudent.profileImage,
          type: "student",
        },
      },
    });
  };

  return (
    <>
      {/* Parent Chat */}
      <div
        onClick={openParentChat}
        title="Chat with student's parent"
        style={{
          ...BUTTON_BASE,
          bottom: stackChatActions ? "78px" : "20px",
          right: stackChatActions ? "20px" : "220px",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--success) 78%, #0f172a), var(--success))",
          zIndex: 1100,
        }}
      >
        <span style={ICON_BOX}>
          <FaFacebookMessenger size={18} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>Parent Chat</span>
        </div>
        <span style={{ ...BADGE_BASE, background: "color-mix(in srgb, var(--success) 42%, #04130b)" }}>P</span>
      </div>

      {/* Student Chat */}
      <div
        onClick={openStudentChat}
        title="Chat with student"
        style={{
          ...BUTTON_BASE,
          bottom: "20px",
          right: "20px",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-strong) 45%, #7c3aed), var(--accent))",
          zIndex: 1000,
        }}
      >
        <span style={ICON_BOX}>
          <FaCommentDots size={18} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>Student Chat</span>
        </div>
        <span style={{ ...BADGE_BASE, background: "color-mix(in srgb, var(--accent-strong) 28%, #020617)" }}>S</span>
      </div>
    </>
  );
}
