import { ArrowRight, FolderKanban, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useOverview } from '@/api/hooks';
import { SupplyDemandChart } from '@/features/dashboard/components/SupplyDemandChart';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/domain/Avatar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { HueBadge } from '@/components/ui/Badge';
import { Meter, StatTile } from '@/components/ui/data';
import { ErrorState, SkeletonCards, SkeletonList } from '@/components/ui/states';
import { compactNumber, percent, plural } from '@/lib/format';

export function DashboardPage() {
  const { data, isPending, error, refetch } = useOverview();

  return (
    <div className="animate-fade-rise">
      <PageHeader
        title="Meridian Labs at a glance"
        description="Every number below is a traversal of the live graph — who knows what, who has worked with whom, and where that leaves the organisation exposed."
      />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <>
          <SkeletonCards count={4} className="xl:grid-cols-4" />
          <SkeletonList rows={4} className="mt-6" />
        </>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="People"
              value={data.counts.people}
              detail={`${plural(data.counts.teams, 'team')} · ${plural(data.counts.roles, 'role')}`}
              icon={<Users className="size-4" />}
              hue={275}
            />
            <StatTile
              label="Active projects"
              value={data.activeProjects}
              detail={`${percent(data.averageProjectCoverage)} average skill coverage`}
              icon={<FolderKanban className="size-4" />}
              hue={200}
            />
            <StatTile
              label="Open to a move"
              value={data.openToMove}
              detail={`${percent(data.openToMove / Math.max(1, data.counts.people))} of the company`}
              icon={<Sparkles className="size-4" />}
              hue={155}
            />
            <StatTile
              label="Key-person risks"
              value={data.singlePointsOfFailure}
              detail="Skills with exactly one expert"
              icon={<ShieldAlert className="size-4" />}
              hue={25}
            />
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Skill supply and demand"
                description="Demand counts live projects requiring the skill; supply counts people who hold it at any level."
                action={
                  <Link
                    to="/skills"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent-ink)] hover:underline"
                  >
                    All skills
                    <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              <CardBody>
                <SupplyDemandChart data={data.topSkillsByDemand} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Scarcest capabilities"
                description="High demand, very few people at expert level."
              />
              <CardBody className="space-y-3">
                {data.scarcestSkills.map((skill) => (
                  <Link
                    key={skill.skillId}
                    to={`/skills/${skill.skillId}`}
                    className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-muted)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-[var(--color-ink)]">{skill.name}</span>
                      <HueBadge hue={skill.experts === 0 ? 25 : skill.experts <= 2 ? 60 : 155}>
                        {plural(skill.experts, 'expert')}
                      </HueBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">
                      needed by {plural(skill.demand, 'project')}
                    </p>
                  </Link>
                ))}
              </CardBody>
            </Card>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Where people sit" description="Headcount and live projects per department." />
              <CardBody className="space-y-4">
                {data.departmentBreakdown.map((department) => (
                  <div key={department.department}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-[var(--color-ink)]">{department.department}</span>
                      <span className="shrink-0 tabular-nums text-[var(--color-ink-muted)]">
                        {department.people}
                      </span>
                    </div>
                    <Meter
                      value={department.people / Math.max(1, data.counts.people)}
                      showValue={false}
                      colorByValue={false}
                      hue={200}
                    />
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title="Most connected colleagues"
                description="Distinct people reached through shared projects — a pure graph metric with no column behind it."
              />
              <CardBody className="grid gap-2 sm:grid-cols-2">
                {data.mostConnected.map((person) => (
                  <Link
                    key={person.id}
                    to={`/people/${person.id}`}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-muted)]"
                  >
                    <Avatar name={person.name} hue={person.avatarHue} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-ink)]">{person.name}</p>
                      <p className="truncate text-xs text-[var(--color-ink-muted)]">{person.title}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-accent-ink)]">
                      {person.connections}
                    </span>
                  </Link>
                ))}
              </CardBody>
            </Card>
          </section>

          <p className="mt-6 text-xs text-[var(--color-ink-faint)]">
            Graph contains {compactNumber(data.counts.relationships)} relationships across{' '}
            {data.counts.people} people, {data.counts.projects} projects and {data.counts.skills} skills.
          </p>
        </>
      )}
    </div>
  );
}
