import type {
  CareerPath,
  CareerPathStep,
  PersonSummary,
  RoleDetail,
  RoleSummary,
  SkillGapEntry,
} from '@wayfinder/shared';

import { AppError } from '../db/errors.js';
import { read, readOne } from '../db/query.js';
import {
  FIND_ROLE_PATH,
  FIND_SKILL_GAPS,
  GET_ROLE,
  LIST_ROLES,
  PERSON_SKILL_LEVELS,
  ROLE_READINESS,
  SUGGEST_TARGET_ROLES,
} from '../graph/cypher/pathfinder.js';
import { field, listField, optionalField, round, toNumber } from '../graph/mappers.js';
import { getPersonSummary } from './people.service.js';

export async function listRoles(): Promise<RoleSummary[]> {
  return read(LIST_ROLES, {}, (record) => field<RoleSummary>(record, 'role'));
}

export async function getRole(id: string): Promise<RoleDetail> {
  const role = await readOne(GET_ROLE, { id }, (record) => ({
    ...field<RoleSummary>(record, 'role'),
    description: field<string>(record, 'description'),
    requiredSkills: listField<RoleDetail['requiredSkills'][number]>(record, 'requiredSkills'),
    progressesTo: listField<RoleSummary>(record, 'progressesTo'),
    progressesFrom: listField<RoleSummary>(record, 'progressesFrom'),
    people: listField<PersonSummary>(record, 'people'),
  }));

  if (!role) throw AppError.notFound('Role', id);

  return {
    ...role,
    requiredSkills: [...role.requiredSkills].sort((a, b) => b.weight - a.weight),
    progressesTo: [...role.progressesTo].sort((a, b) => a.level - b.level || a.title.localeCompare(b.title)),
    progressesFrom: [...role.progressesFrom].sort((a, b) => a.level - b.level || a.title.localeCompare(b.title)),
    people: [...role.people].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

interface RawGap {
  roleId: string;
  skillId: string;
  name: string;
  category: SkillGapEntry['category'];
  requiredLevel: SkillGapEntry['requiredLevel'];
  currentLevel: number;
  gap: number;
  weight: number;
  /** Every neighbour of the missing skill; the held ones are resolved here. */
  adjacent: Array<{ skillId: string; name: string; similarity: number }>;
  mentor: { person: PersonSummary; level: number; collaborationDistance: number | null } | null;
}

/**
 * The strongest adjacent skill the person actually holds.
 *
 * Ranked by similarity × proficiency: knowing a very close skill a little is
 * worth about as much as knowing a distant one well, and this is the number
 * that turns "you lack ETL" into "you know Spark at 4, so this is a short
 * climb". Resolved here rather than in Cypher because filtering the neighbour
 * list against the person's own skills inside the query would require a
 * comprehension nested in a comprehension.
 */
function bestHeadStart(
  adjacent: RawGap['adjacent'],
  held: Map<string, number>,
): SkillGapEntry['headStart'] {
  let best: SkillGapEntry['headStart'] = null;
  let bestScore = 0;

  for (const neighbour of adjacent) {
    const level = held.get(neighbour.skillId);
    if (!level) continue;
    const score = neighbour.similarity * level;
    if (score <= bestScore) continue;
    bestScore = score;
    best = {
      skillId: neighbour.skillId,
      name: neighbour.name,
      level: level as SkillGapEntry['requiredLevel'],
      similarity: neighbour.similarity,
    };
  }

  return best;
}

/**
 * Plan a route from where someone is to where they want to be.
 *
 * Three traversals, composed here rather than in one enormous statement so each
 * stays readable and independently testable:
 *
 *   1. the shortest route through the `PROGRESSES_TO` ladder;
 *   2. the skill gap at every role on that route, each with a head start and a
 *      suggested mentor;
 *   3. a weighted readiness score per step.
 *
 * Steps 2 and 3 run concurrently once the route is known, and both are driven
 * by the same `$roleIds` list, so the cost does not grow with the number of
 * roles in the ladder.
 */
export async function planCareerPath(personId: string, targetRoleId: string): Promise<CareerPath> {
  const person = await getPersonSummary(personId);
  const targetRole = await getRoleSummary(targetRoleId);

  if (!person.roleId) {
    return {
      person,
      fromRole: null,
      targetRole,
      steps: [],
      totalMonths: 0,
      overallReadiness: 0,
      reachable: false,
    };
  }

  const fromRole = await getRoleSummary(person.roleId);

  // Already there — nothing to plan.
  if (person.roleId === targetRoleId) {
    return {
      person,
      fromRole,
      targetRole,
      steps: [],
      totalMonths: 0,
      overallReadiness: 1,
      reachable: true,
    };
  }

  const route = await readOne(
    FIND_ROLE_PATH,
    { fromRoleId: person.roleId, toRoleId: targetRoleId },
    (record) => ({
      roles: listField<RoleSummary>(record, 'roles'),
      months: listField<number>(record, 'months').map((value) => toNumber(value)),
    }),
  );

  if (!route || route.roles.length < 2) {
    return { person, fromRole, targetRole, steps: [], totalMonths: 0, overallReadiness: 0, reachable: false };
  }

  // The first entry is the role they already hold; the steps are what follows.
  const destinationRoles = route.roles.slice(1);
  const roleIds = destinationRoles.map((role) => role.id);

  const [gaps, readiness, ownSkills] = await Promise.all([
    read(FIND_SKILL_GAPS, { personId, roleIds }, (record) => ({
      roleId: field<string>(record, 'roleId'),
      skillId: field<string>(record, 'skillId'),
      name: field<string>(record, 'name'),
      category: field<RawGap['category']>(record, 'category'),
      requiredLevel: toNumber(record.get('requiredLevel')) as RawGap['requiredLevel'],
      currentLevel: toNumber(record.get('currentLevel')),
      gap: toNumber(record.get('gap')),
      weight: toNumber(record.get('weight')),
      adjacent: listField<RawGap['adjacent'][number]>(record, 'adjacent'),
      mentor: optionalField<RawGap['mentor']>(record, 'mentor'),
    })),
    read(ROLE_READINESS, { personId, roleIds }, (record) => ({
      roleId: field<string>(record, 'roleId'),
      readiness: toNumber(record.get('readiness')),
    })),
    read(PERSON_SKILL_LEVELS, { personId }, (record) => ({
      skillId: field<string>(record, 'skillId'),
      level: toNumber(record.get('level')),
    })),
  ]);

  const heldSkills = new Map(ownSkills.map((entry) => [entry.skillId, entry.level]));

  const gapsByRole = new Map<string, SkillGapEntry[]>();
  // Defensive: one gap per (role, skill) whatever the engine returns. A
  // duplicate row here becomes a duplicate React key downstream.
  const seenGaps = new Set<string>();
  for (const raw of gaps) {
    const dedupeKey = `${raw.roleId}|${raw.skillId}`;
    if (seenGaps.has(dedupeKey)) continue;
    seenGaps.add(dedupeKey);
    const entry: SkillGapEntry = {
      skillId: raw.skillId,
      name: raw.name,
      category: raw.category,
      requiredLevel: raw.requiredLevel,
      currentLevel: raw.currentLevel as SkillGapEntry['currentLevel'],
      gap: raw.gap,
      headStart: bestHeadStart(raw.adjacent, heldSkills),
      mentor: raw.mentor
        ? {
            ...raw.mentor.person,
            level: raw.mentor.level as SkillGapEntry['requiredLevel'],
            collaborationDistance: raw.mentor.collaborationDistance,
          }
        : null,
    };
    if (!gapsByRole.has(raw.roleId)) gapsByRole.set(raw.roleId, []);
    gapsByRole.get(raw.roleId)!.push(entry);
  }

  const readinessByRole = new Map(readiness.map((entry) => [entry.roleId, entry.readiness]));

  const steps: CareerPathStep[] = destinationRoles.map((role, index) => ({
    order: index + 1,
    role,
    typicalMonths: toNumber(route.months[index], 12),
    gaps: gapsByRole.get(role.id) ?? [],
    readiness: round(readinessByRole.get(role.id) ?? 0, 3),
  }));

  const totalMonths = steps.reduce((sum, step) => sum + step.typicalMonths, 0);
  // The route is only as achievable as its hardest step.
  const overallReadiness = steps.length === 0 ? 1 : Math.min(...steps.map((step) => step.readiness));

  return {
    person,
    fromRole,
    targetRole,
    steps,
    totalMonths,
    overallReadiness: round(overallReadiness, 3),
    reachable: true,
  };
}

export async function suggestTargets(
  personId: string,
  limit = 6,
): Promise<Array<{ role: RoleSummary; readiness: number }>> {
  return read(SUGGEST_TARGET_ROLES, { personId, limit }, (record) => ({
    role: field<RoleSummary>(record, 'role'),
    readiness: round(toNumber(record.get('readiness')), 3),
  }));
}

async function getRoleSummary(id: string): Promise<RoleSummary> {
  const roles = await listRoles();
  const role = roles.find((entry) => entry.id === id);
  if (!role) throw AppError.notFound('Role', id);
  return role;
}
