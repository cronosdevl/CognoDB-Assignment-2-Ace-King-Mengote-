import { useMemo, useState } from 'react';

import { usePeople, useRoles } from '@/api/hooks';
import { PersonCard } from '@/components/domain/PersonCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchInput, Select } from '@/components/ui/inputs';
import { ErrorState, NoResults, SkeletonCards } from '@/components/ui/states';
import { useDebounced } from '@/hooks/useDebounced';
import { plural } from '@/lib/format';

const PAGE_SIZE = 24;

export function PeoplePage() {
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState('');
  const [openToMove, setOpenToMove] = useState(false);
  const [page, setPage] = useState(0);

  const debouncedSearch = useDebounced(search);
  const { data: roles } = useRoles();

  const filters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      roleId: roleId || undefined,
      openToMove: openToMove || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [debouncedSearch, roleId, openToMove, page],
  );

  const { data, isPending, isFetching, error, refetch } = usePeople(filters);

  const resetFilters = () => {
    setSearch('');
    setRoleId('');
    setOpenToMove(false);
    setPage(0);
  };

  const hasFilters = Boolean(search || roleId || openToMove);
  const total = data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="animate-fade-rise">
      <PageHeader
        title="People"
        description="Everyone at Meridian Labs, with the skills and projects that connect them."
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
          placeholder="Search by name, title or seniority…"
          className="min-w-[240px] flex-1"
        />

        <Select
          label="Role"
          value={roleId}
          onChange={(event) => {
            setRoleId(event.target.value);
            setPage(0);
          }}
          className="w-full sm:w-56"
        >
          <option value="">All roles</option>
          {roles?.map((role) => (
            <option key={role.id} value={role.id}>
              {role.title}
            </option>
          ))}
        </Select>

        <Button
          variant={openToMove ? 'primary' : 'secondary'}
          onClick={() => {
            setOpenToMove((previous) => !previous);
            setPage(0);
          }}
          aria-pressed={openToMove}
        >
          Open to a move
        </Button>

        {hasFilters ? (
          <Button variant="ghost" onClick={resetFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <SkeletonCards count={9} />
      ) : data.items.length === 0 ? (
        <NoResults query={search} onReset={hasFilters ? resetFilters : undefined} />
      ) : (
        <>
          <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
            {plural(total, 'person', 'people')}
            {hasFilters ? ' matching your filters' : ''}
            {isFetching ? ' · updating…' : ''}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>

          {maxPage > 0 ? (
            <nav className="mt-6 flex items-center justify-between gap-3">
              <Button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
                Previous
              </Button>
              <span className="text-xs text-[var(--color-ink-muted)]">
                Page {page + 1} of {maxPage + 1}
              </span>
              <Button disabled={page >= maxPage} onClick={() => setPage((value) => Math.min(maxPage, value + 1))}>
                Next
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
