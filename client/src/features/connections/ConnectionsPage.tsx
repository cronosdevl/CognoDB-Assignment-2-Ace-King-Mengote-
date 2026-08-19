import type { PersonSummary } from '@wayfinder/shared';
import { ArrowDown, ArrowLeftRight, GraduationCap, Network, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useConnection } from '@/api/hooks';
import { Avatar } from '@/components/domain/Avatar';
import { PersonPicker } from '@/features/pathfinder/components/PersonPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/states';
import { plural } from '@/lib/format';

const HOP_ICONS = {
  WORKED_ON: Users,
  MENTORS: GraduationCap,
  REPORTS_TO: Network,
  MEMBER_OF: Users,
  HAS_SKILL: Users,
} as const;

/**
 * Degrees of separation between two colleagues.
 *
 * The traversal mixes shared projects, mentorship and reporting lines, because
 * the most useful introduction path is whichever is shortest — not whichever
 * table you happened to join first.
 */
export function ConnectionsPage() {
  const [from, setFrom] = useState<PersonSummary | null>(null);
  const [to, setTo] = useState<PersonSummary | null>(null);

  const { data, isPending, error, refetch } = useConnection(from?.id, to?.id);
  const ready = Boolean(from && to && from.id !== to.id);

  return (
    <div className="animate-fade-rise">
      <PageHeader
        title="How are these two connected?"
        description="A shortest-path search across shared projects, mentorship and reporting lines. In a relational schema this is a recursive CTE over a union of three join tables, with cycle detection; here it is one line of Cypher."
      />

      <Card className="mb-5">
        <CardBody className="pt-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <PersonPicker value={from} onChange={setFrom} label="From" placeholder="First person…" />
            <Button
              variant="ghost"
              className="mb-0.5 hidden sm:inline-flex"
              aria-label="Swap"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
            >
              <ArrowLeftRight className="size-4" />
            </Button>
            <PersonPicker value={to} onChange={setTo} label="To" placeholder="Second person…" />
          </div>
        </CardBody>
      </Card>

      {!ready ? (
        <EmptyState
          icon={<Network className="size-5" />}
          title="Choose two people"
          description="Wayfinder will find the shortest chain of colleagues between them."
        />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <SkeletonList rows={4} />
      ) : !data.found ? (
        <EmptyState
          title="No path within eight hops"
          description="These two have no chain of shared projects, mentorship or reporting lines connecting them."
        />
      ) : (
        <Card>
          <CardHeader
            title={`${data.degrees} ${data.degrees === 1 ? 'degree' : 'degrees'} of separation`}
            description={`${plural(data.hops.length, 'hop')} between ${data.from.name} and ${data.to.name}.`}
          />
          <CardBody>
            <ol className="space-y-1">
              {data.hops.map((hop, index) => {
                const Icon = HOP_ICONS[hop.viaType] ?? Users;
                return (
                  <li key={`${hop.from.id}-${hop.to.id}-${index}`}>
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3">
                      <Link to={`/people/${hop.from.id}`} className="flex min-w-0 items-center gap-2.5 hover:opacity-80">
                        <Avatar name={hop.from.name} hue={hop.from.avatarHue} size="sm" />
                        <span className="truncate text-sm font-medium text-[var(--color-ink)]">
                          {hop.from.name}
                        </span>
                      </Link>

                      <span className="mx-1 flex min-w-0 flex-1 items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                        <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{hop.via}</span>
                        <span className="h-px flex-1 bg-[var(--color-border-strong)]" />
                      </span>

                      <Link to={`/people/${hop.to.id}`} className="flex min-w-0 items-center gap-2.5 hover:opacity-80">
                        <span className="truncate text-sm font-medium text-[var(--color-ink)]">{hop.to.name}</span>
                        <Avatar name={hop.to.name} hue={hop.to.avatarHue} size="sm" />
                      </Link>
                    </div>

                    {index < data.hops.length - 1 ? (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="size-3.5 text-[var(--color-ink-faint)]" />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
