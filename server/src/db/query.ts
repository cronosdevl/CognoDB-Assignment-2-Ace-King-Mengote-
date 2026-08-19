import type { Record as Neo4jRecord, Session } from 'neo4j-driver';
import neo4j from 'neo4j-driver';

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { assertDriver } from './driver.js';
import { isRetryable, toAppError } from './errors.js';

/**
 * A named, immutable Cypher statement.
 *
 * Queries are *only* constructible through `defineQuery`, and the runners below
 * accept nothing else. Combined with the parameter object, this makes
 * string-concatenated Cypher structurally impossible at every call site — user
 * input can only ever arrive as a bound parameter.
 */
export interface CypherQuery {
  readonly name: string;
  readonly text: string;
}

export type QueryParams = Record<string, unknown>;

export function defineQuery(name: string, text: string): CypherQuery {
  return Object.freeze({ name, text: text.trim() });
}

/**
 * Identifiers cannot be parameterised in Cypher, so the rare query that needs a
 * dynamic label or relationship type builds it from a fixed allow-list. This
 * helper makes those sites explicit and greppable rather than ad-hoc.
 */
export function defineQueryFromTemplate<T extends string>(
  name: string,
  allowed: readonly T[],
  chosen: T,
  build: (token: T) => string,
): CypherQuery {
  if (!allowed.includes(chosen)) {
    throw new Error(`Refusing to build "${name}": "${chosen}" is not in the allow-list.`);
  }
  return defineQuery(`${name}:${chosen}`, build(chosen));
}

interface RunOptions {
  /** Attempts for transient failures (network blips, leader elections). */
  retries?: number;
}

const SLOW_QUERY_MS = 750;

async function withSession<T>(
  mode: 'READ' | 'WRITE',
  fn: (session: Session) => Promise<T>,
): Promise<T> {
  const session = assertDriver().session({
    database: env.COGNODB_DATABASE,
    defaultAccessMode: mode === 'READ' ? neo4j.session.READ : neo4j.session.WRITE,
  });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

async function execute(
  mode: 'READ' | 'WRITE',
  query: CypherQuery,
  params: QueryParams,
  options: RunOptions,
): Promise<Neo4jRecord[]> {
  const retries = options.retries ?? 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    try {
      const records = await withSession(mode, async (session) => {
        const result =
          mode === 'READ'
            ? await session.executeRead((tx) => tx.run(query.text, params))
            : await session.executeWrite((tx) => tx.run(query.text, params));
        return result.records;
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed > SLOW_QUERY_MS) {
        logger.warn('Slow Cypher query', { query: query.name, ms: elapsed, rows: records.length });
      } else {
        logger.debug('Cypher query', { query: query.name, ms: elapsed, rows: records.length });
      }
      return records;
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryable(error)) {
        const backoff = 150 * 2 ** attempt;
        logger.warn('Retrying Cypher query after transient failure', {
          query: query.name,
          attempt: attempt + 1,
          backoffMs: backoff,
        });
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      break;
    }
  }

  throw toAppError(lastError, query.name);
}

/** Run a read query and map each record. */
export async function read<T>(
  query: CypherQuery,
  params: QueryParams,
  map: (record: Neo4jRecord) => T,
  options: RunOptions = {},
): Promise<T[]> {
  const records = await execute('READ', query, params, options);
  return records.map(map);
}

/** Run a read query expected to return at most one row. */
export async function readOne<T>(
  query: CypherQuery,
  params: QueryParams,
  map: (record: Neo4jRecord) => T,
  options: RunOptions = {},
): Promise<T | null> {
  const rows = await read(query, params, map, options);
  return rows[0] ?? null;
}

/** Run a write query. Seed and maintenance paths only. */
export async function write<T>(
  query: CypherQuery,
  params: QueryParams,
  map: (record: Neo4jRecord) => T,
  options: RunOptions = {},
): Promise<T[]> {
  const records = await execute('WRITE', query, params, options);
  return records.map(map);
}

/** Run a write query, discarding results. */
export async function writeVoid(
  query: CypherQuery,
  params: QueryParams = {},
  options: RunOptions = {},
): Promise<void> {
  await execute('WRITE', query, params, options);
}
