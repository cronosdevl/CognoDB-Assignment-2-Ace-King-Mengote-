import { Router } from 'express';

import { asyncHandler } from '../middleware/errorHandler.js';
import { idParam, parseParams, parseQuery, pathfinderQuerySchema } from '../middleware/validate.js';
import { getRole, listRoles, planCareerPath, suggestTargets } from '../services/pathfinder.service.js';

export const rolesRouter: Router = Router();

rolesRouter.get(
  '/',
  asyncHandler(async (_request, response) => {
    response.json(await listRoles());
  }),
);

rolesRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const { id } = parseParams(request, idParam);
    response.json(await getRole(id));
  }),
);

export const pathfinderRouter: Router = Router();

/** GET /api/pathfinder?personId=…&targetRoleId=… */
pathfinderRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const { personId, targetRoleId } = parseQuery(request, pathfinderQuerySchema);
    response.json(await planCareerPath(personId, targetRoleId));
  }),
);

/** Roles this person is closest to being ready for. */
pathfinderRouter.get(
  '/suggestions/:id',
  asyncHandler(async (request, response) => {
    const { id } = parseParams(request, idParam);
    response.json(await suggestTargets(id));
  }),
);
