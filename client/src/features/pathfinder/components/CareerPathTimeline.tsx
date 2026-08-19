import type { CareerPath, SkillGapEntry } from '@wayfinder/shared';
import { ArrowUpRight, CheckCircle2, Lightbulb, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar } from '@/components/domain/Avatar';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Badge, HueBadge } from '@/components/ui/Badge';
import { LevelPips, Meter } from '@/components/ui/data';
import { hueStyles, ratioHue } from '@/lib/color';
import { categoryHue, formatDuration, percent, plural } from '@/lib/format';

export function CareerPathTimeline({ path }: { path: CareerPath }) {
  const { isDark } = useTheme();

  return (
    <ol className="relative space-y-4">
      {path.steps.map((step, index) => {
        const hue = ratioHue(step.readiness);
        const styles = hueStyles(hue, isDark);
        const isLast = index === path.steps.length - 1;

        return (
          <li key={step.role.id} className="relative pl-11">
            {/* connector */}
            {!isLast ? (
              <span
                aria-hidden
                className="absolute top-9 bottom-[-1rem] left-[15px] w-px bg-[var(--color-border-strong)]"
              />
            ) : null}

            <span
              aria-hidden
              className="absolute top-1.5 left-0 flex size-8 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: styles.soft, color: styles.ink }}
            >
              {step.order}
            </span>

            <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-semibold text-[var(--color-ink)]">
                    {step.role.title}
                    {isLast ? <Badge tone="accent">Target</Badge> : null}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                    {step.role.family} · typically {formatDuration(step.typicalMonths)} in the previous role ·{' '}
                    {plural(step.role.holders, 'person holds it', 'people hold it')}
                  </p>
                </div>
                <div className="w-36 shrink-0">
                  <Meter value={step.readiness} label="Readiness" hue={hue} />
                </div>
              </div>

              {step.gaps.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-positive-soft)] px-3 py-2 text-sm text-[var(--color-positive)]">
                  <CheckCircle2 className="size-4 shrink-0" />
                  Every requirement for this role is already met.
                </p>
              ) : (
                <div className="mt-3.5">
                  <p className="mb-2 text-xs font-medium tracking-wide text-[var(--color-ink-faint)] uppercase">
                    {plural(step.gaps.length, 'skill gap')}
                  </p>
                  <ul className="space-y-2">
                    {step.gaps.map((gap) => (
                      <GapRow key={gap.skillId} gap={gap} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function GapRow({ gap }: { gap: SkillGapEntry }) {
  const hue = categoryHue(gap.category);

  return (
    <li className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <Link
          to={`/skills/${gap.skillId}`}
          className="text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-ink)]"
        >
          {gap.name}
        </Link>
        <span className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
          <LevelPips level={gap.currentLevel} required={gap.requiredLevel} hue={hue} />
          <span className="tabular-nums">
            {gap.currentLevel} → {gap.requiredLevel}
          </span>
        </span>
      </div>

      {gap.headStart ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-[var(--color-ink-muted)]">
          <Lightbulb className="mt-px size-3.5 shrink-0 text-[var(--color-caution)]" />
          <span>
            Head start: you already hold{' '}
            <Link to={`/skills/${gap.headStart.skillId}`} className="font-medium hover:underline">
              {gap.headStart.name}
            </Link>{' '}
            at level {gap.headStart.level} — {percent(gap.headStart.similarity)} transferable.
          </span>
        </p>
      ) : null}

      {gap.mentor ? (
        <div className="mt-2 flex items-center gap-2">
          <TrendingUp className="size-3.5 shrink-0 text-[var(--color-ink-faint)]" />
          <span className="text-xs text-[var(--color-ink-muted)]">Learn from</span>
          <Link
            to={`/people/${gap.mentor.id}`}
            className="group flex min-w-0 items-center gap-1.5 text-xs font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-ink)]"
          >
            <Avatar name={gap.mentor.name} hue={gap.mentor.avatarHue} size="xs" />
            <span className="truncate">{gap.mentor.name}</span>
            <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          {gap.mentor.collaborationDistance === 1 ? (
            <HueBadge hue={155} title="You have already worked on a project together">
              worked together
            </HueBadge>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-critical)]">
          Nobody in the company holds this at mentor level — this one needs external training.
        </p>
      )}
    </li>
  );
}
