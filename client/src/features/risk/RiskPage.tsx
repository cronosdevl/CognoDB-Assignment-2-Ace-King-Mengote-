import type { PersonSummary } from '@wayfinder/shared';
import { AlertTriangle, ShieldAlert, ShieldCheck, UserMinus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useDepartureImpact, usePerson, useSinglePointsOfFailure } from '@/api/hooks';
import { Avatar } from '@/components/domain/Avatar';
import { PersonRow } from '@/components/domain/PersonCard';
import { StatusBadge } from '@/components/domain/SkillChip';
import { PersonPicker } from '@/features/pathfinder/components/PersonPicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, HueBadge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Meter, StatTile } from '@/components/ui/data';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/states';
import { riskHue } from '@/lib/color';
import { plural } from '@/lib/format';

export function RiskPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const personIdParam = searchParams.get('personId');
  const [person, setPerson] = useState<PersonSummary | null>(null);

  const { data: linkedPerson } = usePerson(personIdParam ?? undefined);
  const { data: spof, isPending: spofPending, error: spofError, refetch } = useSinglePointsOfFailure();

  useEffect(() => {
    if (person) return;
    if (linkedPerson) {
      setPerson(linkedPerson);
      return;
    }
    if (!personIdParam && spof?.[0]) setPerson(spof[0].expert);
  }, [linkedPerson, person, personIdParam, spof]);
  const { data: impact, isPending: impactPending } = useDepartureImpact(person?.id);

  return (
    <div className="animate-fade-rise">
      <PageHeader
        title="Key-person risk"
        description="Where the organisation depends on one person. Both answers below are traversals: a skill with exactly one expert, and the requirements that would go uncovered if a specific person walked out."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---- Company-wide single points of failure ---------------------- */}
        <section>
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-[var(--color-critical)]" />
                  Single points of failure
                </span>
              }
              description="Skills required by a live project where exactly one person is at expert level."
            />
            <CardBody>
              {spofError ? (
                <ErrorState error={spofError} onRetry={() => void refetch()} />
              ) : spofPending ? (
                <SkeletonList rows={4} />
              ) : !spof || spof.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="size-5" />}
                  title="No single points of failure"
                  description="Every skill a live project depends on has at least two experts behind it."
                />
              ) : (
                <ul className="space-y-3">
                  {spof.map((entry) => (
                    <li
                      key={entry.skillId}
                      className="rounded-lg border border-[var(--color-border-subtle)] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <Link
                          to={`/skills/${entry.skillId}`}
                          className="text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent-ink)]"
                        >
                          {entry.name}
                        </Link>
                        <HueBadge hue={25}>{plural(entry.exposedProjects.length, 'project')} exposed</HueBadge>
                      </div>

                      <Link
                        to={`/people/${entry.expert.id}`}
                        className="mt-2 flex items-center gap-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent-ink)]"
                      >
                        <Avatar name={entry.expert.name} hue={entry.expert.avatarHue} size="xs" />
                        <span className="font-medium">{entry.expert.name}</span>
                        <span>is the only expert</span>
                      </Link>

                      <p className="mt-1.5 text-xs text-[var(--color-ink-faint)]">
                        {entry.exposedProjects.map((project) => project.code).join(', ')}
                      </p>

                      {entry.understudy ? (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
                          <span className="text-[var(--color-positive)]">Nearest understudy:</span>
                          <Link
                            to={`/people/${entry.understudy.id}`}
                            className="font-medium hover:text-[var(--color-accent-ink)]"
                          >
                            {entry.understudy.name}
                          </Link>
                          <span>at level {entry.understudy.level}</span>
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--color-critical)]">
                          Nobody else holds this skill at all.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </section>

        {/* ---- Departure simulator --------------------------------------- */}
        <section className="space-y-5">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <UserMinus className="size-4" />
                  What if they leave?
                </span>
              }
              description="Pick anyone to see which project requirements only they satisfy."
            />
            <CardBody>
              <PersonPicker
                value={person}
                onChange={(next) => {
                  setPerson(next);
                  setSearchParams({ personId: next.id }, { replace: true });
                }}
                placeholder="Choose a person…"
              />
            </CardBody>
          </Card>

          {!person ? (
            <EmptyState title="Nobody selected" description="Choose a colleague to simulate their departure." />
          ) : impactPending ? (
            <SkeletonList rows={3} />
          ) : impact ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatTile
                  label="Risk score"
                  value={impact.riskScore}
                  detail="0 is replaceable, 100 is critical"
                  hue={riskHue(impact.riskScore / 100)}
                  icon={<AlertTriangle className="size-4" />}
                />
                <StatTile
                  label="Projects affected"
                  value={impact.affectedProjects.length}
                  detail={`${plural(
                    impact.affectedProjects.reduce((sum, project) => sum + project.orphanedSkills.length, 0),
                    'requirement',
                  )} would be uncovered`}
                />
              </div>

              <Card>
                <CardBody className="pt-5">
                  <Meter value={impact.riskScore / 100} label="Overall exposure" />
                </CardBody>
              </Card>

              {impact.affectedProjects.length > 0 ? (
                <Card>
                  <CardHeader
                    title="Requirements only they cover"
                    description="Nobody else staffed on these projects meets the minimum level."
                  />
                  <CardBody className="space-y-3">
                    {impact.affectedProjects.map((project) => (
                      <div key={project.projectId} className="rounded-lg border border-[var(--color-border-subtle)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link
                            to={`/projects/${project.projectId}`}
                            className="text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-ink)]"
                          >
                            {project.name}
                          </Link>
                          <StatusBadge status={project.status} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {project.orphanedSkills.map((skill) => (
                            <Link key={skill.skillId} to={`/skills/${skill.skillId}`}>
                              <Badge tone="critical">
                                {skill.name} · L{skill.minLevel}+
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              ) : (
                <Card>
                  <CardBody className="pt-5">
                    <EmptyState
                      icon={<ShieldCheck className="size-5" />}
                      title="No orphaned requirements"
                      description="Every skill they contribute is also covered by somebody else on the same projects."
                    />
                  </CardBody>
                </Card>
              )}

              {impact.criticalSkills.length > 0 ? (
                <Card>
                  <CardHeader title="Company-wide scarcity" description="Skills where they are one of very few experts." />
                  <CardBody className="flex flex-wrap gap-1.5">
                    {impact.criticalSkills.map((skill) => (
                      <Link key={skill.skillId} to={`/skills/${skill.skillId}`}>
                        <HueBadge hue={skill.otherExperts === 0 ? 25 : 75}>
                          {skill.name} · {skill.otherExperts === 0 ? 'sole expert' : `${skill.otherExperts} others`}
                        </HueBadge>
                      </Link>
                    ))}
                  </CardBody>
                </Card>
              ) : null}

              <Card>
                <CardHeader
                  title="Who could step in"
                  description="Scored on how much of their level-3-and-above skill set the candidate already matches."
                />
                <CardBody className="-mx-1">
                  {impact.replacements.length === 0 ? (
                    <EmptyState title="No obvious successor" />
                  ) : (
                    impact.replacements.map((candidate) => (
                      <PersonRow
                        key={candidate.id}
                        person={candidate}
                        subtitle={`covers ${plural(candidate.matchedSkills.length, 'skill')}, missing ${candidate.missingSkills.length}`}
                        trailing={
                          <HueBadge hue={candidate.score >= 60 ? 155 : candidate.score >= 35 ? 75 : 25}>
                            {candidate.score}
                          </HueBadge>
                        }
                      />
                    ))
                  )}
                </CardBody>
              </Card>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
