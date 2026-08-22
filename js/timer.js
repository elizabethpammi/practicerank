/* PracticeRank — global timer system.
   Self-contained feature module in the js/custom-input.js mold.

   Three responsibilities:
   1. Per-problem countdown timer (presets 15/30/45/60/90 min + custom),
      persistent across refresh via localStorage, amber at 25% remaining,
      red at 10%, optional hard-stop that locks the editor at 0:00 (soft
      mode just keeps counting into overtime and records it).
   2. Session mode — pick N problems + a total time budget; one countdown
      spans the whole set with per-problem splits recorded as you advance.
   3. Results — per-run history (time used, pass/fail, overtime) stored in
      localStorage; session results screen at #/session/results.

   Other modules (debugging, system design) reuse the same engine through
   window.PR_TIMER.mount(container, opts). */
(function () {
  "use strict";

  var TICK_MS = 500;
  var PRESETS = [15, 30, 45, 60, 90];
  var HISTORY_KEY = "pr-timer-history"; // per-problem submit records
  var SESSION_KEY = "pr-session-active";
  var SESSION_HISTORY_KEY = "pr-session-history";
  var MAX_HISTORY = 200;

  function bridge() { return window.PR_APP || null; }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function lsGet(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function lsSet(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
  }
  function lsDel(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  function fmtClock(ms) {
    var neg = ms < 0;
    var s = Math.floor(Math.abs(ms) / 1000);
    var m = Math.floor(s / 60);
    var ss = s % 60;
    var h = Math.floor(m / 60);
    var body;
    if (h > 0) body = h + ":" + String(m % 60).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    else body = String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    return (neg ? "-" : "") + body;
  }
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  /* =====================================================================
     Timer engine — one instance per mounted widget. All state persists
     under a caller-supplied key so a refresh resumes exactly where the
     clock was (endsAt is absolute wall time while running).
     ===================================================================== */
  function createTimer(container, opts) {
    // opts: { key, defaultMin, label, hardDefault, onExpire(), onOvertime(), compact }
    var storeKey = "pr-ptimer-" + opts.key;
    var st = lsGet(storeKey, null);
    if (!st || typeof st.totalMs !== "number") {
      st = {
        totalMs: (opts.defaultMin || 30) * 60000,
        remainingMs: (opts.defaultMin || 30) * 60000,
        running: false,
        endsAt: null,
        hard: !!opts.hardDefault,
        expiredFired: false,
        startedAt: null,
        usedBeforePauseMs: 0,
      };
    }
    var intervalId = null;
    var dead = false;

    function save() { lsSet(storeKey, st); }

    function remaining() {
      if (st.running && st.endsAt) return st.endsAt - Date.now();
      return st.remainingMs;
    }
    function usedMs() {
      return st.totalMs - remaining();
    }

    function stateClass(rem) {
      if (rem <= 0) return "pr-timer--overtime";
      if (rem <= st.totalMs * 0.10) return "pr-timer--danger";
      if (rem <= st.totalMs * 0.25) return "pr-timer--warn";
      return "";
    }

    function lockEditor() {
      var B = bridge();
      if (B && B.setEditorReadOnly) B.setEditorReadOnly(true);
      var ed = document.getElementById("editor-container");
      if (ed && !document.getElementById("pr-hardstop-overlay")) {
        var ov = document.createElement("div");
        ov.id = "pr-hardstop-overlay";
        ov.className = "pr-hardstop";
        ov.innerHTML =
          '<div class="pr-hardstop-card"><h3>Time&rsquo;s up</h3>' +
          "<p>Hard-stop mode locked the editor at 0:00, like a proctored assessment. Review what you have, then unlock to keep practicing.</p>" +
          '<button class="btn btn-outline" id="pr-hardstop-unlock">Unlock editor</button></div>';
        ed.parentNode.insertBefore(ov, ed.nextSibling);
        document.getElementById("pr-hardstop-unlock").onclick = function () {
          unlockEditor();
          st.hard = false;
          save();
          render();
        };
      }
    }
    function unlockEditor() {
      var B = bridge();
      if (B && B.setEditorReadOnly) B.setEditorReadOnly(false);
      var ov = document.getElementById("pr-hardstop-overlay");
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    }

    function onZeroCrossed() {
      if (st.expiredFired) return;
      st.expiredFired = true;
      save();
      var B = bridge();
      if (B) B.dbgEvent("Timer expired — " + opts.key + (st.hard ? " (hard stop)" : " (soft, overtime)"));
      if (st.hard) {
        pause();
        st.remainingMs = 0;
        save();
        lockEditor();
      }
      if (opts.onExpire) opts.onExpire();
    }

    function tick() {
      if (dead) return;
      var rem = remaining();
      if (st.running && rem <= 0) onZeroCrossed();
      render();
    }

    function start() {
      if (st.running) return;
      st.running = true;
      st.endsAt = Date.now() + st.remainingMs;
      if (!st.startedAt) st.startedAt = Date.now();
      save();
      render();
    }
    function pause() {
      if (!st.running) return;
      st.remainingMs = st.endsAt - Date.now();
      st.running = false;
      st.endsAt = null;
      save();
      render();
    }
    function reset(totalMs) {
      if (typeof totalMs === "number") st.totalMs = totalMs;
      st.remainingMs = st.totalMs;
      st.running = false;
      st.endsAt = null;
      st.expiredFired = false;
      st.startedAt = null;
      save();
      unlockEditor();
      render();
    }

    function presetOptions() {
      var cur = Math.round(st.totalMs / 60000);
      var opts2 = PRESETS.map(function (m) {
        return '<option value="' + m + '"' + (m === cur ? " selected" : "") + ">" + m + " min</option>";
      });
      if (PRESETS.indexOf(cur) === -1) opts2.push('<option value="' + cur + '" selected>' + cur + " min</option>");
      opts2.push('<option value="custom">Custom…</option>');
      return opts2.join("");
    }

    function render() {
      if (dead || !container.isConnected) return;
      var rem = remaining();
      var disp = container.querySelector(".pr-timer-display");
      if (!disp) {
        container.innerHTML =
          '<div class="pr-timer ' + (opts.compact ? "pr-timer--compact " : "") + '">' +
          (opts.label ? '<span class="pr-timer-label">' + esc(opts.label) + "</span>" : "") +
          '<span class="pr-timer-display" title="Time remaining">' + fmtClock(rem) + "</span>" +
          '<select class="pr-timer-preset" title="Timer length">' + presetOptions() + "</select>" +
          '<button class="pr-timer-btn pr-timer-startpause"></button>' +
          '<button class="pr-timer-btn pr-timer-reset" title="Reset the clock">Reset</button>' +
          '<label class="pr-timer-hard" title="Lock the editor at 0:00, like a real proctored assessment">' +
          '<input type="checkbox" class="pr-timer-hard-cb"' + (st.hard ? " checked" : "") + "> Hard stop</label>" +
          "</div>";
        container.querySelector(".pr-timer-startpause").onclick = function () {
          st.running ? pause() : start();
        };
        container.querySelector(".pr-timer-reset").onclick = function () { reset(); };
        container.querySelector(".pr-timer-preset").onchange = function () {
          if (this.value === "custom") {
            var v = prompt("Timer length in minutes:", String(Math.round(st.totalMs / 60000)));
            var n = parseInt(v, 10);
            if (!isNaN(n) && n > 0 && n <= 600) reset(n * 60000);
            else render();
          } else {
            reset(parseInt(this.value, 10) * 60000);
          }
        };
        container.querySelector(".pr-timer-hard-cb").onchange = function () {
          st.hard = this.checked;
          save();
          if (!st.hard) unlockEditor();
        };
        disp = container.querySelector(".pr-timer-display");
      }
      var box = container.querySelector(".pr-timer");
      box.className = box.className.replace(/\s*pr-timer--(warn|danger|overtime)/g, "");
      var sc = stateClass(rem);
      if (sc) box.classList.add(sc);
      disp.textContent = fmtClock(rem);
      var sp = container.querySelector(".pr-timer-startpause");
      sp.textContent = st.running ? "Pause" : (usedMs() > 500 ? "Resume" : "Start");
      sp.classList.toggle("pr-timer-btn--running", st.running);
      var sel = container.querySelector(".pr-timer-preset");
      if (sel) sel.disabled = st.running;
    }

    render();
    intervalId = setInterval(tick, TICK_MS);

    return {
      start: start,
      pause: pause,
      reset: reset,
      usedMs: usedMs,
      remainingMs: remaining,
      isOvertime: function () { return remaining() < 0 || (st.expiredFired && remaining() <= 0); },
      isExpired: function () { return st.expiredFired; },
      state: function () { return st; },
      clearStore: function () { lsDel(storeKey); },
      destroy: function () {
        dead = true;
        clearInterval(intervalId);
        unlockEditor();
      },
    };
  }

  /* =====================================================================
     Per-problem timer — mounts a strip under the file tabs on every
     problem page (and stays out of the way until started).
     ===================================================================== */
  var activeTimer = null;
  var activeSlug = null;

  function mountProblemTimer(slug) {
    if (activeTimer) { activeTimer.destroy(); activeTimer = null; }
    activeSlug = slug;
    var tabs = document.querySelector(".problem-right .file-tabs");
    if (!tabs) return;
    var bar = document.createElement("div");
    bar.className = "pr-timer-bar";
    bar.id = "pr-timer-bar";
    tabs.parentNode.insertBefore(bar, tabs.nextSibling);
    activeTimer = createTimer(bar, {
      key: "problem-" + slug,
      defaultMin: 30,
      label: "Problem timer",
    });
  }

  function recordRun(detail) {
    // Only submits count as attempts worth keeping.
    if (!detail.isSubmit) return;
    var hist = lsGet(HISTORY_KEY, []);
    var entry = {
      slug: detail.slug,
      date: new Date().toISOString(),
      passed: detail.allPass,
      testsPassed: detail.passed,
      testsTotal: detail.total,
      timeUsedMs: activeTimer && activeSlug === detail.slug ? activeTimer.usedMs() : null,
      overtime: activeTimer && activeSlug === detail.slug ? activeTimer.isOvertime() : false,
    };
    hist.push(entry);
    if (hist.length > MAX_HISTORY) hist = hist.slice(hist.length - MAX_HISTORY);
    lsSet(HISTORY_KEY, hist);
  }

  window.addEventListener("pr:problem-rendered", function (e) {
    mountProblemTimer(e.detail.slug);
    var sess = lsGet(SESSION_KEY, null);
    if (sess) renderSessionBar(sess);
  });
  window.addEventListener("pr:run-result", function (e) {
    recordRun(e.detail);
    var sess = lsGet(SESSION_KEY, null);
    if (sess && e.detail.isSubmit) {
      var cur = sess.slugs[sess.idx];
      if (cur === e.detail.slug) {
        sess.lastResult = { slug: cur, allPass: e.detail.allPass, passed: e.detail.passed, total: e.detail.total };
        lsSet(SESSION_KEY, sess);
        if (e.detail.allPass) {
          // brief beat so the Congratulations banner registers, then advance
          setTimeout(function () {
            var s2 = lsGet(SESSION_KEY, null);
            if (s2 && s2.slugs[s2.idx] === cur) sessionAdvance(s2, true);
          }, 1200);
        } else {
          renderSessionBar(sess);
        }
      }
    }
  });

  /* =====================================================================
     Session mode — ZipRecruiter-style: N problems, one budget.
     ===================================================================== */
  function problems() {
    var B = bridge();
    return (B && B.problems) || [];
  }
  function problemName(slug) {
    var p = problems().find(function (x) { return x.slug === slug; });
    return p ? p.name : slug;
  }

  function sessionStart(slugs, budgetMin) {
    var sess = {
      slugs: slugs,
      budgetMs: budgetMin * 60000,
      startedAt: Date.now(),
      perStart: Date.now(),
      idx: 0,
      splits: [],
      lastResult: null,
    };
    lsSet(SESSION_KEY, sess);
    location.hash = "#/problem/" + slugs[0];
    // problem-rendered event mounts the bar; render immediately too in case
    // we were already on that problem's page.
    renderSessionBar(sess);
  }

  function sessionAdvance(sess, fromPass) {
    var cur = sess.slugs[sess.idx];
    var lr = sess.lastResult && sess.lastResult.slug === cur ? sess.lastResult : null;
    sess.splits.push({
      slug: cur,
      ms: Date.now() - sess.perStart,
      passed: fromPass ? true : !!(lr && lr.allPass),
      testsPassed: lr ? lr.passed : null,
      testsTotal: lr ? lr.total : null,
    });
    sess.lastResult = null;
    sess.idx++;
    if (sess.idx >= sess.slugs.length) {
      sessionFinish(sess);
      return;
    }
    sess.perStart = Date.now();
    lsSet(SESSION_KEY, sess);
    location.hash = "#/problem/" + sess.slugs[sess.idx];
  }

  function sessionFinish(sess) {
    var totalUsed = Date.now() - sess.startedAt;
    var record = {
      date: new Date().toISOString(),
      budgetMs: sess.budgetMs,
      usedMs: totalUsed,
      overtime: totalUsed > sess.budgetMs,
      splits: sess.splits,
    };
    var hist = lsGet(SESSION_HISTORY_KEY, []);
    hist.push(record);
    if (hist.length > 50) hist = hist.slice(hist.length - 50);
    lsSet(SESSION_HISTORY_KEY, hist);
    lsDel(SESSION_KEY);
    removeSessionBar();
    location.hash = "#/session/results";
  }

  function sessionAbort() {
    lsDel(SESSION_KEY);
    removeSessionBar();
  }

  var sessionInterval = null;
  function removeSessionBar() {
    var el = document.getElementById("pr-session-bar");
    if (el) el.parentNode.removeChild(el);
    document.body.classList.remove("pr-session-on");
    if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
  }

  function renderSessionBar(sess) {
    removeSessionBar();
    var bar = document.createElement("div");
    bar.id = "pr-session-bar";
    bar.className = "pr-session-bar";
    document.body.classList.add("pr-session-on");
    var header = document.querySelector(".hr-header");
    header.parentNode.insertBefore(bar, header.nextSibling);

    function paint() {
      var s = lsGet(SESSION_KEY, null);
      if (!s) { removeSessionBar(); return; }
      var rem = s.budgetMs - (Date.now() - s.startedAt);
      var cls = rem <= 0 ? "pr-session--overtime" : rem <= s.budgetMs * 0.10 ? "pr-session--danger" : rem <= s.budgetMs * 0.25 ? "pr-session--warn" : "";
      bar.className = "pr-session-bar " + cls;
      bar.innerHTML =
        '<span class="pr-session-tag">Timed session</span>' +
        '<span class="pr-session-pos">Problem ' + (s.idx + 1) + " / " + s.slugs.length + " &middot; " + esc(problemName(s.slugs[s.idx])) + "</span>" +
        '<span class="pr-session-clock" title="Total time remaining">' + fmtClock(rem) + "</span>" +
        '<span class="pr-session-spacer"></span>' +
        '<button class="pr-timer-btn" id="pr-session-skip" title="Record this problem\'s split and move on">' +
        (s.idx === s.slugs.length - 1 ? "Finish session" : "Next problem &rsaquo;") + "</button>" +
        '<button class="pr-timer-btn pr-timer-btn--quiet" id="pr-session-abort" title="Abandon the session (no results saved)">End</button>';
      document.getElementById("pr-session-skip").onclick = function () {
        var s2 = lsGet(SESSION_KEY, null);
        if (s2) sessionAdvance(s2, false);
      };
      document.getElementById("pr-session-abort").onclick = function () {
        if (confirm("End this session without saving results?")) sessionAbort();
      };
    }
    paint();
    sessionInterval = setInterval(function () {
      var s = lsGet(SESSION_KEY, null);
      if (!s) { removeSessionBar(); return; }
      var clock = bar.querySelector(".pr-session-clock");
      var rem = s.budgetMs - (Date.now() - s.startedAt);
      if (clock) clock.textContent = fmtClock(rem);
      var cls = rem <= 0 ? "pr-session--overtime" : rem <= s.budgetMs * 0.10 ? "pr-session--danger" : rem <= s.budgetMs * 0.25 ? "pr-session--warn" : "";
      bar.className = "pr-session-bar " + cls;
    }, TICK_MS);
  }

  /* ---------- session setup UI (dashboard section) ---------- */
  function dashSection(dash) {
    if (!dash) return;
    var sec = document.createElement("div");
    sec.className = "pr-session-setup";
    var hist = lsGet(SESSION_HISTORY_KEY, []);
    sec.innerHTML =
      '<div class="track-head"><h2>Timed Session</h2>' +
      (hist.length ? '<a class="track-progress" href="#/session/results">' + hist.length + " past session" + (hist.length === 1 ? "" : "s") + " &rsaquo;</a>" : "") +
      "</div>" +
      '<div class="challenge-card pr-session-card">' +
      '<div class="challenge-info">' +
      '<div class="challenge-name">Assessment simulation</div>' +
      '<div class="challenge-meta"><span class="sub-tag">Pick problems &middot; one clock spans the set &middot; splits recorded</span></div>' +
      '<div class="pr-session-config" id="pr-session-config" hidden>' +
      '<div class="pr-session-picker" id="pr-session-picker"></div>' +
      '<div class="pr-session-controls">' +
      '<label>Total budget <input type="number" id="pr-session-min" value="40" min="5" max="480" step="5"> min</label>' +
      '<button class="btn btn-green" id="pr-session-go" disabled>Start session</button>' +
      "</div></div></div>" +
      '<button class="btn btn-outline" id="pr-session-open">Set up a session</button>' +
      "</div>";
    dash.appendChild(sec);

    var openBtn = sec.querySelector("#pr-session-open");
    openBtn.onclick = function () {
      var cfg = sec.querySelector("#pr-session-config");
      if (!cfg.hidden) { cfg.hidden = true; openBtn.textContent = "Set up a session"; return; }
      cfg.hidden = false;
      openBtn.textContent = "Hide setup";
      var picker = sec.querySelector("#pr-session-picker");
      if (picker.childNodes.length) return;
      var cats = [];
      problems().forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });
      var html = "";
      cats.forEach(function (cat) {
        html += '<div class="pr-session-cat">' + esc(cat) + "</div>";
        problems().filter(function (p) { return p.category === cat; }).forEach(function (p) {
          html += '<label class="pr-session-item"><input type="checkbox" value="' + p.slug + '"> ' + esc(p.name) +
            ' <span class="diff-' + p.difficulty.toLowerCase() + '">' + p.difficulty + "</span></label>";
        });
      });
      picker.innerHTML = html;
      picker.addEventListener("change", function () {
        var n = picker.querySelectorAll("input:checked").length;
        var go = sec.querySelector("#pr-session-go");
        go.disabled = n === 0;
        go.textContent = n === 0 ? "Start session" : "Start session (" + n + " problem" + (n === 1 ? "" : "s") + ")";
      });
    };
    sec.querySelector("#pr-session-go").onclick = function () {
      var slugs = Array.prototype.slice
        .call(sec.querySelectorAll("#pr-session-picker input:checked"))
        .map(function (cb) { return cb.value; });
      var min = parseInt(sec.querySelector("#pr-session-min").value, 10) || 40;
      if (!slugs.length) return;
      sessionStart(slugs, min);
    };
  }

  /* ---------- results screen ---------- */
  function renderResults() {
    document.title = "Session Results | Practice Playground";
    var app = document.getElementById("app");
    var hist = lsGet(SESSION_HISTORY_KEY, []);
    var html = '<div class="dash"><div class="qd-cap"><span>Timed Sessions</span><a href="#/">&lsaquo; All challenges</a></div><h1>Session results</h1>';
    if (!hist.length) {
      html += '<p class="dash-sub">No completed sessions yet. Set one up from the dashboard.</p></div>';
      app.innerHTML = html;
      return true;
    }
    hist.slice().reverse().forEach(function (rec, ri) {
      var solved = rec.splits.filter(function (s) { return s.passed; }).length;
      html +=
        '<div class="pr-sess-result' + (ri === 0 ? " pr-sess-result--latest" : "") + '">' +
        '<div class="pr-sess-result-head">' +
        "<b>" + new Date(rec.date).toLocaleString() + "</b>" +
        "<span>" + solved + " / " + rec.splits.length + " solved</span>" +
        "<span>Used " + fmtClock(rec.usedMs) + " of " + fmtClock(rec.budgetMs) +
        (rec.overtime ? ' <span class="pr-flag-overtime">OVERTIME</span>' : "") + "</span>" +
        "</div>" +
        '<table class="pr-sess-table"><thead><tr><th>Problem</th><th>Time</th><th>Result</th></tr></thead><tbody>';
      rec.splits.forEach(function (s) {
        html +=
          "<tr><td>" + esc(problemName(s.slug)) + "</td>" +
          "<td>" + fmtClock(s.ms) + "</td>" +
          "<td>" + (s.passed
            ? '<span class="tc-pass">✔ Passed</span>'
            : '<span class="tc-fail">✘ ' + (s.testsTotal != null ? s.testsPassed + "/" + s.testsTotal + " tests" : "Not solved") + "</span>") +
          "</td></tr>";
      });
      html += "</tbody></table></div>";
    });
    html += "</div>";
    app.innerHTML = html;
    window.scrollTo(0, 0);
    return true;
  }

  window.PR_EXT_ROUTES = window.PR_EXT_ROUTES || [];
  window.PR_EXT_ROUTES.push(function (h) {
    if (h === "#/session/results") return renderResults();
    return false;
  });
  window.PR_DASH_SECTIONS = window.PR_DASH_SECTIONS || [];
  window.PR_DASH_SECTIONS.push({ tab: "sessions", render: dashSection });

  // Resume an in-flight session bar on plain page load (e.g. dashboard).
  document.addEventListener("DOMContentLoaded", function () {
    var sess = lsGet(SESSION_KEY, null);
    if (sess) renderSessionBar(sess);
  });

  // Public engine for the debugging + system design modules.
  window.PR_TIMER = {
    mount: createTimer,
    fmtClock: fmtClock,
    history: function () { return lsGet(HISTORY_KEY, []); },
  };
})();
