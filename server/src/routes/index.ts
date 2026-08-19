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
