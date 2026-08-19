import neo4j, { type Driver, type ServerInfo } from 'neo4j-driver';

import { env, isProduction, redactedConnection } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { AppError, toAppError } from './errors.js';

/**
 * One driver per process.
 *
 * The Neo4j driver is a long-lived object that owns its own connection pool —
 * creating one per request is the classic way to exhaust a small instance. The
 * CognoDB free (c0) tier allows 200 connections, so the pool is deliberately
 * modest and shared.
 */
let driver: Driver | null = null;

/** Cached result of the last successful/failed connectivity probe. */
export interface DbHealth {
  ok: boolean;
  checkedAt: string;
  address?: string;
  version?: string;
  latencyMs?: number;
  error?: string;
}

let lastHealth: DbHealth | null = null;

export function getDriver(): Driver {
  if (driver) return driver;

  const { COGNODB_URI, COGNODB_USER, COGNODB_PASSWORD } = env;

  driver = neo4j.driver(COGNODB_URI, neo4j.auth.basic(COGNODB_USER, COGNODB_PASSWORD), {
    // Keep well under the free tier's 200-connection ceiling.
    maxConnectionPoolSize: 20,
    // Fail fast so an unreachable instance surfaces as a banner, not a hang.
    connectionAcquisitionTimeout: 15_000,
    connectionTimeout: 15_000,
    maxTransactionRetryTime: 12_000,
    // Recycle connections before any idle proxy in front of CognoDB drops them.
    maxConnectionLifetime: 30 * 60 * 1000,
    disableLosslessIntegers: true,
    logging: {
      level: isProduction ? 'warn' : 'info',
      logger: (level, message) => {
        if (level === 'error') logger.error(`[neo4j] ${message}`);
        else if (level === 'warn') logger.warn(`[neo4j] ${message}`);
        else logger.debug(`[neo4j] ${message}`);
      },
    },
  });

  logger.info('CognoDB driver created', redactedConnection());
  return driver;
}

/**
 * Probe the connection. Called once at boot (non-fatal) and by `/api/health`.
 *
 * Never throws: the whole point is that the app should start and render a
 * useful "database unreachable" state rather than crash-loop.
 */
export async function checkHealth(): Promise<DbHealth> {
  const startedAt = Date.now();
  try {
    const info: ServerInfo = await getDriver().getServerInfo({ database: env.COGNODB_DATABASE });
    lastHealth = {
      ok: true,
      checkedAt: new Date().toISOString(),
      address: info.address ?? undefined,
      version: info.protocolVersion ? `Bolt ${info.protocolVersion}` : undefined,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    const appError = toAppError(error, 'health-check');
    lastHealth = {
      ok: false,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      error: appError.message,
    };
  }
  return lastHealth;
}

export function getLastHealth(): DbHealth | null {
  return lastHealth;
}

/**
 * Verify connectivity at boot. Logs loudly on failure but lets the process
 * continue so the API can still serve `/api/health` and the UI can explain
 * what is wrong.
 */
export async function verifyConnectivityAtBoot(): Promise<void> {
  const health = await checkHealth();
  if (health.ok) {
    logger.info('Connected to CognoDB', {
      address: health.address,
      version: health.version,
      latencyMs: health.latencyMs,
    });
    return;
  }

  logger.error('Could not reach CognoDB at startup — the API will serve 503s until it recovers', {
    ...redactedConnection(),
    error: health.error,
  });
}

export async function closeDriver(): Promise<void> {
  if (!driver) return;
  await driver.close();
  driver = null;
  logger.info('CognoDB driver closed');
}

/** Guard used by routes that cannot do anything useful without the database. */
export function assertDriver(): Driver {
  try {
    return getDriver();
  } catch (error) {
    throw error instanceof AppError ? error : toAppError(error, 'driver-init');
  }
}
