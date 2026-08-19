import { Router } from 'express';

import { asyncHandler } from '../middleware/errorHandler.js';
import {
  connectionQuerySchema,
  idParam,
  parseParams,
  parseQuery,
  peopleQuerySchema,
} from '../middleware/validate.js';
import { getPersonGraph } from '../services/graph.service.js';
import { getDepartureImpact } from '../services/insights.service.js';
import { findConnection, getPerson, listPeople } from '../services/people.service.js';

export const peopleRouter: Router = Router();

peopleRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = parseQuery(request, peopleQuerySchema);
    response.json(await listPeople(query));
  }),
);

peopleRouter.get(
  '/connection',
  asyncHandler(async (request, response) => {
    const { fromPersonId, toPersonId } = parseQuery(request, connectionQuerySchema);
    response.json(await findConnection(fromPersonId, toPersonId));
  }),
);

peopleRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const { id } = parseParams(request, idParam);
    response.json(await getPerson(id));
  }),
);

peopleRouter.get(
  '/:id/graph',
  asyncHandler(async (request, response) => {
    const { id } = parseParams(request, idParam);
    response.json(await getPersonGraph(id));
  }),
);

peopleRouter.get(
  '/:id/departure-impact',
  asyncHandler(async (request, response) => {
    const { id } = parseParams(request, idParam);
    response.json(await getDepartureImpact(id));
  }),
);
