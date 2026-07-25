import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [], // [{ label, href }]
  actions,
  backHref,
  onBackClick,
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom text-left ${className}`} {...props}>
      <div className="flex flex-col gap-1">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-text-muted mb-1 select-none">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="opacity-40">/</span>}
                {b.href ? (
                  <Link href={b.href} className="hover:text-green-pri transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span>{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="p-1.5 rounded-xl border border-border-custom hover:border-slate-350 text-text-muted hover:text-text-primary bg-white hover:bg-slate-50 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          {onBackClick && (
            <button
              onClick={onBackClick}
              className="p-1.5 rounded-xl border border-border-custom hover:border-slate-350 text-text-muted hover:text-text-primary bg-white hover:bg-slate-50 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight md:text-2xl leading-none">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-text-muted mt-1.5 font-semibold">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 self-start md:self-center w-full md:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
