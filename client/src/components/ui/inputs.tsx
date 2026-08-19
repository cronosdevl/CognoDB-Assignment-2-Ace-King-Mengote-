import { Search, X } from 'lucide-react';
import type { ReactNode, SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const FIELD =
  'h-10 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-sm text-[var(--color-ink)] transition-colors placeholder:text-[var(--color-ink-faint)] hover:border-[var(--color-ink-faint)] focus:border-[var(--color-accent)]';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--color-ink-faint)]" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(FIELD, 'pr-9 pl-9', '[&::-webkit-search-cancel-button]:appearance-none')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({ label, className, children, ...rest }: SelectProps) {
  return (
    <label className={cn('block', className)}>
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-[var(--color-ink-muted)]">{label}</span>
      ) : null}
      <select
        className={cn(
          FIELD,
          'cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat px-3 pr-9',
          // Inline chevron so no icon font or extra element is needed.
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22 stroke-linecap=%22round%22><path d=%22M6 9l6 6 6-6%22/></svg>')]",
        )}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

/** Segmented control for small, mutually exclusive choices. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              selected
                ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
