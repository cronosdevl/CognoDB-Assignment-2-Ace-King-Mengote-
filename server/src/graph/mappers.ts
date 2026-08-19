import type { Record as Neo4jRecord } from 'neo4j-driver';
import { isInt } from 'neo4j-driver';

/**
 * The driver is configured with `disableLosslessIntegers`, so integers already
 * arrive as JS numbers. These helpers exist for the edges of that guarantee —
 * aggregates that come back as `Integer`, and nulls from OPTIONAL MATCH.
 */
export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (isInt(value)) return value.toNumber();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function toBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Read a field that the query already shaped as the target DTO. */
export function field<T>(record: Neo4jRecord, key: string): T {
  return record.get(key) as T;
}

export function optionalField<T>(record: Neo4jRecord, key: string): T | null {
  const value = record.get(key);
  return value === null || value === undefined ? null : (value as T);
}

/** Read a list field, tolerating null from an empty OPTIONAL MATCH. */
export function listField<T>(record: Neo4jRecord, key: string): T[] {
  const value = record.get(key);
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Deduplicate objects by a key selector, preserving first-seen order. */
export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
