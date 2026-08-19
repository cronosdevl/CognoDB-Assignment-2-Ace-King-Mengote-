import type { ProjectStatus } from '@wayfinder/shared';
import { Link } from 'react-router-dom';

import { useTheme } from '@/components/providers/ThemeProvider';
import { Badge, HueBadge } from '@/components/ui/Badge';
import { LevelPips } from '@/components/ui/data';
import { cn } from '@/lib/cn';
import { hueStyles } from '@/lib/color';
import { categoryHue, PROJECT_STATUS_LABELS, skillLevelLabel } from '@/lib/format';

export function SkillChip({
  id,
  name,
  category,
  level,
  requiredLevel,
  className,
}: {
  id: string;
  name: string;
  category: string;
  level?: number;
  requiredLevel?: number;
  className?: string;
}) {
  const { isDark } = useTheme();
  const hue = categoryHue(category);
  const styles = hueStyles(hue, isDark);

  return (
    <Link
      to={`/skills/${id}`}
      title={level !== undefined ? `${name} — ${skillLevelLabel(level)} (${level}/5)` : `${name} — ${category}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80',
        className,
      )}
      style={{ backgroundColor: styles.soft, color: styles.ink }}
    >
      <span className="truncate">{name}</span>
      {level !== undefined ? <LevelPips level={level} required={requiredLevel} hue={hue} /> : null}
    </Link>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return <HueBadge hue={categoryHue(category)}>{category}</HueBadge>;
}

const STATUS_TONES: Record<ProjectStatus, 'positive' | 'accent' | 'neutral' | 'caution'> = {
  active: 'positive',
  planned: 'accent',
  completed: 'neutral',
  paused: 'caution',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>;
}
