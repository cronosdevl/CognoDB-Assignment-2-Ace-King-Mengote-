import type { ReactNode } from 'react';

import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/cn';
import { hueStyles, ratioHue } from '@/lib/color';
import { percent } from '@/lib/format';

export function StatTile({
  label,
  value,
  detail,
  icon,
  hue,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  hue?: number;
  className?: string;
}) {
  const { isDark } = useTheme();
  const styles = hue !== undefined ? hueStyles(hue, isDark) : null;

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-[var(--color-ink-muted)] uppercase">{label}</p>
        {icon ? (
          <span
            className="flex size-7 items-center justify-center rounded-md"
            style={
              styles
                ? { backgroundColor: styles.soft, color: styles.ink }
                : { backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent-ink)' }
            }
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-[var(--color-ink)]">{value}</p>
      {detail ? <div className="mt-1.5 text-xs text-[var(--color-ink-muted)]">{detail}</div> : null}
    </div>
  );
}

export function Meter({
  value,
  label,
  showValue = true,
  colorByValue = true,
  hue,
  className,
}: {
  value: number;
  label?: ReactNode;
  showValue?: boolean;
  colorByValue?: boolean;
  hue?: number;
  className?: string;
}) {
  const { isDark } = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const resolvedHue = hue ?? (colorByValue ? ratioHue(clamped) : 275);
  const styles = hueStyles(resolvedHue, isDark);

  return (
    <div className={cn('w-full', className)}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label ? <span className="truncate text-xs text-[var(--color-ink-muted)]">{label}</span> : <span />}
          {showValue ? (
            <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: styles.ink }}>
              {percent(clamped)}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
        role="progressbar"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${clamped * 100}%`, backgroundColor: styles.solid }}
        />
      </div>
    </div>
  );
}

export function LevelPips({
  level,
  required,
  hue = 275,
  className,
}: {
  level: number;
  required?: number;
  hue?: number;
  className?: string;
}) {
  const { isDark } = useTheme();
  const styles = hueStyles(hue, isDark);

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`Level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((pip) => {
        const filled = pip <= level;
        const isTarget = required !== undefined && pip === required;
        return (
          <span
            key={pip}
            className={cn('h-3 w-1.5 rounded-[2px] transition-colors', isTarget && !filled && 'ring-1')}
            style={{
              backgroundColor: filled ? styles.solid : 'var(--color-surface-muted)',
              ...(isTarget && !filled ? { boxShadow: `inset 0 0 0 1px ${styles.solid}` } : {}),
            }}
          />
        );
      })}
    </span>
  );
}

export function DefinitionRow({
  term,
  children,
  className,
}: {
  term: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-2 text-sm', className)}>
      <dt className="shrink-0 text-[var(--color-ink-muted)]">{term}</dt>
      <dd className="min-w-0 text-right font-medium text-[var(--color-ink)]">{children}</dd>
    </div>
  );
}
