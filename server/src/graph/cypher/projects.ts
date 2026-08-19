import { defineQuery } from '../../db/query.js';
import { PROJECT_FILTER, personSummary } from './fragments.js';

/**
 * Directory listing. `coverage` is computed in the query rather than the
 * service so sorting and the summary card agree: it is the share of a project's
 * requirements that at least one staffed person already meets.
 */
export const LIST_PROJECTS = defineQuery(
  'projects:list',
  `
  MATCH (pr:Project)
  WHERE ${PROJECT_FILTER}
  WITH pr,
       size([(pr)<-[:WORKED_ON]-(p:Person) | p]) AS headcount,
       [(pr)-[req:REQUIRES]->(s:Skill) | {
         skillId: s.id,
         minLevel: req.minLevel,
         covered: size([(pr)<-[:WORKED_ON]-(m:Person)-[hs:HAS_SKILL]->(s) WHERE hs.level >= req.minLevel | m]) > 0
       }] AS requirements
  WITH pr, headcount, requirements,
       size([x IN requirements WHERE x.covered]) AS coveredCount
  ORDER BY pr.status ASC, pr.name ASC
  SKIP $offset LIMIT $limit
  RETURN {
    id: pr.id,
    name: pr.name,
    code: pr.code,
    status: pr.status,
    summary: pr.summary,
    businessUnit: pr.businessUnit,
    startedAt: pr.startedAt,
    endedAt: pr.endedAt,
    headcount: headcount,
    requiredSkillCount: size(requirements),
    coverage: CASE WHEN size(requirements) = 0 THEN 1.0
                   ELSE toFloat(coveredCount) / size(requirements) END
  } AS project
  `,
);

export const COUNT_PROJECTS = defineQuery(
  'projects:count',
  `
  MATCH (pr:Project)
  WHERE ${PROJECT_FILTER}
  RETURN count(pr) AS total
  `,
);

export const GET_PROJECT = defineQuery(
  'projects:detail',
  `
  MATCH (pr:Project {id: $id})
  RETURN
    pr.id AS id,
    pr.name AS name,
    pr.code AS code,
    pr.status AS status,
    pr.summary AS summary,
    pr.businessUnit AS businessUnit,
    pr.startedAt AS startedAt,
    pr.endedAt AS endedAt,
    [(pr)<-[w:WORKED_ON]-(p:Person) | {
      person: ${personSummary('p')},
      contribution: w.contribution,
      allocationPct: w.allocationPct
    }] AS team,
    [(pr)-[req:REQUIRES]->(s:Skill) | {
      skillId: s.id,
      name: s.name,
      category: s.category,
      importance: req.importance,
      minLevel: req.minLevel,
      coveredBy: [(pr)<-[:WORKED_ON]-(m:Person)-[hs:HAS_SKILL]->(s) WHERE hs.level >= req.minLevel | ${personSummary('m')}]
    }] AS requirements
  `,
);

/**
 * Suggest people who could join a project.
 *
 * The interesting half is the last clause. A candidate who has never touched
 * the project may still be one collaboration hop away — they have shipped
 * something with somebody who is already staffed on it. That "who knows
 * somebody who knows the work" signal is a four-hop pattern
 * (candidate → project → colleague → project) and it is what separates a useful
 * suggestion from a keyword match on a skills table.
 */
export const PROJECT_CANDIDATES = defineQuery(
  'projects:candidates',
  `
  MATCH (pr:Project {id: $id})-[req:REQUIRES]->(s:Skill)
  WITH pr, collect({id: s.id, name: s.name, minLevel: req.minLevel, importance: req.importance}) AS reqs
  WITH pr, reqs, reduce(total = 0.0, r IN reqs | total + r.importance) AS maxScore

  MATCH (cand:Person)
  WHERE NOT (cand)-[:WORKED_ON]->(pr)

  WITH pr, reqs, maxScore, cand,
       [r IN reqs WHERE
          size([(cand)-[hs:HAS_SKILL]->(x:Skill) WHERE x.id = r.id AND hs.level >= r.minLevel | x]) > 0
        | r.id] AS directIds,
       [r IN reqs WHERE
          size([(cand)-[hs2:HAS_SKILL]->(x2:Skill) WHERE x2.id = r.id AND hs2.level >= r.minLevel | x2]) = 0
          AND size([(cand)-[ahs:HAS_SKILL]->(a:Skill)-[adj:ADJACENT_TO]-(t:Skill)
                    WHERE t.id = r.id AND ahs.level >= r.minLevel AND adj.similarity >= 0.6 | a]) > 0
        | r.id] AS adjacentIds
  WHERE size(directIds) > 0

  WITH pr, reqs, maxScore, cand, directIds, adjacentIds,
       reduce(total = 0.0, r IN reqs |
         total + CASE WHEN r.id IN directIds THEN r.importance
                      WHEN r.id IN adjacentIds THEN r.importance * 0.45
                      ELSE 0.0 END) AS rawScore,
       size([(cand)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(m:Person)-[:WORKED_ON]->(pr) | m]) AS directLinks

  WITH cand, reqs, directIds, adjacentIds, directLinks,
       CASE WHEN maxScore = 0 THEN 0.0 ELSE rawScore / maxScore END AS fit
  WHERE fit > 0.15

  ORDER BY fit DESC, directLinks DESC, cand.name ASC
  LIMIT $limit

  RETURN
    ${personSummary('cand')} AS person,
    toInteger(round(fit * 100)) AS score,
    CASE WHEN directLinks > 0 THEN 1 ELSE null END AS collaborationDistance,
    [r IN reqs WHERE r.id IN directIds | {
      skillId: r.id,
      name: r.name,
      level: head([(cand)-[hs3:HAS_SKILL]->(x3:Skill) WHERE x3.id = r.id | hs3.level]),
      viaAdjacent: false
    }] AS matchedDirect,
    [r IN reqs WHERE r.id IN adjacentIds | {
      skillId: r.id,
      name: r.name,
      level: 0,
      viaAdjacent: true
    }] AS matchedAdjacent,
    [r IN reqs WHERE NOT r.id IN directIds AND NOT r.id IN adjacentIds | {
      skillId: r.id,
      name: r.name,
      minLevel: r.minLevel
    }] AS missingSkills
  `,
);

/**
 * Hidden experts: people who are qualified for a project's requirements but are
 * not on it, ranked by how socially close they already are to the team.
 *
 * Distance 1 means they have shipped with somebody on the project; distance 2
 * means a friend-of-a-friend. Everything else is distance 3+, which in practice
 * means "nobody on this project has ever heard of them" — the people an org
 * chart would never surface.
 */
export const HIDDEN_EXPERTS = defineQuery(
  'projects:hidden-experts',
  `
  MATCH (pr:Project {id: $id})-[req:REQUIRES]->(s:Skill)
  MATCH (cand:Person)-[hs:HAS_SKILL]->(s)
  WHERE hs.level >= req.minLevel AND NOT (cand)-[:WORKED_ON]->(pr)

  WITH pr, cand,
       collect({skillId: s.id, name: s.name, level: hs.level}) AS matchedSkills,
       sum(req.importance * hs.level) AS rawScore

  WITH pr, cand, matchedSkills, rawScore,
       [(cand)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(m:Person)-[:WORKED_ON]->(pr) | m] AS firstDegree

  WITH pr, cand, matchedSkills, rawScore, firstDegree,
       CASE
         WHEN size(firstDegree) > 0 THEN 1
         WHEN size([(cand)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(:Person)
                    -[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(m2:Person)-[:WORKED_ON]->(pr) | m2]) > 0 THEN 2
         ELSE 3
       END AS distance

  WHERE size(matchedSkills) >= $minMatches
  ORDER BY distance ASC, rawScore DESC, cand.name ASC
  LIMIT $limit

  RETURN
    ${personSummary('cand')} AS person,
    distance,
    matchedSkills,
    rawScore AS score,
    [x IN firstDegree | ${personSummary('x')}][0..3] AS connectedVia
  `,
);
