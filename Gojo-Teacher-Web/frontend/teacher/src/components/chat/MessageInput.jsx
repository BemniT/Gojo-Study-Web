import React from "react";
import { FaImage, FaPaperPlane } from "react-icons/fa";

export default function MessageInput(props) {
  const { imageInputRef, imageSending, isMobile, sendImageMessage, imageInputClick, input, setInput, editingMessages, sendMessage } = props;

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10, padding: 8, borderRadius: 14, background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 14px rgba(15,23,42,0.06)" }}>
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={sendImageMessage} />
      <button onClick={imageInputClick} style={{ width: isMobile ? 42 : 46, height: isMobile ? 42 : 46, borderRadius: "50%", background: "#eff6ff", border: "1px solid #dbeafe", color: "#007AFB", display: "flex", justifyContent: "center", alignItems: "center", cursor: imageSending ? "not-allowed" : "pointer", opacity: imageSending ? 0.65 : 1 }} disabled={imageSending} aria-label="Attach image">
        <FaImage />
      </button>
      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={Object.values(editingMessages).some(Boolean) ? "Edit your message..." : "Type a message..."} style={{ flex: 1, padding: isMobile ? 10 : 12, borderRadius: 999, border: "1px solid #d1d5db", outline: "none", background: "#ffffff", boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)" }} />
      <button onClick={sendMessage} style={{ width: isMobile ? 42 : 46, height: isMobile ? 42 : 46, borderRadius: "50%", background: "#007AFB", border: "none", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 8px 18px rgba(0, 122, 251, 0.25)", cursor: "pointer" }} aria-label="Send message" disabled={imageSending}>
        <FaPaperPlane />
      </button>
    </div>
  );
}
