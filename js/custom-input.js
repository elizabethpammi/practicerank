/* PracticeRank — "Test against custom input" (HackerRank-style)
   Self-contained feature module. Algorithm (JavaScript) problems only — the
   frontend React/CSS runner has no stdin/args path, so the toggle is not
   offered there. Uses the same Web Worker runner and the same input
   convention as the normal test cases: a JSON array of arguments that is
   fn.apply'd, exactly like each case's `args`.

   Depends on the small bridge app.js exposes as window.PR_APP
   (execute / getEditor / appendConsoleLine / dbgEvent). All UI, parsing,
   persistence and rendering lives here. */
(function () {
  "use strict";

  var STORE_INPUT = "pr-custom-input-"; // per-slug textarea contents
  var STORE_ON = "pr-custom-on-"; // per-slug toggle state ("1")
  var runSeq = 0; // invalidates stale worker results after navigation/re-run

  function bridge() { return window.PR_APP || null; }

  function slugFromHash() {
    var m = (location.hash || "").match(/^#\/problem\/([a-z0-9-]+)/);
    return m ? m[1] : null;
  }
  function problemFor(slug) {
    var B = bridge();
    if (!B || !slug) return null;
    var list = B.problems || [];
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i];
    return null;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fmt(v) {
    if (typeof v === "string") return v;
    if (v === undefined) return "undefined";
    try { var s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch (e) { return String(v); }
  }
  function fmtLog(v) {
    if (typeof v === "string") return v;
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    try { var s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch (e) { return String(v); }
  }

  /* ---------- persistence ---------- */
  function savedInput(slug) { return localStorage.getItem(STORE_INPUT + slug) || ""; }
  function saveInput(slug, v) {
    try {
      if (v) localStorage.setItem(STORE_INPUT + slug, v);
      else localStorage.removeItem(STORE_INPUT + slug);
    } catch (e) {}
  }
  function toggleOn(slug) { return localStorage.getItem(STORE_ON + slug) === "1"; }
  function saveToggle(slug, on) {
    try {
      if (on) localStorage.setItem(STORE_ON + slug, "1");
      else localStorage.removeItem(STORE_ON + slug);
    } catch (e) {}
  }

  /* ---------- rendering ---------- */
  function stampHTML() {
    return '<div class="ci-stamp"><span class="ci-chip">Custom run</span>' +
      '<span class="ci-stamp-note">Ran against your input only — sample and hidden test cases were skipped. Nothing was scored.</span></div>';
  }
  function noteHTML(kind, title, body) {
    return stampHTML() +
      '<div class="ci-msg ci-msg--' + kind + '"><h4>' + esc(title) + "</h4><pre>" + esc(body) + "</pre></div>";
  }
  // A blocked run (empty/malformed input) never reached the runner — no stamp,
  // just the plain message, so it can't be mistaken for an executed run.
  function blockedHTML(kind, title, body) {
    return '<div class="ci-msg ci-msg--' + kind + '"><h4>' + esc(title) + "</h4><pre>" + esc(body) + "</pre></div>";
  }

  function resultHTML(p, args, logs, r) {
    var html = stampHTML() + '<div class="ci-detail">';
    html += "<h5>Input — " + esc(p.fn) + "(&hellip;) arguments</h5><pre>" + esc(args.map(fmt).join("\n") || "(no arguments)") + "</pre>";
    var stdout = logs.filter(function (l) { return l.level !== "error" && l.level !== "warn"; });
    var stderr = logs.filter(function (l) { return l.level === "error" || l.level === "warn"; });
    html += "<h5>Stdout (console output)</h5><pre>" + (stdout.length ? esc(stdout.map(function (l) { return l.text; }).join("\n")) : '<span class="ci-none">(no output)</span>') + "</pre>";
    if (stderr.length) {
      html += "<h5>Stderr (console.warn / console.error)</h5><pre class=\"ci-stderr\">" + esc(stderr.map(function (l) { return l.text; }).join("\n")) + "</pre>";
    }
    if (r.ok) {
      html += "<h5>Return value</h5><pre>" + esc(fmt(r.out)) + "</pre>";
    } else {
      html += '<h5>Exception</h5><div class="pr-error-block"><pre>' + esc(r.error) + "</pre></div>";
    }
    html += "<h5>Execution time</h5><pre>" + r.ms + " ms</pre></div>";
    return html;
  }

  /* ---------- run ---------- */
  function reveal(el) {
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  }

  function runCustom() {
    var B = bridge();
    var slug = slugFromHash();
    var p = problemFor(slug);
    var ta = document.getElementById("ci-input");
    var out = document.getElementById("ci-result");
    if (!B || !p || !ta || !out) return;

    var editor = B.getEditor();
    if (!editor) {
      out.innerHTML = blockedHTML("warn", "Editor is still loading", "Give it a second, then run again.");
      return;
    }

    var raw = ta.value;
    if (!raw.trim()) {
      out.innerHTML = blockedHTML("warn", "No custom input",
        "Type the arguments for " + p.fn + "(…) above, or untick “Test against custom input” to run the sample test cases.");
      reveal(out);
      ta.focus();
      return;
    }

    var args;
    try {
      args = JSON.parse(raw);
    } catch (err) {
      out.innerHTML = blockedHTML("error", "Custom input is not valid JSON",
        err.message + "\n\nProvide the arguments for " + p.fn + "(…) as one JSON array — e.g. [[1,2,3], 5] calls " + p.fn + "([1,2,3], 5).");
      reveal(out);
      return;
    }
    if (!Array.isArray(args)) {
      out.innerHTML = blockedHTML("error", "Custom input must be a JSON array",
        "Got " + (args === null ? "null" : typeof args) + ". Wrap the arguments in [ … ] — e.g. [[1,2,3], 5] calls " + p.fn + "([1,2,3], 5).");
      reveal(out);
      return;
    }

    var token = ++runSeq;
    var logs = [];
    out.innerHTML = '<div class="ci-msg ci-msg--run"><span class="spinner"></span>Running against custom input…</div>';
    reveal(out);
    B.dbgEvent("Custom-input run " + p.slug + " — " + p.fn + "(" + args.map(fmt).join(", ") + ")");

    B.execute(editor.getValue(), p.fn, [{ args: args }], function (data) {
      if (token !== runSeq || slugFromHash() !== slug) return; // stale
      var o = document.getElementById("ci-result");
      if (!o) return;
      if (data.timeout) {
        o.innerHTML = noteHTML("error", "Time limit exceeded",
          "Your code ran for more than 10 seconds on this input and was terminated — check for an infinite loop.");
        reveal(o);
        return;
      }
      if (data.compileError) {
        o.innerHTML = noteHTML("error", "Compilation error", data.compileError);
        reveal(o);
        return;
      }
      o.innerHTML = resultHTML(p, args, logs, data.results[0]);
      reveal(o);
    }, function (level, largs) {
      logs.push({ level: level, text: (Array.isArray(largs) ? largs : [largs]).map(fmtLog).join(" ") });
      B.appendConsoleLine(level, largs); // keep the shared debug console in sync
    });
  }

  /* ---------- mount ---------- */
  function setOpen(open, slug) {
    var block = document.getElementById("custom-input-block");
    if (block) block.hidden = !open;
    saveToggle(slug, open);
    if (open && block) {
      block.scrollIntoView({ block: "nearest" });
      var ta = document.getElementById("ci-input");
      if (ta) ta.focus();
    }
  }

  function mount() {
    var slug = slugFromHash();
    var p = problemFor(slug);
    if (!p || p.type === "react" || p.type === "css") return;
    var footer = document.querySelector(".problem-page .editor-footer");
    if (!footer) return;
    if (document.getElementById("ci-toggle-wrap")) return; // already mounted for this render

    // toggle, sitting with the Run controls
    var wrap = document.createElement("label");
    wrap.id = "ci-toggle-wrap";
    wrap.className = "ci-toggle";
    wrap.title = "Run your code against your own input instead of the sample test cases";
    wrap.innerHTML = '<input type="checkbox" id="ci-toggle"><span>Test against custom input</span>';
    footer.insertBefore(wrap, document.getElementById("btn-run") || null);

    // panel — reuse the app's placeholder container when present so there is
    // exactly one custom-input surface; otherwise create our own in the panel body
    var block = document.getElementById("custom-input-block");
    if (!block) {
      block = document.createElement("div");
      block.id = "custom-input-block";
      var body = document.querySelector(".bp-body");
      (body || footer.parentNode).appendChild(block);
    }
    block.className = "ci-block";
    block.innerHTML =
      '<div class="ci-head"><span class="ci-chip">Custom input</span>' +
      '<span class="ci-note">Runs ' + esc(p.fn) + "(…) against this input only — no test cases, no score.</span></div>" +
      '<textarea id="ci-input" class="ci-textarea" spellcheck="false" placeholder="Arguments for ' + esc(p.fn) + '(…) as a JSON array — e.g. [[1,2,3], 5]"></textarea>' +
      '<div class="ci-actions">' +
      '<button class="btn btn-outline" id="ci-run">Run Custom Input</button>' +
      '<button class="ci-clear" id="ci-clear" title="Clear the custom input">Clear</button>' +
      "</div>" +
      '<div id="ci-result"></div>';

    var toggle = document.getElementById("ci-toggle");
    var ta = document.getElementById("ci-input");

    ta.value = savedInput(slug);
    ta.addEventListener("input", function () { saveInput(slug, ta.value); });
    toggle.checked = toggleOn(slug);
    block.hidden = !toggle.checked;
    toggle.addEventListener("change", function () { setOpen(toggle.checked, slug); });

    document.getElementById("ci-run").onclick = runCustom;
    document.getElementById("ci-clear").onclick = function () {
      ta.value = "";
      saveInput(slug, "");
      var o = document.getElementById("ci-result");
      if (o) o.innerHTML = "";
      ta.focus();
    };
    // Ctrl/Cmd+Enter inside the textarea runs the custom case
    ta.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key || "").toLowerCase() === "enter") {
        e.preventDefault();
        runCustom();
      }
    });
  }

  // While the toggle is on, the main Run button runs the custom case instead of
  // the sample test cases (HackerRank behavior). Capture phase so we win over
  // the app's own onclick without touching its code. Submit is untouched.
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest("#btn-run")) return;
    var toggle = document.getElementById("ci-toggle");
    if (toggle && toggle.checked) {
      e.preventDefault();
      e.stopPropagation();
      runCustom();
    }
  }, true);

  function tryMount() { try { mount(); } catch (e) {} }
  var appEl = document.getElementById("app");
  if (appEl) new MutationObserver(tryMount).observe(appEl, { childList: true });
  window.addEventListener("hashchange", function () { setTimeout(tryMount, 0); });
  tryMount();
})();
