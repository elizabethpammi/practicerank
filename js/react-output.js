/* PracticeRank — React-problem Output panel (HackerRank-style)
   Self-contained feature module, modeled on js/custom-input.js. Mounts into
   the existing .preview-col that app.js renders for frontend problems, but
   ONLY for problems flagged `panel: "react-output"` — everything else keeps
   the stock preview + runFrontend path untouched.

   Structure (top to bottom): Output header with expand toggle · Preview /
   Tests tabs (Preview = sandboxed iframe running the user's component behind
   an error boundary; Tests = Jest-style results with per-test expand) ·
   collapsible, drag-resizable Console fed by BOTH the preview iframe and the
   test run, tagged by origin.

   React + ReactDOM + Babel standalone are vendored locally in /vendor/ — no
   CDN, no build step. Console volume is capped on both sides of the frame so
   an infinite render loop cannot freeze the host page. */
(function () {
  "use strict";

  var MAX_CONSOLE = 500; // parent-side entry cap (matches app.js console cap)
  var RUN_TIMEOUT_MS = 20000; // whole-run watchdog; rebuilds the sandbox frame
  var runSeq = 0; // invalidates stale results after navigation/re-run
  var st = null; // per-problem panel state

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* =====================================================================
     Sandbox harness — serialized with toString() into the iframe srcdoc,
     so it must be fully self-contained, ES5-safe and JSX-free.
     ===================================================================== */
  function harnessMain() {
    "use strict";
    var MAX_MSGS = 300; // per-run postMessage cap (infinite-loop guard)
    var msgCount = 0;
    var truncated = false;
    var originTag = "preview"; // flipped to "tests" while a suite runs
    var rootEl = document.getElementById("root");
    var root = null;

    function post(m) { try { parent.postMessage(m, "*"); } catch (e) {} }
    function escH(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function postLog(level, parts) {
      if (msgCount >= MAX_MSGS) {
        if (!truncated) {
          truncated = true;
          post({ type: "rop-log", origin: originTag, level: "warn", parts: [{ text: "Console output truncated — more than " + MAX_MSGS + " messages this run (infinite loop?)", detail: "", expandable: false }] });
        }
        return;
      }
      msgCount++;
      post({ type: "rop-log", origin: originTag, level: level, parts: parts });
    }
    function safeStringify(v, space) {
      var seen = [];
      try {
        return JSON.stringify(v, function (k, val) {
          if (typeof val === "function") return "[Function " + (val.name || "anonymous") + "]";
          if (typeof val === "bigint") return String(val) + "n";
          if (val && typeof val === "object") {
            if (seen.indexOf(val) !== -1) return "[Circular]";
            seen.push(val);
          }
          return val;
        }, space);
      } catch (e) { return String(v); }
    }
    function ser(v) {
      var t, detail = "", expandable = false;
      if (typeof v === "string") t = v;
      else if (v instanceof Error || (v && typeof v === "object" && typeof v.stack === "string" && v.message !== undefined)) {
        t = String(v);
        detail = String(v.stack || "");
        expandable = !!detail;
      } else if (v && typeof v === "object") {
        t = safeStringify(v);
        if (t === undefined || t === null) t = String(v);
        detail = safeStringify(v, 2) || "";
        expandable = true;
      } else t = String(v);
      if (t.length > 160) {
        if (!detail) { detail = t; expandable = true; }
        t = t.slice(0, 160) + "…";
      }
      if (detail.length > 4000) detail = detail.slice(0, 4000) + "\n… (clipped)";
      return { text: t, detail: detail, expandable: expandable };
    }
    function serArgs(args) {
      var out = [];
      for (var i = 0; i < args.length; i++) out.push(ser(args[i]));
      return out;
    }
    ["log", "info", "warn", "error"].forEach(function (level) {
      var orig = console[level];
      console[level] = function () {
        postLog(level, serArgs(arguments));
        try { orig.apply(console, arguments); } catch (e) {}
      };
    });
    window.addEventListener("error", function (ev) {
      postLog("error", [ser(ev.error || ev.message || "Unknown error")]);
    });
    window.addEventListener("unhandledrejection", function (ev) {
      var p = ser(ev.reason);
      p.text = "Uncaught (in promise) " + p.text;
      postLog("error", [p]);
    });

    /* ---------- error boundary (ES5 — this file is never Babel-compiled) ---------- */
    function makeBoundary() {
      function Boundary(props) {
        React.Component.call(this, props);
        this.state = { error: null, stack: "" };
      }
      Boundary.prototype = Object.create(React.Component.prototype);
      Boundary.prototype.constructor = Boundary;
      Boundary.getDerivedStateFromError = function (error) { return { error: error }; };
      Boundary.prototype.componentDidCatch = function (error, info) {
        this.setState({ stack: (info && info.componentStack) || "" });
      };
      Boundary.prototype.render = function () {
        if (this.state.error) {
          var e = this.state.error;
          var kids = [
            React.createElement("div", { className: "err-title", key: "t" }, "Something went wrong rendering <App />"),
            React.createElement("div", { className: "err-msg", key: "m" }, String((e && e.message) || e)),
          ];
          if (this.state.stack) {
            kids.push(React.createElement("div", { className: "err-sub", key: "cs" }, "Component stack"));
            kids.push(React.createElement("pre", { className: "err-stack", key: "csp" }, this.state.stack.replace(/^\n+/, "")));
          }
          if (e && e.stack) {
            kids.push(React.createElement("div", { className: "err-sub", key: "es" }, "Error stack"));
            kids.push(React.createElement("pre", { className: "err-stack", key: "esp" }, String(e.stack)));
          }
          return React.createElement("div", { className: "err-card" }, kids);
        }
        return this.props.children;
      };
      return Boundary;
    }

    /* ---------- compile + mount ---------- */
    // Loop guard: srcdoc iframes share the host renderer thread, so a
    // synchronous `while(true)` in user code would freeze the whole page and
    // no parent-side watchdog could ever fire. Inject an iteration cap into
    // every loop at compile time (the CodeSandbox / react-live technique) so
    // runaway loops throw into the error boundary instead.
    var LOOP_MAX = 5000000;
    window.__ropLoopGuard = 0;
    if (window.Babel) {
      Babel.registerPlugin("rop-loop-guard", function (ref) {
        var t = ref.types;
        function guard(path) {
          var check = t.ifStatement(
            t.binaryExpression(
              ">",
              t.updateExpression("++", t.memberExpression(t.identifier("window"), t.identifier("__ropLoopGuard")), true),
              t.numericLiteral(LOOP_MAX)
            ),
            t.throwStatement(t.newExpression(t.identifier("Error"), [t.stringLiteral("Infinite loop detected (" + LOOP_MAX + " iterations) — execution stopped.")]))
          );
          var body = path.get("body");
          if (body.isBlockStatement()) body.unshiftContainer("body", check);
          else body.replaceWith(t.blockStatement([check, body.node]));
        }
        return { visitor: { WhileStatement: guard, DoWhileStatement: guard, ForStatement: guard, ForInStatement: guard, ForOfStatement: guard } };
      });
    }
    function compile(code) {
      window.__ropLoopGuard = 0;
      var out = Babel.transform(code, { presets: ["react"], plugins: ["rop-loop-guard"], filename: "App.js" }).code;
      var fn = new Function("React", out + "\n;return (typeof App !== \"undefined\") ? App : undefined;");
      var App = fn(React);
      if (typeof App !== "function") throw new Error("Expected a component named App — define `function App() { … }` in App.js.");
      return App;
    }
    function unmount() {
      if (root) { try { root.unmount(); } catch (e) {} root = null; }
      rootEl.innerHTML = "";
    }
    function mountEl(el) {
      unmount();
      window.__ropLoopGuard = 0;
      root = ReactDOM.createRoot(rootEl);
      ReactDOM.flushSync(function () { root.render(el); });
    }
    function compileErrCard(title, e) {
      unmount();
      rootEl.innerHTML =
        '<div class="err-card"><div class="err-title">' + escH(title) + "</div>" +
        '<div class="err-msg">' + escH(String((e && e.message) || e)) + "</div>" +
        (e && e.stack ? '<div class="err-sub">Stack</div><pre class="err-stack">' + escH(String(e.stack)) + "</pre>" : "") +
        "</div>";
    }
    function mountPreview(code) {
      originTag = "preview";
      try {
        var App = compile(code);
        var Boundary = makeBoundary();
        mountEl(React.createElement(Boundary, null, React.createElement(App)));
      } catch (e) {
        compileErrCard("Couldn't compile App.js", e);
        console.error("Compile error: " + String((e && e.message) || e));
      }
    }

    /* ---------- assertion layer: expect / describe / it ---------- */
    function deepEqual(a, b) {
      if (a === b) return true;
      if (typeof a !== typeof b) return false;
      if (a === null || b === null) return false;
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
        return true;
      }
      if (typeof a === "object") {
        var ka = Object.keys(a), kb = Object.keys(b);
        if (ka.length !== kb.length) return false;
        for (var j = 0; j < ka.length; j++) if (!deepEqual(a[ka[j]], b[ka[j]])) return false;
        return true;
      }
      return false;
    }
    function fmtVal(v) {
      if (v && v.nodeType === 1) {
        var h = v.outerHTML;
        return h.length > 300 ? h.slice(0, 300) + "…" : h;
      }
      if (typeof v === "string") return JSON.stringify(v);
      var s = safeStringify(v, 2);
      return s === undefined || s === null ? String(v) : s;
    }
    function fmtShort(v) {
      var s = typeof v === "string" ? JSON.stringify(v) : safeStringify(v);
      if (s === undefined || s === null) s = String(v);
      return s.length > 60 ? s.slice(0, 60) + "…" : s;
    }
    function expect(actual) {
      function build(negate) {
        function check(pass, label, expected) {
          if (negate ? !pass : pass) return;
          var e = new Error("expect(received)" + (negate ? ".not" : "") + "." + label);
          e.isExpect = true;
          e.expected = (negate ? "not " : "") + fmtVal(expected);
          e.actual = fmtVal(actual);
          throw e;
        }
        return {
          toBe: function (x) { check(Object.is(actual, x), "toBe(" + fmtShort(x) + ")", x); },
          toEqual: function (x) { check(deepEqual(actual, x), "toEqual(" + fmtShort(x) + ")", x); },
          toBeTruthy: function () { check(!!actual, "toBeTruthy()", "a truthy value"); },
          toBeFalsy: function () { check(!actual, "toBeFalsy()", "a falsy value"); },
          toBeNull: function () { check(actual === null, "toBeNull()", null); },
          toBeDefined: function () { check(actual !== undefined, "toBeDefined()", "a defined value"); },
          toContain: function (x) { check(actual != null && typeof actual.indexOf === "function" && actual.indexOf(x) !== -1, "toContain(" + fmtShort(x) + ")", x); },
          toHaveLength: function (n) { check(actual != null && actual.length === n, "toHaveLength(" + n + ")", "length " + n); },
          toHaveTextContent: function (x) {
            var tc = ((actual && actual.textContent) || "").replace(/\s+/g, " ").trim();
            check(x instanceof RegExp ? x.test(tc) : tc.indexOf(String(x)) !== -1, "toHaveTextContent(" + fmtShort(String(x)) + ")", x);
          },
          toHaveValue: function (x) { check(!!actual && String(actual.value) === String(x), "toHaveValue(" + fmtShort(x) + ")", x); },
          toBeInTheDocument: function () { check(!!(actual && document.documentElement.contains(actual)), "toBeInTheDocument()", "an element in the document"); },
          toBeDisabled: function () { check(!!(actual && actual.disabled), "toBeDisabled()", "a disabled element"); },
          toBeGreaterThan: function (x) { check(actual > x, "toBeGreaterThan(" + x + ")", "> " + x); },
          toBeLessThan: function (x) { check(actual < x, "toBeLessThan(" + x + ")", "< " + x); },
        };
      }
      var api = build(false);
      api.not = build(true);
      return api;
    }

    /* ---------- RTL-style render / screen / fireEvent ---------- */
    function render(el) {
      // No boundary here on purpose: like React Testing Library, a render
      // crash should propagate and fail the test with the real error, not be
      // swallowed into the preview's error card.
      mountEl(el);
      return { container: rootEl };
    }
    function textMatches(node, t) {
      var tc = (node.textContent || "").replace(/\s+/g, " ").trim();
      return t instanceof RegExp ? t.test(tc) : tc === String(t);
    }
    function allByText(t) {
      var all = rootEl.querySelectorAll("*");
      var out = [];
      for (var i = 0; i < all.length; i++) {
        if (!textMatches(all[i], t)) continue;
        var kids = all[i].children, deeper = false;
        for (var j = 0; j < kids.length; j++) if (textMatches(kids[j], t)) { deeper = true; break; }
        if (!deeper) out.push(all[i]);
      }
      return out;
    }
    function allByAttr(attr, val) {
      return Array.prototype.slice.call(rootEl.querySelectorAll("[" + attr + '="' + val + '"]'));
    }
    var screen = {
      getByTestId: function (id) {
        var els = allByAttr("data-testid", id);
        if (els.length !== 1) throw new Error(els.length ? "Found " + els.length + ' elements with data-testid="' + id + '"' : 'Unable to find an element with data-testid="' + id + '"');
        return els[0];
      },
      queryByTestId: function (id) { return allByAttr("data-testid", id)[0] || null; },
      getAllByTestId: function (id) {
        var els = allByAttr("data-testid", id);
        if (!els.length) throw new Error('Unable to find elements with data-testid="' + id + '"');
        return els;
      },
      getByText: function (t) {
        var els = allByText(t);
        if (els.length !== 1) throw new Error(els.length ? "Found " + els.length + " elements with text " + fmtShort(String(t)) : "Unable to find an element with text " + fmtShort(String(t)));
        return els[0];
      },
      queryByText: function (t) { return allByText(t)[0] || null; },
      getAllByText: function (t) {
        var els = allByText(t);
        if (!els.length) throw new Error("Unable to find elements with text " + fmtShort(String(t)));
        return els;
      },
    };
    function act(fn) { ReactDOM.flushSync(fn); }
    function setNativeValue(el, value) {
      var proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype
        : el.tagName === "SELECT" ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
      var desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) desc.set.call(el, value); else el.value = value;
    }
    var fireEvent = {
      click: function (el) {
        act(function () { el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); });
      },
      change: function (el, init) {
        act(function () {
          if (init && init.target && "value" in init.target) setNativeValue(el, init.target.value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });
      },
      input: function (el, init) {
        act(function () {
          if (init && init.target && "value" in init.target) setNativeValue(el, init.target.value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        });
      },
      submit: function (el) {
        act(function () { el.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
      },
    };

    /* ---------- suite runner ---------- */
    function runTests(runId, code, suiteSource) {
      originTag = "tests";
      msgCount = 0;
      truncated = false;
      var t0 = Date.now();
      var tests = [];
      var currentSuite = null;
      function describe(name, fn) {
        var prev = currentSuite;
        currentSuite = String(name);
        try { fn(); } finally { currentSuite = prev; }
      }
      function it(name, fn) {
        tests.push({ suite: currentSuite || "Tests", name: String(name), fn: fn });
      }
      var App = null, setupErr = null;
      try { App = compile(code); } catch (e) { setupErr = e; }
      if (!setupErr) {
        try {
          var compiled = Babel.transform(suiteSource, { presets: ["react"], plugins: ["rop-loop-guard"], filename: "App.test.js" }).code;
          var reg = new Function("React", "App", "render", "screen", "fireEvent", "expect", "describe", "it", "test", compiled);
          reg(React, App, render, screen, fireEvent, expect, describe, it, it);
        } catch (e) { setupErr = e; }
      }
      var results = [];
      if (setupErr) {
        results.push({
          suite: "App.js", name: "compiles", passed: false, ms: 0,
          error: String((setupErr && setupErr.message) || setupErr),
          stack: String((setupErr && setupErr.stack) || ""),
        });
      } else {
        for (var i = 0; i < tests.length; i++) {
          var t = tests[i];
          var s0 = Date.now();
          var rec = { suite: t.suite, name: t.name, passed: true, ms: 0 };
          window.__ropLoopGuard = 0;
          try {
            t.fn();
          } catch (e) {
            rec.passed = false;
            rec.error = String((e && e.message) || e);
            rec.stack = String((e && e.stack) || "");
            if (e && e.isExpect) { rec.expected = e.expected; rec.actual = e.actual; }
          }
          rec.ms = Date.now() - s0;
          results.push(rec);
        }
      }
      var timeMs = Date.now() - t0;
      try { mountPreview(code); } catch (e) {} // restore the preview after the run
      post({ type: "rop-results", runId: runId, tests: results, timeMs: timeMs });
    }

    window.addEventListener("message", function (ev) {
      var d = ev.data || {};
      if (d.type === "rop-preview") {
        msgCount = 0;
        truncated = false;
        mountPreview(String(d.code || ""));
      } else if (d.type === "rop-run") {
        try {
          runTests(d.runId, String(d.code || ""), String(d.suite || ""));
        } catch (e) {
          post({
            type: "rop-results", runId: d.runId, timeMs: 0,
            tests: [{ suite: "Harness", name: "internal error", passed: false, ms: 0, error: String((e && e.message) || e), stack: String((e && e.stack) || "") }],
          });
        }
      }
    });

    var missing = [];
    if (!window.React) missing.push("/vendor/react.production.min.js");
    if (!window.ReactDOM) missing.push("/vendor/react-dom.production.min.js");
    if (!window.Babel) missing.push("/vendor/babel.min.js");
    if (missing.length) {
      rootEl.innerHTML = '<div class="err-card"><div class="err-title">Vendored libraries failed to load</div><div class="err-msg">' + missing.map(escH).join("<br>") + "</div></div>";
    }
    post({ type: "rop-ready", ok: !missing.length });
  }

  var PREVIEW_CSS =
    "html,body{margin:0;padding:0}" +
    "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0e141e;padding:14px;font-size:14px;line-height:1.5}" +
    "button{font:inherit;cursor:pointer}" +
    ".err-card{background:#fdf3f2;border:1px solid #e7b6b4;border-radius:4px;padding:12px 14px;font-size:13px}" +
    ".err-title{color:#a02725;font-weight:700;margin-bottom:6px}" +
    ".err-msg{color:#0e141e;font-family:Menlo,Consolas,monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;margin-bottom:8px}" +
    ".err-sub{color:#a02725;font-size:11px;text-transform:uppercase;letter-spacing:.4px;font-weight:700;margin:8px 0 3px}" +
    ".err-stack{background:#fff;border:1px solid #eed4d3;border-radius:3px;color:#576871;font-size:11px;line-height:1.5;padding:8px;margin:0;white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:auto}";

  function harnessDoc() {
    var base = location.origin;
    return "<!DOCTYPE html><html><head><meta charset='utf-8'><style>" + PREVIEW_CSS + "</style>" +
      '<script src="' + base + '/vendor/react.production.min.js"><\/script>' +
      '<script src="' + base + '/vendor/react-dom.production.min.js"><\/script>' +
      '<script src="' + base + '/vendor/babel.min.js"><\/script>' +
      '</head><body><div id="root"></div>' +
      "<script>(" + harnessMain.toString() + ")();<\/script></body></html>";
  }

  /* =====================================================================
     Panel markup
     ===================================================================== */
  var SVG = 'width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON_EXPAND = "<svg " + SVG + '><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  var ICON_SHRINK = "<svg " + SVG + '><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>';
  var ICON_PLAY = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>';
  var ICON_PASS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
  var ICON_FAIL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  var ICON_ERR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 16.5v.5" stroke="#1e1e1e" stroke-width="2" stroke-linecap="round"/></svg>';
  var ICON_WARN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2z"/><path d="M12 9v5M12 17.2v.6" stroke="#1e1e1e" stroke-width="2" stroke-linecap="round"/></svg>';

  function panelHTML() {
    return (
      '<div id="rop">' +
      '<div class="rop-head"><span class="rop-head-title">Output</span>' +
      '<button id="rop-expand" title="Expand panel">' + ICON_EXPAND + "</button></div>" +
      '<div class="rop-tabs">' +
      '<button class="rop-tab active" data-tab="preview">Preview</button>' +
      '<button class="rop-tab" data-tab="tests">Tests</button>' +
      "</div>" +
      '<div class="rop-main">' +
      '<div class="rop-pane active" id="rop-pane-preview">' +
      '<div class="rop-preview-bar"><span class="rop-preview-url">localhost:8000</span>' +
      '<button id="rop-preview-reload" title="Re-render preview">&#10227;</button></div>' +
      '<iframe id="rop-frame" sandbox="allow-scripts" title="Component preview"></iframe>' +
      "</div>" +
      '<div class="rop-pane" id="rop-pane-tests">' +
      '<div class="rop-tests-head"><span>Test Results</span>' +
      '<button id="rop-run" class="rop-run-btn" title="Run tests">' + ICON_PLAY + "<span>Run</span></button></div>" +
      '<div class="rop-summary" id="rop-summary"><span class="rop-sum-hint">Run the tests to see results.</span></div>' +
      '<div class="rop-cases" id="rop-cases"></div>' +
      "</div>" +
      "</div>" +
      '<div id="rop-divider" title="Drag to resize console"></div>' +
      '<div id="rop-console">' +
      '<div class="rop-con-head">' +
      '<button id="rop-con-toggle" title="Collapse console">&#9662;</button>' +
      '<span class="rop-con-title">Console</span>' +
      '<span class="rop-con-count" id="rop-con-count">0</span>' +
      '<input type="text" id="rop-con-filter" placeholder="Filter by text search" aria-label="Filter console by text">' +
      '<select id="rop-con-level" aria-label="Filter console by level">' +
      '<option value="all">All</option><option value="log">Log</option><option value="info">Info</option>' +
      '<option value="warn">Warn</option><option value="error">Error</option></select>' +
      '<button id="rop-con-clear" title="Clear console">Clear</button>' +
      "</div>" +
      '<div class="rop-con-body" id="rop-con-body"></div>' +
      "</div>" +
      "</div>"
    );
  }

  /* =====================================================================
     Console (parent side)
     ===================================================================== */
  function entryText(entry) {
    var s = entry.origin + " " + entry.level;
    for (var i = 0; i < entry.parts.length; i++) s += " " + entry.parts[i].text + " " + (entry.parts[i].detail || "");
    return s.toLowerCase();
  }
  function entryKey(origin, level, parts) {
    var k = origin + "|" + level;
    for (var i = 0; i < parts.length; i++) k += "|" + parts[i].text + " " + (parts[i].detail || "");
    return k;
  }
  function entryMatches(entry) {
    if (st.filterLevel !== "all" && entry.level !== st.filterLevel) return false;
    if (st.filterText && entryText(entry).indexOf(st.filterText) === -1) return false;
    return true;
  }
  function applyFilter() {
    for (var i = 0; i < st.entries.length; i++) {
      var e = st.entries[i];
      e.el.style.display = entryMatches(e) ? "" : "none";
    }
  }
  function updateConCount() {
    var n = 0;
    for (var i = 0; i < st.entries.length; i++) n += st.entries[i].count;
    var el = document.getElementById("rop-con-count");
    if (el) el.textContent = n + (st.capped ? "+" : "");
  }
  function renderEntry(entry) {
    var row = document.createElement("div");
    row.className = "rop-log rop-log--" + entry.level;
    var expandable = false;
    for (var i = 0; i < entry.parts.length; i++) if (entry.parts[i].expandable) expandable = true;

    var head = document.createElement("div");
    head.className = "rop-log-head";
    var html = "";
    html += '<span class="rop-log-caret">' + (expandable ? "&#9656;" : "") + "</span>";
    if (entry.level === "error") html += '<span class="rop-log-icon">' + ICON_ERR + "</span>";
    else if (entry.level === "warn") html += '<span class="rop-log-icon">' + ICON_WARN + "</span>";
    html += '<span class="rop-log-origin rop-log-origin--' + entry.origin + '">' + entry.origin + "</span>";
    html += '<span class="rop-log-text">';
    for (var j = 0; j < entry.parts.length; j++) html += (j ? " " : "") + esc(entry.parts[j].text);
    html += "</span>";
    html += '<span class="rop-log-repeat" style="display:none"></span>';
    head.innerHTML = html;
    row.appendChild(head);

    if (expandable) {
      var detail = document.createElement("pre");
      detail.className = "rop-log-detail";
      detail.style.display = "none";
      var dtxt = "";
      for (var k = 0; k < entry.parts.length; k++) {
        if (!entry.parts[k].detail) continue;
        dtxt += (dtxt ? "\n\n" : "") + entry.parts[k].detail;
      }
      detail.textContent = dtxt;
      row.appendChild(detail);
      head.onclick = function () {
        var open = detail.style.display !== "none";
        detail.style.display = open ? "none" : "block";
        head.querySelector(".rop-log-caret").innerHTML = open ? "&#9656;" : "&#9662;";
      };
    }
    return row;
  }
  function pushConsole(origin, level, parts) {
    if (!st) return;
    var key = entryKey(origin, level, parts);
    var last = st.entries[st.entries.length - 1];
    if (last && last.key === key) {
      last.count++;
      var badge = last.el.querySelector(".rop-log-repeat");
      badge.textContent = "x" + last.count;
      badge.style.display = "";
      updateConCount();
      return;
    }
    var entry = { key: key, origin: origin, level: level, parts: parts, count: 1 };
    entry.el = renderEntry(entry);
    if (st.entries.length >= MAX_CONSOLE) {
      var dropped = st.entries.shift();
      if (dropped.el.parentNode) dropped.el.parentNode.removeChild(dropped.el);
      st.capped = true;
    }
    st.entries.push(entry);
    var body = document.getElementById("rop-con-body");
    if (!body) return;
    entry.el.style.display = entryMatches(entry) ? "" : "none";
    body.appendChild(entry.el);
    body.scrollTop = body.scrollHeight;
    updateConCount();
  }
  function clearConsole() {
    st.entries = [];
    st.capped = false;
    var body = document.getElementById("rop-con-body");
    if (body) body.innerHTML = "";
    updateConCount();
  }

  /* =====================================================================
     Test results rendering
     ===================================================================== */
  function detailHTML(t) {
    var html = "";
    if (t.passed) {
      html += '<div class="rop-case-note">Test passed in ' + t.ms + " ms.</div>";
    } else {
      html += '<div class="rop-case-sub">Failure</div><pre class="rop-case-err">' + esc(t.error || "Unknown failure") + "</pre>";
      if (t.expected !== undefined || t.actual !== undefined) {
        html +=
          '<div class="rop-diff">' +
          '<div class="rop-diff-col rop-diff-expected"><div class="rop-diff-cap">Expected</div><pre>' + esc(t.expected === undefined ? "—" : t.expected) + "</pre></div>" +
          '<div class="rop-diff-col rop-diff-actual"><div class="rop-diff-cap">Received</div><pre>' + esc(t.actual === undefined ? "—" : t.actual) + "</pre></div>" +
          "</div>";
      }
      if (t.stack) html += '<div class="rop-case-sub">Stack</div><pre class="rop-case-stack">' + esc(t.stack) + "</pre>";
      html += '<div class="rop-case-note">Failed after ' + t.ms + " ms.</div>";
    }
    return html;
  }
  function onResults(d) {
    if (!st || d.runId !== st.runId) return; // stale run
    if (st.timer) { clearTimeout(st.timer); st.timer = null; }
    var passed = 0, failed = 0;
    for (var i = 0; i < d.tests.length; i++) d.tests[i].passed ? passed++ : failed++;

    var sum = document.getElementById("rop-summary");
    sum.innerHTML =
      '<span class="rop-sum rop-sum-pass">Passed - ' + passed + "</span>" +
      '<span class="rop-sum ' + (failed ? "rop-sum-fail" : "rop-sum-zero") + '">Failed - ' + failed + "</span>" +
      '<span class="rop-sum rop-sum-time">Time - ' + (d.timeMs / 1000).toFixed(2) + " sec</span>";

    var wrap = document.getElementById("rop-cases");
    wrap.innerHTML = "";
    var firstFailDetail = null;
    d.tests.forEach(function (t) {
      var row = document.createElement("div");
      row.className = "rop-case" + (t.passed ? "" : " rop-case--fail");
      var head = document.createElement("div");
      head.className = "rop-case-head";
      head.innerHTML =
        '<span class="rop-case-icon">' + (t.passed ? ICON_PASS : ICON_FAIL) + "</span>" +
        '<span class="rop-case-label">' + esc(t.suite) + " : " + esc(t.name) + "</span>" +
        '<span class="rop-case-chev">&#9662;</span>';
      var detail = document.createElement("div");
      detail.className = "rop-case-detail";
      detail.style.display = "none";
      detail.innerHTML = detailHTML(t);
      head.onclick = function () {
        var open = detail.style.display !== "none";
        detail.style.display = open ? "none" : "block";
        row.classList.toggle("rop-case--open", !open);
      };
      row.appendChild(head);
      row.appendChild(detail);
      wrap.appendChild(row);
      if (!t.passed && !firstFailDetail) { firstFailDetail = { row: row, detail: detail }; }
    });
    if (firstFailDetail) {
      firstFailDetail.detail.style.display = "block";
      firstFailDetail.row.classList.add("rop-case--open");
    }

    if (st.isSubmit && failed === 0 && d.tests.length) {
      markSolved(st.p.slug);
      sum.innerHTML += '<span class="rop-sum rop-sum-solved">&#10004; Solved</span>';
    }
    if (window.PR_APP && window.PR_APP.dbgEvent) {
      window.PR_APP.dbgEvent("react-output: " + passed + " passed, " + failed + " failed (" + st.p.slug + ")");
    }
  }

  /* =====================================================================
     Host bridge helpers
     ===================================================================== */
  function markSolved(slug) {
    // Mirrors app.js markSolved/logSolve (not exposed on the PR_APP bridge).
    try {
      var s = JSON.parse(localStorage.getItem("pr-solved") || "[]");
      if (s.indexOf(slug) === -1) { s.push(slug); localStorage.setItem("pr-solved", JSON.stringify(s)); }
      var log = JSON.parse(localStorage.getItem("pr-solve-log") || "{}");
      if (!log[slug]) {
        var d = new Date();
        log[slug] = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        localStorage.setItem("pr-solve-log", JSON.stringify(log));
      }
    } catch (e) {}
  }
  function getCode(p) {
    var B = window.PR_APP;
    var ed = B && B.getEditor && B.getEditor();
    if (ed && typeof ed.getValue === "function") return ed.getValue();
    return localStorage.getItem("pr-code-" + p.slug) || p.starter;
  }

  /* =====================================================================
     Frame lifecycle + runs
     ===================================================================== */
  function sendToFrame(msg) {
    if (!st) return;
    if (st.ready && st.frame && st.frame.contentWindow) st.frame.contentWindow.postMessage(msg, "*");
    else st.queue.push(msg);
  }
  function buildFrame() {
    var pane = document.getElementById("rop-pane-preview");
    var old = document.getElementById("rop-frame");
    var frame = document.createElement("iframe");
    frame.id = "rop-frame";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("title", "Component preview");
    if (old) pane.replaceChild(frame, old);
    else pane.appendChild(frame);
    st.frame = frame;
    st.ready = false;
    st.queue = [];
    frame.srcdoc = harnessDoc();
  }
  function refreshPreview() {
    sendToFrame({ type: "rop-preview", code: getCode(st.p) });
  }
  function runSuite(isSubmit) {
    if (!st) return;
    st.isSubmit = isSubmit;
    selectTab("tests");
    var runId = "rop" + (++runSeq);
    st.runId = runId;
    document.getElementById("rop-cases").innerHTML = "";
    document.getElementById("rop-summary").innerHTML =
      '<span class="rop-sum-hint"><span class="spinner"></span>Running tests…</span>';
    if (st.timer) clearTimeout(st.timer);
    st.timer = setTimeout(function () {
      if (!st || st.runId !== runId) return;
      document.getElementById("rop-summary").innerHTML =
        '<span class="rop-sum rop-sum-fail">Timed out after ' + RUN_TIMEOUT_MS / 1000 + 's — infinite loop? Sandbox restarted.</span>';
      pushConsole("tests", "error", [{ text: "Run timed out after " + RUN_TIMEOUT_MS / 1000 + "s. The sandbox was restarted.", detail: "", expandable: false }]);
      buildFrame(); // recover from a hung sandbox
      refreshPreview();
    }, RUN_TIMEOUT_MS);
    sendToFrame({ type: "rop-run", runId: runId, code: getCode(st.p), suite: st.p.suite });
  }

  /* =====================================================================
     Wiring
     ===================================================================== */
  function selectTab(which) {
    document.querySelectorAll("#rop .rop-tab").forEach(function (t) {
      t.classList.toggle("active", t.dataset.tab === which);
    });
    document.getElementById("rop-pane-preview").classList.toggle("active", which === "preview");
    document.getElementById("rop-pane-tests").classList.toggle("active", which === "tests");
  }
  function wireTabs() {
    document.querySelectorAll("#rop .rop-tab").forEach(function (t) {
      t.onclick = function () { selectTab(t.dataset.tab); };
    });
  }
  function wireExpand() {
    var btn = document.getElementById("rop-expand");
    var panel = document.getElementById("rop");
    function setFull(on) {
      panel.classList.toggle("rop--full", on);
      document.body.classList.toggle("rop-full-open", on);
      btn.innerHTML = on ? ICON_SHRINK : ICON_EXPAND;
      btn.title = on ? "Exit fullscreen (Esc)" : "Expand panel";
    }
    btn.onclick = function () { setFull(!panel.classList.contains("rop--full")); };
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("rop--full")) setFull(false);
    });
  }
  function wireConsole() {
    document.getElementById("rop-con-clear").onclick = clearConsole;
    document.getElementById("rop-con-filter").oninput = function () {
      st.filterText = this.value.toLowerCase();
      applyFilter();
    };
    document.getElementById("rop-con-level").onchange = function () {
      st.filterLevel = this.value;
      applyFilter();
    };
    var toggle = document.getElementById("rop-con-toggle");
    var con = document.getElementById("rop-console");
    var divider = document.getElementById("rop-divider");
    toggle.onclick = function () {
      var collapsed = con.classList.toggle("rop-con--collapsed");
      divider.style.display = collapsed ? "none" : "";
      toggle.innerHTML = collapsed ? "&#9656;" : "&#9662;";
      toggle.title = collapsed ? "Expand console" : "Collapse console";
    };
    // drag-resize: divider between the tests/preview area and the console
    divider.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      divider.setPointerCapture(e.pointerId);
      var startY = e.clientY;
      var startH = con.getBoundingClientRect().height;
      var panelH = document.getElementById("rop").getBoundingClientRect().height;
      function move(ev) {
        var h = startH + (startY - ev.clientY);
        h = Math.max(60, Math.min(panelH * 0.7, h));
        con.style.height = h + "px";
        con.style.flex = "none";
      }
      function up(ev) {
        divider.removeEventListener("pointermove", move);
        divider.removeEventListener("pointerup", up);
        try { divider.releasePointerCapture(ev.pointerId); } catch (err) {}
      }
      divider.addEventListener("pointermove", move);
      divider.addEventListener("pointerup", up);
    });
  }

  window.addEventListener("message", function (ev) {
    if (!st || !st.frame || ev.source !== st.frame.contentWindow) return;
    var d = ev.data || {};
    if (d.type === "rop-ready") {
      st.ready = true;
      var q = st.queue;
      st.queue = [];
      q.forEach(function (m) { st.frame.contentWindow.postMessage(m, "*"); });
      refreshPreview();
    } else if (d.type === "rop-log") {
      pushConsole(d.origin === "tests" ? "tests" : "preview", d.level, Array.isArray(d.parts) ? d.parts : []);
    } else if (d.type === "rop-results") {
      onResults(d);
    }
  });

  /* =====================================================================
     Mount (same self-mount pattern as js/custom-input.js)
     ===================================================================== */
  function slugFromHash() {
    var m = (location.hash || "").match(/^#\/problem\/([a-z0-9-]+)/);
    return m ? m[1] : null;
  }
  function problemFor(slug) {
    var B = window.PR_APP;
    if (!B || !slug) return null;
    var list = B.problems || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }
  function mount() {
    var p = problemFor(slugFromHash());
    if (!p || p.type !== "react" || p.panel !== "react-output" || !p.suite) return;
    var host = document.querySelector(".preview-col");
    if (!host || document.getElementById("rop")) return; // not rendered yet / already mounted

    host.classList.add("rop-host");
    host.innerHTML = panelHTML();

    st = {
      p: p, runId: null, timer: null, isSubmit: false,
      frame: null, ready: false, queue: [],
      entries: [], capped: false, filterText: "", filterLevel: "all",
    };

    wireTabs();
    wireExpand();
    wireConsole();
    buildFrame();

    document.getElementById("rop-preview-reload").onclick = function () { refreshPreview(); };
    document.getElementById("rop-run").onclick = function () { runSuite(false); };
    // Take over Run/Submit for this problem only. app.js assigns these with
    // `onclick =` inside renderProblem; this module mounts from a
    // MutationObserver microtask that fires after renderProblem returns, so
    // reassignment here cleanly replaces the stock runFrontend path.
    var run = document.getElementById("btn-run");
    var submit = document.getElementById("btn-submit");
    if (run) run.onclick = function () { refreshPreview(); runSuite(false); };
    if (submit) submit.onclick = function () { refreshPreview(); runSuite(true); };

    if (window.PR_APP && window.PR_APP.dbgEvent) window.PR_APP.dbgEvent("react-output: panel mounted (" + p.slug + ")");
  }
  function tryMount() {
    var onPanelProblem = false;
    var p = problemFor(slugFromHash());
    if (p && p.type === "react" && p.panel === "react-output") onPanelProblem = true;
    if (!onPanelProblem && st) st = null; // navigated away — drop state
    try { mount(); } catch (e) {}
  }
  var appEl = document.getElementById("app");
  if (appEl) new MutationObserver(tryMount).observe(appEl, { childList: true });
  window.addEventListener("hashchange", function () { setTimeout(tryMount, 0); });
  tryMount();
})();
