import { defineQuery } from '../../db/query.js';
import { MENTOR_LEVEL, personSummary } from './fragments.js';

/**
 * Single points of failure.
 *
 * A skill qualifies when it is required by at least one active project and
 * exactly one person in the company holds it at expert level. The query then
 * names the next-best person, so the answer is "here is the risk *and* here is
 * the cheapest way to remove it" rather than a bare warning.
 */
export const SINGLE_POINTS_OF_FAILURE = defineQuery(
  'insights:spof',
  `
  MATCH (s:Skill)<-[req:REQUIRES]-(pr:Project)
  WHERE pr.status IN ['active', 'planned']
  WITH s, collect({projectId: pr.id, name: pr.name, code: pr.code, importance: req.importance}) AS exposedProjects,
       max(req.importance) AS topImportance

  WITH s, exposedProjects, topImportance,
       [(s)<-[hs:HAS_SKILL]-(p:Person) WHERE hs.level >= ${MENTOR_LEVEL} | p] AS experts
  WHERE size(experts) = 1

  WITH s, exposedProjects, topImportance, experts[0] AS expert

  OPTIONAL MATCH (understudy:Person)-[uh:HAS_SKILL]->(s)
  WHERE understudy.id <> expert.id
  WITH s, exposedProjects, topImportance, expert, understudy, uh
  ORDER BY uh.level DESC, understudy.name ASC
  WITH s, exposedProjects, topImportance, expert,
       collect(CASE WHEN understudy IS NULL THEN null
                    ELSE {person: ${personSummary('understudy')}, level: uh.level} END)[0] AS understudy

  RETURN
    s.id AS skillId,
    s.name AS name,
    s.category AS category,
    ${personSummary('expert')} AS expert,
    exposedProjects,
    understudy,
    topImportance * size(exposedProjects) AS severity
  ORDER BY severity DESC, name ASC
  LIMIT $limit
  `,
);

/**
 * "What breaks if this person leaves?"
 *
 * For each of their live projects, find the requirements that *only* they
 * satisfy — the inner pattern comprehension counts everyone else on the same
 * project who also meets the minimum level, and keeps the requirement only when
 * that count is zero.
 */
export const DEPARTURE_IMPACT = defineQuery(
  'insights:departure-impact',
  `
  MATCH (p:Person {id: $personId})-[:WORKED_ON]->(pr:Project)
  WHERE pr.status IN ['active', 'planned']

  WITH p, pr,
       [(pr)-[req:REQUIRES]->(s:Skill)
        WHERE size([(p)-[ph:HAS_SKILL]->(s2:Skill) WHERE s2.id = s.id AND ph.level >= req.minLevel | s2]) > 0
          AND size([(pr)<-[:WORKED_ON]-(o:Person)-[oh:HAS_SKILL]->(s3:Skill)
                    WHERE s3.id = s.id AND o.id <> p.id AND oh.level >= req.minLevel | o]) = 0
        | {skillId: s.id, name: s.name, minLevel: req.minLevel}] AS orphanedSkills

  WHERE size(orphanedSkills) > 0

  RETURN
    pr.id AS projectId,
    pr.name AS name,
    pr.code AS code,
    pr.status AS status,
    orphanedSkills
  ORDER BY size(orphanedSkills) DESC, name ASC
  `,
);

/** Skills where this person is one of very few experts company-wide. */
export const CRITICAL_SKILLS_FOR_PERSON = defineQuery(
  'insights:critical-skills',
  `
  MATCH (p:Person {id: $personId})-[hs:HAS_SKILL]->(s:Skill)
  WHERE hs.level >= ${MENTOR_LEVEL}
  WITH s, size([(s)<-[oh:HAS_SKILL]-(o:Person)
                WHERE o.id <> p.id AND oh.level >= ${MENTOR_LEVEL} | o]) AS otherExperts
  WHERE otherExperts <= 2
  RETURN s.id AS skillId, s.name AS name, otherExperts
  ORDER BY otherExperts ASC, name ASC
  LIMIT $limit
  `,
);

/**
 * Who could step into this person's shoes: ranked by how much of their
 * expert-level skill set the candidate already covers, with a bonus for people
 * who have already worked alongside them.
 */
export const REPLACEMENT_CANDIDATES = defineQuery(
  'insights:replacements',
  `
  MATCH (p:Person {id: $personId})-[hs:HAS_SKILL]->(s:Skill)
  WHERE hs.level >= 3
  WITH p, collect({id: s.id, name: s.name, level: hs.level}) AS theirSkills
  WITH p, theirSkills, reduce(total = 0, x IN theirSkills | total + x.level) AS maxScore

  MATCH (cand:Person)
  WHERE cand.id <> p.id

  WITH p, theirSkills, maxScore, cand,
       [x IN theirSkills WHERE
          size([(cand)-[ch:HAS_SKILL]->(cs:Skill) WHERE cs.id = x.id AND ch.level >= x.level | cs]) > 0
        | x.id] AS coveredIds
  WHERE size(coveredIds) > 0

  WITH p, theirSkills, maxScore, cand, coveredIds,
       reduce(total = 0, x IN theirSkills | total + CASE WHEN x.id IN coveredIds THEN x.level ELSE 0 END) AS score,
       size([(p)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(x2:Person) WHERE x2.id = cand.id | x2]) AS shared

  WITH cand, theirSkills, coveredIds, shared,
       CASE WHEN maxScore = 0 THEN 0.0 ELSE toFloat(score) / maxScore END AS fit
  ORDER BY fit DESC, shared DESC, cand.name ASC
  LIMIT $limit

  RETURN
    ${personSummary('cand')} AS person,
    toInteger(round(fit * 100)) AS score,
    CASE WHEN shared > 0 THEN 1 ELSE null END AS collaborationDistance,
    [x IN theirSkills WHERE x.id IN coveredIds | {skillId: x.id, name: x.name, level: x.level, viaAdjacent: false}] AS matchedSkills,
    [x IN theirSkills WHERE NOT x.id IN coveredIds | {skillId: x.id, name: x.name, minLevel: x.level}] AS missingSkills
  `,
);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const DATASET_COUNTS = defineQuery(
  'insights:counts',
  `
  MATCH (p:Person) WITH count(p) AS people
  MATCH (s:Skill) WITH people, count(s) AS skills
  MATCH (pr:Project) WITH people, skills, count(pr) AS projects
  MATCH (r:Role) WITH people, skills, projects, count(r) AS roles
  MATCH (t:Team) WITH people, skills, projects, roles, count(t) AS teams
  MATCH ()-[rel]->() WITH people, skills, projects, roles, teams, count(rel) AS relationships
  RETURN people, skills, projects, roles, teams, relationships
  `,
);

/** Active project count and the average share of their requirements covered. */
export const ACTIVE_PROJECT_COVERAGE = defineQuery(
  'insights:coverage',
  `
  MATCH (pr:Project)
  WHERE pr.status = 'active'
  WITH pr, [(pr)-[req:REQUIRES]->(s:Skill) |
         CASE WHEN size([(pr)<-[:WORKED_ON]-(m:Person)-[hs:HAS_SKILL]->(s)
                         WHERE hs.level >= req.minLevel | m]) > 0 THEN 1 ELSE 0 END] AS covers
  RETURN
    count(pr) AS activeProjects,
    avg(CASE WHEN size(covers) = 0 THEN 1.0
             ELSE toFloat(reduce(total = 0, c IN covers | total + c)) / size(covers) END) AS averageProjectCoverage
  `,
);

export const OPEN_TO_MOVE_COUNT = defineQuery(
  'insights:open-to-move',
  `
  MATCH (p:Person)
  WHERE p.openToMove = true
  RETURN count(p) AS openToMove
  `,
);

/** Demand (active projects requiring it) versus supply (people at level 4+). */
export const SKILL_SUPPLY_DEMAND = defineQuery(
  'insights:supply-demand',
  `
  MATCH (s:Skill)
  WITH s,
       size([(s)<-[:REQUIRES]-(pr:Project) WHERE pr.status IN ['active', 'planned'] | pr]) AS demand,
       size([(s)<-[hs:HAS_SKILL]-(:Person) WHERE hs.level >= ${MENTOR_LEVEL} | hs]) AS experts,
       size([(s)<-[:HAS_SKILL]-(:Person) | s]) AS supply
  WHERE demand > 0
  RETURN s.id AS skillId, s.name AS name, s.category AS category, demand, supply, experts
  ORDER BY demand DESC, experts ASC, name ASC
  LIMIT $limit
  `,
);

export const DEPARTMENT_BREAKDOWN = defineQuery(
  'insights:departments',
  `
  MATCH (d:Department)
  RETURN
    d.name AS department,
    size([(d)<-[:PART_OF]-(:Team)<-[:MEMBER_OF]-(p:Person) | p]) AS people,
    size([(d)<-[:PART_OF]-(:Team)<-[:MEMBER_OF]-(:Person)-[:WORKED_ON]->(pr:Project) WHERE pr.status = 'active' | pr]) AS projects
  ORDER BY people DESC, department ASC
  `,
);

/**
 * The best-connected people, by distinct collaborators reached through shared
 * projects. A pure graph metric — there is no column anywhere that holds it.
 */
export const MOST_CONNECTED = defineQuery(
  'insights:most-connected',
  `
  MATCH (p:Person)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(other:Person)
  WHERE other.id <> p.id
  WITH p, count(DISTINCT other) AS connections
  ORDER BY connections DESC, p.name ASC
  LIMIT $limit
  RETURN ${personSummary('p')} AS person, connections
  `,
);
