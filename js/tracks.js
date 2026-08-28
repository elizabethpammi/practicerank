/* PracticeRank — Tracks: per-person guided curricula over shared content.
 *
 * Two tracks (Front-End · AI/ML) reference the SAME problem/design/debug
 * banks — content is reused,
 * progress is not. Auto items derive completion live from the app's own
 * localStorage records (pr-solved, pr-debug-solved, pr-design-reviewed,
 * pr-session-history), so solving anywhere on the site moves the track.
 * Off-site work (notebooks, RHEL VM, GPT-2 milestones) is a manual checkbox
 * stored per person, so the two never clobber each other even on one machine.
 */
(function () {
  "use strict";

  function lsGet(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); } catch (e) { return fallback; }
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function allProblems() {
    return (window.INTERVIEW_PROBLEMS || [])
      .concat(window.FRONTEND_PROBLEMS || [])
      .concat(window.PROBLEMS || [])
      .concat(window.ML_PROBLEMS || []);
  }

  var ARCH_CATS = ["Architecture Patterns", "Distributed Judgment", "Linux & RHEL Operations"];

  /* ---------- item completion ---------- */
  function slugsFor(item) {
    if (item.type === "problems") {
      return allProblems().filter(function (p) {
        if (item.tier) return p.tier === item.tier;
        return item.cats.indexOf(p.category) !== -1;
      }).map(function (p) { return p.slug; });
    }
    if (item.type === "design") {
      return (window.DESIGN_QUESTIONS || []).filter(function (q) {
        var isArch = ARCH_CATS.indexOf(q.category) !== -1;
        return item.arch ? isArch : !isArch;
      }).map(function (q) { return q.slug; });
    }
    if (item.type === "debug") return (window.DEBUG_EXERCISES || []).map(function (x) { return x.slug; });
    return [];
  }

  function itemProgress(person, item) {
    if (item.type === "manual") {
      var done = lsGet("pr-track-" + person + "-" + item.id, false) ? 1 : 0;
      return { done: done, total: 1 };
    }
    if (item.type === "sessions") {
      var hist = lsGet("pr-session-history", []);
      return { done: Math.min(hist.length, item.n), total: item.n };
    }
    var doneSet = item.type === "problems" ? lsGet("pr-solved", [])
      : item.type === "design" ? lsGet("pr-design-reviewed", [])
      : lsGet("pr-debug-solved", []);
    var slugs = slugsFor(item);
    var n = slugs.filter(function (s) { return doneSet.indexOf(s) !== -1; }).length;
    return { done: n, total: slugs.length };
  }

  /* ---------- track definitions ---------- */
  var TRACKS = {
    frontend: {
      name: "Front-End Track",
      goal: "Algorithms, React, debugging, and system design mastery.",
      phases: [
        { title: "Phase 1 · The 46", items: [
          { type: "problems", tier: "special", label: "Solve all 46 special interview questions", tab: "core46" },
        ]},
        { title: "Phase 2 · Supporting algorithms", items: [
          { type: "problems", cats: ["Warm-up", "Arrays & Hashmaps", "Strings & Sliding Window", "Arrays", "Frontend JS", "Stacks & Queues", "Sorting & Searching", "Interview Classics", "Dynamic Programming", "REST API", "Backend"], label: "Clear the supporting algorithm banks", tab: "algos" },
        ]},
        { title: "Phase 3 · Frontend — React, CSS, Types", items: [
          { type: "problems", cats: ["React", "React II", "UI Archetypes", "CSS"], label: "All React + UI archetype + CSS challenges", tab: "react" },
          { type: "problems", cats: [], slugsOnly: true, label: "Schema & Types trio", tab: "schema",
            slugs: ["ts-typed-props-card", "mini-schema-validator", "hook-form-controlled"] },
        ]},
        { title: "Phase 4 · Debugging under the clock", items: [
          { type: "debug", label: "All live-screen debugging exercises", tab: "debug" },
        ]},
        { title: "Phase 5 · System design", items: [
          { type: "design", arch: false, label: "Review every system + frontend design question", tab: "design" },
        ]},
        { title: "Phase 6 · Timed readiness", items: [
          { type: "sessions", n: 5, label: "Complete 5 timed sessions", tab: "sessions" },
          { type: "manual", id: "e-mock60", label: "Full mock: 4 problems in 60 minutes, one sitting, no pauses" },
          { type: "manual", id: "e-py46", label: "Solve 10 of the 46 in Python (timed-platform practice)" },
        ]},
      ],
    },
    aiml: {
      name: "AI/ML Track",
      goal: "Python, ML engineering, systems architecture, and research-engineer depth.",
      phases: [
        { title: "Phase 1 · Python fluency", items: [
          { type: "manual", id: "i-pydefault", label: "Set language default to Python (open any of the 46, toggle Python)" },
          { type: "problems", tier: "special", label: "Solve all 46 — in Python, not translated JavaScript", tab: "core46" },
        ]},
        { title: "Phase 2 · ML foundations (in browser)", items: [
          { type: "problems", cats: ["NumPy"], label: "NumPy bank — vectorized, no loops", tab: "ml" },
          { type: "problems", cats: ["Pandas"], label: "Pandas bank", tab: "ml" },
          { type: "problems", cats: ["Machine Learning"], label: "ML-from-scratch bank", tab: "ml" },
        ]},
        { title: "Phase 3 · Deep learning notebooks (local, ~/ml-curriculum)", items: [
          { type: "manual", id: "i-nb01", label: "01-04: NumPy → Pandas → sklearn → model evaluation" },
          { type: "manual", id: "i-nb05", label: "05-06: PyTorch autograd + real MNIST training run" },
          { type: "manual", id: "i-nb07", label: "07-08: embeddings/RAG + LLM apps and evals" },
          { type: "manual", id: "i-rag", label: "Ship the RAG project with an eval harness (the artifact)" },
        ]},
        { title: "Phase 4 · Architect judgment", items: [
          { type: "design", arch: true, label: "All 17 architect scenarios — write your answer before revealing, grade vs the STAFF column", tab: "architect" },
        ]},
        { title: "Phase 5 · Linux/RHEL hands-on (real VM, not reading)", items: [
          { type: "manual", id: "i-rhel-vm", label: "RHEL 9 VM running (free Developer Subscription + UTM)" },
          { type: "manual", id: "i-rhel-systemd", label: "Break and repair a systemd unit; reconstruct the failure from journalctl" },
          { type: "manual", id: "i-rhel-selinux", label: "Trigger an SELinux denial; fix it properly via audit2why (no setenforce 0)" },
          { type: "manual", id: "i-rhel-disk", label: "Fill a disk with a deleted-but-open file; recover with lsof +L1" },
          { type: "manual", id: "i-rhel-oom", label: "Drive a container into a cgroup OOM kill; explain limits vs requests from the evidence" },
          { type: "manual", id: "i-rhel-ansible", label: "Ansible playbook that patches and reboots the VM" },
        ]},
        { title: "Phase 6 · AI Lab L1 — GPT-2 from scratch (notebooks 09-12)", items: [
          { type: "manual", id: "i-l1-backprop", label: "09: backprop engine from scratch, gradients verified vs PyTorch" },
          { type: "manual", id: "i-l1-tokenizer", label: "10: BPE tokenizer built and round-trip tested" },
          { type: "manual", id: "i-l1-gpt", label: "11: decoder-only transformer trained to coherent sampling" },
          { type: "manual", id: "i-l1-replicate", label: "12: GPT-2 124M replication run on rented GPU + public write-up" },
        ]},
        { title: "Phase 7 · AI Lab L2 — systems depth", items: [
          { type: "manual", id: "i-l2-fsdp", label: "Multi-GPU training run (DDP → FSDP), profiled and broken on purpose once" },
          { type: "manual", id: "i-l2-oss", label: "Merged PR into vLLM / SGLang / llama.cpp" },
          { type: "manual", id: "i-l2-finetune", label: "LoRA fine-tune + DPO pass with an eval harness proving the gain" },
          { type: "manual", id: "i-l2-papers", label: "Paper fluency: the canon (Attention, GPT-2/3, Chinchilla, InstructGPT, LoRA, FlashAttention, PagedAttention) conversational" },
        ]},
        { title: "Phase 8 · AI Lab L3 — evidence and entry", items: [
          { type: "manual", id: "i-l3-portfolio", label: "Portfolio public: replication write-up + merged OSS PR + shipped LLM system, all linked from GitHub" },
          { type: "sessions", n: 5, label: "5 timed Python sessions at assessment pace", tab: "sessions" },
          { type: "manual", id: "i-l3-apply", label: "Evidence package complete: write-ups published and portfolio current" },
        ]},
      ],
    },
  };

  /* explicit-slugs support for the Schema trio */
  function itemProgressFull(person, item) {
    if (item.slugs) {
      var solved = lsGet("pr-solved", []);
      var n = item.slugs.filter(function (s) { return solved.indexOf(s) !== -1; }).length;
      return { done: n, total: item.slugs.length };
    }
    return itemProgress(person, item);
  }

  /* migrate pre-rename storage (elizabeth→frontend, immanuel→aiml) */
  (function migrate() {
    try {
      var map = { elizabeth: "frontend", immanuel: "aiml" };
      var p = localStorage.getItem("pr-track-person");
      if (map[p]) localStorage.setItem("pr-track-person", map[p]);
      var moves = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var m = k && k.match(/^pr-track-(elizabeth|immanuel)-(.+)$/);
        if (m) moves.push([k, "pr-track-" + map[m[1]] + "-" + m[2]]);
      }
      moves.forEach(function (mv) {
        localStorage.setItem(mv[1], localStorage.getItem(mv[0]));
        localStorage.removeItem(mv[0]);
      });
    } catch (e) {}
  })();

  /* ---------- render ---------- */
  function render(dash) {
    var person = null;
    try { person = localStorage.getItem("pr-track-person"); } catch (e) {}
    if (person !== "frontend" && person !== "aiml") person = "frontend";

    var sec = document.createElement("div");
    sec.className = "tracks";

    var html = '<div class="track-pick">';
    ["frontend", "aiml"].forEach(function (id) {
      var t = TRACKS[id];
      var stats = trackStats(id);
      html +=
        '<button class="track-person' + (id === person ? " active" : "") + '" data-person="' + id + '">' +
        '<span class="tp-avatar">' + (id === "frontend" ? "FE" : "AI") + "</span>" +
        '<span class="tp-body"><b>' + esc(t.name) + "</b><i>" + esc(t.goal) + "</i>" +
        '<span class="tp-bar"><span style="width:' + stats.pct + '%"></span></span>' +
        '<em>' + stats.done + " / " + stats.total + " · " + stats.pct + "%</em></span>" +
        "</button>";
    });
    html += "</div>";

    var track = TRACKS[person];
    track.phases.forEach(function (ph, pi) {
      var pDone = 0, pTotal = 0;
      ph.items.forEach(function (it) {
        var pr = itemProgressFull(person, it);
        pDone += pr.done; pTotal += pr.total;
      });
      var pct = pTotal ? Math.round((pDone / pTotal) * 100) : 0;
      html +=
        '<div class="track-phase' + (pDone === pTotal && pTotal ? " done" : "") + '">' +
        '<div class="track-phase-head"><h3>' + esc(ph.title) + "</h3>" +
        '<span class="track-phase-n">' + pDone + " / " + pTotal + "</span>" +
        '<span class="tp-bar tp-bar-sm"><span style="width:' + pct + '%"></span></span></div>';
      ph.items.forEach(function (it, ii) {
        var pr = itemProgressFull(person, it);
        var complete = pr.done >= pr.total && pr.total > 0;
        html += '<div class="track-item' + (complete ? " done" : "") + '">';
        if (it.type === "manual") {
          html += '<label><input type="checkbox" data-manual="' + it.id + '"' + (complete ? " checked" : "") + "> " + esc(it.label) + "</label>";
        } else {
          html += '<span class="ti-status">' + (complete ? "✔" : pr.done + "/" + pr.total) + "</span><span>" + esc(it.label) + "</span>";
          if (it.tab) html += '<a class="ti-go" href="#/" data-tab="' + it.tab + '">Go &rsaquo;</a>';
        }
        html += "</div>";
      });
      html += "</div>";
    });

    sec.innerHTML = html;
    dash.appendChild(sec);

    Array.prototype.forEach.call(sec.querySelectorAll(".track-person"), function (btn) {
      btn.onclick = function () {
        try { localStorage.setItem("pr-track-person", btn.getAttribute("data-person")); } catch (e) {}
        rerender();
      };
    });
    Array.prototype.forEach.call(sec.querySelectorAll("input[data-manual]"), function (cb) {
      cb.onchange = function () {
        try { localStorage.setItem("pr-track-" + person + "-" + cb.getAttribute("data-manual"), JSON.stringify(cb.checked)); } catch (e) {}
        rerender();
      };
    });
    Array.prototype.forEach.call(sec.querySelectorAll(".ti-go"), function (a) {
      a.onclick = function () {
        try { localStorage.setItem("pr-dash-tab", a.getAttribute("data-tab")); } catch (e) {}
        // hash is already #/ on the dashboard — force the re-render ourselves
        rerender(a.getAttribute("data-tab"));
        return false;
      };
    });
  }

  function trackStats(person) {
    var done = 0, total = 0;
    TRACKS[person].phases.forEach(function (ph) {
      ph.items.forEach(function (it) {
        var pr = itemProgressFull(person, it);
        done += pr.done; total += pr.total;
      });
    });
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function rerender(tab) {
    if (tab) { try { localStorage.setItem("pr-dash-tab", tab); } catch (e) {} }
    if (window.PR_APP && window.PR_APP.renderDashboard) { window.PR_APP.renderDashboard(); return; }
    // fallback: re-trigger the router
    location.hash = "#/";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  window.PR_DASH_SECTIONS = window.PR_DASH_SECTIONS || [];
  window.PR_DASH_SECTIONS.push({ tab: "tracks", render: render });
})();
