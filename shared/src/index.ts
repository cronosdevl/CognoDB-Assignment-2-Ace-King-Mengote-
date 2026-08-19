/**
 * The Wayfinder API contract.
 *
 * Single source of truth for every payload crossing the wire. The Express
 * routes type their responses against these, and the React query hooks type
 * their results against the same declarations, so a change to a DTO breaks
 * compilation on whichever side has not caught up yet.
 */

export * from './domain.js';
export * from './api.js';
export * from './graph.js';
