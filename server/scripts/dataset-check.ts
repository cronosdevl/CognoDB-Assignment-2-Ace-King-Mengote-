/**
 * Generate and validate the seed dataset without touching a database.
 *
 *   npm run dataset:check
 *
 * Deliberately imports nothing from `src/config/env` (directly or through the
 * logger) so it runs before any credentials exist — it is the fast way to catch
 * a taxonomy mistake such as a project requiring a skill that was renamed, or a
 * career ladder pointing at a role that no longer exists.
 */
import { buildDataset, summariseDataset } from './lib/dataset.js';

const dataset = buildDataset();
const summary = summariseDataset(dataset);

console.log('Dataset generated and validated.\n');
for (const [key, value] of Object.entries(summary)) {
  console.log(`  ${key.padEnd(18)} ${value}`);
}

const sample = dataset.people[0];
const sampleSkills = dataset.hasSkill.filter((row) => row.personId === sample?.id);
const sampleProjects = dataset.workedOn.filter((row) => row.personId === sample?.id);

console.log('\nSample person');
console.log(`  ${sample?.name} — ${sample?.title} (${sample?.seniority})`);
console.log(`  team ${sample?.teamId}, ${sampleSkills.length} skills, ${sampleProjects.length} projects`);

const orphanProjects = dataset.projects.filter(
  (project) => !dataset.workedOn.some((row) => row.projectId === project.id),
);
if (orphanProjects.length > 0) {
  console.error(`\nWARNING: ${orphanProjects.length} project(s) have nobody staffed on them.`);
  process.exitCode = 1;
}

const orphanPeople = dataset.people.filter(
  (person) => !dataset.hasSkill.some((row) => row.personId === person.id),
);
if (orphanPeople.length > 0) {
  console.error(`\nWARNING: ${orphanPeople.length} person(s) have no skills.`);
  process.exitCode = 1;
}

console.log('\nOK');
