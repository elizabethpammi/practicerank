/* PracticeRank — Live-Debugging practice mode.
   Modeled on the "40 minutes, unfamiliar mid-size codebase, several seeded
   bugs" first technical screen. Each exercise in window.DEBUG_EXERCISES is a
   multi-file virtual codebase shown as Monaco tabs; a partially-failing test
   suite goes green only when every seeded bug is fixed.

   Exercise kinds:
   - "worker": plain JS files concatenated and run in a Web Worker, tests use
     assert()/deepEqual()/sleep() plus everything the files define. Uncaught
     errors are mapped back to virtual file:line best-effort.
   - "react": JSX files concatenated and run in the same Babel iframe harness
     the frontend problems use ($/$$'s, tid, click, setValue, flush, assert).

   Print-debugging is the core workflow: every console.log/warn/error from
   the worker or iframe lands in a timestamped console panel with expandable
   object previews. Hint ladders (3 escalating hints per bug) mimic asking
   the interviewer; hints used are tracked. A full walkthrough teaches the
   symptom → trace → hypothesis → fix RCA method per bug. */
(function () {
  "use strict";

  var RUN_TIMEOUT_MS = 15000;
  var CONSOLE_CAP = 400;
  var JSON_DEPTH = 4;

  var st = null; // active exercise page state
  var runSeq = 0;

  function bridge() { return window.PR_APP || null; }
  function exercises() { return window.DEBUG_EXERCISES || []; }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function lsSet(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function solvedSet() { return lsGet("pr-debug-solved", []); }
  function markSolved(slug) {
    var s = solvedSet();
    if (s.indexOf(slug) === -1) { s.push(slug); lsSet("pr-debug-solved", s); }
  }
  function codeKey(slug, file) { return "pr-debug-code-" + slug + "--" + file; }
  function hintsKey(slug) { return "pr-debug-hints-" + slug; }

  /* ---------- depth-limited pretty printer for console previews ---------- */
  function stringifyDepth(v, depth) {
    if (typeof v === "string") return v;
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "function") return "[Function " + (v.name || "anonymous") + "]";
    if (typeof v === "bigint") return String(v) + "n";
    if (v instanceof Error) return v.stack || v.message || String(v);
    function walk(x, d) {
      if (x === null || typeof x !== "object") {
        if (typeof x === "function") return "[Function " + (x.name || "anonymous") + "]";
        if (typeof x === "bigint") return String(x) + "n";
        return x;
      }
      if (d >= depth) return Array.isArray(x) ? "[Array(" + x.length + ")]" : "[Object]";
      if (Array.isArray(x)) return x.map(function (i) { return walk(i, d + 1); });
      var out = {};
      Object.keys(x).forEach(function (k) { out[k] = walk(x[k], d + 1); });
      return out;
    }
    var seen = [];
    try {
      return JSON.stringify(walk(v, 0), function (k, val) {
        if (typeof val === "object" && val !== null) {
          if (seen.indexOf(val) !== -1) return "[Circular]";
          seen.push(val);
        }
        return val;
      }, 2);
    } catch (e) { return String(v); }
  }

  /* ---------- console panel ---------- */
  function consoleClear() {
    var el = document.getElementById("dbx-console-lines");
    if (el) el.innerHTML = "";
    var c = document.getElementById("dbx-console-count");
    if (c) c.textContent = "0";
  }
  function consolePush(level, args) {
    var el = document.getElementById("dbx-console-lines");
    if (!el) return;
    if (el.childNodes.length >= CONSOLE_CAP) el.removeChild(el.firstChild);
    var d = new Date();
    function pad(n, w) { return String(n).padStart(w, "0"); }
    var ts = pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(d.getSeconds(), 2) + "." + pad(d.getMilliseconds(), 3);

    var line = document.createElement("div");
    line.className = "dbx-cline dbx-cline--" + level;
    var tsEl = document.createElement("span");
    tsEl.className = "dbx-cts";
    tsEl.textContent = ts;
    line.appendChild(tsEl);
    var tag = document.createElement("span");
    tag.className = "dbx-ctag";
    tag.textContent = level;
    line.appendChild(tag);

    var body = document.createElement("span");
    body.className = "dbx-cbody";
    (Array.isArray(args) ? args : [args]).forEach(function (a, i) {
      if (i > 0) body.appendChild(document.createTextNode(" "));
      var isObj = a !== null && typeof a === "object" && !(a instanceof Error);
      var full = stringifyDepth(a, JSON_DEPTH);
      if (isObj && full.indexOf("\n") !== -1) {
        // expandable object preview
        var det = document.createElement("details");
        det.className = "dbx-cobj";
        var sum = document.createElement("summary");
        var preview = full.replace(/\s+/g, " ");
        sum.textContent = preview.length > 100 ? preview.slice(0, 100) + " …" : preview;
        det.appendChild(sum);
        var pre = document.createElement("pre");
        pre.textContent = full;
        det.appendChild(pre);
        body.appendChild(det);
      } else {
        var span = document.createElement("span");
        span.textContent = full.length > 4000 ? full.slice(0, 4000) + " … (truncated)" : full;
        body.appendChild(span);
      }
    });
    line.appendChild(body);
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    var c = document.getElementById("dbx-console-count");
    if (c) c.textContent = String(el.childNodes.length);
  }

  /* ---------- worker runner ---------- */
  function combineFiles(files) {
    var parts = [];
    var offsets = [];
    var line = 1;
    files.forEach(function (f) {
      var header = "// ===== " + f.name + " =====";
      var content = st && st.models ? currentContent(f.name) : f.content;
      var chunk = header + "\n" + content;
      var lines = chunk.split("\n").length;
      offsets.push({ name: f.name, start: line + 1, end: line + lines - 1 }); // +1: header line
      parts.push(chunk);
      line += lines + 1; // +1 for the join "\n\n" second newline
    });
    return { code: parts.join("\n\n"), offsets: offsets };
  }
  function currentContent(fileName) {
    if (st && st.models && st.models[fileName]) return st.models[fileName].getValue();
    if (st && st.fallbackTAs && st.fallbackTAs[fileName]) return st.fallbackTAs[fileName].value;
    var f = st.ex.files.find(function (x) { return x.name === fileName; });
    return f ? f.content : "";
  }

  function debugWorkerSource() {
    return (
      "(function () {\n" +
      "  var orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };\n" +
      "  ['log','warn','error','info'].forEach(function (level) {\n" +
      "    console[level] = function () {\n" +
      "      var args = Array.prototype.slice.call(arguments);\n" +
      "      try { self.postMessage({ log: { level: level, args: args } }); } catch (e) {\n" +
      "        try { self.postMessage({ log: { level: level, args: args.map(function (a) { return String(a); }) } }); } catch (e2) {}\n" +
      "      }\n" +
      "      orig[level].apply(console, arguments);\n" +
      "    };\n" +
      "  });\n" +
      "})();\n" +
      "self.addEventListener('unhandledrejection', function (ev) {\n" +
      "  var r = ev.reason;\n" +
      "  try { self.postMessage({ log: { level: 'error', args: ['Uncaught (in promise): ' + String(r && r.stack || r)] } }); } catch (e) {}\n" +
      "});\n" +
      "function __assert(cond, msg) { if (!cond) throw new Error(msg || 'Assertion failed'); }\n" +
      "function __sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }\n" +
      "function __deepEqual(a, b) {\n" +
      "  if (a === b) return true;\n" +
      "  if (typeof a === 'number' && typeof b === 'number') return a === b || (isNaN(a) && isNaN(b));\n" +
      "  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;\n" +
      "  if (Array.isArray(a) !== Array.isArray(b)) return false;\n" +
      "  if (Array.isArray(a)) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (!__deepEqual(a[i], b[i])) return false; return true; }\n" +
      "  var ka = Object.keys(a), kb = Object.keys(b);\n" +
      "  if (ka.length !== kb.length) return false;\n" +
      "  for (var j = 0; j < ka.length; j++) if (!__deepEqual(a[ka[j]], b[ka[j]])) return false;\n" +
      "  return true;\n" +
      "}\n" +
      "self.onmessage = function (e) {\n" +
      "  var code = e.data.code, tests = e.data.tests, offsets = e.data.offsets;\n" +
      "  function mapLoc(stack) {\n" +
      "    if (!stack) return null;\n" +
      "    var m = String(stack).match(/(?:<anonymous>|eval|Function):(\\d+):(\\d+)/);\n" +
      "    if (!m) return null;\n" +
      "    var line = parseInt(m[1], 10) - 2; // new Function() prepends 2 lines\n" +
      "    for (var i = 0; i < offsets.length; i++) {\n" +
      "      if (line >= offsets[i].start && line <= offsets[i].end) {\n" +
      "        return offsets[i].name + ':' + (line - offsets[i].start + 1);\n" +
      "      }\n" +
      "    }\n" +
      "    return null;\n" +
      "  }\n" +
      "  var src = code + '\\n;var __tests = [];\\n';\n" +
      "  tests.forEach(function (t) {\n" +
      "    src += '__tests.push({ name: ' + JSON.stringify(t.name) + ', fn: async function () {\\n' + t.body + '\\n} });\\n';\n" +
      "  });\n" +
      "  src += ';return __tests;';\n" +
      "  var testFns;\n" +
      "  try {\n" +
      "    var factory = new Function('assert', 'deepEqual', 'sleep', src);\n" +
      "    testFns = factory(__assert, __deepEqual, __sleep);\n" +
      "  } catch (err) {\n" +
      "    var loc0 = mapLoc(err && err.stack);\n" +
      "    self.postMessage({ compileError: String(err && err.message || err) + (loc0 ? ' (at ' + loc0 + ')' : '') });\n" +
      "    return;\n" +
      "  }\n" +
      "  var results = [];\n" +
      "  var i = 0;\n" +
      "  function next() {\n" +
      "    if (i >= testFns.length) { self.postMessage({ results: results }); return; }\n" +
      "    var t0 = Date.now();\n" +
      "    var p;\n" +
      "    try { p = testFns[i].fn(); } catch (err) { p = Promise.reject(err); }\n" +
      "    Promise.resolve(p).then(function () {\n" +
      "      results.push({ ok: true, ms: Date.now() - t0 });\n" +
      "      i++; next();\n" +
      "    }, function (err) {\n" +
      "      var loc = mapLoc(err && err.stack);\n" +
      "      results.push({ ok: false, error: String(err && err.message || err), loc: loc, stack: String(err && err.stack || '').split('\\n').slice(0, 4).join('\\n'), ms: Date.now() - t0 });\n" +
      "      i++; next();\n" +
      "    });\n" +
      "  }\n" +
      "  next();\n" +
      "};"
    );
  }

  function runWorker(ex, done) {
    var combined = combineFiles(ex.files);
    var blob = new Blob([debugWorkerSource()], { type: "application/javascript" });
    var url = URL.createObjectURL(blob);
    var w = new Worker(url);
    var finished = false;
    var timer = setTimeout(function () {
      if (finished) return;
      finished = true;
      w.terminate();
      URL.revokeObjectURL(url);
      done({ timeout: true });
    }, RUN_TIMEOUT_MS);
    w.onmessage = function (e) {
      if (e.data && e.data.log) {
        consolePush(e.data.log.level, e.data.log.args);
        return;
      }
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      setTimeout(function () { w.terminate(); URL.revokeObjectURL(url); }, 100);
      done(e.data);
    };
    w.postMessage({ code: combined.code, tests: ex.tests, offsets: combined.offsets });
  }

  /* ---------- react runner (own iframe + own listener) ---------- */
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
      consolePush(d.level, d.args || []);
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
  function mountFrame() {
    var frame = document.getElementById("dbx-preview-frame");
    if (!frame) return;
    fe.frame = frame;
    fe.ready = false;
    fe.queue = [];
    fe.cb = null;
    if (fe.timer) { clearTimeout(fe.timer); fe.timer = null; }
    var B = bridge();
    frame.srcdoc = B.reactHarness();
    whenFrameReady(function () { refreshPreview(); });
  }
  function combinedReactCode(ex) {
    return ex.files.map(function (f) {
      return "// ===== " + f.name + " =====\n" + currentContent(f.name);
    }).join("\n\n");
  }
  function refreshPreview() {
    if (!st || st.ex.kind !== "react" || !fe.frame || !fe.frame.contentWindow) return;
    var code = combinedReactCode(st.ex);
    whenFrameReady(function () {
      fe.frame.contentWindow.postMessage({ type: "preview", code: code }, "*");
    });
  }
  function runReact(ex, done) {
    var runId = ++fe.runId;
    fe.cb = function (data) { done(data); };
    if (fe.timer) clearTimeout(fe.timer);
    fe.timer = setTimeout(function () {
      if (fe.runId !== runId) return;
      fe.cb = null;
      done({ timeout: true });
    }, 20000);
    whenFrameReady(function () {
      if (fe.runId !== runId || !fe.frame || !fe.frame.contentWindow) return;
      fe.frame.contentWindow.postMessage({
        type: "run",
        runId: runId,
        code: combinedReactCode(ex),
        tests: ex.tests.map(function (t) { return t.body; }),
      }, "*");
    });
  }

  /* ---------- run + results ---------- */
  function runTests(ex) {
    var panel = document.getElementById("dbx-results");
    if (!panel) return;
    selectTab("output");
    panel.innerHTML = '<div class="results-banner"><div><span class="spinner"></span>Running the test suite…</div></div>';
    var B = bridge();
    if (B) B.dbgEvent("Debug run " + ex.slug + " — " + ex.tests.length + " tests");
    var token = ++runSeq;
    var runner = ex.kind === "react" ? runReact : runWorker;
    runner(ex, function (data) {
      if (token !== runSeq || !st || st.ex.slug !== ex.slug) return;
      renderResults(ex, panel, data);
    });
  }

  function renderResults(ex, panel, data) {
    if (data.timeout) {
      panel.innerHTML =
        '<div class="results-banner error"><div style="font-size:22px">⚠</div><div><h4>Time limit exceeded</h4>' +
        "<p>The suite did not finish. One of the seeded bugs may cause an infinite loop or a promise that never settles — check the Console for the last log line that made it out.</p></div></div>";
      return;
    }
    if (data.compileError) {
      panel.innerHTML =
        '<div class="results-banner error"><div style="font-size:22px">⚠</div><div><h4>Compilation error</h4><p></p></div></div>' +
        '<div class="tc-detail"><h5>Error</h5><div class="pr-error-block"><pre>' + esc(data.compileError) + "</pre></div></div>";
      return;
    }
    var results = ex.tests.map(function (t, i) {
      var r = data.results[i] || { ok: false, error: "did not run", ms: 0 };
      return { t: t, r: r, passed: !!r.ok, idx: i };
    });
    var passCount = results.filter(function (x) { return x.passed; }).length;
    var allPass = passCount === results.length;
    var hints = lsGet(hintsKey(ex.slug), {});
    var hintsUsed = Object.keys(hints).reduce(function (n, k) { return n + hints[k]; }, 0);

    var banner;
    if (allPass) {
      markSolved(ex.slug);
      var t = st.timer;
      banner =
        '<div class="results-banner pass"><div style="font-size:22px">✔</div><div><h4>All bugs fixed — suite is green</h4>' +
        "<p>" + results.length + "/" + results.length + " tests passing" +
        (t ? " &middot; time used " + window.PR_TIMER.fmtClock(t.usedMs()) + (t.isOvertime() ? ' <span class="pr-flag-overtime">OVERTIME</span>' : "") : "") +
        " &middot; " + hintsUsed + " hint" + (hintsUsed === 1 ? "" : "s") + " used. Now read the walkthrough and compare your diagnosis path against the intended one.</p></div></div>";
    } else {
      banner =
        '<div class="results-banner fail"><div style="font-size:22px">✘</div><div><h4>' + passCount + "/" + results.length + " tests passing</h4>" +
        "<p>" + ex.bugs.length + " seeded bugs are hiding in this codebase. Reproduce a failure, add console.log probes, form a hypothesis, then fix. The hint ladder is on the left when you're stuck.</p></div></div>";
    }

    var tabs = '<div class="tc-tabs">';
    results.forEach(function (x, i) {
      var icon = x.passed ? '<span class="tc-pass">✔</span>' : '<span class="tc-fail">✘</span>';
      tabs += '<button class="tc-tab" data-i="' + i + '">' + icon + " " + esc(x.t.name) + "</button>";
    });
    tabs += "</div>";
    panel.innerHTML = banner + tabs + '<div class="tc-detail" id="dbx-tc-detail"></div>';
    panel.querySelectorAll(".tc-tab").forEach(function (btn) {
      btn.onclick = function () {
        panel.querySelectorAll(".tc-tab").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var x = results[+btn.dataset.i];
        var d = document.getElementById("dbx-tc-detail");
        var html = "<h5>Test</h5><pre>" + esc(x.t.name) + "</pre>";
        if (x.passed) html += "<h5>Result</h5><pre>Passed ✔</pre>";
        else {
          html += '<h5>Failure</h5><div class="pr-error-block"><pre>' + esc(x.r.error || "Failed") +
            (x.r.loc ? "\n\n→ thrown at " + esc(x.r.loc) : "") + "</pre></div>";
          if (x.r.stack) html += "<h5>Stack (top)</h5><pre>" + esc(x.r.stack) + "</pre>";
        }
        html += "<h5>Execution Time</h5><pre>" + x.r.ms + " ms</pre>";
        d.innerHTML = html;
      };
    });
    var firstFail = results.find(function (x) { return !x.passed; }) || results[0];
    var autoBtn = panel.querySelector('.tc-tab[data-i="' + firstFail.idx + '"]');
    if (autoBtn) autoBtn.click();
    if (st.ex.kind === "react") refreshPreview();
  }

  function selectTab(which) {
    document.querySelectorAll(".dbx-bp-tab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.panel === which);
    });
    var r = document.getElementById("dbx-results");
    var c = document.getElementById("dbx-console");
    if (r) r.style.display = which === "output" ? "" : "none";
    if (c) c.style.display = which === "console" ? "flex" : "none";
  }

  /* ---------- hint ladder + walkthrough (left column) ---------- */
  function hintLadderHTML(ex) {
    var used = lsGet(hintsKey(ex.slug), {});
    var html = '<div class="dbx-hints"><div class="qd-cap" style="margin-top:22px"><span>Ask the interviewer — hint ladders</span></div>' +
      '<p class="dbx-note">Three escalating hints per bug, like nudges you\'d get in the real screen. Hints used are recorded with your result — using them is fine, burning all of them on every bug is a signal to practice more.</p>';
    ex.bugs.forEach(function (bug, bi) {
      var n = used[bi] || 0;
      html += '<div class="dbx-hint-bug" data-bug="' + bi + '">' +
        '<div class="dbx-hint-title">Bug ' + (bi + 1) + " of " + ex.bugs.length + ' <span class="dbx-hint-used">' + n + "/3 hints used</span></div>";
      for (var h = 0; h < 3; h++) {
        if (h < n) html += '<div class="dbx-hint dbx-hint--open"><b>Hint ' + (h + 1) + ".</b> " + bug.hints[h] + "</div>";
        else if (h === n) html += '<button class="dbx-hint-btn" data-bug="' + bi + '" data-h="' + h + '">Reveal hint ' + (h + 1) + "</button>";
      }
      html += "</div>";
    });
    html += "</div>";
    return html;
  }
  function wireHints(ex) {
    var wrap = document.querySelector(".dbx-hints");
    if (!wrap) return;
    wrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".dbx-hint-btn");
      if (!btn) return;
      var bi = +btn.dataset.bug;
      var used = lsGet(hintsKey(ex.slug), {});
      used[bi] = (used[bi] || 0) + 1;
      lsSet(hintsKey(ex.slug), used);
      var B = bridge();
      if (B) B.dbgEvent("Hint revealed — " + ex.slug + " bug " + (bi + 1) + " hint " + used[bi]);
      var fresh = document.createElement("div");
      fresh.innerHTML = hintLadderHTML(ex);
      wrap.parentNode.replaceChild(fresh.firstChild, wrap);
      wireHints(ex);
    });
  }

  function walkthroughHTML(ex) {
    var html = '<details class="dbx-walk"><summary>Full walkthrough — diagnosis path, minimal diffs, RCA</summary>' +
      '<p class="dbx-note">Read this like an incident postmortem: for each bug, the symptom you should have noticed, the trace that localizes it, the hypothesis that explains it, and the minimal fix. The method transfers; the answers don\'t.</p>';
    ex.bugs.forEach(function (bug, bi) {
      html += '<div class="dbx-rca">' +
        "<h4>Bug " + (bi + 1) + ": " + esc(bug.title) + ' <span class="dbx-class">' + esc(bug.clazz) + "</span></h4>" +
        '<p><b>Symptom.</b> ' + bug.symptom + "</p>" +
        '<p><b>Trace.</b> ' + bug.trace + "</p>" +
        '<p><b>Hypothesis.</b> ' + bug.hypothesis + "</p>" +
        '<p><b>Fix.</b> ' + bug.fix + "</p>" +
        '<pre class="dbx-diff">' + esc(bug.diff) + "</pre>" +
        '<p><b>Why the buggy version fails.</b> ' + bug.why + "</p>" +
        "</div>";
    });
    html += "</details>";
    return html;
  }

  /* ---------- editor ---------- */
  function mountEditor(ex) {
    var container = document.getElementById("dbx-editor");
    var B = bridge();
    st.models = null;
    st.fallbackTAs = null;
    B.loadMonaco().then(function (monaco) {
      if (!st || st.ex.slug !== ex.slug || !document.getElementById("dbx-editor")) return;
      st.models = {};
      ex.files.forEach(function (f) {
        var saved = localStorage.getItem(codeKey(ex.slug, f.name));
        var lang = /\.tsx?$/.test(f.name) ? "typescript" : /\.css$/.test(f.name) ? "css" : "javascript";
        st.models[f.name] = monaco.editor.createModel(saved != null ? saved : f.content, lang);
      });
      st.editor = monaco.editor.create(container, {
        model: st.models[ex.files[0].name],
        fontSize: 13.5,
        fontFamily: '"SF Mono", "Fira Code", Menlo, Consolas, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        theme: "vs",
        padding: { top: 10 },
        bracketPairColorization: { enabled: true },
      });
      window.PR_EXT_EDITOR = st.editor;
      st.editor.onDidChangeModelContent(function () {
        var name = activeFileName();
        if (name && st.models[name]) {
          try { localStorage.setItem(codeKey(ex.slug, name), st.models[name].getValue()); } catch (e) {}
        }
        if (ex.kind === "react") schedulePreview();
      });
      st.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () { runTests(ex); });
      st.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {});
    }).catch(function () {
      // CDN blocked — plain textareas, one per file, toggled by the tabs
      st.fallbackTAs = {};
      container.innerHTML = "";
      ex.files.forEach(function (f, i) {
        var ta = document.createElement("textarea");
        ta.className = "dbx-fallback-ta";
        ta.style.display = i === 0 ? "block" : "none";
        var saved = localStorage.getItem(codeKey(ex.slug, f.name));
        ta.value = saved != null ? saved : f.content;
        ta.addEventListener("input", function () {
          try { localStorage.setItem(codeKey(ex.slug, f.name), ta.value); } catch (e) {}
          if (ex.kind === "react") schedulePreview();
        });
        st.fallbackTAs[f.name] = ta;
        container.appendChild(ta);
      });
    });
  }
  function activeFileName() {
    var t = document.querySelector(".dbx-ftab.active");
    return t ? t.dataset.file : null;
  }
  function selectFile(name) {
    document.querySelectorAll(".dbx-ftab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.file === name);
    });
    if (st.models && st.editor && st.models[name]) st.editor.setModel(st.models[name]);
    if (st.fallbackTAs) {
      Object.keys(st.fallbackTAs).forEach(function (k) {
        st.fallbackTAs[k].style.display = k === name ? "block" : "none";
      });
    }
  }
  var previewDebounce = null;
  function schedulePreview() {
    if (previewDebounce) clearTimeout(previewDebounce);
    previewDebounce = setTimeout(refreshPreview, 600);
  }

  function resetFiles(ex) {
    if (!confirm("Reset all files to the original buggy versions?")) return;
    ex.files.forEach(function (f) {
      try { localStorage.removeItem(codeKey(ex.slug, f.name)); } catch (e) {}
      if (st.models && st.models[f.name]) st.models[f.name].setValue(f.content);
      if (st.fallbackTAs && st.fallbackTAs[f.name]) st.fallbackTAs[f.name].value = f.content;
    });
    if (ex.kind === "react") schedulePreview();
  }

  function cleanup() {
    if (st) {
      if (st.timer) st.timer.destroy();
      if (st.editor && st.editor.dispose) { try { st.editor.dispose(); } catch (e) {} }
      if (st.models) Object.keys(st.models).forEach(function (k) { try { st.models[k].dispose(); } catch (e) {} });
      window.PR_EXT_EDITOR = null;
      st = null;
    }
    fe.frame = null;
    fe.ready = false;
    fe.cb = null;
  }

  /* ---------- page render ---------- */
  function renderExercise(ex) {
    cleanup();
    document.title = ex.name + " | Practice Playground";
    var app = document.getElementById("app");
    var isReact = ex.kind === "react";
    var fileTabs = ex.files.map(function (f, i) {
      var cls = /\.css$/.test(f.name) ? "css" : /\.html$/.test(f.name) ? "html" : "js";
      return '<span class="file-tab dbx-ftab' + (i === 0 ? " active" : "") + '" data-file="' + esc(f.name) + '"><span class="ft-icon ' + cls + '"></span>' + esc(f.name) + "</span>";
    }).join("");

    app.innerHTML =
      '<div class="problem-page dbx-page">' +
      '<div class="problem-left">' +
      '<div class="qd-cap"><span>Live Debugging</span><a href="#/">&lsaquo; All challenges</a></div>' +
      '<h1 class="problem-title">' + esc(ex.name) + "</h1>" +
      '<div class="problem-badges">' +
      '<span class="diff-' + ex.difficulty.toLowerCase() + '">' + ex.difficulty + "</span>" +
      '<span class="sub-tag">' + ex.files.length + " files &middot; " + ex.bugs.length + " seeded bugs &middot; " + (ex.minutes || 40) + " min</span>" +
      "</div>" +
      '<div class="statement">' + ex.brief + "</div>" +
      hintLadderHTML(ex) +
      walkthroughHTML(ex) +
      "</div>" +
      '<div class="problem-right dbx-right">' +
      '<div class="file-tabs">' + fileTabs +
      '<div class="file-tabs-right">' +
      '<button class="link-btn" id="dbx-reset" title="Restore the original buggy files">Reset Files</button>' +
      "</div></div>" +
      '<div id="dbx-timer-bar" class="pr-timer-bar"></div>' +
      '<div id="dbx-editor"></div>' +
      '<div class="bottom-panel">' +
      '<div class="bp-tabs">' +
      '<span class="bp-tab dbx-bp-tab active" data-panel="output">Output</span>' +
      '<span class="bp-tab dbx-bp-tab" data-panel="console">Console</span>' +
      "</div>" +
      '<div class="bp-body">' +
      '<div class="results-panel" id="dbx-results"><div class="bp-placeholder">Run the suite to see which tests fail — then start tracing.</div></div>' +
      '<div class="dbx-console" id="dbx-console" style="display:none">' +
      '<div class="pr-console-head"><span>Console <span class="dbx-console-n" id="dbx-console-count">0</span></span><button class="pr-console-clear" id="dbx-console-clear">Clear</button></div>' +
      '<div id="dbx-console-lines"></div>' +
      "</div></div></div>" +
      '<div class="editor-footer">' +
      '<span class="left-note">' + esc(ex.summary || "") + "</span>" +
      '<span class="lang-note">' + (isReact ? "React (JSX)" : "JavaScript") + "</span>" +
      '<button class="btn btn-green" id="dbx-run">Run Tests</button>' +
      "</div></div>" +
      (isReact
        ? '<div class="preview-col">' +
          '<div class="preview-chrome"><span class="pc-title">Live Preview</span>' +
          '<button class="pc-reload" id="dbx-preview-reload" title="Reload preview">&#10227;</button></div>' +
          '<iframe id="dbx-preview-frame" sandbox="allow-scripts" title="Preview"></iframe>' +
          "</div>"
        : "") +
      "</div>";

    st = { ex: ex, editor: null, models: null, fallbackTAs: null, timer: null };
    mountEditor(ex);
    if (isReact) {
      mountFrame();
      document.getElementById("dbx-preview-reload").onclick = function () { mountFrame(); };
    }

    st.timer = window.PR_TIMER.mount(document.getElementById("dbx-timer-bar"), {
      key: "debug-" + ex.slug,
      defaultMin: ex.minutes || 40,
      label: "Debug clock",
    });

    document.getElementById("dbx-run").onclick = function () { runTests(ex); };
    document.getElementById("dbx-reset").onclick = function () { resetFiles(ex); };
    document.getElementById("dbx-console-clear").onclick = consoleClear;
    document.querySelectorAll(".dbx-bp-tab").forEach(function (tab) {
      tab.onclick = function () { selectTab(tab.dataset.panel); };
    });
    document.querySelectorAll(".dbx-ftab").forEach(function (tab) {
      tab.onclick = function () { selectFile(tab.dataset.file); };
    });
    wireHints(ex);
    window.scrollTo(0, 0);
    return true;
  }

  /* ---------- routing + dashboard ---------- */
  window.PR_EXT_ROUTES = window.PR_EXT_ROUTES || [];
  window.PR_EXT_ROUTES.push(function (h) {
    var m = h.match(/^#\/debug\/([a-z0-9-]+)/);
    if (!m) { if (st) cleanup(); return false; }
    var ex = exercises().find(function (x) { return x.slug === m[1]; });
    if (!ex) return false;
    return renderExercise(ex);
  });

  window.PR_DASH_SECTIONS = window.PR_DASH_SECTIONS || [];
  window.PR_DASH_SECTIONS.push({ tab: "debug", render: function (dash) {
    var list = exercises();
    if (!dash || !list.length) return;
    var solved = solvedSet();
    var done = list.filter(function (x) { return solved.indexOf(x.slug) !== -1; }).length;
    var sec = document.createElement("div");
    var html =
      '<div class="track-head"><h2>Debugging <span class="tier-tag">Live screen</span></h2>' +
      '<span class="track-progress">' + done + " / " + list.length + " solved</span></div>" +
      '<p class="dash-sub">Unfamiliar mid-size codebase, several seeded bugs, one failing suite, 40 minutes. Trace with console.log, fix every bug, turn it green.</p>';
    list.forEach(function (ex) {
      var isSolved = solved.indexOf(ex.slug) !== -1;
      html +=
        '<div class="challenge-card">' +
        '<div class="challenge-info">' +
        '<div class="challenge-name">' + esc(ex.name) + "</div>" +
        '<div class="challenge-meta">' +
        '<span class="diff-' + ex.difficulty.toLowerCase() + '">' + ex.difficulty + "</span>" +
        '<span class="sub-tag">' + (ex.kind === "react" ? "React" : "JavaScript") + " &middot; " + ex.files.length + " files &middot; " + ex.bugs.length + " bugs</span>" +
        '<span class="max-score">' + (ex.minutes || 40) + " min</span>" +
        "</div></div>" +
        (isSolved ? '<span class="solved-badge">✔ Solved</span>' : "") +
        '<a class="btn ' + (isSolved ? "btn-outline" : "btn-green") + '" href="#/debug/' + ex.slug + '">' + (isSolved ? "Debug Again" : "Start Debugging") + "</a>" +
        "</div>";
    });
    sec.innerHTML = html;
    dash.appendChild(sec);
  } });
})();
