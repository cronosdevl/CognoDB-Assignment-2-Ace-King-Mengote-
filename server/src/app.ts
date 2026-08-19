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

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGIN.includes(origin) || env.CORS_ORIGIN.includes('*')) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: false,
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
