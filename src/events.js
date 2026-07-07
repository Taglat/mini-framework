/**
 * events.js — Custom event handling by delegation.
 *
 * The task requires an event mechanism that is *different from* attaching
 * `addEventListener` to every element. MiniDOM uses **event delegation**:
 *
 *   - Handlers declared on a vnode (via `onClick`, `on: { click }`, ...) are
 *     stored directly on the corresponding real DOM node under one property.
 *   - For each event *type* the app actually uses, exactly ONE listener is
 *     installed on the application root — no matter how many thousands of
 *     nodes want that event.
 *   - When an event fires, we walk the DOM path from the real target up to the
 *     root and invoke every stored handler along the way, re-creating natural
 *     bubbling order. This is faster to (un)mount and uses far less memory than
 *     per-node listeners.
 *
 * Root listeners are registered in the *capture* phase, which lets a single
 * root listener also catch non-bubbling events like `blur`/`focus`.
 */

const HANDLERS = '__miniEvents'; // property on real nodes holding { type: fn }

/**
 * Store the event handlers for a real DOM node. Called by dom.js during
 * mount/patch. Passing an empty object effectively clears them.
 * @param {Node} node
 * @param {Record<string, Function>} events
 */
export function setNodeHandlers(node, events) {
  node[HANDLERS] = events;
}

/**
 * A registry lives per application root so multiple independent MiniDOM apps
 * on one page do not interfere with each other.
 */
export function createEventSystem(root) {
  const installed = new Set(); // event types already delegated on this root

  function dispatch(event) {
    const type = event.type;
    let target = event.target;

    // Let handlers cooperatively stop propagation without touching the real
    // (capture-phase) event object's flow.
    let stopped = false;
    const originalStop = event.stopPropagation.bind(event);
    event.stopPropagation = () => {
      stopped = true;
      originalStop();
    };

    // Walk from the deepest target up to (and including) the root.
    while (target) {
      const handlers = target[HANDLERS];
      const handler = handlers && handlers[type];
      if (typeof handler === 'function') {
        handler(event);
        if (stopped) break;
      }
      if (target === root) break;
      target = target.parentNode;
    }
  }

  /**
   * Ensure the root is listening for a given event type. Idempotent.
   * @param {string} type e.g. 'click', 'input', 'keydown', 'blur'
   */
  function ensure(type) {
    if (installed.has(type)) return;
    installed.add(type);
    // Capture phase => also catches non-bubbling events (blur/focus).
    root.addEventListener(type, dispatch, true);
  }

  /** Remove every delegated listener (used when unmounting an app). */
  function destroy() {
    for (const type of installed) root.removeEventListener(type, dispatch, true);
    installed.clear();
  }

  return { ensure, destroy };
}
