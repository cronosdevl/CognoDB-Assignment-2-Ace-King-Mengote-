/**
 * Vercel serverless entry point for the Wayfinder API.
 *
 * Every `/api/...` request is routed here by an explicit rewrite in
 * `vercel.json` rather than by a `[...path]` catch-all filename. The catch-all
 * only ever matched a single path segment in practice — `/api/health` worked
 * while `/api/people/person-134` fell through to Vercel's own 404 — so the
 * rewrite is both more predictable and easier to read.
 *
 * A rewrite preserves the original request path, so Express still sees
 * `/api/people/person-134` and does its own matching. The guard below covers
 * the case where the prefix is stripped before it reaches us, since the router
 * is mounted at `/api` and would otherwise miss.
 *
 * `createApp()` deliberately does not call `listen()`; the HTTP server is
 * Vercel's, and an Express app is itself a `(req, res)` handler. The
 * module-level instance is created once per warm container, so the CognoDB
 * driver and its connection pool survive between invocations.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import { createApp } from '../server/src/app.js';

const app = createApp();

export default function handler(request: IncomingMessage, response: ServerResponse): void {
  if (request.url && !request.url.startsWith('/api')) {
    request.url = `/api${request.url.startsWith('/') ? '' : '/'}${request.url}`;
  }
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(request, response);
}
