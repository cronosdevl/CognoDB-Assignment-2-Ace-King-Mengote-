import type { PersonSummary } from '@wayfinder/shared';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { usePeople } from '@/api/hooks';
import { Avatar } from '@/components/domain/Avatar';
import { SearchInput } from '@/components/ui/inputs';
import { Skeleton } from '@/components/ui/states';
import { useDebounced } from '@/hooks/useDebounced';
import { cn } from '@/lib/cn';

/**
 * Type-ahead person selector.
 *
 * A plain <select> over 184 people is unusable, and loading them all to filter
 * client-side would defeat the point of the server-side search. This queries as
 * the user types and closes on outside click or Escape.
 */
export function PersonPicker({
  value,
  onChange,
  label,
  placeholder = 'Choose a person…',
  className,
}: {
  value: PersonSummary | null;
  onChange: (person: PersonSummary) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isPending } = usePeople({ q: debounced || undefined, limit: 12 });

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-[var(--color-ink-muted)]">{label}</span>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-12 w-full items-center gap-3 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-left transition-colors hover:border-[var(--color-ink-faint)]"
      >
        {value ? (
          <>
            <Avatar name={value.name} hue={value.avatarHue} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--color-ink)]">{value.name}</span>
              <span className="block truncate text-xs text-[var(--color-ink-muted)]">{value.title}</span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-[var(--color-ink-faint)]">{placeholder}</span>
        )}
        <ChevronDown className="size-4 shrink-0 text-[var(--color-ink-faint)]" />
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-lift)]">
          <div className="p-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search people…" autoFocus />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto px-2 pb-2">
            {isPending ? (
              <li className="space-y-2 p-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </li>
            ) : data && data.items.length > 0 ? (
              data.items.map((person) => {
                const selected = person.id === value?.id;
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(person);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                        selected
                          ? 'bg-[var(--color-accent-soft)]'
                          : 'hover:bg-[var(--color-surface-muted)]',
                      )}
                    >
                      <Avatar name={person.name} hue={person.avatarHue} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[var(--color-ink)]">
                          {person.name}
                        </span>
                        <span className="block truncate text-xs text-[var(--color-ink-muted)]">
                          {person.title}
                        </span>
                      </span>
                      {selected ? <Check className="size-4 shrink-0 text-[var(--color-accent)]" /> : null}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-6 text-center text-sm text-[var(--color-ink-muted)]">No matches</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
