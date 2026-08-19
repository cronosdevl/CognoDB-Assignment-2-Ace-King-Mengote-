import type { ProjectSummary } from '@wayfinder/shared';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatusBadge } from '@/components/domain/SkillChip';
import { Meter } from '@/components/ui/data';
import { plural } from '@/lib/format';

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-wide text-[var(--color-ink-faint)]">{project.code}</p>
          <h3 className="mt-1 font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent-ink)]">
            {project.name}
          </h3>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        {project.summary}
      </p>

      <div className="mt-auto pt-4">
        <Meter
          value={project.coverage}
          label={`Skill coverage · ${plural(project.requiredSkillCount, 'requirement')}`}
        />
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-ink-faint)]">
          <Users className="size-3.5" />
          {plural(project.headcount, 'person', 'people')} · {project.businessUnit}
        </div>
      </div>
    </Link>
  );
}
