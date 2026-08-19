import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface Crumb {
  label: string;
  to?: string;
}

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6', className)}>
      {crumbs && crumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-2.5 flex flex-wrap items-center gap-1 text-xs">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3 text-[var(--color-ink-faint)]" /> : null}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-accent-ink)]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--color-ink-faint)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-[1.75rem]">
            {title}
          </h1>
          {description ? (
            <div className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
