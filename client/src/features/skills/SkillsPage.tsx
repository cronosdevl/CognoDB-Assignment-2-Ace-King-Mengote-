import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useSkillCategories, useSkills } from '@/api/hooks';
import { CategoryBadge } from '@/components/domain/SkillChip';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchInput, Select } from '@/components/ui/inputs';
import { Meter } from '@/components/ui/data';
import { ErrorState, NoResults, SkeletonCards } from '@/components/ui/states';
import { useDebounced } from '@/hooks/useDebounced';
import { plural } from '@/lib/format';

export function SkillsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const debouncedSearch = useDebounced(search);

  const { data: categories } = useSkillCategories();

  const filters = useMemo(
    () => ({ q: debouncedSearch || undefined, category: category || undefined, limit: 100 }),
    [debouncedSearch, category],
  );

  const { data, isPending, error, refetch } = useSkills(filters);

  const reset = () => {
    setSearch('');
    setCategory('');
  };

  return (
    <div className="animate-fade-rise">
      <PageHeader
        title="Skills"
        description="The competency graph. Every skill knows who holds it, which projects need it, and which neighbouring skills make it easier to learn."
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search skills…"
          className="min-w-[240px] flex-1"
        />
        <Select
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full sm:w-52"
        >
          <option value="">All categories</option>
          {categories?.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <SkeletonCards count={9} />
      ) : data.items.length === 0 ? (
        <NoResults query={search} onReset={reset} />
      ) : (
        <>
          <p className="mb-3 text-xs text-[var(--color-ink-muted)]">{plural(data.total, 'skill')}</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((skill) => (
              <Link
                key={skill.id}
                to={`/skills/${skill.id}`}
                className="group flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent-ink)]">
                    {skill.name}
                  </h3>
                  <CategoryBadge category={skill.category} />
                </div>

                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {skill.description}
                </p>

                <div className="mt-auto pt-4">
                  <Meter
                    value={skill.averageLevel / 5}
                    label={`Average proficiency ${skill.averageLevel.toFixed(1)}/5`}
                    showValue={false}
                    colorByValue={false}
                    hue={275}
                  />
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-faint)]">
                    <span>{plural(skill.holders, 'holder')}</span>
                    <span>{plural(skill.experts, 'expert')}</span>
                    <span>{plural(skill.demandedBy, 'live project')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
