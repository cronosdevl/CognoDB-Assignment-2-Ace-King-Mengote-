import type {
  CandidateSuggestion,
  HiddenExpert,
  Paginated,
  PersonSummary,
  ProjectDetail,
  ProjectSkillRequirement,
  ProjectSummary,
} from '@wayfinder/shared';

import { AppError } from '../db/errors.js';
import { read, readOne } from '../db/query.js';
import {
  COUNT_PROJECTS,
  GET_PROJECT,
  HIDDEN_EXPERTS,
  LIST_PROJECTS,
  PROJECT_CANDIDATES,
} from '../graph/cypher/projects.js';
import { field, listField, optionalField, round, toNumber } from '../graph/mappers.js';

export interface ListProjectsOptions {
  q: string | null;
  status: string | null;
  skillId: string | null;
  limit: number;
  offset: number;
}

export async function listProjects(options: ListProjectsOptions): Promise<Paginated<ProjectSummary>> {
  const params = {
    q: options.q ? options.q.toLowerCase() : null,
    status: options.status,
    skillId: options.skillId,
    limit: options.limit,
    offset: options.offset,
  };

  const [items, totals] = await Promise.all([
    read(LIST_PROJECTS, params, (record) => {
      const project = field<ProjectSummary>(record, 'project');
      return { ...project, coverage: round(project.coverage, 3) };
    }),
    read(COUNT_PROJECTS, params, (record) => toNumber(record.get('total'))),
  ]);

  return { items, total: totals[0] ?? 0, limit: options.limit, offset: options.offset };
}

interface RawRequirement {
  skillId: string;
  name: string;
  category: ProjectSkillRequirement['category'];
  importance: number;
  minLevel: ProjectSkillRequirement['minLevel'];
  coveredBy: PersonSummary[];
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const [core, candidates] = await Promise.all([
    readOne(GET_PROJECT, { id }, (record) => ({
      id: field<string>(record, 'id'),
      name: field<string>(record, 'name'),
      code: field<string>(record, 'code'),
      status: field<ProjectSummary['status']>(record, 'status'),
      summary: field<string>(record, 'summary'),
      businessUnit: field<string>(record, 'businessUnit'),
      startedAt: field<string>(record, 'startedAt'),
      endedAt: optionalField<string>(record, 'endedAt'),
      team: listField<{ person: PersonSummary; contribution: string; allocationPct: number }>(record, 'team'),
      requirements: listField<RawRequirement>(record, 'requirements'),
    })),
    listCandidates(id, 8),
  ]);

  if (!core) throw AppError.notFound('Project', id);

  const requirements: ProjectSkillRequirement[] = core.requirements
    .map((requirement) => ({
      ...requirement,
      // Deduplicate: a person on the project twice over would otherwise appear
      // twice in the coverage list.
      coveredBy: requirement.coveredBy,
      covered: requirement.coveredBy.length > 0,
    }))
    .sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name));

  const gaps = requirements.filter((requirement) => !requirement.covered);
  const coverage = requirements.length === 0 ? 1 : (requirements.length - gaps.length) / requirements.length;

  return {
    id: core.id,
    name: core.name,
    code: core.code,
    status: core.status,
    summary: core.summary,
    businessUnit: core.businessUnit,
    startedAt: core.startedAt,
    endedAt: core.endedAt,
    headcount: core.team.length,
    requiredSkillCount: requirements.length,
    coverage: round(coverage, 3),
    team: core.team
      .map((entry) => ({ ...entry.person, contribution: entry.contribution, allocationPct: entry.allocationPct }))
      .sort((a, b) => b.allocationPct - a.allocationPct || a.name.localeCompare(b.name)),
    requirements,
    gaps,
    candidates,
  };
}

export async function listCandidates(projectId: string, limit: number): Promise<CandidateSuggestion[]> {
  return read(PROJECT_CANDIDATES, { id: projectId, limit }, (record) => {
    const matchedDirect = listField<CandidateSuggestion['matchedSkills'][number]>(record, 'matchedDirect');
    const matchedAdjacent = listField<CandidateSuggestion['matchedSkills'][number]>(record, 'matchedAdjacent');
    return {
      ...field<PersonSummary>(record, 'person'),
      score: toNumber(record.get('score')),
      collaborationDistance: optionalField<number>(record, 'collaborationDistance'),
      matchedSkills: [...matchedDirect, ...matchedAdjacent],
      missingSkills: listField<CandidateSuggestion['missingSkills'][number]>(record, 'missingSkills'),
    };
  });
}

export async function listHiddenExperts(projectId: string, limit = 10): Promise<HiddenExpert[]> {
  return read(
    HIDDEN_EXPERTS,
    { id: projectId, limit, minMatches: 1 },
    (record) => ({
      ...field<PersonSummary>(record, 'person'),
      distance: toNumber(record.get('distance')),
      matchedSkills: listField<HiddenExpert['matchedSkills'][number]>(record, 'matchedSkills'),
      connectedVia: listField<PersonSummary>(record, 'connectedVia'),
      score: round(toNumber(record.get('score')), 2),
    }),
  );
}
