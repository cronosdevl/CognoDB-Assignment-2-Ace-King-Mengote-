import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adds a hover lift; use only when the whole card is clickable. */
  interactive?: boolean;
}

export function Card({ children, className, interactive = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]',
        interactive &&
          'transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>;
}

export function CardDivider() {
  return <hr className="border-0 border-t border-[var(--color-border-subtle)]" />;
}
