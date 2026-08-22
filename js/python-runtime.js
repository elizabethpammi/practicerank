/* PracticeRank — Python runtime (Pyodide in a dedicated Web Worker).
 *
 * Lazy: nothing is downloaded until the first Python run. The worker
 * importScripts() Pyodide from jsDelivr (~10 MB, cached by the browser after
 * the first load), execs the user's code under the filename "solution.py"
 * (no preamble above it, so traceback line numbers match the editor exactly),
 * calls the problem's function with JSON-encoded args, and JSON-round-trips
 * the return value back to the main thread where app.js compares it with the
 * same deepEqual used for JavaScript submissions.
 *
 * Contract (mirrors app.js execute()):
 *   PR_PY.run(code, fn, cases, cb, onLog, onStatus)
 *     cb({timeout:true} | {compileError:string} | {results:[{ok,out,error,ms}]})
 *     onLog(level, args)     — print() output / stderr, streamed live
 *     onStatus(message)      — loading-state text while Pyodide initializes
 *   PR_PY.starterFor(p)      — Python starter stub derived from the JS starter
 *   PR_PY.isEligible(p)      — true for worker-graded (algo) problems
 */
(function () {
  "use strict";

  var PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/";
  var RUN_TIMEOUT_MS = 10000; // per run, matches the JS worker
  var INIT_TIMEOUT_MS = 120000; // first download on slow hotel wifi

  var worker = null;
  var ready = false;
  var initCallbacks = []; // queued while Pyodide loads
  var initFailed = null; // sticky init error message
  var runSeq = 0;
  var active = null; // { id, cb, onLog, timer }

  /* The Python harness keeps user code isolated in its own namespace and
     trims its own frames out of tracebacks, so what the user sees starts at
     solution.py with the correct line number. */
  var PY_HARNESS = [
    "import json, sys, traceback",
    "",
    "_PR_FILE = 'solution.py'",
    "_pr_ns = None",
    "",
    "def _pr_fmt_exc():",
    "    etype, evalue, tb = sys.exc_info()",
    "    frames = traceback.extract_tb(tb)",
    "    start = 0",
    "    for i, fr in enumerate(frames):",
    "        if fr.filename == _PR_FILE:",
    "            start = i",
    "            break",
    "    lines = ['Traceback (most recent call last):\\n']",
    "    lines += traceback.format_list(frames[start:])",
    "    lines += traceback.format_exception_only(etype, evalue)",
    "    return ''.join(lines)",
    "",
    "def pr_exec(code):",
    "    global _pr_ns",
    "    _pr_ns = None",
    "    ns = {'__name__': '__main__'}",
    "    try:",
    "        exec(compile(code, _PR_FILE, 'exec'), ns)",
    "    except SyntaxError:",
    "        return ''.join(traceback.format_exception_only(*sys.exc_info()[:2]))",
    "    except Exception:",
    "        return _pr_fmt_exc()",
    "    _pr_ns = ns",
    "    return ''",
    "",
    "def pr_has(fn_name):",
    "    return _pr_ns is not None and callable(_pr_ns.get(fn_name))",
    "",
    "def pr_call(fn_name, args_json):",
    "    try:",
    "        out = _pr_ns[fn_name](*json.loads(args_json))",
    "    except Exception:",
    "        return json.dumps({'ok': False, 'error': _pr_fmt_exc()})",
    "    try:",
    "        return json.dumps({'ok': True, 'out': out})",
    "    except (TypeError, ValueError):",
    "        return json.dumps({'ok': False, 'error': 'Return value is not JSON-serializable: ' + repr(out)[:400]})",
    "",
  ].join("\n");

  function workerSource() {
    return (
      "var PY_BASE = " + JSON.stringify(PYODIDE_BASE) + ";\n" +
      "var HARNESS = " + JSON.stringify(PY_HARNESS) + ";\n" +
      "var py = null;\n" +
      "function log(level, text) { try { self.postMessage({ log: { level: level, args: [text] } }); } catch (e) {} }\n" +
      "importScripts(PY_BASE + 'pyodide.js');\n" +
      "loadPyodide({ indexURL: PY_BASE }).then(function (p) {\n" +
      "  py = p;\n" +
      "  py.setStdout({ batched: function (s) { log('log', s); } });\n" +
      "  py.setStderr({ batched: function (s) { log('error', s); } });\n" +
      "  py.runPython(HARNESS);\n" +
      "  self.postMessage({ ready: true, version: py.version });\n" +
      "}).catch(function (err) {\n" +
      "  self.postMessage({ initError: String(err && err.message || err) });\n" +
      "});\n" +
      "self.onmessage = function (e) {\n" +
      "  var d = e.data || {};\n" +
      "  if (!d.run || !py) return;\n" +
      "  var id = d.run.id, fn = d.run.fn, cases = d.run.cases;\n" +
      "  var prExec = py.globals.get('pr_exec');\n" +
      "  var prHas = py.globals.get('pr_has');\n" +
      "  var prCall = py.globals.get('pr_call');\n" +
      "  var err;\n" +
      "  try { err = prExec(d.run.code); } catch (ex) { err = String(ex && ex.message || ex); }\n" +
      "  if (err) { self.postMessage({ id: id, compileError: err }); return; }\n" +
      "  if (!prHas(fn)) {\n" +
      "    self.postMessage({ id: id, compileError: 'Function ' + fn + '(...) not found. Do not rename the starter function.' });\n" +
      "    return;\n" +
      "  }\n" +
      "  var results = [];\n" +
      "  for (var i = 0; i < cases.length; i++) {\n" +
      "    var t0 = Date.now();\n" +
      "    var r;\n" +
      "    try { r = JSON.parse(prCall(fn, JSON.stringify(cases[i].args))); }\n" +
      "    catch (ex) { r = { ok: false, error: String(ex && ex.message || ex) }; }\n" +
      "    r.ms = Date.now() - t0;\n" +
      "    if (r.ok && r.out === undefined) r.out = null;\n" +
      "    results.push(r);\n" +
      "  }\n" +
      "  self.postMessage({ id: id, results: results });\n" +
      "};\n"
    );
  }

  function killWorker() {
    if (worker) { try { worker.terminate(); } catch (e) {} }
    worker = null;
    ready = false;
    if (active && active.timer) clearTimeout(active.timer);
    active = null;
  }

  function ensure(cb) {
    if (ready) return cb(null);
    if (initFailed) return cb(initFailed);
    initCallbacks.push(cb);
    if (worker) return; // already loading
    var blob = new Blob([workerSource()], { type: "application/javascript" });
    var url = URL.createObjectURL(blob);
    worker = new Worker(url);
    var initTimer = setTimeout(function () {
      flushInit("Python runtime took too long to load. Check your connection and try again.");
      killWorker();
    }, INIT_TIMEOUT_MS);
    function flushInit(err) {
      clearTimeout(initTimer);
      var cbs = initCallbacks;
      initCallbacks = [];
      cbs.forEach(function (f) { f(err || null); });
    }
    worker.onmessage = function (e) {
      var d = e.data || {};
      if (d.ready) {
        ready = true;
        URL.revokeObjectURL(url);
        flushInit(null);
        return;
      }
      if (d.initError) {
        URL.revokeObjectURL(url);
        flushInit("Python runtime failed to load: " + d.initError);
        killWorker();
        return;
      }
      if (d.log) {
        if (active && active.onLog) active.onLog(d.log.level, d.log.args);
        return;
      }
      if (active && d.id === active.id) {
        clearTimeout(active.timer);
        var cb2 = active.cb;
        active = null;
        cb2(d.compileError ? { compileError: d.compileError } : { results: d.results });
      }
    };
    worker.onerror = function (e) {
      flushInit("Python runtime worker error: " + (e && e.message ? e.message : "unknown"));
      killWorker();
    };
  }

  function run(code, fn, cases, cb, onLog, onStatus) {
    if (!ready && onStatus) onStatus("Loading Python runtime… ~10 MB, one time");
    ensure(function (err) {
      if (err) return cb({ compileError: err });
      if (active) { clearTimeout(active.timer); active = null; } // newest run wins
      var id = ++runSeq;
      active = {
        id: id,
        cb: cb,
        onLog: onLog,
        timer: setTimeout(function () {
          // Infinite loop: the only way out is terminating the worker, which
          // throws away the loaded interpreter — the next run re-initializes.
          killWorker();
          cb({ timeout: true });
        }, RUN_TIMEOUT_MS),
      };
      worker.postMessage({ run: { id: id, code: code, fn: fn, cases: cases } });
    });
  }

  /* ---------- starters ---------- */
  function argsOf(p) {
    // Pull the parameter list off the JS starter's required function.
    var re = new RegExp("function\\s+" + p.fn + "\\s*\\(([^)]*)\\)");
    var m = re.exec(p.starter || "");
    if (!m) return "";
    return m[1].split(",").map(function (s) { return s.trim(); }).filter(Boolean).join(", ");
  }
  function starterFor(p) {
    // Same function name as JS on purpose — the grader calls p.fn directly.
    return "def " + p.fn + "(" + argsOf(p) + "):\n    # Write your code here\n    pass\n";
  }

  function isEligible(p) {
    return !!(p && p.fn && p.cases) && p.type !== "react" && p.type !== "css" && p.panel !== "react-output";
  }

  window.PR_PY = {
    run: run,
    starterFor: starterFor,
    isEligible: isEligible,
    isReady: function () { return ready; },
  };
})();
