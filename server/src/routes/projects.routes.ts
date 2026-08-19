import { Router } from 'express';

import { asyncHandler } from '../middleware/errorHandler.js';
import { idParam, parseParams, parseQuery, projectsQuerySchema } from '../middleware/validate.js';
import { getProject, listHiddenExperts, listProjects } from '../services/projects.service.js';

export const projectsRouter: Router = Router();

projectsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = parseQuery(request, projectsQuerySchema);
    response.json(await listProjects(query));
  }),
);

projectsRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const { id } = parseParams(request, idParam);
    response.json(await getProject(id));
  }),
);

projectsRouter.get(
  '/:id/hidden-experts',
  asyncHandler(async (request, response) => {
    const { id } = parseParams(request, idParam);
    response.json(await listHiddenExperts(id));
  }),
);
