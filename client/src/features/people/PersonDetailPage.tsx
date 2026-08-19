import { Award, Building2, CalendarDays, GraduationCap, Mail, MapPin, Route, Sparkles, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { usePerson, usePersonGraph } from '@/api/hooks';
import { Avatar } from '@/components/domain/Avatar';
import { PersonRow } from '@/components/domain/PersonCard';
import { SkillChip, StatusBadge } from '@/components/domain/SkillChip';
import { NetworkGraph } from '@/components/graph/NetworkGraph';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DefinitionRow } from '@/components/ui/data';
import { EmptyState, ErrorState, Skeleton, SkeletonList } from '@/components/ui/states';
import { formatDate, formatTenure, plural } from '@/lib/format';

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: person, isPending, error, refetch } = usePerson(id);
  const { data: graph, isPending: graphPending } = usePersonGraph(id);

  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} className="mt-8" />;
  }

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-5">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <SkeletonList rows={4} />
      </div>
    );
  }

  const expertSkills = person.skills.filter((skill) => skill.level >= 4);

  return (
    <div className="animate-fade-rise">
      <PageHeader
        crumbs={[{ label: 'People', to: '/people' }, { label: person.name }]}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={person.name} hue={person.avatarHue} size="xl" />
            <span className="min-w-0">
              <span className="block truncate">{person.name}</span>
              <span className="mt-1 block text-base font-normal text-[var(--color-ink-muted)]">
                {person.title}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {person.roleId ? (
              <LinkButton to={`/pathfinder?personId=${person.id}`} variant="primary">
                <Route className="size-4" />
                Plan a career path
              </LinkButton>
            ) : null}
            <LinkButton to={`/risk?personId=${person.id}`} variant="secondary">
              What if they leave?
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Skills"
              description={`${plural(person.skills.length, 'skill')} · ${expertSkills.length} at expert level`}
            />
            <CardBody>
              {person.skills.length === 0 ? (
                <EmptyState title="No skills recorded" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {person.skills.map((skill) => (
                    <SkillChip
                      key={skill.skillId}
                      id={skill.skillId}
                      name={skill.name}
                      category={skill.category}
                      level={skill.level}
                    />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Collaboration network"
              description="Derived from shared projects and mentorship — there is no “colleague” relationship in the graph, it is a two-hop traversal."
            />
            <CardBody>
              {graphPending ? (
                <Skeleton className="h-[460px] w-full" />
              ) : graph && graph.nodes.length > 1 ? (
                <NetworkGraph payload={graph} />
              ) : (
                <EmptyState
                  icon={<Users className="size-5" />}
                  title="No collaborators yet"
                  description="This person has not shared a project with anyone."
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Projects" description={plural(person.projects.length, 'project')} />
            <CardBody>
              {person.projects.length === 0 ? (
                <EmptyState title="Not staffed on any project" />
              ) : (
                <ul className="divide-y divide-[var(--color-border-subtle)]">
                  {person.projects.map((project) => (
                    <li key={project.projectId}>
                      <Link
                        to={`/projects/${project.projectId}`}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-[var(--color-surface-muted)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
                            <span className="truncate">{project.name}</span>
                            <span className="shrink-0 font-mono text-xs text-[var(--color-ink-faint)]">
                              {project.code}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                            {project.contribution} · {project.allocationPct}% allocation
                          </p>
                        </div>
                        <StatusBadge status={project.status} />
                      </Link>
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
              <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">{person.bio}</p>

              <dl className="mt-4 divide-y divide-[var(--color-border-subtle)]">
                <DefinitionRow term={<span className="flex items-center gap-1.5"><Mail className="size-3.5" />Email</span>}>
                  <a href={`mailto:${person.email}`} className="hover:text-[var(--color-accent-ink)]">
                    {person.email}
                  </a>
                </DefinitionRow>
                {person.teamName ? (
                  <DefinitionRow term={<span className="flex items-center gap-1.5"><Building2 className="size-3.5" />Team</span>}>
                    {person.teamName}
                  </DefinitionRow>
                ) : null}
                {person.departmentName ? (
                  <DefinitionRow term="Department">{person.departmentName}</DefinitionRow>
                ) : null}
                {person.locationLabel ? (
                  <DefinitionRow term={<span className="flex items-center gap-1.5"><MapPin className="size-3.5" />Location</span>}>
                    {person.locationLabel}
                  </DefinitionRow>
                ) : null}
                <DefinitionRow term={<span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />Joined</span>}>
                  {formatDate(person.joinedAt)}
                </DefinitionRow>
                <DefinitionRow term="Tenure">{formatTenure(person.tenureMonths)}</DefinitionRow>
                {person.roleTitle ? (
                  <DefinitionRow term="Role profile">
                    <Link to={`/pathfinder?personId=${person.id}`} className="hover:text-[var(--color-accent-ink)]">
                      {person.roleTitle}
                    </Link>
                  </DefinitionRow>
                ) : null}
              </dl>

              {person.openToMove ? (
                <Badge tone="accent" className="mt-4">
                  <Sparkles className="size-3" />
                  Open to an internal move
                </Badge>
              ) : null}
            </CardBody>
          </Card>

          {person.manager || person.reports.length > 0 ? (
            <Card>
              <CardHeader title="Reporting line" />
              <CardBody className="-mx-1">
                {person.manager ? (
                  <>
                    <p className="mb-1 px-3 text-xs font-medium tracking-wide text-[var(--color-ink-faint)] uppercase">
                      Manager
                    </p>
                    <PersonRow person={person.manager} />
                  </>
                ) : null}
                {person.reports.length > 0 ? (
                  <>
                    <p className="mt-3 mb-1 px-3 text-xs font-medium tracking-wide text-[var(--color-ink-faint)] uppercase">
                      {plural(person.reports.length, 'direct report')}
                    </p>
                    {person.reports.map((report) => (
                      <PersonRow key={report.id} person={report} />
                    ))}
                  </>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {person.mentors.length > 0 || person.mentees.length > 0 ? (
            <Card>
              <CardHeader
                title="Mentorship"
                description="Mentors are matched by expertise, not by the org chart."
              />
              <CardBody className="-mx-1">
                {person.mentors.length > 0 ? (
                  <>
                    <p className="mb-1 flex items-center gap-1.5 px-3 text-xs font-medium tracking-wide text-[var(--color-ink-faint)] uppercase">
                      <GraduationCap className="size-3.5" />
                      Mentored by
                    </p>
                    {person.mentors.map((mentor) => (
                      <PersonRow key={mentor.id} person={mentor} />
                    ))}
                  </>
                ) : null}
                {person.mentees.length > 0 ? (
                  <>
                    <p className="mt-3 mb-1 px-3 text-xs font-medium tracking-wide text-[var(--color-ink-faint)] uppercase">
                      Mentoring
                    </p>
                    {person.mentees.map((mentee) => (
                      <PersonRow key={mentee.id} person={mentee} />
                    ))}
                  </>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {person.collaborators.length > 0 ? (
            <Card>
              <CardHeader title="Closest collaborators" description="Ranked by projects shipped together." />
              <CardBody className="-mx-1">
                {person.collaborators.slice(0, 8).map((collaborator) => (
                  <PersonRow
                    key={collaborator.id}
                    person={collaborator}
                    subtitle={collaborator.sharedProjectNames.slice(0, 2).join(', ')}
                    trailing={
                      <Badge>{plural(collaborator.sharedProjects, 'project')}</Badge>
                    }
                  />
                ))}
              </CardBody>
            </Card>
          ) : null}

          {person.certifications.length > 0 ? (
            <Card>
              <CardHeader title="Certifications" />
              <CardBody className="space-y-2.5">
                {person.certifications.map((certification) => (
                  <div key={certification.id} className="flex items-start gap-2.5">
                    <Award className="mt-0.5 size-4 shrink-0 text-[var(--color-ink-faint)]" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-ink)]">{certification.name}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {certification.issuer} · {formatDate(certification.earnedOn)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
