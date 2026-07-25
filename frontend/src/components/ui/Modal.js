import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md', // max-w-sm | max-w-md | max-w-lg | max-w-xl
  className = '',
  ...props
}) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Card wrapper */}
      <div
        className={`relative bg-bg-secondary w-full border border-border-custom/50 rounded-3xl shadow-xl transition-all duration-300 animate-in fade-in zoom-in-95 ${maxWidth} ${className}`}
        {...props}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-custom/50 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-text-primary text-left leading-none tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-100 transition-all cursor-pointer border-none bg-transparent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
