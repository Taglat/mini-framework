/**
 * app.js — the piece that inverts control.
 *
 * This is what makes MiniDOM a *framework* rather than a library: you hand it a
 * pure `view(state)` function and a store, and from then on the framework calls
 * you. Whenever the state (or route) changes, MiniDOM re-runs your view, diffs
 * the result, and patches the DOM. You never imperatively poke the page.
 *
 * Renders are batched with `requestAnimationFrame`, so a burst of state updates
 * in the same tick collapses into a single, efficient repaint.
 */

import { createNode, patch } from './dom.js';
import { createEventSystem } from './events.js';

/**
 * @param {object} config
 * @param {Element} config.root   the container element to render into.
 * @param {object}  config.store  a store from `createStore`.
 * @param {(state: any) => object} config.view  maps state -> a single vnode.
 * @param {object}  [config.router]  optional router from `createRouter`; it is
 *        started automatically and a re-render is scheduled on route changes.
 * @returns {{ render(): void, destroy(): void }}
 */
export function createApp({ root, store, view, router }) {
  const events = createEventSystem(root);
  let oldVnode = null;
  let scheduled = false;

  function renderNow() {
    scheduled = false;
    const newVnode = view(store.getState());
    if (oldVnode == null) {
      root.innerHTML = '';
      root.appendChild(createNode(newVnode, events));
    } else {
      patch(oldVnode, newVnode, events);
    }
    oldVnode = newVnode;
  }

  /** Ask for a render on the next animation frame (coalesces bursts). */
  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(renderNow);
  }

  // Re-render whenever the state changes.
  const unsubscribe = store.subscribe(scheduleRender);

  // If a router was supplied, re-render on route changes too. The view reads
  // the active route from `router.current()`.
  let unsubscribeRouter = null;
  if (router) {
    unsubscribeRouter = router.subscribe(scheduleRender);
    router.start();
  }

  // First paint (synchronous so the UI is present immediately).
  renderNow();

  return {
    /** Force an immediate synchronous render. */
    render: renderNow,
    /** Tear down subscriptions and delegated listeners. */
    destroy() {
      unsubscribe();
      if (unsubscribeRouter) unsubscribeRouter();
      events.destroy();
      if (router) router.stop();
    },
  };
}
