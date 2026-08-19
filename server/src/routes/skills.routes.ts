import { Router } from 'express';

import { asyncHandler } from '../middleware/errorHandler.js';
import { idParam, parseParams, parseQuery, skillsQuerySchema } from '../middleware/validate.js';
import { getSkill, listCategories, listSkills } from '../services/skills.service.js';

export const skillsRouter: Router = Router();

skillsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = parseQuery(request, skillsQuerySchema);
    response.json(await listSkills(query));
  }),
);

skillsRouter.get(
  '/categories',
  asyncHandler(async (_request, response) => {
    response.json(await listCategories());
  }),
);

skillsRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const { id } = parseParams(request, idParam);
    response.json(await getSkill(id));
  }),
);
