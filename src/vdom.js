/**
 * vdom.js — Virtual DOM node factory.
 *
 * A "virtual node" (vnode) is a plain, serializable JavaScript object that
 * describes a piece of the UI. Because it is just data, it is cheap to create,
 * easy to compare, and never touches the real DOM until `dom.js` renders it.
 *
 * The shape produced by `h()` is intentionally simple and stable:
 *
 *   {
 *     tag:      'div',                 // element tag name, or Fragment
 *     attrs:    { class: 'box', id },  // HTML attributes / properties
 *     events:   { click: fn },         // event handlers (see events.js)
 *     children: [ vnode | textVnode ], // nested nodes
 *     key:      undefined              // optional stable identity for lists
 *   }
 *
 * Text is represented as a special vnode with `tag: '#text'` so that the diff
 * algorithm can treat everything uniformly.
 */

export const TEXT = '#text';

/**
 * Fragment lets you return several sibling nodes without a wrapper element,
 * e.g. `h(Fragment, {}, a, b, c)`.
 */
export const Fragment = Symbol('Fragment');

/**
 * Create a text vnode from a string or number.
 * @param {string|number} value
 */
export function text(value) {
  return { tag: TEXT, attrs: {}, events: {}, children: [], key: undefined, value: String(value) };
}

/**
 * Normalize an arbitrary child into a vnode (or drop it if it is nullish/boolean).
 * This is what makes `h('p', {}, 'hi', count, condition && node)` just work.
 */
function normalizeChild(child) {
  if (child == null || child === false || child === true) return null;
  if (typeof child === 'string' || typeof child === 'number') return text(child);
  return child; // already a vnode
}

/**
 * Flatten and normalize a children list. Arrays are spread recursively and
 * Fragment vnodes are unwrapped so the DOM layer only ever sees real elements
 * and text — this keeps the diff algorithm simple.
 */
function normalizeChildren(children) {
  const out = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      out.push(...normalizeChildren(child));
      continue;
    }
    const node = normalizeChild(child);
    if (!node) continue;
    if (node.tag === Fragment) {
      out.push(...node.children); // children were already normalized by h()
    } else {
      out.push(node);
    }
  }
  return out;
}

/**
 * `h` (hyperscript) — the single function used to describe any element.
 *
 * @param {string|symbol} tag   Tag name ('div', 'input', ...) or Fragment.
 * @param {object|null}   props Attributes and event handlers mixed together.
 *                              Keys named `on<Event>` (onClick, onInput) OR the
 *                              reserved `on: { click }` object become events;
 *                              everything else is treated as an attribute.
 *                              A special `key` prop sets the vnode key.
 * @param {...any}        children Nested vnodes, strings, numbers, arrays.
 * @returns {object} vnode
 *
 * @example
 *   h('button', { class: 'btn', onClick: save }, 'Save')
 *   h('ul', {}, items.map(i => h('li', { key: i.id }, i.text)))
 */
export function h(tag, props, ...children) {
  const attrs = {};
  const events = {};
  let key;

  const source = props || {};
  for (const name in source) {
    const value = source[name];
    if (name === 'key') {
      key = value;
    } else if (name === 'on' && value && typeof value === 'object') {
      // `on: { click: fn, keydown: fn }`
      for (const evt in value) events[evt.toLowerCase()] = value[evt];
    } else if (/^on[A-Z]/.test(name)) {
      // `onClick`, `onInput`, `onKeydown` -> 'click', 'input', 'keydown'
      events[name.slice(2).toLowerCase()] = value;
    } else {
      attrs[name] = value;
    }
  }

  return {
    tag,
    attrs,
    events,
    children: normalizeChildren(children),
    key,
  };
}
