import type { ProjectStatus, SkillCategory, SkillLevel } from '@wayfinder/shared';

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en', { year: 'numeric', month: 'short' });
}

export function formatTenure(months: number): string {
  if (months < 12) return plural(months, 'month');
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  if (remainder === 0) return plural(years, 'year');
  return `${plural(years, 'year')} ${remainder}m`;
}

export function formatDuration(months: number): string {
  if (months <= 0) return '—';
  if (months < 12) return `${months} months`;
  const years = months / 12;
  return years % 1 === 0 ? plural(years, 'year') : `${years.toFixed(1)} years`;
}

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  1: 'Aware',
  2: 'Working',
  3: 'Practising',
  4: 'Strong',
  5: 'Expert',
};

export function skillLevelLabel(level: number): string {
  return SKILL_LEVEL_LABELS[level as SkillLevel] ?? 'None';
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  planned: 'Planned',
  completed: 'Completed',
  paused: 'Paused',
};

/**
 * A fixed hue per skill category, so the same competency is the same colour on
 * every screen. Values are OKLCH hue angles fed to the helpers in `color.ts`.
 */
export const CATEGORY_HUES: Record<SkillCategory, number> = {
  Engineering: 258,
  'Data & AI': 300,
  Product: 200,
  Design: 340,
  Infrastructure: 175,
  Security: 25,
  Domain: 130,
  Leadership: 65,
};

export function categoryHue(category: string): number {
  return CATEGORY_HUES[category as SkillCategory] ?? 258;
}
