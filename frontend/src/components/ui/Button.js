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
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-tight rounded-full transition-all duration-200 cursor-pointer select-none border-none focus:outline-none focus:ring-2 focus:ring-green-pri/20 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-green-pri hover:bg-green-light text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
    outline: 'bg-white hover:bg-slate-50 text-text-secondary border border-border-custom hover:border-slate-300 shadow-xs active:scale-[0.98]',
    mint: 'bg-green-pri hover:bg-green-light text-white shadow-xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0',
    link: 'bg-transparent hover:underline text-green-pri p-0 rounded-none shadow-none',
    danger: 'bg-red-owe hover:bg-red-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-xs active:scale-[0.98]'
  };

  const sizes = {
    sm: 'text-[11px] px-3 py-1.5 gap-1.5',
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
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
