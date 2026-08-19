import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDriver, verifyConnectivityAtBoot } from './db/driver.js';
import { logger } from './lib/logger.js';

async function main(): Promise<void> {
  const app = createApp();

  // Probe CognoDB but do not block startup on it: if the instance is asleep or
  // still provisioning, the API should come up and say so rather than
  // crash-loop behind a health check.
  void verifyConnectivityAtBoot();

  const server = app.listen(env.PORT, () => {
    logger.info(`Wayfinder API listening on http://localhost:${env.PORT}`, {
      env: env.NODE_ENV,
      cors: env.CORS_ORIGIN.join(', '),
    });
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await closeDriver();
      process.exit(0);
    });
    // Do not let a hung connection hold the process open forever.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error('Failed to start server', { message: (error as Error).message });
  console.error(error);
  process.exit(1);
});
