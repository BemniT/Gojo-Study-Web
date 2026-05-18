import React from "react";

export default function MessageActionMenu(props) {
  const { imageMenu, setImageMenu, handleDownloadImage, handleDeleteMessage, textMenu, setTextMenu, startEditing } = props;

  return (
    <>
      {imageMenu.open ? (
        <div onClick={() => setImageMenu({ open: false, message: null })} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.45)", zIndex: 1250, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 18 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(420px, 96vw)", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 20px 45px rgba(2,6,23,0.3)", overflow: "hidden" }}>
            <button onClick={async () => { await handleDownloadImage(imageMenu.message); setImageMenu({ open: false, message: null }); }} style={{ width: "100%", border: "none", background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 16px", textAlign: "left", fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>Download image</button>
            {imageMenu?.message?.isTeacher ? (
              <button onClick={() => { if (imageMenu?.message?.id) { handleDeleteMessage(imageMenu.message.id); } setImageMenu({ open: false, message: null }); }} style={{ width: "100%", border: "none", background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 16px", textAlign: "left", fontWeight: 700, color: "#b91c1c", cursor: "pointer" }}>Delete image</button>
            ) : null}
            <button onClick={() => setImageMenu({ open: false, message: null })} style={{ width: "100%", border: "none", background: "#fff", padding: "14px 16px", textAlign: "left", fontWeight: 700, color: "#475569", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : null}

      {textMenu.open ? (
        <div onClick={() => setTextMenu({ open: false, message: null })} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.45)", zIndex: 1251, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 18 }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(420px, 96vw)", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 20px 45px rgba(2,6,23,0.3)", overflow: "hidden" }}>
            <button onClick={() => { if (textMenu?.message?.id) { startEditing(textMenu.message.id, textMenu?.message?.text || ""); } setTextMenu({ open: false, message: null }); }} style={{ width: "100%", border: "none", background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 16px", textAlign: "left", fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>Edit message</button>
            <button onClick={() => { if (textMenu?.message?.id) { handleDeleteMessage(textMenu.message.id); } setTextMenu({ open: false, message: null }); }} style={{ width: "100%", border: "none", background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 16px", textAlign: "left", fontWeight: 700, color: "#b91c1c", cursor: "pointer" }}>Delete message</button>
            <button onClick={() => setTextMenu({ open: false, message: null })} style={{ width: "100%", border: "none", background: "#fff", padding: "14px 16px", textAlign: "left", fontWeight: 700, color: "#475569", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
