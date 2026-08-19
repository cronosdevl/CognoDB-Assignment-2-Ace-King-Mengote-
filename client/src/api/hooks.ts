import type {
  CareerPath,
  ConnectionPath,
  DepartureImpact,
  GraphPayload,
  HealthResponse,
  HiddenExpert,
  OverviewStats,
  Paginated,
  PersonDetail,
  PersonSummary,
  ProjectDetail,
  ProjectSummary,
  RoleDetail,
  RoleSummary,
  SinglePointOfFailure,
  SkillDetail,
  SkillSummary,
} from '@wayfinder/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiGet, type QueryValue } from './client';

/**
 * Query keys in one place so a cache entry can never be invalidated by a key
 * that drifted out of sync with the one that wrote it.
 */
export const queryKeys = {
  health: ['health'] as const,
  overview: ['insights', 'overview'] as const,
  risk: ['insights', 'risk'] as const,
  people: (params: Record<string, QueryValue>) => ['people', 'list', params] as const,
  person: (id: string) => ['people', 'detail', id] as const,
  personGraph: (id: string) => ['people', 'graph', id] as const,
  departureImpact: (id: string) => ['people', 'departure-impact', id] as const,
  connection: (from: string, to: string) => ['people', 'connection', from, to] as const,
  projects: (params: Record<string, QueryValue>) => ['projects', 'list', params] as const,
  project: (id: string) => ['projects', 'detail', id] as const,
  hiddenExperts: (id: string) => ['projects', 'hidden-experts', id] as const,
  skills: (params: Record<string, QueryValue>) => ['skills', 'list', params] as const,
  skill: (id: string) => ['skills', 'detail', id] as const,
  skillCategories: ['skills', 'categories'] as const,
  roles: ['roles', 'list'] as const,
  role: (id: string) => ['roles', 'detail', id] as const,
  pathfinder: (personId: string, roleId: string) => ['pathfinder', personId, roleId] as const,
  suggestions: (personId: string) => ['pathfinder', 'suggestions', personId] as const,
};

// --- health ----------------------------------------------------------------

export function useHealth(): UseQueryResult<HealthResponse> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => apiGet<HealthResponse>('/health', undefined, signal),
    // Keeps the connection banner honest without hammering a free-tier instance.
    refetchInterval: 45_000,
    retry: 1,
  });
}

// --- dashboard -------------------------------------------------------------

export function useOverview(): UseQueryResult<OverviewStats> {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: ({ signal }) => apiGet<OverviewStats>('/insights/overview', undefined, signal),
  });
}

export function useSinglePointsOfFailure(): UseQueryResult<SinglePointOfFailure[]> {
  return useQuery({
    queryKey: queryKeys.risk,
    queryFn: ({ signal }) =>
      apiGet<SinglePointOfFailure[]>('/insights/single-points-of-failure', undefined, signal),
  });
}

// --- people ----------------------------------------------------------------

export interface PeopleFilters extends Record<string, QueryValue> {
  q?: string;
  skillId?: string;
  teamId?: string;
  roleId?: string;
  openToMove?: boolean;
  limit?: number;
  offset?: number;
}

export function usePeople(filters: PeopleFilters): UseQueryResult<Paginated<PersonSummary>> {
  return useQuery({
    queryKey: queryKeys.people(filters),
    queryFn: ({ signal }) => apiGet<Paginated<PersonSummary>>('/people', filters, signal),
    placeholderData: (previous) => previous,
  });
}

export function usePerson(id: string | undefined): UseQueryResult<PersonDetail> {
  return useQuery({
    queryKey: queryKeys.person(id ?? ''),
    queryFn: ({ signal }) => apiGet<PersonDetail>(`/people/${id}`, undefined, signal),
    enabled: Boolean(id),
  });
}

export function usePersonGraph(id: string | undefined): UseQueryResult<GraphPayload> {
  return useQuery({
    queryKey: queryKeys.personGraph(id ?? ''),
    queryFn: ({ signal }) => apiGet<GraphPayload>(`/people/${id}/graph`, undefined, signal),
    enabled: Boolean(id),
  });
}

export function useDepartureImpact(id: string | undefined): UseQueryResult<DepartureImpact> {
  return useQuery({
    queryKey: queryKeys.departureImpact(id ?? ''),
    queryFn: ({ signal }) => apiGet<DepartureImpact>(`/people/${id}/departure-impact`, undefined, signal),
    enabled: Boolean(id),
  });
}

export function useConnection(
  fromPersonId: string | undefined,
  toPersonId: string | undefined,
): UseQueryResult<ConnectionPath> {
  return useQuery({
    queryKey: queryKeys.connection(fromPersonId ?? '', toPersonId ?? ''),
    queryFn: ({ signal }) =>
      apiGet<ConnectionPath>('/people/connection', { fromPersonId, toPersonId }, signal),
    enabled: Boolean(fromPersonId && toPersonId && fromPersonId !== toPersonId),
  });
}

// --- projects --------------------------------------------------------------

export interface ProjectFilters extends Record<string, QueryValue> {
  q?: string;
  status?: string;
  skillId?: string;
  limit?: number;
  offset?: number;
}

export function useProjects(filters: ProjectFilters): UseQueryResult<Paginated<ProjectSummary>> {
  return useQuery({
    queryKey: queryKeys.projects(filters),
    queryFn: ({ signal }) => apiGet<Paginated<ProjectSummary>>('/projects', filters, signal),
    placeholderData: (previous) => previous,
  });
}

export function useProject(id: string | undefined): UseQueryResult<ProjectDetail> {
  return useQuery({
    queryKey: queryKeys.project(id ?? ''),
    queryFn: ({ signal }) => apiGet<ProjectDetail>(`/projects/${id}`, undefined, signal),
    enabled: Boolean(id),
  });
}

export function useHiddenExperts(id: string | undefined): UseQueryResult<HiddenExpert[]> {
  return useQuery({
    queryKey: queryKeys.hiddenExperts(id ?? ''),
    queryFn: ({ signal }) => apiGet<HiddenExpert[]>(`/projects/${id}/hidden-experts`, undefined, signal),
    enabled: Boolean(id),
  });
}

// --- skills ----------------------------------------------------------------

export interface SkillFilters extends Record<string, QueryValue> {
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export function useSkills(filters: SkillFilters): UseQueryResult<Paginated<SkillSummary>> {
  return useQuery({
    queryKey: queryKeys.skills(filters),
    queryFn: ({ signal }) => apiGet<Paginated<SkillSummary>>('/skills', filters, signal),
    placeholderData: (previous) => previous,
  });
}

export function useSkill(id: string | undefined): UseQueryResult<SkillDetail> {
  return useQuery({
    queryKey: queryKeys.skill(id ?? ''),
    queryFn: ({ signal }) => apiGet<SkillDetail>(`/skills/${id}`, undefined, signal),
    enabled: Boolean(id),
  });
}

export function useSkillCategories(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: queryKeys.skillCategories,
    queryFn: ({ signal }) => apiGet<string[]>('/skills/categories', undefined, signal),
    staleTime: 10 * 60 * 1000,
  });
}

// --- roles & pathfinder ----------------------------------------------------

export function useRoles(): UseQueryResult<RoleSummary[]> {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: ({ signal }) => apiGet<RoleSummary[]>('/roles', undefined, signal),
    staleTime: 10 * 60 * 1000,
  });
}

export function useRole(id: string | undefined): UseQueryResult<RoleDetail> {
  return useQuery({
    queryKey: queryKeys.role(id ?? ''),
    queryFn: ({ signal }) => apiGet<RoleDetail>(`/roles/${id}`, undefined, signal),
    enabled: Boolean(id),
  });
}

export function useCareerPath(
  personId: string | undefined,
  targetRoleId: string | undefined,
): UseQueryResult<CareerPath> {
  return useQuery({
    queryKey: queryKeys.pathfinder(personId ?? '', targetRoleId ?? ''),
    queryFn: ({ signal }) => apiGet<CareerPath>('/pathfinder', { personId, targetRoleId }, signal),
    enabled: Boolean(personId && targetRoleId),
  });
}

export function useRoleSuggestions(
  personId: string | undefined,
): UseQueryResult<Array<{ role: RoleSummary; readiness: number }>> {
  return useQuery({
    queryKey: queryKeys.suggestions(personId ?? ''),
    queryFn: ({ signal }) =>
      apiGet<Array<{ role: RoleSummary; readiness: number }>>(
        `/pathfinder/suggestions/${personId}`,
        undefined,
        signal,
      ),
    enabled: Boolean(personId),
  });
}
