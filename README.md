# PracticeRank

A self-hosted coding-assessment platform for interview preparation, modeled on the HackerRank test-taking experience. Live at **https://practicerank.vercel.app**.

Built as a zero-backend static SPA: every problem, grader, and test harness runs entirely in the browser.

## Features

- **31 algorithm & backend problems** across 11 categories — Warm-up, Arrays, Hashmaps, Sorting & Searching, Sliding Window, Stacks & Queues, Dynamic Programming, Interview Classics, Frontend JS, REST API, and Backend/API design
- **15 React / React Native / CSS challenges** with a live preview pane and per-test-case grading
- **Monaco editor** (the VS Code editor) with syntax highlighting, plus a textarea fallback
- **Sandboxed grading**:
  - Algorithm solutions execute in a **Web Worker** with a hard timeout — supports both sync and `async` solutions (`await fetch()` works against offline API mirrors)
  - React solutions compile with **Babel standalone** and mount in a sandboxed **iframe** test harness with a custom assertion/query toolkit (`$`, `tid`, `click`, `setValue`, `flush`)
- **HackerRank-style UX**: sample vs. hidden test cases, per-case tabs with expected/actual diffs, scoring, timer, Run vs. Submit semantics
- **REST API problems** ship with faithful offline mirrors of `jsonmock.hackerrank.com` endpoints — paginated envelopes (`page / per_page / total / total_pages / data`), including the real certification traps (string-typed numeric fields, multi-page aggregation)

## Architecture

```
index.html            SPA shell, hash router views
js/app.js             Router, Monaco bootstrap, Web Worker grader, iframe React harness
js/problems.js        Algorithm + REST API + Backend problem bank (statements, starters, test cases)
js/problems-frontend.js  React / React Native / CSS problem bank with iframe test suites
css/                  HackerRank-style theming
```

No build step, no server, no dependencies to install. Deployed on Vercel as static files.

## Run locally

```bash
npx serve .
```

## Adding a problem

Append an object to `PROBLEMS` in `js/problems.js`:

```js
{
  slug: "my-problem",
  name: "My Problem",
  category: "Arrays",
  difficulty: "Medium",
  maxScore: 30,
  fn: "solve",                 // function name the grader calls
  statement: `<p>HTML statement…</p>`,
  starter: `function solve(a) {\n    // Write your code here\n}`,
  cases: [
    { args: [[1, 2, 3]], expected: 6, sample: true },
  ],
}
```

Async problems just declare `async function` in the starter — the worker grader resolves promises automatically.
