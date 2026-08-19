/**
 * Reusable Cypher fragments.
 *
 * These are composed into query text at module load from *hard-coded* identifier
 * names only — never from request data. Every value that originates with a user
 * travels as a bound parameter. The `defineQuery` runner accepts nothing but
 * these pre-built statements, so there is no path from an HTTP request to query
 * text.
 */

/** How proficient someone must be before they count as covering a requirement. */
export const MENTOR_LEVEL = 4;

/**
 * Project a `Person` node into the `PersonSummary` DTO.
 *
 * Pure property reads, no traversal. The role, team, department and location
 * labels are denormalised onto the node at seed time precisely so this
 * projection can be used *anywhere* — including inside a pattern comprehension,
 * where CognoDB cannot evaluate a second one ("pattern comprehension requires a
 * store context"). It is also markedly faster than four extra hops per row.
 *
 * The HOLDS_ROLE / MEMBER_OF / BASED_IN edges remain authoritative and are what
 * every traversal query actually walks; these are display copies.
 *
 * @param v the already-bound Cypher variable holding the :Person node
 */
export function personSummary(v: string): string {
  return `{
    id: ${v}.id,
    name: ${v}.name,
    title: ${v}.title,
    seniority: ${v}.seniority,
    avatarHue: ${v}.avatarHue,
    openToMove: ${v}.openToMove,
    tenureMonths: ${v}.tenureMonths,
    roleId: ${v}.roleId,
    roleTitle: ${v}.roleTitle,
    teamId: ${v}.teamId,
    teamName: ${v}.teamName,
    departmentName: ${v}.departmentName,
    locationId: ${v}.locationId,
    locationLabel: ${v}.locationLabel
  }`;
}

/**
 * Project a `Role` node into the `RoleSummary` DTO.
 * `holders` is cached on the node by the seed, for the same reason as above.
 */
export function roleSummary(v: string): string {
  return `{
    id: ${v}.id,
    title: ${v}.title,
    family: ${v}.family,
    level: ${v}.level,
    holders: coalesce(${v}.holders, 0)
  }`;
}

/** Project a `Skill` node into a lightweight reference. */
export function skillRef(v: string): string {
  return `{ id: ${v}.id, name: ${v}.name, category: ${v}.category }`;
}

/**
 * A person's proficiency in an already-bound skill, or 0.
 *
 * The obvious way to write this is `OPTIONAL MATCH (p)-[h:HAS_SKILL]->(s)`,
 * which is wrong on CognoDB 0.9.x: OPTIONAL MATCH ignores the fact that `s` is
 * already bound and matches *every* skill the person holds, multiplying the row
 * count and quietly corrupting any gap or coverage arithmetic downstream. A
 * flat pattern comprehension that re-checks the id is evaluated correctly.
 *
 * @param person bound :Person variable
 * @param skill  bound :Skill variable
 * @param tag    unique suffix; two of these in one clause need distinct names
 */
export function levelInSkill(person: string, skill: string, tag: string): string {
  return `coalesce(head([(${person})-[h_${tag}:HAS_SKILL]->(sk_${tag}:Skill)
            WHERE sk_${tag}.id = ${skill}.id | h_${tag}.level]), 0)`;
}

/**
 * How many people staffed on a bound project meet a bound requirement.
 * Same reasoning as `levelInSkill` — written as a comprehension, not a join.
 */
export function coverCount(project: string, skill: string, minLevel: string, tag: string): string {
  return `size([(${project})<-[:WORKED_ON]-(m_${tag}:Person)-[hs_${tag}:HAS_SKILL]->(sc_${tag}:Skill)
           WHERE sc_${tag}.id = ${skill}.id AND hs_${tag}.level >= ${minLevel} | m_${tag}])`;
}

/**
 * Null-tolerant filters shared by the directory screens.
 *
 * Every clause short-circuits when its parameter is null, so one statement
 * serves every combination of filters instead of assembling query text per
 * request. `$q` is expected to arrive already lower-cased.
 *
 * Existence is expressed as `size([pattern]) > 0` rather than the more natural
 * pattern predicate `(p)-[:HAS_SKILL]->(:Skill {id: $skillId})`. CognoDB 0.9.x
 * evaluates a pattern predicate while ignoring the inline property constraint,
 * so that form silently matches anyone with *any* skill instead of the one
 * asked for — a wrong answer rather than an error. The comprehension form is
 * evaluated correctly. See docs/queries.md.
 */
export const PEOPLE_FILTER = `
  ($q IS NULL OR toLower(p.name) CONTAINS $q OR toLower(p.title) CONTAINS $q OR toLower(p.seniority) CONTAINS $q)
  AND ($roleId IS NULL OR p.roleId = $roleId)
  AND ($teamId IS NULL OR p.teamId = $teamId)
  AND ($skillId IS NULL OR size([(p)-[:HAS_SKILL]->(fs:Skill) WHERE fs.id = $skillId | fs]) > 0)
  AND ($openToMove IS NULL OR p.openToMove = $openToMove)
`;

export const PROJECT_FILTER = `
  ($q IS NULL OR toLower(pr.name) CONTAINS $q OR toLower(pr.code) CONTAINS $q OR toLower(pr.summary) CONTAINS $q)
  AND ($status IS NULL OR pr.status = $status)
  AND ($skillId IS NULL OR size([(pr)-[:REQUIRES]->(fps:Skill) WHERE fps.id = $skillId | fps]) > 0)
`;

export const SKILL_FILTER = `
  ($q IS NULL OR toLower(s.name) CONTAINS $q OR toLower(s.description) CONTAINS $q)
  AND ($category IS NULL OR s.category = $category)
`;
