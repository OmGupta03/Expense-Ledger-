import React from 'react';

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) {
  return (
    <div
      className={`bg-bg-secondary border border-border-custom rounded-3xl p-6 shadow-sm ${
        hoverEffect ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-255' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
