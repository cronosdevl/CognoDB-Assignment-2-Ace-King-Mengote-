import type { Request } from 'express';
import { z, type ZodTypeAny } from 'zod';

import { env } from '../config/env.js';
import { AppError } from '../db/errors.js';

export function parseQuery<T extends ZodTypeAny>(request: Request, schema: T): z.infer<T> {
  const result = schema.safeParse(request.query);
  if (!result.success) {
    throw AppError.badRequest('Invalid query parameters.', {
      issues: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}

export function parseParams<T extends ZodTypeAny>(request: Request, schema: T): z.infer<T> {
  const result = schema.safeParse(request.params);
  if (!result.success) {
    throw AppError.badRequest('Invalid path parameters.', {
      issues: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}

export const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:-]+$/, 'must be a slug identifier');

export const idParam = z.object({ id: idSchema });

const optionalTrimmed = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(env.MAX_PAGE_SIZE).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

export const peopleQuerySchema = paginationSchema.extend({
  q: optionalTrimmed,
  skillId: idSchema.optional().transform((value) => value ?? null),
  teamId: idSchema.optional().transform((value) => value ?? null),
  roleId: idSchema.optional().transform((value) => value ?? null),
  openToMove: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? null : value === 'true')),
});

export const projectsQuerySchema = paginationSchema.extend({
  q: optionalTrimmed,
  status: z
    .enum(['active', 'planned', 'completed', 'paused'])
    .optional()
    .transform((value) => value ?? null),
  skillId: idSchema.optional().transform((value) => value ?? null),
});

export const skillsQuerySchema = paginationSchema.extend({
  q: optionalTrimmed,
  category: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export const pathfinderQuerySchema = z.object({
  personId: idSchema,
  targetRoleId: idSchema,
});

export const connectionQuerySchema = z.object({
  fromPersonId: idSchema,
  toPersonId: idSchema,
});
