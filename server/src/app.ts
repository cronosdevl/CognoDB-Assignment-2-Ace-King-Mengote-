import { existsSync } from 'node:fs';
import path from 'node:path';


import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env, isProduction } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));

  /**
   * Allow same-origin automatically, and anything explicitly listed in
   * CORS_ORIGIN on top of that.
   *
   * Deriving same-origin from the request rather than from configuration
   * matters on Vercel: the API and the SPA share a deployment, but every
   * preview gets its own hostname, so any value pinned in an env var would be
   * stale for all but one of them. CORS_ORIGIN stays meaningful for the split
   * deployment, where the client is hosted apart from the API.
   */
  const isAllowedOrigin = (origin: string | undefined, host: string | undefined): boolean => {
    // Same-origin browser requests omit the header entirely.
    if (!origin) return true;
    if (env.CORS_ORIGIN.includes('*') || env.CORS_ORIGIN.includes(origin)) return true;
    if (!host) return false;
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  };

  app.use(
    cors((request, callback) => {
      const origin = request.headers.origin;
      const allowed = isAllowedOrigin(origin, request.headers.host);
      if (!allowed) {
        logger.warn('Blocked cross-origin request', { origin, host: request.headers.host });
      }
      callback(null, { origin: allowed, credentials: false });
    }),
  );

  app.use((request, response, next) => {
    const startedAt = Date.now();
    response.on('finish', () => {
      const elapsed = Date.now() - startedAt;
      const line = `${request.method} ${request.originalUrl} ${response.statusCode} ${elapsed}ms`;
      if (response.statusCode >= 500) logger.error(line);
      else if (response.statusCode >= 400) logger.warn(line);
      else logger.debug(line);
    });
    next();
  });

  app.use('/api', apiRouter);

  // Single-service mode: one process serves the API and the built SPA, which is
  // how the Render deployment runs. On Vercel the static files are served by the
  // CDN and this function only ever handles /api, so no candidate exists and the
  // block is skipped. Resolved from cwd rather than `import.meta.url` so the
  // module still loads if the serverless build emits CommonJS.
  const clientDist = [
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
  ].find((candidate) => existsSync(path.join(candidate, 'index.html')));

  if (isProduction && clientDist) {
    logger.info('Serving built client', { path: clientDist });
    app.use(express.static(clientDist, { maxAge: '1h', index: false }));
    app.get(/^(?!\/api).*/, (_request, response) => {
      response.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
