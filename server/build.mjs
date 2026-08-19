import { readFileSync } from 'node:fs';

import * as esbuild from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

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
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});
