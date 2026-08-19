/**
 * A small deterministic PRNG so `npm run seed` produces the same graph on every
 * machine. Reproducibility matters here: the README quotes concrete numbers and
 * the screenshots show specific people, so the dataset cannot drift between
 * runs.
 *
 * mulberry32 — fast, tiny, good enough for generating plausible test data.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with an empty array');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** `count` distinct members, or the whole array if it is shorter. */
  sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const taken: T[] = [];
    const n = Math.min(count, pool.length);
    for (let i = 0; i < n; i += 1) {
      const index = Math.floor(this.next() * pool.length);
      taken.push(pool.splice(index, 1)[0] as T);
    }
    return taken;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      const a = out[i] as T;
      const b = out[j] as T;
      out[i] = b;
      out[j] = a;
    }
    return out;
  }

  /** Weighted pick. Weights need not sum to 1. */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1]![0];
  }

  /** ISO date string `daysAgoMax`…`daysAgoMin` days in the past. */
  pastDate(daysAgoMin: number, daysAgoMax: number, reference: Date): string {
    const days = this.int(daysAgoMin, daysAgoMax);
    const date = new Date(reference.getTime() - days * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }
}
