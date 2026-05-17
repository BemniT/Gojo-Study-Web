import React from "react";
import { FaTimes } from "react-icons/fa";

export default function ImagePreviewOverlay({ previewImageUrl, setPreviewImageUrl }) {
  if (!previewImageUrl) return null;

  return (
    <div onClick={() => setPreviewImageUrl("")} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.85)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <button onClick={() => setPreviewImageUrl("")} style={{ position: "absolute", top: 18, right: 18, width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(15,23,42,0.5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Close image">
        <FaTimes />
      </button>
      <img src={previewImageUrl} alt="Preview" onClick={(event) => event.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 14 }} />
    </div>
  );
}
