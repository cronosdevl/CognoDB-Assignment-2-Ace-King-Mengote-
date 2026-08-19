import type { ProjectStatus } from '@wayfinder/shared';
import { useMemo, useState } from 'react';

import { useProjects } from '@/api/hooks';
import { ProjectCard } from '@/components/domain/ProjectCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput, SegmentedControl } from '@/components/ui/inputs';
import { ErrorState, NoResults, SkeletonCards } from '@/components/ui/states';
import { useDebounced } from '@/hooks/useDebounced';
import { plural } from '@/lib/format';

type StatusFilter = ProjectStatus | 'all';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Done' },
];

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const debouncedSearch = useDebounced(search);

  const filters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
      limit: 60,
    }),
    [debouncedSearch, status],
  );

  const { data, isPending, error, refetch } = useProjects(filters);

  const reset = () => {
    setSearch('');
    setStatus('all');
  };

  return (
    <div className="animate-fade-rise">
      <PageHeader
        title="Projects"
        description="What the company is building, who is on it, and which required skills nobody staffed can cover."
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search projects…"
          className="min-w-[240px] flex-1"
        />
        <SegmentedControl value={status} options={STATUS_OPTIONS} onChange={setStatus} />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <SkeletonCards count={6} />
      ) : data.items.length === 0 ? (
        <NoResults query={search} onReset={reset} />
      ) : (
        <>
          <p className="mb-3 text-xs text-[var(--color-ink-muted)]">{plural(data.total, 'project')}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
