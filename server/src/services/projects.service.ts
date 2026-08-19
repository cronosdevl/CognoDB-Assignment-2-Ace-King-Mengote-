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
  PROJECT_COVERAGE,
  PROJECT_REQUIREMENTS,
} from '../graph/cypher/projects.js';
import { field, listField, optionalField, round, toNumber, uniqueBy } from '../graph/mappers.js';

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

  const [rows, totals] = await Promise.all([
    read(LIST_PROJECTS, params, (record) => field<ProjectSummary>(record, 'project')),
    read(COUNT_PROJECTS, params, (record) => toNumber(record.get('total'))),
  ]);

  const coverage = await read(
    PROJECT_COVERAGE,
    { projectIds: rows.map((project) => project.id) },
    (record) => ({
      projectId: field<string>(record, 'projectId'),
      requiredSkillCount: toNumber(record.get('requiredSkillCount')),
      coveredCount: toNumber(record.get('coveredCount')),
    }),
  );
  const byProject = new Map(coverage.map((entry) => [entry.projectId, entry]));

  const items = rows.map((project) => {
    const entry = byProject.get(project.id);
    const ratio = !entry || entry.requiredSkillCount === 0 ? 1 : entry.coveredCount / entry.requiredSkillCount;
    return { ...project, coverage: round(ratio, 3) };
  });

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
  const [core, rawRequirements, candidates] = await Promise.all([
    readOne(GET_PROJECT, { id }, (record) => ({
      id: field<string>(record, 'id'),
      name: field<string>(record, 'name'),
      code: field<string>(record, 'code'),
      status: field<ProjectSummary['status']>(record, 'status'),
      summary: field<string>(record, 'summary'),
      businessUnit: field<string>(record, 'businessUnit'),
      startedAt: field<string>(record, 'startedAt'),
      endedAt: optionalField<string>(record, 'endedAt'),
      team: listField<{ person: PersonSummary; contribution: string; allocationPct: number } | null>(
        record,
        'team',
      ).filter((entry): entry is { person: PersonSummary; contribution: string; allocationPct: number } =>
        Boolean(entry?.person),
      ),
    })),
    read(PROJECT_REQUIREMENTS, { id }, (record) => ({
      skillId: field<string>(record, 'skillId'),
      name: field<string>(record, 'name'),
      category: field<RawRequirement['category']>(record, 'category'),
      importance: toNumber(record.get('importance')),
      minLevel: toNumber(record.get('minLevel')) as RawRequirement['minLevel'],
      coveredBy: listField<PersonSummary | null>(record, 'coveredBy').filter(
        (person): person is PersonSummary => person !== null,
      ),
    })),
    listCandidates(id, 8),
  ]);

  if (!core) throw AppError.notFound('Project', id);

  const requirements: ProjectSkillRequirement[] = rawRequirements
    .map((requirement) => ({
      ...requirement,
      coveredBy: uniqueBy(requirement.coveredBy, (person) => person.id),
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
