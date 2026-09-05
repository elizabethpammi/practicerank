/* PracticeRank — TypeScript Practicals.
 * 60-minute mock rounds for live frontend interviews: each starter is a small EXISTING
 * TypeScript/React codebase and the task is to implement or extend a feature in it —
 * the format used by CoderPad-style "extend a feature in an existing codebase" screens.
 * lang: "ts" — Monaco runs in TypeScript mode and the sandbox compiles TSX via Babel.
 * Practice discipline: start the 60-minute timer, no AI tools, narrate decisions aloud.
 */
(function () {
  "use strict";
  window.FRONTEND_PROBLEMS = window.FRONTEND_PROBLEMS || [];
  window.FRONTEND_PROBLEMS.push(
  /* ================= 1. TYPED DATASET TABLE ================= */
  {
    slug: "ts-dataset-table",
    name: "Mock 60m: Extend a Typed Dataset Table",
    category: "TypeScript Practicals",
    lang: "ts",
    type: "react",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "38.41%",
    statement: `
<p><strong>Mock interview format:</strong> set the timer to 60 minutes, no AI tools, and narrate your
decisions out loud as you code. The codebase below already renders a table of datasets; you are asked to
extend it with the three features a reviewer would use daily.</p>
<h3>Ticket</h3>
<ul>
<li><strong>Sorting.</strong> Clicking the "Name" or "Rows" header toggles ascending/descending sort on that column. The active header carries <code>aria-sort="ascending"</code> or <code>"descending"</code>; the inactive one has no <code>aria-sort</code>. First click on a column sorts ascending.</li>
<li><strong>Status filter.</strong> A <code>&lt;select data-testid="status-filter"&gt;</code> with options <code>all</code>, <code>ready</code>, <code>processing</code>, <code>failed</code>. Choosing one shows only matching rows. Filtering composes with sorting.</li>
<li><strong>Row selection.</strong> Each row gets a checkbox <code>data-testid="row-check-&lt;id&gt;"</code>. A toolbar line <code>data-testid="sel-count"</code> shows <code>N selected</code>. A header checkbox <code>data-testid="check-all"</code> selects/clears every <em>visible</em> (filtered) row. Selection survives re-sorting.</li>
</ul>
<p>Keep the existing <code>data-testid</code>s working. The row count line must keep showing the number of <em>visible</em> rows.</p>`,
    starter: `type DatasetStatus = "ready" | "processing" | "failed";

interface Dataset {
    id: number;
    name: string;
    rows: number;
    status: DatasetStatus;
}

const DATASETS: Dataset[] = [
    { id: 1, name: "web-corpus-en", rows: 5200, status: "ready" },
    { id: 2, name: "img-captions", rows: 900, status: "processing" },
    { id: 3, name: "code-dedup", rows: 12400, status: "ready" },
    { id: 4, name: "audio-meta", rows: 300, status: "failed" },
    { id: 5, name: "docs-clean", rows: 7100, status: "ready" },
];

function StatusBadge({ status }: { status: DatasetStatus }) {
    const color = status === "ready" ? "#27ae60" : status === "processing" ? "#f39c12" : "#c0392b";
    return <span style={{ color }}>{status}</span>;
}

function DatasetTable({ data }: { data: Dataset[] }) {
    // TODO: sorting (aria-sort on th), status filter, row selection + select-all.
    return (
        <div>
            <div data-testid="row-count">{data.length} datasets</div>
            <table>
                <thead>
                    <tr>
                        <th data-testid="th-name">Name</th>
                        <th data-testid="th-rows">Rows</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((d) => (
                        <tr key={d.id} data-testid={"row-" + d.id}>
                            <td>{d.name}</td>
                            <td>{d.rows}</td>
                            <td><StatusBadge status={d.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function App() {
    return <DatasetTable data={DATASETS} />;
}`,
    tests: [
      { name: "renders all rows with the count line", sample: true,
        body: `assert($$('[data-testid^="row-"]').filter(function(e){return /^row-\\d+$/.test(e.getAttribute('data-testid'));}).length === 5, 'expected 5 data rows');
assert(tid('row-count').textContent.indexOf('5') !== -1, 'row-count should show 5');` },
      { name: "clicking Name sorts asc, then desc, with aria-sort", sample: true,
        body: `function names(){ return $$('tbody tr').map(function(e){return e.textContent;}); }
await click(tid('th-name'));
assert(tid('th-name').getAttribute('aria-sort') === 'ascending', 'first click: aria-sort="ascending"');
assert(names()[0].indexOf('audio-meta') !== -1 && names()[4].indexOf('web-corpus-en') !== -1, 'ascending by name');
await click(tid('th-name'));
assert(tid('th-name').getAttribute('aria-sort') === 'descending', 'second click: aria-sort="descending"');
assert(names()[0].indexOf('web-corpus-en') !== -1, 'descending by name');` },
      { name: "sorting by Rows works numerically and clears the other header", sample: true,
        body: `await click(tid('th-name'));
await click(tid('th-rows'));
var rows = $$('tbody tr').map(function(e){return Number(e.textContent.replace(/[^0-9]/g,''));});
assert(rows.join(',') === '300,900,5200,7100,12400', 'numeric ascending by rows, got ' + rows.join(','));
assert(tid('th-rows').getAttribute('aria-sort') === 'ascending', 'rows header sorted');
assert(!tid('th-name').getAttribute('aria-sort'), 'name header must lose aria-sort');` },
      { name: "status filter composes with sort and updates the count", sample: false,
        body: `var sel = tid('status-filter');
assert(sel, 'status-filter select missing');
sel.value = 'ready'; sel.dispatchEvent(new Event('change', { bubbles: true })); await flush();
var vis = $$('tbody tr').length;
assert(vis === 3, 'only 3 ready rows should be visible, got ' + vis);
assert(tid('row-count').textContent.indexOf('3') !== -1, 'row-count should show 3');
await click(tid('th-rows'));
var rows = $$('tbody tr').map(function(e){return Number(e.textContent.replace(/[^0-9]/g,''));});
assert(rows.join(',') === '5200,7100,12400', 'filtered + sorted ascending, got ' + rows.join(','));
sel.value = 'all'; sel.dispatchEvent(new Event('change', { bubbles: true })); await flush();
assert($$('tbody tr').length === 5, 'back to 5 rows on "all"');` },
      { name: "row selection with a live count, surviving re-sort", sample: false,
        body: `await click(tid('row-check-1'));
await click(tid('row-check-3'));
assert(tid('sel-count').textContent.indexOf('2') !== -1, 'sel-count should show 2 selected');
await click(tid('th-name'));
assert(tid('row-check-1').checked && tid('row-check-3').checked, 'selection must survive re-sorting');
assert(tid('sel-count').textContent.indexOf('2') !== -1, 'still 2 selected after sort');
await click(tid('row-check-1'));
assert(tid('sel-count').textContent.indexOf('1') !== -1, 'unchecking drops to 1');` },
      { name: "select-all targets only the visible (filtered) rows", sample: false,
        body: `var sel = tid('status-filter');
sel.value = 'ready'; sel.dispatchEvent(new Event('change', { bubbles: true })); await flush();
await click(tid('check-all'));
assert(tid('sel-count').textContent.indexOf('3') !== -1, 'select-all on the ready filter selects 3, got "' + tid('sel-count').textContent + '"');
sel.value = 'all'; sel.dispatchEvent(new Event('change', { bubbles: true })); await flush();
assert(tid('row-check-2').checked === false && tid('row-check-4').checked === false, 'rows hidden during select-all stay unselected');
await click(tid('check-all'));
assert(tid('sel-count').textContent.indexOf('5') !== -1, 'select-all on "all" selects 5');
await click(tid('check-all'));
assert(tid('sel-count').textContent.indexOf('0') !== -1, 'clicking again clears all');` },
    ],
    solution: {
      code: `type DatasetStatus = "ready" | "processing" | "failed";

interface Dataset {
    id: number;
    name: string;
    rows: number;
    status: DatasetStatus;
}

type SortKey = "name" | "rows";
type SortDir = "ascending" | "descending";

const DATASETS: Dataset[] = [
    { id: 1, name: "web-corpus-en", rows: 5200, status: "ready" },
    { id: 2, name: "img-captions", rows: 900, status: "processing" },
    { id: 3, name: "code-dedup", rows: 12400, status: "ready" },
    { id: 4, name: "audio-meta", rows: 300, status: "failed" },
    { id: 5, name: "docs-clean", rows: 7100, status: "ready" },
];

function StatusBadge({ status }: { status: DatasetStatus }) {
    const color = status === "ready" ? "#27ae60" : status === "processing" ? "#f39c12" : "#c0392b";
    return <span style={{ color }}>{status}</span>;
}

function DatasetTable({ data }: { data: Dataset[] }) {
    const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir } | null>(null);
    const [filter, setFilter] = React.useState<DatasetStatus | "all">("all");
    const [selected, setSelected] = React.useState<Set<number>>(new Set());

    const visible = React.useMemo(() => {
        let rows = filter === "all" ? data : data.filter((d) => d.status === filter);
        if (sort) {
            rows = [...rows].sort((a, b) => {
                const cmp = sort.key === "name" ? a.name.localeCompare(b.name) : a.rows - b.rows;
                return sort.dir === "ascending" ? cmp : -cmp;
            });
        }
        return rows;
    }, [data, filter, sort]);

    function toggleSort(key: SortKey) {
        setSort((s) => (s && s.key === key && s.dir === "ascending" ? { key, dir: "descending" } : { key, dir: "ascending" }));
    }

    function toggleRow(id: number) {
        setSelected((s) => {
            const next = new Set(s);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const allVisibleSelected = visible.length > 0 && visible.every((d) => selected.has(d.id));
    function toggleAll() {
        setSelected((s) => {
            const next = new Set(s);
            if (allVisibleSelected) visible.forEach((d) => next.delete(d.id));
            else visible.forEach((d) => next.add(d.id));
            return next;
        });
    }

    const ariaSort = (key: SortKey) => (sort && sort.key === key ? sort.dir : undefined);

    return (
        <div>
            <div data-testid="row-count">{visible.length} datasets</div>
            <div data-testid="sel-count">{selected.size} selected</div>
            <select data-testid="status-filter" value={filter} onChange={(e) => setFilter(e.target.value as DatasetStatus | "all")}>
                <option value="all">all</option>
                <option value="ready">ready</option>
                <option value="processing">processing</option>
                <option value="failed">failed</option>
            </select>
            <table>
                <thead>
                    <tr>
                        <th><input type="checkbox" data-testid="check-all" checked={allVisibleSelected} onChange={toggleAll} /></th>
                        <th data-testid="th-name" aria-sort={ariaSort("name")} onClick={() => toggleSort("name")} style={{ cursor: "pointer" }}>Name</th>
                        <th data-testid="th-rows" aria-sort={ariaSort("rows")} onClick={() => toggleSort("rows")} style={{ cursor: "pointer" }}>Rows</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map((d) => (
                        <tr key={d.id} data-testid={"row-" + d.id}>
                            <td><input type="checkbox" data-testid={"row-check-" + d.id} checked={selected.has(d.id)} onChange={() => toggleRow(d.id)} /></td>
                            <td>{d.name}</td>
                            <td>{d.rows}</td>
                            <td><StatusBadge status={d.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function App() {
    return <DatasetTable data={DATASETS} />;
}`,
      explanation: `
<p>The shape interviewers want here: <strong>derive, don't duplicate</strong>. Sort key/direction, the filter,
and the selection set are the only state; the visible rows are a <code>useMemo</code> over them. Sorting a copy
(<code>[...rows].sort</code>) keeps the source array intact, and doing filter-then-sort in one derivation means the
two features compose for free instead of fighting over a second "displayRows" state that drifts.</p>
<p>Selection lives in a <code>Set&lt;number&gt;</code> of ids, not booleans on row objects — that is why it survives
re-sorting and filtering without any effort, and why "select all visible" is just iterating <code>visible</code>
into the set. The tri-state subtlety the last test checks: select-all under a filter must touch only the visible
rows, and hidden rows keep their previous selection state.</p>
<p>Typed touches worth saying out loud in the interview: <code>SortKey</code>/<code>SortDir</code> unions instead of
raw strings, <code>e.target.value as DatasetStatus | "all"</code> at the select boundary (a cast at the DOM edge is
fine; the union protects everything downstream), and <code>aria-sort</code> as the accessibility contract for
sortable headers. Follow-ups to expect: stable sort ties, virtualizing at 10k rows, and lifting the table into a
generic <code>Table&lt;T&gt;</code> with a typed column config.</p>`,
    },
  },

  /* ================= 2. JOB LAUNCHER ================= */
  {
    slug: "ts-job-launcher",
    name: "Mock 60m: Wire a Curation Job Launcher",
    category: "TypeScript Practicals",
    lang: "ts",
    type: "react",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "34.77%",
    statement: `
<p><strong>Mock interview format:</strong> 60-minute timer, no AI tools, think out loud. The codebase has a
typed fake API for launching data-processing jobs. Wire the form to it and render the job list with live
status updates.</p>
<h3>Ticket</h3>
<ul>
<li><strong>Validation.</strong> Submit is disabled (<code>disabled</code> attribute) while the name is empty/whitespace or sample % is outside 1–100. An invalid submit attempt must never call the API.</li>
<li><strong>Launch.</strong> Submitting calls <code>createJob({ name, samplePercent })</code>. While the promise is pending, the button shows <code>Launching…</code> and is disabled. On success the form resets and the job appears in <code>data-testid="job-list"</code> as <code>data-testid="job-&lt;id&gt;"</code> showing its name and status <code>data-testid="job-status-&lt;id&gt;"</code>.</li>
<li><strong>Live status.</strong> Poll <code>getJob(id)</code> every 300ms until the job reaches <code>done</code> or <code>failed</code>, updating the status text. Stop polling then (no interval leaks).</li>
<li><strong>Errors.</strong> <code>createJob</code> rejects when the name starts with <code>bad</code> — show the rejection message in <code>data-testid="form-error"</code>, keep the form values, and re-enable the button. The error clears on the next successful launch.</li>
<li><strong>Multiple jobs</strong> can run at once; each polls independently.</li>
</ul>`,
    starter: `/* ---- Wired fake API. Do not change. ---- */
type JobStatus = "queued" | "running" | "done" | "failed";

interface Job {
    id: number;
    name: string;
    samplePercent: number;
    status: JobStatus;
}

interface CreateJobInput {
    name: string;
    samplePercent: number;
}

const jobs = new Map<number, Job>();
let nextId = 1;

function createJob(input: CreateJobInput): Promise<Job> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (input.name.startsWith("bad")) return reject(new Error("Job name is reserved"));
            const job: Job = { id: nextId++, name: input.name, samplePercent: input.samplePercent, status: "queued" };
            jobs.set(job.id, job);
            setTimeout(() => { if (jobs.get(job.id)) jobs.get(job.id)!.status = "running"; }, 250);
            setTimeout(() => { if (jobs.get(job.id)) jobs.get(job.id)!.status = "done"; }, 900);
            resolve({ ...job });
        }, 120);
    });
}

function getJob(id: number): Promise<Job> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const j = jobs.get(id);
            j ? resolve({ ...j }) : reject(new Error("not found"));
        }, 40);
    });
}

/* ---- Your work starts here. ---- */
function LauncherForm() {
    const [name, setName] = React.useState("");
    const [samplePercent, setSamplePercent] = React.useState(10);
    // TODO: validation, pending state, error display, job list with live polling.

    return (
        <div>
            <input data-testid="job-name" placeholder="Job name" value={name} onChange={(e) => setName(e.target.value)} />
            <input data-testid="job-percent" type="number" value={samplePercent} onChange={(e) => setSamplePercent(Number(e.target.value))} />
            <button data-testid="launch-btn">Launch</button>
            <div data-testid="job-list"></div>
        </div>
    );
}

function App() {
    return <LauncherForm />;
}`,
    tests: [
      { name: "submit is disabled until the form is valid", sample: true,
        body: `assert(tid('launch-btn').disabled === true, 'empty name → button disabled');
setValue(tid('job-name'), 'dedup-run'); await flush();
assert(tid('launch-btn').disabled === false, 'valid form → button enabled');
setValue(tid('job-percent'), '0'); await flush();
assert(tid('launch-btn').disabled === true, 'percent 0 → disabled');
setValue(tid('job-percent'), '101'); await flush();
assert(tid('launch-btn').disabled === true, 'percent 101 → disabled');
setValue(tid('job-percent'), '25'); await flush();
assert(tid('launch-btn').disabled === false, 'percent 25 → enabled');` },
      { name: "launch shows pending state then adds the job", sample: true,
        body: `setValue(tid('job-name'), 'clean-web'); await flush();
await click(tid('launch-btn'));
assert(/Launching/i.test(tid('launch-btn').textContent), 'button should read Launching… while pending');
assert(tid('launch-btn').disabled === true, 'button disabled while pending');
await sleep(300);
var items = $$('[data-testid^="job-"]').filter(function(e){return /^job-\\d+$/.test(e.getAttribute('data-testid'));});
assert(items.length === 1, 'one job in the list, got ' + items.length);
assert(items[0].textContent.indexOf('clean-web') !== -1, 'job shows its name');
assert(tid('job-name').value === '', 'form resets after success');
assert(tid('launch-btn').textContent.indexOf('Launching') === -1, 'button back to normal');` },
      { name: "status advances queued → running → done via polling, then stops", sample: true,
        body: `setValue(tid('job-name'), 'img-dedup'); await flush();
await click(tid('launch-btn'));
await sleep(250);
var st = $$('[data-testid^="job-status-"]')[0];
assert(st, 'status element missing');
await sleep(400);
assert(st.textContent.indexOf('running') !== -1, 'after ~650ms the status should be running, got "' + st.textContent + '"');
await sleep(800);
st = $$('[data-testid^="job-status-"]')[0];
assert(st.textContent.indexOf('done') !== -1, 'after ~1.4s the status should be done, got "' + st.textContent + '"');` },
      { name: "rejection shows the error, keeps values, recovers", sample: false,
        body: `setValue(tid('job-name'), 'bad-config'); await flush();
setValue(tid('job-percent'), '30'); await flush();
await click(tid('launch-btn'));
await sleep(300);
assert(tid('form-error') && tid('form-error').textContent.indexOf('reserved') !== -1, 'rejection message should render in form-error');
assert(tid('job-name').value === 'bad-config', 'form values must be kept on error');
assert(tid('launch-btn').disabled === false, 'button re-enabled after error');
var items = $$('[data-testid^="job-"]').filter(function(e){return /^job-\\d+$/.test(e.getAttribute('data-testid'));});
assert(items.length === 0, 'no job added on rejection');
setValue(tid('job-name'), 'good-config'); await flush();
await click(tid('launch-btn'));
await sleep(300);
assert(!tid('form-error') || tid('form-error').textContent.trim() === '', 'error clears on next success');` },
      { name: "two jobs poll independently", sample: false,
        body: `setValue(tid('job-name'), 'run-a'); await flush();
await click(tid('launch-btn'));
await sleep(200);
setValue(tid('job-name'), 'run-b'); await flush();
await click(tid('launch-btn'));
await sleep(1600);
var sts = $$('[data-testid^="job-status-"]').map(function(e){return e.textContent.trim();});
assert(sts.length === 2, 'two jobs listed, got ' + sts.length);
assert(sts.every(function(s){return s.indexOf('done') !== -1;}), 'both jobs should reach done, got ' + sts.join(' / '));` },
    ],
    solution: {
      code: `type JobStatus = "queued" | "running" | "done" | "failed";

interface Job {
    id: number;
    name: string;
    samplePercent: number;
    status: JobStatus;
}

interface CreateJobInput {
    name: string;
    samplePercent: number;
}

const jobs = new Map<number, Job>();
let nextId = 1;

function createJob(input: CreateJobInput): Promise<Job> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (input.name.startsWith("bad")) return reject(new Error("Job name is reserved"));
            const job: Job = { id: nextId++, name: input.name, samplePercent: input.samplePercent, status: "queued" };
            jobs.set(job.id, job);
            setTimeout(() => { if (jobs.get(job.id)) jobs.get(job.id)!.status = "running"; }, 250);
            setTimeout(() => { if (jobs.get(job.id)) jobs.get(job.id)!.status = "done"; }, 900);
            resolve({ ...job });
        }, 120);
    });
}

function getJob(id: number): Promise<Job> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const j = jobs.get(id);
            j ? resolve({ ...j }) : reject(new Error("not found"));
        }, 40);
    });
}

function JobRow({ job }: { job: Job }) {
    const [status, setStatus] = React.useState<JobStatus>(job.status);

    React.useEffect(() => {
        let stopped = false;
        const timer = setInterval(async () => {
            try {
                const fresh = await getJob(job.id);
                if (stopped) return;
                setStatus(fresh.status);
                if (fresh.status === "done" || fresh.status === "failed") clearInterval(timer);
            } catch {
                clearInterval(timer);
            }
        }, 300);
        return () => { stopped = true; clearInterval(timer); };
    }, [job.id]);

    return (
        <div data-testid={"job-" + job.id}>
            {job.name} — <span data-testid={"job-status-" + job.id}>{status}</span>
        </div>
    );
}

function LauncherForm() {
    const [name, setName] = React.useState("");
    const [samplePercent, setSamplePercent] = React.useState(10);
    const [pending, setPending] = React.useState(false);
    const [error, setError] = React.useState("");
    const [launched, setLaunched] = React.useState<Job[]>([]);

    const valid = name.trim().length > 0 && samplePercent >= 1 && samplePercent <= 100;

    async function launch() {
        if (!valid || pending) return;
        setPending(true);
        try {
            const job = await createJob({ name: name.trim(), samplePercent });
            setLaunched((l) => [...l, job]);
            setName("");
            setError("");
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setPending(false);
        }
    }

    return (
        <div>
            <input data-testid="job-name" placeholder="Job name" value={name} onChange={(e) => setName(e.target.value)} />
            <input data-testid="job-percent" type="number" value={samplePercent} onChange={(e) => setSamplePercent(Number(e.target.value))} />
            <button data-testid="launch-btn" disabled={!valid || pending} onClick={launch}>
                {pending ? "Launching…" : "Launch"}
            </button>
            {error && <div data-testid="form-error" style={{ color: "#c0392b" }}>{error}</div>}
            <div data-testid="job-list">
                {launched.map((j) => <JobRow key={j.id} job={j} />)}
            </div>
        </div>
    );
}

function App() {
    return <LauncherForm />;
}`,
      explanation: `
<p>The structural decision that makes this clean: <strong>each job row owns its own polling</strong>. A
<code>JobRow</code> component takes the created job, keeps its status in local state, and runs a
<code>setInterval</code> in an effect keyed on the job id — clearing it both when the job reaches a terminal
status and in the effect cleanup. Two launched jobs therefore poll independently with zero coordination code,
and unmounting can never leak an interval. Polling from the parent over an array of jobs is the tar pit: you
end up re-creating intervals on every state change or closing over stale arrays.</p>
<p>The form half is the standard async-submit contract, worth narrating as a checklist: derived
<code>valid</code> (never a second "isValid" state), guard the handler with <code>!valid || pending</code> so a
double-click cannot double-submit, <code>finally</code> for the pending reset so the error path cannot strand a
disabled button, keep user input on failure, clear the error only on the next success. The
<code>e instanceof Error</code> narrowing is the idiomatic TS catch pattern since <code>catch</code> variables
are <code>unknown</code>.</p>
<p>Follow-ups to be ready for: replace polling with an <code>AbortController</code>-cancellable long-poll or a
subscription, exponential backoff on poll errors, optimistic "queued" row before <code>createJob</code> resolves,
and lifting job state into a reducer once actions multiply (cancel, retry, delete).</p>`,
    },
  },

  /* ================= 3. RUN INSPECTOR ================= */
  {
    slug: "ts-run-inspector",
    name: "Mock 60m: Search + Paginate the Run Inspector",
    category: "TypeScript Practicals",
    lang: "ts",
    type: "react",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "31.09%",
    statement: `
<p><strong>Mock interview format:</strong> 60-minute timer, no AI tools, narrate. The inspector lists
records from a paginated, searchable fake API. The current code fetches page 1 once and ignores search
entirely. Extend it.</p>
<h3>Ticket</h3>
<ul>
<li><strong>Debounced search.</strong> Typing in <code>data-testid="search"</code> re-queries after the user pauses 250ms — intermediate keystrokes must not hit the API. Searching resets to page 1.</li>
<li><strong>Stale-response guard.</strong> Responses arriving out of order must never overwrite newer results (the API is slower for shorter queries — that is deliberate).</li>
<li><strong>Pagination.</strong> <code>data-testid="prev"</code> / <code>data-testid="next"</code> move between pages; Prev is disabled on page 1, Next is disabled on the last page. Show <code>data-testid="page-info"</code> as <code>Page X of Y</code> and <code>data-testid="total"</code> with the total match count.</li>
<li><strong>States.</strong> <code>data-testid="loading"</code> while a request is in flight; <code>data-testid="empty"</code> with <code>No matches</code> when a search returns zero records.</li>
<li>Records render as <code>data-testid="record"</code> rows showing the record name.</li>
</ul>`,
    starter: `/* ---- Wired fake API. Do not change. Shorter queries respond SLOWER. ---- */
interface RunRecord {
    id: number;
    name: string;
}

interface PageResult {
    records: RunRecord[];
    total: number;
    pageCount: number;
}

const ALL: RunRecord[] = Array.from({ length: 57 }, (_, i) => ({
    id: i + 1,
    name: (i % 3 === 0 ? "tokenize-" : i % 3 === 1 ? "filter-" : "sample-") + "run-" + (i + 1),
}));

const PAGE_SIZE = 10;

function fetchRecords(query: string, page: number): Promise<PageResult> {
    const delay = query.trim().length >= 2 ? 40 : 200;
    return new Promise((resolve) => {
        setTimeout(() => {
            const q = query.trim().toLowerCase();
            const hits = q ? ALL.filter((r) => r.name.includes(q)) : ALL;
            const pageCount = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
            resolve({
                records: hits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
                total: hits.length,
                pageCount,
            });
        }, delay);
    });
}

/* ---- Your work starts here. ---- */
function Inspector() {
    const [records, setRecords] = React.useState<RunRecord[]>([]);
    // TODO: debounced search, stale-response guard, pagination, loading + empty states.

    React.useEffect(() => {
        fetchRecords("", 1).then((res) => setRecords(res.records));
    }, []);

    return (
        <div>
            <input data-testid="search" placeholder="Search runs…" />
            <div>
                {records.map((r) => (
                    <div key={r.id} data-testid="record">{r.name}</div>
                ))}
            </div>
        </div>
    );
}

function App() {
    return <Inspector />;
}`,
    tests: [
      { name: "initial load: page 1 of 6, 57 total, 10 records", sample: true,
        body: `await sleep(400);
assert($$('[data-testid="record"]').length === 10, '10 records on page 1');
assert(tid('page-info').textContent.replace(/\\s+/g,' ').indexOf('Page 1 of 6') !== -1, 'page-info should read Page 1 of 6, got "' + tid('page-info').textContent + '"');
assert(tid('total').textContent.indexOf('57') !== -1, 'total should show 57');
assert(tid('prev').disabled === true, 'Prev disabled on page 1');
assert(tid('next').disabled === false, 'Next enabled on page 1');` },
      { name: "next/prev paginate with correct boundaries", sample: true,
        body: `await sleep(400);
await click(tid('next')); await sleep(350);
assert(tid('page-info').textContent.indexOf('Page 2 of 6') !== -1, 'page 2 after Next');
var first = $$('[data-testid="record"]')[0].textContent;
assert(first.indexOf('run-11') !== -1, 'page 2 starts at record 11, got ' + first);
for (var i = 0; i < 4; i++) { await click(tid('next')); await sleep(350); }
assert(tid('page-info').textContent.indexOf('Page 6 of 6') !== -1, 'page 6 after five Nexts');
assert($$('[data-testid="record"]').length === 7, 'last page has 7 records');
assert(tid('next').disabled === true, 'Next disabled on the last page');
await click(tid('prev')); await sleep(350);
assert(tid('page-info').textContent.indexOf('Page 5 of 6') !== -1, 'Prev goes back to page 5');` },
      { name: "search debounces at ~250ms and resets to page 1", sample: true,
        body: `await sleep(400);
await click(tid('next')); await sleep(350);
var inp = tid('search');
setValue(inp, 't'); await sleep(80);
setValue(inp, 'to'); await sleep(80);
setValue(inp, 'tok'); await sleep(80);
assert(tid('total').textContent.indexOf('57') !== -1, 'mid-typing (each keystroke <250ms apart) nothing has refetched yet');
await sleep(600);
assert(tid('total').textContent.indexOf('19') !== -1, '19 tokenize matches after the pause, got "' + tid('total').textContent + '"');
assert(tid('page-info').textContent.indexOf('Page 1 of 2') !== -1, 'search resets to page 1, got "' + tid('page-info').textContent + '"');` },
      { name: "stale slow response never overwrites fresh results", sample: false,
        body: `await sleep(400);
var inp = tid('search');
setValue(inp, 's'); await sleep(300);
setValue(inp, 'sample-run-5'); await sleep(700);
var recs = $$('[data-testid="record"]').map(function(e){return e.textContent;});
assert(tid('total').textContent.indexOf('3') !== -1, 'expected 3 matches for sample-run-5*, got "' + tid('total').textContent + '"');
assert(recs.every(function(t){return t.indexOf('sample-run-5') !== -1;}), 'the slow single-letter response must not overwrite, got ' + recs.slice(0,3).join(','));` },
      { name: "loading and empty states", sample: false,
        body: `await sleep(400);
var inp = tid('search');
setValue(inp, 'zzz-nothing');
await sleep(600);
assert(tid('empty') && tid('empty').textContent.indexOf('No matches') !== -1, 'empty state with "No matches"');
assert($$('[data-testid="record"]').length === 0, 'no record rows when empty');
setValue(inp, ''); await sleep(320);
assert(tid('loading'), 'loading indicator during the (slow) empty-query refetch');
await sleep(500);
assert($$('[data-testid="record"]').length === 10, 'back to full page 1');` },
    ],
    solution: {
      code: `interface RunRecord {
    id: number;
    name: string;
}

interface PageResult {
    records: RunRecord[];
    total: number;
    pageCount: number;
}

const ALL: RunRecord[] = Array.from({ length: 57 }, (_, i) => ({
    id: i + 1,
    name: (i % 3 === 0 ? "tokenize-" : i % 3 === 1 ? "filter-" : "sample-") + "run-" + (i + 1),
}));

const PAGE_SIZE = 10;

function fetchRecords(query: string, page: number): Promise<PageResult> {
    const delay = query.trim().length >= 2 ? 40 : 200;
    return new Promise((resolve) => {
        setTimeout(() => {
            const q = query.trim().toLowerCase();
            const hits = q ? ALL.filter((r) => r.name.includes(q)) : ALL;
            const pageCount = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
            resolve({
                records: hits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
                total: hits.length,
                pageCount,
            });
        }, delay);
    });
}

function Inspector() {
    const [query, setQuery] = React.useState("");
    const [debounced, setDebounced] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [result, setResult] = React.useState<PageResult | null>(null);
    const [loading, setLoading] = React.useState(true);
    const reqId = React.useRef(0);

    // Debounce the query; a search also resets to page 1.
    React.useEffect(() => {
        const t = setTimeout(() => {
            setDebounced(query);
            setPage(1);
        }, 250);
        return () => clearTimeout(t);
    }, [query]);

    // One effect owns fetching: any change of (debounced, page) issues a request
    // stamped with its id; only the latest id may commit.
    React.useEffect(() => {
        const id = ++reqId.current;
        setLoading(true);
        fetchRecords(debounced, page).then((res) => {
            if (id !== reqId.current) return; // stale
            setResult(res);
            setLoading(false);
        });
    }, [debounced, page]);

    const pageCount = result ? result.pageCount : 1;

    return (
        <div>
            <input data-testid="search" placeholder="Search runs…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {loading && <div data-testid="loading">Loading…</div>}
            {result && result.total === 0 && !loading && <div data-testid="empty">No matches</div>}
            <div>
                {(result ? result.records : []).map((r) => (
                    <div key={r.id} data-testid="record">{r.name}</div>
                ))}
            </div>
            <div>
                <button data-testid="prev" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <span data-testid="page-info">Page {page} of {pageCount}</span>
                <button data-testid="next" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
            <div data-testid="total">{result ? result.total : 0} total</div>
        </div>
    );
}

function App() {
    return <Inspector />;
}`,
      explanation: `
<p>The architecture worth stating in the first five minutes: <strong>two inputs, one fetch effect</strong>. The
raw query debounces into <code>debounced</code> (and resets the page — a search that keeps you on page 4 of the
old results is the classic bug), and a single effect keyed on <code>(debounced, page)</code> owns every request.
That collapses "search fired", "page changed", and "initial load" into one code path, so the loading flag, the
stale guard, and the commit logic exist exactly once. The starter's separate mount-effect fetch disappears —
the main effect's first run <em>is</em> the initial load.</p>
<p>The stale guard is the same request-counter idiom as any typeahead: stamp each request from a ref, compare on
resolve, drop losers. It composes with the debounce rather than replacing it — debouncing reduces requests, the
counter makes whatever requests still race harmless. The test forces this by making short queries slower than
long ones.</p>
<p>Pagination correctness lives in derived values: <code>disabled={page <= 1}</code> and
<code>disabled={page >= pageCount}</code> straight off the data, never a stored "canGoNext" boolean.
<code>PageResult | null</code> models "no data yet" honestly, and the empty state renders only when a settled
result has <code>total === 0</code> — gating it on <code>!loading</code> is what keeps "No matches" from
flashing during a slow refetch. Follow-ups: cache pages by <code>(query, page)</code>, AbortController instead
of the counter, cursor pagination, and URL-synced state so refresh restores the view.</p>`,
    },
  }
  );
})();
