import React from 'react';

export default function LoadingSkeleton({
  variant = 'line', // 'line' | 'card' | 'avatar' | 'list-item' | 'table-row'
  count = 1,
  className = '',
  ...props
}) {
  const baseStyles = 'animate-pulse bg-slate-200 rounded-md';

  const renderSkeleton = (key) => {
    switch (variant) {
      case 'avatar':
        return (
          <div key={key} className={`${baseStyles} h-9 w-9 rounded-full ${className}`} {...props} />
        );
      case 'card':
        return (
          <div key={key} className={`bg-bg-secondary border border-border-custom rounded-3xl p-6 shadow-sm flex flex-col gap-4 ${className}`} {...props}>
            <div className="flex items-center gap-3">
              <div className={`${baseStyles} h-9 w-9 rounded-full`} />
              <div className="flex-1 space-y-2">
                <div className={`${baseStyles} h-3.5 w-1/3`} />
                <div className={`${baseStyles} h-2.5 w-1/4`} />
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-border-custom/50">
              <div className={`${baseStyles} h-3 w-3/4`} />
              <div className={`${baseStyles} h-3 w-1/2`} />
            </div>
          </div>
        );
      case 'list-item':
        return (
          <div key={key} className={`flex items-center justify-between p-4 bg-bg-secondary border border-border-custom rounded-2xl ${className}`} {...props}>
            <div className="flex items-center gap-3">
              <div className={`${baseStyles} h-9 w-9 rounded-full`} />
              <div className="space-y-1.5 text-left">
                <div className={`${baseStyles} h-3.5 w-24`} />
                <div className={`${baseStyles} h-2.5 w-16`} />
              </div>
            </div>
            <div className={`${baseStyles} h-6 w-12 rounded-lg`} />
          </div>
        );
      case 'table-row':
        return (
          <tr key={key} className={`hover:bg-transparent ${className}`} {...props}>
            <td className="px-6 py-4 flex items-center gap-3">
              <div className={`${baseStyles} h-9 w-9 rounded-full`} />
              <div className="space-y-1.5">
                <div className={`${baseStyles} h-3.5 w-24`} />
                <div className={`${baseStyles} h-2.5 w-16`} />
              </div>
            </td>
            <td className="px-6 py-4">
              <div className={`${baseStyles} h-3 w-32`} />
            </td>
            <td className="px-6 py-4">
              <div className={`${baseStyles} h-4.5 w-16 rounded-full`} />
            </td>
            <td className="px-6 py-4 text-right">
              <div className={`${baseStyles} h-6 w-16 rounded-lg ml-auto`} />
            </td>
          </tr>
        );
      case 'line':
      default:
        return (
          <div key={key} className={`${baseStyles} h-3.5 w-full ${className}`} {...props} />
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => renderSkeleton(idx))}
    </>
  );
}
