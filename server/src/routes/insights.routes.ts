import { Router } from 'express';

import { asyncHandler } from '../middleware/errorHandler.js';
import { getOverview, listSinglePointsOfFailure } from '../services/insights.service.js';

export const insightsRouter: Router = Router();

insightsRouter.get(
  '/overview',
  asyncHandler(async (_request, response) => {
    response.json(await getOverview());
  }),
);

insightsRouter.get(
  '/single-points-of-failure',
  asyncHandler(async (_request, response) => {
    response.json(await listSinglePointsOfFailure(15));
  }),
);
