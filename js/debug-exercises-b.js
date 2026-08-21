/* PracticeRank — Live-Debugging exercises, part B.
   Same schema as js/debug-exercises-a.js (see the header there). All five
   exercises here are kind: "worker" — plain JavaScript run in the Web Worker
   grader. Each buggy suite is partially failing; fixing every seeded bug
   turns it green. */
(function () {
  "use strict";
  window.DEBUG_EXERCISES = window.DEBUG_EXERCISES || [];
  var EX = window.DEBUG_EXERCISES;

  /* ================================================================
     4. Event Scheduler — comparator, boundary, loop-var reuse, off-by-one
     ================================================================ */
  EX.push({
    slug: "event-scheduler",
    name: "Event Scheduler",
    kind: "worker",
    difficulty: "Medium",
    minutes: 40,
    summary: "Agendas print out of order, back-to-back meetings collide, conflicts go missing",
    brief:
      "<p>The team calendar widget is built on this scheduling module. Support tickets from this week:</p>" +
      "<ul>" +
      "<li>&ldquo;My 9:00 standup shows up <em>after</em> the 13:00 review in the day view.&rdquo;</li>" +
      "<li>&ldquo;Booking 10:00&ndash;11:00 right after a 9:00&ndash;10:00 meeting warns about a conflict. They don&rsquo;t overlap!&rdquo;</li>" +
      "<li>&ldquo;Two afternoon meetings that plainly collide are never flagged by the weekly conflict report.&rdquo;</li>" +
      "<li>&ldquo;The Sunday agenda heading says <code>undefined</code>.&rdquo;</li>" +
      "</ul>" +
      "<p>Times are <code>\"H:MM\"</code> / <code>\"HH:MM\"</code> strings, days are <b>0-based</b> (0&nbsp;=&nbsp;Sunday). Reproduce each ticket via the failing tests, trace with <code>console.log</code>, fix all the seeded bugs.</p>",
    files: [
      {
        name: "time.js",
        content:
"// \"H:MM\" or \"HH:MM\" 24h times -> minutes since midnight.\n" +
"function toMinutes(t) {\n" +
"  var parts = String(t).split(':');\n" +
"  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);\n" +
"}\n" +
"\n" +
"var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];\n" +
"\n" +
"// day is 0-based (0 = Sunday) everywhere in this module.\n" +
"function dayLabel(day) {\n" +
"  return DAY_NAMES[day - 1];\n" +
"}\n",
      },
      {
        name: "events.js",
        content:
"function createSchedule() {\n" +
"  return { events: [], nextId: 1 };\n" +
"}\n" +
"\n" +
"function addEvent(schedule, ev) {\n" +
"  var e = { id: schedule.nextId++, title: ev.title, day: ev.day, start: ev.start, end: ev.end };\n" +
"  schedule.events.push(e);\n" +
"  return e;\n" +
"}\n" +
"\n" +
"// Two events conflict when they share a day and their time ranges truly\n" +
"// intersect. Back-to-back events (one ends exactly when the next starts)\n" +
"// do NOT conflict.\n" +
"function overlaps(a, b) {\n" +
"  if (a.day !== b.day) return false;\n" +
"  return toMinutes(a.start) <= toMinutes(b.end) && toMinutes(b.start) <= toMinutes(a.end);\n" +
"}\n" +
"\n" +
"// Every conflicting pair in the whole schedule, as [smallerId, biggerId].\n" +
"function allConflicts(schedule) {\n" +
"  var found = [];\n" +
"  for (var i = 0; i < schedule.events.length; i++) {\n" +
"    var a = schedule.events[i];\n" +
"    for (var i = 0; i < schedule.events.length; i++) {\n" +
"      var b = schedule.events[i];\n" +
"      if (a.id >= b.id) continue;\n" +
"      if (overlaps(a, b)) found.push([a.id, b.id]);\n" +
"    }\n" +
"  }\n" +
"  return found;\n" +
"}\n",
      },
      {
        name: "agenda.js",
        content:
"// One day's events, sorted by start time.\n" +
"function agendaFor(schedule, day) {\n" +
"  return schedule.events\n" +
"    .filter(function (ev) { return ev.day === day; })\n" +
"    .sort(function (a, b) { return a.start > b.start ? 1 : -1; });\n" +
"}\n" +
"\n" +
"function totalBookedMinutes(schedule, day) {\n" +
"  var total = 0;\n" +
"  agendaFor(schedule, day).forEach(function (ev) {\n" +
"    total += toMinutes(ev.end) - toMinutes(ev.start);\n" +
"  });\n" +
"  return total;\n" +
"}\n" +
"\n" +
"function agendaHeading(schedule, day) {\n" +
"  var evs = agendaFor(schedule, day);\n" +
"  return dayLabel(day) + ' — ' + evs.length + ' event' + (evs.length === 1 ? '' : 's');\n" +
"}\n",
      },
    ],
    tests: [
      {
        name: "addEvent stores events and agendaFor filters by day",
        body:
"var s = createSchedule();\n" +
"addEvent(s, { title: 'Standup', day: 1, start: '9:00', end: '9:15' });\n" +
"addEvent(s, { title: 'Review', day: 1, start: '13:00', end: '14:00' });\n" +
"addEvent(s, { title: 'Gym', day: 2, start: '18:00', end: '19:00' });\n" +
"assert(agendaFor(s, 1).length === 2, 'day 1 should have 2 events');\n" +
"assert(agendaFor(s, 2)[0].title === 'Gym', 'day 2 should contain Gym');",
      },
      {
        name: "agenda is sorted by start time (9:00 before 10:30 before 13:00)",
        body:
"var s = createSchedule();\n" +
"addEvent(s, { title: 'Review', day: 1, start: '13:00', end: '14:00' });\n" +
"addEvent(s, { title: 'Standup', day: 1, start: '9:00', end: '9:15' });\n" +
"addEvent(s, { title: 'Sync', day: 1, start: '10:30', end: '11:00' });\n" +
"var titles = agendaFor(s, 1).map(function (e) { return e.title; });\n" +
"assert(deepEqual(titles, ['Standup', 'Sync', 'Review']), 'expected chronological order, got ' + JSON.stringify(titles));",
      },
      {
        name: "back-to-back events do not conflict; true overlaps do",
        body:
"var a = { id: 1, day: 1, start: '9:00', end: '10:00' };\n" +
"var b = { id: 2, day: 1, start: '10:00', end: '11:00' };\n" +
"assert(overlaps(a, b) === false, '9-10 and 10-11 are back-to-back, not a conflict');\n" +
"var c = { id: 3, day: 1, start: '9:30', end: '10:30' };\n" +
"assert(overlaps(a, c) === true, '9-10 and 9:30-10:30 genuinely overlap');",
      },
      {
        name: "allConflicts finds collisions beyond the first event",
        body:
"var s = createSchedule();\n" +
"addEvent(s, { title: 'Solo', day: 0, start: '9:00', end: '9:30' });\n" +
"addEvent(s, { title: 'Design', day: 1, start: '13:00', end: '14:00' });\n" +
"addEvent(s, { title: 'Hiring', day: 1, start: '13:30', end: '15:00' });\n" +
"var found = allConflicts(s);\n" +
"assert(deepEqual(found, [[2, 3]]), 'expected the Design/Hiring collision [[2,3]], got ' + JSON.stringify(found));",
      },
      {
        name: "dayLabel maps 0-based days",
        body:
"assert(dayLabel(0) === 'Sunday', 'day 0 should be Sunday, got ' + dayLabel(0));\n" +
"assert(dayLabel(6) === 'Saturday', 'day 6 should be Saturday, got ' + dayLabel(6));",
      },
      {
        name: "totalBookedMinutes sums a day's durations",
        body:
"var s = createSchedule();\n" +
"addEvent(s, { title: 'A', day: 3, start: '9:00', end: '10:30' });\n" +
"addEvent(s, { title: 'B', day: 3, start: '13:15', end: '14:00' });\n" +
"assert(totalBookedMinutes(s, 3) === 135, 'expected 135 booked minutes, got ' + totalBookedMinutes(s, 3));",
      },
    ],
    bugs: [
      {
        title: "Agenda sorts times as strings",
        clazz: "wrong-comparator",
        hints: [
          "The agenda is only wrong when single-digit hours meet double-digit hours. Log the comparator's inputs — what TYPE are a.start and b.start?",
          "'13:00' > '9:00' compares character by character: '1' vs '9' — '1' sorts first, so 13:00 lands before 9:00. Dictionary order, not clock order.",
          "There is already a toMinutes() helper. Compare numbers: toMinutes(a.start) - toMinutes(b.start).",
        ],
        symptom: "Morning meetings render after afternoon ones, but only when the morning hour has one digit.",
        trace: "<code>console.log('9:00' &gt; '13:00')</code> prints <code>true</code>. The comparator receives strings and JavaScript compares them lexicographically.",
        hypothesis: "Time-of-day strings are being compared as text; <code>'1' &lt; '9'</code> decides the order before the rest of the string is even read.",
        fix: "Convert to minutes and subtract.",
        diff:
"  function agendaFor(schedule, day) {\n" +
"    return schedule.events\n" +
"      .filter(function (ev) { return ev.day === day; })\n" +
"-     .sort(function (a, b) { return a.start > b.start ? 1 : -1; });\n" +
"+     .sort(function (a, b) { return toMinutes(a.start) - toMinutes(b.start); });\n" +
"  }",
        why: "Any comparator over formatted strings inherits the format's quirks: unpadded hours, 12-hour clocks, locale digits. Sort the underlying quantity (minutes), never its display form. The same trap powers the classic [10, 9, 100].sort() bug.",
      },
      {
        title: "Overlap check uses <= — touching intervals count as conflicts",
        clazz: "boundary-condition",
        hints: [
          "Only back-to-back bookings misfire. Write the overlap condition down on paper with a=9:00-10:00 and b=10:00-11:00 and evaluate each side.",
          "aStart <= bEnd is 540 <= 660 (true) and bStart <= aEnd is 600 <= 600 — true because of the equals sign. Half-open intervals need strict comparison.",
          "Use strict <: ranges [s1,e1) and [s2,e2) intersect iff s1 < e2 && s2 < e1.",
        ],
        symptom: "Booking a meeting that starts exactly when another ends triggers a conflict warning.",
        trace: "<code>console.log(toMinutes(b.start), toMinutes(a.end))</code> → <code>600 600</code>; the <code>&lt;=</code> makes equality count as intersection.",
        hypothesis: "The intervals are conceptually half-open (a 10:00 end does not occupy 10:00), but the comparison treats the shared instant as overlap.",
        fix: "Strict inequality on both sides.",
        diff:
"  function overlaps(a, b) {\n" +
"    if (a.day !== b.day) return false;\n" +
"-   return toMinutes(a.start) <= toMinutes(b.end) && toMinutes(b.start) <= toMinutes(a.end);\n" +
"+   return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);\n" +
"  }",
        why: "Interval logic is all about whether endpoints are inclusive. Calendar slots are half-open by convention — the classic s1 &lt; e2 &amp;&amp; s2 &lt; e1 test encodes that; loosening either &lt; to &lt;= silently redefines the semantics at exactly the boundary users care about.",
      },
      {
        title: "Nested loops reuse the same var i",
        clazz: "variable-shadowing",
        hints: [
          "allConflicts finds conflicts that involve the FIRST event, and nothing else. Log i at the top of the outer loop body — how many times does the outer loop actually run?",
          "Once. Both loops declare `var i`. var is function-scoped, so there is only ONE i: the inner loop runs it to the end, the outer condition then fails immediately.",
          "Rename the inner counter to j (and while you're in there, start it at i + 1 so each pair is visited once).",
        ],
        symptom: "The weekly conflict report only ever flags conflicts involving the earliest-created event.",
        trace: "<code>console.log('outer i =', i)</code> prints once. After the inner loop, <code>i === events.length</code>, so the outer loop is already done.",
        hypothesis: "<code>var</code> hoists to function scope; the two <code>var i</code> declarations are the same binding, and the inner loop burns it out for the outer one.",
        fix: "Distinct inner counter.",
        diff:
"  for (var i = 0; i < schedule.events.length; i++) {\n" +
"    var a = schedule.events[i];\n" +
"-   for (var i = 0; i < schedule.events.length; i++) {\n" +
"-     var b = schedule.events[i];\n" +
"-     if (a.id >= b.id) continue;\n" +
"+   for (var j = i + 1; j < schedule.events.length; j++) {\n" +
"+     var b = schedule.events[j];\n" +
"      if (overlaps(a, b)) found.push([a.id, b.id]);",
        why: "var has no block scope — redeclaring it in a nested block is a silent no-op that aliases the outer variable. let/const would have made this a SyntaxError; with var, the only defenses are distinct names and linters.",
      },
      {
        title: "dayLabel indexes with day - 1 on a 0-based day",
        clazz: "off-by-one",
        hints: [
          "The Sunday heading says 'undefined' and every other day is shifted. What does dayLabel(0) evaluate to, step by step?",
          "DAY_NAMES[0 - 1] is DAY_NAMES[-1] — undefined. The module documents days as 0-based, but the lookup assumes 1-based.",
          "Index directly: DAY_NAMES[day].",
        ],
        symptom: "Sunday's heading is <code>undefined — 2 events</code>; Monday shows &ldquo;Sunday&rdquo;, and so on shifted by one.",
        trace: "<code>console.log(dayLabel(0), dayLabel(1))</code> → <code>undefined Sunday</code>.",
        hypothesis: "A 1-based mental model leaked into a 0-based API: the <code>- 1</code> compensates for an offset that does not exist.",
        fix: "Drop the subtraction.",
        diff:
"  function dayLabel(day) {\n" +
"-   return DAY_NAMES[day - 1];\n" +
"+   return DAY_NAMES[day];\n" +
"  }",
        why: "Every index bug is a disagreement about where counting starts. The cure is stating the convention once (here: the comment says 0-based) and grepping every subscript against it — the &plusmn;1 &ldquo;fix&rdquo; someone adds to make one call site look right is how the convention silently forks.",
      },
    ],
    fixedFiles: [
      {
        name: "time.js",
        content:
"function toMinutes(t) {\n" +
"  var parts = String(t).split(':');\n" +
"  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);\n" +
"}\n" +
"\n" +
"var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];\n" +
"\n" +
"function dayLabel(day) {\n" +
"  return DAY_NAMES[day];\n" +
"}\n",
      },
      {
        name: "events.js",
        content:
"function createSchedule() {\n" +
"  return { events: [], nextId: 1 };\n" +
"}\n" +
"\n" +
"function addEvent(schedule, ev) {\n" +
"  var e = { id: schedule.nextId++, title: ev.title, day: ev.day, start: ev.start, end: ev.end };\n" +
"  schedule.events.push(e);\n" +
"  return e;\n" +
"}\n" +
"\n" +
"function overlaps(a, b) {\n" +
"  if (a.day !== b.day) return false;\n" +
"  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);\n" +
"}\n" +
"\n" +
"function allConflicts(schedule) {\n" +
"  var found = [];\n" +
"  for (var i = 0; i < schedule.events.length; i++) {\n" +
"    var a = schedule.events[i];\n" +
"    for (var j = i + 1; j < schedule.events.length; j++) {\n" +
"      var b = schedule.events[j];\n" +
"      if (overlaps(a, b)) found.push([a.id, b.id]);\n" +
"    }\n" +
"  }\n" +
"  return found;\n" +
"}\n",
      },
      {
        name: "agenda.js",
        content:
"function agendaFor(schedule, day) {\n" +
"  return schedule.events\n" +
"    .filter(function (ev) { return ev.day === day; })\n" +
"    .sort(function (a, b) { return toMinutes(a.start) - toMinutes(b.start); });\n" +
"}\n" +
"\n" +
"function totalBookedMinutes(schedule, day) {\n" +
"  var total = 0;\n" +
"  agendaFor(schedule, day).forEach(function (ev) {\n" +
"    total += toMinutes(ev.end) - toMinutes(ev.start);\n" +
"  });\n" +
"  return total;\n" +
"}\n" +
"\n" +
"function agendaHeading(schedule, day) {\n" +
"  var evs = agendaFor(schedule, day);\n" +
"  return dayLabel(day) + ' — ' + evs.length + ' event' + (evs.length === 1 ? '' : 's');\n" +
"}\n",
      },
    ],
  });

  /* ================================================================
     5. Todo Store with Undo/Redo — mutation, fall-through, boundaries
     ================================================================ */
  EX.push({
    slug: "todo-undo-reducer",
    name: "Todo Store with Undo/Redo",
    kind: "worker",
    difficulty: "Medium",
    minutes: 40,
    summary: "Undo undoes nothing, toggling deletes tasks, and redo resurrects ghosts",
    brief:
      "<p>A reducer-driven todo store with time travel: a pure reducer plus a history wrapper (past / present / future). The bug tracker after one day in production:</p>" +
      "<ul>" +
      "<li>&ldquo;Undo does nothing — the task I just added is still there.&rdquo;</li>" +
      "<li>&ldquo;Clicking a task&rsquo;s checkbox DELETES it instead of checking it off.&rdquo;</li>" +
      "<li>&ldquo;Pressing undo on an empty list crashes the app.&rdquo;</li>" +
      "<li>&ldquo;After undoing and typing a new task, redo brings back a task from a timeline that shouldn&rsquo;t exist anymore.&rdquo;</li>" +
      "</ul>" +
      "<p>The intended contract: the reducer is <b>pure</b> (never mutates its input), and the history wrapper snapshots <code>present</code> before every action. Log object identities (<code>a === b</code>) as well as values — time travel dies quietly when snapshots share references.</p>",
    files: [
      {
        name: "reducer.js",
        content:
"// Pure todos reducer. State shape: { todos: [{id, title, done}], nextId }.\n" +
"// MUST never mutate the incoming state.\n" +
"function todosReducer(state, action) {\n" +
"  switch (action.type) {\n" +
"    case 'ADD_TODO': {\n" +
"      state.todos.push({ id: state.nextId, title: action.title, done: false });\n" +
"      return { todos: state.todos, nextId: state.nextId + 1 };\n" +
"    }\n" +
"    case 'TOGGLE_TODO': {\n" +
"      var next = {\n" +
"        todos: state.todos.map(function (t) {\n" +
"          return t.id === action.id ? { id: t.id, title: t.title, done: !t.done } : t;\n" +
"        }),\n" +
"        nextId: state.nextId,\n" +
"      };\n" +
"    }\n" +
"    case 'REMOVE_TODO':\n" +
"      return {\n" +
"        todos: state.todos.filter(function (t) { return t.id !== action.id; }),\n" +
"        nextId: state.nextId,\n" +
"      };\n" +
"    default:\n" +
"      return state;\n" +
"  }\n" +
"}\n",
      },
      {
        name: "history.js",
        content:
"// History wrapper: keeps past states for undo and future states for redo.\n" +
"function createStore(reducer, initialState) {\n" +
"  var past = [];\n" +
"  var present = initialState;\n" +
"  var future = [];\n" +
"\n" +
"  return {\n" +
"    getState: function () { return present; },\n" +
"\n" +
"    dispatch: function (action) {\n" +
"      past.push(present);\n" +
"      present = reducer(present, action);\n" +
"    },\n" +
"\n" +
"    undo: function () {\n" +
"      var previous = past.pop();\n" +
"      future.unshift(present);\n" +
"      present = previous;\n" +
"    },\n" +
"\n" +
"    redo: function () {\n" +
"      if (future.length === 0) return;\n" +
"      past.push(present);\n" +
"      present = future.shift();\n" +
"    },\n" +
"\n" +
"    canUndo: function () { return past.length > 0; },\n" +
"    canRedo: function () { return future.length > 0; },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "selectors.js",
        content:
"function activeCount(state) {\n" +
"  return state.todos.filter(function (t) { return !t.done; }).length;\n" +
"}\n" +
"\n" +
"function completedCount(state) {\n" +
"  return state.todos.filter(function (t) { return t.done; }).length;\n" +
"}\n",
      },
    ],
    tests: [
      {
        name: "adding todos appends in order with sequential ids",
        body:
"var store = createStore(todosReducer, { todos: [], nextId: 1 });\n" +
"store.dispatch({ type: 'ADD_TODO', title: 'One' });\n" +
"store.dispatch({ type: 'ADD_TODO', title: 'Two' });\n" +
"var todos = store.getState().todos;\n" +
"assert(todos.length === 2, 'expected 2 todos, got ' + todos.length);\n" +
"assert(todos[0].title === 'One' && todos[1].title === 'Two', 'order wrong: ' + JSON.stringify(todos));\n" +
"assert(todos[0].id === 1 && todos[1].id === 2, 'ids should be 1 and 2');",
      },
      {
        name: "undo restores the previous state, redo re-applies it",
        body:
"var store = createStore(todosReducer, { todos: [], nextId: 1 });\n" +
"store.dispatch({ type: 'ADD_TODO', title: 'One' });\n" +
"store.undo();\n" +
"assert(store.getState().todos.length === 0, 'after undo the list should be empty again, got ' + JSON.stringify(store.getState().todos));\n" +
"store.redo();\n" +
"assert(store.getState().todos.length === 1 && store.getState().todos[0].title === 'One', 'redo should re-apply the add');",
      },
      {
        name: "toggling marks a todo done without deleting it",
        body:
"var store = createStore(todosReducer, { todos: [], nextId: 1 });\n" +
"store.dispatch({ type: 'ADD_TODO', title: 'Task' });\n" +
"store.dispatch({ type: 'TOGGLE_TODO', id: 1 });\n" +
"var todos = store.getState().todos;\n" +
"assert(todos.length === 1, 'toggle must not remove the todo — list is now ' + JSON.stringify(todos));\n" +
"assert(todos[0].done === true, 'todo should be marked done');",
      },
      {
        name: "undo on an empty history is a safe no-op",
        body:
"var store = createStore(todosReducer, { todos: [], nextId: 1 });\n" +
"store.undo();\n" +
"store.undo();\n" +
"assert(deepEqual(store.getState(), { todos: [], nextId: 1 }), 'state should be untouched, got ' + JSON.stringify(store.getState()));\n" +
"store.dispatch({ type: 'ADD_TODO', title: 'Still works' });\n" +
"assert(store.getState().todos.length === 1, 'store should still accept actions after a no-op undo');",
      },
      {
        name: "a new action clears the redo stack",
        body:
"var store = createStore(todosReducer, { todos: [], nextId: 1 });\n" +
"store.dispatch({ type: 'ADD_TODO', title: 'A' });\n" +
"store.undo();\n" +
"store.dispatch({ type: 'ADD_TODO', title: 'B' });\n" +
"store.redo();\n" +
"var todos = store.getState().todos;\n" +
"assert(todos.length === 1 && todos[0].title === 'B', 'redo after a new action must be a no-op; state is ' + JSON.stringify(todos));\n" +
"assert(store.canRedo() === false, 'redo stack should be empty after a fresh action');",
      },
      {
        name: "selectors count active vs completed",
        body:
"var state = { todos: [{ id: 1, title: 'a', done: false }, { id: 2, title: 'b', done: true }, { id: 3, title: 'c', done: false }], nextId: 4 };\n" +
"assert(activeCount(state) === 2, 'expected 2 active');\n" +
"assert(completedCount(state) === 1, 'expected 1 completed');",
      },
    ],
    bugs: [
      {
        title: "ADD_TODO mutates the incoming state",
        clazz: "mutation-vs-copy",
        hints: [
          "Undo 'does nothing' — but is the past snapshot actually different from the present? After dispatching ADD, log past[0].todos === getState().todos from inside the wrapper (or compare lengths).",
          "push() writes into the array the history wrapper just snapshotted. The snapshot and the new present share one todos array, so restoring the snapshot restores nothing.",
          "Return a fresh array: todos: state.todos.concat([newTodo]) — never push on state you received.",
        ],
        symptom: "Undo appears to do nothing: the &ldquo;previous&rdquo; state already contains the added todo.",
        trace: "Log identity, not just value: the snapshot in <code>past</code> and the new <code>present</code> report the SAME <code>todos</code> array (<code>===</code> is true). Every timeline points at one mutated array.",
        hypothesis: "The reducer pushes into the array it was handed. History-based undo relies on old states being frozen in time; in-place mutation rewrites history.",
        fix: "Build the next state out of copies.",
        diff:
"    case 'ADD_TODO': {\n" +
"-     state.todos.push({ id: state.nextId, title: action.title, done: false });\n" +
"-     return { todos: state.todos, nextId: state.nextId + 1 };\n" +
"+     return {\n" +
"+       todos: state.todos.concat([{ id: state.nextId, title: action.title, done: false }]),\n" +
"+       nextId: state.nextId + 1,\n" +
"+     };\n" +
"    }",
        why: "Undo/redo, memoization, and change detection all assume snapshots are immutable. One push() aliases every snapshot to a single live array, and the whole history collapses into &ldquo;now&rdquo;. Purity in reducers isn't style — it is the data structure the feature is built on.",
      },
      {
        title: "TOGGLE_TODO computes the next state but falls through",
        clazz: "switch-fall-through",
        hints: [
          "Toggling deletes the task — which is exactly what REMOVE_TODO does. What does the TOGGLE_TODO case actually return?",
          "Nothing. It builds `next` and then reaches the end of its block. With no return, execution falls through into the REMOVE_TODO case, which filters the id out.",
          "return next; (and note the filter in REMOVE happens to use the same action.id, which is why the fall-through looks like a delete).",
        ],
        symptom: "Checking a todo off removes it from the list entirely.",
        trace: "A <code>console.log</code> at the top of the REMOVE_TODO case fires when a TOGGLE action is dispatched — the case boundary is being crossed.",
        hypothesis: "The toggle case assigns its result to a local and never returns it; switch fall-through then executes the next case with the same action, whose <code>id</code> happens to line up.",
        fix: "Return the computed state.",
        diff:
"    case 'TOGGLE_TODO': {\n" +
"      var next = {\n" +
"        todos: state.todos.map(function (t) {\n" +
"          return t.id === action.id ? { id: t.id, title: t.title, done: !t.done } : t;\n" +
"        }),\n" +
"        nextId: state.nextId,\n" +
"      };\n" +
"+     return next;\n" +
"    }",
        why: "switch cases don't end at the closing brace of a block — only break/return/throw ends them. Fall-through bugs are vicious because the wrong case still runs with a plausible action object, producing behavior that looks intentional. A lint rule (no-fallthrough) or early returns per case is the structural defense.",
      },
      {
        title: "undo() has no empty-history guard",
        clazz: "boundary-condition",
        hints: [
          "The crash happens only when there is nothing to undo. What does past.pop() return on an empty array?",
          "undefined — which then becomes `present`. The next getState().todos is a property read on undefined and every consumer explodes.",
          "Guard the boundary: if (past.length === 0) return; before popping.",
        ],
        symptom: "Pressing undo with no history crashes on the next render: <code>Cannot read properties of undefined</code>.",
        trace: "<code>console.log(past.length)</code> before the pop prints <code>0</code>; <code>previous</code> logs as <code>undefined</code>; <code>present</code> is now <code>undefined</code>.",
        hypothesis: "pop() on empty quietly yields undefined instead of throwing, so the corruption surfaces one step later, far from the cause.",
        fix: "Early-return at the boundary.",
        diff:
"    undo: function () {\n" +
"+     if (past.length === 0) return;\n" +
"      var previous = past.pop();\n" +
"      future.unshift(present);\n" +
"      present = previous;\n" +
"    },",
        why: "APIs that return undefined instead of throwing (pop, shift, find) move the failure away from its cause. Every consumer of such an API owns the boundary check — and stacks/queues in particular need their empty case decided on day one: no-op, throw, or sentinel.",
      },
      {
        title: "dispatch never clears the redo stack",
        clazz: "stale-state",
        hints: [
          "Redo resurrects a todo from an abandoned timeline. After undo → new action, what is still sitting in `future`?",
          "The state from before the undo. Real undo systems discard the redo stack the moment a new action forks history — this one keeps it forever.",
          "Set future = [] inside dispatch.",
        ],
        symptom: "Undo, then add a new todo, then redo: the redo &ldquo;restores&rdquo; a state from the timeline you abandoned, clobbering the new todo.",
        trace: "Log <code>future.length</code> inside dispatch: it stays <code>1</code> after the new action. The stale snapshot is then shifted straight into <code>present</code> by redo.",
        hypothesis: "History is a tree but this store models it as two stacks; the moment you act after an undo, the future stack refers to a branch that no longer exists and must be dropped.",
        fix: "Clear the redo stack on every new action.",
        diff:
"    dispatch: function (action) {\n" +
"      past.push(present);\n" +
"      present = reducer(present, action);\n" +
"+     future = [];\n" +
"    },",
        why: "Undo/redo is a branching timeline flattened into two stacks, and the flattening only stays valid if the future branch is discarded on divergence. Editors, canvases, and form builders all share this exact invariant — forgetting it is the classic ghost-redo bug.",
      },
    ],
    fixedFiles: [
      {
        name: "reducer.js",
        content:
"function todosReducer(state, action) {\n" +
"  switch (action.type) {\n" +
"    case 'ADD_TODO': {\n" +
"      return {\n" +
"        todos: state.todos.concat([{ id: state.nextId, title: action.title, done: false }]),\n" +
"        nextId: state.nextId + 1,\n" +
"      };\n" +
"    }\n" +
"    case 'TOGGLE_TODO': {\n" +
"      return {\n" +
"        todos: state.todos.map(function (t) {\n" +
"          return t.id === action.id ? { id: t.id, title: t.title, done: !t.done } : t;\n" +
"        }),\n" +
"        nextId: state.nextId,\n" +
"      };\n" +
"    }\n" +
"    case 'REMOVE_TODO':\n" +
"      return {\n" +
"        todos: state.todos.filter(function (t) { return t.id !== action.id; }),\n" +
"        nextId: state.nextId,\n" +
"      };\n" +
"    default:\n" +
"      return state;\n" +
"  }\n" +
"}\n",
      },
      {
        name: "history.js",
        content:
"function createStore(reducer, initialState) {\n" +
"  var past = [];\n" +
"  var present = initialState;\n" +
"  var future = [];\n" +
"\n" +
"  return {\n" +
"    getState: function () { return present; },\n" +
"\n" +
"    dispatch: function (action) {\n" +
"      past.push(present);\n" +
"      present = reducer(present, action);\n" +
"      future = [];\n" +
"    },\n" +
"\n" +
"    undo: function () {\n" +
"      if (past.length === 0) return;\n" +
"      var previous = past.pop();\n" +
"      future.unshift(present);\n" +
"      present = previous;\n" +
"    },\n" +
"\n" +
"    redo: function () {\n" +
"      if (future.length === 0) return;\n" +
"      past.push(present);\n" +
"      present = future.shift();\n" +
"    },\n" +
"\n" +
"    canUndo: function () { return past.length > 0; },\n" +
"    canRedo: function () { return future.length > 0; },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "selectors.js",
        content:
"function activeCount(state) {\n" +
"  return state.todos.filter(function (t) { return !t.done; }).length;\n" +
"}\n" +
"\n" +
"function completedCount(state) {\n" +
"  return state.todos.filter(function (t) { return t.done; }).length;\n" +
"}\n",
      },
    ],
  });

  /* ================================================================
     6. Inventory Report — coercion, accumulator reset, comparator, slice
     ================================================================ */
  EX.push({
    slug: "inventory-report",
    name: "Inventory Report Builder",
    kind: "worker",
    difficulty: "Easy",
    minutes: 40,
    summary: "The monthly report shows zero revenue, one category, and the cheapest 'top sellers'",
    brief:
      "<p>Ops runs this little pipeline on the product CSV every month: parse rows &rarr; filter to active products &rarr; aggregate revenue per category &rarr; list the top sellers. This month&rsquo;s report is nonsense:</p>" +
      "<ul>" +
      "<li>&ldquo;Every category shows $0 — the whole active filter seems to drop everything.&rdquo;</li>" +
      "<li>&ldquo;Even when it worked in a quick console test, the category table only ever contained ONE category.&rdquo;</li>" +
      "<li>&ldquo;The &lsquo;Top 3 sellers&rsquo; list shows our <em>worst</em> sellers&hellip; and only two of them.&rdquo;</li>" +
      "</ul>" +
      "<p>The parser and the aggregator were written by different people — read <code>parse.js</code>&rsquo;s output contract carefully before trusting how <code>aggregate.js</code> consumes it.</p>",
    files: [
      {
        name: "parse.js",
        content:
"// Raw rows arrive from the CSV layer as arrays of strings:\n" +
"//   [sku, name, category, price, qty, active]\n" +
"// parseRows converts them to typed records:\n" +
"//   { sku: string, name: string, category: string,\n" +
"//     price: number, qty: number, active: boolean }\n" +
"function parseRows(raw) {\n" +
"  return raw.map(function (cols) {\n" +
"    return {\n" +
"      sku: cols[0],\n" +
"      name: cols[1],\n" +
"      category: cols[2],\n" +
"      price: parseFloat(cols[3]),\n" +
"      qty: parseInt(cols[4], 10),\n" +
"      active: cols[5] === 'true',\n" +
"    };\n" +
"  });\n" +
"}\n",
      },
      {
        name: "aggregate.js",
        content:
"function revenueOf(r) {\n" +
"  return r.price * r.qty;\n" +
"}\n" +
"\n" +
"// Only active products count toward the report.\n" +
"function activeRows(rows) {\n" +
"  return rows.filter(function (r) { return r.active == 'true'; });\n" +
"}\n" +
"\n" +
"// Revenue per category, e.g. { Widgets: 120, Gadgets: 30 }.\n" +
"function groupRevenue(rows) {\n" +
"  var result = {};\n" +
"  var items = activeRows(rows);\n" +
"  for (var i = 0; i < items.length; i++) {\n" +
"    var result = {};\n" +
"    var r = items[i];\n" +
"    result[r.category] = (result[r.category] || 0) + revenueOf(r);\n" +
"  }\n" +
"  return result;\n" +
"}\n" +
"\n" +
"// The n products with the highest revenue, highest first.\n" +
"function topProducts(rows, n) {\n" +
"  var ranked = rows.slice().sort(function (a, b) {\n" +
"    return revenueOf(a) - revenueOf(b);\n" +
"  });\n" +
"  return ranked.slice(0, n - 1);\n" +
"}\n",
      },
      {
        name: "format.js",
        content:
"function formatMoney(x) {\n" +
"  return '$' + x.toFixed(2);\n" +
"}\n" +
"\n" +
"function reportLines(rows, n) {\n" +
"  return topProducts(rows, n).map(function (r) {\n" +
"    return r.name + ' — ' + formatMoney(revenueOf(r));\n" +
"  });\n" +
"}\n",
      },
    ],
    tests: [
      {
        name: "parseRows produces typed records",
        body:
"var rows = parseRows([['SKU1', 'Mug', 'Kitchen', '12.50', '4', 'true']]);\n" +
"assert(rows.length === 1, 'one row expected');\n" +
"assert(typeof rows[0].price === 'number' && rows[0].price === 12.5, 'price should be numeric');\n" +
"assert(typeof rows[0].qty === 'number' && rows[0].qty === 4, 'qty should be numeric');\n" +
"assert(rows[0].active === true, 'active should be a boolean');",
      },
      {
        name: "activeRows keeps exactly the active products",
        body:
"var rows = parseRows([\n" +
"  ['A1', 'Mug', 'Kitchen', '10', '2', 'true'],\n" +
"  ['A2', 'Plate', 'Kitchen', '8', '1', 'false'],\n" +
"  ['A3', 'Lamp', 'Decor', '20', '3', 'true'],\n" +
"]);\n" +
"var act = activeRows(rows);\n" +
"assert(act.length === 2, 'expected 2 active rows, got ' + act.length);\n" +
"assert(act[0].sku === 'A1' && act[1].sku === 'A3', 'wrong rows kept: ' + JSON.stringify(act.map(function (r) { return r.sku; })));",
      },
      {
        name: "groupRevenue totals every category",
        body:
"var rows = parseRows([\n" +
"  ['A1', 'Mug', 'Kitchen', '2.5', '4', 'true'],\n" +
"  ['A2', 'Plate', 'Kitchen', '5', '2', 'true'],\n" +
"  ['A3', 'Lamp', 'Decor', '3', '10', 'true'],\n" +
"  ['A4', 'Old Vase', 'Decor', '99', '1', 'false'],\n" +
"]);\n" +
"var totals = groupRevenue(rows);\n" +
"assert(deepEqual(totals, { Kitchen: 20, Decor: 30 }), 'expected {Kitchen:20, Decor:30}, got ' + JSON.stringify(totals));",
      },
      {
        name: "topProducts ranks by revenue, highest first",
        body:
"var rows = [\n" +
"  { sku: 'B1', name: 'Cheap', price: 1, qty: 10 },\n" +
"  { sku: 'B2', name: 'Star', price: 30, qty: 10 },\n" +
"  { sku: 'B3', name: 'Mid', price: 5, qty: 10 },\n" +
"  { sku: 'B4', name: 'Second', price: 20, qty: 10 },\n" +
"];\n" +
"var top = topProducts(rows, 3);\n" +
"var skus = top.map(function (r) { return r.sku; });\n" +
"assert(skus[0] === 'B2' && skus[1] === 'B4', 'expected Star then Second first, got ' + JSON.stringify(skus));",
      },
      {
        name: "topProducts returns exactly n items",
        body:
"var rows = [\n" +
"  { sku: 'B1', name: 'A', price: 1, qty: 1 },\n" +
"  { sku: 'B2', name: 'B', price: 2, qty: 1 },\n" +
"  { sku: 'B3', name: 'C', price: 3, qty: 1 },\n" +
"];\n" +
"assert(topProducts(rows, 2).length === 2, 'asked for 2, got ' + topProducts(rows, 2).length);\n" +
"assert(topProducts(rows, 3).length === 3, 'asked for 3, got ' + topProducts(rows, 3).length);",
      },
      {
        name: "formatMoney renders cents",
        body:
"assert(formatMoney(1234.5) === '$1234.50', 'got ' + formatMoney(1234.5));\n" +
"assert(formatMoney(3) === '$3.00', 'got ' + formatMoney(3));",
      },
    ],
    bugs: [
      {
        title: "activeRows compares a boolean against the string 'true'",
        clazz: "type-coercion",
        hints: [
          "The active filter drops EVERYTHING. Log a row before the filter — what is the TYPE of r.active after parsing?",
          "parse.js already converted active to a real boolean. true == 'true' is false: == converts the string with Number('true'), which is NaN.",
          "Compare against the boolean the contract gives you: r.active === true — or simply return r.active.",
        ],
        symptom: "Every product is filtered out; all downstream numbers are zero.",
        trace: "<code>console.log(typeof rows[0].active, rows[0].active == 'true')</code> → <code>boolean false</code>. The parser's contract (top of parse.js) says boolean; the consumer still expects the raw CSV string.",
        hypothesis: "Two modules disagree about a field's type across their boundary, and <code>==</code> hides the mismatch instead of surfacing it — <code>true == 'true'</code> coerces to <code>1 == NaN</code>.",
        fix: "Trust the documented contract and test the boolean.",
        diff:
"  function activeRows(rows) {\n" +
"-   return rows.filter(function (r) { return r.active == 'true'; });\n" +
"+   return rows.filter(function (r) { return r.active === true; });\n" +
"  }",
        why: "Loose equality doesn't bridge type mismatches — it hides them behind coercion rules almost nobody can recite (<code>true == 'true'</code> is false, yet <code>'1' == true</code> is true). When data crosses a module boundary, the fix is honoring the declared type, and === is what makes violations loud.",
      },
      {
        title: "groupRevenue re-initializes its accumulator inside the loop",
        clazz: "accumulator-reset",
        hints: [
          "Once the filter works, the totals object only ever contains one category — the LAST row processed. What happens to `result` on each pass through the loop?",
          "There's a second `var result = {}` inside the loop body. var is function-scoped, so it's the same variable being wiped clean every iteration.",
          "Delete the inner declaration; initialize the accumulator exactly once, before the loop.",
        ],
        symptom: "The category table always has exactly one entry, whichever category happens to come last.",
        trace: "<code>console.log(i, result)</code> at the loop's end prints a one-key object every iteration — earlier keys vanish between iterations.",
        hypothesis: "A leftover duplicate initialization inside the loop resets the accumulator each pass; <code>var</code> makes the redeclaration silently legal.",
        fix: "One initialization, outside the loop.",
        diff:
"  function groupRevenue(rows) {\n" +
"    var result = {};\n" +
"    var items = activeRows(rows);\n" +
"    for (var i = 0; i < items.length; i++) {\n" +
"-     var result = {};\n" +
"      var r = items[i];\n" +
"      result[r.category] = (result[r.category] || 0) + revenueOf(r);\n" +
"    }\n" +
"    return result;\n" +
"  }",
        why: "Accumulators have one rule: born before the loop, mutated inside it, read after it. Redeclaring with var is a no-op declaration plus a destructive assignment — a refactor leftover the language accepts without a word. let/const would have flagged the duplicate immediately.",
      },
      {
        title: "topProducts sorts ascending — the sign is flipped",
        clazz: "wrong-comparator",
        hints: [
          "The 'top sellers' are the worst sellers. In a numeric comparator, what does returning a negative number mean for a?",
          "revenueOf(a) - revenueOf(b) is negative when a earns LESS, which sorts a first — ascending. You want the big earners first.",
          "Flip the operands: revenueOf(b) - revenueOf(a).",
        ],
        symptom: "The leaderboard is exactly inverted: cheapest products first.",
        trace: "<code>console.log(ranked.map(revenueOf))</code> → <code>[10, 50, 200, 300]</code> — ascending, then the slice takes the front of the wrong end.",
        hypothesis: "The comparator's sign convention is inverted for the intended order: a - b sorts ascending, the report needs descending.",
        fix: "Swap a and b.",
        diff:
"    var ranked = rows.slice().sort(function (a, b) {\n" +
"-     return revenueOf(a) - revenueOf(b);\n" +
"+     return revenueOf(b) - revenueOf(a);\n" +
"    });",
        why: "The a - b idiom is compact but directionless to the eye — nothing in the code says 'ascending'. Read comparators by asking 'when is the result negative, and who goes first then?'. Or name the intent: sortDescendingBy(revenueOf).",
      },
      {
        title: "Top-N slice ends at n - 1",
        clazz: "off-by-one",
        hints: [
          "Ask for the top 3, get 2. How many items does slice(0, n - 1) actually take?",
          "slice's end index is EXCLUSIVE — slice(0, n) already returns n items. The - 1 double-compensates.",
          "return ranked.slice(0, n);",
        ],
        symptom: "The top-N list is always one short.",
        trace: "<code>console.log(ranked.length, ranked.slice(0, 3 - 1))</code> shows the slice taking two items for n = 3.",
        hypothesis: "The author treated slice's exclusive end as inclusive and subtracted one to 'fix' it, creating the very off-by-one they feared.",
        fix: "Use n directly.",
        diff:
"-   return ranked.slice(0, n - 1);\n" +
"+   return ranked.slice(0, n);",
        why: "Half-open ranges [start, end) are the convention exactly so that length = end - start with no &plusmn;1 arithmetic. Compensating for exclusivity that the API already handles is the most common way off-by-ones are introduced, not fixed.",
      },
    ],
    fixedFiles: [
      {
        name: "parse.js",
        content:
"function parseRows(raw) {\n" +
"  return raw.map(function (cols) {\n" +
"    return {\n" +
"      sku: cols[0],\n" +
"      name: cols[1],\n" +
"      category: cols[2],\n" +
"      price: parseFloat(cols[3]),\n" +
"      qty: parseInt(cols[4], 10),\n" +
"      active: cols[5] === 'true',\n" +
"    };\n" +
"  });\n" +
"}\n",
      },
      {
        name: "aggregate.js",
        content:
"function revenueOf(r) {\n" +
"  return r.price * r.qty;\n" +
"}\n" +
"\n" +
"function activeRows(rows) {\n" +
"  return rows.filter(function (r) { return r.active === true; });\n" +
"}\n" +
"\n" +
"function groupRevenue(rows) {\n" +
"  var result = {};\n" +
"  var items = activeRows(rows);\n" +
"  for (var i = 0; i < items.length; i++) {\n" +
"    var r = items[i];\n" +
"    result[r.category] = (result[r.category] || 0) + revenueOf(r);\n" +
"  }\n" +
"  return result;\n" +
"}\n" +
"\n" +
"function topProducts(rows, n) {\n" +
"  var ranked = rows.slice().sort(function (a, b) {\n" +
"    return revenueOf(b) - revenueOf(a);\n" +
"  });\n" +
"  return ranked.slice(0, n);\n" +
"}\n",
      },
      {
        name: "format.js",
        content:
"function formatMoney(x) {\n" +
"  return '$' + x.toFixed(2);\n" +
"}\n" +
"\n" +
"function reportLines(rows, n) {\n" +
"  return topProducts(rows, n).map(function (r) {\n" +
"    return r.name + ' — ' + formatMoney(revenueOf(r));\n" +
"  });\n" +
"}\n",
      },
    ],
  });

  /* ================================================================
     7. Express-style Routes — missing await, uncaught rejection,
        status boundary, param slicing
     ================================================================ */
  EX.push({
    slug: "express-routes",
    name: "Express-style Route Handlers",
    kind: "worker",
    difficulty: "Hard",
    minutes: 40,
    summary: "The users API returns a Promise as JSON, 500s crash the app, and /users/12 serves user 2",
    brief:
      "<p>A tiny express-style router (no real HTTP — requests are dispatched in-process against mocked <code>req</code>/<code>res</code> objects). The API it serves is misbehaving:</p>" +
      "<ul>" +
      "<li>&ldquo;<code>GET /users</code> returns <code>{}</code> instead of the user list.&rdquo;</li>" +
      "<li>&ldquo;<code>GET /users/12</code> returns <b>Bea</b> — that&rsquo;s user 2!&rdquo;</li>" +
      "<li>&ldquo;Requesting a user that doesn&rsquo;t exist gives a friendly <code>200 null</code> instead of a 404.&rdquo;</li>" +
      "<li>&ldquo;When the report generator throws, the whole dispatch blows up instead of returning a 500 from the error middleware.&rdquo;</li>" +
      "</ul>" +
      "<p>The router&rsquo;s contract is printed at the top of <code>router.js</code>: <b>dispatch always resolves with a response object</b> — handler failures must be converted by the error handler, never leaked as rejections.</p>",
    files: [
      {
        name: "db.js",
        content:
"// In-memory async user store. Every operation returns a promise, like a\n" +
"// real driver would.\n" +
"var USERS = [\n" +
"  { id: 2, name: 'Bea' },\n" +
"  { id: 5, name: 'Carl' },\n" +
"  { id: 12, name: 'Dana' },\n" +
"];\n" +
"var NEXT_ID = 100;\n" +
"\n" +
"function dbDelay() {\n" +
"  return new Promise(function (r) { setTimeout(r, 5); });\n" +
"}\n" +
"\n" +
"function dbListUsers() {\n" +
"  return dbDelay().then(function () { return USERS.slice(); });\n" +
"}\n" +
"\n" +
"function dbGetUser(id) {\n" +
"  return dbDelay().then(function () {\n" +
"    return USERS.find(function (u) { return u.id === Number(id); }) || null;\n" +
"  });\n" +
"}\n" +
"\n" +
"function dbCreateUser(name) {\n" +
"  return dbDelay().then(function () {\n" +
"    if (!name) throw new Error('name required');\n" +
"    var u = { id: NEXT_ID++, name: name };\n" +
"    USERS.push(u);\n" +
"    return u;\n" +
"  });\n" +
"}\n" +
"\n" +
"function buildWeeklyReport() {\n" +
"  return dbDelay().then(function () {\n" +
"    throw new Error('report generator offline');\n" +
"  });\n" +
"}\n",
      },
      {
        name: "router.js",
        content:
"// Minimal method + pattern router.\n" +
"// CONTRACT: dispatch(method, path, payload) ALWAYS resolves with the\n" +
"// response object. Handler failures — sync or async — are converted to a\n" +
"// response by the error handler; dispatch must never reject.\n" +
"function createRouter() {\n" +
"  var routes = [];\n" +
"  var errorHandler = function (err, req, res) {\n" +
"    res.status(500).json({ error: String((err && err.message) || err) });\n" +
"  };\n" +
"\n" +
"  function makeRes() {\n" +
"    return {\n" +
"      statusCode: 200,\n" +
"      body: undefined,\n" +
"      status: function (code) { this.statusCode = code; return this; },\n" +
"      json: function (obj) { this.body = obj; return this; },\n" +
"    };\n" +
"  }\n" +
"\n" +
"  // Returns a params object when the route matches, else null.\n" +
"  function matchRoute(route, method, path) {\n" +
"    if (route.method !== method) return null;\n" +
"    var pSegs = route.pattern.split('/');\n" +
"    var segs = path.split('/');\n" +
"    if (pSegs.length !== segs.length) return null;\n" +
"    var params = {};\n" +
"    for (var i = 0; i < pSegs.length; i++) {\n" +
"      if (pSegs[i].charAt(0) === ':') {\n" +
"        params[pSegs[i].slice(1)] = segs[i].slice(1);\n" +
"      } else if (pSegs[i] !== segs[i]) {\n" +
"        return null;\n" +
"      }\n" +
"    }\n" +
"    return params;\n" +
"  }\n" +
"\n" +
"  return {\n" +
"    register: function (method, pattern, handler) {\n" +
"      routes.push({ method: method, pattern: pattern, handler: handler });\n" +
"    },\n" +
"    onError: function (fn) { errorHandler = fn; },\n" +
"    dispatch: function (method, path, payload) {\n" +
"      var res = makeRes();\n" +
"      for (var i = 0; i < routes.length; i++) {\n" +
"        var params = matchRoute(routes[i], method, path);\n" +
"        if (params) {\n" +
"          var req = { method: method, path: path, params: params, body: payload };\n" +
"          var out = routes[i].handler(req, res);\n" +
"          return Promise.resolve(out).then(function () { return res; });\n" +
"        }\n" +
"      }\n" +
"      res.status(404).json({ error: 'no route for ' + method + ' ' + path });\n" +
"      return Promise.resolve(res);\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "app.js",
        content:
"// Route registrations. createApp() wires every endpoint onto a router.\n" +
"function createApp() {\n" +
"  var router = createRouter();\n" +
"\n" +
"  router.register('GET', '/users', function (req, res) {\n" +
"    var users = dbListUsers();\n" +
"    res.json(users);\n" +
"  });\n" +
"\n" +
"  router.register('GET', '/users/:id', async function (req, res) {\n" +
"    var user = await dbGetUser(req.params.id);\n" +
"    res.json(user);\n" +
"  });\n" +
"\n" +
"  router.register('POST', '/users', async function (req, res) {\n" +
"    var created = await dbCreateUser(req.body && req.body.name);\n" +
"    res.status(201).json(created);\n" +
"  });\n" +
"\n" +
"  router.register('GET', '/reports/weekly', async function (req, res) {\n" +
"    var data = await buildWeeklyReport();\n" +
"    res.json(data);\n" +
"  });\n" +
"\n" +
"  return router;\n" +
"}\n",
      },
    ],
    tests: [
      {
        name: "unknown paths resolve with a 404",
        body:
"var app = createApp();\n" +
"var res = await app.dispatch('GET', '/nope');\n" +
"assert(res.statusCode === 404, 'expected 404, got ' + res.statusCode);\n" +
"assert(res.body && String(res.body.error).indexOf('no route') !== -1, 'body should explain the missing route');",
      },
      {
        name: "GET /users returns the user array",
        body:
"var app = createApp();\n" +
"var res = await app.dispatch('GET', '/users');\n" +
"assert(res.statusCode === 200, 'expected 200');\n" +
"assert(Array.isArray(res.body), 'body should be an array of users, got ' + Object.prototype.toString.call(res.body));\n" +
"assert(res.body.length >= 3, 'expected at least the 3 seed users');\n" +
"var bea = res.body.find(function (u) { return u.id === 2; });\n" +
"assert(bea && bea.name === 'Bea', 'seed user Bea should be present');",
      },
      {
        name: "GET /users/:id returns the user the URL names",
        body:
"var app = createApp();\n" +
"var res = await app.dispatch('GET', '/users/12');\n" +
"assert(res.statusCode === 200, 'expected 200, got ' + res.statusCode);\n" +
"assert(res.body && res.body.name === 'Dana', 'user 12 is Dana, got ' + JSON.stringify(res.body));",
      },
      {
        name: "GET /users/:id for a missing user is a 404",
        body:
"var app = createApp();\n" +
"var res = await app.dispatch('GET', '/users/999');\n" +
"assert(res.statusCode === 404, 'expected 404 for a missing user, got ' + res.statusCode + ' with body ' + JSON.stringify(res.body));",
      },
      {
        name: "a throwing handler becomes a 500 via the error middleware — dispatch never rejects",
        body:
"var app = createApp();\n" +
"var settled = await app.dispatch('GET', '/reports/weekly').then(\n" +
"  function (res) { return res; },\n" +
"  function () { return null; }\n" +
");\n" +
"assert(settled !== null, 'dispatch rejected — the contract says it must always resolve with a response');\n" +
"assert(settled.statusCode === 500, 'expected 500, got ' + settled.statusCode);\n" +
"assert(settled.body && String(settled.body.error).indexOf('offline') !== -1, 'error body should carry the failure message');",
      },
      {
        name: "POST /users creates and returns 201",
        body:
"var app = createApp();\n" +
"var res = await app.dispatch('POST', '/users', { name: 'Eve' });\n" +
"assert(res.statusCode === 201, 'expected 201, got ' + res.statusCode);\n" +
"assert(res.body && res.body.name === 'Eve' && typeof res.body.id === 'number', 'created user should come back with an id');",
      },
    ],
    bugs: [
      {
        title: "GET /users never awaits the database",
        clazz: "missing-await",
        hints: [
          "The list endpoint responds instantly and the body serializes as {}. Log `users` inside the handler — what is it?",
          "Promise { <pending> }. The handler isn't async and dbListUsers() was never awaited, so the pending promise itself was passed to res.json.",
          "Make the handler async and await the query: `var users = await dbListUsers();` (matching the other handlers).",
        ],
        symptom: "<code>GET /users</code> responds with an empty object instead of the array — and suspiciously fast.",
        trace: "<code>console.log(users)</code> in the handler prints <code>Promise { &lt;pending&gt; }</code>; <code>Array.isArray(res.body)</code> is false because the body IS the promise.",
        hypothesis: "The promise box, not its contents, was serialized. One handler missed the async/await treatment its siblings got.",
        fix: "Await like every other handler.",
        diff:
"- router.register('GET', '/users', function (req, res) {\n" +
"-   var users = dbListUsers();\n" +
"+ router.register('GET', '/users', async function (req, res) {\n" +
"+   var users = await dbListUsers();\n" +
"    res.json(users);\n" +
"  });",
        why: "A promise is a normal object, so passing it where a value belongs never errors at the call site — it just serializes as {} (promises have no enumerable properties). Instant responses from an async data path are the reliable tell that nobody waited.",
      },
      {
        title: "dispatch has no rejection path — handler errors leak out",
        clazz: "unhandled-rejection",
        hints: [
          "The router's contract (top of router.js) says dispatch always resolves. Which promise chain in dispatch is missing its failure branch?",
          "Promise.resolve(out).then(onFulfilled) has no onRejected. When the handler's async function rejects, the rejection sails straight through dispatch to the caller — errorHandler is never invoked.",
          "Give the .then a second argument (or add .catch): call errorHandler(err, req, res) and resolve with res.",
        ],
        symptom: "A throwing handler makes <code>dispatch(...)</code> itself reject; the error middleware never runs and callers crash.",
        trace: "A <code>console.log</code> inside <code>errorHandler</code> never fires; instead the worker reports <code>Uncaught (in promise): report generator offline</code> when the caller doesn't catch.",
        hypothesis: "The success path was wired, the failure path forgotten — the default errorHandler exists but nothing routes rejections into it.",
        fix: "Handle both settlement branches and always return res.",
        diff:
"          var req = { method: method, path: path, params: params, body: payload };\n" +
"-         var out = routes[i].handler(req, res);\n" +
"-         return Promise.resolve(out).then(function () { return res; });\n" +
"+         var out;\n" +
"+         try {\n" +
"+           out = routes[i].handler(req, res);\n" +
"+         } catch (err) {\n" +
"+           errorHandler(err, req, res);\n" +
"+           return Promise.resolve(res);\n" +
"+         }\n" +
"+         return Promise.resolve(out).then(\n" +
"+           function () { return res; },\n" +
"+           function (err) { errorHandler(err, req, res); return res; }\n" +
"+         );",
        why: "Every promise chain needs an owner for its failures. Middleware frameworks exist largely to guarantee that ownership; when the adapter between handlers and responses drops the rejected branch, every handler bug escalates from '500 response' to 'process-level unhandled rejection'. Note the sync try/catch too — handlers can throw before ever returning a promise.",
      },
      {
        title: "Found-vs-missing boundary: /users/:id returns 200 null",
        clazz: "boundary-condition",
        hints: [
          "dbGetUser resolves with null for unknown ids — it doesn't throw. What does the handler do with that null?",
          "It serializes it with the default 200. 'Query succeeded, zero rows' and 'resource exists' are different statements; the handler conflates them.",
          "Branch on the empty result: if (!user) return res.status(404).json({ error: 'user not found' });",
        ],
        symptom: "Requests for nonexistent users succeed with a body of <code>null</code>; clients treat it as a real (empty) user.",
        trace: "<code>console.log(user)</code> → <code>null</code>, then <code>res.statusCode</code> stays at its default 200 straight through <code>res.json(null)</code>.",
        hypothesis: "The DB models absence as a null value, not an error, so HTTP-level absence handling is the handler's job — and it was skipped.",
        fix: "Explicit 404 branch before the happy path.",
        diff:
"  router.register('GET', '/users/:id', async function (req, res) {\n" +
"    var user = await dbGetUser(req.params.id);\n" +
"+   if (!user) return res.status(404).json({ error: 'user not found' });\n" +
"    res.json(user);\n" +
"  });",
        why: "&ldquo;The operation succeeded&rdquo; and &ldquo;the thing exists&rdquo; are separate axes, and the boundary between them is where APIs quietly lie. Every lookup endpoint needs a deliberate decision for the empty case — 404, 200-with-flag, or error — made in code, not by whatever the defaults happen to produce.",
      },
      {
        title: "Param extraction slices the value's first character off",
        clazz: "off-by-one",
        hints: [
          "/users/12 serves user 2, /users/5 serves nobody. That looks like the id is losing its FIRST character. Log the params object dispatch builds.",
          "params.id is '2' for /users/12. The matcher calls segs[i].slice(1) on the VALUE — slice(1) belongs on the pattern segment (to strip the ':'), not on the path segment.",
          "params[pSegs[i].slice(1)] = segs[i]; — strip the colon from the name, take the value whole.",
        ],
        symptom: "Every route param arrives with its first character missing: id 12 becomes 2, id 5 becomes the empty string.",
        trace: "<code>console.log(params)</code> → <code>{ id: '2' }</code> for <code>/users/12</code>. The colon-stripping slice was applied to both sides of the assignment.",
        hypothesis: "A copy-paste of <code>.slice(1)</code>: correct on the pattern segment (removing <code>:</code>), destructive on the value segment.",
        fix: "Slice only the name.",
        diff:
"      if (pSegs[i].charAt(0) === ':') {\n" +
"-       params[pSegs[i].slice(1)] = segs[i].slice(1);\n" +
"+       params[pSegs[i].slice(1)] = segs[i];\n" +
"      }",
        why: "Symmetric-looking code is where copy-paste bugs hide: the two slice(1) calls look like a matched pair but serve opposite purposes. When a value is consistently wrong by its first/last character, hunt for a slice/substring applied one level too broadly.",
      },
    ],
    fixedFiles: [
      {
        name: "db.js",
        content:
"var USERS = [\n" +
"  { id: 2, name: 'Bea' },\n" +
"  { id: 5, name: 'Carl' },\n" +
"  { id: 12, name: 'Dana' },\n" +
"];\n" +
"var NEXT_ID = 100;\n" +
"\n" +
"function dbDelay() {\n" +
"  return new Promise(function (r) { setTimeout(r, 5); });\n" +
"}\n" +
"\n" +
"function dbListUsers() {\n" +
"  return dbDelay().then(function () { return USERS.slice(); });\n" +
"}\n" +
"\n" +
"function dbGetUser(id) {\n" +
"  return dbDelay().then(function () {\n" +
"    return USERS.find(function (u) { return u.id === Number(id); }) || null;\n" +
"  });\n" +
"}\n" +
"\n" +
"function dbCreateUser(name) {\n" +
"  return dbDelay().then(function () {\n" +
"    if (!name) throw new Error('name required');\n" +
"    var u = { id: NEXT_ID++, name: name };\n" +
"    USERS.push(u);\n" +
"    return u;\n" +
"  });\n" +
"}\n" +
"\n" +
"function buildWeeklyReport() {\n" +
"  return dbDelay().then(function () {\n" +
"    throw new Error('report generator offline');\n" +
"  });\n" +
"}\n",
      },
      {
        name: "router.js",
        content:
"function createRouter() {\n" +
"  var routes = [];\n" +
"  var errorHandler = function (err, req, res) {\n" +
"    res.status(500).json({ error: String((err && err.message) || err) });\n" +
"  };\n" +
"\n" +
"  function makeRes() {\n" +
"    return {\n" +
"      statusCode: 200,\n" +
"      body: undefined,\n" +
"      status: function (code) { this.statusCode = code; return this; },\n" +
"      json: function (obj) { this.body = obj; return this; },\n" +
"    };\n" +
"  }\n" +
"\n" +
"  function matchRoute(route, method, path) {\n" +
"    if (route.method !== method) return null;\n" +
"    var pSegs = route.pattern.split('/');\n" +
"    var segs = path.split('/');\n" +
"    if (pSegs.length !== segs.length) return null;\n" +
"    var params = {};\n" +
"    for (var i = 0; i < pSegs.length; i++) {\n" +
"      if (pSegs[i].charAt(0) === ':') {\n" +
"        params[pSegs[i].slice(1)] = segs[i];\n" +
"      } else if (pSegs[i] !== segs[i]) {\n" +
"        return null;\n" +
"      }\n" +
"    }\n" +
"    return params;\n" +
"  }\n" +
"\n" +
"  return {\n" +
"    register: function (method, pattern, handler) {\n" +
"      routes.push({ method: method, pattern: pattern, handler: handler });\n" +
"    },\n" +
"    onError: function (fn) { errorHandler = fn; },\n" +
"    dispatch: function (method, path, payload) {\n" +
"      var res = makeRes();\n" +
"      for (var i = 0; i < routes.length; i++) {\n" +
"        var params = matchRoute(routes[i], method, path);\n" +
"        if (params) {\n" +
"          var req = { method: method, path: path, params: params, body: payload };\n" +
"          var out;\n" +
"          try {\n" +
"            out = routes[i].handler(req, res);\n" +
"          } catch (err) {\n" +
"            errorHandler(err, req, res);\n" +
"            return Promise.resolve(res);\n" +
"          }\n" +
"          return Promise.resolve(out).then(\n" +
"            function () { return res; },\n" +
"            function (err) { errorHandler(err, req, res); return res; }\n" +
"          );\n" +
"        }\n" +
"      }\n" +
"      res.status(404).json({ error: 'no route for ' + method + ' ' + path });\n" +
"      return Promise.resolve(res);\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "app.js",
        content:
"function createApp() {\n" +
"  var router = createRouter();\n" +
"\n" +
"  router.register('GET', '/users', async function (req, res) {\n" +
"    var users = await dbListUsers();\n" +
"    res.json(users);\n" +
"  });\n" +
"\n" +
"  router.register('GET', '/users/:id', async function (req, res) {\n" +
"    var user = await dbGetUser(req.params.id);\n" +
"    if (!user) return res.status(404).json({ error: 'user not found' });\n" +
"    res.json(user);\n" +
"  });\n" +
"\n" +
"  router.register('POST', '/users', async function (req, res) {\n" +
"    var created = await dbCreateUser(req.body && req.body.name);\n" +
"    res.status(201).json(created);\n" +
"  });\n" +
"\n" +
"  router.register('GET', '/reports/weekly', async function (req, res) {\n" +
"    var data = await buildWeeklyReport();\n" +
"    res.json(data);\n" +
"  });\n" +
"\n" +
"  return router;\n" +
"}\n",
      },
    ],
  });

  /* ================================================================
     8. Token-Bucket Rate Limiter — boundary, unit mismatch, clamp, floor
     ================================================================ */
  EX.push({
    slug: "token-bucket",
    name: "Token-Bucket Rate Limiter",
    kind: "worker",
    difficulty: "Hard",
    minutes: 40,
    summary: "The limiter wastes the last token, refills 1000x too fast, and hoards after idle weekends",
    brief:
      "<p>The API gateway team wrote this token-bucket limiter. Time is injected through a <b>fake clock</b> (<code>clock.js</code>) so every behavior is deterministic — drive it with <code>clock.advance(ms)</code>; the clock and the tests are not where the bugs live.</p>" +
      "<p>Incidents attributed to it so far:</p>" +
      "<ul>" +
      "<li>&ldquo;Clients get denied while the dashboard still shows 1 token left.&rdquo;</li>" +
      "<li>&ldquo;Half a second of quiet and a supposedly-empty bucket springs back to hundreds of tokens.&rdquo;</li>" +
      "<li>&ldquo;After an idle weekend a burst of thousands of requests sails through — way past the configured capacity.&rdquo;</li>" +
      "<li>&ldquo;Under slow, steady traffic the bucket <em>never</em> refills at all.&rdquo;</li>" +
      "</ul>" +
      "<p>The spec: <code>capacity</code> tokens max, refilled continuously at <code>refillPerSec</code> tokens per second with <b>fractional accrual</b>, and a request for <code>n</code> tokens succeeds whenever at least <code>n</code> are available.</p>",
    files: [
      {
        name: "clock.js",
        content:
"// Deterministic fake clock (milliseconds). Tests drive time by hand —\n" +
"// no real timers are involved in refill logic.\n" +
"function createFakeClock(startMs) {\n" +
"  var now = startMs || 0;\n" +
"  return {\n" +
"    now: function () { return now; },\n" +
"    advance: function (ms) { now += ms; },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "bucket.js",
        content:
"// Token bucket. Spec:\n" +
"//  - at most `capacity` tokens, bucket starts full\n" +
"//  - refills continuously at `refillPerSec` tokens per second,\n" +
"//    with FRACTIONAL accrual (0.3 tokens is real progress)\n" +
"//  - tryRemove(n) succeeds whenever at least n tokens are available\n" +
"function createBucket(opts) {\n" +
"  var capacity = opts.capacity;\n" +
"  var rate = opts.refillPerSec;\n" +
"  var clock = opts.clock;\n" +
"  var tokens = capacity;\n" +
"  var lastRefill = clock.now();\n" +
"\n" +
"  function refill() {\n" +
"    var nowMs = clock.now();\n" +
"    var add = Math.floor((nowMs - lastRefill) * rate);\n" +
"    tokens = tokens + add;\n" +
"    lastRefill = nowMs;\n" +
"  }\n" +
"\n" +
"  return {\n" +
"    tryRemove: function (n) {\n" +
"      refill();\n" +
"      if (tokens > n) {\n" +
"        tokens -= n;\n" +
"        return true;\n" +
"      }\n" +
"      return false;\n" +
"    },\n" +
"    available: function () {\n" +
"      refill();\n" +
"      return tokens;\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "limiter.js",
        content:
"// Per-key limiter: one independent bucket per client key.\n" +
"function createLimiter(opts) {\n" +
"  var buckets = {};\n" +
"  return {\n" +
"    allow: function (key) {\n" +
"      if (!buckets[key]) {\n" +
"        buckets[key] = createBucket({\n" +
"          capacity: opts.capacity,\n" +
"          refillPerSec: opts.refillPerSec,\n" +
"          clock: opts.clock,\n" +
"        });\n" +
"      }\n" +
"      return buckets[key].tryRemove(1);\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
    ],
    tests: [
      {
        name: "allows requests while plenty of tokens remain",
        body:
"var clock = createFakeClock();\n" +
"var b = createBucket({ capacity: 5, refillPerSec: 1, clock: clock });\n" +
"assert(b.tryRemove(1) === true, 'first request should pass');\n" +
"assert(b.tryRemove(1) === true, 'second request should pass');\n" +
"assert(b.tryRemove(1) === true, 'third request should pass');",
      },
      {
        name: "denies a request the bucket cannot cover",
        body:
"var clock = createFakeClock();\n" +
"var b = createBucket({ capacity: 2, refillPerSec: 1, clock: clock });\n" +
"assert(b.tryRemove(5) === false, 'a 5-token request against 2 tokens must be denied');",
      },
      {
        name: "the last token is spendable (exactly n tokens covers n)",
        body:
"var clock = createFakeClock();\n" +
"var b = createBucket({ capacity: 3, refillPerSec: 1, clock: clock });\n" +
"assert(b.tryRemove(1) === true, '3 tokens: request 1 should pass');\n" +
"assert(b.tryRemove(1) === true, '2 tokens: request 2 should pass');\n" +
"assert(b.tryRemove(1) === true, '1 token left must still cover a 1-token request');\n" +
"assert(b.tryRemove(1) === false, '0 tokens: request must be denied');",
      },
      {
        name: "refill is measured in seconds, not milliseconds",
        body:
"var clock = createFakeClock();\n" +
"var b = createBucket({ capacity: 10, refillPerSec: 2, clock: clock });\n" +
"assert(b.tryRemove(8) === true, 'drain 8 of 10');\n" +
"clock.advance(1000); // exactly one second at 2 tokens/sec\n" +
"var av = b.available();\n" +
"assert(av === 4, 'after 1s at 2/sec, 2 remaining + 2 refilled = 4 tokens, got ' + av);",
      },
      {
        name: "an idle bucket never exceeds its capacity",
        body:
"var clock = createFakeClock();\n" +
"var b = createBucket({ capacity: 3, refillPerSec: 1, clock: clock });\n" +
"clock.advance(60000); // a full idle minute\n" +
"var av = b.available();\n" +
"assert(av === 3, 'capacity is the ceiling — expected 3, got ' + av);",
      },
      {
        name: "slow steady polling still accrues fractional tokens",
        body:
"var clock = createFakeClock();\n" +
"var b = createBucket({ capacity: 5, refillPerSec: 1, clock: clock });\n" +
"assert(b.tryRemove(4) === true, 'drain to 1 token');\n" +
"for (var i = 0; i < 4; i++) {\n" +
"  clock.advance(300); // poll every 300ms — under one whole token per poll\n" +
"  b.available();\n" +
"}\n" +
"var av = b.available();\n" +
"assert(av > 2 && av <= 5, '1 + 4×0.3 tokens should have accrued (~2.2), got ' + av);",
      },
      {
        name: "limiter keys get independent buckets",
        body:
"var clock = createFakeClock();\n" +
"var lim = createLimiter({ capacity: 3, refillPerSec: 1, clock: clock });\n" +
"assert(lim.allow('alice') === true, 'alice #1');\n" +
"assert(lim.allow('alice') === true, 'alice #2');\n" +
"assert(lim.allow('bob') === true, 'bob must have his own full bucket');",
      },
    ],
    bugs: [
      {
        title: "tryRemove demands MORE than n tokens: > instead of >=",
        clazz: "boundary-condition",
        hints: [
          "A bucket showing exactly 1 token denies a 1-token request. Log `tokens` and `n` right before the comparison.",
          "tokens > n is false when tokens === n. The spec says 'succeeds whenever at least n are available' — at least means >=.",
          "if (tokens >= n) { ... }",
        ],
        symptom: "The last token is unspendable; every bucket behaves as if its capacity were one smaller.",
        trace: "<code>console.log(tokens, n, tokens &gt; n)</code> → <code>1 1 false</code>. The equality case — the boundary the spec explicitly names — is excluded.",
        hypothesis: "The comparison encodes &ldquo;strictly more than n&rdquo; where the spec says &ldquo;at least n&rdquo;.",
        fix: "Inclusive comparison.",
        diff:
"      refill();\n" +
"-     if (tokens > n) {\n" +
"+     if (tokens >= n) {\n" +
"        tokens -= n;",
        why: "&ldquo;At least&rdquo;, &ldquo;more than&rdquo;, &ldquo;up to&rdquo; — spec language maps one-to-one onto &gt;=, &gt;, &lt;=; translating it sloppily shifts every threshold by one. Test the equality case of every limit explicitly, because that's the exact case users hit when they spend their budget to zero.",
      },
      {
        title: "Refill multiplies milliseconds by a per-second rate",
        clazz: "unit-mismatch",
        hints: [
          "500ms of idle produces hundreds of tokens. The rate is 'per second' — what unit is (nowMs - lastRefill) in?",
          "Milliseconds. elapsedMs × tokensPerSecond is off by exactly 1000. The clock module even says milliseconds in its header comment.",
          "Convert first: ((nowMs - lastRefill) / 1000) * rate.",
        ],
        symptom: "Refill is a thousand times too generous — a blink of idle time refills any bucket.",
        trace: "<code>console.log(nowMs - lastRefill, add)</code> → <code>500 500</code> at 1 token/sec: 500ms yielded 500 tokens instead of 0.5.",
        hypothesis: "Two units met at an interface without a conversion: the clock speaks milliseconds, the rate speaks seconds.",
        fix: "Divide by 1000 before applying the rate.",
        diff:
"  function refill() {\n" +
"    var nowMs = clock.now();\n" +
"-   var add = Math.floor((nowMs - lastRefill) * rate);\n" +
"+   var add = ((nowMs - lastRefill) / 1000) * rate;\n" +
"    tokens = tokens + add;",
        why: "Unit bugs are silent because numbers carry no units — only names do. Suffix every quantity with its unit (elapsedMs, ratePerSec) and convert at the border where the two meet, once. A factor-of-1000 error is a millisecond/second mismatch essentially every time.",
      },
      {
        title: "Refill never clamps to capacity",
        clazz: "missing-clamp",
        hints: [
          "After a long idle stretch the bucket holds thousands of tokens. What bounds `tokens` from above?",
          "Nothing. tokens = tokens + add grows without limit; capacity is only ever read at construction. That's the burst-after-idle incident.",
          "Clamp on every refill: tokens = Math.min(capacity, tokens + add).",
        ],
        symptom: "A weekend of idle time banks unlimited burst credit; the configured capacity is meaningless after quiet periods.",
        trace: "<code>console.log(tokens, capacity)</code> after a long <code>advance</code> → <code>60003 3</code>. The variable sails past its documented ceiling.",
        hypothesis: "The invariant tokens &le; capacity was assumed rather than enforced; only the happy path (frequent traffic) kept it accidentally true.",
        fix: "Enforce the ceiling at the single place tokens increase.",
        diff:
"    var add = ((nowMs - lastRefill) / 1000) * rate;\n" +
"-   tokens = tokens + add;\n" +
"+   tokens = Math.min(capacity, tokens + add);\n" +
"    lastRefill = nowMs;",
        why: "The whole point of a token bucket is the cap — capacity IS the burst limit. An invariant that isn't enforced in code is a comment. Clamp where the value changes, not in the consumers, so no future call site can forget it.",
      },
      {
        title: "Flooring the refill discards fractional time forever",
        clazz: "integer-truncation",
        hints: [
          "Under steady sub-second polling the bucket never gains a single token. What does refill add for a 300ms gap at 1 token/sec — and what happens to lastRefill afterward?",
          "Math.floor(0.3) is 0 tokens — but lastRefill still jumps forward, so the 300ms is not just deferred, it's erased. Poll fast enough and refill is permanently zero.",
          "Drop the floor: accrue fractional tokens (the spec calls for it). Fractions accumulate across calls and whole tokens emerge naturally.",
        ],
        symptom: "With frequent polling the bucket starves forever; with rare polling it refills fine — the more you look, the less you get.",
        trace: "Log per call: <code>elapsed 300ms → add 0, lastRefill advanced</code>, four times in a row. 1200ms of real time produced 0 tokens because each slice was rounded down and then forgotten.",
        hypothesis: "Flooring plus unconditionally advancing <code>lastRefill</code> throws away the sub-token remainder on every call — an accumulation of small truncations that sums to total starvation.",
        fix: "Keep tokens fractional; only the comparison against n needs whole-number semantics, and &ge; handles that already.",
        diff:
"-   var add = Math.floor((nowMs - lastRefill) * rate);\n" +
"+   var add = ((nowMs - lastRefill) / 1000) * rate;\n" +
"    tokens = Math.min(capacity, tokens + add);",
        why: "Truncate-and-advance is a classic compound bug: rounding alone would only delay progress, but pairing it with resetting the reference point destroys the remainder each cycle. Either accrue fractionally, or floor the tokens while advancing lastRefill only by the time you actually banked.",
      },
    ],
    fixedFiles: [
      {
        name: "clock.js",
        content:
"function createFakeClock(startMs) {\n" +
"  var now = startMs || 0;\n" +
"  return {\n" +
"    now: function () { return now; },\n" +
"    advance: function (ms) { now += ms; },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "bucket.js",
        content:
"function createBucket(opts) {\n" +
"  var capacity = opts.capacity;\n" +
"  var rate = opts.refillPerSec;\n" +
"  var clock = opts.clock;\n" +
"  var tokens = capacity;\n" +
"  var lastRefill = clock.now();\n" +
"\n" +
"  function refill() {\n" +
"    var nowMs = clock.now();\n" +
"    var add = ((nowMs - lastRefill) / 1000) * rate;\n" +
"    tokens = Math.min(capacity, tokens + add);\n" +
"    lastRefill = nowMs;\n" +
"  }\n" +
"\n" +
"  return {\n" +
"    tryRemove: function (n) {\n" +
"      refill();\n" +
"      if (tokens >= n) {\n" +
"        tokens -= n;\n" +
"        return true;\n" +
"      }\n" +
"      return false;\n" +
"    },\n" +
"    available: function () {\n" +
"      refill();\n" +
"      return tokens;\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
      {
        name: "limiter.js",
        content:
"function createLimiter(opts) {\n" +
"  var buckets = {};\n" +
"  return {\n" +
"    allow: function (key) {\n" +
"      if (!buckets[key]) {\n" +
"        buckets[key] = createBucket({\n" +
"          capacity: opts.capacity,\n" +
"          refillPerSec: opts.refillPerSec,\n" +
"          clock: opts.clock,\n" +
"        });\n" +
"      }\n" +
"      return buckets[key].tryRemove(1);\n" +
"    },\n" +
"  };\n" +
"}\n",
      },
    ],
  });
})();
