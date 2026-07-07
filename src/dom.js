/**
 * dom.js — the bridge between virtual nodes and the real DOM.
 *
 * Two responsibilities:
 *   1. `createNode`  — build a real DOM node from a vnode (first render).
 *   2. `patch`       — diff a new vnode against the previously rendered one and
 *                      mutate the real DOM *only where they differ*.
 *
 * The rendered real node is cached on the vnode as `vnode.el`, so the next diff
 * knows which DOM node each old vnode owns.
 *
 * The children diff is *keyed*: when list items carry a `key`, MiniDOM matches
 * old and new children by key and moves existing DOM nodes instead of
 * destroying and rebuilding them. That keeps focus, scroll and input state
 * intact and is what makes editing a todo in place feel seamless.
 */

import { TEXT } from './vdom.js';
import { setNodeHandlers } from './events.js';

/* -------------------------------------------------------------------------- */
/* Attributes                                                                 */
/* -------------------------------------------------------------------------- */

const isBooleanAttr = (name) =>
  name === 'checked' || name === 'selected' || name === 'disabled' || name === 'readonly' || name === 'autofocus';

function setAttribute(el, name, value) {
  if (name === 'value') {
    // Keep the live input value in sync via the property, not the attribute.
    if (el.value !== value) el.value = value == null ? '' : value;
    return;
  }
  if (name === 'checked') {
    el.checked = !!value;
    return;
  }
  if (name === 'style' && value && typeof value === 'object') {
    el.style.cssText = '';
    for (const prop in value) el.style[prop] = value[prop];
    return;
  }
  if (isBooleanAttr(name)) {
    if (value) el.setAttribute(name, '');
    else el.removeAttribute(name);
    return;
  }
  if (value == null || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? '' : value);
}

function patchAttributes(el, oldAttrs, newAttrs) {
  for (const name in oldAttrs) {
    if (!(name in newAttrs)) setAttribute(el, name, null);
  }
  for (const name in newAttrs) {
    if (oldAttrs[name] !== newAttrs[name]) setAttribute(el, name, newAttrs[name]);
  }
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Build a real DOM node for a vnode, registering its event types with the
 * delegated event system, and recursively creating children.
 * @param {object} vnode
 * @param {{ ensure(type: string): void }} events  event system for this app
 * @returns {Node}
 */
export function createNode(vnode, events) {
  if (vnode.tag === TEXT) {
    const node = document.createTextNode(vnode.value);
    vnode.el = node;
    return node;
  }

  const el = document.createElement(vnode.tag);
  vnode.el = el;

  for (const name in vnode.attrs) setAttribute(el, name, vnode.attrs[name]);

  setNodeHandlers(el, vnode.events);
  for (const type in vnode.events) events.ensure(type);

  for (const child of vnode.children) el.appendChild(createNode(child, events));

  return el;
}

/* -------------------------------------------------------------------------- */
/* Patch                                                                      */
/* -------------------------------------------------------------------------- */

const sameType = (a, b) => a.tag === b.tag;

/**
 * Diff `newVnode` against the already-mounted `oldVnode` and apply the minimal
 * set of DOM mutations. Returns the real node now representing `newVnode`.
 * @param {object} oldVnode  previously rendered vnode (has `.el`)
 * @param {object} newVnode  freshly produced vnode
 * @param {object} events    event system for this app
 * @returns {Node}
 */
export function patch(oldVnode, newVnode, events) {
  const el = (newVnode.el = oldVnode.el);

  // Different node types: replace outright.
  if (!sameType(oldVnode, newVnode)) {
    const parent = el.parentNode;
    const fresh = createNode(newVnode, events);
    parent.replaceChild(fresh, el);
    return fresh;
  }

  // Text node: update character data only if it changed.
  if (newVnode.tag === TEXT) {
    if (oldVnode.value !== newVnode.value) el.nodeValue = newVnode.value;
    return el;
  }

  // Same element type: reconcile attributes, handlers, then children.
  patchAttributes(el, oldVnode.attrs, newVnode.attrs);

  setNodeHandlers(el, newVnode.events);
  for (const type in newVnode.events) events.ensure(type);

  patchChildren(el, oldVnode.children, newVnode.children, events);
  return el;
}

/**
 * Keyed children reconciliation.
 *
 * Strategy: index old children that have keys, then walk the new children. If a
 * new child's key matches an existing node, reuse and reposition it; otherwise
 * create it. Finally remove any old nodes that were not reused. Unkeyed
 * children fall back to positional diffing, which is optimal for static lists.
 */
function patchChildren(parentEl, oldChildren, newChildren, events) {
  const anyKeyed = newChildren.some((c) => c.key != null) || oldChildren.some((c) => c.key != null);

  if (!anyKeyed) {
    const common = Math.min(oldChildren.length, newChildren.length);
    for (let i = 0; i < common; i++) patch(oldChildren[i], newChildren[i], events);
    // Append the extra new children.
    for (let i = common; i < newChildren.length; i++) {
      parentEl.appendChild(createNode(newChildren[i], events));
    }
    // Remove the leftover old children.
    for (let i = oldChildren.length - 1; i >= common; i--) {
      parentEl.removeChild(oldChildren[i].el);
    }
    return;
  }

  // Keyed path.
  const oldByKey = new Map();
  oldChildren.forEach((child, i) => {
    const k = child.key != null ? child.key : `__idx_${i}`;
    oldByKey.set(k, child);
  });

  const used = new Set();
  let referenceNode = null; // node we insert *before*, walked right-to-left

  for (let i = newChildren.length - 1; i >= 0; i--) {
    const newChild = newChildren[i];
    const k = newChild.key != null ? newChild.key : `__idx_${i}`;
    const oldChild = oldByKey.get(k);

    let node;
    if (oldChild && sameType(oldChild, newChild)) {
      node = patch(oldChild, newChild, events);
      used.add(k);
    } else {
      node = createNode(newChild, events);
    }

    // Position the node so children end up in new-array order.
    if (node.nextSibling !== referenceNode) {
      parentEl.insertBefore(node, referenceNode);
    }
    referenceNode = node;
  }

  // Remove old nodes that no new child claimed.
  oldByKey.forEach((child, k) => {
    if (!used.has(k) && child.el && child.el.parentNode === parentEl) {
      parentEl.removeChild(child.el);
    }
  });
}
