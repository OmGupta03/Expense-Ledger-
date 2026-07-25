import React, { useState, useRef, useEffect } from 'react';

export default function Dropdown({
  trigger,
  children,
  align = 'right', // 'left' | 'right'
  className = '',
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const alignmentStyles = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right'
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef} {...props}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute mt-2 w-48 rounded-2xl bg-bg-secondary border border-border-custom shadow-lg ring-1 ring-slate-900/5 focus:outline-none z-30 transition-all duration-200 animate-in fade-in slide-in-from-top-1.5 ${alignmentStyles[align]}`}
          onClick={() => setIsOpen(false)}
        >
          <div className="py-1.5 divide-y divide-border-custom/50">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
