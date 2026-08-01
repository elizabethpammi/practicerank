/* PracticeRank SPA — dashboard + problem pages, Monaco editor, Web Worker runner */
(function () {
  "use strict";

  var PROBLEMS = (window.INTERVIEW_PROBLEMS || [])
    .concat(window.FRONTEND_PROBLEMS || [])
    .concat(window.PROBLEMS || []);
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
  function ghostTabsFor(p) {
    var names = p.type === "react" ? ["index.js", "styles.css"] : p.type === "css" ? ["index.html"] : ["tests.js"];
    return names.map(function (n) {
      return '<span class="file-tab ghost"><span class="ft-icon ' + ftIconClass(n) + '"></span>' + n + "</span>";
    }).join("");
  }
  function initialTermLines(p) {
    if (isFrontend(p)) {
      return '<div>[1] Compiling...</div><div>[1] Compiled successfully!</div><div>[1] webpack compiled successfully</div>';
    }
    return "<div>$ node --version</div><div>v20.11.1</div><div>$</div>";
  }
  function termLog(line, cls) {
    var t = document.getElementById("term-log");
    if (!t) return;
    var d = document.createElement("div");
    if (cls) d.className = cls;
    d.textContent = line;
    t.appendChild(d);
    var body = t.parentNode;
    if (body) body.scrollTop = body.scrollHeight;
  }

  /* ---------- router ---------- */
  function route() {
    var h = location.hash || "#/";
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
    window.scrollTo(0, 0);
  }

  /* ---------- problem page ---------- */
  function renderProblem(p) {
    currentSlug = p.slug;
    lastResults = null;
    document.title = p.name + " | Practice Playground";
    var actIcons =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z"/><path d="M13 3v6h6"/></svg>' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M6 8.4v7.2M8 6.7l7.6 4M8 17.3l7.6-4"/></svg>' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>';
    app.innerHTML =
      '<div class="problem-page">' +
      '<div class="ide-activitybar">' + actIcons + "</div>" +
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
      '<span class="file-tab active"><span class="ft-icon ' + ftIconClass(fileNameFor(p)) + '"></span>' + fileNameFor(p) + '<span class="ft-x">×</span></span>' +
      ghostTabsFor(p) +
      '<div class="file-tabs-right">' +
      '<button class="link-btn" id="btn-reset" title="Reset code to starter">Reset Code</button>' +
      '<span class="ft-sep"></span>' +
      '<span class="ft-note">AI Assistant</span><span class="ft-note">Preview</span><span class="ft-note">Test Case</span>' +
      "</div></div>" +
      '<div id="editor-container"></div>' +
      '<div class="bottom-panel">' +
      '<div class="bp-tabs"><span class="bp-tab">Problems</span><span class="bp-tab">Output</span><span class="bp-tab">Debug Console</span><span class="bp-tab active">Terminal</span><span class="bp-tab">Ports</span>' +
      '<span class="bp-right"><span class="bp-npm">&#8984;npm</span> + &#8943; &#10005;</span></div>' +
      '<div class="bp-body">' +
      '<div class="term-log" id="term-log">' + initialTermLines(p) + "</div>" +
      '<div class="results-panel" id="results-panel" style="display:none"></div>' +
      "</div></div>" +
      '<div class="editor-footer">' +
      '<span class="left-note">Line: 1, Col: 1</span>' +
      '<span class="lang-note">' + langLabel(p) + '</span>' +
      '<button class="btn btn-outline" id="btn-run">Run Code</button>' +
      '<button class="btn btn-green" id="btn-submit">Submit Code</button>' +
      "</div></div>" +
      (isFrontend(p)
        ? '<div class="preview-col">' +
          '<div class="preview-chrome"><span class="pc-arrows">&lsaquo; &rsaquo;</span>' +
          '<button class="pc-reload" id="btn-preview" title="Reload preview">&#10227;</button>' +
          '<span class="pc-url">https://localhost:8000/</span></div>' +
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

  function mountEditor(p) {
    var container = document.getElementById("editor-container");
    var initial = savedCode(p.slug) || p.starter;
    if (editor && editor.dispose) { try { editor.dispose(); } catch (e) {} }
    editor = null;
    loadMonaco().then(function (monaco) {
      // route may have changed while Monaco loaded
      if (currentSlug !== p.slug || !document.getElementById("editor-container")) return;
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
      });
      editor.onDidChangeModelContent(function () {
        saveCode(p.slug, editor.getValue());
      });
      editor.onDidChangeCursorPosition(function (e) {
        var note = document.querySelector(".editor-footer .left-note");
        if (note) note.textContent = "Line: " + e.position.lineNumber + ", Col: " + e.position.column;
      });
    }).catch(function () {
      // CDN blocked — fall back to a plain textarea so practice still works
      container.innerHTML = '<textarea id="fallback-editor" style="width:100%;height:100%;border:0;outline:none;padding:14px;font-family:var(--mono);font-size:14px;resize:none">' + esc(initial) + "</textarea>";
      var ta = document.getElementById("fallback-editor");
      ta.addEventListener("input", function () { saveCode(p.slug, ta.value); });
      editor = { getValue: function () { return ta.value; }, setValue: function (v) { ta.value = v; } };
    });
  }

  /* ---------- worker runner ---------- */
  function workerSource() {
    return (
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

  function execute(code, fn, cases, cb) {
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
      if (done) return;
      done = true;
      clearTimeout(timer);
      w.terminate();
      URL.revokeObjectURL(url);
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
    panel.style.display = "block";
    panel.innerHTML = '<div class="results-banner"><div><span class="spinner"></span>' + (isSubmit ? "Running all tests…" : "Running sample tests…") + "</div></div>";
    termLog("[1] Compiling...");
    var token = ++runToken;
    var runId = ++fe.runId;

    fe.cb = function (data) {
      if (token !== runToken || currentSlug !== p.slug) return;
      if (data.compileError) {
        termLog("[1] webpack compiled with 1 error", "err");
        showBanner(panel, "error", "Compilation error", "");
        panel.innerHTML += '<div class="tc-detail"><h5>Error</h5><pre class="bad">' + esc(data.compileError) + "</pre></div>";
        return;
      }
      termLog("[1] Compiled successfully!");
      termLog("[1] webpack compiled successfully");
      var results = tests.map(function (t, i) {
        var r = data.results[i];
        return { t: t, r: r, passed: r.ok, idx: i };
      });
      var passCount = results.filter(function (x) { return x.passed; }).length;
      var allPass = passCount === results.length;

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
      html += '<h5>Failure</h5><pre class="bad">' + esc(x.r.error || "Failed") + "</pre>";
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
    panel.style.display = "block";
    panel.innerHTML = '<div class="results-banner"><div><span class="spinner"></span>' + (isSubmit ? "Running all test cases…" : "Running sample test cases…") + "</div></div>";
    termLog("$ node " + fileNameFor(p));
    var token = ++runToken;

    execute(code, p.fn, cases, function (data) {
      if (token !== runToken || currentSlug !== p.slug) return; // stale
      if (data.timeout) {
        termLog("Terminated: time limit exceeded (10s)", "err");
        showBanner(panel, "error", "Time limit exceeded", "Your code ran for more than 10 seconds. Check for infinite loops or an inefficient approach (see the hint in the statement).");
        return;
      }
      if (data.compileError) {
        termLog("SyntaxError: compilation failed", "err");
        showBanner(panel, "error", "Compilation error", "");
        panel.innerHTML += '<div class="tc-detail"><h5>Error</h5><pre class="bad">' + esc(data.compileError) + "</pre></div>";
        return;
      }
      var results = cases.map(function (c, i) {
        var r = data.results[i];
        var passed = r.ok && deepEqual(r.out, c.expected);
        return { c: c, r: r, passed: passed, idx: i };
      });
      lastResults = { results: results, isSubmit: isSubmit };
      var passCount = results.filter(function (x) { return x.passed; }).length;
      var allPass = passCount === results.length;
      termLog(passCount + "/" + results.length + " test cases passed", allPass ? "" : "err");

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
    });
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
    html += "<h5>Expected Output</h5><pre>" + esc(fmt(x.c.expected)) + "</pre>";
    if (x.r.ok) {
      html += '<h5>Your Output (stdout)</h5><pre class="' + (x.passed ? "" : "bad") + '">' + esc(fmt(x.r.out)) + "</pre>";
    } else {
      html += '<h5>Runtime Error</h5><pre class="bad">' + esc(x.r.error) + "</pre>";
    }
    html += '<h5>Execution Time</h5><pre>' + x.r.ms + " ms</pre>";
    d.innerHTML = html;
  }

  route();
})();
