import type { PersonSummary } from '@wayfinder/shared';
import { MapPin, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Avatar } from '@/components/domain/Avatar';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

export function PersonRow({
  person,
  trailing,
  subtitle,
  className,
}: {
  person: PersonSummary;
  trailing?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={`/people/${person.id}`}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-muted)]',
        className,
      )}
    >
      <Avatar name={person.name} hue={person.avatarHue} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-ink)] group-hover:text-[var(--color-accent-ink)]">
          {person.name}
        </p>
        <p className="truncate text-xs text-[var(--color-ink-muted)]">{subtitle ?? person.title}</p>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </Link>
  );
}

export function PersonCard({ person }: { person: PersonSummary }) {
  return (
    <Link
      to={`/people/${person.id}`}
      className="group flex flex-col rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={person.name} hue={person.avatarHue} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-accent-ink)]">
            {person.name}
          </p>
          <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">{person.title}</p>
          {person.teamName ? (
            <p className="mt-0.5 truncate text-xs text-[var(--color-ink-faint)]">{person.teamName}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge>{person.seniority}</Badge>
        {person.openToMove ? (
          <Badge tone="accent">
            <Sparkles className="size-3" />
            Open to move
          </Badge>
        ) : null}
      </div>

      {person.locationLabel ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-ink-faint)]">
          <MapPin className="size-3.5" />
          <span className="truncate">{person.locationLabel}</span>
        </p>
      ) : null}
    </Link>
  );
}
