

export interface HueStyles {
  soft: string;
  ink: string;
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

export function ratioHue(ratio: number): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped < 0.35) return 25 + (clamped / 0.35) * 20; // red → deep orange
  if (clamped < 0.65) return 45 + ((clamped - 0.35) / 0.3) * 35; // orange → amber
  return 145 + ((clamped - 0.65) / 0.35) * 20; // green → deeper green
}

export function riskHue(ratio: number): number {
  return ratioHue(1 - ratio);
}
