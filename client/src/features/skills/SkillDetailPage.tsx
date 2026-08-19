import { Link, useParams } from 'react-router-dom';

import { useSkill } from '@/api/hooks';
import { PersonRow } from '@/components/domain/PersonCard';
import { CategoryBadge, SkillChip, StatusBadge } from '@/components/domain/SkillChip';
import { useTheme } from '@/components/providers/ThemeProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, HueBadge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { LevelPips, StatTile } from '@/components/ui/data';
import { EmptyState, ErrorState, Skeleton, SkeletonList } from '@/components/ui/states';
import { hueStyles } from '@/lib/color';
import { categoryHue, formatDate, plural, skillLevelLabel } from '@/lib/format';

export function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: skill, isPending, error, refetch } = useSkill(id);
  const { isDark } = useTheme();

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} className="mt-8" />;

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <SkeletonList rows={5} />
      </div>
    );
  }

  const hue = categoryHue(skill.category);
  const styles = hueStyles(hue, isDark);
  const maxCount = Math.max(...skill.levelDistribution.map((entry) => entry.count), 1);

  return (
    <div className="animate-fade-rise">
      <PageHeader
        crumbs={[{ label: 'Skills', to: '/skills' }, { label: skill.name }]}
        title={skill.name}
        description={skill.description}
        actions={<CategoryBadge category={skill.category} />}
      />

      <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="People who hold it" value={skill.holders} hue={hue} />
        <StatTile
          label="At expert level"
          value={skill.experts}
          detail="Level 4 or 5"
          hue={skill.experts <= 1 ? 25 : skill.experts <= 3 ? 75 : 155}
        />
        <StatTile label="Live projects needing it" value={skill.demandedBy} hue={200} />
        <StatTile label="Average proficiency" value={`${skill.averageLevel.toFixed(1)}`} detail="out of 5" hue={275} />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Adjacent skills"
              description="Competencies that transfer. The career pathfinder uses these to tell someone “you already know X, so this is a short climb” instead of just listing a gap."
            />
            <CardBody>
              {skill.adjacent.length === 0 ? (
                <EmptyState title="No adjacent skills recorded" />
              ) : (
                <ul className="space-y-2.5">
                  {skill.adjacent.map((adjacent) => (
                    <li key={adjacent.id} className="flex items-center gap-3">
                      <div className="w-44 shrink-0">
                        <SkillChip id={adjacent.id} name={adjacent.name} category={adjacent.category} />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${adjacent.similarity * 100}%`,
                            backgroundColor: hueStyles(categoryHue(adjacent.category), isDark).solid,
                          }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--color-ink-muted)]">
                        {Math.round(adjacent.similarity * 100)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Strongest holders" description="Ranked by proficiency, then endorsements." />
            <CardBody className="-mx-1">
              {skill.topHolders.length === 0 ? (
                <EmptyState title="Nobody holds this skill yet" />
              ) : (
                skill.topHolders.map((holder) => (
                  <PersonRow
                    key={holder.id}
                    person={holder}
                    subtitle={`${holder.title} · last used ${formatDate(holder.lastUsedAt)}`}
                    trailing={
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          {skillLevelLabel(holder.level)}
                        </span>
                        <LevelPips level={holder.level} hue={hue} />
                      </div>
                    }
                  />
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Proficiency spread" />
            <CardBody className="space-y-2">
              {skill.levelDistribution.map((entry) => (
                <div key={entry.level} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-[var(--color-ink-muted)]">
                    {skillLevelLabel(entry.level)}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-surface-muted)]">
                    <div
                      className="h-full rounded transition-[width] duration-500"
                      style={{
                        width: `${(entry.count / maxCount) * 100}%`,
                        backgroundColor: entry.level >= 4 ? styles.solid : styles.border,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-[var(--color-ink-muted)]">
                    {entry.count}
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>

          {skill.requiredByProjects.length > 0 ? (
            <Card>
              <CardHeader title="Projects requiring it" />
              <CardBody className="space-y-2">
                {skill.requiredByProjects.map((project) => (
                  <Link
                    key={project.projectId}
                    to={`/projects/${project.projectId}`}
                    className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--color-surface-muted)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-ink)]">{project.name}</p>
                      <p className="text-xs text-[var(--color-ink-faint)]">
                        needs level {project.minLevel}+
                      </p>
                    </div>
                    <StatusBadge status={project.status} />
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {skill.requiredByRoles.length > 0 ? (
            <Card>
              <CardHeader title="Roles expecting it" description={plural(skill.requiredByRoles.length, 'role')} />
              <CardBody className="flex flex-wrap gap-2">
                {skill.requiredByRoles.map((role) => (
                  <HueBadge key={role.roleId} hue={hue} title={`${role.title} — needs level ${role.minLevel}+`}>
                    {role.title}
                    <Badge className="ml-1 bg-transparent px-0 text-[10px] opacity-70">L{role.minLevel}</Badge>
                  </HueBadge>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
