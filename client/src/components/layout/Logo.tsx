import { cn } from '@/lib/cn';

/**
 * The Wayfinder mark: an orbiting-electron atom inside a refresh arc.
 *
 * Drawn rather than imported as an image so it stays crisp at any size and
 * needs no network request — the sidebar renders it at 32px and the favicon
 * (`public/favicon.svg`) is the same geometry. If one changes, change both.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Wayfinder"
      className={cn('shrink-0', className)}
    >
      <circle cx="50" cy="50" r="50" fill="#20232a" />

      {/* Electron orbits */}
      <g fill="none" stroke="#61dafb" strokeWidth="3.4">
        <ellipse cx="50" cy="50" rx="25" ry="9.6" />
        <ellipse cx="50" cy="50" rx="25" ry="9.6" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="25" ry="9.6" transform="rotate(120 50 50)" />
      </g>
      <circle cx="50" cy="50" r="5.4" fill="#61dafb" />

      {/* Refresh arc, broken at the top */}
      <path
        d="M 36 11.5 A 41 41 0 1 0 81.4 23.6"
        fill="none"
        stroke="#61dafb"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="36" cy="11.5" r="4.6" fill="#20232a" stroke="#61dafb" strokeWidth="3.4" />
      <g transform="translate(81.4 23.6) rotate(-35)">
        <path d="M 0 -8 L 5.6 5 L -5.6 5 Z" fill="#61dafb" />
      </g>
    </svg>
  );
}
