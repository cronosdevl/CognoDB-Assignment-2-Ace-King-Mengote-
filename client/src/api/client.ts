import type { ApiErrorBody, ApiErrorCode } from '@wayfinder/shared';

/**
 * Empty in development so requests go to `/api/...` and through the Vite proxy;
 * set at build time when the API lives on another origin.
 */
const BASE_URL: string = (import.meta.env['VITE_API_BASE_URL'] as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the failure is the database rather than the request. */
  get isDatabaseOutage(): boolean {
    return this.code === 'DATABASE_UNAVAILABLE';
  }

  get isNotFound(): boolean {
    return this.code === 'NOT_FOUND';
  }
}

export type QueryValue = string | number | boolean | null | undefined;

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === null || value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return `${BASE_URL}/api${path}${query ? `?${query}` : ''}`;
}

/**
 * One place where every request is made, so the failure modes are handled once:
 * a JSON error envelope becomes an `ApiError`, and a network failure — the API
 * itself being down — is reported as a database outage, because from the user's
 * point of view the effect and the remedy are the same.
 */
export async function apiGet<T>(
  path: string,
  params?: Record<string, QueryValue>,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      signal: signal ?? null,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'DATABASE_UNAVAILABLE',
      'Could not reach the Wayfinder API. Check that the server is running.',
    );
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    throw new ApiError(
      response.status,
      body?.error.code ?? 'INTERNAL_ERROR',
      body?.error.message ?? `Request failed with status ${response.status}.`,
      body?.error.details,
    );
  }

  return (await response.json()) as T;
}
