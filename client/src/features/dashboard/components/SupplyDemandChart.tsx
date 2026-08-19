import type { OverviewStats } from '@wayfinder/shared';
import { Link } from 'react-router-dom';

import { useTheme } from '@/components/providers/ThemeProvider';
import { hueStyles } from '@/lib/color';
import { categoryHue } from '@/lib/format';

type Row = OverviewStats['topSkillsByDemand'][number];

export function SupplyDemandChart({ data }: { data: Row[] }) {
  const { isDark } = useTheme();

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--color-ink-muted)]">No skills in demand yet.</p>;
  }

  const maxDemand = Math.max(...data.map((row) => row.demand), 1);
  const maxSupply = Math.max(...data.map((row) => row.supply), 1);

  return (
    <div className="space-y-3.5">
      {data.map((row) => {
        const hue = categoryHue(row.category);
        const styles = hueStyles(hue, isDark);
        return (
          <Link
            key={row.skillId}
            to={`/skills/${row.skillId}`}
            className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-muted)]"
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-[var(--color-ink)]">{row.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-[var(--color-ink-muted)]">
                {row.demand} needed · {row.supply} hold it
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[10px] tracking-wide text-[var(--color-ink-faint)] uppercase">
                  Demand
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(row.demand / maxDemand) * 100}%`, backgroundColor: styles.solid }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[10px] tracking-wide text-[var(--color-ink-faint)] uppercase">
                  Supply
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(row.supply / maxSupply) * 100}%`, backgroundColor: styles.border }}
                  />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
