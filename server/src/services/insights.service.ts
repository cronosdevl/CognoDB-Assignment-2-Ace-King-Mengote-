import type {
  CandidateSuggestion,
  DatasetCounts,
  DepartureImpact,
  OverviewStats,
  PersonSummary,
  SinglePointOfFailure,
  SkillLevel,
} from '@wayfinder/shared';

import { read } from '../db/query.js';
import {
  ACTIVE_PROJECT_COVERAGE,
  CRITICAL_SKILLS_FOR_PERSON,
  DATASET_COUNTS,
  DEPARTMENT_BREAKDOWN,
  DEPARTURE_IMPACT,
  MOST_CONNECTED,
  OPEN_TO_MOVE_COUNT,
  REPLACEMENT_CANDIDATES,
  SINGLE_POINTS_OF_FAILURE,
  SKILL_SUPPLY_DEMAND,
} from '../graph/cypher/insights.js';
import { field, listField, optionalField, round, toNumber } from '../graph/mappers.js';
import { getPersonSummary } from './people.service.js';

export async function getCounts(): Promise<DatasetCounts> {
  const rows = await read(DATASET_COUNTS, {}, (record) => ({
    people: toNumber(record.get('people')),
    skills: toNumber(record.get('skills')),
    projects: toNumber(record.get('projects')),
    roles: toNumber(record.get('roles')),
    teams: toNumber(record.get('teams')),
    relationships: toNumber(record.get('relationships')),
  }));
  return rows[0] ?? { people: 0, skills: 0, projects: 0, roles: 0, teams: 0, relationships: 0 };
}

export async function listSinglePointsOfFailure(limit = 12): Promise<SinglePointOfFailure[]> {
  return read(SINGLE_POINTS_OF_FAILURE, { limit }, (record) => {
    const understudy = optionalField<{ person: PersonSummary; level: number }>(record, 'understudy');
    return {
      skillId: field<string>(record, 'skillId'),
      name: field<string>(record, 'name'),
      category: field<SinglePointOfFailure['category']>(record, 'category'),
      expert: field<PersonSummary>(record, 'expert'),
      exposedProjects: listField<SinglePointOfFailure['exposedProjects'][number]>(record, 'exposedProjects'),
      understudy: understudy
        ? { ...understudy.person, level: understudy.level as SkillLevel }
        : null,
      severity: round(toNumber(record.get('severity')), 2),
    };
  });
}

export async function getOverview(): Promise<OverviewStats> {
  const [counts, coverage, openToMove, supplyDemand, departments, connected, spof] = await Promise.all([
    getCounts(),
    read(ACTIVE_PROJECT_COVERAGE, {}, (record) => ({
      activeProjects: toNumber(record.get('activeProjects')),
      averageProjectCoverage: round(toNumber(record.get('averageProjectCoverage')), 3),
    })),
    read(OPEN_TO_MOVE_COUNT, {}, (record) => toNumber(record.get('openToMove'))),
    read(SKILL_SUPPLY_DEMAND, { limit: 40 }, (record) => ({
      skillId: field<string>(record, 'skillId'),
      name: field<string>(record, 'name'),
      category: field<OverviewStats['topSkillsByDemand'][number]['category']>(record, 'category'),
      demand: toNumber(record.get('demand')),
      supply: toNumber(record.get('supply')),
      experts: toNumber(record.get('experts')),
    })),
    read(DEPARTMENT_BREAKDOWN, {}, (record) => ({
      department: field<string>(record, 'department'),
      people: toNumber(record.get('people')),
      projects: toNumber(record.get('projects')),
    })),
    read(MOST_CONNECTED, { limit: 6 }, (record) => ({
      ...field<PersonSummary>(record, 'person'),
      connections: toNumber(record.get('connections')),
    })),
    listSinglePointsOfFailure(50),
  ]);

  return {
    counts,
    activeProjects: coverage[0]?.activeProjects ?? 0,
    averageProjectCoverage: coverage[0]?.averageProjectCoverage ?? 0,
    openToMove: openToMove[0] ?? 0,
    singlePointsOfFailure: spof.length,
    topSkillsByDemand: supplyDemand
      .slice(0, 8)
      .map(({ skillId, name, category, demand, supply }) => ({ skillId, name, category, demand, supply })),
    scarcestSkills: [...supplyDemand]
      .sort((a, b) => a.experts - b.experts || b.demand - a.demand)
      .slice(0, 6)
      .map(({ skillId, name, category, demand, experts }) => ({ skillId, name, category, demand, experts })),
    departmentBreakdown: departments,
    mostConnected: connected,
  };
}

export async function getDepartureImpact(personId: string): Promise<DepartureImpact> {
  const person = await getPersonSummary(personId);

  const [affectedProjects, criticalSkills, replacements] = await Promise.all([
    read(DEPARTURE_IMPACT, { personId }, (record) => ({
      projectId: field<string>(record, 'projectId'),
      name: field<string>(record, 'name'),
      code: field<string>(record, 'code'),
      status: field<DepartureImpact['affectedProjects'][number]['status']>(record, 'status'),
      orphanedSkills: listField<DepartureImpact['affectedProjects'][number]['orphanedSkills'][number]>(
        record,
        'orphanedSkills',
      ),
    })),
    read(CRITICAL_SKILLS_FOR_PERSON, { personId, limit: 10 }, (record) => ({
      skillId: field<string>(record, 'skillId'),
      name: field<string>(record, 'name'),
      otherExperts: toNumber(record.get('otherExperts')),
    })),
    read(REPLACEMENT_CANDIDATES, { personId, limit: 6 }, (record) => ({
      ...field<PersonSummary>(record, 'person'),
      score: toNumber(record.get('score')),
      collaborationDistance: optionalField<number>(record, 'collaborationDistance'),
      matchedSkills: listField<CandidateSuggestion['matchedSkills'][number]>(record, 'matchedSkills'),
      missingSkills: listField<CandidateSuggestion['missingSkills'][number]>(record, 'missingSkills'),
    })),
  ]);

  const orphanCount = affectedProjects.reduce((sum, project) => sum + project.orphanedSkills.length, 0);
  const soleExpertCount = criticalSkills.filter((skill) => skill.otherExperts === 0).length;
  const riskScore = Math.min(100, orphanCount * 12 + soleExpertCount * 18 + affectedProjects.length * 4);

  return {
    person,
    affectedProjects,
    criticalSkills,
    replacements,
    riskScore,
  };
}
