import React, { useEffect, useState } from 'react';

const getInitials = (name) =>
  (name || 'Employee')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'E';

export default function AvatarBadge({
  src,
  name,
  size = 44,
  fontSize = 14,
  radius = '50%',
  loading = 'eager',
  decoding = 'auto',
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: 'linear-gradient(135deg, #f2f7ff 0%, #e4eefc 100%)',
          border: '1px solid #d9e5f5',
          color: '#1f4f96',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          fontWeight: 800,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Employee'}
      loading={loading}
      decoding={decoding}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', border: '1px solid #d9e5f5', flexShrink: 0 }}
    />
  );
}
