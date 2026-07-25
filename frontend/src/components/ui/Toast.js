import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function Toast({
  message,
  type = 'success', // 'success' | 'error' | 'info'
  onClose,
  duration = 4000,
  className = '',
  ...props
}) {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgStyles = {
    success: 'bg-green-50 border-green-200 text-[#15803d]',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const icons = {
    success: <CheckCircle className="h-4 w-4" />,
    error: <AlertTriangle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-60 max-w-sm flex items-center gap-3 px-4 py-3.5 border rounded-2xl shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5 font-semibold text-xs text-left ${bgStyles[type]} ${className}`}
      {...props}
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className="flex-1 pr-2">
        {message}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-0.5 rounded-lg hover:bg-black/5 transition-colors cursor-pointer border-none bg-transparent"
        >
          <X className="h-3.5 w-3.5 opacity-70 hover:opacity-100" />
        </button>
      )}
    </div>
  );
}
