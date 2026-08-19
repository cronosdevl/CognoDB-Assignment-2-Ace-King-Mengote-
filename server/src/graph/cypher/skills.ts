import { defineQuery } from '../../db/query.js';
import { MENTOR_LEVEL, SKILL_FILTER, personSummary } from './fragments.js';

export const LIST_SKILLS = defineQuery(
  'skills:list',
  `
  MATCH (s:Skill)
  WHERE ${SKILL_FILTER}
  WITH s,
       [(s)<-[hs:HAS_SKILL]-(:Person) | hs.level] AS levels,
       size([(s)<-[:REQUIRES]-(pr:Project) WHERE pr.status = 'active' | pr]) AS demandedBy
  ORDER BY s.category ASC, s.name ASC
  SKIP $offset LIMIT $limit
  RETURN {
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description,
    holders: size(levels),
    experts: size([x IN levels WHERE x >= ${MENTOR_LEVEL}]),
    demandedBy: demandedBy,
    averageLevel: CASE WHEN size(levels) = 0 THEN 0.0
                       ELSE reduce(total = 0.0, x IN levels | total + x) / size(levels) END
  } AS skill
  `,
);

export const COUNT_SKILLS = defineQuery(
  'skills:count',
  `
  MATCH (s:Skill)
  WHERE ${SKILL_FILTER}
  RETURN count(s) AS total
  `,
);

export const GET_SKILL = defineQuery(
  'skills:detail',
  `
  MATCH (s:Skill {id: $id})
  WITH s, [(s)<-[hs:HAS_SKILL]-(:Person) | hs.level] AS levels
  RETURN
    s.id AS id,
    s.name AS name,
    s.category AS category,
    s.description AS description,
    size(levels) AS holders,
    size([x IN levels WHERE x >= ${MENTOR_LEVEL}]) AS experts,
    size([(s)<-[:REQUIRES]-(pr:Project) WHERE pr.status = 'active' | pr]) AS demandedBy,
    CASE WHEN size(levels) = 0 THEN 0.0
         ELSE reduce(total = 0.0, x IN levels | total + x) / size(levels) END AS averageLevel,
    [x IN [1, 2, 3, 4, 5] | {level: x, count: size([y IN levels WHERE y = x])}] AS levelDistribution,
    [(s)-[adj:ADJACENT_TO]-(o:Skill) | {
      id: o.id, name: o.name, category: o.category, similarity: adj.similarity
    }] AS adjacent,
    [(s)<-[req:REQUIRES]-(pr2:Project) | {
      projectId: pr2.id, name: pr2.name, code: pr2.code, status: pr2.status,
      importance: req.importance, minLevel: req.minLevel
    }] AS requiredByProjects,
    [(s)<-[rr:REQUIRES_SKILL]-(r:Role) | {
      roleId: r.id, title: r.title, family: r.family, minLevel: rr.minLevel
    }] AS requiredByRoles
  `,
);

export const SKILL_HOLDERS = defineQuery(
  'skills:holders',
  `
  MATCH (s:Skill {id: $id})<-[hs:HAS_SKILL]-(p:Person)
  WITH p, hs
  ORDER BY hs.level DESC, hs.endorsements DESC, p.name ASC
  LIMIT $limit
  RETURN ${personSummary('p')} AS person,
         hs.level AS level,
         hs.endorsements AS endorsements,
         hs.lastUsedAt AS lastUsedAt
  `,
);

export const LIST_SKILL_CATEGORIES = defineQuery(
  'skills:categories',
  `
  MATCH (s:Skill)
  RETURN DISTINCT s.category AS category
  ORDER BY category ASC
  `,
);
