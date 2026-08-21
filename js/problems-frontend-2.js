/* PracticeRank frontend problem bank II — advanced React patterns + CSS challenges.
 * Same schema as js/problems-frontend.js, plus a required `solution` object per
 * problem: { code, explanation } — a complete reference implementation and an
 * HTML prose explanation rendered in the "Best Solution" tab.
 * type: "react" — user writes a component named App (JSX, compiled with Babel in an iframe,
 *   graded by DOM-assertion tests run against a fresh render per test).
 * type: "css" — HTML fixture is fixed; user writes CSS only, graded by geometry/computed-style tests.
 * Test helpers available inside test bodies:
 *   react: $, $$, tid(id), click(el), setValue(el, v), flush(), sleep(ms), assert(cond, msg)
 *   css:   $, $$, rect(sel), cs(sel), assert(cond, msg)
 */
(function () {
  "use strict";
  window.FRONTEND_PROBLEMS = window.FRONTEND_PROBLEMS || [];
  window.FRONTEND_PROBLEMS.push(
  /* ============================ REACT II ============================ */
  {
    slug: "ts-typed-props-card",
    name: "React: TypeScript-Typed Props Card",
    category: "React II",
    type: "react",
    difficulty: "Easy",
    maxScore: 20,
    successRate: "81.47%",
    statement: `
<p>Your team ships TypeScript, but this grader compiles plain JSX &mdash; so the interface below is the
<em>contract</em>, not code you paste in. Implement <code>UserCard</code> so it honors every field of the type,
including the optional one.</p>
<h3>The contract (documentation only &mdash; do not paste into the editor)</h3>
<pre>interface User {
  id: number;
  name: string;
  role: "admin" | "member";
  email?: string;        // optional!
  yearsActive: number;   // 0 means they joined this year
}

interface UserCardProps {
  user: User;
}</pre>
<h3>Requirements</h3>
<ul>
<li><code>App</code> renders one <code>UserCard</code> per entry of the fixed <code>USERS</code> array (already wired).</li>
<li>Each card's root keeps <code>data-testid="user-card-&lt;id&gt;"</code>.</li>
<li>The name renders in <code>data-testid="user-name-&lt;id&gt;"</code>.</li>
<li>The role renders <strong>uppercased</strong> (<code>ADMIN</code> / <code>MEMBER</code>) in <code>data-testid="user-role-&lt;id&gt;"</code>.</li>
<li>If <code>email</code> is present, render it in <code>data-testid="user-email-&lt;id&gt;"</code>. If it is absent, that element must <strong>not exist at all</strong> &mdash; and the string <code>undefined</code> must never appear in the card.</li>
<li>Tenure renders in <code>data-testid="user-tenure-&lt;id&gt;"</code>: <code>New this year</code> when <code>yearsActive</code> is 0, otherwise <code>1 yr</code> / <code>2 yrs</code> / <code>4 yrs</code>&hellip; (singular for exactly 1).</li>
</ul>`,
    starter: `const USERS = [
    { id: 1, name: "Priya Raman", role: "admin", email: "priya@example.com", yearsActive: 4 },
    { id: 2, name: "Dev Chen", role: "member", yearsActive: 1 },
    { id: 3, name: "Sofia Alvarez", role: "member", email: "sofia@example.com", yearsActive: 0 },
];

function UserCard({ user }) {
    // TODO: honor the full UserCardProps contract from the statement:
    // name, uppercased role, conditional email, pluralized tenure.
    return (
        <div data-testid={"user-card-" + user.id}>
            {user.name}
        </div>
    );
}

function App() {
    return (
        <div>
            {USERS.map((u) => (
                <UserCard key={u.id} user={u} />
            ))}
        </div>
    );
}`,
    tests: [
      { name: "renders one card per user", sample: true,
        body: `assert(tid('user-card-1'), 'Missing data-testid="user-card-1"');
assert(tid('user-card-2'), 'Missing data-testid="user-card-2"');
assert(tid('user-card-3'), 'Missing data-testid="user-card-3"');` },
      { name: "shows the name and the uppercased role", sample: true,
        body: `assert(tid('user-name-1'), 'Missing data-testid="user-name-1"');
assert(tid('user-name-1').textContent.trim() === 'Priya Raman', 'Expected "Priya Raman", got "' + tid('user-name-1').textContent.trim() + '"');
assert(tid('user-role-1'), 'Missing data-testid="user-role-1"');
assert(tid('user-role-1').textContent.trim() === 'ADMIN', 'Role must be uppercased — expected "ADMIN", got "' + tid('user-role-1').textContent.trim() + '"');
assert(tid('user-role-2') && tid('user-role-2').textContent.trim() === 'MEMBER', 'Expected user 2 role "MEMBER"');` },
      { name: "email renders only when present", sample: false,
        body: `assert(tid('user-email-1'), 'User 1 has an email — data-testid="user-email-1" must exist');
assert(tid('user-email-1').textContent.trim() === 'priya@example.com', 'Expected "priya@example.com", got "' + tid('user-email-1').textContent.trim() + '"');
assert(!tid('user-email-2'), 'User 2 has NO email — data-testid="user-email-2" must not exist');
assert(tid('user-card-2').textContent.indexOf('undefined') === -1, 'The string "undefined" leaked into card 2');` },
      { name: "tenure is pluralized correctly", sample: false,
        body: `assert(tid('user-tenure-1') && tid('user-tenure-1').textContent.trim() === '4 yrs', 'Expected "4 yrs" for user 1, got "' + (tid('user-tenure-1') ? tid('user-tenure-1').textContent.trim() : 'MISSING') + '"');
assert(tid('user-tenure-2') && tid('user-tenure-2').textContent.trim() === '1 yr', 'Expected singular "1 yr" for user 2, got "' + (tid('user-tenure-2') ? tid('user-tenure-2').textContent.trim() : 'MISSING') + '"');
assert(tid('user-tenure-3') && tid('user-tenure-3').textContent.trim() === 'New this year', 'Expected "New this year" for user 3, got "' + (tid('user-tenure-3') ? tid('user-tenure-3').textContent.trim() : 'MISSING') + '"');` },
    ],
    solution: {
      code: `const USERS = [
    { id: 1, name: "Priya Raman", role: "admin", email: "priya@example.com", yearsActive: 4 },
    { id: 2, name: "Dev Chen", role: "member", yearsActive: 1 },
    { id: 3, name: "Sofia Alvarez", role: "member", email: "sofia@example.com", yearsActive: 0 },
];

function tenureLabel(yearsActive) {
    if (yearsActive === 0) return "New this year";
    return yearsActive + " yr" + (yearsActive === 1 ? "" : "s");
}

function UserCard({ user }) {
    return (
        <div data-testid={"user-card-" + user.id}>
            <h3 data-testid={"user-name-" + user.id}>{user.name}</h3>
            <span data-testid={"user-role-" + user.id}>{user.role.toUpperCase()}</span>
            {user.email && (
                <div data-testid={"user-email-" + user.id}>{user.email}</div>
            )}
            <div data-testid={"user-tenure-" + user.id}>{tenureLabel(user.yearsActive)}</div>
        </div>
    );
}

function App() {
    return (
        <div>
            {USERS.map((u) => (
                <UserCard key={u.id} user={u} />
            ))}
        </div>
    );
}`,
      explanation: `
<p>The whole exercise is about treating a TypeScript interface as a rendering contract even when the runtime is
plain JSX. The optional field is the trap: <code>email?: string</code> means the value can be
<code>undefined</code>, so the reference solution guards with <code>{user.email &amp;&amp; &lt;div&gt;&hellip;&lt;/div&gt;}</code>.
That short-circuit renders <em>nothing</em> when the field is absent, which is exactly what the hidden test checks
&mdash; both that the element does not exist and that the string <code>undefined</code> never leaks into the DOM.
Interpolating <code>{user.email}</code> unconditionally would fail the second check the moment you wrapped it in a
visible container.</p>
<p>Tenure formatting is pulled into a small pure helper, <code>tenureLabel</code>. Keeping the three-way branch
(zero, singular, plural) out of the JSX makes the component read like the interface it implements, and it gives
you one obvious place to unit-test the pluralization rule. Note the explicit <code>=== 0</code> comparison:
<code>0</code> is falsy, so a lazy <code>yearsActive ? &hellip;</code> guard would misroute brand-new members into
the plural branch. That falsy-zero footgun is the same reason <code>{count &amp;&amp; &lt;X/&gt;}</code> famously
renders a literal <code>0</code> in React &mdash; with strings like <code>email</code> the guard is safe, with
numbers it is not.</p>`,
    },
  },
  {
    slug: "mini-schema-validator",
    name: "React: Mini Schema Validator",
    category: "React II",
    type: "react",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "42.19%",
    statement: `
<p>The starter embeds <code>mv</code>, a tiny chainable schema validator in the spirit of zod. The builder API
(<code>mv.string().min(2).email()</code>, <code>mv.number().min(18).max(120)</code>,
<code>mv.object({&hellip;})</code>) already records the rules &mdash; but all three <code>validate()</code> methods
are stubs that blindly return <code>ok: true</code>. Implement them. The profile form is already wired to
<code>profileSchema.validate(&hellip;)</code>; you should not need to touch it.</p>
<h3>validate() contract</h3>
<ul>
<li><strong>String schema</strong> &mdash; returns <code>{ ok, errors }</code> where <code>errors</code> is an array of messages, checked in rule order after the type check:
  <ul>
  <li>value not a string &rarr; <code>must be a string</code></li>
  <li><code>min(n)</code> and <code>value.length &lt; n</code> &rarr; <code>must be at least &lt;n&gt; characters</code></li>
  <li><code>email()</code> and value doesn't look like <code>name@host.tld</code> &rarr; <code>must be a valid email</code></li>
  </ul></li>
<li><strong>Number schema</strong> &mdash; same shape:
  <ul>
  <li>value not a number, or <code>NaN</code> &rarr; <code>must be a number</code> (yes, <code>typeof NaN === "number"</code> &mdash; handle it)</li>
  <li><code>min(n)</code> / <code>max(n)</code> violations &rarr; <code>must be at least &lt;n&gt;</code> / <code>must be at most &lt;n&gt;</code></li>
  </ul></li>
<li><strong>Object schema</strong> &mdash; validates every key of its shape against the matching property and returns
<code>{ ok, errors }</code> where <code>errors</code> maps <em>only failing fields</em> to their <strong>first</strong> error message. <code>ok</code> is true when no field failed.</li>
</ul>
<h3>How the form uses it (already wired)</h3>
<ul>
<li>Submit runs the schema; failures render as <code>&lt;li data-testid="error-name"&gt;</code> / <code>error-email</code> / <code>error-age</code> containing the message.</li>
<li>A fully valid submit renders <code>&lt;div data-testid="form-success"&gt;</code> instead. Fields that pass must have no error element.</li>
<li>The age input is coerced with <code>Number(&hellip;)</code> before validation (empty &rarr; <code>NaN</code>).</li>
</ul>`,
    starter: `/* ================= mv — a tiny chainable schema validator =================
   The builder API is complete. Your job: the three validate() stubs.
   ========================================================================== */
const mv = (function () {
    function stringSchema() {
        const rules = [];
        const schema = {
            kind: "string",
            rules: rules,
            min(n) { rules.push({ type: "min", n: n }); return schema; },
            email() { rules.push({ type: "email" }); return schema; },
            validate(value) {
                // TODO: type check, then apply the rules array in order.
                // Messages (exact): "must be a string",
                // "must be at least <n> characters", "must be a valid email".
                return { ok: true, errors: [] };
            },
        };
        return schema;
    }
    function numberSchema() {
        const rules = [];
        const schema = {
            kind: "number",
            rules: rules,
            min(n) { rules.push({ type: "min", n: n }); return schema; },
            max(n) { rules.push({ type: "max", n: n }); return schema; },
            validate(value) {
                // TODO: type check (reject NaN!), then apply the rules array in order.
                // Messages (exact): "must be a number",
                // "must be at least <n>", "must be at most <n>".
                return { ok: true, errors: [] };
            },
        };
        return schema;
    }
    function objectSchema(shape) {
        return {
            kind: "object",
            shape: shape,
            validate(value) {
                // TODO: validate each key of the shape against value[key].
                // errors maps ONLY failing fields -> their FIRST message.
                return { ok: true, errors: {} };
            },
        };
    }
    return { string: stringSchema, number: numberSchema, object: objectSchema };
})();

const profileSchema = mv.object({
    name: mv.string().min(2),
    email: mv.string().email(),
    age: mv.number().min(18).max(120),
});

/* ---- The form below is already wired. No changes needed here. ---- */
function App() {
    const [fields, setFields] = React.useState({ name: "", email: "", age: "" });
    const [result, setResult] = React.useState(null);

    const update = (key) => (e) => setFields({ ...fields, [key]: e.target.value });

    function handleSubmit() {
        const age = fields.age.trim() === "" ? NaN : Number(fields.age);
        setResult(profileSchema.validate({ name: fields.name, email: fields.email, age: age }));
    }

    return (
        <div>
            <input data-testid="name-input" placeholder="Name" value={fields.name} onChange={update("name")} />
            <input data-testid="email-input" placeholder="Email" value={fields.email} onChange={update("email")} />
            <input data-testid="age-input" placeholder="Age" value={fields.age} onChange={update("age")} />
            <button data-testid="submit" onClick={handleSubmit}>Save</button>
            {result && result.ok && <div data-testid="form-success">Profile saved</div>}
            {result && !result.ok && (
                <ul>
                    {Object.keys(result.errors).map((k) => (
                        <li key={k} data-testid={"error-" + k}>{result.errors[k]}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}`,
    tests: [
      { name: "empty submit reports all three fields", sample: true,
        body: `await click(tid('submit')); await flush();
assert(!tid('form-success'), 'An empty form must not report success');
assert(tid('error-name'), 'Missing error-name for an empty name');
assert(tid('error-name').textContent.indexOf('at least 2 characters') !== -1, 'error-name should say "must be at least 2 characters", got "' + tid('error-name').textContent + '"');
assert(tid('error-email') && tid('error-email').textContent.indexOf('valid email') !== -1, 'error-email should say "must be a valid email"');
assert(tid('error-age') && tid('error-age').textContent.indexOf('must be a number') !== -1, 'Empty age coerces to NaN — error-age should say "must be a number"');` },
      { name: "a valid profile saves", sample: true,
        body: `setValue(tid('name-input'), 'Ada Lovelace'); await flush();
setValue(tid('email-input'), 'ada@example.com'); await flush();
setValue(tid('age-input'), '30'); await flush();
await click(tid('submit')); await flush();
assert(tid('form-success'), 'Valid data should render data-testid="form-success"');
assert(!tid('error-name') && !tid('error-email') && !tid('error-age'), 'No error elements may render on a valid submit');` },
      { name: "only failing fields get error entries", sample: false,
        body: `setValue(tid('name-input'), 'A'); await flush();
setValue(tid('email-input'), 'not-an-email'); await flush();
setValue(tid('age-input'), '30'); await flush();
await click(tid('submit')); await flush();
assert(tid('error-name') && tid('error-name').textContent.indexOf('at least 2 characters') !== -1, 'Name "A" must fail min(2)');
assert(tid('error-email') && tid('error-email').textContent.indexOf('valid email') !== -1, '"not-an-email" must fail email()');
assert(!tid('error-age'), 'Age 30 passes — it must NOT appear in errors');
assert(!tid('form-success'), 'Partial failure must not report success');` },
      { name: "number min/max bounds use the exact messages", sample: false,
        body: `setValue(tid('name-input'), 'Ada'); await flush();
setValue(tid('email-input'), 'ada@example.com'); await flush();
setValue(tid('age-input'), '150'); await flush();
await click(tid('submit')); await flush();
assert(tid('error-age') && tid('error-age').textContent.indexOf('must be at most 120') !== -1, 'Age 150 should say "must be at most 120", got "' + (tid('error-age') ? tid('error-age').textContent : 'MISSING') + '"');
setValue(tid('age-input'), '12'); await flush();
await click(tid('submit')); await flush();
assert(tid('error-age') && tid('error-age').textContent.indexOf('must be at least 18') !== -1, 'Age 12 should say "must be at least 18", got "' + (tid('error-age') ? tid('error-age').textContent : 'MISSING') + '"');` },
      { name: "errors clear after the user fixes the data", sample: false,
        body: `await click(tid('submit')); await flush();
assert(tid('error-name'), 'Sanity: empty submit shows errors');
setValue(tid('name-input'), 'Grace Hopper'); await flush();
setValue(tid('email-input'), 'grace@example.com'); await flush();
setValue(tid('age-input'), '45'); await flush();
await click(tid('submit')); await flush();
assert(tid('form-success'), 'Fixed data should save');
assert(!tid('error-name') && !tid('error-email') && !tid('error-age'), 'Old errors must clear after a valid submit');` },
    ],
    solution: {
      code: `const mv = (function () {
    const EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

    function stringSchema() {
        const rules = [];
        const schema = {
            kind: "string",
            rules: rules,
            min(n) { rules.push({ type: "min", n: n }); return schema; },
            email() { rules.push({ type: "email" }); return schema; },
            validate(value) {
                const errors = [];
                if (typeof value !== "string") {
                    errors.push("must be a string");
                } else {
                    rules.forEach((rule) => {
                        if (rule.type === "min" && value.length < rule.n) {
                            errors.push("must be at least " + rule.n + " characters");
                        }
                        if (rule.type === "email" && !EMAIL_RE.test(value)) {
                            errors.push("must be a valid email");
                        }
                    });
                }
                return { ok: errors.length === 0, errors: errors };
            },
        };
        return schema;
    }

    function numberSchema() {
        const rules = [];
        const schema = {
            kind: "number",
            rules: rules,
            min(n) { rules.push({ type: "min", n: n }); return schema; },
            max(n) { rules.push({ type: "max", n: n }); return schema; },
            validate(value) {
                const errors = [];
                if (typeof value !== "number" || Number.isNaN(value)) {
                    errors.push("must be a number");
                } else {
                    rules.forEach((rule) => {
                        if (rule.type === "min" && value < rule.n) {
                            errors.push("must be at least " + rule.n);
                        }
                        if (rule.type === "max" && value > rule.n) {
                            errors.push("must be at most " + rule.n);
                        }
                    });
                }
                return { ok: errors.length === 0, errors: errors };
            },
        };
        return schema;
    }

    function objectSchema(shape) {
        return {
            kind: "object",
            shape: shape,
            validate(value) {
                const errors = {};
                Object.keys(shape).forEach((key) => {
                    const res = shape[key].validate(value ? value[key] : undefined);
                    if (!res.ok) errors[key] = res.errors[0];
                });
                return { ok: Object.keys(errors).length === 0, errors: errors };
            },
        };
    }

    return { string: stringSchema, number: numberSchema, object: objectSchema };
})();

const profileSchema = mv.object({
    name: mv.string().min(2),
    email: mv.string().email(),
    age: mv.number().min(18).max(120),
});

function App() {
    const [fields, setFields] = React.useState({ name: "", email: "", age: "" });
    const [result, setResult] = React.useState(null);

    const update = (key) => (e) => setFields({ ...fields, [key]: e.target.value });

    function handleSubmit() {
        const age = fields.age.trim() === "" ? NaN : Number(fields.age);
        setResult(profileSchema.validate({ name: fields.name, email: fields.email, age: age }));
    }

    return (
        <div>
            <input data-testid="name-input" placeholder="Name" value={fields.name} onChange={update("name")} />
            <input data-testid="email-input" placeholder="Email" value={fields.email} onChange={update("email")} />
            <input data-testid="age-input" placeholder="Age" value={fields.age} onChange={update("age")} />
            <button data-testid="submit" onClick={handleSubmit}>Save</button>
            {result && result.ok && <div data-testid="form-success">Profile saved</div>}
            {result && !result.ok && (
                <ul>
                    {Object.keys(result.errors).map((k) => (
                        <li key={k} data-testid={"error-" + k}>{result.errors[k]}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}`,
      explanation: `
<p>The library works because each builder closes over its own <code>rules</code> array and returns
<code>schema</code> from every rule method &mdash; that is all "chainable" means. <code>validate()</code> then
becomes a fold over that array: run the type check first, and only if it passes walk the rules in registration
order, pushing messages. Gating the rule loop behind the type check matters &mdash; calling
<code>value.length</code> on a non-string would throw, and reporting <code>must be at least 2 characters</code>
about a number is nonsense.</p>
<p>The classic trap is <code>NaN</code>: the form coerces the age input with <code>Number(&hellip;)</code>, an empty
or garbage field becomes <code>NaN</code>, and <code>typeof NaN === "number"</code> is true. The reference guards
with <code>Number.isNaN</code> so bad input fails the <em>type</em> rule instead of sailing past
<code>min(18)</code> (every comparison with <code>NaN</code> is false, so without the guard the field would
validate!).</p>
<p>The object schema deliberately reports only <code>res.errors[0]</code> per field and omits passing fields
entirely. That shape maps one-to-one onto the UI &mdash; <code>Object.keys(errors)</code> is the render list, and
<code>ok</code> is derived from it rather than tracked separately, so the two can never disagree. Complexity is
O(fields &times; rules), trivially linear in schema size.</p>`,
    },
  },
  {
    slug: "hook-form-controlled",
    name: "React: useForm Register Pattern",
    category: "React II",
    type: "react",
    difficulty: "Hard",
    maxScore: 45,
    successRate: "47.53%",
    statement: `
<p>React Hook Form made the <code>register</code> pattern famous: a custom hook hands each input its wiring, and
the form component stays declarative. Implement <code>useForm</code> so the already-written login form works.
The form JSX should not need edits.</p>
<h3>useForm() must return</h3>
<ul>
<li><code>register(name, rules)</code> &mdash; returns props to spread onto an input: at minimum
<code>name</code>, a controlled <code>value</code> (default <code>""</code>), and an <code>onChange</code> that
stores the field's text. It must also remember <code>rules</code> for that field.</li>
<li><code>handleSubmit(onValid)</code> &mdash; returns an event handler that calls
<code>e.preventDefault()</code>, validates <strong>every registered field</strong>, updates <code>errors</code>,
and calls <code>onValid(values)</code> <em>only when there are no errors</em>. (The wired form attaches it to the
Log&nbsp;in button's <code>onClick</code> &mdash; the grader sandbox blocks native form submission &mdash; but the
handler must stay generic: take the event, prevent its default, validate, then decide.)</li>
<li><code>errors</code> &mdash; an object mapping field name &rarr; message for fields that failed the last submit.
Fields that pass have no entry.</li>
</ul>
<h3>Rule objects</h3>
<ul>
<li><code>required: "msg"</code> &mdash; fails when the value is empty or whitespace-only.</li>
<li><code>minLength: { value, message }</code> &mdash; fails when shorter than <code>value</code>.</li>
<li><code>pattern: { value, message }</code> &mdash; fails when the regex does not match.</li>
<li>Check in that order and report only the <strong>first</strong> failure per field.</li>
</ul>
<p>On a valid submit the form renders <code>&lt;div data-testid="welcome"&gt;Welcome, &lt;email&gt;&lt;/div&gt;</code>;
error messages render in <code>data-testid="error-email"</code> / <code>data-testid="error-password"</code>.</p>`,
    starter: `function useForm() {
    // TODO: store field values + rules, validate on submit, expose errors.
    return {
        register: function (name, rules) {
            return { name: name };
        },
        handleSubmit: function (onValid) {
            return function (e) {
                e.preventDefault();
                onValid({});
            };
        },
        errors: {},
    };
}

/* ---- The login form is already wired. No changes needed below. ---- */
function App() {
    const { register, handleSubmit, errors } = useForm();
    const [user, setUser] = React.useState(null);

    return (
        <form>
            <input data-testid="email" placeholder="Email"
                {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, message: "Enter a valid email" },
                })} />
            {errors.email && <div data-testid="error-email">{errors.email}</div>}

            <input data-testid="password" type="password" placeholder="Password"
                {...register("password", {
                    required: "Password is required",
                    minLength: { value: 8, message: "Password must be at least 8 characters" },
                })} />
            {errors.password && <div data-testid="error-password">{errors.password}</div>}

            <button type="button" data-testid="login"
                onClick={handleSubmit((values) => setUser(values))}>
                Log in
            </button>
            {user && <div data-testid="welcome">Welcome, {user.email}</div>}
        </form>
    );
}`,
    tests: [
      { name: "empty submit shows both required errors and no welcome", sample: true,
        body: `await click(tid('login')); await flush();
assert(tid('error-email'), 'Missing data-testid="error-email" after empty submit');
assert(tid('error-email').textContent.trim() === 'Email is required', 'Expected "Email is required", got "' + tid('error-email').textContent.trim() + '"');
assert(tid('error-password') && tid('error-password').textContent.trim() === 'Password is required', 'Expected "Password is required"');
assert(!tid('welcome'), 'onValid must NOT run when validation fails');` },
      { name: "valid credentials log in", sample: true,
        body: `setValue(tid('email'), 'grace@example.com'); await flush();
setValue(tid('password'), 'hopper1234'); await flush();
await click(tid('login')); await flush();
assert(tid('welcome'), 'Missing data-testid="welcome" after a valid submit');
assert(tid('welcome').textContent.indexOf('grace@example.com') !== -1, 'Welcome message must include the submitted email, got "' + tid('welcome').textContent + '"');
assert(!tid('error-email') && !tid('error-password'), 'No errors may render on a valid submit');` },
      { name: "pattern and minLength messages surface", sample: false,
        body: `setValue(tid('email'), 'not-an-email'); await flush();
setValue(tid('password'), 'short'); await flush();
await click(tid('login')); await flush();
assert(tid('error-email') && tid('error-email').textContent.trim() === 'Enter a valid email', 'Bad email should show the pattern message, got "' + (tid('error-email') ? tid('error-email').textContent.trim() : 'MISSING') + '"');
assert(tid('error-password') && tid('error-password').textContent.trim() === 'Password must be at least 8 characters', 'Short password should show the minLength message');
assert(!tid('welcome'), 'Invalid data must not log in');` },
      { name: "required wins over pattern for an empty field", sample: false,
        body: `setValue(tid('password'), 'hopper1234'); await flush();
await click(tid('login')); await flush();
assert(tid('error-email') && tid('error-email').textContent.trim() === 'Email is required', 'Empty email must report the required message (first failing rule), got "' + (tid('error-email') ? tid('error-email').textContent.trim() : 'MISSING') + '"');
assert(!tid('error-password'), 'A valid password must have no error entry');` },
      { name: "errors clear once the user fixes the fields", sample: false,
        body: `await click(tid('login')); await flush();
assert(tid('error-email'), 'Sanity: empty submit errors first');
setValue(tid('email'), 'ada@example.com'); await flush();
setValue(tid('password'), 'lovelace99'); await flush();
await click(tid('login')); await flush();
assert(!tid('error-email') && !tid('error-password'), 'Errors from the failed submit must clear');
assert(tid('welcome') && tid('welcome').textContent.indexOf('ada@example.com') !== -1, 'The corrected credentials should log in');` },
    ],
    solution: {
      code: `function useForm() {
    const [values, setValues] = React.useState({});
    const [errors, setErrors] = React.useState({});
    const rulesRef = React.useRef({});

    function register(name, rules) {
        rulesRef.current[name] = rules || {};
        return {
            name: name,
            value: values[name] || "",
            onChange: (e) => {
                const v = e.target.value;
                setValues((prev) => ({ ...prev, [name]: v }));
            },
        };
    }

    function validateField(value, rules) {
        const v = value || "";
        if (rules.required && v.trim() === "") return rules.required;
        if (rules.minLength && v.length < rules.minLength.value) return rules.minLength.message;
        if (rules.pattern && !rules.pattern.value.test(v)) return rules.pattern.message;
        return null;
    }

    function handleSubmit(onValid) {
        return (e) => {
            e.preventDefault();
            const nextErrors = {};
            Object.keys(rulesRef.current).forEach((name) => {
                const msg = validateField(values[name], rulesRef.current[name]);
                if (msg) nextErrors[name] = msg;
            });
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length === 0) onValid({ ...values });
        };
    }

    return { register: register, handleSubmit: handleSubmit, errors: errors };
}

function App() {
    const { register, handleSubmit, errors } = useForm();
    const [user, setUser] = React.useState(null);

    return (
        <form>
            <input data-testid="email" placeholder="Email"
                {...register("email", {
                    required: "Email is required",
                    pattern: { value: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, message: "Enter a valid email" },
                })} />
            {errors.email && <div data-testid="error-email">{errors.email}</div>}

            <input data-testid="password" type="password" placeholder="Password"
                {...register("password", {
                    required: "Password is required",
                    minLength: { value: 8, message: "Password must be at least 8 characters" },
                })} />
            {errors.password && <div data-testid="error-password">{errors.password}</div>}

            <button type="button" data-testid="login"
                onClick={handleSubmit((values) => setUser(values))}>
                Log in
            </button>
            {user && <div data-testid="welcome">Welcome, {user.email}</div>}
        </form>
    );
}`,
      explanation: `
<p>The hook keeps two pieces of React state &mdash; <code>values</code> (what the user typed) and
<code>errors</code> (the verdict of the last submit) &mdash; plus one <code>useRef</code> for the rules.
The ref is the interesting choice: <code>register</code> runs on <em>every render</em>, so storing rules in state
would call a setter during render and loop forever. A ref can be written during render safely because nothing
re-renders when it changes; it is just a registry the submit handler reads later.</p>
<p><code>register</code> returns <code>{ name, value, onChange }</code>, which the form spreads onto the input.
Supplying <code>value</code> (defaulting to <code>""</code>, never <code>undefined</code>) keeps the input
controlled from the first keystroke &mdash; returning <code>undefined</code> then a string later triggers React's
uncontrolled-to-controlled warning and can drop user input. The functional update in <code>onChange</code>
(<code>setValues(prev =&gt; &hellip;)</code>) protects rapid sequential keystrokes from clobbering each other.</p>
<p>Validation runs only inside <code>handleSubmit</code>: rules are checked in the documented order
(<code>required</code> &rarr; <code>minLength</code> &rarr; <code>pattern</code>) and the first failure wins,
mirroring React Hook Form's default mode. Building <code>nextErrors</code> as a fresh object and calling
<code>onValid</code> off that local object &mdash; not off state, which updates asynchronously &mdash; is what
makes "errors clear on the next valid submit" work.</p>`,
    },
  },
  {
    slug: "reducer-state-machine",
    name: "React: Checkout State Machine",
    category: "React II",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "68.02%",
    statement: `
<p>A checkout flow is a finite state machine: a fixed set of steps and a fixed set of legal moves between them.
Model it with <code>useReducer</code>. The UI (already wired) shows the current step in
<code>data-testid="step"</code> and dispatches from three buttons: <code>data-testid="next"</code>,
<code>data-testid="back"</code>, <code>data-testid="reset"</code>.</p>
<h3>Transition table</h3>
<ul>
<li>States, in order: <code>cart</code> &rarr; <code>shipping</code> &rarr; <code>payment</code> &rarr; <code>confirmed</code>. Initial state: <code>cart</code>.</li>
<li><code>NEXT</code> advances one step. At <code>confirmed</code> it is <strong>ignored</strong>.</li>
<li><code>BACK</code> goes one step back. At <code>cart</code> it is ignored. At <code>confirmed</code> it is also ignored &mdash; a placed order cannot be un-placed by stepping back.</li>
<li><code>RESET</code> returns to <code>cart</code> from <strong>any</strong> state.</li>
<li>Illegal events never throw and never change state &mdash; the reducer just returns the current state.</li>
<li>Unknown action types must also return the current state unchanged.</li>
</ul>
<p>Complete the <code>reducer</code> function. The component itself needs no edits.</p>`,
    starter: `function reducer(state, action) {
    // TODO: implement the transition table from the statement.
    // Illegal transitions return state unchanged — never throw.
    switch (action.type) {
        case "NEXT":
            return state;
        case "BACK":
            return state;
        case "RESET":
            return "cart";
        default:
            return state;
    }
}

/* ---- Already wired. No changes needed below. ---- */
function App() {
    const [step, dispatch] = React.useReducer(reducer, "cart");
    return (
        <div>
            <div data-testid="step">{step}</div>
            <button data-testid="next" onClick={() => dispatch({ type: "NEXT" })}>Next</button>
            <button data-testid="back" onClick={() => dispatch({ type: "BACK" })}>Back</button>
            <button data-testid="reset" onClick={() => dispatch({ type: "RESET" })}>Start over</button>
        </div>
    );
}`,
    tests: [
      { name: "starts at cart; BACK at cart is ignored", sample: true,
        body: `assert(tid('step').textContent.trim() === 'cart', 'Initial step must be "cart", got "' + tid('step').textContent.trim() + '"');
await click(tid('back')); await flush();
assert(tid('step').textContent.trim() === 'cart', 'BACK at cart must be ignored — still "cart"');` },
      { name: "NEXT walks cart → shipping → payment → confirmed", sample: true,
        body: `await click(tid('next')); await flush();
assert(tid('step').textContent.trim() === 'shipping', 'After 1 NEXT expected "shipping", got "' + tid('step').textContent.trim() + '"');
await click(tid('next')); await flush();
assert(tid('step').textContent.trim() === 'payment', 'After 2 NEXT expected "payment", got "' + tid('step').textContent.trim() + '"');
await click(tid('next')); await flush();
assert(tid('step').textContent.trim() === 'confirmed', 'After 3 NEXT expected "confirmed", got "' + tid('step').textContent.trim() + '"');` },
      { name: "NEXT at confirmed is ignored", sample: false,
        body: `for (var i = 0; i < 3; i++) { await click(tid('next')); await flush(); }
await click(tid('next')); await flush();
assert(tid('step').textContent.trim() === 'confirmed', 'A 4th NEXT must be ignored at "confirmed", got "' + tid('step').textContent.trim() + '"');` },
      { name: "BACK retraces the flow but not out of confirmed", sample: false,
        body: `await click(tid('next')); await flush();
await click(tid('next')); await flush();
await click(tid('back')); await flush();
assert(tid('step').textContent.trim() === 'shipping', 'payment + BACK should be "shipping", got "' + tid('step').textContent.trim() + '"');
await click(tid('next')); await flush();
await click(tid('next')); await flush();
assert(tid('step').textContent.trim() === 'confirmed', 'Sanity: should reach "confirmed"');
await click(tid('back')); await flush();
assert(tid('step').textContent.trim() === 'confirmed', 'BACK at confirmed must be ignored — an order cannot be un-placed');` },
      { name: "RESET returns to cart from anywhere", sample: false,
        body: `for (var i = 0; i < 3; i++) { await click(tid('next')); await flush(); }
await click(tid('reset')); await flush();
assert(tid('step').textContent.trim() === 'cart', 'RESET from confirmed must land on "cart", got "' + tid('step').textContent.trim() + '"');
await click(tid('next')); await flush();
assert(tid('step').textContent.trim() === 'shipping', 'The machine must be fully usable again after RESET');` },
    ],
    solution: {
      code: `const TRANSITIONS = {
    cart:      { NEXT: "shipping" },
    shipping:  { NEXT: "payment", BACK: "cart" },
    payment:   { NEXT: "confirmed", BACK: "shipping" },
    confirmed: {},
};

function reducer(state, action) {
    if (action.type === "RESET") return "cart";
    const row = TRANSITIONS[state] || {};
    return row[action.type] || state;
}

function App() {
    const [step, dispatch] = React.useReducer(reducer, "cart");
    return (
        <div>
            <div data-testid="step">{step}</div>
            <button data-testid="next" onClick={() => dispatch({ type: "NEXT" })}>Next</button>
            <button data-testid="back" onClick={() => dispatch({ type: "BACK" })}>Back</button>
            <button data-testid="reset" onClick={() => dispatch({ type: "RESET" })}>Start over</button>
        </div>
    );
}`,
      explanation: `
<p>Instead of a <code>switch</code> full of nested <code>if</code>s, the reference encodes the machine as
<em>data</em>: a plain object where <code>TRANSITIONS[state][event]</code> is the target state. The reducer
becomes two lines &mdash; handle the global <code>RESET</code> escape hatch, then look up the row and fall back to
<code>state</code> when the cell is empty. Every "ignore illegal moves" requirement falls out of that
<code>|| state</code> fallback for free: <code>confirmed</code> has an empty row, so both <code>NEXT</code> and
<code>BACK</code> miss the lookup and return the current state. Adding a new step or event later means editing
the table, not the control flow, and the table doubles as documentation you can eyeball against the spec.</p>
<p>Two reducer disciplines matter here. First, a reducer must be pure and total: it returns a value for
<em>every</em> state/action pair and never throws, which is why the unknown-action case also lands on the
fallback. Second, returning the <em>same</em> <code>state</code> reference for ignored events lets React bail out
of re-rendering entirely (it compares with <code>Object.is</code>), so hammering a dead button costs nothing.
Lookups are O(1); the machine's correctness is testable by walking the table &mdash; exactly what the hidden tests
do.</p>`,
    },
  },
  {
    slug: "use-debounce-hook",
    name: "React: useDebounce Hook",
    category: "React II",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "64.88%",
    statement: `
<p>Live-search boxes should not fire a request per keystroke. The standard fix is a debounced value: it trails
the real value and only catches up after the user pauses. Implement
<code>useDebounce(value, delay)</code>. The search UI is already wired.</p>
<h3>Requirements</h3>
<ul>
<li><code>useDebounce(value, delay)</code> returns a value that equals <code>value</code> initially, and thereafter
only updates once <code>value</code> has stopped changing for <code>delay</code> milliseconds.</li>
<li>Every change of <code>value</code> restarts the timer &mdash; intermediate values that get replaced within
<code>delay</code> ms must <strong>never</strong> surface.</li>
<li>Clean up the pending timer when the value changes again or the component unmounts (no state updates from stale timers).</li>
<li>The wired UI: typing in <code>data-testid="search"</code> updates <code>data-testid="immediate"</code> on every
keystroke, while <code>data-testid="debounced"</code> shows the debounced value (delay is 300&nbsp;ms).</li>
</ul>`,
    starter: `function useDebounce(value, delay) {
    // TODO: return a trailing copy of value that only updates after
    // delay ms without changes. Right now it updates instantly — fix that.
    return value;
}

/* ---- Already wired. No changes needed below. ---- */
function App() {
    const [text, setText] = React.useState("");
    const debounced = useDebounce(text, 300);
    return (
        <div>
            <input data-testid="search" placeholder="Search…" value={text} onChange={(e) => setText(e.target.value)} />
            <div>typing: <span data-testid="immediate">{text}</span></div>
            <div>debounced: <span data-testid="debounced">{debounced}</span></div>
        </div>
    );
}`,
    tests: [
      { name: "starts in sync while idle", sample: true,
        body: `assert(tid('immediate').textContent === '', 'Immediate value should start empty');
assert(tid('debounced').textContent === '', 'Debounced value should start empty');` },
      { name: "debounced value lags behind fresh keystrokes", sample: true,
        body: `setValue(tid('search'), 're'); await flush();
assert(tid('immediate').textContent === 're', 'Immediate value must update instantly, got "' + tid('immediate').textContent + '"');
assert(tid('debounced').textContent === '', 'Only ~40ms passed — the debounced value must still be empty, got "' + tid('debounced').textContent + '"');` },
      { name: "catches up after the delay", sample: false,
        body: `setValue(tid('search'), 'react'); await flush();
await sleep(600);
assert(tid('debounced').textContent === 'react', 'After 600ms of silence the debounced value must be "react", got "' + tid('debounced').textContent + '"');` },
      { name: "rapid typing keeps restarting the timer", sample: false,
        body: `setValue(tid('search'), 'r'); await sleep(120);
setValue(tid('search'), 're'); await sleep(120);
setValue(tid('search'), 'rea'); await sleep(100);
assert(tid('debounced').textContent === '', 'Each keystroke came within 300ms — the timer must restart, so debounced is still empty, got "' + tid('debounced').textContent + '"');
await sleep(600);
assert(tid('debounced').textContent === 'rea', 'Only the final value may surface, got "' + tid('debounced').textContent + '"');` },
    ],
    solution: {
      code: `function useDebounce(value, delay) {
    const [debounced, setDebounced] = React.useState(value);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

function App() {
    const [text, setText] = React.useState("");
    const debounced = useDebounce(text, 300);
    return (
        <div>
            <input data-testid="search" placeholder="Search…" value={text} onChange={(e) => setText(e.target.value)} />
            <div>typing: <span data-testid="immediate">{text}</span></div>
            <div>debounced: <span data-testid="debounced">{debounced}</span></div>
        </div>
    );
}`,
      explanation: `
<p>The entire hook is one <code>useState</code> plus one <code>useEffect</code>, and the cleverness lives in the
cleanup function. Every time <code>value</code> changes, the effect re-runs; but <em>before</em> the new effect
starts, React invokes the previous effect's cleanup, which cancels the previous <code>setTimeout</code>. That
built-in "cancel the old one first" sequencing <strong>is</strong> the debounce &mdash; only a timer that survives
<code>delay</code> ms without being displaced ever fires, so intermediate values are structurally incapable of
surfacing. No refs, no manual bookkeeping, no comparing timestamps.</p>
<p>Seeding <code>useState(value)</code> keeps the debounced copy in sync on the very first render instead of
flashing <code>undefined</code>. Including <code>delay</code> in the dependency array is easy to forget: without
it a component that changes its delay would keep debouncing at the stale rate. The cleanup also runs on unmount,
which is what prevents the classic "setState on an unmounted component" leak from a timer that outlives its
owner.</p>
<p>A common wrong turn is debouncing the <em>event handler</em> with a module-level timer. That breaks with
multiple component instances (they share the timer) and fights React's controlled-input model. Debouncing the
<em>derived value</em> keeps the input perfectly responsive while downstream consumers see the calm version.</p>`,
    },
  },
  {
    slug: "use-fetch-abort",
    name: "React: useFetch with AbortController",
    category: "React II",
    type: "react",
    difficulty: "Hard",
    maxScore: 50,
    successRate: "38.71%",
    statement: `
<p>The classic data-fetching race: the user triggers a slow request, then a fast one. The fast response arrives
first &mdash; then the slow one lands and <em>overwrites</em> it. Fix it by implementing <code>useFetch(url)</code>
with an <code>AbortController</code> that cancels the in-flight request whenever <code>url</code> changes (and on
unmount).</p>
<p>The starter provides a deterministic in-memory network &mdash; <code>fakeFetch(url, { signal })</code> &mdash;
with two endpoints: <code>/api/user/slow</code> (resolves after 300&nbsp;ms) and <code>/api/user/fast</code>
(resolves after 60&nbsp;ms). It honors <code>options.signal</code> exactly like real <code>fetch</code>: on abort
it rejects with an <code>AbortError</code> and records the aborted URL in <code>window.__abortLog</code> (the
grader reads that log). Do not modify the fake-network section.</p>
<h3>useFetch(url) requirements</h3>
<ul>
<li>Returns <code>{ loading, data }</code>. When <code>url</code> is falsy: no fetch, <code>loading: false</code>, <code>data: null</code>.</li>
<li>When <code>url</code> changes: abort any in-flight request, set <code>loading: true</code>, clear old data, fetch the new URL via <code>fakeFetch(url, { signal })</code>, then <code>res.json()</code>.</li>
<li>An <code>AbortError</code> must be swallowed silently &mdash; it must never write state (that is the whole point).</li>
<li>The wired UI: <code>data-testid="load-slow"</code> / <code>data-testid="load-fast"</code> set the URL,
<code>data-testid="status"</code> shows <code>idle</code> / <code>loading</code> / <code>done</code>, and
<code>data-testid="result"</code> shows the fetched <code>name</code>.</li>
<li>The acceptance bar: slow-then-fast must end on the fast payload (<code>Fast Falcon</code>), and the slow request must actually be aborted, not just ignored.</li>
</ul>`,
    starter: `/* ---- fake network (do not modify) ---- */
const FAKE_DB = {
    "/api/user/slow": { delay: 300, payload: { name: "Slow Sloth" } },
    "/api/user/fast": { delay: 60, payload: { name: "Fast Falcon" } },
};
window.__abortLog = window.__abortLog || [];
function fakeFetch(url, options) {
    const entry = FAKE_DB[url];
    const signal = options && options.signal;
    return new Promise((resolve, reject) => {
        if (!entry) { reject(new Error("404 " + url)); return; }
        let settled = false;
        const timer = setTimeout(() => {
            settled = true;
            resolve({ ok: true, json: () => Promise.resolve(entry.payload) });
        }, entry.delay);
        if (signal) {
            signal.addEventListener("abort", () => {
                if (settled) return;
                clearTimeout(timer);
                window.__abortLog.push(url);
                reject(new DOMException("The operation was aborted.", "AbortError"));
            });
        }
    });
}
/* ---- end fake network ---- */

function useFetch(url) {
    const [state, setState] = React.useState({ loading: false, data: null });

    React.useEffect(() => {
        if (!url) return;
        setState({ loading: true, data: null });
        // TODO: this version never aborts — a slow response can overwrite
        // a newer fast one. Wire up an AbortController + cleanup.
        fakeFetch(url)
            .then((res) => res.json())
            .then((data) => setState({ loading: false, data: data }));
    }, [url]);

    return state;
}

/* ---- Already wired. No changes needed below. ---- */
function App() {
    const [url, setUrl] = React.useState(null);
    const { loading, data } = useFetch(url);
    return (
        <div>
            <button data-testid="load-slow" onClick={() => setUrl("/api/user/slow")}>Load slow profile</button>
            <button data-testid="load-fast" onClick={() => setUrl("/api/user/fast")}>Load fast profile</button>
            <div data-testid="status">{loading ? "loading" : data ? "done" : "idle"}</div>
            <div data-testid="result">{data ? data.name : ""}</div>
        </div>
    );
}`,
    tests: [
      { name: "fetches and renders a profile", sample: true,
        body: `assert(tid('status').textContent.trim() === 'idle', 'Before any click the status must be "idle"');
await click(tid('load-fast'));
assert(tid('status').textContent.trim() === 'loading', 'Right after the click the status must be "loading", got "' + tid('status').textContent.trim() + '"');
await sleep(300);
assert(tid('status').textContent.trim() === 'done', 'Status must be "done" once data arrives');
assert(tid('result').textContent.trim() === 'Fast Falcon', 'Expected "Fast Falcon", got "' + tid('result').textContent.trim() + '"');` },
      { name: "slow-then-fast: the fast (newer) request wins", sample: true,
        body: `await click(tid('load-slow'));
await sleep(80);
await click(tid('load-fast'));
await sleep(500);
assert(tid('result').textContent.trim() === 'Fast Falcon', 'The stale slow response overwrote the newer fast one — expected "Fast Falcon", got "' + tid('result').textContent.trim() + '"');
assert(tid('status').textContent.trim() === 'done', 'Status must settle on "done"');` },
      { name: "the superseded request is actually aborted", sample: false,
        body: `window.__abortLog.length = 0;
await click(tid('load-slow'));
await sleep(80);
await click(tid('load-fast'));
await sleep(500);
assert(window.__abortLog.indexOf('/api/user/slow') !== -1, 'Switching URLs must abort the in-flight slow request via its AbortSignal (log: [' + window.__abortLog.join(', ') + '])');
assert(tid('result').textContent.trim() === 'Fast Falcon', 'And the fast payload must be the one on screen');` },
      { name: "a single completed request is never aborted mid-flight", sample: false,
        body: `window.__abortLog.length = 0;
await click(tid('load-slow'));
await sleep(60);
assert(tid('status').textContent.trim() === 'loading', 'Still in flight at 60ms — status "loading"');
await sleep(400);
assert(window.__abortLog.length === 0, 'No URL change happened — nothing may be aborted while the component lives (log: [' + window.__abortLog.join(', ') + '])');
assert(tid('result').textContent.trim() === 'Slow Sloth', 'The slow profile should render normally, got "' + tid('result').textContent.trim() + '"');` },
    ],
    solution: {
      code: `/* ---- fake network (do not modify) ---- */
const FAKE_DB = {
    "/api/user/slow": { delay: 300, payload: { name: "Slow Sloth" } },
    "/api/user/fast": { delay: 60, payload: { name: "Fast Falcon" } },
};
window.__abortLog = window.__abortLog || [];
function fakeFetch(url, options) {
    const entry = FAKE_DB[url];
    const signal = options && options.signal;
    return new Promise((resolve, reject) => {
        if (!entry) { reject(new Error("404 " + url)); return; }
        let settled = false;
        const timer = setTimeout(() => {
            settled = true;
            resolve({ ok: true, json: () => Promise.resolve(entry.payload) });
        }, entry.delay);
        if (signal) {
            signal.addEventListener("abort", () => {
                if (settled) return;
                clearTimeout(timer);
                window.__abortLog.push(url);
                reject(new DOMException("The operation was aborted.", "AbortError"));
            });
        }
    });
}
/* ---- end fake network ---- */

function useFetch(url) {
    const [state, setState] = React.useState({ loading: false, data: null });

    React.useEffect(() => {
        if (!url) return;
        const controller = new AbortController();
        setState({ loading: true, data: null });
        fakeFetch(url, { signal: controller.signal })
            .then((res) => res.json())
            .then((data) => setState({ loading: false, data: data }))
            .catch((err) => {
                if (err && err.name === "AbortError") return; // expected — stay silent
                setState({ loading: false, data: null });
            });
        return () => controller.abort();
    }, [url]);

    return state;
}

function App() {
    const [url, setUrl] = React.useState(null);
    const { loading, data } = useFetch(url);
    return (
        <div>
            <button data-testid="load-slow" onClick={() => setUrl("/api/user/slow")}>Load slow profile</button>
            <button data-testid="load-fast" onClick={() => setUrl("/api/user/fast")}>Load fast profile</button>
            <div data-testid="status">{loading ? "loading" : data ? "done" : "idle"}</div>
            <div data-testid="result">{data ? data.name : ""}</div>
        </div>
    );
}`,
      explanation: `
<p>The bug in the starter is a race, and races are not fixed by hoping &mdash; they are fixed by making the stale
path impossible. The reference creates one <code>AbortController</code> <em>per effect run</em> and returns
<code>() =&gt; controller.abort()</code> as the cleanup. When <code>url</code> changes, React runs the old
cleanup before the new effect, so the slow request is cancelled at the source before the fast one even starts.
The stale response never arrives, so it cannot overwrite anything &mdash; a strictly stronger guarantee than the
popular <code>let cancelled = true</code> boolean, which lets the request complete and merely ignores the bytes.
With a real network, aborting also frees the connection.</p>
<p>The subtle line is the <code>catch</code>: aborting rejects the promise with an <code>AbortError</code>, and
that rejection <em>must</em> be swallowed without touching state. Calling <code>setState</code> there would
resurrect the race (the abort of request A would clobber the loading state of request B) and, on unmount, write
to a dead component. Checking <code>err.name === "AbortError"</code> rather than <code>instanceof</code> is
deliberate &mdash; it survives cross-realm <code>DOMException</code>s.</p>
<p>Note the controller lives inside the effect closure, not in a ref: each run owns exactly one controller, so
there is no shared mutable slot to mismanage. Unmount safety comes free from the same cleanup.</p>`,
    },
  },
  {
    slug: "use-local-storage-hook",
    name: "React: useLocalStorage Hook",
    category: "React II",
    type: "react",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "61.34%",
    statement: `
<p>Implement <code>useLocalStorage(key, initialValue)</code> &mdash; a drop-in <code>useState</code> replacement
whose value survives a "page reload". The profile UI is already wired: an editor input and a badge share one
hook instance, and a <code>data-testid="reload"</code> button remounts the profile section (via a changing
<code>key</code>), simulating a refresh.</p>
<p><strong>One sandbox note:</strong> this grader runs in an opaque-origin iframe where touching real
<code>window.localStorage</code> throws a <code>SecurityError</code>. The starter therefore ships
<code>appStorage</code> &mdash; an in-memory object with the exact <code>Storage</code> API
(<code>getItem</code> / <code>setItem</code> / <code>removeItem</code>, string values, <code>null</code> for
missing keys). Write your hook against <code>appStorage</code>; in production you would swap in
<code>window.localStorage</code> and change nothing else. The grader reads and writes <code>appStorage</code>
directly. Do not modify the shim.</p>
<h3>Requirements</h3>
<ul>
<li>On first render, read <code>appStorage.getItem(key)</code>. If a value is stored, <strong>JSON-parse</strong> it and use it; otherwise use <code>initialValue</code>. (Read lazily &mdash; do not hit storage on every render.)</li>
<li>The returned setter updates React state <em>and</em> writes the new value to storage as JSON (<code>JSON.stringify</code>) under the same key.</li>
<li>A corrupt stored value (unparseable JSON) must not crash the component &mdash; fall back to <code>initialValue</code>.</li>
<li>The wired UI uses the key <code>pr-demo-name</code> with initial value <code>"Anonymous"</code>: typing in
<code>data-testid="name-input"</code> updates <code>data-testid="badge"</code> and storage; clicking
<code>data-testid="reload"</code> must bring the typed name back from storage.</li>
</ul>`,
    starter: `/* ---- storage shim (do not modify): the grader sandbox has an opaque
   origin, so real localStorage throws. Same API, in-memory. ---- */
window.appStorage = window.appStorage || (function () {
    const data = {};
    return {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: (k) => { delete data[k]; },
    };
})();
const appStorage = window.appStorage;
/* ---- end storage shim ---- */

function useLocalStorage(key, initialValue) {
    // TODO: read the stored JSON on first render (lazily),
    // and write JSON to appStorage on every set.
    return React.useState(initialValue);
}

/* ---- Already wired. No changes needed below. ---- */
function Profile() {
    const [name, setName] = useLocalStorage("pr-demo-name", "Anonymous");
    return (
        <div>
            <input data-testid="name-input" value={name} onChange={(e) => setName(e.target.value)} />
            <span data-testid="badge">{name}</span>
        </div>
    );
}

function App() {
    const [epoch, setEpoch] = React.useState(0);
    return (
        <div>
            {/* Remounts <Profile> — the closest thing to a page refresh in here */}
            <button data-testid="reload" onClick={() => setEpoch((e) => e + 1)}>Simulate reload</button>
            <Profile key={epoch} />
        </div>
    );
}`,
    tests: [
      { name: "falls back to the initial value when storage is empty", sample: true,
        body: `window.appStorage.removeItem('pr-demo-name');
await click(tid('reload')); await flush();
assert(tid('badge').textContent.trim() === 'Anonymous', 'With empty storage the badge must show "Anonymous", got "' + tid('badge').textContent.trim() + '"');
assert(tid('name-input').value === 'Anonymous', 'The input must also show the initial value');` },
      { name: "setting the value writes JSON to storage", sample: true,
        body: `window.appStorage.removeItem('pr-demo-name');
await click(tid('reload')); await flush();
setValue(tid('name-input'), 'Grace'); await flush();
assert(tid('badge').textContent.trim() === 'Grace', 'The badge must live-update, got "' + tid('badge').textContent.trim() + '"');
assert(window.appStorage.getItem('pr-demo-name') === '"Grace"', 'Expected appStorage to hold the JSON string \\'"Grace"\\', got ' + JSON.stringify(window.appStorage.getItem('pr-demo-name')));` },
      { name: "a pre-seeded value is read back on mount", sample: false,
        body: `window.appStorage.setItem('pr-demo-name', JSON.stringify('Linus'));
await click(tid('reload')); await flush();
assert(tid('name-input').value === 'Linus', 'The stored value must hydrate the input, got "' + tid('name-input').value + '"');
assert(tid('badge').textContent.trim() === 'Linus', 'The badge must hydrate too');` },
      { name: "typed value survives a simulated reload", sample: false,
        body: `window.appStorage.removeItem('pr-demo-name');
await click(tid('reload')); await flush();
setValue(tid('name-input'), 'Margaret'); await flush();
await click(tid('reload')); await flush();
assert(tid('badge').textContent.trim() === 'Margaret', 'After a remount the name must come back from storage, got "' + tid('badge').textContent.trim() + '"');` },
    ],
    solution: {
      code: `/* ---- storage shim (do not modify): the grader sandbox has an opaque
   origin, so real localStorage throws. Same API, in-memory. ---- */
window.appStorage = window.appStorage || (function () {
    const data = {};
    return {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: (k) => { delete data[k]; },
    };
})();
const appStorage = window.appStorage;
/* ---- end storage shim ---- */

function useLocalStorage(key, initialValue) {
    const [value, setValue] = React.useState(() => {
        try {
            const raw = appStorage.getItem(key);
            return raw === null ? initialValue : JSON.parse(raw);
        } catch (e) {
            return initialValue; // corrupt JSON or storage blocked
        }
    });

    const set = (next) => {
        setValue(next);
        try {
            appStorage.setItem(key, JSON.stringify(next));
        } catch (e) {
            /* storage full or blocked — state still works in-memory */
        }
    };

    return [value, set];
}

function Profile() {
    const [name, setName] = useLocalStorage("pr-demo-name", "Anonymous");
    return (
        <div>
            <input data-testid="name-input" value={name} onChange={(e) => setName(e.target.value)} />
            <span data-testid="badge">{name}</span>
        </div>
    );
}

function App() {
    const [epoch, setEpoch] = React.useState(0);
    return (
        <div>
            <button data-testid="reload" onClick={() => setEpoch((e) => e + 1)}>Simulate reload</button>
            <Profile key={epoch} />
        </div>
    );
}`,
      explanation: `
<p>Two decisions carry this hook. First, the <strong>lazy initializer</strong>:
<code>useState(() =&gt; &hellip;)</code> runs the storage read exactly once, on mount. Passing the read directly
&mdash; <code>useState(readStorage())</code> &mdash; would hit storage on <em>every</em> render only to throw the
result away after the first; against real <code>localStorage</code> (a synchronous, comparatively slow API with
the exact same <code>getItem</code>/<code>setItem</code> surface as the shim) that is a genuine cost. The distinction
between "a value" and "a function that produces the value" is exactly what the lazy form exists for.</p>
<p>Second, the setter writes through to storage at the moment of the change, keeping React state and storage in
lockstep without an extra <code>useEffect</code>. The effect-based alternative (<code>useEffect(&hellip;, [value])</code>)
also works but has a sharp edge: it fires on mount too, so it silently writes the <em>initial</em> value into
storage before the user has touched anything &mdash; surprising for anything that treats "key absent" as
meaningful.</p>
<p>Both storage touches sit in <code>try/catch</code> because <code>getItem</code> can return junk (hand-edited
or version-skewed JSON makes <code>JSON.parse</code> throw) and, once you swap the shim for the real
<code>localStorage</code>, <code>setItem</code> can throw on full quotas or private-browsing modes. The hook
degrades to plain <code>useState</code> instead of taking the component down.
JSON round-tripping, rather than storing raw strings, is what lets the same hook persist numbers, booleans, and
objects unchanged.</p>`,
    },
  },
  {
    slug: "context-memo-perf",
    name: "React: Context + React.memo Render Control",
    category: "React II",
    type: "react",
    difficulty: "Hard",
    maxScore: 45,
    successRate: "44.96%",
    statement: `
<p>The page has a theme toggle, a free-text note input, and an "expensive" list. Every keystroke in the note
currently re-renders the expensive list &mdash; you can watch it happen in the render counter. Your job: make the
list re-render <strong>only</strong> when the theme changes, without moving the note state or restructuring the
tree.</p>
<h3>Setup (already wired)</h3>
<ul>
<li><code>ThemeContext</code> provides the current theme; <code>ExpensiveList</code> reads it with <code>useContext</code>.</li>
<li><code>ExpensiveList</code> increments a module-level counter each time it renders and displays it in <code>data-testid="render-count"</code>. Leave the counter mechanism alone &mdash; the grader reads it.</li>
<li><code>data-testid="note-input"</code> holds unrelated state in <code>App</code>; <code>data-testid="toggle-theme"</code> flips the theme; <code>data-testid="theme-label"</code> shows it.</li>
</ul>
<h3>Requirements</h3>
<ul>
<li>Typing in the note input must <strong>not</strong> change <code>data-testid="render-count"</code>.</li>
<li>Clicking the theme toggle must re-render the list (context subscription stays intact) and update <code>data-testid="theme-label"</code> (<code>light</code> &harr; <code>dark</code>).</li>
<li>The list keeps rendering its 6 items in <code>data-testid="item-list"</code>.</li>
<li>Hint: <code>React.memo</code> blocks re-renders caused by a <em>parent</em>, but a memoized component that
calls <code>useContext</code> still re-renders when the <em>context value</em> changes &mdash; that pairing is the
whole exercise.</li>
</ul>`,
    starter: `const ITEMS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
const ThemeContext = React.createContext("light");

let listRenders = 0; // read by the grader — leave the mechanism alone

// TODO: typing in the note re-renders this list on every keystroke.
// Stop that without breaking the theme subscription.
function ExpensiveList() {
    const theme = React.useContext(ThemeContext);
    listRenders += 1; // pretend each render does heavy work
    return (
        <div>
            <div data-testid="render-count">{listRenders}</div>
            <ul data-testid="item-list" className={"list-" + theme}>
                {ITEMS.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

function App() {
    const [theme, setTheme] = React.useState("light");
    const [note, setNote] = React.useState("");
    return (
        <ThemeContext.Provider value={theme}>
            <button data-testid="toggle-theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                Toggle theme
            </button>
            <div data-testid="theme-label">{theme}</div>
            <input data-testid="note-input" placeholder="Unrelated note" value={note} onChange={(e) => setNote(e.target.value)} />
            <ExpensiveList />
        </ThemeContext.Provider>
    );
}`,
    tests: [
      { name: "renders the list and a numeric render count", sample: true,
        body: `var n = parseInt(tid('render-count').textContent, 10);
assert(!isNaN(n) && n >= 1, 'render-count must show a positive integer, got "' + tid('render-count').textContent + '"');
assert($$('[data-testid="item-list"] li').length === 6, 'Expected 6 list items');` },
      { name: "typing in the note does NOT re-render the list", sample: true,
        body: `var before = parseInt(tid('render-count').textContent, 10);
setValue(tid('note-input'), 'h'); await flush();
setValue(tid('note-input'), 'hi'); await flush();
assert(tid('note-input').value === 'hi', 'Sanity: the input must still be controlled and typeable');
var after = parseInt(tid('render-count').textContent, 10);
assert(after === before, 'Two keystrokes re-rendered the expensive list ' + (after - before) + ' time(s) — wrap it so parent renders skip it');` },
      { name: "the theme toggle still reaches the list through context", sample: false,
        body: `var before = parseInt(tid('render-count').textContent, 10);
await click(tid('toggle-theme')); await flush();
assert(tid('theme-label').textContent.trim() === 'dark', 'Theme label must flip to "dark"');
var after = parseInt(tid('render-count').textContent, 10);
assert(after > before, 'A context change must still re-render the memoized list (memo must not sever the subscription)');
assert(tid('item-list').className.indexOf('dark') !== -1, 'The list must pick up the new theme class, got "' + tid('item-list').className + '"');` },
      { name: "keystrokes and toggles mix: only toggles count", sample: false,
        body: `var before = parseInt(tid('render-count').textContent, 10);
setValue(tid('note-input'), 'a'); await flush();
setValue(tid('note-input'), 'ab'); await flush();
setValue(tid('note-input'), 'abc'); await flush();
await click(tid('toggle-theme')); await flush();
var after = parseInt(tid('render-count').textContent, 10);
assert(after === before + 1, 'Three keystrokes + one toggle must yield exactly 1 list render, got ' + (after - before));` },
    ],
    solution: {
      code: `const ITEMS = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
const ThemeContext = React.createContext("light");

let listRenders = 0; // read by the grader — leave the mechanism alone

const ExpensiveList = React.memo(function ExpensiveList() {
    const theme = React.useContext(ThemeContext);
    listRenders += 1; // pretend each render does heavy work
    return (
        <div>
            <div data-testid="render-count">{listRenders}</div>
            <ul data-testid="item-list" className={"list-" + theme}>
                {ITEMS.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </div>
    );
});

function App() {
    const [theme, setTheme] = React.useState("light");
    const [note, setNote] = React.useState("");
    return (
        <ThemeContext.Provider value={theme}>
            <button data-testid="toggle-theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                Toggle theme
            </button>
            <div data-testid="theme-label">{theme}</div>
            <input data-testid="note-input" placeholder="Unrelated note" value={note} onChange={(e) => setNote(e.target.value)} />
            <ExpensiveList />
        </ThemeContext.Provider>
    );
}`,
      explanation: `
<p>The one-line fix is wrapping the component in <code>React.memo</code> &mdash; but the exercise is really about
knowing <em>which</em> of the two re-render channels that closes. When <code>App</code>'s <code>note</code> state
changes, React re-renders <code>App</code> and, by default, every child. <code>React.memo</code> intercepts that
parent-driven pass: it shallow-compares props, and since <code>ExpensiveList</code> receives none, the comparison
always succeeds and the render is skipped. Context is the <em>other</em> channel, and memo does not touch it: a
component that calls <code>useContext</code> subscribes directly to the Provider, so a theme change re-renders
the memoized list anyway &mdash; exactly once per toggle, which the strictest hidden test pins down.</p>
<p>The trap to avoid in real code: memo is defeated by unstable props. Passing <code>items={[...]}</code> or an
inline callback from <code>App</code> would create a fresh reference each keystroke and the shallow compare would
fail every time &mdash; that is when <code>useMemo</code>/<code>useCallback</code> become memo's necessary
companions. Here <code>ITEMS</code> is module-level and stable, so none of that machinery is needed.</p>
<p>Also worth noting: incrementing <code>listRenders</code> during render is only acceptable as grader
instrumentation; render-phase side effects are otherwise a smell, and StrictMode's double-invoke would expose
them.</p>`,
    },
  },
  {
    slug: "optimistic-updates",
    name: "React: Optimistic Like Button",
    category: "React II",
    type: "react",
    difficulty: "Hard",
    maxScore: 45,
    successRate: "48.25%",
    statement: `
<p>Instagram doesn't make you wait 150&nbsp;ms to see your own like. Implement <strong>optimistic updates</strong>:
apply the change to the UI immediately, fire the request, and roll back if the server rejects it.</p>
<p>The starter provides <code>apiToggleLike(postId)</code>, a deterministic fake API (do not modify): it settles
after 150&nbsp;ms, succeeds for every post <em>except id 2</em>, which always fails with a 500. The current
<code>handleLike</code> is pessimistic &mdash; it waits for the server before updating anything. Rewrite it.</p>
<h3>Requirements</h3>
<ul>
<li>Clicking <code>data-testid="like-&lt;id&gt;"</code> <strong>immediately</strong> (before the API settles) toggles that post: the count in <code>data-testid="likes-&lt;id&gt;"</code> changes by &plusmn;1 and the button label flips <code>Like</code> &harr; <code>Liked</code>.</li>
<li>On API success, the optimistic state simply stands.</li>
<li>On API failure, <strong>roll back</strong>: count and label return to their previous values, and
<code>data-testid="error-msg"</code> renders a message containing <code>Could not save</code>.</li>
<li>Starting any new like/unlike attempt clears the error message.</li>
<li>Liking an already-liked post unlikes it (same optimistic + rollback rules).</li>
</ul>`,
    starter: `/* ---- fake API (do not modify): post 2 always fails server-side ---- */
const INITIAL_POSTS = [
    { id: 1, title: "Ship it Friday?", likes: 4, liked: false },
    { id: 2, title: "Tabs vs spaces", likes: 9, liked: false },
    { id: 3, title: "Rewrite it in Rust", likes: 12, liked: false },
];
function apiToggleLike(postId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (postId === 2) reject(new Error("500: like service unavailable"));
            else resolve({ ok: true });
        }, 150);
    });
}
/* ---- end fake API ---- */

function App() {
    const [posts, setPosts] = React.useState(INITIAL_POSTS);
    const [error, setError] = React.useState("");

    const applyToggle = (list, id, liked) =>
        list.map((p) => (p.id === id ? { ...p, liked: liked, likes: p.likes + (liked ? 1 : -1) } : p));

    function handleLike(id) {
        // TODO: this waits for the server before showing anything.
        // Make it optimistic: update first, roll back on failure.
        setError("");
        const post = posts.find((p) => p.id === id);
        const nextLiked = !post.liked;
        apiToggleLike(id)
            .then(() => setPosts((list) => applyToggle(list, id, nextLiked)))
            .catch(() => {});
    }

    return (
        <div>
            <ul>
                {posts.map((p) => (
                    <li key={p.id} data-testid={"post-" + p.id}>
                        {p.title} — <span data-testid={"likes-" + p.id}>{p.likes}</span>
                        <button data-testid={"like-" + p.id} onClick={() => handleLike(p.id)}>
                            {p.liked ? "Liked" : "Like"}
                        </button>
                    </li>
                ))}
            </ul>
            {error && <div data-testid="error-msg">{error}</div>}
        </div>
    );
}`,
    tests: [
      { name: "renders the three posts with their counts", sample: true,
        body: `assert(tid('likes-1').textContent.trim() === '4', 'Post 1 starts at 4 likes');
assert(tid('likes-2').textContent.trim() === '9', 'Post 2 starts at 9 likes');
assert(tid('likes-3').textContent.trim() === '12', 'Post 3 starts at 12 likes');
assert(tid('like-1').textContent.trim() === 'Like', 'Buttons start as "Like"');` },
      { name: "the count updates instantly, before the server replies", sample: true,
        body: `await click(tid('like-1'));
assert(tid('likes-1').textContent.trim() === '5', 'Only ~25ms passed (server needs 150ms) — the count must already be 5, got "' + tid('likes-1').textContent.trim() + '"');
assert(tid('like-1').textContent.trim() === 'Liked', 'The button must flip to "Liked" immediately');
await sleep(300);
assert(tid('likes-1').textContent.trim() === '5', 'On success the optimistic value stands');` },
      { name: "a failed request rolls back and surfaces an error", sample: false,
        body: `await click(tid('like-2'));
assert(tid('likes-2').textContent.trim() === '10', 'The optimistic bump must show first, got "' + tid('likes-2').textContent.trim() + '"');
await sleep(300);
assert(tid('likes-2').textContent.trim() === '9', 'Post 2 always fails — the count must roll back to 9, got "' + tid('likes-2').textContent.trim() + '"');
assert(tid('like-2').textContent.trim() === 'Like', 'The button must roll back to "Like"');
assert(tid('error-msg'), 'A rollback must render data-testid="error-msg"');
assert(tid('error-msg').textContent.indexOf('Could not save') !== -1, 'The error must contain "Could not save", got "' + tid('error-msg').textContent + '"');` },
      { name: "liking twice unlikes optimistically", sample: false,
        body: `await click(tid('like-1'));
await sleep(250);
assert(tid('likes-1').textContent.trim() === '5', 'Sanity: first like sticks at 5');
await click(tid('like-1'));
assert(tid('likes-1').textContent.trim() === '4', 'The unlike must apply instantly, got "' + tid('likes-1').textContent.trim() + '"');
await sleep(250);
assert(tid('likes-1').textContent.trim() === '4' && tid('like-1').textContent.trim() === 'Like', 'The unlike must persist after the server confirms');` },
      { name: "a new attempt clears the previous error", sample: false,
        body: `await click(tid('like-2'));
await sleep(300);
assert(tid('error-msg'), 'Sanity: post 2 failed and showed the error');
await click(tid('like-1'));
assert(!tid('error-msg'), 'Starting a new attempt must clear the stale error message');
await sleep(250);
assert(tid('likes-1').textContent.trim() === '5', 'And the new like should succeed normally');` },
    ],
    solution: {
      code: `/* ---- fake API (do not modify): post 2 always fails server-side ---- */
const INITIAL_POSTS = [
    { id: 1, title: "Ship it Friday?", likes: 4, liked: false },
    { id: 2, title: "Tabs vs spaces", likes: 9, liked: false },
    { id: 3, title: "Rewrite it in Rust", likes: 12, liked: false },
];
function apiToggleLike(postId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (postId === 2) reject(new Error("500: like service unavailable"));
            else resolve({ ok: true });
        }, 150);
    });
}
/* ---- end fake API ---- */

function App() {
    const [posts, setPosts] = React.useState(INITIAL_POSTS);
    const [error, setError] = React.useState("");

    const applyToggle = (list, id, liked) =>
        list.map((p) => (p.id === id ? { ...p, liked: liked, likes: p.likes + (liked ? 1 : -1) } : p));

    function handleLike(id) {
        setError("");
        const post = posts.find((p) => p.id === id);
        const nextLiked = !post.liked;

        // 1. Apply the change immediately — the user sees it now.
        setPosts((list) => applyToggle(list, id, nextLiked));

        // 2. Tell the server. Success: nothing to do. Failure: undo.
        apiToggleLike(id).catch(() => {
            setPosts((list) => applyToggle(list, id, !nextLiked));
            setError("Could not save your change. Please try again.");
        });
    }

    return (
        <div>
            <ul>
                {posts.map((p) => (
                    <li key={p.id} data-testid={"post-" + p.id}>
                        {p.title} — <span data-testid={"likes-" + p.id}>{p.likes}</span>
                        <button data-testid={"like-" + p.id} onClick={() => handleLike(p.id)}>
                            {p.liked ? "Liked" : "Like"}
                        </button>
                    </li>
                ))}
            </ul>
            {error && <div data-testid="error-msg">{error}</div>}
        </div>
    );
}`,
      explanation: `
<p>Optimistic UI is a bet: the server almost always says yes, so show the "yes" immediately and keep an undo in
your pocket. The reference makes the bet in two moves &mdash; <code>setPosts(applyToggle(&hellip;, nextLiked))</code>
before the request, and a <code>catch</code> that applies the <em>inverse</em> toggle
(<code>!nextLiked</code>) if the server declines. Because like/unlike is its own inverse, the rollback is just
the same pure helper with the flag flipped; no snapshot of the entire previous list is needed. For non-invertible
mutations you would capture the prior state instead and restore it wholesale.</p>
<p>Every state write goes through <strong>functional updates</strong> (<code>setPosts(list =&gt; &hellip;)</code>).
That matters more here than usual: the rollback fires 150&nbsp;ms later, and by then the user may have liked a
different post. Rolling back against a captured <code>posts</code> from the click-time closure would silently
discard those interleaved changes; the updater form always operates on the freshest list, so concurrent attempts
compose.</p>
<p>Capturing <code>nextLiked</code> <em>before</em> the optimistic write is the other subtlety &mdash; computing
it inside the catch from current state would double-toggle. Clearing the error at the top of every attempt keeps
stale failure banners from outliving their relevance, which is also what the last hidden test checks.</p>`,
    },
  },
  {
    slug: "error-boundary",
    name: "React: Error Boundary with Reset",
    category: "React II",
    type: "react",
    difficulty: "Medium",
    maxScore: 35,
    successRate: "58.67%",
    statement: `
<p>One crashing component should not blank the whole page. React's answer is an <strong>error boundary</strong>
&mdash; and it must be a <em>class</em> component, because only classes get the error lifecycle. Implement
<code>ErrorBoundary</code>; the rest of the tree is wired.</p>
<h3>Setup (already wired)</h3>
<ul>
<li><code>Profile</code> renders <code>data-testid="profile"</code> normally, but <strong>throws during render</strong> when its <code>broken</code> prop is true.</li>
<li>The <code>data-testid="break"</code> button sets <code>broken</code> to true in <code>App</code>.</li>
<li><code>App</code> passes <code>onReset</code> to the boundary &mdash; calling it sets <code>broken</code> back to false.</li>
</ul>
<h3>ErrorBoundary requirements</h3>
<ul>
<li>Catch render errors from children (<code>static getDerivedStateFromError</code>).</li>
<li>While an error is held, render a fallback: a <code>data-testid="fallback"</code> element containing the text
<code>Something went wrong</code> and a <code>data-testid="retry"</code> button.</li>
<li>Clicking retry calls <code>this.props.onReset()</code> (so the parent can clear the bad prop) <em>and</em> clears
the boundary's own error state, so the children render again.</li>
<li>With no error held, render <code>this.props.children</code> untouched.</li>
<li>The cycle must be repeatable: break &rarr; retry &rarr; break again must show the fallback again.</li>
</ul>`,
    starter: `class ErrorBoundary extends React.Component {
    // TODO: catch render errors from children (getDerivedStateFromError),
    // render the fallback + retry button while broken,
    // and recover when retry is clicked (clear state + call props.onReset).
    render() {
        return this.props.children;
    }
}

/* ---- Already wired. No changes needed below. ---- */
function Profile({ broken }) {
    if (broken) throw new Error("Profile exploded");
    return <div data-testid="profile">All good</div>;
}

function App() {
    const [broken, setBroken] = React.useState(false);
    return (
        <div>
            <button data-testid="break" onClick={() => setBroken(true)}>Break it</button>
            <ErrorBoundary onReset={() => setBroken(false)}>
                <Profile broken={broken} />
            </ErrorBoundary>
        </div>
    );
}`,
    tests: [
      { name: "renders children while nothing is wrong", sample: true,
        body: `assert(tid('profile'), 'The profile must render normally at first');
assert(tid('profile').textContent.trim() === 'All good', 'Expected "All good"');
assert(!tid('fallback'), 'No fallback may render before an error');` },
      { name: "a render crash shows the fallback instead of a blank page", sample: true,
        body: `await click(tid('break')); await flush();
assert(tid('fallback'), 'The boundary must catch the crash and render data-testid="fallback" (without a boundary React unmounts everything)');
assert(tid('fallback').textContent.indexOf('Something went wrong') !== -1, 'The fallback must contain "Something went wrong"');
assert(!tid('profile'), 'The crashed child must not render');
assert(tid('retry'), 'The fallback must include a data-testid="retry" button');` },
      { name: "retry recovers the tree", sample: false,
        body: `await click(tid('break')); await flush();
assert(tid('fallback'), 'Sanity: fallback is showing');
await click(tid('retry')); await flush();
assert(tid('profile') && tid('profile').textContent.trim() === 'All good', 'After retry the profile must render again (retry must clear the boundary state AND call onReset)');
assert(!tid('fallback'), 'The fallback must disappear after recovery');` },
      { name: "the boundary works repeatedly", sample: false,
        body: `await click(tid('break')); await flush();
await click(tid('retry')); await flush();
assert(tid('profile'), 'Sanity: recovered once');
await click(tid('break')); await flush();
assert(tid('fallback') && !tid('profile'), 'A second crash must show the fallback again — the boundary must be reusable');` },
    ],
    solution: {
      code: `class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
        this.handleRetry = this.handleRetry.bind(this);
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        // real apps report to Sentry/Datadog here
    }

    handleRetry() {
        if (this.props.onReset) this.props.onReset(); // parent clears the bad prop
        this.setState({ hasError: false });           // boundary forgets the error
    }

    render() {
        if (this.state.hasError) {
            return (
                <div data-testid="fallback">
                    <p>Something went wrong.</p>
                    <button data-testid="retry" onClick={this.handleRetry}>Try again</button>
                </div>
            );
        }
        return this.props.children;
    }
}

function Profile({ broken }) {
    if (broken) throw new Error("Profile exploded");
    return <div data-testid="profile">All good</div>;
}

function App() {
    const [broken, setBroken] = React.useState(false);
    return (
        <div>
            <button data-testid="break" onClick={() => setBroken(true)}>Break it</button>
            <ErrorBoundary onReset={() => setBroken(false)}>
                <Profile broken={broken} />
            </ErrorBoundary>
        </div>
    );
}`,
      explanation: `
<p>Error boundaries are the one place hooks cannot go: <code>getDerivedStateFromError</code> and
<code>componentDidCatch</code> exist only on classes, so a class it must be. The division of labor between the
two is deliberate &mdash; <code>getDerivedStateFromError</code> is a <em>static, pure</em> mapping from "an error
happened" to new state, safe to run during the render phase; <code>componentDidCatch</code> runs in the commit
phase and is where side effects like logging belong. Doing the <code>setState</code>-style work in
<code>didCatch</code> alone is a legacy pattern that can flash broken UI in concurrent React.</p>
<p>The retry button is the half of the pattern people get wrong. Clearing only the boundary's
<code>hasError</code> is not enough: the child re-renders with <code>broken</code> still true, throws again
instantly, and the fallback reappears &mdash; an invisible infinite loop of failure. The fix is a
<em>two-party handshake</em>: <code>onReset()</code> lets the parent remove the cause, then
<code>setState({ hasError: false })</code> lets the children back in. React 18 batches both updates from the one
click into a single re-render, so no intermediate crash occurs.</p>
<p>Also remember what boundaries do <em>not</em> catch: event handlers, async callbacks, and errors thrown in the
boundary's own render. That is why the throwing component sits below the boundary, never beside it.</p>`,
    },
  },
  {
    slug: "a11y-form-labels",
    name: "React: Accessible Newsletter Form",
    category: "React II",
    type: "react",
    difficulty: "Medium",
    maxScore: 35,
    successRate: "55.10%",
    statement: `
<p>This newsletter form <em>works</em> &mdash; for mouse users with good eyesight. Screen-reader and
keyboard users hit four walls. Fix all four; the state logic is already correct and should not change.</p>
<h3>The four fixes</h3>
<ul>
<li><strong>Label association.</strong> The <code>Email address</code> label is decorative: clicking it does nothing
and screen readers announce a nameless textbox. Give the input an <code>id</code> and the label a matching
<code>htmlFor</code>.</li>
<li><strong>Error announcement.</strong> Submitting with an empty email renders <code>data-testid="form-error"</code>,
but assistive tech never hears it. Add <code>role="alert"</code> so it is announced when it appears.</li>
<li><strong>Disclosure state.</strong> The <code>data-testid="help-toggle"</code> button shows/hides the help panel,
but nothing tells a screen reader whether it is open. Add <code>aria-expanded</code> (reflecting the open state)
and <code>aria-controls</code> referencing the panel's <code>id</code> &mdash; you must also give the panel that
<code>id</code>.</li>
<li><strong>Keyboard-operable switch.</strong> The consent toggle is a <code>&lt;div role="switch"&gt;</code> that
only responds to clicks. Make it focusable with <code>tabIndex={0}</code>, reflect its state with
<code>aria-checked</code>, and toggle it when the <kbd>Enter</kbd> key is pressed on it
(<code>onKeyDown</code>).</li>
</ul>
<p>Keep every existing <code>data-testid</code>. The grader inspects attributes and dispatches real
<code>KeyboardEvent</code>s.</p>`,
    starter: `function App() {
    const [email, setEmail] = React.useState("");
    const [error, setError] = React.useState("");
    const [helpOpen, setHelpOpen] = React.useState(false);
    const [consent, setConsent] = React.useState(false);

    function handleSubscribe() {
        setError(email.trim() === "" ? "Email is required to subscribe." : "");
    }

    return (
        <div>
            {/* FIX 1: associate this label with the input */}
            <label>Email address</label>
            <input data-testid="email-input" value={email} onChange={(e) => setEmail(e.target.value)} />

            <button data-testid="subscribe" onClick={handleSubscribe}>Subscribe</button>

            {/* FIX 2: announce this error to screen readers */}
            {error && <div data-testid="form-error">{error}</div>}

            {/* FIX 3: expose the disclosure state (aria-expanded + aria-controls) */}
            <button data-testid="help-toggle" onClick={() => setHelpOpen(!helpOpen)}>Why do we ask?</button>
            {helpOpen && <div data-testid="help-panel">We send one email a month. No spam, ever.</div>}

            {/* FIX 4: make this switch focusable and Enter-operable */}
            <div data-testid="consent-toggle" role="switch" onClick={() => setConsent(!consent)}>
                {consent ? "Consent given" : "No consent"}
            </div>
        </div>
    );
}`,
    tests: [
      { name: "the label is programmatically tied to the input", sample: true,
        body: `var input = tid('email-input');
assert(input.id, 'The email input needs an id attribute');
var label = $('label[for="' + input.id + '"]');
assert(label, 'No <label htmlFor="' + input.id + '"> found — htmlFor must match the input id');
assert(label.textContent.indexOf('Email address') !== -1, 'The associated label should be the "Email address" one');` },
      { name: "the empty-submit error is an alert region", sample: true,
        body: `await click(tid('subscribe')); await flush();
var err = tid('form-error');
assert(err, 'Submitting an empty email must render data-testid="form-error"');
assert(err.getAttribute('role') === 'alert', 'The error region needs role="alert" so screen readers announce it, got role="' + err.getAttribute('role') + '"');
assert(err.textContent.trim().length > 0, 'The alert must contain the error text');` },
      { name: "the help disclosure exposes expanded state and its target", sample: false,
        body: `var btn = tid('help-toggle');
assert(btn.getAttribute('aria-expanded') === 'false', 'Closed disclosure must have aria-expanded="false", got "' + btn.getAttribute('aria-expanded') + '"');
assert(!tid('help-panel'), 'The panel starts hidden');
await click(btn); await flush();
assert(btn.getAttribute('aria-expanded') === 'true', 'Open disclosure must have aria-expanded="true"');
var panel = tid('help-panel');
assert(panel, 'The panel must render when open');
assert(panel.id && btn.getAttribute('aria-controls') === panel.id, 'aria-controls ("' + btn.getAttribute('aria-controls') + '") must reference the panel id ("' + panel.id + '")');` },
      { name: "the switch is focusable and toggles with Enter", sample: false,
        body: `var sw = tid('consent-toggle');
assert(sw.getAttribute('tabindex') === '0', 'The switch needs tabIndex={0} to be reachable by keyboard, got tabindex="' + sw.getAttribute('tabindex') + '"');
assert(sw.getAttribute('aria-checked') === 'false', 'The switch must expose aria-checked="false" initially');
sw.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await flush();
assert(sw.getAttribute('aria-checked') === 'true', 'Pressing Enter must toggle aria-checked to "true"');
assert(sw.textContent.indexOf('Consent given') !== -1, 'The visible text must reflect the toggle');
sw.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await flush();
assert(sw.getAttribute('aria-checked') === 'false', 'A second Enter must toggle it back off');` },
      { name: "the switch still toggles with the mouse", sample: false,
        body: `await click(tid('consent-toggle')); await flush();
assert(tid('consent-toggle').getAttribute('aria-checked') === 'true', 'Click must still work after adding keyboard support');
assert(tid('consent-toggle').textContent.indexOf('Consent given') !== -1, 'Text must update on click too');` },
    ],
    solution: {
      code: `function App() {
    const [email, setEmail] = React.useState("");
    const [error, setError] = React.useState("");
    const [helpOpen, setHelpOpen] = React.useState(false);
    const [consent, setConsent] = React.useState(false);

    function handleSubscribe() {
        setError(email.trim() === "" ? "Email is required to subscribe." : "");
    }

    function handleSwitchKey(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            setConsent((c) => !c);
        }
    }

    return (
        <div>
            <label htmlFor="newsletter-email">Email address</label>
            <input id="newsletter-email" data-testid="email-input"
                value={email} onChange={(e) => setEmail(e.target.value)} />

            <button data-testid="subscribe" onClick={handleSubscribe}>Subscribe</button>

            {error && <div data-testid="form-error" role="alert">{error}</div>}

            <button data-testid="help-toggle"
                aria-expanded={helpOpen}
                aria-controls="newsletter-help"
                onClick={() => setHelpOpen(!helpOpen)}>
                Why do we ask?
            </button>
            {helpOpen && (
                <div id="newsletter-help" data-testid="help-panel">
                    We send one email a month. No spam, ever.
                </div>
            )}

            <div data-testid="consent-toggle" role="switch"
                tabIndex={0}
                aria-checked={consent}
                onClick={() => setConsent(!consent)}
                onKeyDown={handleSwitchKey}>
                {consent ? "Consent given" : "No consent"}
            </div>
        </div>
    );
}`,
      explanation: `
<p>Each fix maps to a distinct accessibility API. The label/input pairing (<code>htmlFor</code> +
<code>id</code>) is what gives the textbox an <em>accessible name</em> &mdash; without it, a screen reader
announces "edit text, blank". It also enlarges the click target, since clicking the label now focuses the
input. In JSX it must be <code>htmlFor</code>, because <code>for</code> is a reserved word in JavaScript.</p>
<p><code>role="alert"</code> creates a live region with implicit <code>aria-live="assertive"</code>: the moment
the error node <em>enters the DOM</em>, assistive tech interrupts and reads it. That timing detail is why the
role goes on the conditionally-rendered element itself &mdash; an alert that is always present and merely changes
text can be missed by some screen readers.</p>
<p>For the disclosure, <code>aria-expanded={helpOpen}</code> leans on a React nicety: booleans passed to
<code>aria-*</code> props are stringified to <code>"true"</code>/<code>"false"</code> rather than stripped, which
is exactly what the ARIA spec wants. <code>aria-controls</code> ties the button to the panel it drives.</p>
<p>The switch is the deepest fix: a <code>div</code> has no keyboard behavior at all, so it needs the full
tab-stop trio &mdash; <code>tabIndex={0}</code> to be focusable, <code>aria-checked</code> to expose state, and an
<code>onKeyDown</code> handler for activation. <code>e.preventDefault()</code> stops stray default behavior. The
honest moral: a real <code>&lt;button&gt;</code> gives you all of this for free.</p>`,
    },
  },
  /* ============================ CSS ============================ */
  {
    slug: "css-responsive-grid",
    name: "CSS: Responsive Card Grid",
    category: "CSS",
    type: "css",
    difficulty: "Medium",
    maxScore: 25,
    successRate: "66.79%",
    statement: `
<p>Six metric cards, one line of CSS layout. Build a responsive grid that shows <strong>3 columns</strong> at the
stage's full 560px width and gracefully drops to 2 or 1 column as the viewport narrows &mdash; with no media
queries at all.</p>
<h3>Fixed HTML (do not edit)</h3>
<pre>&lt;div class="grid-stage"&gt;
  &lt;div class="cards"&gt;
    &lt;div class="card"&gt;&hellip;&lt;/div&gt;   &times; 6
  &lt;/div&gt;
&lt;/div&gt;</pre>
<h3>Requirements</h3>
<ul>
<li><code>.cards</code> becomes a CSS <strong>grid</strong> container.</li>
<li>The gap between cards is exactly <strong>16px</strong> in both directions.</li>
<li>Columns come from <code>repeat(auto-fit, minmax(160px, 1fr))</code>: each column is at least 160px, extras
wrap to new rows automatically. (The stage caps at 560px, so you get 3 columns there, fewer when the preview is
narrower &mdash; that's the point.)</li>
<li>All cards in a row share equal widths; with 6 cards there will always be at least 2 rows at these sizes.</li>
</ul>
<p>The grader checks computed styles and card geometry at whatever width the preview happens to be &mdash; a
correct auto-fit grid passes at any of them.</p>`,
    baseCss: `body { margin: 0; padding: 16px; font-family: sans-serif; }
.grid-stage { max-width: 560px; }
.card { background: #f3f7f7; border: 1px solid #d3d9dd; border-radius: 6px; padding: 12px; }
.card h4 { margin: 0 0 6px; font-size: 14px; }
.card p { margin: 0; font-size: 12px; color: #555; }`,
    html: `<div class="grid-stage"><div class="cards"><div class="card"><h4>Latency</h4><p>p95 down 12%</p></div><div class="card"><h4>Uptime</h4><p>99.98% this month</p></div><div class="card"><h4>Deploys</h4><p>34 this week</p></div><div class="card"><h4>Errors</h4><p>0.02% error rate</p></div><div class="card"><h4>Signups</h4><p>+412 this week</p></div><div class="card"><h4>Churn</h4><p>1.1% monthly</p></div></div></div>`,
    starter: `/* The HTML is fixed — write CSS only. */

.cards {
    /* make it a responsive grid (see the statement) */

}
`,
    tests: [
      { name: "the container is a grid", sample: true,
        body: `assert(cs('.cards').display === 'grid', '.cards must compute to display: grid, got "' + cs('.cards').display + '"');` },
      { name: "the gap is 16px in both directions", sample: true,
        body: `assert(cs('.cards').rowGap === '16px', 'row-gap must be 16px, got "' + cs('.cards').rowGap + '"');
assert(cs('.cards').columnGap === '16px', 'column-gap must be 16px, got "' + cs('.cards').columnGap + '"');` },
      { name: "columns are real pixel tracks from auto-fit/minmax", sample: false,
        body: `var cols = cs('.cards').gridTemplateColumns;
assert(cols && cols !== 'none', 'grid-template-columns must be set (repeat(auto-fit, minmax(160px, 1fr))), got "' + cols + '"');
assert(cols.indexOf('px') !== -1, 'The computed template should resolve to pixel tracks, got "' + cols + '"');` },
      { name: "cards wrap into rows and share equal widths", sample: false,
        body: `var first = rect('.cards .card:nth-child(1)');
var last = rect('.cards .card:nth-child(6)');
assert(last.top > first.top + 10, 'With 6 cards and minmax(160px, 1fr), card 6 must sit on a lower row than card 1 — the grid must wrap');
var widths = $$('.cards .card').map(function (c) { return c.getBoundingClientRect().width; });
var min = Math.min.apply(null, widths), max = Math.max.apply(null, widths);
assert(max - min < 1.5, 'All cards must share equal widths (1fr tracks), spread was ' + (max - min).toFixed(1) + 'px');
assert(min >= 150, 'Each card must be at least ~160px wide per the minmax floor, narrowest was ' + min.toFixed(0) + 'px');` },
    ],
    solution: {
      code: `.cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
}`,
      explanation: `
<p>Three declarations, and the browser does all the responsive math. The engine of it is
<code>repeat(auto-fit, minmax(160px, 1fr))</code>: the browser asks "how many 160px-minimum tracks fit across the
container, counting the 16px gaps?", creates that many columns, and then the <code>1fr</code> ceiling stretches
them equally to consume the leftover space. At the stage's 560px cap that is three columns
(3&times;160 + 2&times;16 = 512 &le; 560); squeeze the preview and the same rule yields two columns, then one
&mdash; no media queries, no JS, no breakpoint list to maintain.</p>
<p><code>auto-fit</code> versus <code>auto-fill</code> is the classic interview follow-up: both compute the same
track count, but <code>auto-fit</code> collapses empty tracks to zero so the real cards stretch across the row,
while <code>auto-fill</code> keeps phantom empty columns reserved. With six cards filling every track the two
look identical here; the difference appears the moment you render fewer items than columns.</p>
<p>Use <code>gap</code>, not margins on the cards: gap only exists <em>between</em> tracks, so there is no
first/last-child exception to fight and no negative-margin hack on the container. One gotcha the grader would
catch: writing <code>grid-template-columns: 33% 33% 33%</code> passes a wide screenshot but breaks at narrow
widths and never wraps &mdash; the computed-pixel-tracks test plus the wrap test exist precisely to reject
hard-coded columns.</p>`,
    },
  },
  {
    slug: "css-sticky-header-modal",
    name: "CSS: Sticky Header & Modal Overlay",
    category: "CSS",
    type: "css",
    difficulty: "Medium",
    maxScore: 30,
    successRate: "59.42%",
    statement: `
<p>Two layout patterns every product UI needs, on one page: a header that stays pinned while the long page
scrolls, and a modal overlay that dims everything and centers its dialog &mdash; stacked correctly so the modal
always beats the header.</p>
<h3>Fixed HTML (do not edit)</h3>
<pre>&lt;header class="site-header"&gt;DevBoard&lt;/header&gt;
&lt;main class="content"&gt;&hellip; (1200px of scrollable content) &hellip;&lt;/main&gt;
&lt;div class="modal-overlay"&gt;
  &lt;div class="modal"&gt;Session expired &hellip;&lt;/div&gt;
&lt;/div&gt;</pre>
<h3>Requirements</h3>
<ul>
<li><code>.site-header</code>: <code>position: sticky</code> pinned to <code>top: 0</code>, with a
<code>z-index</code> of at least 1 so content never paints over it while scrolling.</li>
<li><code>.modal-overlay</code>: <code>position: fixed</code> covering the <strong>entire viewport</strong> (all
four offsets at 0, or <code>inset: 0</code>).</li>
<li>The overlay dims the page: a dark background with alpha between 0.2 and 0.8 (e.g.
<code>rgba(0, 0, 0, 0.5)</code>).</li>
<li>The overlay centers <code>.modal</code> both axes using <strong>flexbox</strong>
(<code>display: flex</code> + centering properties).</li>
<li>Stacking: the overlay's <code>z-index</code> must be <strong>greater</strong> than the header's &mdash; a modal
that slides under the sticky header is the bug this exercise exists to prevent.</li>
</ul>`,
    baseCss: `body { margin: 0; padding: 0; font-family: sans-serif; }
.site-header { background: #21242c; color: #fff; padding: 12px 16px; font-weight: 600; }
.content { height: 1200px; padding: 16px; background: linear-gradient(#ffffff, #eef2f2); }
.modal { background: #fff; width: 240px; padding: 20px; border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
.modal h4 { margin: 0 0 8px; }
.modal button { padding: 6px 12px; }`,
    html: `<header class="site-header">DevBoard</header><main class="content"><p>Board content scrolls for 1200px…</p></main><div class="modal-overlay"><div class="modal"><h4>Session expired</h4><p>Please sign back in to continue.</p><button>Sign back in</button></div></div>`,
    starter: `/* The HTML is fixed — write CSS only. */

.site-header {
    /* pin it while the page scrolls */

}

.modal-overlay {
    /* cover the viewport, dim it, center the .modal, stack above the header */

}
`,
    tests: [
      { name: "the header is sticky at the very top", sample: true,
        body: `assert(cs('.site-header').position === 'sticky', '.site-header must be position: sticky, got "' + cs('.site-header').position + '"');
assert(cs('.site-header').top === '0px', '.site-header needs top: 0 to actually pin, got "' + cs('.site-header').top + '"');
var zh = parseInt(cs('.site-header').zIndex, 10);
assert(!isNaN(zh) && zh >= 1, 'The header needs z-index >= 1 (got "' + cs('.site-header').zIndex + '") or scrolling content paints over it');` },
      { name: "the overlay is fixed and covers the whole viewport", sample: true,
        body: `assert(cs('.modal-overlay').position === 'fixed', '.modal-overlay must be position: fixed, got "' + cs('.modal-overlay').position + '"');
var r = rect('.modal-overlay');
assert(r.left <= 1 && r.top <= 1, 'The overlay must start at the viewport origin, got left ' + r.left.toFixed(0) + ', top ' + r.top.toFixed(0));
assert(r.right >= window.innerWidth - 2, 'The overlay must reach the right edge (' + r.right.toFixed(0) + ' vs ' + window.innerWidth + ') — set all four offsets to 0');
assert(r.bottom >= window.innerHeight - 2, 'The overlay must reach the bottom edge (' + r.bottom.toFixed(0) + ' vs ' + window.innerHeight + ')');` },
      { name: "the modal is flex-centered on both axes", sample: false,
        body: `assert(cs('.modal-overlay').display === 'flex', 'Center with flexbox: display must be flex, got "' + cs('.modal-overlay').display + '"');
var o = rect('.modal-overlay'), m = rect('.modal');
var dx = Math.abs((m.left + m.right) / 2 - (o.left + o.right) / 2);
var dy = Math.abs((m.top + m.bottom) / 2 - (o.top + o.bottom) / 2);
assert(dx < 3, 'The modal is ' + dx.toFixed(1) + 'px off horizontal center');
assert(dy < 3, 'The modal is ' + dy.toFixed(1) + 'px off vertical center');` },
      { name: "stacking and dimming are correct", sample: false,
        body: `var zo = parseInt(cs('.modal-overlay').zIndex, 10);
var zh = parseInt(cs('.site-header').zIndex, 10);
assert(!isNaN(zo), 'The overlay needs an explicit z-index, got "' + cs('.modal-overlay').zIndex + '"');
assert(zo > zh, 'The overlay z-index (' + zo + ') must beat the header z-index (' + zh + ') or the modal slides under the sticky header');
var bg = cs('.modal-overlay').backgroundColor;
var m2 = bg.match(/rgba?\\(([^)]+)\\)/);
assert(m2, 'The overlay background computes to "' + bg + '" — set a background-color');
var parts = m2[1].split(',').map(parseFloat);
var alpha = parts.length === 4 ? parts[3] : 1;
assert(alpha >= 0.2 && alpha <= 0.8, 'Overlay alpha is ' + alpha + ' — dim the page with semi-transparency between 0.2 and 0.8');` },
    ],
    solution: {
      code: `.site-header {
    position: sticky;
    top: 0;
    z-index: 10;
}

.modal-overlay {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
}`,
      explanation: `
<p><code>position: sticky</code> is a hybrid: the header flows normally until its edge hits the
<code>top: 0</code> threshold, then it behaves as if fixed <em>within its scroll container</em>. The threshold is
mandatory &mdash; sticky with no <code>top</code>/<code>bottom</code> never pins, which is the single most common
"sticky doesn't work" bug. The <code>z-index: 10</code> matters because sticky elements share a stacking context
with the content sliding beneath them; anything later in the DOM with its own stacking context would otherwise
paint on top mid-scroll.</p>
<p>The overlay uses <code>position: fixed</code> with all four offsets zeroed (shorthand: <code>inset: 0</code>),
which sizes it to the viewport with no width/height math and keeps it put regardless of the 1200px scroll.
Dimming comes from an <code>rgba()</code> background &mdash; using the alpha channel, not
<code>opacity</code>, is deliberate: <code>opacity</code> on the overlay would fade the modal
<em>child</em> along with the backdrop.</p>
<p>Centering is the flex one-liner &mdash; <code>align-items</code> for the block axis,
<code>justify-content</code> for the inline axis &mdash; which keeps working whatever size the dialog is, unlike
the legacy negative-margin trick. Finally the explicit <code>z-index: 100</code> on the overlay settles the duel
with the sticky header: both are positioned, both stack, and DOM order alone would not guarantee the modal wins.
Numbers with daylight between them (10 vs 100) leave room for toasts and dropdowns later.</p>`,
    },
  }
  );
})();
