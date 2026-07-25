import React from 'react';
import { Search } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  ...props
}) {
  return (
    <div className={`relative w-full max-w-sm ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4.5 text-text-muted">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-border-custom hover:border-slate-350 focus:border-green-pri rounded-full pl-10.5 pr-4 py-2.5 text-xs text-text-primary placeholder-text-muted/70 focus:outline-none focus:ring-2 focus:ring-green-pri/5 transition-all font-semibold"
        {...props}
      />
    </div>
  );
}
