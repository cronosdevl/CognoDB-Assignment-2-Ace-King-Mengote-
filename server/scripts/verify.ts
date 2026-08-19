/**
 * Run every headline query against the live instance and print what came back.
 *
 * This is the script to run after seeding: it proves the graph is populated,
 * that each traversal returns something sensible, and it doubles as a quick
 * demo of the queries described in the README.
 */
import { checkHealth, closeDriver } from '../src/db/driver.js';
import { logger } from '../src/lib/logger.js';
import { getCounts, getDepartureImpact, getOverview, listSinglePointsOfFailure } from '../src/services/insights.service.js';
import { findConnection, getPerson, listPeople } from '../src/services/people.service.js';
import { listRoles, planCareerPath, suggestTargets } from '../src/services/pathfinder.service.js';
import { getProject, listHiddenExperts, listProjects } from '../src/services/projects.service.js';
import { getSkill, listSkills } from '../src/services/skills.service.js';

const GREEN = '[32m';
const DIM = '[90m';
const BOLD = '[1m';
const RESET = '[0m';

let failures = 0;

function heading(title: string): void {
  console.log(`\n${BOLD}${title}${RESET}`);
}

function line(label: string, value: unknown): void {
  console.log(`  ${DIM}${label.padEnd(30)}${RESET} ${String(value)}`);
}

async function step<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const result = await fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    return result;
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}: ${(error as Error).message}`);
    return null;
  }
}

async function main(): Promise<void> {
  const health = await checkHealth();
  if (!health.ok) {
    logger.error('Cannot reach CognoDB', { error: health.error });
    process.exitCode = 1;
    return;
  }
  logger.info('Connected to CognoDB', { address: health.address, latencyMs: health.latencyMs });

  heading('Dataset');
  const counts = await step('counts', () => getCounts());
  if (counts) {
    line('people', counts.people);
    line('skills', counts.skills);
    line('projects', counts.projects);
    line('roles', counts.roles);
    line('teams', counts.teams);
    line('relationships', counts.relationships);
    if (counts.people === 0) {
      console.error('\nThe graph is empty — run `npm run seed` first.');
      process.exitCode = 1;
      return;
    }
  }

  heading('Directories');
  const people = await step('list people', () => listPeople({ q: null, skillId: null, teamId: null, roleId: null, openToMove: null, limit: 5, offset: 0 }));
  if (people) line('first page', people.items.map((p) => p.name).join(', '));

  const projects = await step('list projects', () => listProjects({ q: null, status: 'active', skillId: null, limit: 5, offset: 0 }));
  if (projects) line('active projects', projects.items.map((p) => p.code).join(', '));

  const skills = await step('list skills', () => listSkills({ q: null, category: null, limit: 5, offset: 0 }));
  if (skills) line('first page', skills.items.map((s) => s.name).join(', '));

  const roles = await step('list roles', () => listRoles());
  if (roles) line('roles', roles.length);

  const sample = people?.items[0];
  const sampleProject = projects?.items[0];

  if (sample) {
    heading(`Person detail — ${sample.name}`);
    const detail = await step('person detail', () => getPerson(sample.id));
    if (detail) {
      line('skills', detail.skills.length);
      line('projects', detail.projects.length);
      line('collaborators (2-hop)', detail.collaborators.length);
      line('mentors / mentees', `${detail.mentors.length} / ${detail.mentees.length}`);
    }

    heading('Career pathfinder (multi-hop)');
    const suggestions = await step('suggested targets', () => suggestTargets(sample.id, 5));
    if (suggestions && suggestions.length > 0) {
      for (const suggestion of suggestions) {
        line(suggestion.role.title, `${Math.round(suggestion.readiness * 100)}% ready`);
      }
      const target = suggestions[suggestions.length - 1]!.role;
      const path = await step(`route to "${target.title}"`, () => planCareerPath(sample.id, target.id));
      if (path) {
        line('reachable', path.reachable);
        line('steps', path.steps.map((s) => s.role.title).join(' → ') || '(none)');
        line('total months', path.totalMonths);
        const firstGap = path.steps[0]?.gaps[0];
        if (firstGap) {
          line('top gap', `${firstGap.name} (${firstGap.currentLevel} → ${firstGap.requiredLevel})`);
          line('suggested mentor', firstGap.mentor?.name ?? '(none found)');
          line('head start', firstGap.headStart ? `${firstGap.headStart.name} L${firstGap.headStart.level}` : '(none)');
        }
      }
    }

    heading('Departure impact');
    const impact = await step('what if they leave', () => getDepartureImpact(sample.id));
    if (impact) {
      line('risk score', impact.riskScore);
      line('affected projects', impact.affectedProjects.length);
      line('critical skills', impact.criticalSkills.length);
      line('replacements found', impact.replacements.length);
    }
  }

  if (people && people.items.length >= 2) {
    heading('Degrees of separation (shortestPath)');
    const a = people.items[0]!;
    const b = people.items[people.items.length - 1]!;
    const connection = await step(`${a.name} → ${b.name}`, () => findConnection(a.id, b.id));
    if (connection) {
      line('found', connection.found);
      line('degrees', connection.degrees);
      for (const hop of connection.hops) {
        line(`${hop.from.name} → ${hop.to.name}`, hop.via);
      }
    }
  }

  if (sampleProject) {
    heading(`Project detail — ${sampleProject.name}`);
    const project = await step('project detail', () => getProject(sampleProject.id));
    if (project) {
      line('headcount', project.headcount);
      line('coverage', `${Math.round(project.coverage * 100)}%`);
      line('gaps', project.gaps.map((g) => g.name).join(', ') || '(fully covered)');
      line('candidates', project.candidates.map((c) => `${c.name} (${c.score})`).join(', ') || '(none)');
    }

    heading('Hidden experts (collaboration distance)');
    const hidden = await step('hidden experts', () => listHiddenExperts(sampleProject.id, 5));
    if (hidden) {
      for (const expert of hidden) {
        line(expert.name, `distance ${expert.distance}, ${expert.matchedSkills.length} matching skills`);
      }
    }
  }

  heading('Risk — single points of failure');
  const spof = await step('single points of failure', () => listSinglePointsOfFailure(5));
  if (spof) {
    for (const entry of spof) {
      line(entry.name, `only ${entry.expert.name}; ${entry.exposedProjects.length} project(s) exposed`);
    }
  }

  heading('Skill detail');
  const firstSkill = skills?.items[0];
  if (firstSkill) {
    const skill = await step(`skill "${firstSkill.name}"`, () => getSkill(firstSkill.id));
    if (skill) {
      line('holders / experts', `${skill.holders} / ${skill.experts}`);
      line('adjacent skills', skill.adjacent.map((a) => a.name).slice(0, 5).join(', '));
    }
  }

  heading('Dashboard');
  const overview = await step('overview', () => getOverview());
  if (overview) {
    line('active projects', overview.activeProjects);
    line('avg coverage', `${Math.round(overview.averageProjectCoverage * 100)}%`);
    line('open to move', overview.openToMove);
    line('single points of failure', overview.singlePointsOfFailure);
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log(`${GREEN}All checks passed.${RESET}`);
  }
}

main()
  .catch((error) => {
    logger.error('Verification failed', { message: (error as Error).message });
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDriver();
  });
