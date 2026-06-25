import React from 'react';
import { FaTimes } from 'react-icons/fa';

export default function ImagePreviewModal({ url, onClose }) {
  if (!url) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <button
        type="button"
        onClick={onClose}
        style={{ position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(15,23,42,0.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        aria-label="Close image"
      >
        <FaTimes />
      </button>
      <img src={url} alt="Preview" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 14 }} />
    </div>
  );
}
