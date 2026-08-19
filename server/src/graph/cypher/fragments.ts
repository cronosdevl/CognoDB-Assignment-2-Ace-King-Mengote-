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
 * Nested pattern comprehensions pull the role, team, department and location in
 * the same traversal, which keeps a person's full card to a single round trip
 * even when they are nested three levels deep inside a `collect()`.
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
    roleId: head([(${v})-[:HOLDS_ROLE]->(__r:Role) | __r.id]),
    roleTitle: head([(${v})-[:HOLDS_ROLE]->(__r:Role) | __r.title]),
    teamId: head([(${v})-[:MEMBER_OF]->(__t:Team) | __t.id]),
    teamName: head([(${v})-[:MEMBER_OF]->(__t:Team) | __t.name]),
    departmentName: head([(${v})-[:MEMBER_OF]->(:Team)-[:PART_OF]->(__d:Department) | __d.name]),
    locationId: head([(${v})-[:BASED_IN]->(__l:Location) | __l.id]),
    locationLabel: head([(${v})-[:BASED_IN]->(__l:Location) | __l.city + ', ' + __l.country])
  }`;
}

/** Project a `Role` node into the `RoleSummary` DTO (without the holder count). */
export function roleSummary(v: string): string {
  return `{
    id: ${v}.id,
    title: ${v}.title,
    family: ${v}.family,
    level: ${v}.level,
    holders: size([(${v})<-[:HOLDS_ROLE]-(__p:Person) | __p])
  }`;
}

/** Project a `Skill` node into a lightweight reference. */
export function skillRef(v: string): string {
  return `{ id: ${v}.id, name: ${v}.name, category: ${v}.category }`;
}

/**
 * Null-tolerant filters shared by the directory screens.
 *
 * Every clause short-circuits when its parameter is null, so one statement
 * serves every combination of filters instead of assembling query text per
 * request. `$q` is expected to arrive already lower-cased.
 */
export const PEOPLE_FILTER = `
  ($q IS NULL OR toLower(p.name) CONTAINS $q OR toLower(p.title) CONTAINS $q OR toLower(p.seniority) CONTAINS $q)
  AND ($roleId IS NULL OR (p)-[:HOLDS_ROLE]->(:Role {id: $roleId}))
  AND ($teamId IS NULL OR (p)-[:MEMBER_OF]->(:Team {id: $teamId}))
  AND ($skillId IS NULL OR (p)-[:HAS_SKILL]->(:Skill {id: $skillId}))
  AND ($openToMove IS NULL OR p.openToMove = $openToMove)
`;

export const PROJECT_FILTER = `
  ($q IS NULL OR toLower(pr.name) CONTAINS $q OR toLower(pr.code) CONTAINS $q OR toLower(pr.summary) CONTAINS $q)
  AND ($status IS NULL OR pr.status = $status)
  AND ($skillId IS NULL OR (pr)-[:REQUIRES]->(:Skill {id: $skillId}))
`;

export const SKILL_FILTER = `
  ($q IS NULL OR toLower(s.name) CONTAINS $q OR toLower(s.description) CONTAINS $q)
  AND ($category IS NULL OR s.category = $category)
`;
