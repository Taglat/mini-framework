/**
 * MiniDOM — a tiny, dependency-free UI framework.
 *
 * This barrel is the entire public API. Import from here:
 *
 *   import { h, Fragment, createApp, createStore, createRouter } from '../../src/index.js';
 *
 * The four pillars:
 *   - DOM abstraction   -> `h` / `Fragment` (vdom.js) + the diffing renderer (dom.js)
 *   - State management  -> `createStore` (state.js)
 *   - Routing           -> `createRouter` (router.js)
 *   - Event handling    -> delegation, wired automatically by `createApp` (events.js)
 *
 * See docs/DOCUMENTATION.md for a full guide.
 */

export { h, Fragment, text } from './vdom.js';
export { createStore } from './state.js';
export { createRouter } from './router.js';
export { createApp } from './app.js';

// Lower-level building blocks, exposed for advanced use / testing.
export { createNode, patch } from './dom.js';
export { createEventSystem } from './events.js';
