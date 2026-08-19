import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnv(): void {
  let dir = here;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, '.env');
    if (existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

loadDotEnv();

const csv = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

const schema = z.object({
  COGNODB_URI: z
    .string()
    .min(1, 'COGNODB_URI is required — copy it from the CognoDB console')
    .refine(
      (value) => /^(bolt|bolt\+s|bolt\+ssc|neo4j|neo4j\+s|neo4j\+ssc):\/\//.test(value),
      'COGNODB_URI must start with bolt://, bolt+s://, neo4j:// or neo4j+s://',
    ),
  COGNODB_USER: z.string().min(1).default('cognodb'),
  COGNODB_PASSWORD: z.string().min(1, 'COGNODB_PASSWORD is required'),
  COGNODB_DATABASE: z.string().min(1).default('neo4j'),

  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: csv.default('http://localhost:5173'),

  MAX_PAGE_SIZE: z.coerce.number().int().positive().max(500).default(100),
});

export type Env = z.infer<typeof schema>;

function parseEnv(): Env {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    console.error(
      `\nWayfinder cannot start: the environment is not configured.\n\n${details}\n\n` +
        '  1. cp .env.example .env\n' +
        '  2. Fill in the values from https://console.cognodb.com\n' +
        '  3. npm run seed\n',
    );
    process.exit(1);
  }

  return result.data;
}

export const env: Env = parseEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

export function redactedConnection(): { uri: string; user: string; database: string } {
  return {
    uri: env.COGNODB_URI,
    user: env.COGNODB_USER,
    database: env.COGNODB_DATABASE,
  };
}
