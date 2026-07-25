import React, { useState } from 'react';

const COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500'
];

export default function Avatar({
  name = 'Anonymous',
  src = null,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const cleanName = name.trim();
  
  // Deterministic bg color selection
  const charCodeSum = cleanName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bgClass = COLORS[charCodeSum % COLORS.length];

  // Initials extraction
  const initials = cleanName
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isNumericSize = typeof size === 'number';
  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
    xl: 'h-16 w-16 text-lg'
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full text-white font-extrabold uppercase select-none overflow-hidden flex-shrink-0 ${
        src && !hasError ? 'bg-transparent' : bgClass
      } ${!isNumericSize ? sizeClasses[size] : ''} ${className}`}
      style={isNumericSize ? { width: size, height: size, fontSize: size * 0.38 } : {}}
      title={cleanName}
      {...props}
    >
      {src && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={cleanName}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials || '?'}</span>
      )}
    </div>
  );
}
