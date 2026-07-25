import React from 'react';

export default function Badge({
  children,
  variant = 'secondary', // 'success' | 'error' | 'warning' | 'info' | 'secondary' | 'mint'
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border';
  
  const variants = {
    success: 'bg-green-50 text-[#2e7d32] border-[#c8e6c9]/40',
    error: 'bg-red-50 text-red-650 border-red-150',
    warning: 'bg-orange-50 text-orange-600 border-orange-100',
    info: 'bg-blue-50 text-blue-600 border-blue-100',
    secondary: 'bg-slate-50 text-slate-500 border-slate-200',
    mint: 'bg-green-50 text-green-pri border-green-100'
  };

  return (
    <span
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
