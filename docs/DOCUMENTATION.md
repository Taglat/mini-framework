# MiniDOM — Documentation

MiniDOM is a tiny (~400 lines), dependency-free JavaScript framework. You describe your UI as a
function of state; MiniDOM keeps the real DOM in sync for you. No build step, no npm install — just
native ES modules.

> **Why a framework and not a library?** With a library *you* call the code. With a framework the
> control is inverted: **the framework calls you.** You hand MiniDOM a `view(state)` function and a
> store, and from then on MiniDOM decides *when* to call your view, diffs the result, and patches
> the DOM. You never imperatively touch the page.

---

## Table of contents

1. [Feature overview](#feature-overview)
2. [Quick start](#quick-start)
3. [Creating elements with `h`](#creating-elements-with-h)
   - [Add attributes](#add-attributes-to-an-element)
   - [Nest elements](#nest-elements)
   - [Create an event](#create-an-event)
4. [State management](#state-management)
5. [Routing](#routing)
6. [Putting it together: `createApp`](#putting-it-together-createapp)
7. [Full example — a counter](#full-example--a-counter)
8. [How it works & why](#how-it-works--why)
9. [API reference](#api-reference)

---

## Feature overview

| Pillar | What you get | Module |
| --- | --- | --- |
| **DOM abstraction** | Describe UI as plain objects with `h(tag, attrs, ...children)`; a Virtual DOM diff applies the *minimal* real-DOM changes. | `src/vdom.js`, `src/dom.js` |
| **State management** | One reactive `createStore` — a single source of truth, readable everywhere, that notifies subscribers on change. | `src/state.js` |
| **Routing** | Hash-based `createRouter` that keeps the URL and your state in sync (`#/`, `#/active`, …). | `src/router.js` |
| **Event handling** | Declarative events (`onClick`, `on: {…}`) resolved through **event delegation** — *not* per-node `addEventListener`. | `src/events.js` |
| **The glue** | `createApp` wires store + router + view together and re-renders efficiently (batched via `requestAnimationFrame`). | `src/app.js` |

Everything is exported from a single entry point, `src/index.js`:

```js
import { h, Fragment, createApp, createStore, createRouter } from '../../src/index.js';
```

---

## Quick start

```
your-project/
├── src/            ← copy MiniDOM's src/ here (or point imports at it)
└── index.html
```

```html
<!-- index.html -->
<div id="root"></div>
<script type="module" src="./main.js"></script>
```

```js
// main.js
import { h, createApp, createStore } from './src/index.js';

const store = createStore({ message: 'Hello, MiniDOM!' });

createApp({
  root: document.getElementById('root'),
  store,
  view: (state) => h('h1', {}, state.message),
});
```

Serve the folder over HTTP (ES modules don't load from `file://`):

```bash
npx serve         # or:  python -m http.server
```

Open the printed URL. That's the whole setup — no bundler, no config.

---

## Creating elements with `h`

`h` (short for *hyperscript*) is the single function you use to describe **any** element. It returns
a plain "virtual node" object — it does **not** touch the DOM. The renderer turns it into real nodes
later.

```js
h(tag, props, ...children)
```

- **`tag`** — a tag name string (`'div'`, `'input'`, `'button'`) or `Fragment`.
- **`props`** — an object of attributes *and* event handlers (or `null` / `{}` for none).
- **`children`** — any number of child vnodes, strings, numbers, or arrays of them.

```js
// <p>Hello</p>
h('p', {}, 'Hello');

// <br>
h('br');
```

Strings and numbers become text automatically, so you rarely think about text nodes.

### Add attributes to an element

Any prop that isn't an event handler (see below) becomes an attribute:

```js
// <a href="/docs" class="link" id="docs-link" target="_blank">Docs</a>
h('a', { href: '/docs', class: 'link', id: 'docs-link', target: '_blank' }, 'Docs');
```

Special cases the framework understands:

```js
// Boolean attributes: pass a boolean, MiniDOM adds/removes the attribute for you.
h('input', { type: 'checkbox', checked: true, disabled: false });

// `value` is set as a live property so inputs update correctly.
h('input', { value: 'typed text' });

// `style` accepts a string OR an object.
h('div', { style: { color: 'white', backgroundColor: 'rebeccapurple' } });
h('div', { style: 'color: white; background: rebeccapurple' });
```

### Nest elements

Children are just more `h` calls (or strings/arrays). Nesting is recursion:

```js
// <div class="card">
//   <h2>Title</h2>
//   <p>Body text with a <a href="#">link</a>.</p>
// </div>
h('div', { class: 'card' },
  h('h2', {}, 'Title'),
  h('p', {}, 'Body text with a ', h('a', { href: '#' }, 'link'), '.')
);
```

Render a **list** by mapping data to vnodes. Give repeated items a `key` so the diff can match them
across renders (this preserves focus, inputs, and scroll position):

```js
h('ul', {},
  items.map((item) => h('li', { key: item.id }, item.text))
);
```

Need several siblings without a wrapper element? Use `Fragment`:

```js
import { h, Fragment } from './src/index.js';

h(Fragment, {},
  h('dt', {}, 'Term'),
  h('dd', {}, 'Definition')
);
```

### Create an event

Attach a handler by adding a prop named `on<EventName>` (camelCase). MiniDOM strips the `on`,
lowercases the rest, and wires it up through its delegation system:

```js
// click
h('button', { onClick: () => alert('clicked!') }, 'Click me');

// input / change — the DOM Event is passed to your handler
h('input', { onInput: (e) => console.log(e.target.value) });

// keyboard
h('input', {
  onKeydown: (e) => { if (e.key === 'Enter') submit(e.target.value); },
});
```

`onClick`, `onInput`, `onKeydown`, `onChange`, `onDblclick`, `onBlur`, `onSubmit`, … all work — the
name after `on` is just the DOM event type. You can also pass several at once with the `on` object:

```js
h('input', {
  on: {
    focus: () => console.log('focused'),
    blur:  () => console.log('blurred'),
  },
});
```

Inside a handler you get the native `Event`, so `e.target`, `e.preventDefault()`,
`e.stopPropagation()`, and `e.key` all behave exactly as you'd expect.

---

## State management

`createStore(initialState)` gives you one reactive object that is **reachable from anywhere** — pass
it around, import it, close over it. It has three methods:

```js
import { createStore } from './src/index.js';

const store = createStore({ count: 0, user: null });

store.getState();                       // read  -> { count: 0, user: null }

store.setState({ count: 1 });           // merge a partial object
store.setState((s) => ({ count: s.count + 1 })); // or a function of current state

const unsubscribe = store.subscribe((state) => {
  console.log('state changed:', state);
});
unsubscribe(); // stop listening
```

`setState` always produces a **new** top-level state object (`{ ...state, ...patch }`) and then
notifies every subscriber. Because `createApp` subscribes for you, changing state is all you ever do
to update the screen — you describe *what* the UI should be, never *how* to mutate it.

Multiple views/pages sharing one store just import the same store instance; they all read and write
the same state and all re-render when it changes.

---

## Routing

`createRouter` keeps the URL hash and your app in agreement. It's hash-based (`#/active`) so it works
from any static folder with no server configuration.

```js
import { createRouter } from './src/index.js';

const router = createRouter({
  routes: {
    '/':          'all',
    '/active':    'active',
    '/completed': 'completed',
  },
});

router.current();         // -> { path: '/active', value: 'active' }
router.navigate('/active'); // change the URL programmatically
router.subscribe((route) => {
  // fold the route into state so the view stays a pure function of state
  store.setState({ filter: route.value });
});
```

Unknown paths fall back to `'/'`. When you pass the router to `createApp`, it's started for you and a
re-render happens on every route change. Clicking a normal `<a href="#/active">` link updates the URL
and therefore the state — no click handler required.

---

## Putting it together: `createApp`

```js
createApp({
  root,        // the DOM element to render into
  store,       // from createStore
  view,        // (state) => vnode   — must return a SINGLE root vnode
  router,      // optional — from createRouter; started automatically
});
```

`createApp`:

1. Renders `view(store.getState())` into `root` immediately.
2. Subscribes to the store (and router). On any change it re-runs `view`, **diffs** the new vnode
   tree against the previous one, and patches only the differences.
3. Batches renders with `requestAnimationFrame`, so a burst of `setState` calls in one tick becomes a
   single repaint.

It returns `{ render, destroy }` — call `destroy()` to remove all subscriptions and delegated
listeners.

---

## Full example — a counter

A complete, runnable app that exercises state, events, and rendering:

```html
<!-- index.html -->
<div id="root"></div>
<script type="module" src="./counter.js"></script>
```

```js
// counter.js
import { h, createApp, createStore } from './src/index.js';

const store = createStore({ count: 0 });

const dec = () => store.setState((s) => ({ count: s.count - 1 }));
const inc = () => store.setState((s) => ({ count: s.count + 1 }));

function view(state) {
  return h('div', { class: 'counter' },
    h('h1', {}, `Count: ${state.count}`),
    h('button', { onClick: dec }, '−'),
    h('button', { onClick: inc }, '+'),
    state.count < 0
      ? h('p', { style: { color: 'crimson' } }, 'Below zero!')
      : null
  );
}

createApp({ root: document.getElementById('root'), store, view });
```

Click `+`: the handler calls `setState`, the store notifies `createApp`, `view` re-runs, the diff
sees only the `<h1>` text changed (and maybe the warning `<p>` appeared/disappeared), and patches
exactly that. Nothing else in the DOM is touched.

For a larger, real-world example see [`examples/todomvc/app.js`](../examples/todomvc/app.js).

---

## How it works & why

### Virtual DOM + diffing (the DOM abstraction)

`h` builds a tree of plain objects (vnodes). On each render, MiniDOM compares the **new** vnode tree
with the **previous** one node-by-node (`src/dom.js`, `patch`) and applies only the differences:

- Different tag → replace the node.
- Same text, changed value → update character data only.
- Same element → reconcile changed attributes/handlers, then recurse into children.
- Lists with `key`s → match children by key and **move** existing DOM nodes instead of rebuilding
  them, preserving focus and input state.

**Why?** Touching the real DOM is the expensive part. Rebuilding the whole page on every keystroke
would be slow and would lose cursor/scroll state. Diffing lets you write simple "re-render
everything" code while paying only for what actually changed. The algorithm is recursive, which
keeps it small and mirrors the shape of the UI.

### Reactive store (state management)

State lives in one place and is the single source of truth. Views are a pure function of it, so the
UI can never drift out of sync with the data — there is no second copy of the truth living in the DOM
to forget to update. `setState` produces a new state object, which makes change detection trivial and
opens the door to debugging tools like logging or time-travel.

### Event delegation (event handling)

The task asks for an event mechanism **different from** `addEventListener` on each node. MiniDOM
stores each vnode's handlers on its real node under one property (`__miniEvents`) and installs
**exactly one** listener per event *type* on the app root — no matter how many nodes want that event.
When an event fires, MiniDOM walks from the real target up to the root, invoking handlers along the
way (re-creating natural bubbling), and honoring `stopPropagation`.

**Why?** With thousands of list items, attaching a listener to every button is wasteful in memory and
slow to (un)mount. One delegated listener handles them all, and newly rendered nodes are "live"
immediately with nothing to attach or clean up. Root listeners use the capture phase, which lets a
single listener even catch non-bubbling events like `blur`/`focus`.

### Hash router (routing)

The router listens to `hashchange` and resolves the current hash to a route. Subscribers (including
`createApp`) react to changes. Because it uses the hash, the app needs no server rewrite rules and
runs from any folder. Folding the route into the store (`store.setState({ filter })`) keeps the view
a pure function of a single state — routing becomes just another input to your UI.

### Inverted control (why this is a *framework*)

You never call `render()` yourself in normal use. You change *data*; the framework decides when to
call your `view`, how to diff it, and when to paint (batched on the next animation frame). That
inversion — you provide the pieces, the framework runs the loop — is what separates a framework from
a library.

---

## API reference

### `h(tag, props?, ...children)` → `vnode`
Create a virtual node. `props` mixes attributes and `on*` event handlers; `key` and `on` are
reserved. Children may be vnodes, strings, numbers, arrays, or falsy (ignored).

### `Fragment`
A sentinel tag for grouping siblings without a wrapper: `h(Fragment, {}, a, b)`.

### `createStore(initialState)` → `{ getState, setState, subscribe }`
- `getState()` → current state.
- `setState(partial | (state) => partial)` → merges, notifies subscribers, returns new state.
- `subscribe(listener)` → returns an `unsubscribe()` function.

### `createRouter({ routes })` → `{ start, stop, current, navigate, subscribe }`
- `routes` — map of `path → value`; unknown paths fall back to `'/'`.
- `current()` → `{ path, value }`.
- `navigate(path)` → set the URL hash (and notify subscribers).
- `subscribe(listener)` → returns `unsubscribe()`.
- `start()` / `stop()` → begin/stop listening (`createApp` calls `start` for you).

### `createApp({ root, store, view, router? })` → `{ render, destroy }`
Mounts `view(state)` into `root` and re-renders on store/router changes.
- `render()` → force a synchronous render.
- `destroy()` → remove all subscriptions and delegated listeners.

### Low-level (advanced)
`createNode(vnode, events)`, `patch(oldVnode, newVnode, events)`, `createEventSystem(root)`,
`text(value)` are exported for testing and custom setups.
