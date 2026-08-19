export const MENTOR_LEVEL = 4;

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

export function roleSummary(v: string): string {
  return `{
    id: ${v}.id,
    title: ${v}.title,
    family: ${v}.family,
    level: ${v}.level,
    holders: coalesce(${v}.holders, 0)
  }`;
}

export function skillRef(v: string): string {
  return `{ id: ${v}.id, name: ${v}.name, category: ${v}.category }`;
}

export function levelInSkill(person: string, skill: string, tag: string): string {
  return `coalesce(head([(${person})-[h_${tag}:HAS_SKILL]->(sk_${tag}:Skill)
            WHERE sk_${tag}.id = ${skill}.id | h_${tag}.level]), 0)`;
}

export function coverCount(project: string, skill: string, minLevel: string, tag: string): string {
  return `size([(${project})<-[:WORKED_ON]-(m_${tag}:Person)-[hs_${tag}:HAS_SKILL]->(sc_${tag}:Skill)
           WHERE sc_${tag}.id = ${skill}.id AND hs_${tag}.level >= ${minLevel} | m_${tag}])`;
}

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
