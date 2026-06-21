import React from 'react';

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];

function Avatar({ name = 'Anonymous', size = 36 }) {
  const cleanName = name.trim();
  const color = COLORS[cleanName.charCodeAt(0) % COLORS.length];
  const initials = cleanName
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0
      }}
      title={cleanName}
    >
      {initials || '?'}
    </div>
  );
}

export default Avatar;
