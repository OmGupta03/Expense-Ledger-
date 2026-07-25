import React from 'react';

export default function SectionHeader({
  title,
  count,
  actions,
  className = '',
  ...props
}) {
  return (
    <div className={`flex items-center justify-between pb-3 border-b border-border-custom text-left select-none ${className}`} {...props}>
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-[10px] bg-slate-100 border border-border-custom px-2 py-0.5 rounded-full font-bold text-text-secondary">
            {count}
          </span>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
