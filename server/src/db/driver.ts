import neo4j, { type Driver, type ServerInfo } from 'neo4j-driver';

import { env, isProduction, redactedConnection } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { AppError, toAppError } from './errors.js';

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

  // On a long-lived server there is one process and one pool, so 20 is
  // comfortable against the free tier's 200-connection ceiling. On Vercel each
  // warm lambda holds its own pool and the platform scales instances out
  // independently, so the same number would exhaust the ceiling under load —
  // a handful of concurrent instances is plenty at 3 apiece.
  const isServerless = Boolean(process.env['VERCEL'] || process.env['AWS_LAMBDA_FUNCTION_NAME']);

  driver = neo4j.driver(COGNODB_URI, neo4j.auth.basic(COGNODB_USER, COGNODB_PASSWORD), {
    maxConnectionPoolSize: isServerless ? 3 : 20,
    connectionAcquisitionTimeout: 15_000,
    connectionTimeout: 15_000,
    maxTransactionRetryTime: 12_000,
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
