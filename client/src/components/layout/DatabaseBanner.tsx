import { useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, RefreshCw } from 'lucide-react';

import { useHealth } from '@/api/hooks';

export function DatabaseBanner() {
  const { data, isLoading, refetch, isFetching } = useHealth();
  const queryClient = useQueryClient();

  if (isLoading || !data || data.database.ok) return null;

  return (
    <div
      role="alert"
      className="border-b border-[var(--color-caution)]/30 bg-[var(--color-caution-soft)] px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2">
        <DatabaseZap className="size-4.5 shrink-0 text-[var(--color-caution)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-ink)]">CognoDB is unreachable</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
            {data.database.error ??
              'The database did not respond. The instance may be paused or still provisioning.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void refetch();
            void queryClient.invalidateQueries();
          }}
          disabled={isFetching}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-caution)]/40 bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
        >
          <RefreshCw className={isFetching ? 'size-3.5 animate-spin' : 'size-3.5'} />
          Retry
        </button>
      </div>
    </div>
  );
}
