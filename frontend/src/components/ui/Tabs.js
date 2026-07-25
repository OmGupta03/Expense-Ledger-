import React from 'react';

export default function Tabs({
  tabs = [], // [{ key, label }]
  activeKey,
  onChange,
  className = '',
  ...props
}) {
  return (
    <div className={`flex border-b border-border-custom w-full select-none ${className}`} {...props}>
      <div className="flex gap-1.5 -mb-px">
        {tabs.map((t) => {
          const isActive = t.key === activeKey;
          return (
            <button
              key={t.key}
              onClick={() => onChange?.(t.key)}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer focus:outline-none ${
                isActive
                  ? 'border-green-pri text-green-pri'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
