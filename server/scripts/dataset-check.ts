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

const unstaffed = dataset.people.filter(
  (person) => !dataset.workedOn.some((row) => row.personId === person.id),
);
console.log(`\nStaffing`);
console.log(`  people on no project   ${unstaffed.length}`);

const expertsBySkill = new Map<string, number>();
for (const row of dataset.hasSkill) {
  if (row.level < 4) continue;
  expertsBySkill.set(row.skillId, (expertsBySkill.get(row.skillId) ?? 0) + 1);
}
const demanded = [...new Set(dataset.projectRequires.map((row) => row.skillId))];
const buckets = { zero: 0, one: 0, few: 0, many: 0 };
for (const skillId of demanded) {
  const count = expertsBySkill.get(skillId) ?? 0;
  if (count === 0) buckets.zero += 1;
  else if (count === 1) buckets.one += 1;
  else if (count <= 4) buckets.few += 1;
  else buckets.many += 1;
}

console.log(`\nExpert supply across ${demanded.length} project-demanded skills`);
console.log(`  no expert at all       ${buckets.zero}`);
console.log(`  exactly one expert     ${buckets.one}   <- key-person risk`);
console.log(`  two to four experts    ${buckets.few}`);
console.log(`  five or more           ${buckets.many}`);

if (buckets.zero > demanded.length * 0.25) {
  console.error(`\nWARNING: ${buckets.zero} demanded skills have nobody at expert level.`);
  process.exitCode = 1;
}

const levelOf = new Map<string, number>();
for (const row of dataset.hasSkill) levelOf.set(`${row.personId}|${row.skillId}`, row.level);

const membersOf = new Map<string, string[]>();
for (const row of dataset.workedOn) {
  if (!membersOf.has(row.projectId)) membersOf.set(row.projectId, []);
  membersOf.get(row.projectId)!.push(row.personId);
}

let coveredTotal = 0;
let requirementTotal = 0;
let projectsWithGap = 0;
for (const project of dataset.projects) {
  const requirements = dataset.projectRequires.filter((row) => row.projectId === project.id);
  const members = membersOf.get(project.id) ?? [];
  let covered = 0;
  for (const requirement of requirements) {
    const isCovered = members.some(
      (personId) => (levelOf.get(`${personId}|${requirement.skillId}`) ?? 0) >= requirement.minLevel,
    );
    if (isCovered) covered += 1;
  }
  coveredTotal += covered;
  requirementTotal += requirements.length;
  if (covered < requirements.length) projectsWithGap += 1;
}

const coverage = requirementTotal === 0 ? 1 : coveredTotal / requirementTotal;
console.log('\nProject coverage');
console.log(`  requirements covered   ${coveredTotal}/${requirementTotal}  (${(coverage * 100).toFixed(0)}%)`);
console.log(`  projects with a gap    ${projectsWithGap}/${dataset.projects.length}`);

if (projectsWithGap === 0) {
  console.error('\nWARNING: every project is fully covered — the gap features have nothing to show.');
  process.exitCode = 1;
}

console.log('\nOK');
