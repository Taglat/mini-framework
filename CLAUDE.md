# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## What this is

**MiniDOM** — a from-scratch, dependency-free JavaScript UI framework, plus a TodoMVC demo built
with it. This is a learning/portfolio project graded against `audit.md`. Hard constraint from
`task.md`: **no high-level framework/library** (React, Vue, Angular, jQuery, …) may be used to build
the framework. Vanilla JS only. Vendored CSS is fine (see below).

## Architecture (read before editing)

The framework lives in `src/`. Data flows one direction: **state → view → vnode → diff → DOM**.

| File | Responsibility | Key exports |
| --- | --- | --- |
| `src/vdom.js` | Build virtual nodes; normalize/flatten children; unwrap `Fragment`. | `h`, `Fragment`, `text` |
| `src/dom.js` | Turn vnodes into real DOM (`createNode`) and reconcile trees (`patch`), including **keyed** children. | `createNode`, `patch` |
| `src/events.js` | Event **delegation**: one capture-phase listener per event type on the app root; handlers stored on nodes under `__miniEvents`. | `createEventSystem`, `setNodeHandlers` |
| `src/state.js` | Reactive single-source-of-truth store. | `createStore` |
| `src/router.js` | Hash-based routing with a subscriber list. | `createRouter` |
| `src/app.js` | `createApp` — subscribes to store+router, re-renders via `patch`, batches on `requestAnimationFrame`. Inverts control. | `createApp` |
| `src/index.js` | Public API barrel — the only import surface consumers should use. | (re-exports) |

The demo is in `examples/todomvc/` and imports **only** from `../../src/index.js`. It must stay a
pure consumer of the public API — if the demo needs something the API can't express, extend the
framework, don't reach around it.

## Invariants — don't break these

- **Zero runtime dependencies** in `src/`. No npm packages, no CDN scripts.
- `view(state)` must return **one** root vnode. Top-level `Fragment` is not rendered (fragments are
  only flattened when nested inside another element's children — see `vdom.js`).
- Events are declared as `on<Event>` props or an `on: { … }` object and dispatched by delegation.
  Do **not** add `element.addEventListener` per node in the render path — that defeats the design and
  the task requirement.
- `setState` is immutable-style (`{ ...state, ...patch }`). Keep reducers/actions pure; mutate
  through `setState`, never poke the DOM directly from app code.
- Keyed diff: only move a node when it isn't already correctly positioned. The check must account for
  freshly created nodes whose `parentNode` is still `null` (a past bug: a `null` reference node made
  the code skip inserting new nodes — see `patchChildren` in `dom.js`).

## TodoMVC specifics (graded by `audit.md`)

- Class/id names must match the reference exactly: `todoapp`, `header`, `new-todo`, `main`,
  `toggle-all`, `todo-list`, `view`, `toggle`, `destroy`, `edit`, `footer`, `todo-count`, `filters`,
  `selected`, `clear-completed`, plus `completed`/`editing` on `<li>`.
- `.main` and `.footer` are hidden when there are no todos. `.clear-completed` shows only when at
  least one todo is completed.
- Filters use hash routes `#/`, `#/active`, `#/completed`; the URL must change when switching.
- Counter text: `<strong>N</strong> item` (singular) vs `items` (plural) ` left`.
- Double-click a label → edit; Enter/blur commits, Escape cancels, empty commit deletes.
- CSS is the official `todomvc-app-css` / `todomvc-common`, vendored under `examples/todomvc/css/`.

## Running & verifying

No build. Serve the root over HTTP and open the demo:

```bash
python -m http.server 8000    # or: npx serve
# http://localhost:8000/examples/todomvc/index.html
```

End-to-end behavior was verified by driving the page with Playwright (add/toggle/edit/delete,
filters + URL, counter, clear-completed, persistence, no console errors). When changing framework
internals, re-drive the TodoMVC flow — unit-checking vnodes alone won't catch DOM-patch regressions.
The keyed-diff bug above, for instance, only surfaced on the *second* add.

## Conventions

- ES modules, `import`/`export`, no transpilation. Target modern browsers.
- Keep modules small and single-purpose; prefer recursion for tree work (matches the UI shape).
- Comment the *why*, not the *what*; every `src/` file opens with a short rationale block — keep that
  style when adding files.
- `task.md` and `audit.md` are the spec and the grading checklist. They are intentionally
  git-ignored (kept local only).
