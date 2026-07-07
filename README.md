# MiniDOM

A tiny, dependency-free JavaScript UI framework — built from scratch (no React/Vue/Angular).
You describe your interface as a function of state; MiniDOM keeps the real DOM in sync.

- **DOM abstraction** — a Virtual DOM with keyed diffing (`h(tag, attrs, ...children)`)
- **State management** — one reactive, globally reachable store
- **Routing** — hash-based router kept in sync with your state
- **Event handling** — declarative events via **delegation** (not per-node `addEventListener`)
- **No build step** — native ES modules, zero npm dependencies

> A framework, not a library: you hand it a `view(state)` and a store, and it calls *you* —
> deciding when to re-render, diffing the result, and patching only what changed.

---

## Run the TodoMVC demo

ES modules must be served over HTTP (not opened as `file://`). From the project root:

```bash
# pick either one — no dependencies to install
python -m http.server 8000
#   …or…
npx serve
```

Then open **http://localhost:8000/examples/todomvc/index.html**
(adjust the port if you used `npx serve`).

The demo is a full [TodoMVC](https://todomvc.com/): add, toggle, edit (double-click), and delete
todos; filter **All / Active / Completed** (the URL changes with the filter); a live "items left"
counter; and **Clear completed**. State is persisted to `localStorage`.

## Hello, MiniDOM

```js
import { h, createApp, createStore } from './src/index.js';

const store = createStore({ count: 0 });

createApp({
  root: document.getElementById('root'),
  store,
  view: (state) =>
    h('button', { onClick: () => store.setState((s) => ({ count: s.count + 1 })) },
      `Clicked ${state.count} times`),
});
```

Full guide, API reference, and the "why": **[docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)**.

---

## Project structure

```
mini-framework/
├── src/                    # the framework (public API via index.js)
│   ├── index.js            #   barrel — import everything from here
│   ├── vdom.js             #   h() / Fragment — build virtual nodes
│   ├── dom.js              #   create + keyed diff/patch renderer
│   ├── events.js           #   delegated event system
│   ├── state.js            #   reactive store
│   ├── router.js           #   hash router
│   └── app.js              #   createApp — the control-inverting glue
├── examples/todomvc/       # TodoMVC built with MiniDOM
│   ├── index.html
│   ├── app.js
│   └── css/                #   official todomvc-app-css (vendored, MIT)
├── docs/DOCUMENTATION.md    # full framework documentation
├── CLAUDE.md               # notes for AI-assisted development
├── README.md
└── LICENSE
```

## Extending MiniDOM

The pieces are decoupled on purpose:

- **New element behavior?** It's just data from `h` — add handling in `src/dom.js` (`setAttribute`).
- **New app?** Copy `src/` and write a `view(state)` — see the counter in the docs.
- **Custom state logic?** The store is framework-agnostic; wrap `createStore` with your own actions
  (as `examples/todomvc/app.js` does with its `actions` object).
- **Different routing?** `createRouter` exposes `subscribe`/`navigate`; swap it or extend it without
  touching the renderer.

## License

MIT — see [LICENSE](LICENSE). Vendored TodoMVC CSS is MIT © Addy Osmani / Sindre Sorhus et al.
