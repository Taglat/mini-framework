/**
 * TodoMVC — built entirely with MiniDOM's public API.
 *
 * This file is also a worked example of the framework: notice there is not a
 * single `document.createElement`, `addEventListener`, or manual DOM update
 * below. We only ever describe the UI with `h(...)` as a function of state and
 * let MiniDOM reconcile the DOM for us.
 */

import { h, createApp, createStore, createRouter } from '../../src/index.js';

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'minidom-todomvc';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

const store = createStore({
  todos: load(), // [{ id, title, completed }]
  filter: 'all', // 'all' | 'active' | 'completed' — kept in sync with the URL
  editingId: null, // id of the todo currently being edited, or null
});

// Persist to localStorage on every change (keeps storage in sync with state).
store.subscribe((state) => save(state.todos));

let nextId = Date.now();

/* -------------------------------------------------------------------------- */
/* Actions — every user action is expressed as a pure state update            */
/* -------------------------------------------------------------------------- */

const actions = {
  add(title) {
    title = title.trim();
    if (!title) return;
    store.setState((s) => ({
      todos: [...s.todos, { id: nextId++, title, completed: false }],
    }));
  },
  toggle(id) {
    store.setState((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  },
  toggleAll(completed) {
    store.setState((s) => ({ todos: s.todos.map((t) => ({ ...t, completed })) }));
  },
  destroy(id) {
    store.setState((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
  },
  clearCompleted() {
    store.setState((s) => ({ todos: s.todos.filter((t) => !t.completed) }));
  },
  startEditing(id) {
    store.setState({ editingId: id });
    // The edit <input> only exists after the next render; focus it then.
    requestAnimationFrame(() => {
      const input = document.querySelector('.todo-list li.editing .edit');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  },
  commitEdit(id, title) {
    title = title.trim();
    if (!title) return actions.destroy(id);
    store.setState((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, title } : t)),
      editingId: null,
    }));
  },
  cancelEdit() {
    store.setState({ editingId: null });
  },
};

/* -------------------------------------------------------------------------- */
/* Routing — Active/Completed/All filters live in the URL hash                */
/* -------------------------------------------------------------------------- */

const router = createRouter({
  routes: {
    '/': 'all',
    '/active': 'active',
    '/completed': 'completed',
  },
});

// Fold the current route into the state so the view stays a pure function of state.
router.subscribe((route) => store.setState({ filter: route.value }));

/* -------------------------------------------------------------------------- */
/* View — state -> vnode                                                      */
/* -------------------------------------------------------------------------- */

const FILTERS = {
  all: () => true,
  active: (t) => !t.completed,
  completed: (t) => t.completed,
};

function TodoItem(todo, editing) {
  const classes = [todo.completed ? 'completed' : '', editing ? 'editing' : '']
    .filter(Boolean)
    .join(' ');

  return h(
    'li',
    { key: todo.id, class: classes },
    h(
      'div',
      { class: 'view' },
      h('input', {
        class: 'toggle',
        type: 'checkbox',
        checked: todo.completed,
        onChange: () => actions.toggle(todo.id),
      }),
      h('label', { onDblclick: () => actions.startEditing(todo.id) }, todo.title),
      h('button', { class: 'destroy', onClick: () => actions.destroy(todo.id) })
    ),
    // The edit field is only rendered while this row is being edited.
    editing
      ? h('input', {
          class: 'edit',
          value: todo.title,
          onKeydown: (e) => {
            if (e.key === 'Enter') actions.commitEdit(todo.id, e.target.value);
            else if (e.key === 'Escape') actions.cancelEdit();
          },
          onBlur: (e) => {
            // Blur commits, unless the edit was cancelled (row no longer editing).
            if (store.getState().editingId === todo.id) actions.commitEdit(todo.id, e.target.value);
          },
        })
      : null
  );
}

function view(state) {
  const { todos, filter, editingId } = state;
  const visible = todos.filter(FILTERS[filter]);
  const remaining = todos.filter((t) => !t.completed).length;
  const completed = todos.length - remaining;

  return h(
    'section',
    { class: 'todoapp' },

    // ----- Header ----------------------------------------------------------
    h(
      'header',
      { class: 'header' },
      h('h1', {}, 'todos'),
      h('input', {
        class: 'new-todo',
        placeholder: 'What needs to be done?',
        autofocus: true,
        onKeydown: (e) => {
          if (e.key === 'Enter') {
            actions.add(e.target.value);
            e.target.value = '';
          }
        },
      })
    ),

    // ----- Main (list) — hidden when there are no todos --------------------
    todos.length > 0
      ? h(
          'section',
          { class: 'main' },
          h('input', {
            id: 'toggle-all',
            class: 'toggle-all',
            type: 'checkbox',
            checked: remaining === 0,
            onChange: (e) => actions.toggleAll(e.target.checked),
          }),
          h('label', { for: 'toggle-all' }, 'Mark all as complete'),
          h(
            'ul',
            { class: 'todo-list' },
            visible.map((todo) => TodoItem(todo, todo.id === editingId))
          )
        )
      : null,

    // ----- Footer — hidden when there are no todos -------------------------
    todos.length > 0
      ? h(
          'footer',
          { class: 'footer' },
          h(
            'span',
            { class: 'todo-count' },
            h('strong', {}, String(remaining)),
            ` ${remaining === 1 ? 'item' : 'items'} left`
          ),
          h(
            'ul',
            { class: 'filters' },
            h('li', {}, h('a', { class: filter === 'all' ? 'selected' : '', href: '#/' }, 'All')),
            h('li', {}, h('a', { class: filter === 'active' ? 'selected' : '', href: '#/active' }, 'Active')),
            h('li', {}, h('a', { class: filter === 'completed' ? 'selected' : '', href: '#/completed' }, 'Completed'))
          ),
          completed > 0
            ? h('button', { class: 'clear-completed', onClick: () => actions.clearCompleted() }, 'Clear completed')
            : null
        )
      : null
  );
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

createApp({
  root: document.getElementById('root'),
  store,
  view,
  router,
});
