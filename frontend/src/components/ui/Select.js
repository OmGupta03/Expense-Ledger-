import React from 'react';

export default function Select({
  label,
  options = [], // [{ value, label }]
  error,
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
      <div className="relative">
        <select
          required={required}
          className={`w-full bg-[#0f172a] border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs font-medium text-white focus:outline-none transition-all appearance-none ${
            error ? 'border-red-900 focus:border-red-500' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-[10px] font-bold text-red-400">{error}</p>
      )}
    </div>
  );
}
