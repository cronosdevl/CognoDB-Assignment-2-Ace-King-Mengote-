/**
 * Application-level error with an HTTP status and a stable machine-readable
 * code. Everything the API returns to the client funnels through this type so
 * the frontend can branch on `code` rather than parsing prose.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options as ErrorOptions);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static notFound(what: string, id?: string): AppError {
    return new AppError(404, 'NOT_FOUND', id ? `${what} "${id}" was not found.` : `${what} was not found.`);
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static database(message: string, details?: Record<string, unknown>, cause?: unknown): AppError {
    return new AppError(503, 'DATABASE_UNAVAILABLE', message, details, { cause });
  }
}

/** Shape of a `neo4j-driver` error once it has crossed the module boundary. */
interface DriverError {
  code?: string;
  message?: string;
  name?: string;
  constructor?: { name?: string };
}

function driverErrorOf(error: unknown): DriverError {
  return (typeof error === 'object' && error !== null ? error : {}) as DriverError;
}

/**
 * Map a driver failure onto something the UI can act on.
 *
 * The distinction that matters to a user is "the database is unreachable /
 * misconfigured" (show a full-page connection banner, offer retry) versus "this
 * particular query was wrong" (a bug — surface it loudly in development).
 */
export function toAppError(error: unknown, context: string): AppError {
  if (error instanceof AppError) return error;

  const err = driverErrorOf(error);
  const code = err.code ?? '';
  const message = err.message ?? String(error);
  const kind = err.constructor?.name ?? err.name ?? 'Error';

  // Wrong credentials — the single most common first-run mistake.
  if (code === 'Neo.ClientError.Security.Unauthorized') {
    return AppError.database(
      'CognoDB rejected the credentials. Check COGNODB_USER and COGNODB_PASSWORD in your .env.',
      { context, driverCode: code },
      error,
    );
  }

  if (code === 'Neo.ClientError.Security.AuthenticationRateLimit') {
    return AppError.database(
      'Too many failed authentication attempts against CognoDB. Wait a moment and retry.',
      { context, driverCode: code },
      error,
    );
  }

  if (code === 'Neo.ClientError.Database.DatabaseNotFound') {
    return AppError.database(
      `The database named in COGNODB_DATABASE does not exist on this instance.`,
      { context, driverCode: code },
      error,
    );
  }

  // Connectivity: DNS failure, TLS problem, instance asleep or still provisioning.
  if (
    kind === 'ServiceUnavailableError' ||
    kind === 'SessionExpiredError' ||
    code === 'ServiceUnavailable' ||
    code === 'SessionExpired' ||
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up|WebSocket connection failure/i.test(message)
  ) {
    return AppError.database(
      'Could not reach CognoDB. The instance may be paused, still provisioning, or COGNODB_URI may be wrong.',
      { context, driverCode: code || kind },
      error,
    );
  }

  // A malformed query is our bug, not the user's.
  if (code.startsWith('Neo.ClientError.Statement')) {
    return new AppError(
      500,
      'QUERY_ERROR',
      'A database query was rejected. This is a bug in the application.',
      { context, driverCode: code, detail: message },
      { cause: error },
    );
  }

  if (code.startsWith('Neo.TransientError')) {
    return AppError.database(
      'CognoDB reported a transient error. Please retry.',
      { context, driverCode: code },
      error,
    );
  }

  return new AppError(
    500,
    'INTERNAL_ERROR',
    'Something went wrong while talking to the database.',
    { context, driverCode: code || kind },
    { cause: error },
  );
}

/** True when retrying the same query has a reasonable chance of succeeding. */
export function isRetryable(error: unknown): boolean {
  const err = driverErrorOf(error);
  const code = err.code ?? '';
  const kind = err.constructor?.name ?? err.name ?? '';
  return (
    code.startsWith('Neo.TransientError') ||
    kind === 'ServiceUnavailableError' ||
    kind === 'SessionExpiredError' ||
    code === 'ServiceUnavailable' ||
    code === 'SessionExpired'
  );
}
