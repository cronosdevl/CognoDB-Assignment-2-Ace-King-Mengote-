import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names, letting later Tailwind utilities win over earlier ones.
 * Without the merge step a `className` prop cannot override a component's own
 * padding or colour, which makes every primitive a dead end.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
