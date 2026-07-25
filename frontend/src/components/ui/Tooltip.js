import React, { useState } from 'react';

export default function Tooltip({
  children,
  content,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = '',
  ...props
}) {
  const [visible, setVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2 origin-bottom',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2 origin-top',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2 origin-right',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2 origin-left'
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      {...props}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-40 px-2.5 py-1.5 text-[10px] font-bold text-white bg-slate-900 rounded-lg whitespace-nowrap shadow-md pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 ${positionStyles[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
