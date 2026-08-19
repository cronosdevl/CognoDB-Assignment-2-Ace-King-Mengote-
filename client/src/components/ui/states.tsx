import { AlertTriangle, DatabaseZap, Inbox, RefreshCw, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden />;
}

/** Placeholder that matches the shape of a list of cards. */
export function SkeletonList({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5"
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-ink-faint)]">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--color-ink-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function NoResults({ query, onReset }: { query?: string; onReset?: () => void }) {
  return (
    <EmptyState
      icon={<SearchX className="size-5" />}
      title={query ? `Nothing matches “${query}”` : 'No results'}
      description="Try a broader search, or clear the filters to see everything."
      action={
        onReset ? (
          <Button size="sm" onClick={onReset}>
            Clear filters
          </Button>
        ) : undefined
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

/**
 * A database outage is not the user's fault and not something they can fix by
 * retrying a form, so it gets its own explanation and a retry button rather
 * than a generic red box.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const apiError = error instanceof ApiError ? error : null;
  const isOutage = apiError?.isDatabaseOutage ?? false;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-card)] border px-6 py-14 text-center',
        isOutage
          ? 'border-[var(--color-caution)]/35 bg-[var(--color-caution-soft)]'
          : 'border-[var(--color-critical)]/35 bg-[var(--color-critical-soft)]',
        className,
      )}
      role="alert"
    >
      <div
        className={cn(
          'mb-3 flex size-11 items-center justify-center rounded-full',
          isOutage
            ? 'bg-[var(--color-caution)]/15 text-[var(--color-caution)]'
            : 'bg-[var(--color-critical)]/15 text-[var(--color-critical)]',
        )}
      >
        {isOutage ? <DatabaseZap className="size-5" /> : <AlertTriangle className="size-5" />}
      </div>
      <p className="text-sm font-semibold text-[var(--color-ink)]">
        {isOutage ? 'Cannot reach the database' : 'Something went wrong'}
      </p>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
        {apiError?.message ?? (error instanceof Error ? error.message : 'An unexpected error occurred.')}
      </p>
      {isOutage ? (
        <p className="mt-2 max-w-md text-xs leading-relaxed text-[var(--color-ink-faint)]">
          The CognoDB instance may be paused or still provisioning. Check the connection details in your{' '}
          <code className="font-mono">.env</code> file.
        </p>
      ) : null}
      {onRetry ? (
        <Button size="sm" variant="secondary" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
