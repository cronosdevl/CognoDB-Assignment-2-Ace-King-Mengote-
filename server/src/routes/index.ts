import type { HealthResponse } from '@wayfinder/shared';
import { Router } from 'express';

import { checkHealth } from '../db/driver.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { insightsRouter } from './insights.routes.js';
import { pathfinderRouter, rolesRouter } from './pathfinder.routes.js';
import { peopleRouter } from './people.routes.js';
import { projectsRouter } from './projects.routes.js';
import { skillsRouter } from './skills.routes.js';

export const apiRouter: Router = Router();

/**
 * Always 200, even when the database is down — the body carries the verdict.
 * The client polls this to decide whether to show the "cannot reach CognoDB"
 * banner, and a non-200 would make that check indistinguishable from the API
 * itself being unreachable.
 */
apiRouter.get(
  '/health',
  asyncHandler(async (_request, response) => {
    const database = await checkHealth();
    const body: HealthResponse = {
      api: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database,
    };
    response.json(body);
  }),
);

apiRouter.use('/people', peopleRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/skills', skillsRouter);
apiRouter.use('/roles', rolesRouter);
apiRouter.use('/pathfinder', pathfinderRouter);
apiRouter.use('/insights', insightsRouter);
