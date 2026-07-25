import React from 'react';
import { Check } from 'lucide-react';

export default function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  id,
  ...props
}) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className={`flex items-center gap-2.5 text-left ${className}`}>
      <div className="relative flex items-center">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer h-4.5 w-4.5 cursor-pointer appearance-none rounded-md border border-border-custom bg-white transition-all checked:bg-green-pri checked:border-green-pri focus:outline-none focus:ring-2 focus:ring-green-pri/20 disabled:opacity-50 disabled:cursor-not-allowed"
          {...props}
        />
        <Check className="pointer-events-none absolute left-0.5 top-0.5 h-3.5 w-3.5 text-white scale-0 transition-transform duration-100 peer-checked:scale-100 font-bold" />
      </div>
      {label && (
        <label
          htmlFor={checkboxId}
          className={`text-xs font-semibold text-text-primary select-none cursor-pointer ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
}
