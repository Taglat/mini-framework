/**
 * state.js — centralized, reactive state management.
 *
 * A Store is a single source of truth for one application. Any part of the app
 * can read it, update it, and subscribe to changes — which is exactly what the
 * task means by "the state must be reachable at every time" and "multiple pages
 * may need to interact with the same state".
 *
 * The store is deliberately tiny and framework-agnostic. `createApp` subscribes
 * to it and re-renders the view whenever the state changes, so you never touch
 * the DOM directly: you change data, the UI follows.
 */

/**
 * @template S
 * @param {S} initialState
 * @returns {{
 *   getState(): S,
 *   setState(patch: Partial<S> | ((state: S) => Partial<S>)): S,
 *   subscribe(listener: (state: S) => void): () => void
 * }}
 */
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  function getState() {
    return state;
  }

  /**
   * Update the state. Accepts either a partial object to merge, or a function
   * that receives the current state and returns the partial to merge. A new
   * top-level state object is always produced (immutable update), which makes
   * change detection and time-travel debugging straightforward.
   */
  function setState(patch) {
    const partial = typeof patch === 'function' ? patch(state) : patch;
    state = { ...state, ...partial };
    for (const listener of listeners) listener(state);
    return state;
  }

  /**
   * Register a listener. Returns an unsubscribe function.
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}
