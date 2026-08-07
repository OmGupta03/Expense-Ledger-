import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'outline' | 'mint' | 'link' | 'danger' | 'secondary'
  size = 'md', // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-extrabold tracking-tight rounded-full transition-all duration-200 cursor-pointer select-none border-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#10b981] hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0',
    outline: 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:text-white active:scale-[0.98]',
    mint: 'bg-[#10b981] hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0',
    link: 'bg-transparent hover:underline text-emerald-400 p-0 rounded-none shadow-none',
    danger: 'bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 shadow-md hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 active:scale-[0.98]'
  };

  const sizes = {
    sm: 'text-[11px] px-3.5 py-1.5 gap-1.5',
    md: 'text-xs px-5 py-2.5 gap-2',
    lg: 'text-sm px-6 py-3.5 gap-2.5'
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
