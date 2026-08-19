import { defineQuery } from '../../db/query.js';
import { PEOPLE_FILTER, personSummary } from './fragments.js';

export const LIST_PEOPLE = defineQuery(
  'people:list',
  `
  MATCH (p:Person)
  WHERE ${PEOPLE_FILTER}
  WITH p
  ORDER BY p.name ASC
  SKIP $offset LIMIT $limit
  RETURN ${personSummary('p')} AS person
  `,
);

export const COUNT_PEOPLE = defineQuery(
  'people:count',
  `
  MATCH (p:Person)
  WHERE ${PEOPLE_FILTER}
  RETURN count(p) AS total
  `,
);

/** Single-person lookup returning the same shape as the directory listing. */
export const GET_PERSON_SUMMARY = defineQuery(
  'people:summary',
  `
  MATCH (p:Person {id: $id})
  RETURN ${personSummary('p')} AS person
  `,
);

export const GET_PERSON = defineQuery(
  'people:detail',
  `
  MATCH (p:Person {id: $id})
  RETURN
    ${personSummary('p')} AS person,
    p.email AS email,
    p.joinedAt AS joinedAt,
    p.bio AS bio,
    [(p)-[hs:HAS_SKILL]->(s:Skill) | {
      skillId: s.id,
      name: s.name,
      category: s.category,
      level: hs.level,
      endorsements: hs.endorsements,
      lastUsedAt: hs.lastUsedAt
    }] AS skills,
    [(p)-[w:WORKED_ON]->(pr:Project) | {
      projectId: pr.id,
      name: pr.name,
      code: pr.code,
      status: pr.status,
      contribution: w.contribution,
      allocationPct: w.allocationPct,
      from: w.from,
      to: w.to
    }] AS projects,
    [(p)-[e:EARNED]->(c:Certification) | {
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      earnedOn: e.earnedOn
    }] AS certifications,
    head([(p)-[:REPORTS_TO]->(m:Person) | ${personSummary('m')}]) AS manager,
    [(p)<-[:REPORTS_TO]-(rp:Person) | ${personSummary('rp')}] AS reports,
    [(p)<-[:MENTORS]-(mt:Person) | ${personSummary('mt')}] AS mentors,
    [(p)-[:MENTORS]->(me:Person) | ${personSummary('me')}] AS mentees
  `,
);

export const GET_COLLABORATORS = defineQuery(
  'people:collaborators',
  `
  MATCH (p:Person {id: $id})-[:WORKED_ON]->(pr:Project)<-[:WORKED_ON]-(other:Person)
  WHERE other.id <> p.id
  WITH other, count(DISTINCT pr) AS sharedProjects, collect(DISTINCT pr.name) AS sharedProjectNames
  ORDER BY sharedProjects DESC, other.name ASC
  LIMIT $limit
  RETURN ${personSummary('other')} AS person,
         sharedProjects,
         sharedProjectNames
  `,
);

export const FIND_CONNECTION = defineQuery(
  'people:connection',
  `
  MATCH (a:Person {id: $fromPersonId})
  MATCH (b:Person {id: $toPersonId})
  MATCH path = shortestPath((a)-[:WORKED_ON|MENTORS|REPORTS_TO*1..8]-(b))
  RETURN
    [n IN nodes(path) | {
      labels: labels(n),
      id: n.id,
      name: coalesce(n.name, n.title),
      code: n.code,
      title: n.title,
      seniority: n.seniority,
      avatarHue: n.avatarHue,
      openToMove: n.openToMove,
      tenureMonths: n.tenureMonths
    }] AS pathNodes,
    [r IN relationships(path) | type(r)] AS pathTypes
  `,
);

export const PERSON_NETWORK = defineQuery(
  'people:network',
  `
  MATCH (p:Person {id: $id})
  RETURN
    ${personSummary('p')} AS focus,
    [(p)-[:WORKED_ON]->(pr:Project) | {id: pr.id, name: pr.name, code: pr.code, status: pr.status}] AS projects,
    [(p)-[:HAS_SKILL]->(s:Skill) WHERE s.id IN $highlightSkillIds | {id: s.id, name: s.name, category: s.category}] AS skills,
    [(p)<-[:MENTORS]-(mt:Person) | ${personSummary('mt')}] AS mentors,
    [(p)-[:MENTORS]->(me:Person) | ${personSummary('me')}] AS mentees,
    [(p)-[:WORKED_ON]->(:Project)<-[:WORKED_ON]-(q:Person) WHERE q.id <> p.id | ${personSummary('q')}] AS peers,
    [(p)-[:WORKED_ON]->(pp:Project)<-[:WORKED_ON]-(q2:Person) WHERE q2.id <> p.id | {personId: q2.id, projectId: pp.id}] AS memberships
  `,
);
