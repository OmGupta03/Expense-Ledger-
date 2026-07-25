import React from 'react';

export default function Textarea({
  label,
  error,
  className = '',
  required = false,
  rows = 3,
  ...props
}) {
  return (
    <div className="w-full text-left">
      {label && (
        <label className="block text-[10px] font-bold uppercase text-text-muted mb-1.5 tracking-wider">
          {label} {required && <span className="text-red-owe">*</span>}
        </label>
      )}
      <textarea
        required={required}
        rows={rows}
        className={`w-full bg-bg-primary border border-border-custom hover:border-slate-350 focus:border-green-pri rounded-xl px-4 py-2.5 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-pri/5 transition-all text-xs font-semibold resize-none ${
          error ? 'border-red-owe focus:border-red-owe focus:ring-red-owe/5' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-[10px] font-bold text-red-owe">{error}</p>
      )}
    </div>
  );
}
