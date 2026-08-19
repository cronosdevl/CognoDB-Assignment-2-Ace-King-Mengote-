import type { ApiErrorBody } from '@wayfinder/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isProduction } from '../config/env.js';
import { AppError, toAppError } from '../db/errors.js';
import { logger } from '../lib/logger.js';

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (request, response, next) => {
    handler(request, response, next).catch(next);
  };
}

export function notFoundHandler(request: Request, response: Response): void {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: `No route matches ${request.method} ${request.path}.` },
  };
  response.status(404).json(body);
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const appError = error instanceof AppError ? error : toAppError(error, `${request.method} ${request.path}`);

  const logContext = {
    method: request.method,
    path: request.path,
    status: appError.status,
    code: appError.code,
    ...(appError.details ?? {}),
  };

  if (appError.status >= 500) {
    logger.error(appError.message, logContext);
    const cause = (appError as { cause?: unknown }).cause;
    if (!isProduction && cause instanceof Error && cause.stack) console.error(cause.stack);
  } else {
    logger.warn(appError.message, logContext);
  }

  const body: ApiErrorBody = {
    error: {
      code: appError.code as ApiErrorBody['error']['code'],
      message: appError.message,
      // Detail is useful while developing and noise (or a leak) in production.
      ...(appError.details && !isProduction ? { details: appError.details } : {}),
    },
  };

  if (response.headersSent) return;
  response.status(appError.status).json(body);
}
