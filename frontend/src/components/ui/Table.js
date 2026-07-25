import React from 'react';

export default function Table({
  headers = [], // string[] or { key, label, className }[]
  children,
  className = '',
  loading = false,
  emptyState = null,
  ...props
}) {
  return (
    <div className="w-full bg-bg-secondary border border-border-custom rounded-3xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto w-full">
        <table className={`w-full border-collapse text-left ${className}`} {...props}>
          <thead>
            <tr className="bg-slate-50/70 border-b border-border-custom text-[10px] font-extrabold uppercase text-text-muted tracking-wider select-none sticky top-0 z-10">
              {headers.map((h, idx) => {
                const isObj = typeof h === 'object' && h !== null;
                const label = isObj ? h.label : h;
                const thClass = isObj ? h.className : '';
                return (
                  <th key={idx} className={`px-6 py-4.5 font-extrabold ${thClass}`}>
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/50 text-xs font-semibold text-text-primary">
            {!loading && children}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
          <div className="h-6 w-6 border-2 border-border-custom border-t-green-pri rounded-full animate-spin"></div>
          <p className="text-[11px] font-bold">Loading table records...</p>
        </div>
      )}

      {!loading && emptyState && (
        <div className="py-8">
          {emptyState}
        </div>
      )}
    </div>
  );
}
