import React, { useEffect, useState } from 'react';
import { createProfilePlaceholder, resolveAvatarImage } from '../../../utils/profileImage';

export default function Avatar({ src, alt, name, size = 40, style = {}, imageStyle = {}, textSize = 14 }) {
  const [hasImageError, setHasImageError] = useState(false);
  const displayName = name || alt || 'User';
  const resolvedSrc = hasImageError
    ? createProfilePlaceholder(displayName)
    : resolveAvatarImage(displayName, src);

  useEffect(() => { setHasImageError(false); }, [src]);

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    border: '1px solid var(--border-soft, #dbe2f2)',
    color: 'var(--accent-strong, #007AFB)',
    fontWeight: 800,
    letterSpacing: '0.04em',
    userSelect: 'none',
    ...style,
  };

  return (
    <div style={baseStyle}>
      <img
        src={resolvedSrc}
        alt={alt || name || 'User avatar'}
        onError={(event) => {
          const fallbackSrc = createProfilePlaceholder(displayName);
          if (event.currentTarget.src !== fallbackSrc) {
            event.currentTarget.src = fallbackSrc;
          }
          setHasImageError(true);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...imageStyle }}
      />
    </div>
  );
}
