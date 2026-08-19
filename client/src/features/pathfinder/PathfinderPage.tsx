import type { PersonSummary } from '@wayfinder/shared';
import { MapPinned, Route, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCareerPath, usePeople, usePerson, useRoleSuggestions, useRoles } from '@/api/hooks';
import { CareerPathTimeline } from '@/features/pathfinder/components/CareerPathTimeline';
import { PersonPicker } from '@/features/pathfinder/components/PersonPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/inputs';
import { Meter, StatTile } from '@/components/ui/data';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/states';
import { formatDuration, percent, plural } from '@/lib/format';

export function PathfinderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const personIdParam = searchParams.get('personId');
  const roleIdParam = searchParams.get('targetRoleId');

  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [targetRoleId, setTargetRoleId] = useState(roleIdParam ?? '');

  // Seed the picker when arriving from a person's page, and provide a sensible
  // default so the screen is never an empty form on first visit.
  const { data: linkedPerson } = usePerson(personIdParam ?? undefined);
  const { data: firstPage } = usePeople({ limit: 1, openToMove: true });

  useEffect(() => {
    if (person) return;
    if (linkedPerson) {
      setPerson(linkedPerson);
      return;
    }
    if (!personIdParam && firstPage?.items[0]) setPerson(firstPage.items[0]);
  }, [linkedPerson, firstPage, personIdParam, person]);

  const { data: roles } = useRoles();
  const { data: suggestions, isPending: suggestionsPending } = useRoleSuggestions(person?.id);

  // Land on a worked example rather than an empty panel. The top suggestion is
  // the person's most natural next move, so it is also the answer they most
  // likely wanted; picking it means the screen explains itself on arrival.
  useEffect(() => {
    if (targetRoleId || roleIdParam) return;
    const first = suggestions?.[0]?.role.id;
    if (first) setTargetRoleId(first);
  }, [suggestions, targetRoleId, roleIdParam]);
  const { data: path, isPending: pathPending, error, refetch } = useCareerPath(person?.id, targetRoleId || undefined);

  const selectPerson = (next: PersonSummary) => {
    setPerson(next);
    setTargetRoleId('');
    setSearchParams({ personId: next.id }, { replace: true });
  };

  const selectRole = (roleId: string) => {
    setTargetRoleId(roleId);
    if (person) setSearchParams({ personId: person.id, targetRoleId: roleId }, { replace: true });
  };

  return (
    <div className="animate-fade-rise">
      <PageHeader
        title="Career pathfinder"
        description="Pick somebody and a role they want. The route is the shortest path through the company's career ladder — and because lateral moves make that ladder a graph rather than a tree, the shortest way up is often sideways first."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Controls ------------------------------------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-4 pt-5">
              <PersonPicker value={person} onChange={selectPerson} label="Who" />

              <Select
                label="Target role"
                value={targetRoleId}
                onChange={(event) => selectRole(event.target.value)}
                disabled={!person}
              >
                <option value="">Choose a destination…</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.id} disabled={role.id === person?.roleId}>
                    {role.title}
                    {role.id === person?.roleId ? ' (current role)' : ''}
                  </option>
                ))}
              </Select>

              {person?.roleTitle ? (
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Currently a <span className="font-medium text-[var(--color-ink)]">{person.roleTitle}</span>
                  {person.teamName ? ` on ${person.teamName}` : ''}.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[var(--color-accent)]" />
                  Closest destinations
                </span>
              }
              description="Roles within three moves, ranked by how much of the requirement set they already meet."
            />
            <CardBody className="space-y-1.5">
              {!person ? (
                <p className="py-4 text-center text-sm text-[var(--color-ink-muted)]">Choose a person first.</p>
              ) : suggestionsPending ? (
                <SkeletonList rows={3} />
              ) : !suggestions || suggestions.length === 0 ? (
                <EmptyState title="No onward moves" description="This role has no outgoing steps in the ladder." />
              ) : (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.role.id}
                    type="button"
                    onClick={() => selectRole(suggestion.role.id)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      suggestion.role.id === targetRoleId
                        ? 'bg-[var(--color-accent-soft)]'
                        : 'hover:bg-[var(--color-surface-muted)]'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium text-[var(--color-ink)]">
                        {suggestion.role.title}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-ink-muted)]">
                        {percent(suggestion.readiness)}
                      </span>
                    </div>
                    <Meter value={suggestion.readiness} showValue={false} className="mt-1.5" />
                  </button>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* Route ---------------------------------------------------------- */}
        <div className="lg:col-span-2">
          {!person || !targetRoleId ? (
            <EmptyState
              icon={<Route className="size-5" />}
              title="Choose a person and a destination"
              description="Wayfinder will find the shortest route through the career ladder and work out what is missing at every step."
              className="h-full"
            />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : pathPending ? (
            <SkeletonList rows={4} />
          ) : !path.reachable ? (
            <EmptyState
              icon={<MapPinned className="size-5" />}
              title="No route in the ladder"
              description={`There is no defined progression from ${path.fromRole?.title ?? 'the current role'} to ${path.targetRole.title} within six moves. That is a real answer: this move needs a hiring decision, not a development plan.`}
            />
          ) : path.steps.length === 0 ? (
            <EmptyState title="Already there" description="This person already holds the target role." />
          ) : (
            <div className="space-y-5">
              <section className="grid gap-4 sm:grid-cols-3">
                <StatTile label="Moves" value={path.steps.length} detail={path.steps.map((s) => s.role.title).join(' → ')} />
                <StatTile label="Typical time" value={formatDuration(path.totalMonths)} detail="at the usual pace" />
                <StatTile
                  label="Weakest step"
                  value={percent(path.overallReadiness)}
                  detail="readiness at the hardest hop"
                />
              </section>

              <Card>
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{path.fromRole?.title ?? 'Current role'}</span>
                      <span className="text-[var(--color-ink-faint)]">→</span>
                      <span>{path.targetRole.title}</span>
                      <Badge>{plural(path.steps.length, 'move')}</Badge>
                    </span>
                  }
                  description="Each hop is a documented progression between roles. Skill gaps are computed against the target role's requirements at every step."
                />
                <CardBody>
                  <CareerPathTimeline path={path} />
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
