/**
 * Render every screen against the running app, fail on any console error, and
 * write the README screenshots.
 *
 *   npm run dev            # in one terminal
 *   npm run screenshots    # in another
 *
 * This is a smoke test first and a screenshot tool second: a React runtime
 * error does not break `tsc` or `vite build`, so without actually rendering the
 * pages a broken screen ships silently.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:5173';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/screenshots');

/** `wait` is a selector that must appear before the page counts as rendered. */
const SCREENS = [
  { name: 'overview', url: '/', wait: 'text=Meridian Labs at a glance' },
  { name: 'pathfinder', url: '/pathfinder', wait: 'text=Career pathfinder' },
  { name: 'people', url: '/people', wait: 'text=People' },
  { name: 'person', url: '/people/person-110', wait: 'text=Collaboration network' },
  { name: 'projects', url: '/projects', wait: 'text=Projects' },
  { name: 'project', url: '/projects/proj-accessibility-audit', wait: 'text=Skill requirements' },
  { name: 'skills', url: '/skills', wait: 'text=Skills' },
  { name: 'skill', url: '/skills/cypher', wait: 'text=Adjacent skills' },
  { name: 'connections', url: '/connections', wait: 'text=How are these two connected?' },
  { name: 'risk', url: '/risk', wait: 'text=Key-person risk' },
];

const problems = [];

async function capture(page, screen, theme) {
  const label = `${screen.name}${theme === 'dark' ? '-dark' : ''}`;
  const errors = [];

  const onConsole = (message) => {
    if (message.type() === 'error') errors.push(message.text());
  };
  const onPageError = (error) => errors.push(`uncaught: ${error.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    await page.goto(`${BASE}${screen.url}`, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForSelector(screen.wait, { timeout: 30_000 });
    // Let the force layout settle and the fade-in finish.
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: true });
    console.log(`  captured ${label}`);
  } catch (error) {
    problems.push(`${label}: ${error.message.split('\n')[0]}`);
    console.error(`  FAILED  ${label}: ${error.message.split('\n')[0]}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }

  // React logs key/prop warnings as console.error; treat them as failures too.
  const real = errors.filter((text) => !text.includes('Download the React DevTools'));
  if (real.length > 0) {
    for (const text of real) problems.push(`${label} console: ${text.slice(0, 200)}`);
    console.error(`  ${real.length} console error(s) on ${label}`);
    for (const text of real) console.error(`      ${text.slice(0, 200)}`);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Light theme');
  for (const screen of SCREENS) await capture(page, screen, 'light');

  console.log('Dark theme');
  await page.addInitScript(() => window.localStorage.setItem('wayfinder-theme', 'dark'));
  for (const screen of SCREENS.slice(0, 4)) await capture(page, screen, 'dark');

  await browser.close();

  console.log('');
  if (problems.length > 0) {
    console.error(`${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`All ${SCREENS.length} screens rendered cleanly. Screenshots in docs/screenshots/`);
  }
}

await main();
