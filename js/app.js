/* PracticeRank SPA — dashboard + problem pages, Monaco editor, Web Worker runner */
(function () {
  "use strict";

  var PROBLEMS = (window.INTERVIEW_PROBLEMS || [])
    .concat(window.FRONTEND_PROBLEMS || [])
    .concat(window.PROBLEMS || []);
  // Reference solutions authored in js/solutions.js attach here so every
  // problem — old and new — can render a "Best Solution" tab.
  if (window.PR_SOLUTIONS) {
    PROBLEMS.forEach(function (p) {
      if (!p.solution && window.PR_SOLUTIONS[p.slug]) p.solution = window.PR_SOLUTIONS[p.slug];
    });
  }
  var DAILY_GOAL = 5; // special interview questions per day
  var app = document.getElementById("app");
  var MONACO_BASE = "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min";
  var editor = null; // Monaco instance (reused across problems)
  var currentSlug = null;
  var lastResults = null; // results of most recent run for the open problem
  var runToken = 0; // invalidates stale worker results

  /* ---------- persistence ---------- */
  function savedCode(slug) {
    return localStorage.getItem("pr-code-" + slug);
  }
  function saveCode(slug, code) {
    try { localStorage.setItem("pr-code-" + slug, code); } catch (e) {}
  }
  function solvedSet() {
    try { return JSON.parse(localStorage.getItem("pr-solved") || "[]"); } catch (e) { return []; }
  }
  function markSolved(slug) {
    var s = solvedSet();
    if (s.indexOf(slug) === -1) { s.push(slug); localStorage.setItem("pr-solved", JSON.stringify(s)); }
    logSolve(slug);
  }
  // pr-solve-log maps slug -> ISO date of the FIRST solve, so the daily
  // counter measures new ground covered, not re-runs of yesterday's work.
  function solveLog() {
    try { return JSON.parse(localStorage.getItem("pr-solve-log") || "{}"); } catch (e) { return {}; }
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function logSolve(slug) {
    var log = solveLog();
    if (log[slug]) return;
    log[slug] = today();
    try { localStorage.setItem("pr-solve-log", JSON.stringify(log)); } catch (e) {}
  }
  function solvedTodayCount(slugs) {
    var log = solveLog(), d = today(), n = 0;
    slugs.forEach(function (s) { if (log[s] === d) n++; });
    return n;
  }

  /* ---------- session timer ---------- */
  var t0 = Date.now();
  setInterval(function () {
    var s = Math.floor((Date.now() - t0) / 1000);
    var h = String(Math.floor(s / 3600)).padStart(2, "0");
    var m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    var ss = String(s % 60).padStart(2, "0");
    var el = document.getElementById("global-timer-text");
    if (el) el.textContent = h + ":" + m + ":" + ss;
  }, 1000);

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmt(v) {
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  }
  function fmtArgs(args) {
    return args.map(fmt).join("\n");
  }
  function fmtLogArg(v) {
    if (typeof v === "string") return v;
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (v instanceof Error) return (v.stack || v.message || String(v));
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  /* ---------- global debug drawer ----------
     Developer-facing console overlaying the bottom of the viewport.
     Toggle: Ctrl/Cmd+` or the Debug button in the header. Collects the
     captured console stream from user code (worker + preview iframe),
     uncaught errors / promise rejections, per-case test results, and an
     on-demand app-state snapshot. Capped so runaway user loops can't
     blow up the DOM. */
  var dbg = (function () {
    var MAX_ENTRIES = 500; // oldest entries are dropped past this
    var MAX_TEXT = 4000; // per-entry character cap
    var entries = [];
    var isOpen = false;

    function pad(n, w) { return String(n).padStart(w, "0"); }
    function stamp() {
      var d = new Date();
      return pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(d.getSeconds(), 2) + "." + pad(d.getMilliseconds(), 3);
    }
    // Readable value formatting: objects/arrays expanded via pretty JSON,
    // cycle-safe, functions/bigints/errors handled — never "[object Object]".
    function fmtVal(v) {
      if (typeof v === "string") return v;
      if (v === undefined) return "undefined";
      if (v === null) return "null";
      if (typeof v === "function") return "[Function " + (v.name || "anonymous") + "]";
      if (typeof v === "bigint") return String(v) + "n";
      if (v instanceof Error) return v.stack || v.message || String(v);
      var seen = [];
      try {
        var s = JSON.stringify(v, function (k, val) {
          if (typeof val === "object" && val !== null) {
            if (seen.indexOf(val) !== -1) return "[Circular]";
            seen.push(val);
          }
          if (typeof val === "function") return "[Function " + (val.name || "anonymous") + "]";
          if (typeof val === "bigint") return String(val) + "n";
          return val;
        }, 2);
        return s === undefined ? String(v) : s;
      } catch (e) { return String(v); }
    }
    function clip(s) {
      return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) + "\n… (truncated, " + s.length + " chars)" : s;
    }

    function drawerEl() { return document.getElementById("dbg-drawer"); }
    function bodyEl() { return document.getElementById("dbg-body"); }
    function updateCount() {
      var el = document.getElementById("dbg-count");
      if (el) el.textContent = entries.length + (entries.length >= MAX_ENTRIES ? " (capped)" : "");
    }

    function push(level, text) {
      var e = { ts: stamp(), level: level, text: clip(text) };
      entries.push(e);
      var body = bodyEl();
      if (entries.length > MAX_ENTRIES) {
        entries.shift();
        if (body && body.firstChild) body.removeChild(body.firstChild);
      }
      if (body) {
        var line = document.createElement("div");
        line.className = "dbg-line dbg-line--" + e.level;
        var ts = document.createElement("span");
        ts.className = "dbg-ts";
        ts.textContent = e.ts;
        var tag = document.createElement("span");
        tag.className = "dbg-tag";
        tag.textContent = e.level;
        var txt = document.createElement("span");
        txt.className = "dbg-text";
        txt.textContent = e.text;
        line.appendChild(ts);
        line.appendChild(tag);
        line.appendChild(txt);
        body.appendChild(line);
        body.scrollTop = body.scrollHeight;
      }
      updateCount();
    }

    function setOpen(open) {
      isOpen = open;
      var d = drawerEl();
      if (d) d.hidden = !open;
      document.body.classList.toggle("dbg-open", open); // page shrinks so Run/Submit stay reachable
      var btn = document.getElementById("dbg-toggle");
      if (btn) btn.classList.toggle("active", open);
      if (open) {
        var body = bodyEl();
        if (body) body.scrollTop = body.scrollHeight;
      }
    }

    function stateSnapshot() {
      var p = PROBLEMS.find(function (x) { return x.slug === currentSlug; });
      var codeKeys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("pr-code-") === 0) codeKeys.push(k.slice(8));
      }
      var snap = {
        route: location.hash || "#/",
        problem: p ? { slug: p.slug, name: p.name, difficulty: p.difficulty, language: langLabel(p), fn: p.fn || null } : null,
        editorChars: editor && editor.getValue ? editor.getValue().length : null,
        solved: solvedSet(),
        solvedToday: solvedTodayCount(PROBLEMS.map(function (x) { return x.slug; })),
        solveLog: solveLog(),
        savedCodeSlugs: codeKeys,
        lastRun: lastResults ? {
          isSubmit: lastResults.isSubmit,
          passed: lastResults.results.filter(function (x) { return x.passed; }).length,
          total: lastResults.results.length,
        } : null,
      };
      push("state", fmtVal(snap));
    }

    function copyAll() {
      var text = entries.map(function (e) {
        return "[" + e.ts + "] " + e.level.toUpperCase() + " " + e.text;
      }).join("\n");
      function done() {
        var btn = document.getElementById("dbg-copy");
        if (!btn) return;
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(); });
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    }

    function mount() {
      var d = document.createElement("div");
      d.className = "dbg-drawer";
      d.id = "dbg-drawer";
      d.hidden = true;
      d.innerHTML =
        '<div class="dbg-head">' +
        '<span class="dbg-title">Debug Console</span>' +
        '<span class="dbg-count" id="dbg-count">0</span>' +
        '<span class="dbg-spacer"></span>' +
        '<button class="dbg-btn" id="dbg-state" title="Dump current app state">State</button>' +
        '<button class="dbg-btn" id="dbg-copy" title="Copy the whole log">Copy</button>' +
        '<button class="dbg-btn" id="dbg-clear" title="Clear the log">Clear</button>' +
        '<button class="dbg-btn dbg-btn--close" id="dbg-close" title="Close (Ctrl+`)">&#10005;</button>' +
        "</div>" +
        '<div class="dbg-body" id="dbg-body"></div>';
      document.body.appendChild(d);
      document.getElementById("dbg-state").onclick = stateSnapshot;
      document.getElementById("dbg-copy").onclick = copyAll;
      document.getElementById("dbg-clear").onclick = function () {
        entries = [];
        var body = bodyEl();
        if (body) body.innerHTML = "";
        updateCount();
      };
      document.getElementById("dbg-close").onclick = function () { setOpen(false); };
      var toggleBtn = document.getElementById("dbg-toggle");
      if (toggleBtn) toggleBtn.onclick = function () { setOpen(!isOpen); };
    }
    mount();

    // Page-level uncaught errors + promise rejections (the worker and the
    // preview iframe report theirs through the captured log stream).
    window.addEventListener("error", function (e) {
      var loc = e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ":" + e.colno + ")" : "";
      push("error", "Uncaught: " + (e.error && e.error.stack ? e.error.stack : e.message) + loc);
    });
    window.addEventListener("unhandledrejection", function (e) {
      var r = e.reason;
      push("error", "Uncaught (in promise): " + (r && r.stack ? r.stack : fmtVal(r)));
    });

    return {
      log: function (level, args) {
        var mod = level === "warn" ? "warn" : level === "error" ? "error" : level === "info" ? "info" : "log";
        push(mod, (Array.isArray(args) ? args : [args]).map(fmtVal).join(" "));
      },
      event: function (text) { push("event", text); },
      error: function (text) { push("error", text); },
      testCase: function (t) {
        var lines = [t.label + " — " + (t.passed ? "PASS" : "FAIL") + " (" + t.ms + " ms)"];
        if (t.input !== undefined) lines.push("input:    " + fmtVal(t.input));
        if (t.expected !== undefined) lines.push("expected: " + fmtVal(t.expected));
        if (t.error != null) lines.push("error:    " + t.error);
        else if (t.actual !== undefined) lines.push("actual:   " + fmtVal(t.actual));
        push(t.passed ? "pass" : "fail", lines.join("\n"));
      },
      toggle: function () { setOpen(!isOpen); },
    };
  })();

  /* ---------- debug console panel ---------- */
  function clearConsolePanel() {
    var el = document.getElementById("pr-console-lines");
    if (el) el.innerHTML = "";
  }
  function activateConsoleTab() {
    selectBpTab("console");
  }
  function appendConsoleLine(level, args) {
    dbg.log(level, args); // every captured line also feeds the debug drawer
    var el = document.getElementById("pr-console-lines");
    if (!el) return;
    if (el.childNodes.length >= 500) el.removeChild(el.firstChild); // same runaway-loop cap as the drawer
    var text = Array.isArray(args) ? args.map(fmtLogArg).join(" ") : String(args);
    var mod = level === "warn" ? "warn" : level === "error" ? "error" : "log";
    var d = document.createElement("div");
    d.className = "pr-console-line pr-console-line--" + mod;
    d.textContent = text;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }
  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a === "number" && typeof b === "number") return a === b || (isNaN(a) && isNaN(b));
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
      return true;
    }
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) if (!deepEqual(a[ka[j]], b[ka[j]])) return false;
    return true;
  }

  function isFrontend(p) {
    return p.type === "react" || p.type === "css";
  }
  function langLabel(p) {
    return p.type === "react" ? "React (JSX)" : p.type === "css" ? "CSS3" : "JavaScript (Node.js)";
  }
  function fileNameFor(p) {
    return p.type === "react" ? "App.js" : p.type === "css" ? "styles.css" : "solution.js";
  }
  function ftIconClass(name) {
    return /\.css$/.test(name) ? "css" : /\.html$/.test(name) ? "html" : "js";
  }
  // Bottom-panel tab switching: Output (test results) <-> Console (captured
  // program output). Display toggling only, so content survives switching
  // away and back. No-ops on problems that don't render the bottom panel.
  function selectBpTab(which) {
    document.querySelectorAll(".bp-tab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.panel === which);
    });
    var r = document.getElementById("results-panel");
    var c = document.getElementById("pr-console");
    if (r) r.style.display = which === "output" ? "" : "none";
    if (c) c.style.display = which === "console" ? "block" : "none";
  }

  /* ---------- global keyboard: never let Ctrl/Cmd+S open the browser save dialog ---------- */
  window.addEventListener("keydown", function (e) {
    var key = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === "s") {
      e.preventDefault();
    }
    // Ctrl/Cmd+` toggles the debug drawer (capture phase, so it works even
    // when Monaco has focus)
    if ((e.ctrlKey || e.metaKey) && (e.key === "`" || e.code === "Backquote")) {
      e.preventDefault();
      dbg.toggle();
    }
  }, true);

  /* ---------- router ---------- */
  function route() {
    var h = location.hash || "#/";
    dbg.event("route " + h);
    // Feature modules (timer sessions, debugging, system design) own their
    // routes via the PR_EXT_ROUTES registry: first handler that returns true
    // has rendered into #app and the core router steps aside.
    var ext = window.PR_EXT_ROUTES || [];
    for (var ei = 0; ei < ext.length; ei++) {
      if (ext[ei](h)) { currentSlug = null; lastResults = null; return; }
    }
    var m = h.match(/^#\/problem\/([a-z0-9-]+)/);
    if (m) {
      var p = PROBLEMS.find(function (x) { return x.slug === m[1]; });
      if (p) return renderProblem(p);
    }
    renderDashboard();
  }
  window.addEventListener("hashchange", route);

  /* ---------- dashboard ---------- */
  function renderDashboard() {
    currentSlug = null;
    lastResults = null;
    document.title = "Prepare | Practice Playground";
    var solved = solvedSet();
    var cats = [];
    PROBLEMS.forEach(function (p) {
      if (cats.indexOf(p.category) === -1) cats.push(p.category);
    });

    var html = '<div class="dash"><h1>Prepare</h1><p class="dash-sub">Sharpen your problem-solving before the real assessment. Run against sample cases, submit against hidden ones.</p>';

    // Daily goal banner — special tier only.
    var special = PROBLEMS.filter(function (p) { return p.tier === "special"; });
    if (special.length) {
      var slugs = special.map(function (p) { return p.slug; });
      var todayN = solvedTodayCount(slugs);
      var pct = Math.min(100, Math.round((todayN / DAILY_GOAL) * 100));
      var hit = todayN >= DAILY_GOAL;
      html +=
        '<div class="goal' + (hit ? " goal-hit" : "") + '">' +
        '<div class="goal-top"><span class="goal-label">Today’s goal — Special Interview Questions</span>' +
        '<span class="goal-count">' + todayN + " / " + DAILY_GOAL + "</span></div>" +
        '<div class="goal-bar"><div class="goal-fill" style="width:' + pct + '%"></div></div>' +
        '<p class="goal-note">' +
        (hit ? "Done for today. Anything past this is bonus." : "Solve " + (DAILY_GOAL - todayN) + " more today to stay on pace.") +
        "</p></div>";
    }

    cats.forEach(function (cat) {
      var items = PROBLEMS.filter(function (p) { return p.category === cat; });
      var done = items.filter(function (p) { return solved.indexOf(p.slug) !== -1; }).length;
      var isSpecial = items.length && items[0].tier === "special";
      html += '<div class="track-head' + (isSpecial ? " track-special" : "") + '"><h2>' + esc(cat) +
        (isSpecial ? ' <span class="tier-tag">Tier 2</span>' : "") +
        '</h2><span class="track-progress">' + done + ' / ' + items.length + ' solved</span></div>';
      items.forEach(function (p) {
        var isSolved = solved.indexOf(p.slug) !== -1;
        html +=
          '<div class="challenge-card">' +
          '<div class="challenge-info">' +
          '<div class="challenge-name">' + esc(p.name) + '</div>' +
          '<div class="challenge-meta">' +
          '<span class="diff-' + p.difficulty.toLowerCase() + '">' + p.difficulty + '</span>' +
          (p.sub ? '<span class="sub-tag">' + esc(p.sub) + '</span>' : '') +
          '<span class="max-score">Max Score: ' + p.maxScore + '</span>' +
          '<span class="success-rate">Success Rate: ' + p.successRate + '</span>' +
          '</div></div>' +
          (isSolved ? '<span class="solved-badge">✔ Solved</span>' : '') +
          '<a class="btn ' + (isSolved ? 'btn-outline' : 'btn-green') + '" href="#/problem/' + p.slug + '">' + (isSolved ? 'Solve Again' : 'Solve Challenge') + '</a>' +
          '</div>';
      });
    });
    html += "</div>";
    app.innerHTML = html;
    // Feature modules append their own dashboard sections (Debugging,
    // System Design, Timed Sessions) without the core needing to know them.
    var dashEl = app.querySelector(".dash");
    (window.PR_DASH_SECTIONS || []).forEach(function (fn) {
      try { fn(dashEl); } catch (e) { dbg.error("dash section failed: " + (e && e.message)); }
    });
    window.scrollTo(0, 0);
  }

  /* ---------- problem page ---------- */
  function renderProblem(p) {
    currentSlug = p.slug;
    lastResults = null;
    document.title = p.name + " | Practice Playground";
    app.innerHTML =
      '<div class="problem-page">' +
      '<div class="problem-left">' +
      '<div class="qd-cap"><span>Question Description</span><a href="#/">&lsaquo; All challenges</a></div>' +
      '<h1 class="problem-title">' + esc(p.name) + '</h1>' +
      '<div class="problem-badges">' +
      '<span class="diff-' + p.difficulty.toLowerCase() + '">' + p.difficulty + '</span>' +
      '<span class="max-score">Max Score: ' + p.maxScore + '</span>' +
      '<span class="success-rate">Success Rate: ' + p.successRate + '</span>' +
      '</div>' +
      '<div class="statement">' + p.statement + "</div>" +
      "</div>" +
      '<div class="problem-right">' +
      '<div class="file-tabs">' +
      '<span class="file-tab active" id="tab-code"><span class="ft-icon ' + ftIconClass(fileNameFor(p)) + '"></span>' + fileNameFor(p) + '</span>' +
      (p.solution ? '<span class="file-tab" id="tab-solution" title="Idiomatic reference implementation + why it is written that way"><span class="ft-icon sol"></span>Best Solution</span>' : '') +
      '<div class="file-tabs-right">' +
      '<button class="link-btn" id="btn-reset" title="Reset code to starter">Reset Code</button>' +
      "</div></div>" +
      '<div id="editor-container"></div>' +
      (p.solution
        ? '<div id="solution-view" class="solution-view" hidden>' +
          '<div class="sol-head">Reference implementation</div>' +
          '<pre class="sol-code"><code>' + esc(p.solution.code) + '</code></pre>' +
          '<div class="sol-head">Why it&rsquo;s written this way</div>' +
          '<div class="sol-expl">' + p.solution.explanation + '</div>' +
          '</div>'
        : '') +
      // Problems with their own Output panel (panel: "react-output") run and
      // report entirely inside the preview column — a bottom panel here would
      // never receive content, so it is not rendered for them.
      (p.panel === "react-output" ? "" :
        '<div class="bottom-panel">' +
        '<div class="bp-tabs">' +
        '<span class="bp-tab active" data-panel="output">Output</span>' +
        '<span class="bp-tab" data-panel="console">Console</span>' +
        "</div>" +
        '<div class="bp-body">' +
        '<div class="results-panel" id="results-panel"><div class="bp-placeholder">Run your code to see test results here.</div></div>' +
        '<div class="pr-console" id="pr-console" style="display:none">' +
        '<div class="pr-console-head"><span>Console</span><button class="pr-console-clear" id="btn-console-clear">Clear</button></div>' +
        '<div id="pr-console-lines"></div>' +
        "</div>" +
        (isFrontend(p) ? "" :
          '<div id="custom-input-block">' +
          '<div class="qd-cap"><span>Custom Input</span></div>' +
          '<textarea class="pr-custom-input" id="custom-input-args" placeholder="Arguments as a JSON array, e.g. [[1,2,3], 5]"></textarea>' +
          '<button class="btn btn-outline" id="btn-run-custom">Run with Custom Input</button>' +
          '<div id="custom-input-result"></div>' +
          "</div>") +
        "</div></div>") +
      '<div class="editor-footer">' +
      '<span class="left-note">Line: 1, Col: 1</span>' +
      '<span class="lang-note">' + langLabel(p) + '</span>' +
      '<button class="btn btn-outline" id="btn-run">Run Code</button>' +
      '<button class="btn btn-green" id="btn-submit">Submit Code</button>' +
      "</div></div>" +
      (isFrontend(p)
        ? '<div class="preview-col">' +
          '<div class="preview-chrome"><span class="pc-title">Live Preview</span>' +
          '<button class="pc-reload" id="btn-preview" title="Reload preview">&#10227;</button></div>' +
          '<iframe id="preview-frame" sandbox="allow-scripts" title="Preview"></iframe>' +
          "</div>"
        : "") +
      "</div>";

    mountEditor(p);
    if (isFrontend(p)) {
      mountFrame(p);
      document.getElementById("btn-preview").onclick = function () { refreshPreview(p); };
    }

    document.getElementById("btn-reset").onclick = function () {
      if (editor && confirm("Reset code to the starter template?")) {
        editor.setValue(p.starter);
        saveCode(p.slug, p.starter);
      }
    };
    document.getElementById("btn-run").onclick = function () { isFrontend(p) ? runFrontend(p, false) : runCases(p, false); };
    document.getElementById("btn-submit").onclick = function () { isFrontend(p) ? runFrontend(p, true) : runCases(p, true); };

    // bottom-panel tabs: Output (test results) and Console (captured program
    // output) — both real, both persistent across switches.
    document.querySelectorAll(".bp-tab").forEach(function (tab) {
      tab.onclick = function () { selectBpTab(tab.dataset.panel); };
    });

    var clearBtn = document.getElementById("btn-console-clear");
    if (clearBtn) clearBtn.onclick = function () { clearConsolePanel(); };

    var customBtn = document.getElementById("btn-run-custom");
    if (customBtn) customBtn.onclick = function () { runCustomInput(p); };

    // Best Solution tab — swaps the editor for a read-only reference view.
    // No Monaco model juggling: the editor is simply hidden, so user code,
    // undo history and unsaved edits all survive the round-trip.
    var solTab = document.getElementById("tab-solution");
    var codeTab = document.getElementById("tab-code");
    if (solTab && codeTab) {
      var solView = document.getElementById("solution-view");
      var edView = document.getElementById("editor-container");
      solTab.onclick = function () {
        solTab.classList.add("active");
        codeTab.classList.remove("active");
        if (edView) edView.style.display = "none";
        if (solView) solView.hidden = false;
        dbg.event("Best Solution opened — " + p.slug);
      };
      codeTab.onclick = function () {
        codeTab.classList.add("active");
        solTab.classList.remove("active");
        if (solView) solView.hidden = true;
        if (edView) edView.style.display = "";
        if (editor && editor.layout) editor.layout();
      };
    }

    window.dispatchEvent(new CustomEvent("pr:problem-rendered", { detail: { slug: p.slug, name: p.name } }));
    window.scrollTo(0, 0);
  }

  /* ---------- Monaco ---------- */
  var monacoReady = null;
  function loadMonaco() {
    if (monacoReady) return monacoReady;
    monacoReady = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = MONACO_BASE + "/vs/loader.js";
      s.onload = function () {
        window.require.config({ paths: { vs: MONACO_BASE + "/vs" } });
        window.require(["vs/editor/editor.main"], function () { resolve(window.monaco); });
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return monacoReady;
  }

  var completionRegistered = false; // register Monaco providers once, globally
  var currentFnHint = null; // { fn, starter } for the completion provider to suggest

  function runActiveProblemFromKeyboard() {
    var btn = document.getElementById("btn-run");
    if (btn) btn.click();
  }

  function registerCompletions(monaco) {
    if (completionRegistered) return;
    completionRegistered = true;

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
      noLib: false,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    var idioms = [
      { label: "for-of", insertText: "for (const ${1:item} of ${2:items}) {\n\t$0\n}", detail: "for...of loop" },
      { label: "map", insertText: "${1:arr}.map((${2:x}) => ${3:x})", detail: "Array.prototype.map" },
      { label: "filter", insertText: "${1:arr}.filter((${2:x}) => ${3:true})", detail: "Array.prototype.filter" },
      { label: "reduce", insertText: "${1:arr}.reduce((${2:acc}, ${3:x}) => ${2:acc}, ${4:0})", detail: "Array.prototype.reduce" },
      { label: "console.log", insertText: "console.log(${1});", detail: "log to the debug console" },
      { label: "try-catch", insertText: "try {\n\t$0\n} catch (err) {\n\tconsole.error(err);\n}", detail: "try/catch" },
      { label: "async-function", insertText: "async function ${1:name}(${2:args}) {\n\t$0\n}", detail: "async function" },
    ];

    monaco.languages.registerCompletionItemProvider("javascript", {
      triggerCharacters: [".", "("],
      provideCompletionItems: function (model, position) {
        var word = model.getWordUntilPosition(position);
        var range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
        var suggestions = idioms.map(function (it) {
          return {
            label: it.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: it.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: it.detail,
            range: range,
          };
        });
        if (currentFnHint && currentFnHint.fn) {
          suggestions.push({
            label: currentFnHint.fn,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: currentFnHint.fn + "(${1})",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "This problem's required function",
            range: range,
          });
        }
        return { suggestions: suggestions };
      },
    });
  }

  function mountEditor(p) {
    var container = document.getElementById("editor-container");
    var initial = savedCode(p.slug) || p.starter;
    if (editor && editor.dispose) { try { editor.dispose(); } catch (e) {} }
    editor = null;
    currentFnHint = { fn: p.fn, starter: p.starter };
    loadMonaco().then(function (monaco) {
      // route may have changed while Monaco loaded
      if (currentSlug !== p.slug || !document.getElementById("editor-container")) return;
      registerCompletions(monaco);
      editor = monaco.editor.create(container, {
        value: initial,
        language: p.type === "css" ? "css" : "javascript",
        fontSize: 14,
        fontFamily: '"SF Mono", "Fira Code", Menlo, Consolas, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        theme: "vs",
        padding: { top: 12 },
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        parameterHints: { enabled: true },
        hover: { enabled: true },
        wordBasedSuggestions: "matchingDocuments",
        formatOnType: true,
        formatOnPaste: true,
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoIndent: "full",
        tabCompletion: "on",
        snippetSuggestions: "inline",
        bracketPairColorization: { enabled: true },
      });
      editor.onDidChangeModelContent(function () {
        saveCode(p.slug, editor.getValue());
      });
      editor.onDidChangeCursorPosition(function (e) {
        var note = document.querySelector(".editor-footer .left-note");
        if (note) note.textContent = "Line: " + e.position.lineNumber + ", Col: " + e.position.column;
      });
      // Ctrl/Cmd+Enter runs the current sample tests, like HackerRank & most IDEs
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runActiveProblemFromKeyboard);
      // Ctrl/Cmd+S must never trigger the browser "Save Page As" dialog
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {});
    }).catch(function () {
      // CDN blocked — fall back to a plain textarea so practice still works
      container.innerHTML = '<textarea id="fallback-editor" style="width:100%;height:100%;border:0;outline:none;padding:14px;font-family:var(--mono);font-size:14px;resize:none">' + esc(initial) + "</textarea>";
      var ta = document.getElementById("fallback-editor");
      ta.addEventListener("input", function () { saveCode(p.slug, ta.value); });
      ta.addEventListener("keydown", function (e) {
        var key = (e.key || "").toLowerCase();
        if ((e.ctrlKey || e.metaKey) && key === "enter") {
          e.preventDefault();
          runActiveProblemFromKeyboard();
        } else if ((e.ctrlKey || e.metaKey) && key === "s") {
          e.preventDefault();
        }
      });
      editor = { getValue: function () { return ta.value; }, setValue: function (v) { ta.value = v; } };
    });
  }

  /* ---------- worker runner ---------- */
  function workerSource() {
    return (
      // capture console.log/warn/error and stream each call to the main thread
      // immediately (not batched) so logs survive a hard timeout/terminate.
      "(function () {\n" +
      "  var orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };\n" +
      "  ['log', 'warn', 'error', 'info'].forEach(function (level) {\n" +
      "    console[level] = function () {\n" +
      "      var args = Array.prototype.slice.call(arguments);\n" +
      "      try { self.postMessage({ log: { level: level, args: args } }); } catch (e) {\n" +
      "        try { self.postMessage({ log: { level: level, args: args.map(function (a) { return String(a); }) } }); } catch (e2) {}\n" +
      "      }\n" +
      "      orig[level].apply(console, arguments);\n" +
      "    };\n" +
      "  });\n" +
      "})();\n" +
      // stray async failures user code never awaited still surface in the console
      "self.addEventListener('unhandledrejection', function (ev) {\n" +
      "  var r = ev.reason;\n" +
      "  try { self.postMessage({ log: { level: 'error', args: ['Uncaught (in promise): ' + String(r && r.stack || r)] } }); } catch (e) {}\n" +
      "});\n" +
      "self.addEventListener('error', function (ev) {\n" +
      "  try { self.postMessage({ log: { level: 'error', args: ['Uncaught: ' + ev.message + ' (line ' + ev.lineno + ':' + ev.colno + ')'] } }); } catch (e) {}\n" +
      "});\n" +
      "self.onmessage = function (e) {\n" +
      "  var code = e.data.code, fn = e.data.fn, cases = e.data.cases;\n" +
      "  var results = [];\n" +
      "  var f;\n" +
      "  try {\n" +
      "    var factory = new Function(code + '\\n;return typeof ' + fn + ' === \"function\" ? ' + fn + ' : null;');\n" +
      "    f = factory();\n" +
      "  } catch (err) {\n" +
      "    self.postMessage({ compileError: String(err && err.message || err) });\n" +
      "    return;\n" +
      "  }\n" +
      "  if (!f) { self.postMessage({ compileError: 'Function ' + fn + '(...) not found. Do not rename the starter function.' }); return; }\n" +
      "  var i = 0;\n" +
      "  function fail(err, t0) { results.push({ ok: false, error: String(err && err.stack || err).split('\\n').slice(0, 4).join('\\n'), ms: Date.now() - t0 }); }\n" +
      "  function next() {\n" +
      "    if (i >= cases.length) { self.postMessage({ results: results }); return; }\n" +
      "    var t0 = Date.now();\n" +
      "    var out;\n" +
      "    try {\n" +
      "      out = f.apply(null, JSON.parse(JSON.stringify(cases[i].args)));\n" +
      "    } catch (err) { fail(err, t0); i++; next(); return; }\n" +
      "    Promise.resolve(out).then(\n" +
      "      function (v) { results.push({ ok: true, out: v === undefined ? null : v, ms: Date.now() - t0 }); i++; next(); },\n" +
      "      function (err) { fail(err, t0); i++; next(); }\n" +
      "    );\n" +
      "  }\n" +
      "  next();\n" +
      "};"
    );
  }

  function execute(code, fn, cases, cb, onLog) {
    var blob = new Blob([workerSource()], { type: "application/javascript" });
    var url = URL.createObjectURL(blob);
    var w = new Worker(url);
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      w.terminate();
      URL.revokeObjectURL(url);
      cb({ timeout: true });
    }, 10000);
    w.onmessage = function (e) {
      // accept log lines even after results: unhandledrejection in the worker
      // fires a tick after the run finishes, and we want that line
      if (e.data && e.data.log) {
        if (onLog) onLog(e.data.log.level, e.data.log.args);
        return;
      }
      if (done) return;
      done = true;
      clearTimeout(timer);
      // brief grace period before terminate so stray-rejection logs flush
      setTimeout(function () {
        w.terminate();
        URL.revokeObjectURL(url);
      }, 100);
      cb(e.data);
    };
    w.postMessage({ code: code, fn: fn, cases: cases });
  }

  /* ---------- frontend (React / CSS) iframe runner ---------- */
  var fe = { frame: null, ready: false, queue: [], cb: null, runId: 0, timer: null };

  window.addEventListener("message", function (ev) {
    if (!fe.frame || !fe.frame.contentWindow || ev.source !== fe.frame.contentWindow) return;
    var d = ev.data || {};
    if (d.type === "ready") {
      fe.ready = true;
      var q = fe.queue;
      fe.queue = [];
      q.forEach(function (f) { f(); });
    } else if (d.type === "log") {
      appendConsoleLine(d.level, d.args || []);
    } else if (d.type === "result") {
      if (d.runId !== fe.runId) return;
      if (fe.timer) { clearTimeout(fe.timer); fe.timer = null; }
      if (fe.cb) { var cb = fe.cb; fe.cb = null; cb(d); }
    }
  });

  function whenFrameReady(fn) {
    if (fe.ready) fn();
    else fe.queue.push(fn);
  }

  function mountFrame(p) {
    var frame = document.getElementById("preview-frame");
    fe.frame = frame;
    fe.ready = false;
    fe.queue = [];
    fe.cb = null;
    if (fe.timer) { clearTimeout(fe.timer); fe.timer = null; }
    frame.srcdoc = p.type === "react" ? reactHarness() : cssHarness(p);
    // once the harness is up, show a first preview of the saved/starter code
    whenFrameReady(function () {
      if (currentSlug !== p.slug) return;
      refreshPreview(p);
    });
  }

  function refreshPreview(p) {
    if (!fe.frame || !fe.frame.contentWindow) return;
    var code = editor ? editor.getValue() : (savedCode(p.slug) || p.starter);
    whenFrameReady(function () {
      fe.frame.contentWindow.postMessage({ type: "preview", code: code }, "*");
    });
  }

  function reactHarness() {
    return '<!doctype html><html><head>' +
      '<script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.production.min.js"><\/script>' +
      '<script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.production.min.js"><\/script>' +
      '<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.23.5/babel.min.js"><\/script>' +
      '<style>body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;padding:14px;font-size:14px;color:#0e141e}button{margin:2px 4px 2px 0;padding:4px 10px}input{padding:4px 8px;margin:2px 4px 2px 0}h1{font-size:22px;margin:6px 0}ul{margin:8px 0 8px 20px}</style>' +
      '</head><body><div id="root"></div><script>\n' +
      '(function(){\n' +
      '(function(){var orig={log:console.log,warn:console.warn,error:console.error,info:console.info};["log","warn","error","info"].forEach(function(level){console[level]=function(){var args=Array.prototype.slice.call(arguments);try{parent.postMessage({type:"log",level:level,args:args},"*");}catch(e){try{parent.postMessage({type:"log",level:level,args:args.map(function(a){return String(a);})},"*");}catch(e2){}}orig[level].apply(console,arguments);};});})();\n' +
      'window.addEventListener("error",function(ev){try{parent.postMessage({type:"log",level:"error",args:["Uncaught: "+String(ev.error&&ev.error.stack||ev.message)]},"*");}catch(e){}});\n' +
      'window.addEventListener("unhandledrejection",function(ev){var r=ev.reason;try{parent.postMessage({type:"log",level:"error",args:["Uncaught (in promise): "+String(r&&r.stack||r)]},"*");}catch(e){}});\n' +
      'var root=null;\n' +
      'function getComponent(code){\n' +
      '  var compiled=Babel.transform(code,{presets:["react"]}).code;\n' +
      '  var module={exports:{}};\n' +
      '  var fn=new Function("React","module","exports",compiled+"\\n;return (typeof App!==\\"undefined\\"?App:(module.exports&&(module.exports.default||module.exports)));");\n' +
      '  return fn(React,module,module.exports);\n' +
      '}\n' +
      'function mount(App){\n' +
      '  if(root){try{root.unmount();}catch(e){}}\n' +
      '  document.getElementById("root").innerHTML="";\n' +
      '  root=ReactDOM.createRoot(document.getElementById("root"));\n' +
      '  root.render(React.createElement(App));\n' +
      '}\n' +
      'var $=function(s){return document.querySelector(s);};\n' +
      'var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};\n' +
      'var tid=function(id){return document.querySelector(\'[data-testid="\'+id+\'"]\');};\n' +
      'function click(el){el.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));return sleep(25);}\n' +
      'function setValue(el,v){\n' +
      '  var proto=el.tagName==="TEXTAREA"?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype;\n' +
      '  Object.getOwnPropertyDescriptor(proto,"value").set.call(el,v);\n' +
      '  el.dispatchEvent(new Event("input",{bubbles:true}));\n' +
      '}\n' +
      'function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}\n' +
      'function flush(){return sleep(40);}\n' +
      'function assert(cond,msg){if(!cond)throw new Error(msg||"Assertion failed");}\n' +
      'function showError(err){document.getElementById("root").innerHTML=\'<pre style="color:#d13d3b;white-space:pre-wrap;font-size:12px">\'+String(err&&err.message||err).replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</pre>";}\n' +
      'window.addEventListener("message",function(ev){\n' +
      '  var d=ev.data||{};\n' +
      '  if(d.type==="preview"){\n' +
      '    try{var A=getComponent(d.code);if(typeof A!=="function")throw new Error("Component \\"App\\" not found. Keep your component named App.");mount(A);}catch(err){showError(err);}\n' +
      '    return;\n' +
      '  }\n' +
      '  if(d.type!=="run")return;\n' +
      '  (function(){\n' +
      '    var App;\n' +
      '    try{App=getComponent(d.code);}catch(err){parent.postMessage({type:"result",runId:d.runId,compileError:String(err&&err.message||err)},"*");showError(err);return;}\n' +
      '    if(typeof App!=="function"){parent.postMessage({type:"result",runId:d.runId,compileError:"Component \\"App\\" not found. Keep your component named App."},"*");return;}\n' +
      '    var results=[];var i=0;\n' +
      '    function next(){\n' +
      '      if(i>=d.tests.length){try{mount(App);}catch(e){}parent.postMessage({type:"result",runId:d.runId,results:results},"*");return;}\n' +
      '      var t0=Date.now();\n' +
      '      var run;\n' +
      '      try{\n' +
      '        mount(App);\n' +
      '        var body=d.tests[i];\n' +
      '        var testFn=new Function("$","$$","tid","click","setValue","flush","sleep","assert","return (async function(){await flush();"+body+"})();");\n' +
      '        run=testFn($,$$,tid,click,setValue,flush,sleep,assert);\n' +
      '      }catch(err){run=Promise.reject(err);}\n' +
      '      Promise.resolve(run).then(function(){\n' +
      '        results.push({ok:true,ms:Date.now()-t0});i++;next();\n' +
      '      },function(err){\n' +
      '        results.push({ok:false,error:String(err&&err.message||err),ms:Date.now()-t0});i++;next();\n' +
      '      });\n' +
      '    }\n' +
      '    next();\n' +
      '  })();\n' +
      '});\n' +
      'parent.postMessage({type:"ready"},"*");\n' +
      '})();\n' +
      '<\/script></body></html>';
  }

  function cssHarness(p) {
    return '<!doctype html><html><head>' +
      '<style>body{margin:0;padding:16px}</style>' +
      '<style id="base-css">' + (p.baseCss || "") + '</style>' +
      '<style id="user-css"></style>' +
      '</head><body>' + (p.html || "") + '<script>\n' +
      '(function(){\n' +
      '(function(){var orig={log:console.log,warn:console.warn,error:console.error,info:console.info};["log","warn","error","info"].forEach(function(level){console[level]=function(){var args=Array.prototype.slice.call(arguments);try{parent.postMessage({type:"log",level:level,args:args},"*");}catch(e){try{parent.postMessage({type:"log",level:level,args:args.map(function(a){return String(a);})},"*");}catch(e2){}}orig[level].apply(console,arguments);};});})();\n' +
      'window.addEventListener("error",function(ev){try{parent.postMessage({type:"log",level:"error",args:["Uncaught: "+String(ev.error&&ev.error.stack||ev.message)]},"*");}catch(e){}});\n' +
      'window.addEventListener("unhandledrejection",function(ev){var r=ev.reason;try{parent.postMessage({type:"log",level:"error",args:["Uncaught (in promise): "+String(r&&r.stack||r)]},"*");}catch(e){}});\n' +
      'var $=function(s){return document.querySelector(s);};\n' +
      'var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};\n' +
      'function rect(sel){return document.querySelector(sel).getBoundingClientRect();}\n' +
      'function cs(sel){return getComputedStyle(document.querySelector(sel));}\n' +
      'function assert(cond,msg){if(!cond)throw new Error(msg||"Assertion failed");}\n' +
      'function raf(){return new Promise(function(r){requestAnimationFrame(function(){requestAnimationFrame(r);});});}\n' +
      'window.addEventListener("message",function(ev){\n' +
      '  var d=ev.data||{};\n' +
      '  if(d.type==="preview"){document.getElementById("user-css").textContent=d.code;return;}\n' +
      '  if(d.type!=="run")return;\n' +
      '  document.getElementById("user-css").textContent=d.code;\n' +
      '  raf().then(function(){\n' +
      '    var results=[];\n' +
      '    for(var i=0;i<d.tests.length;i++){\n' +
      '      var t0=Date.now();\n' +
      '      try{\n' +
      '        var testFn=new Function("$","$$","rect","cs","assert",d.tests[i]);\n' +
      '        testFn($,$$,rect,cs,assert);\n' +
      '        results.push({ok:true,ms:Date.now()-t0});\n' +
      '      }catch(err){\n' +
      '        results.push({ok:false,error:String(err&&err.message||err),ms:Date.now()-t0});\n' +
      '      }\n' +
      '    }\n' +
      '    parent.postMessage({type:"result",runId:d.runId,results:results},"*");\n' +
      '  });\n' +
      '});\n' +
      'parent.postMessage({type:"ready"},"*");\n' +
      '})();\n' +
      '<\/script></body></html>';
  }

  function runFrontend(p, isSubmit) {
    if (!editor) return;
    var code = editor.getValue();
    var tests = isSubmit ? p.tests : p.tests.filter(function (t) { return t.sample; });
    var panel = document.getElementById("results-panel");
    if (!panel) return; // problems with their own Output panel have no bottom panel
    selectBpTab("output");
    panel.innerHTML = '<div class="results-banner"><div><span class="spinner"></span>' + (isSubmit ? "Running all tests…" : "Running sample tests…") + "</div></div>";
    clearConsolePanel();
    dbg.event((isSubmit ? "Submit" : "Run") + " " + p.slug + " — " + tests.length + " test" + (tests.length === 1 ? "" : "s"));
    var token = ++runToken;
    var runId = ++fe.runId;

    fe.cb = function (data) {
      if (token !== runToken || currentSlug !== p.slug) return;
      if (data.compileError) {
        dbg.error("Compilation error: " + data.compileError);
        showBanner(panel, "error", "Compilation error", "");
        panel.innerHTML += '<div class="tc-detail"><h5>Error</h5><div class="pr-error-block"><pre>' + esc(data.compileError) + "</pre></div></div>";
        return;
      }
      var results = tests.map(function (t, i) {
        var r = data.results[i];
        dbg.testCase({
          label: (t.sample ? "" : "Hidden ") + "Test: " + t.name,
          error: r.ok ? null : (r.error || "Failed"),
          passed: r.ok,
          ms: r.ms,
        });
        return { t: t, r: r, passed: r.ok, idx: i };
      });
      var passCount = results.filter(function (x) { return x.passed; }).length;
      var allPass = passCount === results.length;
      window.dispatchEvent(new CustomEvent("pr:run-result", { detail: { slug: p.slug, isSubmit: isSubmit, passed: passCount, total: results.length, allPass: allPass } }));

      var banner;
      if (allPass && isSubmit) {
        markSolved(p.slug);
        banner = bannerHTML("pass", "Congratulations!", "You solved this challenge. All " + results.length + " tests passed. Score: " + p.maxScore + "/" + p.maxScore + ".");
      } else if (allPass) {
        banner = bannerHTML("pass", "Congratulations!", "You passed the sample tests. Click <b>Submit Code</b> to run against the hidden tests.");
      } else {
        banner = bannerHTML("fail", "Tests failed", passCount + "/" + results.length + " tests passed. Check the failing test for details, then look at the live preview above.");
      }

      var tabs = '<div class="tc-tabs">';
      results.forEach(function (x, i) {
        var icon = x.passed ? '<span class="tc-pass">✔</span>' : '<span class="tc-fail">✘</span>';
        tabs += '<button class="tc-tab" data-i="' + i + '">' + icon + " " + esc(x.t.name) + "</button>";
      });
      tabs += "</div>";
      panel.innerHTML = banner + tabs + '<div class="tc-detail" id="tc-detail"></div>';
      panel.querySelectorAll(".tc-tab").forEach(function (btn) {
        btn.onclick = function () {
          panel.querySelectorAll(".tc-tab").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          showFeDetail(results[+btn.dataset.i], isSubmit);
        };
      });
      var firstFail = results.find(function (x) { return !x.passed; }) || results[0];
      var autoBtn = panel.querySelector('.tc-tab[data-i="' + firstFail.idx + '"]');
      if (autoBtn) autoBtn.click();
      panel.scrollTop = 0;
    };
    if (fe.timer) clearTimeout(fe.timer);
    fe.timer = setTimeout(function () {
      if (fe.runId !== runId) return;
      fe.cb = null;
      if (token !== runToken || currentSlug !== p.slug) return;
      dbg.error("Test runner timed out (20s) — preview sandbox did not respond");
      showBanner(panel, "error", "Test runner timed out", "The preview sandbox did not respond within 20 seconds. Check for infinite loops, or reload the page if the CDN failed to load.");
    }, 20000);

    whenFrameReady(function () {
      if (fe.runId !== runId || !fe.frame || !fe.frame.contentWindow) return;
      fe.frame.contentWindow.postMessage({ type: "run", runId: runId, code: code, tests: tests.map(function (t) { return t.body; }) }, "*");
    });
  }

  function showFeDetail(x, isSubmit) {
    var d = document.getElementById("tc-detail");
    if (!d) return;
    if (isSubmit && !x.t.sample && x.passed) {
      d.innerHTML = '<p class="tc-hidden-note">🔒 This is a hidden test. Details are not revealed for passing hidden tests.</p>';
      return;
    }
    var html = "<h5>Test</h5><pre>" + esc(x.t.name) + "</pre>";
    if (x.passed) {
      html += '<h5>Result</h5><pre>Passed ✔</pre>';
    } else {
      html += '<h5>Failure</h5><div class="pr-error-block"><pre>' + esc(x.r.error || "Failed") + "</pre></div>";
    }
    html += "<h5>Execution Time</h5><pre>" + x.r.ms + " ms</pre>";
    d.innerHTML = html;
  }

  /* ---------- run / submit ---------- */
  function runCases(p, isSubmit) {
    if (!editor) return;
    var code = editor.getValue();
    var cases = isSubmit ? p.cases : p.cases.filter(function (c) { return c.sample; });
    var panel = document.getElementById("results-panel");
    if (!panel) return;
    selectBpTab("output");
    panel.innerHTML = '<div class="results-banner"><div><span class="spinner"></span>' + (isSubmit ? "Running all test cases…" : "Running sample test cases…") + "</div></div>";
    clearConsolePanel();
    dbg.event((isSubmit ? "Submit" : "Run") + " " + p.slug + " — " + cases.length + " case" + (cases.length === 1 ? "" : "s"));
    var token = ++runToken;

    execute(code, p.fn, cases, function (data) {
      if (token !== runToken || currentSlug !== p.slug) return; // stale
      if (data.timeout) {
        dbg.error("Time limit exceeded (10s) — worker terminated");
        showBanner(panel, "error", "Time limit exceeded", "Your code ran for more than 10 seconds. Check for infinite loops or an inefficient approach (see the hint in the statement).");
        return;
      }
      if (data.compileError) {
        dbg.error("Compilation error: " + data.compileError);
        showBanner(panel, "error", "Compilation error", "");
        panel.innerHTML += '<div class="tc-detail"><h5>Error</h5><div class="pr-error-block"><pre>' + esc(data.compileError) + "</pre></div></div>";
        return;
      }
      var results = cases.map(function (c, i) {
        var r = data.results[i];
        var passed = r.ok && deepEqual(r.out, c.expected);
        dbg.testCase({
          label: (c.sample ? "Sample " : "Hidden ") + "Test case " + i,
          input: c.args,
          expected: c.expected,
          actual: r.ok ? r.out : undefined,
          error: r.ok ? null : r.error,
          passed: passed,
          ms: r.ms,
        });
        return { c: c, r: r, passed: passed, idx: i };
      });
      lastResults = { results: results, isSubmit: isSubmit };
      var passCount = results.filter(function (x) { return x.passed; }).length;
      var allPass = passCount === results.length;
      window.dispatchEvent(new CustomEvent("pr:run-result", { detail: { slug: p.slug, isSubmit: isSubmit, passed: passCount, total: results.length, allPass: allPass } }));

      var banner;
      if (allPass && isSubmit) {
        markSolved(p.slug);
        banner = bannerHTML("pass", "Congratulations!", "You solved this challenge. All " + results.length + " test cases passed. Score: " + p.maxScore + "/" + p.maxScore + ".");
      } else if (allPass) {
        banner = bannerHTML("pass", "Congratulations!", "You passed the sample test cases. Click <b>Submit Code</b> to run your code against the hidden test cases.");
      } else {
        var anyError = results.some(function (x) { return !x.r.ok; });
        banner = bannerHTML(
          anyError ? "error" : "fail",
          anyError ? "Runtime error" : "Wrong Answer",
          passCount + "/" + results.length + " test cases passed." + (isSubmit ? "" : " Fix your logic and run again.")
        );
      }

      var tabs = '<div class="tc-tabs">';
      results.forEach(function (x, i) {
        var icon = x.passed ? '<span class="tc-pass">✔</span>' : '<span class="tc-fail">✘</span>';
        var label = x.c.sample ? "Sample Test case " + i : "Test case " + i;
        if (isSubmit) label = (x.c.sample ? "Sample " : "Hidden ") + "Test case " + i;
        tabs += '<button class="tc-tab" data-i="' + i + '">' + icon + " " + label + "</button>";
      });
      tabs += "</div>";
      panel.innerHTML = banner + tabs + '<div class="tc-detail" id="tc-detail"></div>';
      panel.querySelectorAll(".tc-tab").forEach(function (btn) {
        btn.onclick = function () {
          panel.querySelectorAll(".tc-tab").forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          showDetail(p, results[+btn.dataset.i], isSubmit);
        };
      });
      // auto-open first failing case, else first case
      var firstFail = results.find(function (x) { return !x.passed; }) || results[0];
      var autoBtn = panel.querySelector('.tc-tab[data-i="' + firstFail.idx + '"]');
      if (autoBtn) autoBtn.click();
      panel.scrollTop = 0;
    }, function (level, args) {
      appendConsoleLine(level, args);
    });
  }

  /* ---------- custom input / scratch run (algorithm problems only) ---------- */
  function runCustomInput(p) {
    if (!editor) return;
    var ta = document.getElementById("custom-input-args");
    var out = document.getElementById("custom-input-result");
    if (!ta || !out) return;
    var raw = ta.value.trim();
    var args;
    try {
      args = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(args)) throw new Error("Custom input must be a JSON array of arguments, e.g. [[1,2,3], 5]");
    } catch (err) {
      out.innerHTML = '<div class="pr-error-block"><pre>Invalid custom input: ' + esc(err.message) + "</pre></div>";
      return;
    }
    var code = editor.getValue();
    out.innerHTML = '<div class="results-banner"><div><span class="spinner"></span>Running…</div></div>';
    clearConsolePanel();
    dbg.event("Custom input run " + p.slug + " — args " + JSON.stringify(args));
    activateConsoleTab();
    var token = ++runToken;
    execute(code, p.fn, [{ args: args }], function (data) {
      if (token !== runToken || currentSlug !== p.slug) return;
      if (data.timeout) {
        out.innerHTML = '<div class="pr-error-block"><pre>Timed out after 10s — check for an infinite loop.</pre></div>';
        return;
      }
      if (data.compileError) {
        out.innerHTML = '<div class="pr-error-block"><pre>' + esc(data.compileError) + "</pre></div>";
        return;
      }
      var r = data.results[0];
      if (r.ok) {
        out.innerHTML = "<h5>Output</h5><pre>" + esc(fmt(r.out)) + "</pre>";
      } else {
        out.innerHTML = '<div class="pr-error-block"><pre>' + esc(r.error) + "</pre></div>";
      }
    }, appendConsoleLine);
  }

  function bannerHTML(kind, title, sub) {
    var icon = kind === "pass" ? "✔" : kind === "fail" ? "✘" : "⚠";
    return '<div class="results-banner ' + kind + '"><div style="font-size:22px">' + icon + '</div><div><h4>' + title + "</h4><p>" + sub + "</p></div></div>";
  }
  function showBanner(panel, kind, title, sub) {
    panel.innerHTML = bannerHTML(kind, title, esc(sub));
  }

  function showDetail(p, x, isSubmit) {
    var d = document.getElementById("tc-detail");
    if (!d) return;
    // Hidden cases stay locked like HackerRank: on submit you see pass/fail but not the data — unless it failed, then show input to debug (kinder than the real thing).
    if (isSubmit && !x.c.sample && x.passed) {
      d.innerHTML = '<p class="tc-hidden-note">🔒 This is a hidden test case. Input and expected output are not revealed for passing hidden cases.</p>';
      return;
    }
    var html = "<h5>Input (stdin)</h5><pre>" + esc(fmtArgs(x.c.args)) + "</pre>";
    if (x.r.ok) {
      if (x.passed) {
        html += "<h5>Expected Output</h5><pre>" + esc(fmt(x.c.expected)) + "</pre>";
        html += '<h5>Your Output (stdout)</h5><pre>' + esc(fmt(x.r.out)) + "</pre>";
      } else {
        html += "<h5>Diff</h5><div class=\"pr-diff-row\"><div class=\"pr-diff-expected\">" + esc(fmt(x.c.expected)) + "</div><div class=\"pr-diff-actual\">" + esc(fmt(x.r.out)) + "</div></div>";
      }
    } else {
      html += "<h5>Expected Output</h5><pre>" + esc(fmt(x.c.expected)) + "</pre>";
      html += '<h5>Runtime Error</h5><div class="pr-error-block"><pre>' + esc(x.r.error) + "</pre></div>";
    }
    html += '<h5>Execution Time</h5><pre>' + x.r.ms + " ms</pre>";
    d.innerHTML = html;
  }

  /* ---------- bridge for feature modules (js/custom-input.js) ----------
     Read-only handles into the closure so external modules can reuse the
     exact worker runner + console pipeline instead of duplicating them. */
  window.PR_APP = {
    problems: PROBLEMS,
    execute: execute,
    getEditor: function () { return editor; },
    appendConsoleLine: appendConsoleLine,
    dbgEvent: function (text) { dbg.event(text); },
    dbgError: function (text) { dbg.error(text); },
    loadMonaco: loadMonaco,
    reactHarness: reactHarness,
    cssHarness: cssHarness,
    esc: esc,
    deepEqual: deepEqual,
    // Hard-stop timer mode locks the editor at 0:00 like a proctored assessment.
    setEditorReadOnly: function (ro) {
      if (editor && editor.updateOptions) editor.updateOptions({ readOnly: !!ro });
      // feature modules (debugging, design) register their own editor here
      if (window.PR_EXT_EDITOR && window.PR_EXT_EDITOR.updateOptions) window.PR_EXT_EDITOR.updateOptions({ readOnly: !!ro });
      var ta = document.getElementById("fallback-editor");
      if (ta) ta.disabled = !!ro;
    },
  };

  // Defer the first route until every feature module below this script has
  // registered its PR_EXT_ROUTES / PR_DASH_SECTIONS hooks.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", route);
  else route();
})();
