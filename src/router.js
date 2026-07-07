/**
 * router.js — hash-based routing that stays in sync with the state.
 *
 * Routing here means: keep the URL and the application state in agreement. When
 * the user navigates (clicks a link, presses back), the route changes; when the
 * app wants to move the user, it calls `navigate()` and the URL updates. Either
 * way every subscriber fires so the app can fold the current route into its
 * view and re-render.
 *
 * We use the URL *hash* (`#/active`) rather than the History API because it
 * needs no server configuration — the app runs from any static folder, exactly
 * as the auditor will open it.
 */

/**
 * @param {object} options
 * @param {Record<string, any>} [options.routes]  optional map of path -> value
 *        (e.g. a component or a filter id). Unknown paths fall back to '/'.
 * @returns {{
 *   start(): void,
 *   stop(): void,
 *   current(): { path: string, value: any },
 *   navigate(path: string): void,
 *   subscribe(listener: (route: { path: string, value: any }) => void): () => void
 * }}
 */
export function createRouter({ routes = { '/': null } } = {}) {
  const listeners = new Set();

  function normalize(hash) {
    // '#/active' -> '/active', '' or '#' -> '/'
    let path = hash.replace(/^#/, '');
    if (!path.startsWith('/')) path = '/' + path;
    return path;
  }

  function resolve() {
    const path = normalize(window.location.hash);
    const known = path in routes;
    return { path: known ? path : '/', value: known ? routes[path] : routes['/'] };
  }

  let currentRoute = resolve();

  function handleChange() {
    currentRoute = resolve();
    for (const listener of listeners) listener(currentRoute);
  }

  return {
    /** Begin listening to URL changes and emit the initial route. */
    start() {
      window.addEventListener('hashchange', handleChange);
      if (!window.location.hash) window.location.hash = '#/'; // always show a route
      handleChange();
    },
    stop() {
      window.removeEventListener('hashchange', handleChange);
    },
    /** The current resolved route. */
    current() {
      return currentRoute;
    },
    /** Programmatically change the route (updates the URL, notifies subscribers). */
    navigate(path) {
      const target = '#' + (path.startsWith('/') ? path : '/' + path);
      if (window.location.hash === target) handleChange();
      else window.location.hash = target; // triggers 'hashchange' -> handleChange
    },
    /** Subscribe to route changes. Returns an unsubscribe function. */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
