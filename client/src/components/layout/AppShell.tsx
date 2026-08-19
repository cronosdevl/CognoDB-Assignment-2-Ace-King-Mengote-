import {
  Compass,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Moon,
  Route,
  ShieldAlert,
  Sun,
  Users,
  Waypoints,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { DatabaseBanner } from '@/components/layout/DatabaseBanner';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/pathfinder', label: 'Career pathfinder', icon: Route },
  { to: '/people', label: 'People', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/skills', label: 'Skills', icon: Compass },
  { to: '/connections', label: 'Connections', icon: Waypoints },
  { to: '/risk', label: 'Key-person risk', icon: ShieldAlert },
] as const;

export function AppShell() {
  const { isDark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-full">
      {/* Mobile scrim */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-surface)] transition-transform duration-250 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-accent)]">
            <Waypoints className="size-4.5 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">Wayfinder</p>
            <p className="truncate text-[11px] text-[var(--color-ink-faint)]">Meridian Labs</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="ml-auto rounded-md p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
                )
              }
            >
              <item.icon className="size-4.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--color-border-subtle)] p-3">
          <button
            type="button"
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <p className="mt-2 px-3 pb-1 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            Graph data served by CognoDB over Bolt.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-canvas)]/85 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-semibold text-[var(--color-ink)]">Wayfinder</span>
        </header>

        <DatabaseBanner />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
