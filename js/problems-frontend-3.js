/* PracticeRank frontend problem bank III — the six UI archetypes.
 * Modal · Autocomplete · Tabs · Toast · Nested comments · Infinite scroll.
 * These are the components that live-build rounds ask for over and over. Each one is graded on
 * behaviour (keyboard, focus, async races, a11y roles), not on how it looks.
 * Same schema as js/problems-frontend-2.js: type "react", component named App, DOM-assertion tests,
 * and a `solution` object with a reference implementation + explanation.
 * Test helpers: $, $$, tid(id), click(el), setValue(el, v), flush(), sleep(ms), assert(cond, msg)
 */
(function () {
  "use strict";
  window.FRONTEND_PROBLEMS = window.FRONTEND_PROBLEMS || [];
  window.FRONTEND_PROBLEMS.push(
  /* ============================ 1. MODAL ============================ */
  {
    slug: "ui-modal-dialog",
    name: "Build: Accessible Modal Dialog",
    category: "UI Archetypes",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "58.20%",
    statement: `
<p>Build a modal dialog the way a design-system team would ship it. Looks do not matter here;
what is graded is <strong>open/close behaviour, keyboard handling, and focus management</strong>.</p>
<h3>Requirements</h3>
<ul>
<li>A trigger button <code>data-testid="open-btn"</code> opens the modal. Nothing with <code>role="dialog"</code> exists in the DOM while it is closed.</li>
<li>When open, render an overlay <code>data-testid="overlay"</code> containing the dialog element <code>data-testid="dialog"</code> with <code>role="dialog"</code>, <code>aria-modal="true"</code>, and <code>aria-labelledby</code> pointing at the id of its heading.</li>
<li>The dialog has a close button <code>data-testid="close-btn"</code>.</li>
<li>It closes on: the close button, pressing <kbd>Escape</kbd> anywhere, or clicking the overlay backdrop. Clicking <em>inside</em> the dialog content must <strong>not</strong> close it.</li>
<li>On open, focus moves inside the dialog (the close button is fine). On close, focus returns to the trigger button.</li>
<li>Show <code>data-testid="status"</code> with the text <code>open</code> or <code>closed</code>.</li>
</ul>`,
    starter: `function Modal({ isOpen, onClose, title, children }) {
    // TODO: return null when closed. When open, render the overlay + dialog with the
    // roles/ids from the statement, handle Escape + backdrop click, and manage focus.
    if (!isOpen) return null;
    return (
        <div data-testid="overlay">
            <div data-testid="dialog">
                <h2 id="modal-title">{title}</h2>
                {children}
                <button data-testid="close-btn" onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

function App() {
    const [open, setOpen] = React.useState(false);
    return (
        <div>
            <button data-testid="open-btn" onClick={() => setOpen(true)}>Open settings</button>
            <div>status: <span data-testid="status">{open ? "open" : "closed"}</span></div>
            <Modal isOpen={open} onClose={() => setOpen(false)} title="Settings">
                <p data-testid="dialog-body">Notification preferences go here.</p>
            </Modal>
        </div>
    );
}`,
    tests: [
      { name: "starts closed with no dialog in the DOM", sample: true,
        body: `assert(tid('status').textContent === 'closed', 'status should be "closed"');
assert(!$('[role="dialog"]'), 'No role="dialog" element may exist while closed');` },
      { name: "opens with the right roles and labelling", sample: true,
        body: `await click(tid('open-btn'));
var d = tid('dialog');
assert(d, 'dialog did not render');
assert(d.getAttribute('role') === 'dialog', 'dialog needs role="dialog"');
assert(d.getAttribute('aria-modal') === 'true', 'dialog needs aria-modal="true"');
var lb = d.getAttribute('aria-labelledby');
assert(lb && document.getElementById(lb), 'aria-labelledby must reference the heading id');
assert(document.getElementById(lb).textContent.indexOf('Settings') !== -1, 'the labelled heading should contain the title');
assert(tid('status').textContent === 'open', 'status should be "open"');` },
      { name: "close button closes it", sample: true,
        body: `await click(tid('open-btn'));
await click(tid('close-btn'));
assert(!tid('dialog'), 'dialog should be gone after clicking close');
assert(tid('status').textContent === 'closed', 'status should be "closed"');` },
      { name: "Escape closes it", sample: false,
        body: `await click(tid('open-btn'));
assert(tid('dialog'), 'dialog should be open');
(document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await flush();
assert(!tid('dialog'), 'Escape must close the dialog');` },
      { name: "backdrop click closes, content click does not", sample: false,
        body: `await click(tid('open-btn'));
await click(tid('dialog-body'));
assert(tid('dialog'), 'Clicking inside the dialog content must NOT close it');
await click(tid('overlay'));
assert(!tid('dialog'), 'Clicking the overlay backdrop must close it');` },
      { name: "focus moves into the dialog and back to the trigger", sample: false,
        body: `tid('open-btn').focus();
await click(tid('open-btn'));
await sleep(60);
assert(tid('dialog').contains(document.activeElement), 'On open, focus must be inside the dialog (activeElement is ' + (document.activeElement && document.activeElement.tagName) + ')');
await click(tid('close-btn'));
await sleep(60);
assert(document.activeElement === tid('open-btn'), 'On close, focus must return to the trigger button');` },
    ],
    solution: {
      code: `function Modal({ isOpen, onClose, title, children }) {
    const closeRef = React.useRef(null);
    const returnRef = React.useRef(null);

    React.useEffect(() => {
        if (!isOpen) return;
        returnRef.current = document.activeElement;
        if (closeRef.current) closeRef.current.focus();
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            if (returnRef.current && returnRef.current.focus) returnRef.current.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    return (
        <div
            data-testid="overlay"
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "grid", placeItems: "center" }}
        >
            <div
                data-testid="dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                onClick={(e) => e.stopPropagation()}
                style={{ background: "#fff", padding: 16, borderRadius: 8, minWidth: 260 }}
            >
                <h2 id="modal-title">{title}</h2>
                {children}
                <button ref={closeRef} data-testid="close-btn" onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

function App() {
    const [open, setOpen] = React.useState(false);
    const close = React.useCallback(() => setOpen(false), []);
    return (
        <div>
            <button data-testid="open-btn" onClick={() => setOpen(true)}>Open settings</button>
            <div>status: <span data-testid="status">{open ? "open" : "closed"}</span></div>
            <Modal isOpen={open} onClose={close} title="Settings">
                <p data-testid="dialog-body">Notification preferences go here.</p>
            </Modal>
        </div>
    );
}`,
      explanation: `
<p>Three things separate a modal from a div that appears: <strong>roles</strong>, <strong>dismissal</strong>, and
<strong>focus</strong>. The roles are static attributes (<code>role="dialog"</code>, <code>aria-modal</code>,
<code>aria-labelledby</code> pointing at the heading) so screen readers announce a named dialog and stop reading the
page behind it.</p>
<p>Dismissal is where most candidates stumble. The Escape listener belongs on <code>document</code>, not on the dialog
element, because the user might have clicked somewhere outside and moved focus. Register it in an effect keyed on
<code>isOpen</code> and remove it in the cleanup, otherwise closed modals keep listening. Backdrop-click uses the
oldest trick in the DOM: <code>onClick</code> on the overlay closes, and the dialog content calls
<code>stopPropagation()</code> so clicks inside never reach the overlay. An alternative is
<code>e.target === e.currentTarget</code> on the overlay.</p>
<p>Focus management is the piece interviewers probe with "what happens for a keyboard user?" Snapshot
<code>document.activeElement</code> when opening, move focus into the dialog (the close button is the pragmatic
choice), and restore the snapshot in the effect cleanup, which runs on close or unmount. Note that
<code>onClose</code> is wrapped in <code>useCallback</code> in App so the effect does not re-subscribe every render.
A production version would also trap Tab inside the dialog and lock body scroll; both are natural follow-ups to
mention.</p>`,
    },
  },

  /* ============================ 2. AUTOCOMPLETE ============================ */
  {
    slug: "ui-autocomplete",
    name: "Build: Autocomplete with Keyboard + Stale-Response Guard",
    category: "UI Archetypes",
    type: "react",
    difficulty: "Hard",
    maxScore: 40,
    successRate: "41.06%",
    statement: `
<p>Build a search-as-you-type autocomplete on top of the wired async <code>searchFruits(query)</code>.
The catch: responses come back <strong>out of order</strong> (short queries are slower), so the component
must never show results for a query the user has already moved past.</p>
<h3>Requirements</h3>
<ul>
<li>Input <code>data-testid="ac-input"</code>. When empty, no list is rendered.</li>
<li>On every change, call <code>searchFruits(value)</code> and render the results as a <code>&lt;ul role="listbox" data-testid="ac-list"&gt;</code> of <code>&lt;li role="option"&gt;</code> items, each with <code>data-testid="ac-option"</code>.</li>
<li><strong>Stale responses are dropped:</strong> only the response for the latest query may render. Use a request counter or an "is current" flag.</li>
<li><kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> move the highlighted option (wrap around). The highlighted option has <code>aria-selected="true"</code>; all others <code>"false"</code>. Nothing is highlighted until the user presses an arrow.</li>
<li><kbd>Enter</kbd> with a highlighted option fills the input with its text and closes the list. Clicking an option does the same.</li>
<li><kbd>Escape</kbd> closes the list without changing the input.</li>
<li>The input has <code>aria-expanded</code> reflecting whether the list is shown.</li>
</ul>`,
    starter: `/* ---- Wired async data source. Do not change. ----
 * Shorter queries respond SLOWER, so "a" arrives after "ap". Handle it. */
const FRUITS = ["Apple", "Apricot", "Avocado", "Banana", "Blueberry", "Cherry", "Date", "Fig", "Grape", "Kiwi", "Mango", "Peach", "Pear", "Plum"];
function searchFruits(query) {
    const q = query.trim().toLowerCase();
    const delay = q.length >= 2 ? 30 : 160;
    return new Promise((resolve) => {
        setTimeout(() => resolve(FRUITS.filter((f) => f.toLowerCase().startsWith(q))), delay);
    });
}

function Autocomplete() {
    const [value, setValue] = React.useState("");
    const [items, setItems] = React.useState([]);
    // TODO: open/close state, highlighted index, stale-response guard, keyboard handling.

    function onChange(e) {
        const v = e.target.value;
        setValue(v);
        searchFruits(v).then(setItems); // BUG: stale responses overwrite fresh ones
    }

    return (
        <div>
            <input data-testid="ac-input" value={value} onChange={onChange} placeholder="Search fruit…" />
            {value && (
                <ul role="listbox" data-testid="ac-list">
                    {items.map((it) => (
                        <li key={it} role="option" data-testid="ac-option">{it}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function App() {
    return <Autocomplete />;
}`,
    tests: [
      { name: "empty input shows no list", sample: true,
        body: `assert(!tid('ac-list'), 'No list should render while the input is empty');
assert(tid('ac-input').getAttribute('aria-expanded') === 'false', 'aria-expanded should be "false" when closed');` },
      { name: "typing shows matching options", sample: true,
        body: `setValue(tid('ac-input'), 'ap'); await sleep(120);
var opts = $$('[data-testid="ac-option"]').map(function (o) { return o.textContent.trim(); });
assert(opts.join(',') === 'Apple,Apricot', 'Expected Apple,Apricot got ' + opts.join(','));
assert(tid('ac-list').getAttribute('role') === 'listbox', 'list needs role="listbox"');
assert(tid('ac-input').getAttribute('aria-expanded') === 'true', 'aria-expanded should be "true" when open');` },
      { name: "stale response for an older query is dropped", sample: true,
        body: `setValue(tid('ac-input'), 'a');
await sleep(10);
setValue(tid('ac-input'), 'ap');
await sleep(320);
var opts = $$('[data-testid="ac-option"]').map(function (o) { return o.textContent.trim(); });
assert(opts.join(',') === 'Apple,Apricot', 'The slow "a" response (3 items) arrived after "ap" and must be ignored. Got: ' + opts.join(','));` },
      { name: "arrow keys highlight with wrap-around", sample: false,
        body: `var inp = tid('ac-input');
setValue(inp, 'p'); await sleep(240);
function key(k) { inp.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); return flush(); }
var sel = function () { return $$('[data-testid="ac-option"]').map(function (o) { return o.getAttribute('aria-selected'); }).join(','); };
assert(sel() === 'false,false,false', 'Nothing highlighted before any arrow key, got ' + sel());
await key('ArrowDown');
assert(sel() === 'true,false,false', 'ArrowDown should highlight the first option, got ' + sel());
await key('ArrowDown'); await key('ArrowDown');
assert(sel() === 'false,false,true', 'Two more ArrowDowns should reach the last option, got ' + sel());
await key('ArrowDown');
assert(sel() === 'true,false,false', 'ArrowDown on the last option wraps to the first, got ' + sel());
await key('ArrowUp');
assert(sel() === 'false,false,true', 'ArrowUp on the first option wraps to the last, got ' + sel());` },
      { name: "Enter selects the highlighted option and closes", sample: false,
        body: `var inp = tid('ac-input');
setValue(inp, 'b'); await sleep(240);
function key(k) { inp.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); return flush(); }
await key('ArrowDown'); await key('ArrowDown');
await key('Enter');
assert(inp.value === 'Blueberry', 'Enter should fill the input with the highlighted option, got "' + inp.value + '"');
assert(!tid('ac-list'), 'List should close after selection');
assert(inp.getAttribute('aria-expanded') === 'false', 'aria-expanded should be "false" after selection');` },
      { name: "click selects; Escape closes without changing the value", sample: false,
        body: `var inp = tid('ac-input');
setValue(inp, 'pe'); await sleep(120);
await click($$('[data-testid="ac-option"]')[1]);
assert(inp.value === 'Pear', 'Clicking the second option should select Pear, got "' + inp.value + '"');
assert(!tid('ac-list'), 'List should close after click-select');
setValue(inp, 'ma'); await sleep(120);
assert(tid('ac-list'), 'List should reopen when typing again');
inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await flush();
assert(!tid('ac-list'), 'Escape should close the list');
assert(inp.value === 'ma', 'Escape must not change the input value');` },
    ],
    solution: {
      code: `const FRUITS = ["Apple", "Apricot", "Avocado", "Banana", "Blueberry", "Cherry", "Date", "Fig", "Grape", "Kiwi", "Mango", "Peach", "Pear", "Plum"];
function searchFruits(query) {
    const q = query.trim().toLowerCase();
    const delay = q.length >= 2 ? 30 : 160;
    return new Promise((resolve) => {
        setTimeout(() => resolve(FRUITS.filter((f) => f.toLowerCase().startsWith(q))), delay);
    });
}

function Autocomplete() {
    const [value, setValue] = React.useState("");
    const [items, setItems] = React.useState([]);
    const [open, setOpen] = React.useState(false);
    const [active, setActive] = React.useState(-1);
    const reqId = React.useRef(0);

    function runSearch(q) {
        const id = ++reqId.current;
        if (!q) { setItems([]); setOpen(false); return; }
        searchFruits(q).then((res) => {
            if (id !== reqId.current) return; // stale
            setItems(res);
            setOpen(true);
            setActive(-1);
        });
    }

    function onChange(e) {
        setValue(e.target.value);
        runSearch(e.target.value);
    }

    function select(text) {
        reqId.current++; // cancel anything in flight
        setValue(text);
        setItems([]);
        setOpen(false);
        setActive(-1);
    }

    function onKeyDown(e) {
        if (!open || items.length === 0) {
            if (e.key === "Escape") setOpen(false);
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
        } else if (e.key === "Enter") {
            if (active >= 0) { e.preventDefault(); select(items[active]); }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    }

    const showList = open && value.length > 0;
    return (
        <div>
            <input
                data-testid="ac-input"
                role="combobox"
                aria-expanded={showList ? "true" : "false"}
                aria-controls="ac-listbox"
                aria-autocomplete="list"
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder="Search fruit…"
            />
            {showList && (
                <ul id="ac-listbox" role="listbox" data-testid="ac-list">
                    {items.map((it, i) => (
                        <li
                            key={it}
                            role="option"
                            data-testid="ac-option"
                            aria-selected={i === active ? "true" : "false"}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => select(it)}
                            style={{ background: i === active ? "#e6f0ff" : "transparent", cursor: "pointer" }}
                        >
                            {it}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function App() {
    return <Autocomplete />;
}`,
      explanation: `
<p>The heart of this problem is the <strong>stale-response guard</strong>, and it is the thing interviewers are
really checking. Every search bumps a counter stored in a ref (<code>reqId</code>) and captures its own id in the
closure. When the promise resolves, it compares its id against the ref: if another request has started since, the
result is silently thrown away. That single comparison makes ordering irrelevant. An <code>AbortController</code>
achieves the same thing for real <code>fetch</code> calls and is worth mentioning, but the counter works with any
promise source and is what you can write in five minutes under pressure.</p>
<p>Keyboard handling is deliberately small: the active index lives in state, arrow keys move it modulo the list
length so it wraps, and Enter selects only when something is highlighted. <code>preventDefault()</code> on the arrow
keys stops the caret jumping to the ends of the input. Note the <code>onMouseDown</code> preventDefault on options;
without it the input blurs before the click lands, which is the classic "my click on a suggestion does nothing" bug
once you add blur-to-close.</p>
<p>The ARIA pattern is the WAI combobox: the input gets <code>role="combobox"</code>,
<code>aria-expanded</code>, and <code>aria-controls</code> pointing at the <code>listbox</code>; options carry
<code>aria-selected</code>. Selecting also bumps the request counter so an in-flight response cannot reopen the list
after the user has chosen. Follow-ups you should be ready for: debouncing the search, caching by query, and
<code>aria-activedescendant</code> so screen readers announce the highlighted option without moving DOM focus.</p>`,
    },
  },

  /* ============================ 3. TABS ============================ */
  {
    slug: "ui-tabs",
    name: "Build: Accessible Tabs (roving focus)",
    category: "UI Archetypes",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "62.74%",
    statement: `
<p>Build a tabs component that follows the WAI-ARIA tabs pattern. The data is a fixed array of
three tabs (already wired); your job is the roles, the wiring between tabs and panels, and
<strong>roving keyboard focus</strong>.</p>
<h3>Requirements</h3>
<ul>
<li>A container with <code>role="tablist"</code> (<code>data-testid="tablist"</code>) holding one <code>&lt;button role="tab"&gt;</code> per tab, each with <code>data-testid="tab-&lt;id&gt;"</code>.</li>
<li>Exactly one tab is selected at a time: <code>aria-selected="true"</code> on it, <code>"false"</code> on the rest. The first tab is selected initially.</li>
<li>Only the selected tab is in the Tab order: its <code>tabIndex</code> is <code>0</code>, the others are <code>-1</code>.</li>
<li>Each tab has <code>id="tab-&lt;id&gt;"</code> and <code>aria-controls="panel-&lt;id&gt;"</code>. Render <strong>only the selected panel</strong>: <code>&lt;div role="tabpanel" id="panel-&lt;id&gt;" aria-labelledby="tab-&lt;id&gt;" data-testid="panel"&gt;</code> containing the tab's content.</li>
<li>Clicking a tab selects it.</li>
<li>With focus on a tab: <kbd>ArrowRight</kbd> / <kbd>ArrowLeft</kbd> move selection <em>and</em> DOM focus to the next/previous tab, wrapping around. <kbd>Home</kbd> / <kbd>End</kbd> jump to first/last.</li>
</ul>`,
    starter: `const TABS = [
    { id: "overview", label: "Overview", content: "Product overview and highlights." },
    { id: "specs", label: "Specs", content: "Dimensions, weight, materials." },
    { id: "reviews", label: "Reviews", content: "4.6 stars from 1,204 reviews." },
];

function Tabs({ tabs }) {
    const [selected, setSelected] = React.useState(tabs[0].id);
    // TODO: roles, ids, aria-controls / aria-labelledby, roving tabIndex, arrow-key navigation.
    return (
        <div>
            <div data-testid="tablist">
                {tabs.map((t) => (
                    <button key={t.id} data-testid={"tab-" + t.id} onClick={() => setSelected(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>
            <div data-testid="panel">{tabs.find((t) => t.id === selected).content}</div>
        </div>
    );
}

function App() {
    return <Tabs tabs={TABS} />;
}`,
    tests: [
      { name: "renders tablist, three tabs, first selected", sample: true,
        body: `assert(tid('tablist').getAttribute('role') === 'tablist', 'container needs role="tablist"');
var tabs = $$('[role="tab"]');
assert(tabs.length === 3, 'Expected 3 role="tab" buttons, got ' + tabs.length);
assert(tid('tab-overview').getAttribute('aria-selected') === 'true', 'first tab should be selected');
assert(tid('tab-specs').getAttribute('aria-selected') === 'false', 'other tabs should be aria-selected="false"');
assert(tid('panel').textContent.indexOf('Product overview') !== -1, 'first panel content should show');` },
      { name: "panel wiring: ids, aria-controls, aria-labelledby, single panel", sample: true,
        body: `var t = tid('tab-overview');
assert(t.id === 'tab-overview', 'tab needs id="tab-overview"');
assert(t.getAttribute('aria-controls') === 'panel-overview', 'tab needs aria-controls="panel-overview"');
var panels = $$('[role="tabpanel"]');
assert(panels.length === 1, 'Only the selected panel should be rendered, found ' + panels.length);
assert(panels[0].id === 'panel-overview', 'panel needs id="panel-overview"');
assert(panels[0].getAttribute('aria-labelledby') === 'tab-overview', 'panel needs aria-labelledby="tab-overview"');` },
      { name: "click switches tab and panel; roving tabIndex", sample: true,
        body: `await click(tid('tab-specs'));
assert(tid('tab-specs').getAttribute('aria-selected') === 'true', 'Specs should be selected after click');
assert(tid('tab-overview').getAttribute('aria-selected') === 'false', 'Overview should be deselected');
assert(tid('panel').textContent.indexOf('Dimensions') !== -1, 'Specs panel content should show');
assert(tid('tab-specs').tabIndex === 0, 'selected tab tabIndex should be 0');
assert(tid('tab-overview').tabIndex === -1 && tid('tab-reviews').tabIndex === -1, 'unselected tabs tabIndex should be -1');` },
      { name: "ArrowRight / ArrowLeft move selection and focus, wrapping", sample: false,
        body: `function key(el, k) { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); return sleep(40); }
tid('tab-overview').focus();
await key(tid('tab-overview'), 'ArrowRight');
assert(tid('tab-specs').getAttribute('aria-selected') === 'true', 'ArrowRight should select Specs');
assert(document.activeElement === tid('tab-specs'), 'ArrowRight should move DOM focus to Specs');
await key(tid('tab-specs'), 'ArrowRight');
await key(tid('tab-reviews'), 'ArrowRight');
assert(tid('tab-overview').getAttribute('aria-selected') === 'true', 'ArrowRight from the last tab should wrap to the first');
await key(tid('tab-overview'), 'ArrowLeft');
assert(tid('tab-reviews').getAttribute('aria-selected') === 'true', 'ArrowLeft from the first tab should wrap to the last');
assert(document.activeElement === tid('tab-reviews'), 'focus should follow to Reviews');` },
      { name: "Home / End jump to first / last", sample: false,
        body: `function key(el, k) { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); return sleep(40); }
await click(tid('tab-specs'));
tid('tab-specs').focus();
await key(tid('tab-specs'), 'End');
assert(tid('tab-reviews').getAttribute('aria-selected') === 'true', 'End should select the last tab');
assert(tid('panel').textContent.indexOf('4.6 stars') !== -1, 'Reviews panel should show');
await key(tid('tab-reviews'), 'Home');
assert(tid('tab-overview').getAttribute('aria-selected') === 'true', 'Home should select the first tab');` },
    ],
    solution: {
      code: `const TABS = [
    { id: "overview", label: "Overview", content: "Product overview and highlights." },
    { id: "specs", label: "Specs", content: "Dimensions, weight, materials." },
    { id: "reviews", label: "Reviews", content: "4.6 stars from 1,204 reviews." },
];

function Tabs({ tabs }) {
    const [selected, setSelected] = React.useState(tabs[0].id);
    const refs = React.useRef({});

    function activate(index) {
        const t = tabs[(index + tabs.length) % tabs.length];
        setSelected(t.id);
        const el = refs.current[t.id];
        if (el) el.focus();
    }

    function onKeyDown(e, index) {
        const map = {
            ArrowRight: index + 1,
            ArrowLeft: index - 1,
            Home: 0,
            End: tabs.length - 1,
        };
        if (e.key in map) {
            e.preventDefault();
            activate(map[e.key]);
        }
    }

    const current = tabs.find((t) => t.id === selected);
    return (
        <div>
            <div role="tablist" aria-label="Product details" data-testid="tablist">
                {tabs.map((t, i) => {
                    const isSel = t.id === selected;
                    return (
                        <button
                            key={t.id}
                            ref={(el) => (refs.current[t.id] = el)}
                            role="tab"
                            id={"tab-" + t.id}
                            aria-selected={isSel ? "true" : "false"}
                            aria-controls={"panel-" + t.id}
                            tabIndex={isSel ? 0 : -1}
                            data-testid={"tab-" + t.id}
                            onClick={() => setSelected(t.id)}
                            onKeyDown={(e) => onKeyDown(e, i)}
                            style={{ fontWeight: isSel ? 700 : 400, borderBottom: isSel ? "2px solid #06f" : "2px solid transparent" }}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>
            <div
                role="tabpanel"
                id={"panel-" + current.id}
                aria-labelledby={"tab-" + current.id}
                data-testid="panel"
                tabIndex={0}
            >
                {current.content}
            </div>
        </div>
    );
}

function App() {
    return <Tabs tabs={TABS} />;
}`,
      explanation: `
<p>Tabs are mostly an <em>attributes</em> problem. The pattern is: a <code>tablist</code> of <code>tab</code>
buttons, each pointing at its <code>tabpanel</code> via <code>aria-controls</code>, and the panel pointing back with
<code>aria-labelledby</code>. Rendering only the selected panel keeps the DOM honest (nothing hidden but focusable)
and makes the id wiring trivial.</p>
<p>The behaviour interviewers listen for is <strong>roving tabindex</strong>: the whole tablist is a single Tab stop.
Only the selected tab has <code>tabIndex=0</code>; the rest are <code>-1</code> so Tab skips them, and arrow keys move
between them. Because arrow navigation must move real DOM focus (not just the highlight), keep a ref per tab and
call <code>.focus()</code> on activation. The <code>(index + length) % length</code> trick gives wrap-around in both
directions in one line, and a small key-to-index map keeps the handler flat instead of a switch.</p>
<p>This implementation uses "automatic activation" (arrow keys select immediately). The alternative, "manual
activation", moves focus with arrows and selects on Enter/Space; it is preferred when switching panels is expensive
(a network fetch per tab). Knowing both, and saying which you picked and why, is the senior-level answer.</p>`,
    },
  },

  /* ============================ 4. TOAST ============================ */
  {
    slug: "ui-toast-notifications",
    name: "Build: Toast Notifications (stack, auto-dismiss, cap)",
    category: "UI Archetypes",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "55.31%",
    statement: `
<p>Build a toast system: a <code>ToastProvider</code> exposing <code>useToast()</code> so any component can
fire a notification, and a viewport that stacks them, auto-dismisses them, and caps how many are visible.
The trigger buttons are already wired.</p>
<h3>Requirements</h3>
<ul>
<li><code>useToast()</code> returns <code>{ addToast(message, type) }</code>. <code>type</code> is <code>"success"</code> or <code>"error"</code>.</li>
<li>Toasts render inside <code>data-testid="toast-viewport"</code> with <code>role="status"</code> and <code>aria-live="polite"</code>. Each toast is <code>data-testid="toast"</code> with a <code>data-type</code> attribute equal to its type, shows its message, and has a dismiss button <code>data-testid="toast-dismiss"</code>.</li>
<li>Multiple toasts stack, newest <strong>last</strong> (bottom of the list).</li>
<li>Each toast auto-dismisses <strong>1500&nbsp;ms</strong> after it was added. Dismissing manually removes it immediately and its timer must not throw or remove another toast later.</li>
<li>At most <strong>3</strong> toasts are visible. Adding a fourth drops the <em>oldest</em>.</li>
<li>Every toast gets a unique id. Two toasts with the same message are still two toasts.</li>
</ul>`,
    starter: `const ToastContext = React.createContext(null);

function ToastProvider({ children }) {
    const [toasts, setToasts] = React.useState([]);
    // TODO: addToast with unique ids, 1500ms auto-dismiss, manual dismiss, cap at 3 (drop oldest).

    const addToast = (message, type) => {
        setToasts((t) => [...t, { id: message, message, type }]);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div data-testid="toast-viewport">
                {toasts.map((t) => (
                    <div key={t.id} data-testid="toast" data-type={t.type}>
                        {t.message}
                        <button data-testid="toast-dismiss">×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function useToast() {
    return React.useContext(ToastContext);
}

/* ---- Already wired. No changes needed below. ---- */
function Triggers() {
    const { addToast } = useToast();
    return (
        <div>
            <button data-testid="btn-success" onClick={() => addToast("Saved!", "success")}>Notify success</button>
            <button data-testid="btn-error" onClick={() => addToast("Something broke", "error")}>Notify error</button>
        </div>
    );
}

function App() {
    return (
        <ToastProvider>
            <Triggers />
        </ToastProvider>
    );
}`,
    tests: [
      { name: "viewport has live-region semantics and starts empty", sample: true,
        body: `var vp = tid('toast-viewport');
assert(vp, 'toast-viewport missing');
assert(vp.getAttribute('role') === 'status', 'viewport needs role="status"');
assert(vp.getAttribute('aria-live') === 'polite', 'viewport needs aria-live="polite"');
assert($$('[data-testid="toast"]').length === 0, 'no toasts initially');` },
      { name: "toasts stack newest-last with the right type", sample: true,
        body: `await click(tid('btn-success'));
await click(tid('btn-error'));
var ts = $$('[data-testid="toast"]');
assert(ts.length === 2, 'Expected 2 toasts, got ' + ts.length);
assert(ts[0].getAttribute('data-type') === 'success' && ts[0].textContent.indexOf('Saved!') !== -1, 'first toast should be the success one');
assert(ts[1].getAttribute('data-type') === 'error' && ts[1].textContent.indexOf('Something broke') !== -1, 'second toast should be the error one');` },
      { name: "same message twice is two toasts", sample: true,
        body: `await click(tid('btn-success'));
await click(tid('btn-success'));
assert($$('[data-testid="toast"]').length === 2, 'Two identical messages must still produce two toasts (unique ids!)');` },
      { name: "manual dismiss removes only that toast", sample: false,
        body: `await click(tid('btn-success'));
await click(tid('btn-error'));
await click($$('[data-testid="toast-dismiss"]')[0]);
var ts = $$('[data-testid="toast"]');
assert(ts.length === 1, 'Dismissing one should leave one, got ' + ts.length);
assert(ts[0].getAttribute('data-type') === 'error', 'The remaining toast should be the error one');
await sleep(1700);
assert($$('[data-testid="toast"]').length === 0, 'The remaining toast should have auto-dismissed');` },
      { name: "auto-dismiss after 1500ms, per toast", sample: false,
        body: `await click(tid('btn-success'));
await sleep(700);
await click(tid('btn-error'));
await sleep(950);
var ts = $$('[data-testid="toast"]');
assert(ts.length === 1, 'After ~1650ms the first toast is gone, the second (650ms old) remains. Got ' + ts.length);
assert(ts[0].getAttribute('data-type') === 'error', 'The remaining toast should be the second one');
await sleep(1000);
assert($$('[data-testid="toast"]').length === 0, 'Second toast should be gone after its own 1500ms');` },
      { name: "cap at 3: the oldest is dropped", sample: false,
        body: `await click(tid('btn-success'));
await click(tid('btn-error'));
await click(tid('btn-error'));
await click(tid('btn-success'));
var ts = $$('[data-testid="toast"]');
assert(ts.length === 3, 'At most 3 toasts, got ' + ts.length);
var types = ts.map(function (t) { return t.getAttribute('data-type'); }).join(',');
assert(types === 'error,error,success', 'Oldest (success) should be dropped, expected error,error,success got ' + types);` },
    ],
    solution: {
      code: `const ToastContext = React.createContext(null);
const MAX_TOASTS = 3;
const TTL = 1500;

function ToastProvider({ children }) {
    const [toasts, setToasts] = React.useState([]);
    const nextId = React.useRef(1);

    const removeToast = React.useCallback((id) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    const addToast = React.useCallback((message, type) => {
        const id = nextId.current++;
        setToasts((t) => [...t, { id, message, type }].slice(-MAX_TOASTS));
        setTimeout(() => removeToast(id), TTL);
    }, [removeToast]);

    const value = React.useMemo(() => ({ addToast }), [addToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div
                data-testid="toast-viewport"
                role="status"
                aria-live="polite"
                style={{ position: "fixed", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 6 }}
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        data-testid="toast"
                        data-type={t.type}
                        style={{ padding: "8px 12px", borderRadius: 6, color: "#fff", background: t.type === "error" ? "#c0392b" : "#27ae60" }}
                    >
                        {t.message}
                        <button data-testid="toast-dismiss" aria-label="Dismiss" onClick={() => removeToast(t.id)}>×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function useToast() {
    const ctx = React.useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
}

function Triggers() {
    const { addToast } = useToast();
    return (
        <div>
            <button data-testid="btn-success" onClick={() => addToast("Saved!", "success")}>Notify success</button>
            <button data-testid="btn-error" onClick={() => addToast("Something broke", "error")}>Notify error</button>
        </div>
    );
}

function App() {
    return (
        <ToastProvider>
            <Triggers />
        </ToastProvider>
    );
}`,
      explanation: `
<p>A toast system is a tiny queue with three rules, and every rule maps to one line. <strong>Unique ids</strong> come
from a ref counter, never from the message; the starter's <code>id: message</code> is the bug that makes two
"Saved!" toasts collapse into one React key. <strong>Auto-dismiss</strong> is a <code>setTimeout</code> that removes
by id, so if the user already dismissed it manually the filter is simply a no-op; no bookkeeping, no
<code>clearTimeout</code> map. <strong>The cap</strong> is <code>.slice(-MAX_TOASTS)</code> inside the functional
updater: appending then keeping the last three drops the oldest automatically.</p>
<p>Two React details matter. All updates use the <em>functional</em> form of <code>setToasts</code>, because the
timeout closes over a stale array otherwise and you get the classic "dismiss removes the wrong toast" bug. And the
context value is memoised so every consumer does not re-render each time a toast comes or goes; <code>addToast</code>
is stable via <code>useCallback</code>, which is what makes the memo useful.</p>
<p>Accessibility is cheap here: a single live region (<code>role="status"</code> + <code>aria-live="polite"</code>)
wrapping the stack means screen readers announce new toasts without stealing focus. Follow-ups: pause the timer on
hover (store expiry timestamps rather than timeouts), render through a portal so overflow/z-index of ancestors cannot
clip the viewport, and support a <code>promise</code> toast that flips from loading to success/error.</p>`,
    },
  },

  /* ============================ 5. NESTED COMMENTS ============================ */
  {
    slug: "ui-nested-comments",
    name: "Build: Nested Comment Thread (recursive, reply, collapse)",
    category: "UI Archetypes",
    type: "react",
    difficulty: "Hard",
    maxScore: 40,
    successRate: "47.12%",
    statement: `
<p>You are given a <strong>flat</strong> array of comments where each has a <code>parentId</code>
(<code>null</code> for top level). Render it as a nested thread with reply and collapse, the way
Reddit or Hacker News do.</p>
<h3>Requirements</h3>
<ul>
<li>Build the tree from the flat list and render recursively. Each comment is <code>data-testid="comment-&lt;id&gt;"</code> with <code>data-depth</code> = its nesting depth (top level is <code>0</code>). Children render <em>inside</em> their parent's element, in the order they appear in the source array.</li>
<li>The comment shows its <code>author</code> and <code>text</code>.</li>
<li>A <strong>Reply</strong> button <code>data-testid="reply-btn-&lt;id&gt;"</code> toggles an inline form under that comment: a textarea <code>data-testid="reply-input-&lt;id&gt;"</code> and a submit button <code>data-testid="reply-submit-&lt;id&gt;"</code>. Submitting a non-empty reply adds a new comment (author <code>"You"</code>, a fresh unique id) as the <strong>last child</strong> of that comment, and closes the form. Empty replies are ignored.</li>
<li>A comment with children has a collapse toggle <code>data-testid="toggle-&lt;id&gt;"</code>. Collapsed comments hide their children entirely (not rendered) and the toggle's text contains the count of <em>hidden descendants</em> (e.g. <code>[+3]</code>). Expanded toggles show <code>[−]</code>. Comments without children have no toggle.</li>
<li>Render the total number of comments in <code>data-testid="count"</code>.</li>
</ul>`,
    starter: `const INITIAL = [
    { id: 1, parentId: null, author: "maya", text: "Has anyone tried the new build tool?" },
    { id: 2, parentId: 1, author: "dev", text: "Yes, 3x faster on our monorepo." },
    { id: 3, parentId: 2, author: "maya", text: "Which config did you use?" },
    { id: 4, parentId: 1, author: "sam", text: "Still on the old one, waiting for plugins." },
    { id: 5, parentId: null, author: "kai", text: "Unrelated: office is closed Monday." },
];

function Comment({ comment, depth }) {
    // TODO: recursive rendering, reply form, collapse toggle.
    return (
        <div data-testid={"comment-" + comment.id} data-depth={depth}>
            <strong>{comment.author}</strong> {comment.text}
        </div>
    );
}

function Thread() {
    const [comments, setComments] = React.useState(INITIAL);
    const roots = comments.filter((c) => c.parentId === null);
    return (
        <div>
            <div>comments: <span data-testid="count">{comments.length}</span></div>
            {roots.map((c) => (
                <Comment key={c.id} comment={c} depth={0} />
            ))}
        </div>
    );
}

function App() {
    return <Thread />;
}`,
    tests: [
      { name: "renders the tree with correct nesting and depths", sample: true,
        body: `assert(tid('count').textContent === '5', 'count should be 5');
var c1 = tid('comment-1'), c2 = tid('comment-2'), c3 = tid('comment-3'), c4 = tid('comment-4'), c5 = tid('comment-5');
assert(c1 && c2 && c3 && c4 && c5, 'all five comments should render');
assert(c1.contains(c2) && c1.contains(c4), 'comments 2 and 4 must render inside comment 1');
assert(c2.contains(c3), 'comment 3 must render inside comment 2');
assert(!c1.contains(c5), 'comment 5 is top-level, not inside comment 1');
assert(c1.getAttribute('data-depth') === '0' && c2.getAttribute('data-depth') === '1' && c3.getAttribute('data-depth') === '2', 'depths should be 0/1/2');
assert(c1.textContent.indexOf('maya') !== -1 && c1.textContent.indexOf('new build tool') !== -1, 'author and text should show');` },
      { name: "children keep source order", sample: true,
        body: `var kids = $$('[data-testid="comment-1"] [data-depth="1"]').map(function (e) { return e.getAttribute('data-testid'); });
assert(kids.join(',') === 'comment-2,comment-4', 'comment 1 children should be 2 then 4, got ' + kids.join(','));` },
      { name: "reply adds a nested child and closes the form", sample: true,
        body: `assert(!tid('reply-input-4'), 'reply form should be hidden until Reply is clicked');
await click(tid('reply-btn-4'));
var inp = tid('reply-input-4');
assert(inp, 'reply form should appear');
setValue(inp, 'Plugins landed last week.'); await flush();
await click(tid('reply-submit-4'));
assert(!tid('reply-input-4'), 'form should close after submit');
assert(tid('count').textContent === '6', 'count should be 6 after a reply');
var added = $$('[data-testid="comment-4"] [data-depth="2"]');
assert(added.length === 1, 'the reply should render inside comment 4 at depth 2');
assert(added[0].textContent.indexOf('You') !== -1 && added[0].textContent.indexOf('Plugins landed') !== -1, 'reply should show author You and the text');` },
      { name: "replies append as LAST child; empty replies ignored", sample: false,
        body: `await click(tid('reply-btn-1'));
setValue(tid('reply-input-1'), '   '); await flush();
await click(tid('reply-submit-1'));
assert(tid('count').textContent === '5', 'whitespace-only reply must be ignored');
setValue(tid('reply-input-1'), 'Migrating next sprint.'); await flush();
await click(tid('reply-submit-1'));
var kids = $$('[data-testid="comment-1"] [data-depth="1"]');
assert(kids.length === 3, 'comment 1 should now have 3 children, got ' + kids.length);
assert(kids[2].textContent.indexOf('Migrating next sprint') !== -1, 'new reply must be the LAST child');
await click(tid('reply-btn-2'));
setValue(tid('reply-input-2'), 'default config'); await flush();
await click(tid('reply-submit-2'));
var deep = $$('[data-testid="comment-2"] [data-depth="2"]');
assert(deep.length === 2 && deep[1].textContent.indexOf('default config') !== -1, 'reply to comment 2 should be its second depth-2 child');` },
      { name: "collapse hides descendants and shows the hidden count", sample: false,
        body: `assert(!tid('toggle-5') && !tid('toggle-3'), 'leaf comments have no toggle');
var t1 = tid('toggle-1');
assert(t1, 'comment 1 should have a toggle');
assert(t1.textContent.indexOf('−') !== -1 || t1.textContent.indexOf('-') !== -1, 'expanded toggle should show [−]');
await click(t1);
assert(!tid('comment-2') && !tid('comment-3') && !tid('comment-4'), 'collapsed: all descendants of 1 must be unrendered');
assert(tid('comment-1'), 'the collapsed comment itself stays');
assert(t1.textContent.indexOf('3') !== -1, 'toggle should show the hidden-descendant count 3 (2, 3 and 4), got "' + t1.textContent + '"');
assert(tid('count').textContent === '5', 'total count is unaffected by collapsing');
await click(tid('toggle-1'));
assert(tid('comment-3'), 'expanding should bring the deep child back');
await click(tid('toggle-2'));
assert(!tid('comment-3') && tid('comment-4'), 'collapsing 2 hides only its subtree');
assert(tid('toggle-2').textContent.indexOf('1') !== -1, 'toggle-2 should show 1 hidden');` },
    ],
    solution: {
      code: `const INITIAL = [
    { id: 1, parentId: null, author: "maya", text: "Has anyone tried the new build tool?" },
    { id: 2, parentId: 1, author: "dev", text: "Yes, 3x faster on our monorepo." },
    { id: 3, parentId: 2, author: "maya", text: "Which config did you use?" },
    { id: 4, parentId: 1, author: "sam", text: "Still on the old one, waiting for plugins." },
    { id: 5, parentId: null, author: "kai", text: "Unrelated: office is closed Monday." },
];

// flat list -> { [parentId]: [children in source order] }
function buildChildrenMap(comments) {
    const map = new Map();
    for (const c of comments) {
        const key = c.parentId === null ? "root" : c.parentId;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(c);
    }
    return map;
}

function countDescendants(childrenOf, id) {
    const kids = childrenOf.get(id) || [];
    return kids.reduce((n, k) => n + 1 + countDescendants(childrenOf, k.id), 0);
}

function Comment({ comment, depth, childrenOf, onReply }) {
    const [collapsed, setCollapsed] = React.useState(false);
    const [replying, setReplying] = React.useState(false);
    const [draft, setDraft] = React.useState("");
    const kids = childrenOf.get(comment.id) || [];
    const hidden = countDescendants(childrenOf, comment.id);

    function submit() {
        const text = draft.trim();
        if (!text) return;
        onReply(comment.id, text);
        setDraft("");
        setReplying(false);
    }

    return (
        <div data-testid={"comment-" + comment.id} data-depth={depth} style={{ marginLeft: depth ? 20 : 0, borderLeft: depth ? "2px solid #ddd" : "none", paddingLeft: 8, marginTop: 8 }}>
            <div>
                {kids.length > 0 && (
                    <button data-testid={"toggle-" + comment.id} onClick={() => setCollapsed((c) => !c)}>
                        {collapsed ? "[+" + hidden + "]" : "[−]"}
                    </button>
                )}
                <strong>{comment.author}</strong> {comment.text}
                <button data-testid={"reply-btn-" + comment.id} onClick={() => setReplying((r) => !r)}>Reply</button>
            </div>
            {replying && (
                <div>
                    <textarea data-testid={"reply-input-" + comment.id} value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <button data-testid={"reply-submit-" + comment.id} onClick={submit}>Post</button>
                </div>
            )}
            {!collapsed && kids.map((k) => (
                <Comment key={k.id} comment={k} depth={depth + 1} childrenOf={childrenOf} onReply={onReply} />
            ))}
        </div>
    );
}

function Thread() {
    const [comments, setComments] = React.useState(INITIAL);
    const nextId = React.useRef(1000);
    const childrenOf = React.useMemo(() => buildChildrenMap(comments), [comments]);

    const onReply = React.useCallback((parentId, text) => {
        const id = nextId.current++;
        setComments((cs) => [...cs, { id, parentId, author: "You", text }]);
    }, []);

    const roots = childrenOf.get("root") || [];
    return (
        <div>
            <div>comments: <span data-testid="count">{comments.length}</span></div>
            {roots.map((c) => (
                <Comment key={c.id} comment={c} depth={0} childrenOf={childrenOf} onReply={onReply} />
            ))}
        </div>
    );
}

function App() {
    return <Thread />;
}`,
      explanation: `
<p>The senior move is to keep the <strong>flat array as the source of truth</strong> and derive the tree. Nesting the
state itself makes every insert a recursive immutable update; a flat list makes "add a reply" a one-line append and
"build the tree" a single pass into a <code>Map</code> of <code>parentId → children</code>. Because the map is built
by iterating the array in order, children automatically keep source order and new replies land last. The map is
<code>useMemo</code>'d on <code>comments</code> so it rebuilds only when the data changes.</p>
<p>Rendering is then a component that calls itself. Each <code>Comment</code> owns its own UI state (collapsed,
replying, draft) because that state is local to one node; the data mutation (<code>onReply</code>) is lifted to
<code>Thread</code> and passed down as a stable callback. The hidden-descendant count is a small recursion over the
same map. If threads get large, memoise it or precompute counts bottom-up in one pass.</p>
<p>Interviewers usually follow up with scale: thousands of comments means virtualising the visible rows (flatten the
visible tree into a list with depth, then window it), lazy-loading children on expand, and optimistic replies with a
temporary id that gets swapped when the server responds. Mention that the flat model makes all three easier.</p>`,
    },
  },

  /* ============================ 6. INFINITE SCROLL ============================ */
  {
    slug: "ui-infinite-scroll",
    name: "Build: Infinite Scroll Feed (paging, loading, end state)",
    category: "UI Archetypes",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "53.88%",
    statement: `
<p>Build an infinite-scrolling feed over the wired async <code>fetchPage(page)</code>: a scrollable box that
loads the next page when the user reaches the bottom, shows a loading state, never double-fetches, and
stops cleanly at the end.</p>
<h3>Requirements</h3>
<ul>
<li>Render a fixed-height scroll container <code>data-testid="feed"</code> (about 200px tall, <code>overflow-y: auto</code>). Items render as <code>data-testid="item"</code> elements in order.</li>
<li>Load page 1 on mount. While any fetch is in flight, render <code>data-testid="loading"</code>.</li>
<li>When the user scrolls to (or near) the bottom of the container, load the next page and <strong>append</strong>. Use either the container's scroll position or an <code>IntersectionObserver</code> on a sentinel element inside the container.</li>
<li>Never issue a fetch while one is pending, and never fetch a page twice, no matter how many scroll events fire.</li>
<li>When <code>hasMore</code> is <code>false</code>, render <code>data-testid="end"</code> with the text <code>You're all caught up</code> and stop fetching for good.</li>
<li>Show the loaded page count in <code>data-testid="pages"</code>.</li>
</ul>`,
    starter: `/* ---- Wired data source. Do not change. 3 pages of 10 items. ---- */
const PAGE_SIZE = 10, TOTAL_PAGES = 3;
function fetchPage(page) {
    if (page === 1) window.__fetchCalls = 0; // fresh mount
    window.__fetchCalls = (window.__fetchCalls || 0) + 1;
    return new Promise((resolve) => {
        setTimeout(() => {
            const items = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: (page - 1) * PAGE_SIZE + i + 1, title: "Post #" + ((page - 1) * PAGE_SIZE + i + 1) }));
            resolve({ items, hasMore: page < TOTAL_PAGES });
        }, 60);
    });
}

function Feed() {
    const [items, setItems] = React.useState([]);
    const [page, setPage] = React.useState(0);
    // TODO: loading + hasMore state, load-next on scroll-to-bottom, guard against double fetch, end state.

    React.useEffect(() => {
        fetchPage(1).then((res) => { setItems(res.items); setPage(1); });
    }, []);

    return (
        <div>
            <div>pages: <span data-testid="pages">{page}</span></div>
            <div data-testid="feed" style={{ height: 200, overflowY: "auto", border: "1px solid #ccc" }}>
                {items.map((it) => (
                    <div key={it.id} data-testid="item" style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.title}</div>
                ))}
            </div>
        </div>
    );
}

function App() {
    return <Feed />;
}`,
    tests: [
      { name: "loads page 1 on mount with a loading state", sample: true,
        body: `assert(tid('loading'), 'loading indicator should show while page 1 is fetching');
await sleep(150);
assert(!tid('loading'), 'loading indicator should disappear once loaded');
assert($$('[data-testid="item"]').length === 10, 'Expected 10 items after page 1, got ' + $$('[data-testid="item"]').length);
assert(tid('pages').textContent === '1', 'pages should be 1');
assert(window.__fetchCalls === 1, 'Exactly one fetch on mount (StrictMode is off), got ' + window.__fetchCalls);` },
      { name: "scrolling to the bottom loads page 2 and appends", sample: true,
        body: `await sleep(150);
var feed = tid('feed');
feed.scrollTop = feed.scrollHeight;
feed.dispatchEvent(new Event('scroll', { bubbles: true }));
await sleep(300);
var items = $$('[data-testid="item"]');
assert(items.length === 20, 'Expected 20 items after page 2, got ' + items.length);
assert(items[0].textContent === 'Post #1' && items[19].textContent === 'Post #20', 'page 2 must be appended after page 1, in order');
assert(tid('pages').textContent === '2', 'pages should be 2');` },
      { name: "no double fetch during a burst of scroll events", sample: true,
        body: `await sleep(150);
var feed = tid('feed');
feed.scrollTop = feed.scrollHeight;
for (var i = 0; i < 8; i++) { feed.dispatchEvent(new Event('scroll', { bubbles: true })); await sleep(5); }
await sleep(300);
assert($$('[data-testid="item"]').length === 20, 'A burst of scroll events must load exactly one more page, got ' + $$('[data-testid="item"]').length + ' items');
assert(window.__fetchCalls === 2, 'Expected exactly 2 fetch calls total, got ' + window.__fetchCalls);` },
      { name: "reaches the end, shows the end state, stops fetching", sample: false,
        body: `await sleep(150);
var feed = tid('feed');
for (var p = 0; p < 2; p++) {
  feed.scrollTop = feed.scrollHeight;
  feed.dispatchEvent(new Event('scroll', { bubbles: true }));
  await sleep(300);
}
assert($$('[data-testid="item"]').length === 30, 'Expected 30 items after 3 pages, got ' + $$('[data-testid="item"]').length);
assert(tid('end') && tid('end').textContent.indexOf("You're all caught up") !== -1, 'end state should render with the caught-up text');
assert(!tid('loading'), 'no loading indicator at the end');
var calls = window.__fetchCalls;
feed.scrollTop = feed.scrollHeight;
feed.dispatchEvent(new Event('scroll', { bubbles: true }));
await sleep(250);
assert(window.__fetchCalls === calls, 'No more fetches once hasMore is false');
assert(tid('pages').textContent === '3', 'pages should be 3');` },
    ],
    solution: {
      code: `const PAGE_SIZE = 10, TOTAL_PAGES = 3;
function fetchPage(page) {
    if (page === 1) window.__fetchCalls = 0; // fresh mount
    window.__fetchCalls = (window.__fetchCalls || 0) + 1;
    return new Promise((resolve) => {
        setTimeout(() => {
            const items = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: (page - 1) * PAGE_SIZE + i + 1, title: "Post #" + ((page - 1) * PAGE_SIZE + i + 1) }));
            resolve({ items, hasMore: page < TOTAL_PAGES });
        }, 60);
    });
}

function Feed() {
    const [items, setItems] = React.useState([]);
    const [page, setPage] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(true);
    // Refs mirror the state so a scroll handler always sees the latest values
    // without re-binding, and the guard is synchronous (no stale-closure double fetch).
    const busy = React.useRef(false);
    const pageRef = React.useRef(0);
    const moreRef = React.useRef(true);

    const loadNext = React.useCallback(() => {
        if (busy.current || !moreRef.current) return;
        busy.current = true;
        setLoading(true);
        const next = pageRef.current + 1;
        fetchPage(next).then((res) => {
            setItems((prev) => prev.concat(res.items));
            pageRef.current = next;
            setPage(next);
            moreRef.current = res.hasMore;
            setHasMore(res.hasMore);
        }).finally(() => {
            busy.current = false;
            setLoading(false);
        });
    }, []);

    React.useEffect(() => { loadNext(); }, [loadNext]);

    function onScroll(e) {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) loadNext();
    }

    return (
        <div>
            <div>pages: <span data-testid="pages">{page}</span></div>
            <div data-testid="feed" onScroll={onScroll} style={{ height: 200, overflowY: "auto", border: "1px solid #ccc" }}>
                {items.map((it) => (
                    <div key={it.id} data-testid="item" style={{ padding: 8, borderBottom: "1px solid #eee" }}>{it.title}</div>
                ))}
                {loading && <div data-testid="loading" style={{ padding: 8, color: "#888" }}>Loading…</div>}
                {!hasMore && <div data-testid="end" style={{ padding: 8, color: "#888" }}>You're all caught up</div>}
            </div>
        </div>
    );
}

function App() {
    return <Feed />;
}`,
      explanation: `
<p>Infinite scroll is a concurrency problem wearing a UI costume. The failure everyone ships first is the
<strong>double fetch</strong>: scroll events fire dozens of times per second, and a guard held in React state
(<code>if (loading) return</code>) is stale inside the handler until the next render, so several fetches slip through
before <code>loading</code> flips. The fix is a <em>synchronous</em> guard in a ref (<code>busy.current</code>) that is
set the instant a fetch starts. The same trick keeps <code>page</code> and <code>hasMore</code> in refs so
<code>loadNext</code> can be a stable <code>useCallback</code> with no dependencies, which also lets the mount effect
call it exactly once.</p>
<p>The trigger itself is simple arithmetic on the container:
<code>scrollTop + clientHeight &gt;= scrollHeight - threshold</code>. Putting <code>overflow</code> on a fixed-height
box rather than the window keeps the component self-contained and testable. The <code>IntersectionObserver</code>
alternative (a sentinel div after the last item, observed with <code>root</code> set to the container) avoids running
code on every scroll tick and is what you would reach for in production; say so, then implement whichever you can
finish in the time.</p>
<p>State transitions are the rest: append with the functional updater so out-of-order renders cannot lose items,
render the loading row only while in flight, and once <code>hasMore</code> is false flip the ref so no future scroll
event can fetch again. Follow-ups: dedupe items by id if the backend pages by offset (new posts shift pages),
cursor-based paging, virtualising the list past a few hundred rows, and preserving scroll position on back
navigation.</p>`,
    },
  }
  );
})();
