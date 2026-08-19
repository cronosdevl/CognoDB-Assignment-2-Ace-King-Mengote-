import type { ReactNode } from 'react';

import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/cn';
import { hueStyles } from '@/lib/color';

type Tone = 'neutral' | 'accent' | 'positive' | 'caution' | 'critical';

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]',
  accent: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]',
  positive: 'bg-[var(--color-positive-soft)] text-[var(--color-positive)]',
  caution: 'bg-[var(--color-caution-soft)] text-[var(--color-caution)]',
  critical: 'bg-[var(--color-critical-soft)] text-[var(--color-critical)]',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function HueBadge({
  children,
  hue,
  className,
  title,
}: {
  children: ReactNode;
  hue: number;
  className?: string;
  title?: string;
}) {
  const { isDark } = useTheme();
  const styles = hueStyles(hue, isDark);
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        className,
      )}
      style={{ backgroundColor: styles.soft, color: styles.ink }}
    >
      {children}
    </span>
  );
}

export function Dot({ hue, className }: { hue: number; className?: string }) {
  const { isDark } = useTheme();
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: hueStyles(hue, isDark).solid }}
    />
  );
}
