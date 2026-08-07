import React from 'react';

export default function Input({
  label,
  error,
  type = 'text',
  className = '',
  required = false,
  ...props
}) {
  return (
    <div className="w-full text-left">
      {label && (
        <label className="block text-[11px] font-extrabold uppercase text-slate-300 mb-1.5 tracking-wider">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <input
        type={type}
        required={required}
        className={`w-full bg-[#0f172a] border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium ${
          error ? 'border-red-900 focus:border-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-[10px] font-bold text-red-400">{error}</p>
      )}
    </div>
  );
}
