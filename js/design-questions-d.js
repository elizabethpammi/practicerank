(function () {
  "use strict";
  window.DESIGN_QUESTIONS = window.DESIGN_QUESTIONS || [];
  window.DESIGN_QUESTIONS.push(
    {
      slug: "collaborative-editor",
      name: "Design a Real-Time Collaborative Editor (Frontend)",
      category: "Frontend System Design",
      difficulty: "Hard",
      minutes: 50,
      summary: "OT vs CRDT in practice, presence cursors, offline queueing, conflict UX",
      statement:
        "<p>Your product team wants Google-Docs-style collaboration inside an existing React + TypeScript document tool. Several people open the same document, type simultaneously, and every keystroke shows up on every screen within a fraction of a second. Each collaborator sees the others' named cursors and selections, and a laptop that drops off hotel Wi-Fi for ten minutes must keep working locally and merge cleanly when it reconnects.</p><p>You own the <b>frontend architecture</b>: the local document model, how edits are represented and reconciled (operational transformation vs CRDT, at a working level — the interviewer wants your reasoning, not academic proofs), the sync protocol from the client's point of view, presence, undo, and what the user actually sees during and after a conflict. The server exists but is thin; assume you can shape its contract.</p><p>Walk through the editing pipeline from keydown to remote render, how you keep typing latency imperceptible while the network is slow, and where the design breaks if two users restructure the same paragraph while one of them is offline.</p>",
      clarifying: [
        "Is this rich text (nested marks, lists, tables) or plain text? Tree-structured content changes the merge model substantially.",
        "How many simultaneous editors per document do we design for — 5, 50, or a 500-person all-hands doc?",
        "How long can a client stay offline and still be expected to merge automatically — minutes, hours, days?",
        "Is undo per-user (undo only my edits, the collaborative norm) or global? This decides the undo stack design early.",
        "Do we need per-character attribution history (who typed what), or only live presence?",
        "What is the persistence contract — does the server store operations, snapshots, or both, and can the client request either?",
        "Are there permission tiers mid-session (someone downgraded to read-only while typing), and what should their in-flight edits do?"
      ],
      functional: [
        "Local keystrokes render in the same frame; remote edits appear within ~300 ms on a healthy connection.",
        "Concurrent edits to the same document always converge — every client settles on an identical document with no user-visible corruption.",
        "Presence layer shows each collaborator's named cursor and selection, updating smoothly without entering document history.",
        "Offline editing works for at least an hour; queued local edits sync and merge automatically on reconnect.",
        "Undo/redo is per-user: Cmd+Z reverts my last edit even if others have typed since, without destroying their work."
      ],
      nonfunctional: [
        "Keystroke-to-glyph latency under 16 ms locally — the local echo must never wait on the network.",
        "Sync payloads stay small: a keystroke costs tens of bytes on the wire, not a document diff.",
        "Memory stays bounded on long sessions: an 8-hour editing day must not accumulate unbounded operation history in the tab.",
        "Reconnect after a 10-minute gap completes catch-up in under 2 s for a typical document (~200 KB of text).",
        "Presence updates are rate-limited (~10/s per user) and never block or delay document operations."
      ],
      estimation: {
        prompts: [
          "Bytes per operation on the wire and per-user bandwidth at realistic typing speed.",
          "Size of the offline queue after an hour of solo editing.",
          "Catch-up payload after 10 minutes offline with 5 active collaborators.",
          "Client memory for CRDT metadata on a 100-page document, and when it forces a compaction strategy."
        ],
        worked:
          "<p>Typing is slow in computer terms — that observation drives everything. A fast typist produces ~90 words/min, roughly 8 keystrokes/sec in bursts.</p><pre>op on wire: opId (~12 B) + parent/position ref (~12 B) + char + clock + author ≈ 40-60 B JSON, ~25 B binary\nper-user upstream: 8 ops/s x 50 B ≈ 400 B/s — negligible; batching to 1 flush/50 ms cuts packet count 4x\ndownstream with 5 editors: 5 x 400 B/s = 2 KB/s — WebSocket idles\n\noffline hour: 8 ops/s x 25% duty cycle x 3600 s ≈ 7,200 ops x 60 B ≈ 430 KB queued — fine for IndexedDB, fine to replay\ncatch-up after 10 min, 5 editors: 5 x 8 x 0.25 x 600 ≈ 6,000 ops ≈ 300 KB — under the 2 s budget on any real link,\n  but ALSO the reason the server must offer snapshot + tail, not endless op replay from document birth</pre><p>The scary number is CRDT metadata, not bandwidth: 100 pages ≈ 250k characters, and a naive per-character ID + tombstone model costs ~40 B each → ~10 MB before tombstone accumulation. A heavily edited doc can carry more deleted metadata than live text. Conclusion baked into the design: block-level run compression (runs of sequentially typed chars share one ID span) and periodic server-coordinated snapshot/GC are requirements, not optimizations.</p>"
      },
      model: {
        highlevel:
          "<p>Four layers on the client, decoupled so latency-critical paths never wait on sync. <b>Editor view</b> (contentEditable wrapper or virtualized custom renderer) → <b>document model</b> (the CRDT/OT state, the single source of truth the view renders from) → <b>sync engine</b> (outbound op queue, inbound op applier, reconnect/catch-up logic) → <b>transport</b> (WebSocket with visibility-aware heartbeats). Presence rides a separate ephemeral channel that shares the socket but never touches the document log.</p><pre>keydown ─▶ editor view ─▶ local op ─▶ document model ──▶ re-render (same frame)\n                                     │\n                                     ▼\n                              outbound queue ──batch 50ms──▶ WebSocket ──▶ server (orders, persists, fans out)\n                                     ▲                                        │\n                              IndexedDB (offline)                             ▼\n remote render ◀── document model ◀── inbound applier ◀──────────────── remote ops\n\n presence (cursor pos, name, color) ──throttled──▶ ephemeral channel ──▶ peers (no persistence)</pre><p>The invariant: the local edit is applied to the model and rendered <i>before</i> anything network-related happens. The network path only carries convergence, never correctness of what I just typed.</p>",
        data:
          "<p>Choose a sequence CRDT (RGA/Yjs-style) as the document model. Every character gets a stable ID; position is expressed relative to IDs, not indexes, so concurrent edits cannot mean different things on different clients.</p><pre>type OpId = { site: string; seq: number };            // globally unique, per-client monotonic\ntype InsertOp = { kind: \"insert\"; id: OpId; after: OpId | \"origin\"; text: string };  // run of chars\ntype DeleteOp = { kind: \"delete\"; target: OpId; span: number };                       // tombstone, not removal\ntype FormatOp = { kind: \"format\"; range: [OpId, OpId]; mark: string; value: unknown };\n\n// client -> server\n{ docId, sinceVersion, ops: Op[] }\n// server -> client (server assigns a total order + version vector)\n{ version, ops: Op[], authors: {...} }\n// reconnect handshake\n{ docId, myVersion } -> { snapshot?, opsTail, version }   // snapshot when tail would exceed ~5k ops\n\npresence (separate message type, last-write-wins, TTL 30 s):\n{ user, cursor: { anchor: OpId, head: OpId }, ts }</pre><p>Presence anchors are also OpIds, so remote cursors stay glued to the right character as text shifts around them — index-based cursors drift the moment anyone types above. Undo is a per-user stack of inverse ops (delete-of-my-insert, re-insert-of-my-delete targeting the same IDs), which composes correctly with interleaved remote edits because IDs, not offsets, name the targets.</p>",
        deepdives:
          "<p><b>1. OT vs CRDT, practically.</b> OT keeps ops small and index-based but demands transformation of every op against every concurrent op, with correctness resting on a central server that defines the canonical order — offline support means replaying and transforming a long queue against everything you missed, and transform bugs corrupt silently. CRDTs pay a metadata tax (IDs, tombstones) to make merge <i>commutative</i>: any client can apply any ops in any order and converge, which makes the offline story almost free and the server dumb (order, persist, fan out). For a product that names offline as a requirement and has a small platform team, CRDT is the defensible pick; say the tax out loud and pay it with run-compression and snapshot GC.</p><p><b>2. Offline queue and reconnect.</b> Outbound ops append to an IndexedDB-backed queue before send; acks prune it. On reconnect the client sends its version vector, receives snapshot-or-tail, applies remote ops (commutativity makes ordering vs the local queue a non-issue), then flushes the queue. Idempotency comes from OpIds — the server drops duplicates, so a crash between send and ack can't double-type. The subtle bug to name: the flush must preserve the client's own causal order (seq within site), or a reordered delete can precede its own insert.</p><p><b>3. Conflict UX.</b> Character-level merges need no UI — interleaved words read oddly for a second and humans fix them. The cases that need product design: (a) same-region restructuring after a long offline gap — auto-merge, but show a passive 'merged remote changes' affordance with per-author change highlighting for ~30 s so the result isn't spooky; (b) semantic conflicts CRDTs cannot see (two users renaming the same heading differently) — last-writer-wins plus attribution beats a blocking dialog, because modal conflict resolution in a live doc halts everyone; (c) a stale read-only user's queued edits — reject at the server, surface locally as 'your offline edits couldn't be saved' with an export path, never silent discard.</p>",
        tradeoffs:
          "<p>We chose <b>CRDT over OT</b> because offline-merge is a stated requirement and OT concentrates its complexity exactly there; the cost is client memory and payload metadata, bounded by run-compression and snapshot GC rather than wished away. We chose <b>a dumb ordering server over a transforming server</b> because it keeps the correctness kernel in one codebase (the client library) instead of two that must agree bit-for-bit. We chose <b>per-user undo over global undo</b> because global undo makes my Cmd+Z destroy your typing — the collaborative-editor norm exists for a reason — at the cost of an inverse-op stack that must reference IDs, not offsets. We chose <b>ephemeral presence outside the document log</b> because cursors at 10 Hz would swamp op history and presence has no replay value. Bottleneck to watch: tombstone growth on old, heavily edited documents — the design must include server-coordinated compaction, and compaction epochs are the one place clients must agree before GC discards IDs an offline peer might still reference.</p>",
        scaling:
          "<p><b>5 editors (launch):</b> everything above works untuned; one socket, one doc room, naive re-render of changed blocks.</p><p><b>50 editors:</b> downstream op rate (~100/s) makes per-op React renders the bottleneck, not the network. Batch inbound ops per animation frame and re-render only dirty blocks (block-keyed memoization keyed on CRDT block version); presence rendering moves to a canvas/absolutely-positioned overlay so 50 cursors don't invalidate text layout. Presence fan-out gets server-side coalescing (send each viewer at most 10 presence frames/s total, merged).</p><p><b>500 viewers, few editors (all-hands doc):</b> stop shipping the op stream to read-only clients — they subscribe to periodic snapshot deltas (say 1/s), cutting fan-out cost by orders of magnitude, and get promoted to the live op stream only if granted edit. Document itself gets large next: virtualize rendering so only visible blocks mount, lazily hydrate off-screen CRDT blocks, and page in history on demand. At this tier the client library's memory ceiling is enforced by snapshot epochs: clients older than the retained op horizon do a full snapshot reload rather than op replay, which is also the recovery path for any client whose state diverges (checksum mismatch on version vector).</p>"
      },
      followups: [
        "Two users bold the same word simultaneously with different marks (bold vs italic-off). How does your format-op model converge, and what does each see?",
        "A client's document checksum disagrees with the server's after a week-long session. Detection, blast radius, recovery?",
        "Product wants suggestion mode (tracked changes) layered on. What changes in the op model and what stays?",
        "How does paste of 50k characters behave — one op, many, and what does the remote experience look like?",
        "The server retains only 24 h of ops plus snapshots. A laptop reopens after two weeks offline with queued edits. Walk through it.",
        "How would you test convergence — what does a useful fuzzer for this system generate and assert?"
      ],
      rubric: {
        senior: [
          "Renders local keystrokes before any network involvement and states the 16 ms invariant unprompted.",
          "Compares OT and CRDT on operational grounds (offline, server complexity, failure modes) and commits with a reason.",
          "Anchors cursors and undo targets to stable IDs, not indexes, and explains why offsets break under concurrency.",
          "Designs the reconnect handshake concretely: version vector, snapshot-vs-tail decision, idempotent replay.",
          "Separates presence from the document log and rate-limits it."
        ],
        staff: [
          "Quantifies CRDT metadata growth (tombstones on old docs) and designs compaction with the offline-peer epoch hazard named.",
          "Treats conflict UX as a product surface: attribution highlighting over modal dialogs, and the rejected-offline-edits path.",
          "Scales the read-heavy case by demoting viewers to snapshot deltas instead of op fan-out.",
          "Keeps the correctness kernel client-side with a dumb server, and argues the org benefit (one implementation to verify).",
          "Proposes convergence fuzzing (random concurrent op schedules, assert identical final states) as the primary test strategy."
        ]
      }
    },
    {
      slug: "client-cache-sync",
      name: "Design Client-Side Caching & Server State Sync for a Large SPA",
      category: "Frontend System Design",
      difficulty: "Medium",
      minutes: 45,
      summary: "stale-while-revalidate, normalized cache, invalidation, optimistic updates, offline-first",
      statement:
        "<p>You inherit a large React + TypeScript SPA — a project-management product with dozens of routes, hundreds of components, and a REST/JSON API. Today every component fetches its own data on mount: the same task list is fetched five times by five widgets, spinners appear on every navigation even for data fetched seconds ago, and a rename in one panel leaves stale copies of the old name visible elsewhere on screen.</p><p>Design the client-side data layer that fixes this: a cache that makes navigation feel instant, a freshness model (stale-while-revalidate at minimum), a story for how mutations update or invalidate everything they touch, optimistic updates with rollback, and a defensible position on offline support. You may reach for the ideas behind libraries like TanStack Query or a normalized store — but the interviewer wants you to design the machinery, not name a dependency.</p><p>Be explicit about the hard parts: when a cached entry is 'fresh enough,' how one entity appearing in ten queries stays consistent, and what happens when an optimistic write fails after the user has kept working on top of it.</p>",
      clarifying: [
        "How interconnected is the data — does one entity (a task) appear in many lists and views, pushing us toward normalization, or are views mostly disjoint documents?",
        "What staleness can each surface tolerate — is a 30-second-old task list acceptable, while a billing total must always be revalidated?",
        "Do other users mutate the same data concurrently, and is there any push channel (WebSocket/SSE) or is HTTP polling all we have?",
        "Which mutations deserve optimistic treatment — quick toggles and renames, or also destructive/multi-entity operations?",
        "Is offline read-only acceptable, or must users create and edit offline with a sync-later queue?",
        "How much memory can the cache use in-tab, and should it persist across reloads (IndexedDB) or start cold?",
        "Does the API support conditional requests (ETags), cursor-stable list endpoints, or partial entity responses we must merge?"
      ],
      functional: [
        "Any number of components can subscribe to the same query; the network sees one request (in-flight dedup), and all subscribers re-render from one cache entry.",
        "Returning to previously visited data renders instantly from cache, with a background revalidation refreshing it (stale-while-revalidate).",
        "A mutation to an entity updates every visible occurrence of that entity — lists, detail panes, counters — within one render cycle.",
        "Optimistic updates apply immediately, reconcile with the server response, and roll back visibly (with user notice) on failure.",
        "Cache persists to IndexedDB so a reload paints last-known data before the first network response arrives."
      ],
      nonfunctional: [
        "Cache-hit navigation paints meaningful content in under 100 ms with zero spinners for previously seen data.",
        "Duplicate concurrent requests for the same key collapse to one network call, always.",
        "In-tab cache memory stays bounded (~50 MB ceiling) via LRU eviction of unobserved entries; active queries are never evicted.",
        "No stale-flash: after a mutation resolves, no component may render the pre-mutation value, even transiently.",
        "The data layer adds no perceptible input latency — cache reads and notifications are synchronous and O(subscribers), not O(cache)."
      ],
      estimation: {
        prompts: [
          "Working-set size: entities on a busy screen x bytes per entity, and whether normalization pays for itself.",
          "Requests saved per session by dedup + SWR versus fetch-on-mount, at realistic navigation patterns.",
          "Cost of a background refetch storm after laptop wake — how many queries revalidate at once and how to bound it.",
          "IndexedDB hydration budget: how much persisted cache can you load before it delays first paint."
        ],
        worked:
          "<p>Size the entities first, because the answer decides whether normalization is worth its complexity.</p><pre>task entity: ~1.5 KB JSON (title, status, assignee ref, dates, counts)\nbusy board screen: ~400 visible tasks + 30 users + 12 projects ≈ 650 KB denormalized —\n  but the same 400 tasks appear in board + list + 'my work' + search results:\n  document cache stores ~4 copies ≈ 2.6 MB and, worse, 4 places to update on rename\nnormalized: one copy per entity + per-query ID arrays (400 x 8 B each) ≈ 700 KB total, one write point\n\nsession of 40 navigations, ~6 queries/screen:\n  naive fetch-on-mount: 240 requests\n  dedup + SWR (default staleTime 30 s): ~70 network calls, ~170 served from cache — and every repeat\n  visit paints instantly, which is the felt difference\n\nwake-up storm: 25 mounted queries revalidating on one 'online' event → cap with a refetch queue,\n  concurrency 4, focus-visible queries first ≈ full refresh in ~2 s without saturating the API\nhydration: cap persisted cache at ~5 MB; IndexedDB read + JSON parse ≈ 50-80 ms on mid hardware —\n  acceptable before first paint, which is why the ceiling is 5 MB and not 50</pre><p>The estimation verdict: multi-appearance entities make normalization pay for itself in both memory (4x) and, decisively, in single-point updates; and SWR's win is not request count but the removal of spinners from every repeat navigation.</p>"
      },
      model: {
        highlevel:
          "<p>Three cooperating pieces. A <b>query layer</b> keyed by serialized request descriptor owns fetching: dedup, retry, staleness state machine (fresh → stale → revalidating → fresh), and subscriber notification. An <b>entity store</b> holds one normalized copy of each entity, keyed by type:id; query results are stored as shapes-of-IDs referencing it. A <b>mutation manager</b> runs writes: apply optimistic patch, track rollback info, reconcile on response, and run declarative invalidation. React hooks subscribe components to query keys with selector-level granularity.</p><pre>useQuery([\"tasks\",{project:7}])\n   │ subscribe\n   ▼\nquery layer ──cache hit (stale)──▶ return cached ──▶ render instantly\n   │                                   │\n   │ revalidate in background          ▼\n   ▼                              subscribers notified on change\n fetch ──▶ normalize ──▶ entity store (one copy per entity)\n                              ▲\nmutation manager ─optimistic──┘  ...on error: rollback patch + toast\n        └── invalidate([\"tasks\"]) ──▶ affected queries refetch (active now, lazy on next observe)</pre><p>Everything renders from the entity store, so a rename writes one record and every subscribed view — board card, sidebar, detail pane — re-renders together. That single-write-point property is the whole argument for normalization.</p>",
        data:
          "<p>Cache keys are serialized descriptors; entities are normalized by schema; each query entry carries its own freshness metadata.</p><pre>type QueryKey = readonly [scope: string, params?: Record<string, unknown>];  // stable-stringified\n\ninterface QueryEntry<T> {\n  key: string;                 // hash of QueryKey\n  data: NormalizedResult;      // { shape: ids/structure, entities: written to store }\n  status: \"fresh\" | \"stale\" | \"revalidating\" | \"error\";\n  updatedAt: number; staleTime: number; gcTime: number;\n  inflight?: Promise<T>;       // dedup point: concurrent readers await this\n  subscribers: Set<() => void>;\n  etag?: string;               // conditional revalidation -> 304 = free freshness\n}\n\nentityStore: Map<\"task:91\" | \"user:4\" | ..., { data: Entity; version: number }>\n\ninterface Mutation<TVars> {\n  mutationFn: (v: TVars) => Promise<Entity>;\n  optimistic?: (v: TVars) => Patch[];        // inverse patches retained for rollback\n  invalidates: QueryKey[];                   // declarative, prefix-matched\n}</pre><p>Persistence: on idle, serialize entity store + query metadata (not in-flight state) to IndexedDB, versioned by a schema number so a deploy that changes entity shape invalidates the persisted cache wholesale instead of hydrating garbage.</p>",
        deepdives:
          "<p><b>1. Freshness model.</b> Every read returns cached data immediately and the entry's state machine decides whether to revalidate: within <code>staleTime</code>, do nothing; past it, fire a background refetch while showing cached data. Revalidation triggers are subscription (mount), window focus, network recovery, and explicit invalidation — each passing through the same dedup gate so a screen with ten widgets triggers one request. Per-surface <code>staleTime</code> encodes product truth: reference data 10 min, task lists 30 s, billing 0 (always revalidate, but still render cached while doing so). ETags make revalidation cheap — a 304 renews freshness without payload or re-render.</p><p><b>2. Invalidation discipline.</b> Manual per-mutation invalidation lists rot as the app grows. Two-layer defense: mutations write the returned entity into the store directly (so anything rendering that entity is correct with zero refetching), and structural changes (create/delete/reorder) declare invalidations against key prefixes — <code>[\"tasks\"]</code> marks every task query stale; active ones refetch now, dormant ones refetch when next observed. That laziness is the memory-and-bandwidth win: an app with 300 cached queries refetches only the handful on screen.</p><p><b>3. Optimistic updates and failure.</b> The mutation manager applies an inverse-tracked patch to the entity store, fires the request, and on success replaces the optimistic guess with the server entity (fields you didn't send — updatedAt, computed status — reconcile here, not via a follow-up fetch). On failure it must handle the case interviewers probe: the user acted <i>on top of</i> the optimistic state. Rolling back only the failed patch can strand dependents (a comment typed on an optimistically created task that failed), so mutations that create referenceable entities either serialize their dependents behind the ack, or the rollback cascades and the UI says plainly what was undone. Silent rollback is the one forbidden outcome — the user saw success, so the reversal must be narrated (toast + affected-item highlight).</p>",
        tradeoffs:
          "<p>We chose <b>a normalized entity store over per-query documents</b> because task entities appear in many simultaneous views and consistency bugs (rename visible in one panel, stale in another) are the stated pain; the price is normalization machinery and schema discipline, and we'd concede that a mostly-disjoint app should skip it. We chose <b>stale-while-revalidate over cache-then-block</b> because showing slightly old data beats a spinner in a productivity tool, and mutations bypass the staleness window anyway by writing through the store. We chose <b>declarative prefix invalidation + write-through over trying to compute exact affected queries</b> because exactness requires the client to re-implement server query semantics (does this new task match that filtered list?) — refetching the visible few is cheaper than being wrong. We chose <b>offline read + queued simple mutations over full offline-first</b>: persisted cache gives reload-instant reads nearly free, while a general offline write queue imports the collaborative-merge problem; scope it to idempotent single-entity ops with a visible pending badge, and say no to the rest until product demands it. Bottleneck to watch: notification fan-out on hot entities — selector-based subscriptions (re-render only if your selected slice changed) keep an entity touched by 50 components from causing 50 renders.</p>",
        scaling:
          "<p><b>1x (a few routes adopt it):</b> query layer + hooks only, document-style caching, manual invalidation lists. Ship it, migrate screens incrementally alongside legacy fetch-on-mount.</p><p><b>10x (whole app, hundreds of query shapes):</b> normalization becomes mandatory as cross-view inconsistency reports arrive; add the entity store and write-through mutations. Memory pressure appears — enforce the gcTime LRU on unobserved queries and the 5 MB persistence ceiling. Refetch storms (wake, reconnect) get the bounded-concurrency queue. Multi-tab enters: BroadcastChannel shares invalidation events so a mutation in tab A stales tab B's queries; the persisted store gets a single-writer election to stop tabs clobbering each other's snapshots.</p><p><b>100x (realtime, org-wide data):</b> polling-based freshness stops scaling — attach a push channel publishing entity-version bumps (type:id:version, not payloads); clients holding an older version of an entity they're rendering refetch just that entity. staleTime becomes a fallback rather than the freshness mechanism. At this stage the invalidation vocabulary (key prefixes, entity versions) is effectively a public API for the whole frontend org — version it, lint against ad-hoc cache writes, and document the mutation contract, because the data layer is now infrastructure with more consumers than authors.</p>"
      },
      followups: [
        "A list query is paginated with cursors and page 3 is cached. A mutation deletes an item on page 1. What is correct behavior for pages 2-3 and what do you actually implement?",
        "Two optimistic mutations on the same entity are in flight and the first fails. Walk through the rollback exactly.",
        "How does your design prevent a logged-out user's persisted IndexedDB cache from flashing on a shared machine's next login?",
        "Search-as-you-type results: do they go through the same cache? What stops them from evicting everything else?",
        "The server adds a required field to Task. Deploy happens mid-session. What breaks and what defends against it?",
        "A product team wants 'real-time' badges but there's no WebSocket budget this quarter. What's the best degraded design?"
      ],
      rubric: {
        senior: [
          "Builds dedup, SWR, and subscriber notification as one coherent state machine, not three bolted-on features.",
          "Justifies normalization from multi-appearance entities and shows the single-write-point payoff on mutation.",
          "Handles optimistic failure including work-on-top-of-optimistic-state, with narrated (never silent) rollback.",
          "Distinguishes write-through entity updates from structural invalidation and knows when each applies.",
          "Bounds memory explicitly: LRU on unobserved queries, persistence ceiling, schema-versioned hydration."
        ],
        staff: [
          "Treats staleTime as encoded product policy per surface, with numbers, rather than one global constant.",
          "Designs invalidation to survive organizational scale: declarative prefixes, lazy refetch of dormant queries, lint against ad-hoc writes.",
          "Covers multi-tab coherence (BroadcastChannel invalidation, single-writer persistence) unprompted.",
          "Scopes offline honestly — idempotent queued mutations yes, general offline-first no — with the merge-problem reasoning stated.",
          "Plots the evolution to push-based entity versioning and identifies what becomes a public contract for the frontend org."
        ]
      }
    },
    {
      slug: "infinite-feed",
      name: "Design an Infinite-Scrolling News Feed (Frontend)",
      category: "Frontend System Design",
      difficulty: "Medium",
      minutes: 40,
      summary: "virtualization, cursor pagination, media lazy-loading, scroll restoration, prefetch",
      statement:
        "<p>Build the frontend for an infinite-scrolling feed — the home surface of a social product where users scroll through an endless stream of posts containing text, images, and autoplaying muted video. Sessions are long: heavy users scroll through thousands of posts, tap into a post detail view, and hit back expecting to land exactly where they left off, on both desktop and mid-range Android phones.</p><p>You own the scroll architecture: how items are fetched (and why offset pagination will betray you), how thousands of variable-height posts render without eating the tab's memory, how images and video load just-in-time without janking the scroll or shifting layout, how scroll position survives navigation and reload, and how prefetching hides latency without wasting a metered mobile data plan.</p><p>The interviewer will press on the mid-range phone: 60 fps scrolling on a device where every post render costs real milliseconds, and memory limits are enforced by the OS killing your tab.</p>",
      clarifying: [
        "Is feed order stable per session (finite ranked batch) or genuinely live, with new posts appearing above while the user scrolls?",
        "Are item heights knowable before render (server-sent image dimensions, capped text) or fully dynamic (expandable text, embeds)?",
        "What does 'back to the same place' require — same scroll offset, or same post anchored at viewport top even if content above changed?",
        "How many videos may play simultaneously, and is autoplay-in-viewport a hard product requirement?",
        "What's the low-end device target — and do we have a data-saver mode obligation for metered connections?",
        "Do ads/sponsored slots come inline in the same cursor stream, or from a separate system that must be interleaved client-side?",
        "How fresh must the feed head be on return-to-app — silently refetch, or preserve and offer a 'new posts' pill?"
      ],
      functional: [
        "Feed loads incrementally via cursor pagination; reaching a sentinel near the bottom fetches the next page before the user arrives at it.",
        "Only on-screen and near-screen posts are mounted in the DOM; scrolled-past content unmounts without visual difference.",
        "Images lazy-load with reserved space (no layout shift); videos autoplay muted when mostly visible and pause when they leave.",
        "Navigating to a post and back restores the exact viewport position, including after the feed data was evicted from memory.",
        "New posts arriving upstream never yank the user's viewport; a 'new posts' affordance lets them jump to the top intentionally."
      ],
      nonfunctional: [
        "Sustained 60 fps scroll on a mid-range Android device; no frame budget spent on off-screen work.",
        "DOM node count stays bounded (~30 mounted posts) regardless of how far the user scrolls; tab memory flat over a 2,000-post session.",
        "Cumulative layout shift ~0 during scroll: every async asset gets its space reserved before it loads.",
        "p75 time from sentinel trigger to next page rendered under 500 ms — the user should never see the loading row on a healthy network.",
        "At most one video plays at a time; off-screen videos release their decoder and buffer promptly."
      ],
      estimation: {
        prompts: [
          "DOM weight: nodes per post x posts mounted, with and without virtualization, against mobile memory reality.",
          "Bytes per feed page (JSON + media) and session data cost at heavy scroll rates with eager vs lazy media.",
          "Frame budget math: what per-post render cost fits 60 fps when a fast fling reveals several posts per second.",
          "Prefetch distance: pages ahead needed to hide p75 API latency at maximum realistic scroll velocity."
        ],
        worked:
          "<p>Start with the DOM, because that's what kills the tab. A media post is ~150-250 DOM nodes (wrapper, header, avatar, text runs, media chrome, action bar).</p><pre>2,000 posts scrolled x ~200 nodes = 400k live nodes unvirtualized — plus decoded images:\n  a 1080-wide feed image decodes to ~1080 x 1350 x 4 B ≈ 5.8 MB of bitmap; even 200 retained ≈ 1.2 GB → OS kills the tab\nvirtualized: ~30 mounted posts ≈ 6k nodes, ~12 decoded images near viewport ≈ 70 MB — flat forever\n\ndata: page = 20 posts x ~2 KB JSON = 40 KB; media dominate: ~12 lazy-loaded images/screen-page x 120 KB ≈ 1.4 MB\n  per screenful → a 10-minute heavy scroll ≈ 60-100 MB; eager full-res loading would triple it — data-saver mode\n  (smaller renditions, no video preload) is an estimation-driven requirement, not a nice-to-have\n\nframe budget: 16.7 ms − ~6 ms (compositor, scroll handling, GC noise on mid-range) ≈ 10 ms for us;\n  fast fling reveals ~4 posts/s → each incremental mount must stay ≈ 2-3 ms → measure-once + content-visibility,\n  never full re-layout\nprefetch: max believable velocity ~3,000 px/s; p75 fetch+render 400 ms → 1,200 px covered while loading →\n  trigger next page ~2 viewports (≈1,600 px) before the end, and 1 page ahead is enough — deeper prefetch is pure waste</pre><p>Two numbers carry the design: decoded image memory (not JSON) is the memory story, and the 2-viewport sentinel offset falls straight out of velocity x latency.</p>"
      },
      model: {
        highlevel:
          "<p>Four cooperating systems. A <b>feed store</b> (outside React state, subscribed via selectors) holds the ordered post list, cursors, and per-item height cache. A <b>virtualizer</b> maps scroll position → the window of items to mount, using estimated heights corrected by measurement. A <b>media controller</b> owns every IntersectionObserver: image loading, video play/pause arbitration, and impression logging share observers rather than each post creating its own. A <b>pagination engine</b> watches a bottom sentinel and appends pages.</p><pre>scroll ─▶ virtualizer ──▶ mount window [i..j] ──▶ post components (measured once → height cache)\n              │                                        │\n              │ spacer divs above/below                ▼\n              │ (sum of cached/estimated heights)   media controller ─▶ lazy <img>, video play/pause (1 max)\n              ▼\n        sentinel @ ~2 viewports from end ─▶ pagination engine ─▶ GET /feed?cursor=…&limit=20\n                                                    │\n                                                    ▼\n        feed store: { items: PostRef[], heights: Map, nextCursor, anchor: {postId, offsetInPost} }\n                                                    │ persisted to sessionStorage on nav-away\n                                                    ▼\n        back-navigation: restore items+heights+anchor synchronously before first paint</pre><p>Rendering reads exclusively from the store, which is what makes restoration trivial: put the store back, and the same pixels reappear.</p>",
        data:
          "<p>Cursor pagination is non-negotiable: offsets break the moment the ranked feed shifts underneath you — page 5 by offset re-serves posts you saw or skips ones you didn't. The cursor is an opaque server token encoding position in a session-pinned ranking snapshot.</p><pre>GET /feed?cursor=eyJz…&limit=20 →\n{ items: Post[], nextCursor: string | null, ttl: 900 }\n\ninterface Post {\n  id: string; author: {…}; text: string;\n  media: { kind: \"image\" | \"video\"; url: string; width: number; height: number;  // ALWAYS intrinsic dims\n           placeholder: string;      // tiny blurhash — paints before bytes arrive\n           renditions: { w: number; url: string }[] }[];\n}\n\n// client-side\nheights: Map<postId, number>                    // measured; estimate = f(text length, media aspect) until then\nanchor: { postId: string; offsetPx: number }    // element-relative, survives height re-estimation above\nsessionStorage[\"feed:snapshot\"]: { items, heights, anchor, nextCursor, savedAt }</pre><p>Server-sent media dimensions are the CLS story: the layout reserves <code>width/height</code> aspect-ratio boxes before any byte of image loads. The anchor is element-relative, not an absolute scrollTop — absolute offsets are wrong the moment any height above the viewport was an estimate.</p>",
        deepdives:
          "<p><b>1. Virtualization with variable heights.</b> Fixed-height windowing math doesn't apply; instead: estimate each unmeasured post's height from cheap signals, mount the visible window plus overscan (~5 posts each side), measure real heights once via ResizeObserver on mount, and cache them. The classic bug to name: when an <i>above-viewport</i> estimate corrects (image loads taller than guessed), naively updating spacer height shifts the viewport — so height corrections above the anchor are compensated by an equal synchronous scrollBy in the same frame, keeping the anchored post visually pinned. Off-screen-but-mounted overscan posts get <code>content-visibility: auto</code> so they skip layout/paint until needed. Unmounting scrolled-past posts also drops their decoded bitmaps, which is where the memory flatline actually comes from.</p><p><b>2. Media pipeline.</b> One shared IntersectionObserver with a generous rootMargin (~1.5 viewports) triggers image loads into the reserved box: blurhash paints instantly, then <code>srcset</code> picks a rendition sized to the actual layout width (never ship 4K into a 400 px column). Video is an arbitration problem, not an observer problem: candidates report visibility ratios; the controller plays exactly one (highest ratio, ties to the later post), pauses and detaches <code>src</code> on exit to free the decoder — mobile browsers cap concurrent decoders, and leaking them is how feeds die on Android. Data-saver mode: smallest rendition, no video preload, tap-to-play.</p><p><b>3. Scroll restoration.</b> Take over from the browser (<code>history.scrollRestoration = \"manual\"</code> for the feed route) because the browser restores a scrollTop into a DOM that no longer exists under virtualization. On nav-away, snapshot items + heights + anchor to sessionStorage; on back, restore the store, mount the anchored window, and set scroll position synchronously in a layout effect before paint — no flash of the feed top, no re-fetch. If the snapshot exceeded its TTL, restore it anyway and revalidate in the background: showing the user exactly where they were beats freshness on a back-navigation. Prepended new posts never move the viewport — they extend upward beyond the anchor and light up the 'new posts' pill.</p>",
        tradeoffs:
          "<p>We chose <b>cursor over offset pagination</b> because feed ranking shifts between requests and offsets convert that into duplicates and gaps the user can see; the cost is losing jump-to-page — meaningless in a feed anyway. We chose <b>windowed virtualization over letting the DOM grow with content-visibility alone</b> because content-visibility skips rendering work but retains nodes and decoded images, and the memory math (1.2 GB retained bitmaps) fails on exactly the target device; the cost is virtualization complexity — estimates, anchors, restoration — which is the real engineering budget of this feature and should be named as such. We chose <b>element-relative anchoring over absolute scrollTop</b> because estimated heights above the viewport make absolute offsets lies. We chose <b>one video at a time with detached sources over free-for-all autoplay</b> for decoder limits and battery, accepting slightly later playback starts. Prefetch is capped at one page ahead: the sentinel math shows deeper prefetch buys nothing at believable scroll speeds and bills users for posts never seen. Bottleneck to watch: post component render cost — a 12 ms post render breaks every budget above, so per-post cost is a monitored performance contract (~3 ms), not a hope.</p>",
        scaling:
          "<p><b>1x (MVP):</b> text+image posts, sentinel pagination, shared lazy-load observer, virtualization with the height cache. Restoration via sessionStorage snapshot. This already meets the fps and memory bars.</p><p><b>10x (media-rich, ads, live head):</b> video arbitration and data-saver land; ads interleave client-side from a separate stream into reserved slots (same height-reservation discipline — an ad that resizes after load is a CLS incident). The live head arrives: prepend-above-anchor plus the new-posts pill, and the snapshot gains an epoch so a stale restored feed revalidates its head without moving the viewport. Impression logging joins the shared observer with batched flushes (sendBeacon on pagehide).</p><p><b>100x (platform feed, multiple teams shipping post types):</b> the feed becomes a runtime with plugins. Post renderers register declared height estimators and a strict render budget; a misbehaving post type is measurable (per-type render timing surfaces in RUM) and demotable. Heterogeneous item sources (posts, ads, suggestions) merge through one interleaving layer so the virtualizer still sees a single ordered list with stable IDs. Restoration state moves from sessionStorage to an LRU of the last few feed sessions so back-navigation from deep stacks still lands correctly. The team's job shifts from building the feed to defending its budgets: per-post render ms, mounted-node ceiling, CLS ~0, and one playing video — enforced in CI with scripted-scroll performance runs on real mid-range hardware.</p>"
      },
      followups: [
        "A post above the viewport expands ('see more' tapped earlier, or a late-loading embed). Walk through exactly how the viewport stays pinned.",
        "The user shares a deep link to post 1,400 in their feed. What renders, and what does 'scroll up' do?",
        "Pull-to-refresh on a feed with a restored snapshot: what merges, what resets, and where does the viewport land?",
        "How would you A/B test a heavier post card design without letting it degrade scroll fps for the treatment group unnoticed?",
        "RUM shows p95 INP regressing on feed scroll for Android only. What are your first three hypotheses and how do you confirm each?",
        "Accessibility: what does an infinite virtualized feed owe a screen-reader user, and where does virtualization actively fight that?"
      ],
      rubric: {
        senior: [
          "Rejects offset pagination with the shifting-feed duplicate/gap argument, unprompted.",
          "Designs variable-height virtualization with measurement, estimates, and the above-viewport correction/scroll-compensation problem named.",
          "Reserves media space from server-sent dimensions and keeps CLS at ~0 by construction.",
          "Implements restoration as store snapshot + element-relative anchor, taking scrollRestoration away from the browser.",
          "Centralizes IntersectionObservers and arbitrates video playback to exactly one with decoder release."
        ],
        staff: [
          "Does the decoded-bitmap memory math and lets it, not folklore, force windowed virtualization over content-visibility alone.",
          "Derives prefetch distance from scroll velocity x fetch latency and caps it, citing metered-data cost as a product constraint.",
          "Treats per-post render cost as an enforced budget with RUM + CI scroll benchmarks on low-end hardware.",
          "Extends the design to a multi-team platform: pluggable renderers with declared estimators and demotable misbehaving post types.",
          "Raises the screen-reader tension with virtualized DOM (content that 'exists' but isn't in the tree) and proposes a concrete mitigation."
        ]
      }
    },
    {
      slug: "autocomplete-typeahead",
      name: "Design a Search Autocomplete / Typeahead Component",
      category: "Frontend System Design",
      difficulty: "Easy",
      minutes: 35,
      summary: "debounce vs throttle, request races, client caching, keyboard a11y, ranking display",
      statement:
        "<p>Design the search typeahead for a large commerce site's header: the user types, and a dropdown suggests completions, products, and categories, updating as they type. It looks like an afternoon of work and is famously not — this component is a compact tour of frontend engineering: input-rate control, network races, caching, keyboard and screen-reader accessibility, and rendering ranked results without misleading the user.</p><p>You own the component and its client-side data layer; the suggest API exists (<code>GET /suggest?q=…</code>, p50 ~120 ms, p95 ~400 ms). Design the typing-to-request pipeline, how you guarantee stale responses never overwrite fresher ones, what you cache and for how long, the full keyboard interaction contract, and how highlighted/ranked results are presented honestly.</p><p>Interviewers use this question to see whether you sweat the details: they will ask what happens when the response for \"sho\" arrives after the response for \"shoes\", and your answer needs to be mechanical, not hopeful.</p>",
      clarifying: [
        "Are suggestions purely query completions, or mixed entities (products with images, categories, past searches) with different visual treatments?",
        "What's the latency budget from keystroke to updated dropdown — and is showing slightly-stale results while fetching acceptable?",
        "Do we personalize (recent searches, session context), and does that make responses uncacheable or just cache-keyed differently?",
        "What's the minimum query length, and does the empty-focused state show anything (trending, recents)?",
        "Which accessibility bar are we meeting — full WAI-ARIA combobox semantics with screen-reader announcements, or keyboard-only?",
        "Is there analytics attribution — do we log impressions and which suggestion (rank, type) was chosen?",
        "Multi-language and IME input: do we suggest mid-composition, or only on composition commit?"
      ],
      functional: [
        "Suggestions update as the user types, feeling immediate on fast networks and never flickering through intermediate states on slow ones.",
        "Arrow keys traverse suggestions with wraparound; Enter selects; Escape closes then clears; typing resumes filtering — the full combobox keyboard contract.",
        "Each suggestion shows why it matched (highlighted matched substring) and what it is (completion vs product vs category, visually distinct).",
        "Selecting a suggestion navigates or fills the input; the component reports (query, suggestion id, rank) for analytics.",
        "Recently seen queries resolve instantly from a client cache with no network request or visible loading state."
      ],
      nonfunctional: [
        "A displayed result set always corresponds to the input's current text — a stale response must never render, no matter how responses reorder.",
        "Keystroke handling adds no perceptible input latency; the input is never controlled by network state.",
        "At most ~4 requests/sec reach the API from one user regardless of typing speed; obsolete in-flight requests are actually aborted.",
        "Fully operable and comprehensible via keyboard + screen reader (ARIA 1.2 combobox pattern, results announced politely).",
        "Dropdown updates render in under a frame; result list changes never shift the input or steal focus."
      ],
      estimation: {
        prompts: [
          "Requests per typed query with no rate control vs debounce vs debounce+dedup, at realistic inter-key intervals.",
          "Cache hit rate from prefix reuse (every backspace and retype revisits keys) and the memory cost of caching aggressively.",
          "Perceived latency: debounce delay + p50/p95 API time, and what that implies for the debounce constant.",
          "Race window math: how often out-of-order completion happens at p95 spread, i.e. how often correctness machinery earns its keep."
        ],
        worked:
          "<p>Typing cadence sets every constant. Average typists emit a key every ~150-250 ms; fast ones every ~80 ms.</p><pre>\"running shoes\" = 13 keystrokes\n  no control: 13 requests, ~12 wasted\n  debounce 200 ms: fires only at pauses → 2-3 requests per query typed — the 80% saving\n  + prefix cache: retypes and backspaces hit cache → warm-session network rate ≈ 1-2 req per query\n\nperceived latency (cold): 200 debounce + 120 p50 = 320 ms — fine, feels live\n                (p95):    200 + 400 = 600 ms — this is why we show stale results dimmed rather than blanking\ndebounce below ~120 ms stops saving requests (few inter-key gaps that long); above ~300 ms feels laggy →\n  200 ms is derived, not folklore. Fire immediately on cache hit — debounce is for the network, not the UI.\n\ncache: entry ≈ 8 suggestions x ~150 B + key ≈ 1.5 KB → 200 entries ≈ 300 KB, trivial; TTL 5 min, LRU\nraces: responses at p50 120 / p95 400 mean consecutive requests 200 ms apart overlap routinely —\n  out-of-order completion is an every-session event, not an edge case; the epoch guard runs constantly</pre><p>Conclusion: debounce ≈ 200 ms with immediate cache paint, cache costs nothing relative to what it buys, and race handling is core-path machinery exercised many times per session.</p>"
      },
      model: {
        highlevel:
          "<p>A small pipeline with one owner of truth. The <b>input stage</b> captures raw keystrokes (uncontrolled by network; IME composition events gate suggestion triggering). A <b>scheduler</b> applies the debounce and consults the <b>cache</b> — hits paint immediately, bypassing the wait. A <b>request manager</b> owns correctness: it stamps each fetch with a monotonically increasing epoch, aborts the previous in-flight request via AbortController, and drops any response whose epoch is not the latest. A <b>results view</b> renders the ranked list with highlighting and drives ARIA state.</p><pre>keystroke ─▶ input (echoes immediately, always)\n     │\n     ▼\nscheduler ── cache hit? ──yes──▶ results view (0 ms, no spinner)\n     │ no                              ▲\n     ▼ debounce 200 ms                 │ only if epoch === latest\nrequest manager: epoch++ ──▶ abort prev ──▶ fetch /suggest?q=… ──▶ cache.set(q, result)\n\nEscape/blur ─▶ close dropdown, abort in-flight, epoch++ (so a landing response can't reopen it)</pre><p>The epoch check is the single correctness gate: aborts are an optimization (save bandwidth), the epoch comparison is the guarantee — abort signals can lose races too, so never rely on cancellation alone.</p>",
        data:
          "<p>Everything the component needs travels in one response shape; match offsets come from the server so the client never re-implements matching (and never mis-highlights fuzzy or synonym matches).</p><pre>GET /suggest?q=runn&limit=8&session=…\n{\n  query: \"runn\",\n  suggestions: [\n    { id: \"c:running-shoes\", kind: \"completion\", text: \"running shoes\",\n      match: [[0, 4]],                        // server-declared highlight ranges\n      score: 0.94 },\n    { id: \"p:88123\", kind: \"product\", text: \"Aero Runner 2\", image: \"…\", price: \"$120\",\n      match: [[5, 9]], score: 0.81 },\n    { id: \"cat:running\", kind: \"category\", text: \"Running\", match: [[0, 4]], score: 0.77 }\n  ]\n}\n\n// client state (one reducer/store — every transition auditable)\ninterface TypeaheadState {\n  inputValue: string;\n  status: \"idle\" | \"loading\" | \"open\" | \"error\";\n  results: Suggestion[]; resultsForQuery: string;   // provenance: which text produced these\n  activeIndex: number | -1;                          // keyboard highlight\n  epoch: number;\n}\ncache: LRU<normalizedQuery, { suggestions, at }>    // normalize: trim + lowercase + collapse spaces; TTL 5 min\n\n// ARIA wiring (combobox 1.2)\n<input role=\"combobox\" aria-expanded aria-controls=\"listbox-id\" aria-activedescendant={activeId}>\n<ul role=\"listbox\"><li role=\"option\" id=… aria-selected>…</li></ul>\n+ visually-hidden aria-live=\"polite\" region: \"8 suggestions available\"</pre><p><code>resultsForQuery</code> is the honesty field: the view can render stale results dimmed while loading, but labels them internally as belonging to the previous query — which is also what analytics logs, so impression data never lies about what the user was shown for which input.</p>",
        deepdives:
          "<p><b>1. Debounce vs throttle, and when neither.</b> Debounce (fire after quiet) matches search intent — the interesting moment is the pause, and intermediate prefixes are noise. Throttle (fire at most every N ms) suits continuous streams like scroll or resize where you need intermediate readings; for typeahead it burns requests on prefixes nobody paused at. The refinement worth saying: debounce the <i>network</i>, not the <i>experience</i> — cache hits and the empty→first-character transition paint immediately, and a leading-edge fire on the first keystroke after idle makes the component feel awake without meaningfully raising request rate. IME input adds a gate: during composition (compositionstart→end), suggest on committed text only, or Japanese/Chinese users get garbage suggestions for half-composed syllables.</p><p><b>2. Race handling, mechanically.</b> The sequence to have cold: user types \"sho\" (epoch 5, slow backend node), types \"shoes\" (epoch 6, fast node). Response 6 arrives, renders. Response 5 arrives late — abort may or may not have reached it. The guard: the response callback compares its captured epoch against state.epoch and returns without touching state if older. Same guard covers close-then-respond (Escape bumps the epoch, so the dropdown cannot reopen) and select-then-respond (navigation bumps it). Errors respect epochs too: a failed stale request must not paint an error banner over fresh results. This is four lines of code and the whole difference between a component that works and one that intermittently shows shoes results for a query about shorts.</p><p><b>3. Accessibility and honest ranking display.</b> Focus never leaves the input: <code>aria-activedescendant</code> points at the highlighted option so the screen reader announces it while the DOM focus (and the caret) stays put — moving real focus into the list breaks typing-to-refine. Result count changes announce through a polite live region, debounced to announce once per settled result set, not per keystroke. Ranking display: preserve server order exactly (no client-side re-sorting by kind — that silently overrides the ranker), render highlights only from server match offsets, and if a suggestion is promoted/sponsored, badge it — an undisclosed paid slot in what looks like ranked relevance is a dark pattern an interviewer will reward you for flagging. Mouse hover and keyboard highlight are one state, so Enter always activates exactly what is visually indicated.</p>",
        tradeoffs:
          "<p>We chose <b>debounce (200 ms, leading-edge, cache-bypassed) over throttle</b> because search cares about pauses, not intermediate prefixes; the derived constant matters more than the mechanism, and we showed the derivation. We chose <b>epoch guard as the correctness primitive with abort as an optimization</b> because cancellation is best-effort (the response may already be in flight past the abort) while a monotonic comparison is airtight and testable. We chose <b>server-side match offsets over client-side highlight computation</b> because the backend's matching (fuzzy, synonyms, typo-tolerance) is not reproducible client-side, and a wrong highlight actively misleads; the cost is a slightly fatter payload. We chose <b>showing dimmed stale results during fetch over blanking</b> because a dropdown that empties and refills every keystroke reads as flicker; the provenance field keeps it honest. We chose <b>aria-activedescendant over roving focus</b> to keep the caret in the input. Bottleneck to watch: dropdown re-render thrash on fast typers — key results by suggestion id so DOM nodes for suggestions surviving between result sets patch instead of remount, which also stops screen-reader double-announcement.</p>",
        scaling:
          "<p><b>1x (one search box):</b> everything above in one component plus a headless core (state machine + request manager) with the visual layer separate — this split is what makes the rest of the roadmap cheap.</p><p><b>10x (product-wide primitive):</b> other teams want typeahead for help docs, admin lookup, store locator. Ship the headless core as a package: consumers supply a fetcher and a renderer; the core owns debounce, epochs, cache, and ARIA. Constants (debounce, TTL, limit) become config with the derived defaults documented so teams don't cargo-cult worse numbers. Analytics standardizes: every consumer emits the same impression/selection schema (query, id, rank, latency), which is what lets the search-quality team evaluate the ranker from real behavior.</p><p><b>100x (search as a platform):</b> the component becomes the front door of a ranked marketplace surface — sponsored slots, personalization, experimentation. Client cache keys gain the personalization/experiment dimensions (cache per session-segment, or personalized entries marked no-store) so a cached result never leaks another experiment arm's ranking into the wrong bucket. Prefetch appears: on highlight-dwell or hover, prefetch the top suggestion's landing page (link rel=prefetch / router prefetch) so selection navigation feels instant — with a data-saver opt-out. The correctness machinery never changes; what scales is governance: the epoch guard, the ARIA contract, and the honest-ranking rules are enforced by the shared core precisely so forty product teams cannot each reinvent the race condition.</p>"
      },
      followups: [
        "The response for the previous query arrives while its request's AbortController has already fired. Trace the code path that keeps it off the screen.",
        "How does the empty-input focused state (recents, trending) share machinery with the typed state, and what must NOT be shared?",
        "A user selects a suggestion with an IME composition still open. What happens, and what should?",
        "Search-quality wants to log 'suggestion shown but user typed past it.' Define that event precisely and where it fires.",
        "The API adds typo-tolerance: 'runing' matches 'running'. What breaks in the client if highlights were computed client-side?",
        "How would you write the automated test that proves the stale-response guard, without flaky timing-dependent sleeps?"
      ],
      rubric: {
        senior: [
          "Chooses debounce over throttle with the pauses-vs-streams reasoning and derives the constant from typing cadence + API latency.",
          "Implements the epoch/latest-wins guard and states plainly that abort is an optimization, not the guarantee.",
          "Caches normalized prefixes with TTL + LRU and paints cache hits immediately, bypassing the debounce.",
          "Delivers the full combobox contract: aria-activedescendant, live-region announcements, focus never leaving the input.",
          "Handles the unglamorous states: IME composition, Escape-then-late-response, error responses from stale epochs."
        ],
        staff: [
          "Structures the component headless-core-plus-renderer and argues it as the reuse and governance mechanism.",
          "Insists on server-provided match offsets and preserved server ordering, with the misleading-highlight and ranker-override arguments.",
          "Flags undisclosed sponsored suggestions as a dark pattern and designs the badge into the schema.",
          "Standardizes impression/selection analytics with provenance (resultsForQuery), enabling ranker evaluation from real behavior.",
          "Designs the deterministic race test (controllable fake fetch resolving out of order) rather than accepting timing-flaky coverage."
        ]
      }
    }
  );
})();
