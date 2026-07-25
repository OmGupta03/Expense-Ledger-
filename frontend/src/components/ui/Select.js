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
        <label className="block text-[10px] font-bold uppercase text-text-muted mb-1.5 tracking-wider">
          {label} {required && <span className="text-red-owe">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          required={required}
          className={`w-full bg-bg-primary border border-border-custom hover:border-slate-350 focus:border-green-pri rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-green-pri/5 transition-all text-xs font-semibold appearance-none ${
            error ? 'border-red-owe focus:border-red-owe focus:ring-red-owe/5' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-[10px] font-bold text-red-owe">{error}</p>
      )}
    </div>
  );
}
