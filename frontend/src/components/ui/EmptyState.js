import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onActionClick,
  actionIcon,
  className = '',
  ...props
}) {
  return (
    <div className={`bg-bg-secondary rounded-3xl border border-border-custom p-16 text-center shadow-sm max-w-xl mx-auto my-6 text-left flex flex-col items-center justify-center ${className}`} {...props}>
      {Icon && (
        <div className="h-16 w-16 rounded-full bg-slate-50 border border-border-custom flex items-center justify-center text-text-muted mb-5 select-none">
          <Icon className="h-7 w-7 text-text-muted/80" />
        </div>
      )}
      <h3 className="text-base font-extrabold text-text-primary mb-2 text-center">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-text-muted max-w-sm text-center mb-6 leading-relaxed font-semibold">
          {description}
        </p>
      )}
      {actionText && onActionClick && (
        <Button
          variant="primary"
          size="md"
          icon={actionIcon}
          onClick={onActionClick}
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}
