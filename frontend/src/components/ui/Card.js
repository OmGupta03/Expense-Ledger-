import React from 'react';

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) {
  return (
    <div
      className={`stitch-glass-card border border-emerald-900/60 bg-[#0b1610]/95 rounded-3xl p-6 shadow-xl text-white ${
        hoverEffect ? 'hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
