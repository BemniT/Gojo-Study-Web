import React from 'react';
import AvatarBadge from '../AvatarBadge';
import { formatFileSize } from '../../utils/imageCompress';

export default function ProfileImageCard({
  resolvedPreviewImage,
  displayName,
  fallbackName,
  profileImage,
  profileImageMeta,
  isOptimizingImage,
  onFileChange,
}) {
  return (
    <div className="settings-panel" style={{ padding: 22 }}>
      <div style={{ width: 180, height: 180, borderRadius: 28, overflow: 'hidden', margin: '0 auto', background: 'var(--surface-muted)', boxShadow: '0 18px 34px rgba(15, 23, 42, 0.08)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AvatarBadge
          src={resolvedPreviewImage}
          name={displayName || fallbackName || 'HR Officer'}
          size={180}
          fontSize={52}
          radius="28px"
        />
      </div>

      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{displayName || fallbackName || 'HR Officer'}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>Profile image used across the HR portal.</div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="settings-soft-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 76, padding: '16px 18px', borderRadius: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Update profile photo</span>
            <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-muted)' }}>Use a clear square photo for better display across employee-facing views. Images are compressed to JPEG before upload.</span>
          </div>
          <label htmlFor="hr-settings-image" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 146, minHeight: 42, padding: '0 16px', borderRadius: 999, border: '1px solid var(--border-strong)', background: 'var(--surface-accent)', color: 'var(--accent)', fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
            {isOptimizingImage ? 'Optimizing...' : typeof profileImage === 'string' ? 'Choose image' : 'Change image'}
          </label>
          <input id="hr-settings-image" type="file" accept="image/*" onChange={onFileChange} className="settings-hidden-file" />
        </div>
        {profileImageMeta ? (
          <div style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid var(--border-soft)', background: 'var(--surface-muted)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
            Optimized from {formatFileSize(profileImageMeta.originalSize)} to {formatFileSize(profileImageMeta.finalSize)}{profileImageMeta.wasConvertedToJpeg ? ' as JPEG' : ''}.
          </div>
        ) : null}
      </div>
    </div>
  );
}
