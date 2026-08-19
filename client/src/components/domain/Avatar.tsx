import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/cn';
import { avatarGradient, initials } from '@/lib/color';

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-2xl',
} as const;

export function Avatar({
  name,
  hue,
  size = 'md',
  className,
  ring = false,
}: {
  name: string;
  hue: number;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}) {
  const { isDark } = useTheme();
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none',
        SIZES[size],
        ring && 'ring-2 ring-[var(--color-surface)]',
        className,
      )}
      style={{ backgroundImage: avatarGradient(hue, isDark) }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 5,
  size = 'sm',
}: {
  people: Array<{ id: string; name: string; avatarHue: number }>;
  max?: number;
  size?: keyof typeof SIZES;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((person) => (
          <Avatar key={person.id} name={person.name} hue={person.avatarHue} size={size} ring />
        ))}
      </div>
      {overflow > 0 ? (
        <span className="ml-2 text-xs font-medium text-[var(--color-ink-muted)]">+{overflow}</span>
      ) : null}
    </div>
  );
}
