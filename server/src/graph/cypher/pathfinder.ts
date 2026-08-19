import { defineQuery } from '../../db/query.js';
import { levelInSkill, MENTOR_LEVEL, personSummary, roleSummary } from './fragments.js';

export const LIST_ROLES = defineQuery(
  'roles:list',
  `
  MATCH (r:Role)
  WITH r ORDER BY r.family ASC, r.level ASC, r.title ASC
  RETURN ${roleSummary('r')} AS role
  `,
);

export const GET_ROLE = defineQuery(
  'roles:detail',
  `
  MATCH (r:Role {id: $id})
  RETURN
    ${roleSummary('r')} AS role,
    r.description AS description,
    [(r)-[req:REQUIRES_SKILL]->(s:Skill) | {
      skillId: s.id, name: s.name, category: s.category, minLevel: req.minLevel, weight: req.weight
    }] AS requiredSkills,
    [(r)-[:PROGRESSES_TO]->(nxt:Role) | ${roleSummary('nxt')}] AS progressesTo,
    [(r)<-[:PROGRESSES_TO]-(prv:Role) | ${roleSummary('prv')}] AS progressesFrom,
    [(r)<-[:HOLDS_ROLE]-(p:Person) | ${personSummary('p')}] AS people
  `,
);

export const FIND_ROLE_PATH = defineQuery(
  'pathfinder:role-path',
  `
  MATCH (from:Role {id: $fromRoleId})
  MATCH (to:Role {id: $toRoleId})
  MATCH path = shortestPath((from)-[:PROGRESSES_TO*1..6]->(to))
  RETURN
    [n IN nodes(path) | ${roleSummary('n')}] AS roles,
    [rel IN relationships(path) | rel.typicalMonths] AS months
  `,
);

export const FIND_SKILL_GAPS = defineQuery(
  'pathfinder:skill-gaps',
  `
  MATCH (p:Person {id: $personId})
  UNWIND $roleIds AS roleId
  MATCH (r:Role {id: roleId})-[req:REQUIRES_SKILL]->(s:Skill)

  WITH p, roleId, s, req, ${levelInSkill('p', 's', 'own')} AS currentLevel
  WHERE currentLevel < req.minLevel

  // Every skill adjacent to the missing one, with how transferable it is.
  // Which of these the person actually holds is resolved in the service:
  // filtering here would need a comprehension inside a comprehension, which
  // CognoDB cannot evaluate.
  WITH p, roleId, s, req, currentLevel,
       [(s)-[adj:ADJACENT_TO]-(near:Skill) |
         {skillId: near.id, name: near.name, similarity: adj.similarity}] AS adjacent

  // Strongest available mentor, preferring people already in the person's orbit.
  // Only s is bound here and mentor is free, which is the OPTIONAL MATCH shape
  // CognoDB handles correctly.
  OPTIONAL MATCH (mentor:Person)-[mh:HAS_SKILL]->(s)
  WHERE mentor.id <> p.id AND mh.level >= ${MENTOR_LEVEL}
  WITH p, roleId, s, req, currentLevel, adjacent, mentor, mh,
       size([(p)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(x:Person) WHERE x.id = mentor.id | x]) AS sharedProjects
  ORDER BY sharedProjects DESC, mh.level DESC, mentor.name ASC

  // collect() and [0] must be separate clauses; combined, CognoDB does not
  // treat it as an aggregation and emits one row per mentor.
  WITH roleId, s, req, currentLevel, adjacent,
       collect(CASE WHEN mentor IS NULL THEN null ELSE {
         person: ${personSummary('mentor')},
         level: mh.level,
         collaborationDistance: CASE WHEN sharedProjects > 0 THEN 1 ELSE null END
       } END) AS mentors
  WITH roleId, s, req, currentLevel, adjacent, mentors[0] AS bestMentor

  RETURN
    roleId,
    s.id AS skillId,
    s.name AS name,
    s.category AS category,
    req.minLevel AS requiredLevel,
    currentLevel,
    req.minLevel - currentLevel AS gap,
    req.weight AS weight,
    adjacent,
    bestMentor AS mentor
  ORDER BY roleId, gap DESC, weight DESC
  `,
);

/** Every skill a person holds, used to resolve head starts against gaps. */
export const PERSON_SKILL_LEVELS = defineQuery(
  'pathfinder:person-skills',
  `
  MATCH (p:Person {id: $personId})-[hs:HAS_SKILL]->(s:Skill)
  RETURN s.id AS skillId, s.name AS name, hs.level AS level
  `,
);

/**
 * Readiness for a single role: the weighted share of its requirements the
 * person already meets. Used to colour each step of the route.
 */
export const ROLE_READINESS = defineQuery(
  'pathfinder:readiness',
  `
  MATCH (p:Person {id: $personId})
  UNWIND $roleIds AS roleId
  MATCH (r:Role {id: roleId})-[req:REQUIRES_SKILL]->(s:Skill)
  WITH roleId, req, ${levelInSkill('p', 's', 'rd')} AS level
  WITH roleId,
       sum(req.weight) AS totalWeight,
       sum(req.weight * CASE
             WHEN level >= req.minLevel THEN 1.0
             WHEN req.minLevel = 0 THEN 1.0
             ELSE toFloat(level) / req.minLevel
           END) AS metWeight
  RETURN roleId,
         CASE WHEN totalWeight = 0 THEN 1.0 ELSE metWeight / totalWeight END AS readiness
  `,
);

/**
 * Roles this person could plausibly aim for, ranked by readiness.
 * Powers the "suggested destinations" list on the pathfinder screen.
 */
export const SUGGEST_TARGET_ROLES = defineQuery(
  'pathfinder:suggestions',
  `
  MATCH (p:Person {id: $personId})-[:HOLDS_ROLE]->(current:Role)
  MATCH (current)-[:PROGRESSES_TO*1..3]->(target:Role)
  WHERE target.id <> current.id
  WITH DISTINCT p, target
  MATCH (target)-[req:REQUIRES_SKILL]->(s:Skill)
  WITH p, target, req, ${levelInSkill('p', 's', 'sg')} AS level
  WITH p, target,
       sum(req.weight) AS totalWeight,
       sum(req.weight * CASE
             WHEN level >= req.minLevel THEN 1.0
             WHEN req.minLevel = 0 THEN 1.0
             ELSE toFloat(level) / req.minLevel
           END) AS metWeight
  WITH target,
       CASE WHEN totalWeight = 0 THEN 1.0 ELSE metWeight / totalWeight END AS readiness
  ORDER BY readiness DESC, target.level ASC, target.title ASC
  LIMIT $limit
  RETURN ${roleSummary('target')} AS role, readiness
  `,
);
