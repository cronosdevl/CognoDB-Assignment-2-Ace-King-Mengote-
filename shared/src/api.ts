// API 

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'NOT_FOUND',
  'DATABASE_UNAVAILABLE',
  'QUERY_ERROR',
  'INTERNAL_ERROR',
  'RATE_LIMITED',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthResponse {
  api: 'ok';
  uptimeSeconds: number;
  database: {
    ok: boolean;
    checkedAt: string;
    address?: string;
    version?: string;
    latencyMs?: number;
    error?: string;
  };
}

// request query shapes 

export interface PeopleQuery {
  q?: string;
  skillId?: string;
  teamId?: string;
  roleId?: string;
  openToMove?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProjectsQuery {
  q?: string;
  status?: string;
  skillId?: string;
  limit?: number;
  offset?: number;
}

export interface SkillsQuery {
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface PathfinderQuery {
  personId: string;
  targetRoleId: string;
}

export interface ConnectionQuery {
  fromPersonId: string;
  toPersonId: string;
  maxDegrees?: number;
}
