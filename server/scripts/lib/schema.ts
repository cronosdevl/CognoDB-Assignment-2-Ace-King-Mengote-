import { defineQuery } from '../../src/db/query.js';

export const CONSTRAINTS = [
  'CREATE CONSTRAINT person_id IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT skill_id IF NOT EXISTS FOR (n:Skill) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT role_id IF NOT EXISTS FOR (n:Role) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT project_id IF NOT EXISTS FOR (n:Project) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT team_id IF NOT EXISTS FOR (n:Team) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT department_id IF NOT EXISTS FOR (n:Department) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT location_id IF NOT EXISTS FOR (n:Location) REQUIRE n.id IS UNIQUE',
  'CREATE CONSTRAINT certification_id IF NOT EXISTS FOR (n:Certification) REQUIRE n.id IS UNIQUE',
].map((text, index) => defineQuery(`constraint:${index}`, text));

/** Secondary indexes for the free-text filters in the directory screens. */
export const INDEXES = [
  'CREATE INDEX person_name IF NOT EXISTS FOR (n:Person) ON (n.name)',
  'CREATE INDEX skill_name IF NOT EXISTS FOR (n:Skill) ON (n.name)',
  'CREATE INDEX project_name IF NOT EXISTS FOR (n:Project) ON (n.name)',
  'CREATE INDEX project_status IF NOT EXISTS FOR (n:Project) ON (n.status)',
  'CREATE INDEX skill_category IF NOT EXISTS FOR (n:Skill) ON (n.category)',
].map((text, index) => defineQuery(`index:${index}`, text));


export const UPSERT_SKILLS = defineQuery(
  'seed:skills',
  `
  UNWIND $rows AS row
  MERGE (s:Skill {id: row.id})
  SET s.name = row.name,
      s.category = row.category,
      s.description = row.description
  `,
);

export const UPSERT_SKILL_ADJACENCY = defineQuery(
  'seed:skill-adjacency',
  `
  UNWIND $rows AS row
  MATCH (a:Skill {id: row.from})
  MATCH (b:Skill {id: row.to})
  MERGE (a)-[r:ADJACENT_TO]->(b)
  SET r.similarity = row.similarity
  `,
);

export const UPSERT_ROLES = defineQuery(
  'seed:roles',
  `
  UNWIND $rows AS row
  MERGE (r:Role {id: row.id})
  SET r.title = row.title,
      r.family = row.family,
      r.level = row.level,
      r.description = row.description
  `,
);

export const UPSERT_ROLE_REQUIRES = defineQuery(
  'seed:role-requires',
  `
  UNWIND $rows AS row
  MATCH (r:Role {id: row.roleId})
  MATCH (s:Skill {id: row.skillId})
  MERGE (r)-[rel:REQUIRES_SKILL]->(s)
  SET rel.minLevel = row.minLevel,
      rel.weight = row.weight
  `,
);

export const UPSERT_ROLE_PROGRESSION = defineQuery(
  'seed:role-progression',
  `
  UNWIND $rows AS row
  MATCH (a:Role {id: row.from})
  MATCH (b:Role {id: row.to})
  MERGE (a)-[rel:PROGRESSES_TO]->(b)
  SET rel.typicalMonths = row.typicalMonths
  `,
);

export const UPSERT_DEPARTMENTS = defineQuery(
  'seed:departments',
  `
  UNWIND $rows AS row
  MERGE (d:Department {id: row.id})
  SET d.name = row.name
  `,
);

export const UPSERT_TEAMS = defineQuery(
  'seed:teams',
  `
  UNWIND $rows AS row
  MERGE (t:Team {id: row.id})
  SET t.name = row.name
  WITH t, row
  MATCH (d:Department {id: row.departmentId})
  MERGE (t)-[:PART_OF]->(d)
  `,
);

export const UPSERT_LOCATIONS = defineQuery(
  'seed:locations',
  `
  UNWIND $rows AS row
  MERGE (l:Location {id: row.id})
  SET l.city = row.city,
      l.country = row.country,
      l.timezone = row.timezone
  `,
);

export const UPSERT_CERTIFICATIONS = defineQuery(
  'seed:certifications',
  `
  UNWIND $rows AS row
  MERGE (c:Certification {id: row.id})
  SET c.name = row.name,
      c.issuer = row.issuer
  `,
);

export const UPSERT_CERTIFIES = defineQuery(
  'seed:certifies',
  `
  UNWIND $rows AS row
  MATCH (c:Certification {id: row.certificationId})
  MATCH (s:Skill {id: row.skillId})
  MERGE (c)-[:CERTIFIES]->(s)
  `,
);

export const UPSERT_PROJECTS = defineQuery(
  'seed:projects',
  `
  UNWIND $rows AS row
  MERGE (p:Project {id: row.id})
  SET p.name = row.name,
      p.code = row.code,
      p.status = row.status,
      p.summary = row.summary,
      p.businessUnit = row.businessUnit,
      p.startedAt = row.startedAt,
      p.endedAt = row.endedAt
  `,
);

export const UPSERT_PROJECT_REQUIRES = defineQuery(
  'seed:project-requires',
  `
  UNWIND $rows AS row
  MATCH (p:Project {id: row.projectId})
  MATCH (s:Skill {id: row.skillId})
  MERGE (p)-[rel:REQUIRES]->(s)
  SET rel.importance = row.importance,
      rel.minLevel = row.minLevel
  `,
);

export const UPSERT_PEOPLE = defineQuery(
  'seed:people',
  `
  UNWIND $rows AS row
  MERGE (p:Person {id: row.id})
  SET p.name = row.name,
      p.email = row.email,
      p.title = row.title,
      p.seniority = row.seniority,
      p.bio = row.bio,
      p.joinedAt = row.joinedAt,
      p.tenureMonths = row.tenureMonths,
      p.avatarHue = row.avatarHue,
      p.openToMove = row.openToMove,
      // Denormalised for read paths — the edges created below stay authoritative.
      p.roleId = row.roleId,
      p.roleTitle = row.roleTitle,
      p.teamId = row.teamId,
      p.teamName = row.teamName,
      p.departmentName = row.departmentName,
      p.locationId = row.locationId,
      p.locationLabel = row.locationLabel
  WITH p, row
  MATCH (r:Role {id: row.roleId})
  MERGE (p)-[:HOLDS_ROLE]->(r)
  WITH p, row
  MATCH (t:Team {id: row.teamId})
  MERGE (p)-[:MEMBER_OF]->(t)
  WITH p, row
  MATCH (l:Location {id: row.locationId})
  MERGE (p)-[:BASED_IN]->(l)
  `,
);

export const UPSERT_HAS_SKILL = defineQuery(
  'seed:has-skill',
  `
  UNWIND $rows AS row
  MATCH (p:Person {id: row.personId})
  MATCH (s:Skill {id: row.skillId})
  MERGE (p)-[rel:HAS_SKILL]->(s)
  SET rel.level = row.level,
      rel.endorsements = row.endorsements,
      rel.lastUsedAt = row.lastUsedAt
  `,
);

export const UPSERT_WORKED_ON = defineQuery(
  'seed:worked-on',
  `
  UNWIND $rows AS row
  MATCH (p:Person {id: row.personId})
  MATCH (pr:Project {id: row.projectId})
  MERGE (p)-[rel:WORKED_ON]->(pr)
  SET rel.contribution = row.contribution,
      rel.allocationPct = row.allocationPct,
      rel.from = row.from,
      rel.to = row.to
  `,
);

export const UPSERT_REPORTS_TO = defineQuery(
  'seed:reports-to',
  `
  UNWIND $rows AS row
  MATCH (a:Person {id: row.from})
  MATCH (b:Person {id: row.to})
  MERGE (a)-[:REPORTS_TO]->(b)
  `,
);

export const UPSERT_MENTORS = defineQuery(
  'seed:mentors',
  `
  UNWIND $rows AS row
  MATCH (a:Person {id: row.from})
  MATCH (b:Person {id: row.to})
  MERGE (a)-[rel:MENTORS]->(b)
  SET rel.since = row.since,
      rel.focusSkillId = row.focusSkillId
  `,
);

export const UPSERT_EARNED = defineQuery(
  'seed:earned',
  `
  UNWIND $rows AS row
  MATCH (p:Person {id: row.personId})
  MATCH (c:Certification {id: row.certificationId})
  MERGE (p)-[rel:EARNED]->(c)
  SET rel.earnedOn = row.earnedOn
  `,
);

export const REFRESH_ROLE_HOLDERS = defineQuery(
  'seed:role-holders',
  `
  MATCH (r:Role)
  OPTIONAL MATCH (r)<-[:HOLDS_ROLE]-(p:Person)
  WITH r, count(p) AS holders
  SET r.holders = holders
  `,
);

/** Deletes a bounded slice so a reset never blows the free tier's heap. */
export const DELETE_BATCH = defineQuery(
  'seed:delete-batch',
  `
  MATCH (n)
  WITH n LIMIT $batchSize
  DETACH DELETE n
  RETURN count(n) AS deleted
  `,
);

export const COUNT_NODES = defineQuery('seed:count-nodes', 'MATCH (n) RETURN count(n) AS total');
