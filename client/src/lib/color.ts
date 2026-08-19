/**
 * Colour is generated from a hue angle rather than picked from a palette, so a
 * new skill category or a new person needs no design work to look right.
 * Lightness and chroma are fixed per role (text, fill, border) which keeps
 * contrast predictable across every hue.
 */

export interface HueStyles {
  /** Tinted background for chips and badges. */
  soft: string;
  /** Readable text on top of `soft`. */
  ink: string;
  /** Saturated fill for bars, dots and graph nodes. */
  solid: string;
  border: string;
}

export function hueStyles(hue: number, isDark: boolean): HueStyles {
  return isDark
    ? {
        soft: `oklch(30% 0.055 ${hue})`,
        ink: `oklch(85% 0.10 ${hue})`,
        solid: `oklch(70% 0.14 ${hue})`,
        border: `oklch(40% 0.07 ${hue})`,
      }
    : {
        soft: `oklch(95.5% 0.035 ${hue})`,
        ink: `oklch(45% 0.14 ${hue})`,
        solid: `oklch(58% 0.16 ${hue})`,
        border: `oklch(88% 0.05 ${hue})`,
      };
}

/** Deterministic avatar gradient from the hue stored on each person. */
export function avatarGradient(hue: number, isDark: boolean): string {
  const from = isDark ? `oklch(52% 0.13 ${hue})` : `oklch(72% 0.13 ${hue})`;
  const to = isDark ? `oklch(40% 0.12 ${(hue + 40) % 360})` : `oklch(62% 0.14 ${(hue + 40) % 360})`;
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] as string).slice(0, 2).toUpperCase();
  return `${(parts[0] as string)[0] ?? ''}${(parts[parts.length - 1] as string)[0] ?? ''}`.toUpperCase();
}

/**
 * Traffic-light hue for a 0–1 ratio where higher is better.
 * 25 red · 75 amber · 155 green, interpolated so there are no hard jumps.
 */
export function ratioHue(ratio: number): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped < 0.5) return 25 + (clamped / 0.5) * 50;
  return 75 + ((clamped - 0.5) / 0.5) * 80;
}

/** Same scale inverted, for values where higher is worse (risk, severity). */
export function riskHue(ratio: number): number {
  return ratioHue(1 - ratio);
}
