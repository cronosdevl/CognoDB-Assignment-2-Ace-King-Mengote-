export const SKILL_CATEGORIES = [
  'Engineering',
  'Data & AI',
  'Product',
  'Design',
  'Infrastructure',
  'Security',
  'Domain',
  'Leadership',
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const ROLE_FAMILIES = [
  'Engineering',
  'Data & AI',
  'Product',
  'Design',
  'Infrastructure',
  'Security',
  'Management',
] as const;
export type RoleFamily = (typeof ROLE_FAMILIES)[number];

export const PROJECT_STATUSES = ['active', 'planned', 'completed', 'paused'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 Proficiency on a 1–5 scale.
 1 aware · 2 working · 3 practising · 4 strong · 5 expert
 Level 4 is the threshold at which someone is considered able to *cover* a
 requirement or *mentor* another person in it.
 */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export const MENTOR_LEVEL_THRESHOLD = 4;

export interface PersonSummary {
  id: string;
  name: string;
  title: string;
  seniority: string;
  avatarHue: number;
  openToMove: boolean;
  tenureMonths: number;
  roleId: string | null;
  roleTitle: string | null;
  teamId: string | null;
  teamName: string | null;
  departmentName: string | null;
  locationId: string | null;
  locationLabel: string | null;
}

export interface PersonSkill {
  skillId: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  endorsements: number;
  lastUsedAt: string | null;
}

export interface ProjectParticipation {
  projectId: string;
  name: string;
  code: string;
  status: ProjectStatus;
  contribution: string;
  allocationPct: number;
  from: string | null;
  to: string | null;
}

export interface CertificationRef {
  id: string;
  name: string;
  issuer: string;
  earnedOn: string | null;
}

export interface PersonDetail extends PersonSummary {
  email: string;
  joinedAt: string;
  bio: string;
  skills: PersonSkill[];
  projects: ProjectParticipation[];
  manager: PersonSummary | null;
  reports: PersonSummary[];
  mentors: PersonSummary[];
  mentees: PersonSummary[];
  certifications: CertificationRef[];
  /** People who worked on at least one shared project, most-shared first. */
  collaborators: Collaborator[];
}

export interface Collaborator extends PersonSummary {
  sharedProjects: number;
  sharedProjectNames: string[];
}

// Skills

export interface SkillSummary {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  holders: number;
  experts: number;
  demandedBy: number;
  averageLevel: number;
}

export interface AdjacentSkill {
  id: string;
  name: string;
  category: SkillCategory;
  similarity: number;
}

export interface SkillHolder extends PersonSummary {
  level: SkillLevel;
  endorsements: number;
  lastUsedAt: string | null;
}

export interface SkillDetail extends SkillSummary {
  adjacent: AdjacentSkill[];
  topHolders: SkillHolder[];
  requiredByProjects: Array<{
    projectId: string;
    name: string;
    code: string;
    status: ProjectStatus;
    importance: number;
    minLevel: SkillLevel;
  }>;
  requiredByRoles: Array<{ roleId: string; title: string; family: RoleFamily; minLevel: SkillLevel }>;
  levelDistribution: Array<{ level: SkillLevel; count: number }>;
}

// Projects

export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  status: ProjectStatus;
  summary: string;
  businessUnit: string;
  startedAt: string;
  endedAt: string | null;
  headcount: number;
  requiredSkillCount: number;
  coverage: number;
}

export interface ProjectSkillRequirement {
  skillId: string;
  name: string;
  category: SkillCategory;
  importance: number;
  minLevel: SkillLevel;
  coveredBy: PersonSummary[];
  covered: boolean;
}

export interface CandidateSuggestion extends PersonSummary {
  score: number;
  matchedSkills: Array<{ skillId: string; name: string; level: SkillLevel; viaAdjacent: boolean }>;
  missingSkills: Array<{ skillId: string; name: string; minLevel: SkillLevel }>;
  collaborationDistance: number | null;
}

export interface ProjectDetail extends ProjectSummary {
  team: Array<PersonSummary & { contribution: string; allocationPct: number }>;
  requirements: ProjectSkillRequirement[];
  gaps: ProjectSkillRequirement[];
  candidates: CandidateSuggestion[];
}


// Roles & career paths

export interface RoleSummary {
  id: string;
  title: string;
  family: RoleFamily;
  level: number;
  holders: number;
}

export interface RoleDetail extends RoleSummary {
  description: string;
  requiredSkills: Array<{ skillId: string; name: string; category: SkillCategory; minLevel: SkillLevel; weight: number }>;
  progressesTo: RoleSummary[];
  progressesFrom: RoleSummary[];
  people: PersonSummary[];
}

export interface SkillGapEntry {
  skillId: string;
  name: string;
  category: SkillCategory;
  requiredLevel: SkillLevel;
  currentLevel: SkillLevel | 0;
  gap: number;
  mentor: (PersonSummary & { level: SkillLevel; collaborationDistance: number | null }) | null;
  headStart: { skillId: string; name: string; level: SkillLevel; similarity: number } | null;
}

export interface CareerPathStep {
  order: number;
  role: RoleSummary;
  typicalMonths: number;
  gaps: SkillGapEntry[];
  readiness: number;
}

export interface CareerPath {
  person: PersonSummary;
  fromRole: RoleSummary | null;
  targetRole: RoleSummary;
  steps: CareerPathStep[];
  totalMonths: number;
  overallReadiness: number;
  reachable: boolean;
}

// Connections & risk

export type ConnectionHopType = 'WORKED_ON' | 'MENTORS' | 'REPORTS_TO' | 'MEMBER_OF' | 'HAS_SKILL';

export interface ConnectionHop {
  from: PersonSummary;
  to: PersonSummary;
  via: string;
  viaType: ConnectionHopType;
}

export interface ConnectionPath {
  from: PersonSummary;
  to: PersonSummary;
  hops: ConnectionHop[];
  degrees: number;
  found: boolean;
}

export interface SinglePointOfFailure {
  skillId: string;
  name: string;
  category: SkillCategory;
  expert: PersonSummary;
  exposedProjects: Array<{ projectId: string; name: string; code: string; importance: number }>;
  understudy: (PersonSummary & { level: SkillLevel }) | null;
  severity: number;
}

export interface DepartureImpact {
  person: PersonSummary;
  affectedProjects: Array<{
    projectId: string;
    name: string;
    code: string;
    status: ProjectStatus;
    orphanedSkills: Array<{ skillId: string; name: string; minLevel: SkillLevel }>;
  }>;
  criticalSkills: Array<{ skillId: string; name: string; otherExperts: number }>;
  replacements: CandidateSuggestion[];
  riskScore: number;
}

export interface HiddenExpert extends PersonSummary {
  distance: number;
  matchedSkills: Array<{ skillId: string; name: string; level: SkillLevel }>;
  connectedVia: PersonSummary[];
  score: number;
}

// Dashboard

export interface DatasetCounts {
  people: number;
  skills: number;
  projects: number;
  roles: number;
  teams: number;
  relationships: number;
}

export interface OverviewStats {
  counts: DatasetCounts;
  activeProjects: number;
  averageProjectCoverage: number;
  openToMove: number;
  singlePointsOfFailure: number;
  topSkillsByDemand: Array<{ skillId: string; name: string; category: SkillCategory; demand: number; supply: number }>;
  scarcestSkills: Array<{ skillId: string; name: string; category: SkillCategory; demand: number; experts: number }>;
  departmentBreakdown: Array<{ department: string; people: number; projects: number }>;
  mostConnected: Array<PersonSummary & { connections: number }>;
}
