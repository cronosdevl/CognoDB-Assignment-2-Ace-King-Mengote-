import { readFileSync } from 'node:fs';

import * as esbuild from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/**
 * Every published npm dependency stays external (they are installed at deploy
 * time), but workspace packages such as `@wayfinder/shared` ship as TypeScript
 * source and must be bundled in.
 */
const external = Object.keys(pkg.dependencies ?? {}).filter((name) => !name.startsWith('@wayfinder/'));

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  external,
  logLevel: 'info',
  // Node's ESM loader has no `require`; a couple of transitive CJS deps expect one.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});
