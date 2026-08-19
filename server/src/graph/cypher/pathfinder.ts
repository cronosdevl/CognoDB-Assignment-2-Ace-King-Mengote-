import { defineQuery } from '../../db/query.js';
import { MENTOR_LEVEL, personSummary, roleSummary } from './fragments.js';

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

/**
 * The career ladder as a route-planning problem.
 *
 * `PROGRESSES_TO` is a genuine graph, not a tree: lateral moves across families
 * (senior engineer → ML engineer, senior designer → product manager, SRE →
 * security) mean there are usually several ways to reach a target role and they
 * are not the same length. `shortestPath` finds the fewest-move route directly;
 * the SQL equivalent is a recursive CTE that has to enumerate paths, guard
 * against cycles and then take a MIN over the results.
 *
 * Bounded at six moves — beyond that the answer stops being career advice.
 */
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

/**
 * For every role on a route, what is this person still missing — and who in the
 * building could teach it to them?
 *
 * Three separate ideas are resolved per gap, and each is a traversal the
 * relational model would need its own join for:
 *
 *  · the gap itself — role requirement minus current proficiency;
 *  · the head start — an *adjacent* skill they already hold, so "you know Spark,
 *    so the ETL requirement is a short climb" rather than "you lack ETL";
 *  · the mentor — the strongest holder of that skill, preferring someone the
 *    person has already shipped with, because advice from a stranger two
 *    departments away rarely turns into anything.
 *
 * The `collect(...)[0]` after an ORDER BY is the portable way to take a
 * best-of-group without a correlated subquery.
 */
export const FIND_SKILL_GAPS = defineQuery(
  'pathfinder:skill-gaps',
  `
  MATCH (p:Person {id: $personId})
  UNWIND $roleIds AS roleId
  MATCH (r:Role {id: roleId})-[req:REQUIRES_SKILL]->(s:Skill)
  OPTIONAL MATCH (p)-[owned:HAS_SKILL]->(s)
  WITH p, roleId, r, s, req, coalesce(owned.level, 0) AS currentLevel
  WHERE currentLevel < req.minLevel

  // Best adjacent skill the person already holds.
  OPTIONAL MATCH (s)-[adj:ADJACENT_TO]-(near:Skill)<-[nearHas:HAS_SKILL]-(p)
  WITH p, roleId, s, req, currentLevel, adj, near, nearHas
  ORDER BY (coalesce(adj.similarity, 0) * coalesce(nearHas.level, 0)) DESC
  WITH p, roleId, s, req, currentLevel,
       collect(CASE WHEN near IS NULL THEN null ELSE {
         skillId: near.id, name: near.name, level: nearHas.level, similarity: adj.similarity
       } END)[0] AS headStart

  // Strongest available mentor, preferring people already in the person's orbit.
  OPTIONAL MATCH (mentor:Person)-[mh:HAS_SKILL]->(s)
  WHERE mentor.id <> p.id AND mh.level >= ${MENTOR_LEVEL}
  WITH p, roleId, s, req, currentLevel, headStart, mentor, mh,
       size([(p)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(x:Person) WHERE x.id = mentor.id | x]) AS sharedProjects
  ORDER BY sharedProjects DESC, mh.level DESC, mentor.name ASC
  WITH p, roleId, s, req, currentLevel, headStart,
       collect(CASE WHEN mentor IS NULL THEN null ELSE {
         person: ${personSummary('mentor')},
         level: mh.level,
         collaborationDistance: CASE WHEN sharedProjects > 0 THEN 1 ELSE null END
       } END)[0] AS bestMentor

  RETURN
    roleId,
    s.id AS skillId,
    s.name AS name,
    s.category AS category,
    req.minLevel AS requiredLevel,
    currentLevel,
    req.minLevel - currentLevel AS gap,
    req.weight AS weight,
    headStart,
    bestMentor AS mentor
  ORDER BY roleId, gap DESC, weight DESC
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
  OPTIONAL MATCH (p)-[owned:HAS_SKILL]->(s)
  WITH roleId,
       sum(req.weight) AS totalWeight,
       sum(req.weight * CASE
             WHEN coalesce(owned.level, 0) >= req.minLevel THEN 1.0
             WHEN req.minLevel = 0 THEN 1.0
             ELSE toFloat(coalesce(owned.level, 0)) / req.minLevel
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
  OPTIONAL MATCH (p)-[owned:HAS_SKILL]->(s)
  WITH p, target,
       sum(req.weight) AS totalWeight,
       sum(req.weight * CASE
             WHEN coalesce(owned.level, 0) >= req.minLevel THEN 1.0
             ELSE toFloat(coalesce(owned.level, 0)) / req.minLevel
           END) AS metWeight
  WITH target,
       CASE WHEN totalWeight = 0 THEN 1.0 ELSE metWeight / totalWeight END AS readiness
  ORDER BY readiness DESC, target.level ASC, target.title ASC
  LIMIT $limit
  RETURN ${roleSummary('target')} AS role, readiness
  `,
);
