/* PracticeRank — System Design practice (timed, staged, self-graded).
   Questions live in window.DESIGN_QUESTIONS (js/design-questions-*.js).

   Flow per question, mirroring how a real 35-45 minute design round is run:
   Stage 1 Requirements  — clarifying-questions checklist + functional/NFRs
   Stage 2 Estimation    — back-of-envelope prompts (worked numbers stay
                           hidden until reveal)
   Stage 3 High-level design
   Stage 4 Deep dives & trade-offs
   Each stage has a free-text scratchpad persisted to localStorage. Stages
   reveal progressively (you commit to one before seeing the next, exactly
   like an interviewer pacing you). At the end, the full model answer renders
   side-by-side with your notes plus a senior-vs-staff self-grading rubric.
   No grader — it's deliberate self-assessment. */
(function () {
  "use strict";

  var STAGES = [
    { id: "requirements", title: "Requirements & scope", prompt: "Ask your clarifying questions out loud (check them off below), then write the functional and non-functional requirements you are committing to. Cutting scope explicitly is a senior signal." },
    { id: "estimation", title: "Back-of-envelope estimation", prompt: "Work the numbers: traffic, storage, bandwidth, QPS peak vs average. Round aggressively — the point is orders of magnitude, not precision." },
    { id: "design", title: "High-level design", prompt: "Describe the architecture: clients, entry points, services, data stores, queues, caches. Name every arrow. Then sketch the core data model / API." },
    { id: "deepdive", title: "Deep dives & trade-offs", prompt: "Pick the two hardest sub-problems and go deep. State the bottlenecks, the failure modes, and what you would trade to scale 10x." },
  ];

  var st = null;

  function questions() { return window.DESIGN_QUESTIONS || []; }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function lsSet(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function notesKey(slug, stage) { return "pr-design-notes-" + slug + "--" + stage; }
  function progressKey(slug) { return "pr-design-progress-" + slug; }
  function reviewedSet() { return lsGet("pr-design-reviewed", []); }
  function markReviewed(slug) {
    var s = reviewedSet();
    if (s.indexOf(slug) === -1) { s.push(slug); lsSet("pr-design-reviewed", s); }
  }

  function ul(items) {
    return "<ul>" + items.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
  }
  function checklist(slug, id, items) {
    var saved = lsGet("pr-design-checks-" + slug + "--" + id, {});
    return '<div class="dsg-checklist" data-cl="' + id + '">' + items.map(function (x, i) {
      return '<label class="dsg-check"><input type="checkbox" data-i="' + i + '"' + (saved[i] ? " checked" : "") + "> <span>" + x + "</span></label>";
    }).join("") + "</div>";
  }

  function stageBlock(q, si, unlocked, revealed) {
    var s = STAGES[si];
    var notes = lsGet(notesKey(q.slug, s.id), "");
    var html = '<div class="dsg-stage' + (unlocked ? "" : " dsg-stage--locked") + '" id="dsg-stage-' + si + '">' +
      '<div class="dsg-stage-head"><span class="dsg-stage-n">Stage ' + (si + 1) + "</span><h3>" + s.title + "</h3></div>";
    if (!unlocked) {
      html += '<p class="dsg-locked-note">🔒 Finish the previous stage first — commit before you peek ahead.</p></div>';
      return html;
    }
    html += '<p class="dsg-prompt">' + s.prompt + "</p>";
    if (s.id === "requirements") {
      html += '<div class="dsg-sub">Clarifying questions worth asking</div>' + checklist(q.slug, "clarifying", q.clarifying);
    }
    if (s.id === "estimation") {
      html += '<div class="dsg-sub">Estimate these</div>' + ul(q.estimation.prompts);
    }
    html += '<textarea class="dsg-pad" data-stage="' + s.id + '" placeholder="Your notes for this stage — talk on paper like you would out loud…">' + esc(notes) + "</textarea>";
    if (!revealed && si < STAGES.length - 1) {
      html += '<button class="btn btn-outline dsg-next" data-si="' + si + '">Commit &amp; open stage ' + (si + 2) + " &rsaquo;</button>";
    }
    if (!revealed && si === STAGES.length - 1) {
      html += '<button class="btn btn-green dsg-reveal">Reveal model answer &amp; grade yourself</button>';
    }
    html += "</div>";
    return html;
  }

  function modelAnswerHTML(q) {
    var m = q.model;
    function block(title, body, yourStage) {
      var notes = yourStage ? lsGet(notesKey(q.slug, yourStage), "") : "";
      return '<div class="dsg-model-block">' +
        "<h3>" + title + "</h3>" +
        '<div class="dsg-model-cols">' +
        '<div class="dsg-model-answer">' + body + "</div>" +
        (yourStage
          ? '<div class="dsg-model-yours"><div class="dsg-sub">Your notes</div><pre>' + (notes ? esc(notes) : "<i>(you wrote nothing for this stage)</i>") + "</pre></div>"
          : "") +
        "</div></div>";
    }
    var html = '<div class="dsg-model" id="dsg-model">' +
      '<div class="qd-cap" style="margin:26px 0 4px"><span>Model answer — compare, don\'t copy</span></div>' +
      '<p class="dsg-prompt">Read each section against your own notes on the right. The rubric at the bottom is the honest part: tick only what you actually said before the reveal.</p>' +
      block("Requirements the model commits to", ul(q.functional.map(function (x) { return "<b>F.</b> " + x; }).concat(q.nonfunctional.map(function (x) { return "<b>NF.</b> " + x; }))), "requirements") +
      block("Worked estimation", q.estimation.worked, "estimation") +
      block("High-level architecture", m.highlevel, "design") +
      block("Data model &amp; APIs", m.data, null) +
      block("Deep dives", m.deepdives, "deepdive") +
      block("Bottlenecks &amp; trade-offs", m.tradeoffs, null) +
      block("Scaling story (1x &rarr; 10x &rarr; 100x)", m.scaling, null) +
      '<div class="dsg-model-block"><h3>Common follow-ups</h3>' + ul(q.followups) + "</div>" +
      '<div class="dsg-rubric"><h3>Self-grading rubric</h3>' +
      '<p class="dsg-prompt">A <b>senior</b> answer covers the left column unprompted. A <b>staff</b> answer also covers the right — quantified trade-offs, failure modes, and evolution over time.</p>' +
      '<div class="dsg-rubric-cols">' +
      '<div><div class="dsg-sub">Senior signals</div>' + checklist(q.slug, "rubric-senior", q.rubric.senior) + "</div>" +
      '<div><div class="dsg-sub">Staff signals</div>' + checklist(q.slug, "rubric-staff", q.rubric.staff) + "</div>" +
      "</div></div></div>";
    return html;
  }

  function render(q) {
    cleanup();
    document.title = q.name + " | Practice Playground";
    var app = document.getElementById("app");
    var prog = lsGet(progressKey(q.slug), { unlocked: 1, revealed: false });

    var html =
      '<div class="dsg-page">' +
      '<div class="dsg-head-row">' +
      '<div class="qd-cap"><span>System Design &middot; ' + esc(q.category) + '</span><a href="#/">&lsaquo; All challenges</a></div>' +
      "<h1>" + esc(q.name) + "</h1>" +
      '<div class="problem-badges">' +
      '<span class="diff-' + q.difficulty.toLowerCase() + '">' + q.difficulty + "</span>" +
      '<span class="max-score">' + (q.minutes || 35) + " min &middot; self-graded</span>" +
      "</div>" +
      '<div id="dsg-timer" class="dsg-timer"></div>' +
      "</div>" +
      '<div class="statement dsg-statement">' + q.statement + "</div>";

    for (var i = 0; i < STAGES.length; i++) {
      html += stageBlock(q, i, i < prog.unlocked, prog.revealed);
    }
    html += '<div id="dsg-model-slot"></div>';
    html += "</div>";
    app.innerHTML = html;

    st = { q: q, timer: null };
    st.timer = window.PR_TIMER.mount(document.getElementById("dsg-timer"), {
      key: "design-" + q.slug,
      defaultMin: q.minutes || 35,
      label: "Design clock",
      compact: true,
    });

    wire(q);
    if (prog.revealed) showModel(q, false);
    window.scrollTo(0, 0);
    return true;
  }

  function wire(q) {
    // listeners go on the freshly-rendered page root, not the persistent
    // #app element, so they die with the page instead of stacking up
    var app = document.querySelector(".dsg-page");
    if (!app) return;
    app.querySelectorAll(".dsg-pad").forEach(function (ta) {
      ta.addEventListener("input", function () {
        lsSet(notesKey(q.slug, ta.dataset.stage), ta.value);
      });
    });
    app.addEventListener("change", function (e) {
      var cb = e.target;
      if (cb.tagName !== "INPUT" || cb.type !== "checkbox") return;
      var cl = cb.closest(".dsg-checklist");
      if (!cl) return;
      var key = "pr-design-checks-" + q.slug + "--" + cl.dataset.cl;
      var saved = lsGet(key, {});
      saved[cb.dataset.i] = cb.checked;
      lsSet(key, saved);
    });
    app.addEventListener("click", function (e) {
      var next = e.target.closest(".dsg-next");
      if (next) {
        var prog = lsGet(progressKey(q.slug), { unlocked: 1, revealed: false });
        prog.unlocked = Math.max(prog.unlocked, (+next.dataset.si) + 2);
        lsSet(progressKey(q.slug), prog);
        render(q);
        var target = document.getElementById("dsg-stage-" + (+next.dataset.si + 1));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (e.target.closest(".dsg-reveal")) showModel(q, true);
    });
  }

  function showModel(q, scroll) {
    var prog = lsGet(progressKey(q.slug), { unlocked: 1, revealed: false });
    prog.revealed = true;
    prog.unlocked = STAGES.length;
    lsSet(progressKey(q.slug), prog);
    markReviewed(q.slug);
    if (st && st.timer) st.timer.pause();
    var slot = document.getElementById("dsg-model-slot");
    if (!slot) return;
    if (!slot.firstChild) slot.innerHTML = modelAnswerHTML(q);
    // remove reveal/next buttons — the run is over
    document.querySelectorAll(".dsg-reveal, .dsg-next").forEach(function (b) { b.remove(); });
    if (scroll) slot.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cleanup() {
    if (st && st.timer) st.timer.destroy();
    st = null;
  }

  /* ---------- routing + dashboard ---------- */
  window.PR_EXT_ROUTES = window.PR_EXT_ROUTES || [];
  window.PR_EXT_ROUTES.push(function (h) {
    var m = h.match(/^#\/design\/([a-z0-9-]+)/);
    if (!m) { if (st) cleanup(); return false; }
    var q = questions().find(function (x) { return x.slug === m[1]; });
    if (!q) return false;
    return render(q);
  });

  window.PR_DASH_SECTIONS = window.PR_DASH_SECTIONS || [];
  window.PR_DASH_SECTIONS.push(function (dash) {
    var list = questions();
    if (!dash || !list.length) return;
    var reviewed = reviewedSet();
    var cats = [];
    list.forEach(function (q) { if (cats.indexOf(q.category) === -1) cats.push(q.category); });
    var sec = document.createElement("div");
    var html = "";
    cats.forEach(function (cat) {
      var items = list.filter(function (q) { return q.category === cat; });
      var done = items.filter(function (q) { return reviewed.indexOf(q.slug) !== -1; }).length;
      html +=
        '<div class="track-head"><h2>' + esc(cat) + '</h2><span class="track-progress">' + done + " / " + items.length + " reviewed</span></div>";
      if (cat === cats[0]) {
        html += '<p class="dash-sub">Timed 35-minute rounds. Stages reveal progressively — requirements, estimation, design, deep dives — then the model answer appears beside your notes with a senior-vs-staff rubric.</p>';
      }
      items.forEach(function (q) {
        var isDone = reviewed.indexOf(q.slug) !== -1;
        html +=
          '<div class="challenge-card">' +
          '<div class="challenge-info">' +
          '<div class="challenge-name">' + esc(q.name) + "</div>" +
          '<div class="challenge-meta">' +
          '<span class="diff-' + q.difficulty.toLowerCase() + '">' + q.difficulty + "</span>" +
          '<span class="sub-tag">' + esc(q.summary || "") + "</span>" +
          '<span class="max-score">' + (q.minutes || 35) + " min</span>" +
          "</div></div>" +
          (isDone ? '<span class="solved-badge">✔ Reviewed</span>' : "") +
          '<a class="btn ' + (isDone ? "btn-outline" : "btn-green") + '" href="#/design/' + q.slug + '">' + (isDone ? "Practice Again" : "Start") + "</a>" +
          "</div>";
      });
    });
    sec.innerHTML = html;
    dash.appendChild(sec);
  });
})();
