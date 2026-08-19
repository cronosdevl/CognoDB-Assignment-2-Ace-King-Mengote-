/**
 * Vercel serverless entry point for the Wayfinder API.
 *
 * The file name is an optional catch-all, so every request to `/api/...` is
 * routed here and Express does its own matching from the original URL. The
 * frontend is served from the same deployment, which means the browser calls
 * `/api/health` on its own origin — no second domain, and no CORS.
 *
 * `createApp()` deliberately does not call `listen()`; the HTTP server is
 * Vercel's, and an Express app is itself a `(req, res)` handler.
 *
 * The module-level `app` is created once per warm instance, so the CognoDB
 * driver and its connection pool are reused across invocations rather than
 * rebuilt on every request.
 */
import { createApp } from '../server/src/app.js';

export default createApp();
