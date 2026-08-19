import type { SkillLevel } from '@wayfinder/shared';

import { BIO_OPENERS, CONTRIBUTIONS, FIRST_NAMES, LAST_NAMES, seniorityForLevel } from '../data/names.js';
import { CERTIFICATIONS, DEPARTMENTS, LOCATIONS, PROJECTS, TEAMS } from '../data/org.js';
import { ROLE_PROGRESSION, ROLES } from '../data/roles.js';
import { SKILL_ADJACENCY, SKILLS } from '../data/skills.js';
import { Rng } from './random.js';

// ---------------------------------------------------------------------------
// Row shapes handed to Cypher. Every array below becomes a single UNWIND batch.
// ---------------------------------------------------------------------------

export interface PersonRow {
  id: string;
  name: string;
  email: string;
  title: string;
  seniority: string;
  bio: string;
  joinedAt: string;
  tenureMonths: number;
  avatarHue: number;
  openToMove: boolean;
  roleId: string;
  teamId: string;
  locationId: string;

  /**
   * Denormalised display attributes.
   *
   * The HOLDS_ROLE / MEMBER_OF / BASED_IN edges below remain authoritative and
   * are what every traversal uses. These copies exist purely so that projecting
   * a person into a card is a property read rather than four more hops — which
   * matters because a person card is frequently produced from inside a
   * comprehension, and CognoDB cannot nest a pattern comprehension inside
   * another one. Written only by the seed, from the same source as the edges.
   */
  roleTitle: string;
  teamName: string;
  departmentName: string;
  locationLabel: string;
}

export interface HasSkillRow {
  personId: string;
  skillId: string;
  level: SkillLevel;
  endorsements: number;
  lastUsedAt: string;
}

export interface WorkedOnRow {
  personId: string;
  projectId: string;
  contribution: string;
  allocationPct: number;
  from: string;
  to: string | null;
}

export interface PairRow {
  from: string;
  to: string;
}

export interface MentorsRow extends PairRow {
  since: string;
  focusSkillId: string;
}

export interface EarnedRow {
  personId: string;
  certificationId: string;
  earnedOn: string;
}

export interface Dataset {
  skills: typeof SKILLS;
  skillAdjacency: Array<{ from: string; to: string; similarity: number }>;
  roles: Array<{ id: string; title: string; family: string; level: number; description: string }>;
  roleRequires: Array<{ roleId: string; skillId: string; minLevel: SkillLevel; weight: number }>;
  roleProgression: Array<{ from: string; to: string; typicalMonths: number }>;
  departments: typeof DEPARTMENTS;
  teams: Array<{ id: string; name: string; departmentId: string }>;
  locations: typeof LOCATIONS;
  certifications: Array<{ id: string; name: string; issuer: string }>;
  certifies: Array<{ certificationId: string; skillId: string }>;
  projects: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    summary: string;
    businessUnit: string;
    startedAt: string;
    endedAt: string | null;
  }>;
  projectRequires: Array<{ projectId: string; skillId: string; importance: number; minLevel: SkillLevel }>;
  people: PersonRow[];
  hasSkill: HasSkillRow[];
  workedOn: WorkedOnRow[];
  reportsTo: PairRow[];
  mentors: MentorsRow[];
  earned: EarnedRow[];
}

const SEED = 20260819;
const REFERENCE_DATE = new Date('2026-08-01T00:00:00Z');
const PEOPLE_COUNT = 184;

const clampLevel = (value: number): SkillLevel =>
  Math.max(1, Math.min(5, Math.round(value))) as SkillLevel;

/**
 * Build the whole graph in memory.
 *
 * The generation order matters: people get their role's required skills first
 * (so role fit is realistic), then adjacent skills (so the "head start" logic in
 * the pathfinder has something to find), then project experience is assigned by
 * matching people to what a project actually needs. Randomness is layered on
 * top of that structure rather than replacing it — a purely random graph
 * produces uniformly mediocre answers to every query.
 */
export function buildDataset(): Dataset {
  const rng = new Rng(SEED);

  const skillById = new Map(SKILLS.map((skill) => [skill.id, skill]));
  const roleById = new Map(ROLES.map((role) => [role.id, role]));

  // --- adjacency lookup, used while assigning skills ------------------------
  const adjacency = new Map<string, Array<{ id: string; similarity: number }>>();
  for (const [a, b, similarity] of SKILL_ADJACENCY) {
    if (!skillById.has(a) || !skillById.has(b)) {
      throw new Error(`SKILL_ADJACENCY references an unknown skill: ${a} / ${b}`);
    }
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push({ id: b, similarity });
    adjacency.get(b)!.push({ id: a, similarity });
  }

  // --- people ---------------------------------------------------------------
  const people: PersonRow[] = [];
  const hasSkill: HasSkillRow[] = [];
  const personSkillLevels = new Map<string, Map<string, SkillLevel>>();
  const usedNames = new Set<string>();

  const teamCursor = TEAMS.map((team) => ({ team, assigned: 0 }));

  for (let i = 0; i < PEOPLE_COUNT; i += 1) {
    // Spread people across teams round-robin so no team is empty.
    const slot = teamCursor[i % teamCursor.length]!;
    slot.assigned += 1;
    const team = slot.team;

    const roleId = rng.pick(team.roleMix);
    const role = roleById.get(roleId);
    if (!role) throw new Error(`Team ${team.id} references unknown role "${roleId}"`);

    // Unique display name.
    let name = '';
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const candidate = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
      if (!usedNames.has(candidate)) {
        name = candidate;
        break;
      }
    }
    if (!name) name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${i}`;
    usedNames.add(name);

    const id = `person-${String(i + 1).padStart(3, '0')}`;
    const handle = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z ]/g, '')
      .split(' ')
      .filter(Boolean)
      .join('.');

    // More senior people have been around longer.
    const tenureMonths = rng.int(3 + role.level * 5, 18 + role.level * 16);
    const joinedAt = rng.pastDate(tenureMonths * 30, tenureMonths * 30 + 25, REFERENCE_DATE);
    const focusSkill = skillById.get(role.requires[0]?.[0] ?? 'typescript');

    const location = rng.pick(LOCATIONS);
    const department = DEPARTMENTS.find((entry) => entry.id === team.departmentId);

    people.push({
      id,
      name,
      email: `${handle}@meridianlabs.example`,
      title: role.title,
      seniority: seniorityForLevel(role.level),
      bio: rng.pick(BIO_OPENERS).replace('{focus}', focusSkill?.name ?? 'platform work'),
      joinedAt,
      tenureMonths,
      avatarHue: rng.int(0, 359),
      // Senior leadership moves around less.
      openToMove: rng.bool(role.level >= 5 ? 0.12 : 0.34),
      roleId: role.id,
      teamId: team.id,
      locationId: location.id,
      roleTitle: role.title,
      teamName: team.name,
      departmentName: department?.name ?? '',
      locationLabel: `${location.city}, ${location.country}`,
    });

    // --- skills for this person --------------------------------------------
    const levels = new Map<string, SkillLevel>();

    // 1. Whatever the role requires, roughly at the required level.
    for (const [skillId, minLevel] of role.requires) {
      const drift = rng.weighted([
        [-1, 0.18],
        [0, 0.42],
        [1, 0.3],
        [2, 0.1],
      ]);
      levels.set(skillId, clampLevel(minLevel + drift));
    }

    // 2. Skills adjacent to what they already do — the transfer paths.
    const seeds = [...levels.keys()];
    for (const seedSkill of seeds) {
      for (const neighbour of adjacency.get(seedSkill) ?? []) {
        if (levels.has(neighbour.id)) continue;
        if (!rng.bool(neighbour.similarity * 0.45)) continue;
        const base = levels.get(seedSkill) ?? 3;
        levels.set(neighbour.id, clampLevel(base * neighbour.similarity - rng.float(0, 0.8)));
      }
    }

    // 3. A couple of genuinely unrelated interests, so the graph is not a
    //    perfect reflection of the role taxonomy.
    for (const skill of rng.sample(SKILLS, rng.int(1, 4))) {
      if (levels.has(skill.id)) continue;
      levels.set(skill.id, clampLevel(rng.float(1, 3.4)));
    }

    for (const [skillId, level] of levels) {
      hasSkill.push({
        personId: id,
        skillId,
        level,
        endorsements: level >= 4 ? rng.int(2, 24) : rng.int(0, 7),
        lastUsedAt: rng.pastDate(5, level >= 4 ? 240 : 900, REFERENCE_DATE),
      });
    }
    personSkillLevels.set(id, levels);
  }

  // --- projects -------------------------------------------------------------
  const projects = PROJECTS.map((project) => {
    const ageDays = project.status === 'completed' ? rng.int(400, 900) : rng.int(60, 520);
    const startedAt = rng.pastDate(ageDays, ageDays + 20, REFERENCE_DATE);
    const endedAt =
      project.status === 'completed' ? rng.pastDate(30, Math.max(40, ageDays - 90), REFERENCE_DATE) : null;
    return {
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      summary: project.summary,
      businessUnit: project.businessUnit,
      startedAt,
      endedAt,
    };
  });

  const projectRequires = PROJECTS.flatMap((project) =>
    project.requires.map(([skillId, importance, minLevel]) => {
      if (!skillById.has(skillId)) {
        throw new Error(`Project ${project.id} requires unknown skill "${skillId}"`);
      }
      return { projectId: project.id, skillId, importance, minLevel };
    }),
  );

  // --- staffing -------------------------------------------------------------
  // Score everyone against each project's requirements and staff mostly from
  // the top of that list, with a deliberate tail of weaker fits. That tail is
  // what makes the "hidden experts" and "coverage gap" queries interesting:
  // projects are staffed imperfectly, exactly as they are in real life.
  const workedOn: WorkedOnRow[] = [];
  const projectMembers = new Map<string, string[]>();
  /** Every project fit per person, used to sweep up anyone left unstaffed. */
  const fitsByPerson = new Map<string, Array<{ projectId: string; score: number }>>();

  for (const project of PROJECTS) {
    const scored = people
      .map((person) => {
        const levels = personSkillLevels.get(person.id)!;
        let score = 0;
        for (const [skillId, importance, minLevel] of project.requires) {
          const level = levels.get(skillId) ?? 0;
          if (level >= minLevel) score += importance * 2;
          else if (level > 0) score += importance * (level / minLevel);
        }
        return { person, score: score + rng.float(0, 1.1) };
      })
      .sort((a, b) => b.score - a.score);

    // Record every fit, before the pools are narrowed.
    for (const entry of scored) {
      if (!fitsByPerson.has(entry.person.id)) fitsByPerson.set(entry.person.id, []);
      fitsByPerson.get(entry.person.id)!.push({ projectId: project.id, score: entry.score });
    }

    const headcount = rng.int(5, 12);
    const chosen: string[] = [];
    // Two thirds from the strongest fits, the rest from a wider band.
    const strongPool = scored.slice(0, Math.max(headcount, 18));
    const widePool = scored.slice(18, 90);

    for (const entry of rng.sample(strongPool, Math.ceil(headcount * 0.65))) {
      chosen.push(entry.person.id);
    }
    for (const entry of rng.sample(widePool, headcount - chosen.length)) {
      if (!chosen.includes(entry.person.id)) chosen.push(entry.person.id);
    }

    const projectRow = projects.find((p) => p.id === project.id)!;
    for (const personId of chosen) {
      workedOn.push({
        personId,
        projectId: project.id,
        contribution: rng.pick(CONTRIBUTIONS),
        allocationPct: rng.weighted([
          [20, 0.2],
          [40, 0.3],
          [60, 0.3],
          [80, 0.15],
          [100, 0.05],
        ]),
        from: projectRow.startedAt,
        to: projectRow.endedAt,
      });
    }
    projectMembers.set(project.id, chosen);
  }

  // Sampling leaves a tail of people on nothing at all, which is both
  // unrealistic — real organisations staff everybody onto something — and
  // corrosive to the graph: an unstaffed person has no collaborators, so they
  // sink to the bottom of every proximity ranking.
  //
  // Deliberately *not* their best-fitting project. Putting everyone exactly
  // where they fit best empties the "suggested additions" and "hidden experts"
  // panels, because the strongest candidate for a project ends up already on
  // it. Nobody in a real company is on their globally optimal project either.
  // Assigning from the second-to-eighth best fit keeps them plausibly staffed,
  // gives them collaborators, and leaves them discoverable as a candidate for
  // the project they would actually suit best.
  const staffed = new Set(workedOn.map((row) => row.personId));
  for (const person of people) {
    if (staffed.has(person.id)) continue;

    const fits = (fitsByPerson.get(person.id) ?? []).sort((a, b) => b.score - a.score);
    const band = fits.slice(1, 8);
    const choice = band.length > 0 ? rng.pick(band) : fits[0];
    if (!choice) continue;

    const projectRow = projects.find((p) => p.id === choice.projectId);
    if (!projectRow) continue;

    workedOn.push({
      personId: person.id,
      projectId: choice.projectId,
      contribution: rng.pick(CONTRIBUTIONS),
      allocationPct: rng.weighted([
        [20, 0.35],
        [40, 0.35],
        [60, 0.3],
      ]),
      from: projectRow.startedAt,
      to: projectRow.endedAt,
    });
    projectMembers.get(choice.projectId)?.push(person.id);
    staffed.add(person.id);
  }

  // --- reporting lines ------------------------------------------------------
  // Each team's most senior person manages the rest of that team; team leads
  // report to a department-level leader.
  const reportsTo: PairRow[] = [];
  const teamLeads = new Map<string, string>();

  for (const team of TEAMS) {
    const members = people.filter((person) => person.teamId === team.id);
    if (members.length === 0) continue;
    const lead = [...members].sort(
      (a, b) => (roleById.get(b.roleId)?.level ?? 0) - (roleById.get(a.roleId)?.level ?? 0),
    )[0]!;
    teamLeads.set(team.id, lead.id);
    for (const member of members) {
      if (member.id !== lead.id) reportsTo.push({ from: member.id, to: lead.id });
    }
  }

  for (const department of DEPARTMENTS) {
    const deptTeams = TEAMS.filter((team) => team.departmentId === department.id);
    const leadIds = deptTeams.map((team) => teamLeads.get(team.id)).filter((id): id is string => Boolean(id));
    if (leadIds.length < 2) continue;
    const head = [...leadIds].sort((a, b) => {
      const roleA = roleById.get(people.find((p) => p.id === a)!.roleId)?.level ?? 0;
      const roleB = roleById.get(people.find((p) => p.id === b)!.roleId)?.level ?? 0;
      return roleB - roleA;
    })[0]!;
    for (const leadId of leadIds) {
      if (leadId !== head) reportsTo.push({ from: leadId, to: head });
    }
  }

  // --- mentorship -----------------------------------------------------------
  // Mentorship follows expertise, not the org chart: a mentor is someone strong
  // in a skill the mentee is actively weak in. This is what makes the
  // mentorship graph worth traversing separately from REPORTS_TO.
  const mentors: MentorsRow[] = [];
  const mentorLoad = new Map<string, number>();
  const existingPairs = new Set<string>();

  const expertsBySkill = new Map<string, PersonRow[]>();
  for (const row of hasSkill) {
    if (row.level < 4) continue;
    if (!expertsBySkill.has(row.skillId)) expertsBySkill.set(row.skillId, []);
    expertsBySkill.get(row.skillId)!.push(people.find((p) => p.id === row.personId)!);
  }

  for (const person of people) {
    const role = roleById.get(person.roleId)!;
    if (role.level >= 5) continue;
    if (!rng.bool(0.55)) continue;

    // Pick a requirement of their *next* role that they are short on.
    const nextRoles = ROLE_PROGRESSION.filter(([from]) => from === role.id).map(([, to]) => to);
    const nextRole = nextRoles.length > 0 ? roleById.get(rng.pick(nextRoles)) : undefined;
    const targets = (nextRole ?? role).requires;
    const levels = personSkillLevels.get(person.id)!;

    const weak = targets.filter(([skillId, minLevel]) => (levels.get(skillId) ?? 0) < minLevel);
    if (weak.length === 0) continue;

    const [focusSkillId] = rng.pick(weak);
    const candidates = (expertsBySkill.get(focusSkillId) ?? []).filter((candidate) => {
      if (candidate.id === person.id) return false;
      if ((mentorLoad.get(candidate.id) ?? 0) >= 3) return false;
      return !existingPairs.has(`${candidate.id}->${person.id}`);
    });
    if (candidates.length === 0) continue;

    const mentor = rng.pick(candidates);
    existingPairs.add(`${mentor.id}->${person.id}`);
    mentorLoad.set(mentor.id, (mentorLoad.get(mentor.id) ?? 0) + 1);
    mentors.push({
      from: mentor.id,
      to: person.id,
      since: rng.pastDate(30, 700, REFERENCE_DATE),
      focusSkillId,
    });
  }

  // --- certifications -------------------------------------------------------
  const earned: EarnedRow[] = [];
  for (const person of people) {
    const levels = personSkillLevels.get(person.id)!;
    for (const certification of CERTIFICATIONS) {
      const strong = certification.certifies.some((skillId) => (levels.get(skillId) ?? 0) >= 4);
      if (!strong || !rng.bool(0.22)) continue;
      earned.push({
        personId: person.id,
        certificationId: certification.id,
        earnedOn: rng.pastDate(60, 1400, REFERENCE_DATE),
      });
    }
  }

  // --- validation -----------------------------------------------------------
  for (const role of ROLES) {
    for (const [skillId] of role.requires) {
      if (!skillById.has(skillId)) throw new Error(`Role ${role.id} requires unknown skill "${skillId}"`);
    }
  }
  const roleIds = new Set(ROLES.map((role) => role.id));
  for (const [from, to] of ROLE_PROGRESSION) {
    if (!roleIds.has(from) || !roleIds.has(to)) {
      throw new Error(`ROLE_PROGRESSION references an unknown role: ${from} -> ${to}`);
    }
  }

  return {
    skills: SKILLS,
    skillAdjacency: SKILL_ADJACENCY.map(([from, to, similarity]) => ({ from, to, similarity })),
    roles: ROLES.map(({ id, title, family, level, description }) => ({ id, title, family, level, description })),
    roleRequires: ROLES.flatMap((role) =>
      role.requires.map(([skillId, minLevel, weight]) => ({ roleId: role.id, skillId, minLevel, weight })),
    ),
    roleProgression: ROLE_PROGRESSION.map(([from, to, typicalMonths]) => ({ from, to, typicalMonths })),
    departments: DEPARTMENTS,
    teams: TEAMS.map(({ id, name, departmentId }) => ({ id, name, departmentId })),
    locations: LOCATIONS,
    certifications: CERTIFICATIONS.map(({ id, name, issuer }) => ({ id, name, issuer })),
    certifies: CERTIFICATIONS.flatMap((certification) =>
      certification.certifies.map((skillId) => ({ certificationId: certification.id, skillId })),
    ),
    projects,
    projectRequires,
    people,
    hasSkill,
    workedOn,
    reportsTo,
    mentors,
    earned,
  };
}

export function summariseDataset(dataset: Dataset): Record<string, number> {
  const relationships =
    dataset.skillAdjacency.length +
    dataset.roleRequires.length +
    dataset.roleProgression.length +
    dataset.teams.length +
    dataset.certifies.length +
    dataset.projectRequires.length +
    dataset.people.length * 3 +
    dataset.hasSkill.length +
    dataset.workedOn.length +
    dataset.reportsTo.length +
    dataset.mentors.length +
    dataset.earned.length;

  return {
    people: dataset.people.length,
    skills: dataset.skills.length,
    roles: dataset.roles.length,
    projects: dataset.projects.length,
    teams: dataset.teams.length,
    departments: dataset.departments.length,
    locations: dataset.locations.length,
    certifications: dataset.certifications.length,
    hasSkill: dataset.hasSkill.length,
    workedOn: dataset.workedOn.length,
    mentors: dataset.mentors.length,
    reportsTo: dataset.reportsTo.length,
    skillAdjacency: dataset.skillAdjacency.length,
    relationships,
  };
}
