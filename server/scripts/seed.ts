/**
 * Seed the CognoDB instance with the Meridian Labs dataset.
 *
 *   npm run seed          # idempotent upsert (MERGE everywhere)
 *   npm run seed:reset    # wipe first, then load
 *
 * Everything below goes through the same parameterised `defineQuery` runner the
 * API uses — there is no separate, looser path for writes.
 */
import { redactedConnection } from '../src/config/env.js';
import { checkHealth, closeDriver } from '../src/db/driver.js';
import { type CypherQuery, read, write, writeVoid } from '../src/db/query.js';
import { logger } from '../src/lib/logger.js';
import { buildDataset, summariseDataset, type Dataset } from './lib/dataset.js';
import {
  CONSTRAINTS,
  COUNT_NODES,
  DELETE_BATCH,
  INDEXES,
  UPSERT_CERTIFICATIONS,
  UPSERT_CERTIFIES,
  UPSERT_DEPARTMENTS,
  UPSERT_EARNED,
  UPSERT_HAS_SKILL,
  UPSERT_LOCATIONS,
  UPSERT_MENTORS,
  UPSERT_PEOPLE,
  UPSERT_PROJECTS,
  UPSERT_PROJECT_REQUIRES,
  UPSERT_REPORTS_TO,
  UPSERT_ROLES,
  UPSERT_ROLE_PROGRESSION,
  UPSERT_ROLE_REQUIRES,
  UPSERT_SKILLS,
  UPSERT_SKILL_ADJACENCY,
  UPSERT_TEAMS,
  UPSERT_WORKED_ON,
} from './lib/schema.js';

/** Small enough that a 256 MB instance never has to think about it. */
const BATCH_SIZE = 400;
const DELETE_BATCH_SIZE = 500;

async function writeInBatches<T>(label: string, query: CypherQuery, rows: T[]): Promise<void> {
  if (rows.length === 0) {
    logger.info(`  ${label}: nothing to write`);
    return;
  }
  const startedAt = Date.now();
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    await writeVoid(query, { rows: rows.slice(offset, offset + BATCH_SIZE) });
  }
  logger.info(`  ${label}: ${rows.length} rows in ${Date.now() - startedAt}ms`);
}

async function applySchema(): Promise<void> {
  logger.info('Applying constraints and indexes');
  for (const constraint of [...CONSTRAINTS, ...INDEXES]) {
    try {
      await writeVoid(constraint, {});
    } catch (error) {
      // Index DDL varies across openCypher implementations. A missing index
      // costs performance on a dataset this size, not correctness — so warn
      // and carry on rather than aborting the whole seed.
      logger.warn(`  skipped ${constraint.name}: ${(error as Error).message}`);
    }
  }
}

async function resetDatabase(): Promise<void> {
  logger.warn('--reset supplied: deleting every node in the database');
  let total = 0;
  for (;;) {
    // Must go through `write`: a DETACH DELETE in a read transaction is rejected
    // by the server, not silently ignored.
    const [deleted] = await write(DELETE_BATCH, { batchSize: DELETE_BATCH_SIZE }, (record) =>
      Number(record.get('deleted')),
    );
    if (!deleted) break;
    total += deleted;
    process.stdout.write(`\r  deleted ${total} nodes…`);
  }
  if (total > 0) process.stdout.write('\n');
  logger.info(`Reset complete (${total} nodes removed)`);
}

async function loadDataset(dataset: Dataset): Promise<void> {
  logger.info('Loading reference data');
  await writeInBatches('skills', UPSERT_SKILLS, dataset.skills);
  await writeInBatches('skill adjacency', UPSERT_SKILL_ADJACENCY, dataset.skillAdjacency);
  await writeInBatches('roles', UPSERT_ROLES, dataset.roles);
  await writeInBatches('role requirements', UPSERT_ROLE_REQUIRES, dataset.roleRequires);
  await writeInBatches('role progression', UPSERT_ROLE_PROGRESSION, dataset.roleProgression);
  await writeInBatches('departments', UPSERT_DEPARTMENTS, dataset.departments);
  await writeInBatches('teams', UPSERT_TEAMS, dataset.teams);
  await writeInBatches('locations', UPSERT_LOCATIONS, dataset.locations);
  await writeInBatches('certifications', UPSERT_CERTIFICATIONS, dataset.certifications);
  await writeInBatches('certification -> skill', UPSERT_CERTIFIES, dataset.certifies);
  await writeInBatches('projects', UPSERT_PROJECTS, dataset.projects);
  await writeInBatches('project requirements', UPSERT_PROJECT_REQUIRES, dataset.projectRequires);

  logger.info('Loading people and their edges');
  await writeInBatches('people', UPSERT_PEOPLE, dataset.people);
  await writeInBatches('person -> skill', UPSERT_HAS_SKILL, dataset.hasSkill);
  await writeInBatches('person -> project', UPSERT_WORKED_ON, dataset.workedOn);
  await writeInBatches('reporting lines', UPSERT_REPORTS_TO, dataset.reportsTo);
  await writeInBatches('mentorship', UPSERT_MENTORS, dataset.mentors);
  await writeInBatches('certifications earned', UPSERT_EARNED, dataset.earned);
}

async function main(): Promise<void> {
  const shouldReset = process.argv.includes('--reset');

  logger.info('Wayfinder seed starting', redactedConnection());

  const health = await checkHealth();
  if (!health.ok) {
    logger.error('Cannot reach CognoDB — aborting before any writes', { error: health.error });
    logger.error('Check COGNODB_URI / COGNODB_USER / COGNODB_PASSWORD in your .env file.');
    process.exitCode = 1;
    return;
  }
  logger.info('Connected', { address: health.address, latencyMs: health.latencyMs });

  const dataset = buildDataset();
  const summary = summariseDataset(dataset);
  logger.info('Generated dataset', summary);

  await applySchema();
  if (shouldReset) await resetDatabase();

  const startedAt = Date.now();
  await loadDataset(dataset);

  const [total] = await read(COUNT_NODES, {}, (record) => Number(record.get('total')));
  logger.info(`Seed complete in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`, {
    nodesInDatabase: total ?? 0,
  });
  logger.info('Next: `npm run verify` to sanity-check the graph, then `npm run dev`.');
}

main()
  .catch((error) => {
    logger.error('Seed failed', { message: (error as Error).message });
    if ((error as Error).stack) console.error((error as Error).stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDriver();
  });
