import { AlertTriangle, CheckCircle2, Radar, UserPlus, Users } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useHiddenExperts, useProject } from '@/api/hooks';
import { AvatarStack } from '@/components/domain/Avatar';
import { PersonRow } from '@/components/domain/PersonCard';
import { SkillChip, StatusBadge } from '@/components/domain/SkillChip';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, HueBadge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DefinitionRow, LevelPips, Meter } from '@/components/ui/data';
import { EmptyState, ErrorState, Skeleton, SkeletonList } from '@/components/ui/states';
import { categoryHue, formatDate, percent, plural, skillLevelLabel } from '@/lib/format';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isPending, error, refetch } = useProject(id);
  const { data: hiddenExperts, isPending: expertsPending } = useHiddenExperts(id);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} className="mt-8" />;

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <SkeletonList rows={5} />
      </div>
    );
  }

  return (
    <div className="animate-fade-rise">
      <PageHeader
        crumbs={[{ label: 'Projects', to: '/projects' }, { label: project.code }]}
        title={project.name}
        description={project.summary}
        actions={<StatusBadge status={project.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Skill requirements"
              description="A requirement is covered when at least one person staffed on the project meets the minimum level."
              action={
                <span className="text-xs font-semibold text-[var(--color-ink-muted)] tabular-nums">
                  {percent(project.coverage)} covered
                </span>
              }
            />
            <CardBody>
              <Meter value={project.coverage} showValue={false} className="mb-5" />

              <ul className="space-y-3">
                {project.requirements.map((requirement) => (
                  <li
                    key={requirement.skillId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[var(--color-border-subtle)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SkillChip
                          id={requirement.skillId}
                          name={requirement.name}
                          category={requirement.category}
                        />
                        {requirement.covered ? (
                          <Badge tone="positive">
                            <CheckCircle2 className="size-3" />
                            Covered
                          </Badge>
                        ) : (
                          <Badge tone="critical">
                            <AlertTriangle className="size-3" />
                            Gap
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                        <span>
                          needs {skillLevelLabel(requirement.minLevel)} ({requirement.minLevel}/5)
                        </span>
                        <LevelPips
                          level={0}
                          required={requirement.minLevel}
                          hue={categoryHue(requirement.category)}
                        />
                      </p>
                    </div>

                    {requirement.coveredBy.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <AvatarStack people={requirement.coveredBy} max={4} />
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-ink-faint)]">nobody staffed</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Radar className="size-4 text-[var(--color-accent)]" />
                  Hidden experts
                </span>
              }
              description="Qualified people who are not on this project, ranked by how socially close they already are to the team. Distance 1 means they have shipped with somebody on it."
            />
            <CardBody>
              {expertsPending ? (
                <SkeletonList rows={3} />
              ) : !hiddenExperts || hiddenExperts.length === 0 ? (
                <EmptyState
                  title="No untapped experts"
                  description="Everyone with the required skills is already staffed here."
                />
              ) : (
                <ul className="-mx-1 space-y-1">
                  {hiddenExperts.map((expert) => (
                    <li key={expert.id}>
                      <PersonRow
                        person={expert}
                        subtitle={
                          expert.connectedVia.length > 0
                            ? `via ${expert.connectedVia.map((person) => person.name).join(', ')}`
                            : 'no shared history with the team'
                        }
                        trailing={
                          <div className="flex items-center gap-2">
                            <HueBadge
                              hue={expert.distance === 1 ? 155 : expert.distance === 2 ? 75 : 25}
                              title={`${expert.distance} collaboration hop(s) from the project team`}
                            >
                              {expert.distance === 1
                                ? '1 hop'
                                : expert.distance === 2
                                  ? '2 hops'
                                  : 'no link'}
                            </HueBadge>
                            <Badge>{plural(expert.matchedSkills.length, 'match', 'matches')}</Badge>
                          </div>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardBody className="pt-5">
              <dl className="divide-y divide-[var(--color-border-subtle)]">
                <DefinitionRow term="Code">
                  <span className="font-mono">{project.code}</span>
                </DefinitionRow>
                <DefinitionRow term="Business unit">{project.businessUnit}</DefinitionRow>
                <DefinitionRow term="Started">{formatDate(project.startedAt)}</DefinitionRow>
                {project.endedAt ? (
                  <DefinitionRow term="Ended">{formatDate(project.endedAt)}</DefinitionRow>
                ) : null}
                <DefinitionRow term="Headcount">{project.headcount}</DefinitionRow>
                <DefinitionRow term="Requirements">{project.requiredSkillCount}</DefinitionRow>
                <DefinitionRow term="Open gaps">
                  <span className={project.gaps.length > 0 ? 'text-[var(--color-critical)]' : undefined}>
                    {project.gaps.length}
                  </span>
                </DefinitionRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Users className="size-4" />
                  Team
                </span>
              }
              description={plural(project.team.length, 'person', 'people')}
            />
            <CardBody className="-mx-1">
              {project.team.length === 0 ? (
                <EmptyState title="Nobody staffed yet" />
              ) : (
                project.team.map((member) => (
                  <PersonRow
                    key={member.id}
                    person={member}
                    subtitle={`${member.contribution} · ${member.allocationPct}%`}
                  />
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  Suggested additions
                </span>
              }
              description="Scored on how much of the requirement set they cover, including near-matches through adjacent skills."
            />
            <CardBody className="-mx-1">
              {project.candidates.length === 0 ? (
                <EmptyState title="No candidates found" />
              ) : (
                project.candidates.map((candidate) => (
                  <PersonRow
                    key={candidate.id}
                    person={candidate}
                    subtitle={candidate.matchedSkills
                      .slice(0, 3)
                      .map((skill) => skill.name + (skill.viaAdjacent ? ' (adjacent)' : ''))
                      .join(', ')}
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
        </div>
      </div>
    </div>
  );
}
