(function () {
  "use strict";
  window.DESIGN_QUESTIONS = window.DESIGN_QUESTIONS || [];
  window.DESIGN_QUESTIONS.push(
    {
      slug: "payment-conditional-strategy",
      name: "Untangle a 40-Branch Payment Conditional",
      category: "Architecture Patterns",
      difficulty: "Medium",
      minutes: 40,
      summary: "Strategy + registry, seams, when NOT to refactor",
      statement:
        "<p>You inherit the checkout service of a mid-size e-commerce platform. At its heart is <code>processPayment()</code> — a single function that has grown to roughly 40 <code>if/else</code> branches keyed on combinations of payment method (card, ACH, PayPal, gift card, store credit, wallet), currency, country, and a scattering of customer-specific overrides added under deadline pressure. Every new payment method touches this function, every deploy of it risks all payment paths at once, and two of the last three payment incidents were regressions introduced by edits to unrelated branches.</p><p>Leadership wants new payment methods shipped monthly. You have been asked to propose a refactoring approach, a migration plan that never stops the money, and — because you are interviewing for an architect role — an honest account of when this refactor would be the wrong call.</p><p>Walk through how you would carve the conditional into a Strategy-style design with a registry, how you keep behavior identical during the migration, and where you would deliberately stop.</p>",
      clarifying: [
        "Is behavior fully covered by tests today, or is the conditional itself the only spec of what the system does?",
        "Are the 40 branches truly independent behaviors, or do many share 90% of their logic with small parameter differences?",
        "How often does each branch actually execute — are 35 of the 40 dead or near-dead code?",
        "Do any branches have side effects beyond the payment call (emails, ledger writes, fraud flags) that make behavior comparison hard?",
        "What is the team's deploy cadence and rollback story — can we ship the refactor in many small slices?",
        "Are customer-specific overrides contractual (must survive forever) or accidents we can negotiate away?",
        "Is there a compliance or audit constraint (PCI scope) that limits which code can move where?"
      ],
      functional: [
        "Every existing payment path produces byte-identical outcomes (charge amount, ledger entries, error codes) throughout the migration.",
        "Adding a new payment method requires creating one new module and one registry entry — no edits to shared dispatch code.",
        "Per-method behavior is testable in isolation with a contract test suite every strategy must pass.",
        "Customer-specific overrides are expressed as data (configuration) where possible, not code branches.",
        "A kill switch can route any single method back to the legacy path within minutes."
      ],
      nonfunctional: [
        "Zero payment downtime during migration; the money never stops moving.",
        "Regression blast radius of a new method ships is confined to that method — a bad gift-card deploy cannot break card payments.",
        "Migration completable in incremental slices, each independently shippable and revertible within one sprint.",
        "Dispatch overhead is negligible (in-process map lookup, no network hop added).",
        "The registry and strategy interface remain understandable to a mid-level engineer in under an hour of reading."
      ],
      estimation: {
        prompts: [
          "Traffic per branch: if the service does 2M payments/day, what does the long tail of branches actually carry?",
          "Test-writing effort: characterization tests per branch × branches worth keeping.",
          "Migration duration in slices: branches per sprint at a safe pace, and total calendar time.",
          "Risk exposure: incidents/year attributable to this function × cost per incident, vs engineer-months of refactor."
        ],
        worked:
          "<p>First measure, don't assume. Log branch hit counts for two weeks:</p><pre>2,000,000 payments/day\ncard (4 branches, currency variants)  ≈ 78% of volume\nPayPal + wallet                       ≈ 15%\nACH + gift card + store credit        ≈ 6.5%\nremaining ~30 branches combined       ≈ 0.5%  — several at zero hits</pre><p>That distribution is the whole strategy: 8-10 branches carry 99.5% of the money. Characterization tests first for those, at maybe 1-2 days each including edge cases: ~15 engineer-days. Zero-hit branches get a log-and-alert wrapper for a quarter, then deletion — deleting a branch is cheaper and safer than migrating it.</p><pre>slices: ~2 methods/sprint at safe pace → 5-6 sprints for the hot set\ncost:   ~1.5 engineer-quarters total\nvalue:  2 payment incidents/yr from this file × (say) $150k blended cost\n        + 1 payment method/month unlocked (currently ~1/quarter)</pre><p>The math says refactor the head of the distribution and delete the tail — not migrate all 40. Migrating everything is where these projects go to die.</p>"
      },
      model: {
        highlevel:
          "<p>Target shape: a thin dispatcher, a registry, and one strategy module per payment method. The dispatcher extracts a <b>routing key</b> (method + currency + country where it matters), looks it up in the registry, and invokes the strategy behind a stable interface. Overrides become configuration consulted by strategies, not branches in the dispatcher.</p><pre>request ─▶ dispatcher ──▶ registry.lookup(key)\n                              │\n            ┌─────────────────┼──────────────────┐\n            ▼                 ▼                  ▼\n      CardStrategy      PayPalStrategy     GiftCardStrategy\n            │                 │                  │\n            └────── shared PaymentContext ───────┘\n                 (ledger, fraud, notification ports)\n\nmigration: strangler inside one service —\n  dispatcher tries registry; on miss, falls through to legacy\n  processPayment(). Each slice moves one key from legacy to registry.</pre><p>The fall-through is the safety net: unmigrated keys keep running the old code untouched, and the kill switch is just removing a registry entry.</p>",
        data:
          "<p>The interesting contracts are the strategy interface and the registry key — get these wrong and you rebuild the conditional inside every strategy.</p><pre>interface PaymentStrategy\n  authorize(PaymentRequest) → AuthResult\n  capture(AuthResult)       → CaptureResult\n  refund(CaptureRef, amt)   → RefundResult\n  // NO method-specific parameters in the interface —\n  // method-specific config arrives via the strategy's own constructor\n\nregistry\n  key: (method, currency?, country?)   -- most specific match wins\n  value: strategy instance + flags {enabled, canary_pct}\n\noverrides table (data, not code)\n  customer_id, method, field, value    -- e.g. custom descriptor text\n</pre><p>Two design rules. First, the routing key contains only what changes <i>which code runs</i>; anything that merely changes parameters (fee rate, descriptor) is configuration. Second, the interface is the union of lifecycle verbs, not the union of every method's quirks — if PayPal needs a redirect URL, that lives in PayPal's typed request extension, invisible to the dispatcher.</p>",
        deepdives:
          "<p><b>1. Proving behavior identical.</b> Characterization tests are necessary but insufficient — the conditional's real behavior includes cases nobody thought to test. Run <b>shadow comparison</b>: for each migrated key, execute both legacy and new paths, ship the legacy result, and diff the would-be outcomes (amount, status, error class, ledger delta) asynchronously. Only side-effect-free stages can be shadowed, so isolate the decision logic (pure) from the effect execution first. When diffs sit at zero for a week at real traffic, flip that key with a percentage canary (1% → 25% → 100%).</p><p><b>2. When NOT to do this.</b> Strategy + registry earns its complexity when variants share a stable lifecycle and vary independently. It is the wrong call when: (a) the branches are mostly dead — delete instead; (b) the variation is in <i>data</i> not behavior — a parameter table beats 40 classes that differ only in constants; (c) the team is 3 people shipping one method a year — the abstraction tax exceeds the change rate; (d) the real problem is that payments, ledger, and fraud are entangled — then the seam you need is between domains, and polishing the conditional is rearranging furniture. An architect names the condition under which the pattern pays: <b>expected change rate along the axis the pattern makes cheap</b>.</p><p><b>3. Keeping the registry from becoming the new mess.</b> Registries rot when routing keys grow ad-hoc dimensions ('also branch on cart size for this one customer'). Guard it: the key schema is fixed and reviewed like an API; anything that smells like customer-specific routing must be expressed as configuration inside a strategy, or it gets rejected in review.</p>",
        tradeoffs:
          "<p>We chose <b>a strangler inside the service over a big-bang rewrite</b> because payments cannot stop and the conditional is the only spec; the cost is running two code paths for months, mitigated by the fall-through making coexistence structural rather than manual. We chose <b>shadow comparison over trusting tests</b> because the branches encode undocumented behavior; the cost is engineering the pure/effectful split first — which is also permanent design improvement, so the cost is an investment. We chose <b>deleting the cold tail over migrating it</b> because migration effort scales per branch while 30 branches carry 0.5% of volume; the risk is deleting something contractually required, mitigated by a quarter of hit logging and a product sign-off per deletion. The bottleneck to watch is the strategy interface itself: if it accretes method-specific parameters, the conditional has reassembled one level down.</p>",
        scaling:
          "<p><b>Now (one team, 8 hot methods):</b> single service, in-process registry, config in a table. Do not extract microservices to solve a code-structure problem.</p><p><b>2-3 teams / 20+ methods:</b> ownership becomes the axis — each team owns strategy modules end to end; the dispatcher and interface become an internal platform contract with versioning discipline and a contract test suite all strategies run in CI.</p><p><b>Regional expansion / heavy compliance:</b> some methods (e.g. a local bank-transfer scheme with data-residency rules) may finally justify extraction into their own deployable behind the same logical interface — the registry entry points at a remote adapter instead of an in-process class. The pattern's payoff is that this extraction is now a local decision per method, not a rewrite.</p>"
      },
      followups: [
        "A teammate proposes replacing the conditional with a rules engine so 'product can change routing without deploys'. Argue for or against.",
        "How do you stop the shared PaymentContext from becoming a god object every strategy dumps dependencies into?",
        "One branch turns out to implement a subtle currency-rounding behavior that is wrong but that downstream reconciliation depends on. Migrate the bug or fix it?",
        "The gift-card strategy needs a two-step reservation flow that the interface's authorize/capture shape doesn't fit. Widen the interface or special-case it?",
        "How would your plan change if the function had 400 branches generated over 15 years, not 40?",
        "What code-review guardrails prevent the dispatcher from growing conditionals again within a year?"
      ],
      rubric: {
        senior: [
          "Measures branch traffic before proposing anything, and lets the distribution drive scope.",
          "Proposes a strangler-style fall-through so migration never requires a big-bang cutover.",
          "Designs a stable strategy interface around lifecycle verbs, keeping method quirks out of it.",
          "Uses characterization tests plus canary rollout per migrated key.",
          "Distinguishes behavioral variation (strategies) from parametric variation (configuration)."
        ],
        staff: [
          "Quantifies the refactor as an investment case (incident cost + method-shipping cadence vs engineer-quarters).",
          "Proposes shadow comparison and names its precondition — separating pure decisions from side effects.",
          "Argues the 'when NOT to' case unprompted: dead code, data-only variation, low change rate, wrong seam.",
          "Deletes the cold tail with an evidence-and-sign-off process instead of migrating it.",
          "Installs guardrails (fixed key schema, contract tests, review rules) so the structure survives the team's future."
        ]
      }
    },
    {
      slug: "monolith-strangler-fig",
      name: "Strangler-Fig a 12-Year-Old Monolith",
      category: "Architecture Patterns",
      difficulty: "Hard",
      minutes: 45,
      summary: "seam selection, data gravity, anti-corruption layer",
      statement:
        "<p>A logistics company runs its business on a 12-year-old monolith: one codebase, one Oracle database with ~400 tables, quarterly big-bang releases that routinely slip, and a test suite that takes six hours and fails nondeterministically. Three previous 'rewrite it in microservices' initiatives were cancelled after 12-18 months with nothing shipped. The CTO wants a different answer this time: incremental value within a quarter, and a path that survives budget cuts at any point.</p><p>You are the architect. Design a strangler-fig migration: how you choose the first capability to extract, how you route traffic between old and new, how you deal with the shared database (the real boss fight), and how you make the program cancel-proof — every completed slice must stand on its own.</p><p>Be explicit about sequencing, the data-ownership handover, and what you would refuse to extract at all.</p>",
      clarifying: [
        "What actually hurts most — deploy cadence, reliability, hiring, scaling costs, or a specific product bottleneck? The pain picks the first seam.",
        "Which parts of the domain change most often? Extraction pays fastest where change rate is highest.",
        "How entangled is the database — do modules write to each other's tables directly, and are there triggers/stored procedures carrying business logic?",
        "Is there an existing HTTP boundary (load balancer, API gateway) in front of the monolith we can route at, or do clients hit it directly?",
        "What integration points exist besides HTTP — batch jobs, DB links from other systems, file drops, message queues?",
        "What is the org shape — can a dedicated team own an extracted service end to end, or does everyone own everything?",
        "Why exactly did the three previous attempts die? Repeating their failure mode is the default outcome."
      ],
      functional: [
        "A routing facade in front of the monolith can direct any given capability's traffic to old or new implementation per request, with instant rollback.",
        "Each extracted service owns its data exclusively; the monolith reaches it only through the service's API after cutover.",
        "During transition, a synchronization mechanism keeps old and new data stores consistent enough for rollback to remain safe.",
        "Extraction slices are independently shippable; the program can stop after any slice leaving the system better than before.",
        "Legacy behavior is pinned by contract tests at the facade before any traffic moves."
      ],
      nonfunctional: [
        "First extracted capability serving production traffic within one quarter.",
        "No user-visible behavior change during any cutover; rollback for any slice within 15 minutes.",
        "Extracted services deploy independently, on demand, in under 30 minutes end to end.",
        "Added facade latency ≤ 5 ms p99.",
        "The monolith's release cadence must not get worse for teams still working inside it."
      ],
      estimation: {
        prompts: [
          "Change-rate concentration: what fraction of commits touch the candidate module (mine the VCS history)?",
          "Data coupling: how many tables does the candidate own, and how many foreign systems touch those tables directly?",
          "Sync load during transition: writes/day to the candidate's tables and the implied dual-write or CDC volume.",
          "Program duration honestly stated: slices × weeks/slice, and where the 80/20 cutoff falls."
        ],
        worked:
          "<p>Mine two years of git history and the DB catalog before picking a seam:</p><pre>commit concentration: shipment-tracking module = 31% of all commits\n                      billing = 22%, everything else &lt; 8% each\ntable ownership:      tracking touches 24 tables; 19 written ONLY by it,\n                      5 shared (3 read-only from reporting, 2 written by dispatch)\nexternal touchpoints: 2 batch jobs + 1 BI extract hit tracking tables directly</pre><p>Tracking is the right first cut: highest change rate (most payoff), mostly-owned data (cheapest divorce), and its shared tables have few writers. Sync volume during transition:</p><pre>tracking events ≈ 1.2M writes/day ≈ 14/s average, ~70/s peak\nCDC stream at that rate is trivial; a nightly reconciliation diff over\n~40M rows at 5k rows/s ≈ 2.2 hrs — fits the batch window</pre><p>Program shape: ~6 meaningful capabilities. At 1 slice per 6-10 weeks, extracting the top 3 (≈60% of change traffic) takes about a year. Plan and budget for that; treat full extraction as unlikely and unnecessary — the last slices have the worst cost/benefit and the monolith remnant can live indefinitely as the 'cold core'.</p>"
      },
      model: {
        highlevel:
          "<p>Three moving parts: a <b>routing facade</b>, an <b>anti-corruption layer</b> (ACL) in each new service, and a <b>data synchronization</b> path per slice. The facade goes in first, before any extraction — route 100% to the monolith, prove zero regression, and only then start moving capabilities.</p><pre>clients ─▶ facade (gateway) ─┬─ route: tracking ▶ tracking-svc ─▶ its own DB\n                             └─ route: * ───────▶ monolith ─▶ Oracle\n\n  monolith ══ CDC (or dual-write) ══▶ tracking DB   (transition only)\n  tracking-svc ── ACL ──▶ monolith APIs it still needs (dispatch, customers)\n\nper slice: pin contract → build service → backfill + CDC →\n           shadow reads → cut reads → cut writes → reverse-sync\n           for rollback window → decommission old code + tables</pre><p>The ACL translates the monolith's tangled model into the new service's clean one at the boundary, so legacy concepts never leak into new code — that leakage is how rewrites quietly become the old system with more network hops.</p>",
        data:
          "<p>The database is where strangler programs die, so the data handover is the design. Ordered protocol per slice:</p><pre>1. inventory  — classify every table: owned / shared-read / shared-write\n2. backfill   — copy owned tables to the new store; checksum row counts\n3. CDC        — monolith remains writer of record; stream changes to new DB\n4. shadow     — new service serves reads internally; diff vs legacy answers\n5. cut reads  — facade sends reads to new service (rollback = flip back)\n6. cut writes — new service becomes writer of record; REVERSE CDC now\n                streams new→old so rollback stays possible for N weeks\n7. divorce    — drop reverse sync, revoke monolith's grants on the tables,\n                convert stray readers (BI, batch) to the service's API or\n                a published read-replica/export</pre><p>Shared-write tables are the hard cases: for each, either move the foreign writer to call the new service's API, or split the table so each side owns its half. Never leave two writers of record — that is not a transition state, it is a permanent consistency bug. Triggers and stored procedures on owned tables must be rehomed into service code during step 2, or they silently vanish from the write path at step 6.</p>",
        deepdives:
          "<p><b>1. Choosing the seam (and refusing bad ones).</b> Rank candidates on three axes: change rate (payoff), data ownership cleanliness (cost), and coupling fan-in (risk). Extract high-change, mostly-owned, low-fan-in capabilities first. Refuse to extract: the authorization/session core (everything depends on it — extract it last or never), anything whose logic lives mainly in stored procedures you don't yet understand, and 'entities' like Customer that every module writes — entity-shaped services create a distributed monolith where every request fans out. Extract <i>capabilities</i> (verbs, workflows), not shared nouns.</p><p><b>2. Making it cancel-proof.</b> Each slice must end in a state that is strictly better standing alone: facade installed (better routing/observability even with zero extractions), tracking extracted (the highest-churn code now deploys daily even if nothing else ever moves). Sequencing by option value is the architect's job — the three failed rewrites almost certainly sequenced by architectural aesthetics ('build the platform first') and had nothing shippable when the budget review came.</p><p><b>3. The facade's failure modes.</b> It is a new single point of failure in front of everything, so: stateless, horizontally scaled, config-driven routing with versioned rollout, and a documented bypass path. Route on coarse, stable keys (path prefixes, not payload inspection). Latency budget 5 ms — if someone proposes putting orchestration or aggregation logic in it, that is a new monolith being born in the gateway; the facade routes, full stop.</p>",
        tradeoffs:
          "<p>We chose <b>strangler slices over a parallel rewrite</b> because three rewrites already died of no-intermediate-value; the cost is a long coexistence period with sync machinery, which we bound per slice (reverse-sync window measured in weeks, then divorced). We chose <b>CDC over dual-writes from the monolith</b> because dual-writes need distributed-transaction discipline the monolith cannot retrofit, and a missed write corrupts silently; CDC is asynchronous, so we accept seconds of lag and design the shadow-read diff to tolerate it. We chose <b>extracting by capability rather than by entity</b> because entities are the coupling hot spots; the cost is that some workflows span old and new for a while, handled in the ACL rather than by moving the shared entity. The biggest program risk is not technical: it is the monolith teams' velocity dropping while 'the new thing' gets attention — hence the NFR that their cadence must not get worse, enforced by keeping monolith CI investment funded during the program.</p>",
        scaling:
          "<p><b>Slice 1 (first quarter):</b> facade + tracking service. One team, one new datastore, CDC pipeline built once and templatized.</p><p><b>Slices 2-3 (year one):</b> billing and dispatch follow the same runbook — the per-slice protocol above is now a paved road, and each extraction is faster than the last. Contract tests at the facade become the regression net for the whole program.</p><p><b>Steady state (18+ months):</b> 3-4 services own ~70% of change traffic; the monolith remnant is the cold core — stable domains with near-zero commits. Declare victory there. Finishing the extraction for completeness is negative-value work; the remnant gets a maintenance owner, its release cadence stays quarterly, and that is fine. The honest end state of a good strangler program is a smaller, boring monolith, not zero monolith.</p>"
      },
      followups: [
        "Six months in, the CFO cuts the budget 50%. What survives, and what did you sequence to make that survivable?",
        "A batch job you didn't know about writes directly to tracking tables every Sunday night. You discover it after the write cutover. Walk through the incident and the fix.",
        "The dispatch team wants to skip the facade and call the new tracking DB directly 'for performance'. Response?",
        "When would you choose a full parallel rewrite over strangling despite this story's bias?",
        "How do you pin behavior with contract tests when the monolith's responses include incidental fields nobody documented?",
        "Reporting/BI ran SQL against the shared Oracle schema for a decade. What do you give them after the divorce?"
      ],
      rubric: {
        senior: [
          "Puts the facade in first and proves zero-regression routing before extracting anything.",
          "Selects the first seam with evidence (commit history, table ownership) rather than intuition.",
          "Handles the shared database with an explicit staged handover: backfill, CDC, shadow, cut reads, cut writes.",
          "Uses an anti-corruption layer so the legacy model doesn't leak into new services.",
          "Keeps rollback real at every stage, including reverse sync after the write cutover."
        ],
        staff: [
          "Diagnoses why previous rewrites failed and sequences slices by standalone value to make the program cancel-proof.",
          "Extracts capabilities not entities, and names which things should never be extracted and why.",
          "Treats two-writers-of-record as an invariant violation, not an acceptable transition state.",
          "Accounts for non-HTTP couplings — batch jobs, DB links, triggers, stored procedures, BI — in the divorce plan.",
          "Defines an honest end state (smaller cold-core monolith) and defends stopping there to leadership."
        ]
      }
    },
    {
      slug: "order-pipeline-outbox",
      name: "Event-Driven Order Pipeline That Doesn't Lose Orders",
      category: "Architecture Patterns",
      difficulty: "Medium",
      minutes: 40,
      summary: "transactional outbox, idempotent consumers, DLQ policy",
      statement:
        "<p>An online retailer is moving order fulfillment from synchronous service-to-service calls to an event-driven pipeline. When an order is placed, downstream work fans out: reserve inventory, charge payment, notify the warehouse, email the customer, update analytics. Today the order service calls each of these over HTTP in sequence; one slow dependency stalls checkout, and a crash mid-sequence leaves half-done orders that support fixes by hand.</p><p>Design the event-driven version. The two failure modes you must engineer away are the classic ones: an order committed to the database whose event was never published (lost work), and an event delivered more than once to a consumer that isn't ready for it (duplicate side effects — double-charged cards, double-shipped boxes).</p><p>Cover the transactional outbox on the producer side, idempotency on every consumer, event schema and versioning, and what your dead-letter and replay story is when a consumer has a bad week.</p>",
      clarifying: [
        "Which downstream steps must gate the customer-facing confirmation (payment?) and which are truly fire-and-forget?",
        "Is ordering required between events for the same order — can 'order-cancelled' overtake 'order-placed' in a consumer?",
        "What is the tolerance for consumer lag — is the warehouse fine seeing an order 30 seconds late? Five minutes?",
        "Do any consumers call external systems with real-world side effects (charge a card, print a label) where duplicates cost money?",
        "What broker does the org already run and operate well? The right pattern differs less than the right ops maturity.",
        "How long must events be replayable — days for recovery, or years for audit/rebuild?",
        "Are there existing consumers we don't control that would break on schema changes?"
      ],
      functional: [
        "An order accepted by the order service is eventually delivered to every subscribed consumer — no lost events, ever.",
        "Every consumer tolerates duplicate delivery of any event with no duplicate side effects.",
        "Events for the same order are processed in order by each consumer (cross-order interleaving is fine).",
        "A failing message goes to a dead-letter queue after bounded retries, with alerting and a supported replay path.",
        "Event schemas are versioned; adding optional fields never breaks a consumer."
      ],
      nonfunctional: [
        "Checkout latency no longer depends on any downstream consumer — the customer waits only for order commit (+ payment if gating).",
        "End-to-end event delivery p99 ≤ 5 s under normal operation.",
        "Pipeline sustains 50 orders/s peak (5x average) with consumer lag observable per consumer group.",
        "Outbox relay adds ≤ 500 ms between DB commit and broker publish at p99.",
        "Events retained on the broker for 7 days minimum; the outbox table is pruned only after confirmed publish."
      ],
      estimation: {
        prompts: [
          "Events/day: orders/day × events per order lifecycle × consumers.",
          "Outbox table growth rate and pruning cadence needed to keep it small.",
          "Broker retention volume for 7 days at your event size.",
          "Recovery math: if a consumer is down 4 hours, what backlog accrues and how long to drain at what parallelism?"
        ],
        worked:
          "<p>Assume 400k orders/day, ~6 lifecycle events per order, 5 consumer groups.</p><pre>producer:  400k × 6 = 2.4M events/day ≈ 28/s avg, ~140/s peak\nevent size ~1.5 KB (envelope + order snapshot)\nbroker retention: 2.4M × 1.5 KB × 7 d ≈ 25 GB — trivial\noutbox: 2.4M rows/day; prune published rows hourly →\n        steady-state table &lt; ~1M rows, index stays hot in memory</pre><p>Consumer-down math, the number that sizes your alerting:</p><pre>4-hour warehouse outage → 28/s × 14,400 s ≈ 400k backlog\ndrain at 200 msg/s (10 workers × 20/s) while live traffic continues:\n(400k backlog) / (200 - 28) ≈ 39 min to catch up\n→ page at 15 min of growing lag; 4 hours of silence is a support disaster</pre><p>The point of the arithmetic: every number is small for a mid-size retailer. The hard part of this design is correctness discipline, not throughput.</p>"
      },
      model: {
        highlevel:
          "<p>Producer side: order service writes the order row <b>and</b> an event row into an <b>outbox table in the same local transaction</b> — one commit, so the order and its event are atomic. A relay publishes outbox rows to the broker and marks them published. Consumer side: each consumer group reads independently, applies idempotency, does its work, acks.</p><pre>checkout ─▶ order-svc ─▶ BEGIN\n                          INSERT orders(...)\n                          INSERT outbox(event)\n                        COMMIT\n                             │\n              relay (CDC tail or poller) ─▶ broker topic: orders\n                             │  at-least-once, keyed by order_id\n      ┌──────────┬───────────┼────────────┬───────────┐\n      ▼          ▼           ▼            ▼           ▼\n  inventory   payment    warehouse     email      analytics\n  (each: dedup check → side effect → ack; failures → retry → DLQ)</pre><p>Everything is at-least-once by construction; exactly-once is manufactured at each consumer via idempotency, never assumed from the transport. Partitioning by <code>order_id</code> gives per-order ordering within each group.</p>",
        data:
          "<p>Outbox row, event envelope, and the consumer-side dedup table:</p><pre>outbox\n  id            BIGSERIAL PK      -- publish in id order per aggregate\n  aggregate_id  UUID              -- order_id → broker partition key\n  type          TEXT              -- order.placed / order.cancelled …\n  payload       JSONB             -- versioned envelope below\n  created_at, published_at TIMESTAMP NULL\n\nenvelope\n  {\"event_id\": uuid,          -- THE idempotency key, minted at insert\n   \"type\": \"order.placed\", \"version\": 2,\n   \"occurred_at\": …, \"order_id\": …,\n   \"data\": {…full order snapshot…}}\n\nconsumer_processed (one per consumer service, in ITS local DB)\n  event_id UUID PK, processed_at TIMESTAMP\n  -- inserted in the SAME transaction as the consumer's own state change</pre><p>Two rules carry the design. The snapshot-not-reference rule: events carry enough data that consumers don't call back to the order service (calling back reintroduces the coupling we're removing). The same-transaction rule on both sides: producer commits state+outbox together; consumer commits dedup-mark+its-own-write together. Break either and the failure modes return.</p>",
        deepdives:
          "<p><b>1. The relay and its duplicates.</b> Two implementations: poll the outbox (simple, adds up to one poll interval of latency) or tail the DB's change stream/CDC (lower latency, one more moving part). Either way the relay can crash after publishing but before marking published — so it will sometimes republish. That is by design: we choose at-least-once and push dedup to consumers, because the alternative (mark-then-publish) drops events on the other half of the crash, and a lost order beats a duplicate event every time. Relay runs as a single active instance per table (or per-partition leases) to preserve per-aggregate ordering.</p><p><b>2. Idempotency that survives real side effects.</b> For DB-only consumers, the dedup insert + business write in one transaction is complete. For consumers with external effects (payment), the dedup table alone has a gap: crash after charging but before committing the mark → retry → double charge. Close it by pushing idempotency into the external call itself — the payment provider's idempotency-key parameter, keyed on <code>event_id</code> (or order_id + attempt), so the retry returns the original result instead of charging again. Pattern: <i>claim (insert 'in-progress' mark, commit) → call external with idempotency key → finalize</i>. Any consumer that can't get an idempotent external API needs a reconciliation job as the backstop.</p><p><b>3. Poison messages and replay.</b> Distinguish transient failures (dependency down → retry with backoff) from deterministic ones (malformed payload, bug → will never succeed; retrying burns the pipeline). Bounded retries (say 5 over 10 minutes) then DLQ with the error attached. DLQ policy is organizational, not just technical: every DLQ has an owning team, an alert, and a runbook; replay is a supported tool that re-emits with the original event_id so dedup still holds. An unwatched DLQ is just a slow-motion data-loss incident.</p>",
        tradeoffs:
          "<p>We chose <b>outbox over publish-then-commit or commit-then-publish</b> because both naive orderings have a crash window that loses or fabricates events; the cost is an extra table, a relay component, and pruning — pure operational overhead, paid deliberately for atomicity. We chose <b>at-least-once + consumer dedup over broker 'exactly-once' features</b> because the side effects live outside the broker's transaction boundary (card networks, warehouse printers), so consumer idempotency is required anyway — building it once makes the broker guarantee a nice-to-have rather than a dependency. We chose <b>fat events (snapshots) over thin events (id + fetch)</b> to break the runtime coupling to the order service; the cost is larger messages and stale-snapshot semantics, acceptable because each event snapshots its own moment in the lifecycle. Watch one seam closely: the payment consumer's gap between external effect and local commit — that is where the money bugs live.</p>",
        scaling:
          "<p><b>1x (28/s):</b> outbox poller at 200 ms interval, one broker, one partition per topic would even suffice — but start with 12 partitions keyed by order_id so scaling never requires a repartition.</p><p><b>10x (280/s):</b> poller latency and single-threaded relay become the bottleneck; move to CDC tailing and per-partition relay leases. Consumer groups scale horizontally to partition count. Watch consumer DB dedup tables — prune marks older than broker retention, since anything older can't be redelivered.</p><p><b>100x (2,800/s):</b> the outbox <i>table</i> becomes a write hot spot on the order DB (every order = 6 extra inserts + pruning churn). Options in order: batch multiple events per outbox row per transaction; shard the order DB (outbox shards with it naturally); or graduate the busiest events to CDC directly off the order tables, keeping the envelope contract identical so consumers never notice. At this scale analytics should leave the transactional pipeline entirely for the stream-processing tier.</p>"
      },
      followups: [
        "The email consumer sent 40k duplicate emails during an incident. Dedup marks were being written — walk through how that can still happen and the fix.",
        "Product wants a new consumer to react to orders placed in the last 90 days, but broker retention is 7 days. Options?",
        "A consumer needs events from two topics (orders + refunds) joined per customer. Where does that state live?",
        "When would you keep some steps synchronous instead of evented? Argue payment specifically, both ways.",
        "How do you evolve an event schema when you must remove a field that one consumer still reads?",
        "The outbox relay double-published a batch after a failover and analytics counts are inflated. Who fixes what?"
      ],
      rubric: {
        senior: [
          "Commits state and event in one local transaction (outbox) and explains the crash window it closes.",
          "Treats the transport as at-least-once and builds dedup into every consumer, in the consumer's own transaction.",
          "Partitions by order_id for per-order ordering and says why global ordering isn't needed.",
          "Designs bounded retries with a DLQ, distinguishing transient from deterministic failures.",
          "Versions the event envelope and applies additive-only schema evolution."
        ],
        staff: [
          "Identifies the external-side-effect gap that a dedup table alone cannot close, and fixes it with provider idempotency keys plus claim/finalize.",
          "Chooses fat events deliberately to break runtime coupling, owning the staleness trade.",
          "Sizes the consumer-outage backlog and derives lag alerting thresholds from drain math.",
          "Treats DLQs as an organizational contract — ownership, runbooks, replay that preserves event_id.",
          "Anticipates the outbox table becoming the hot spot at scale and names the graduation path (batching, sharding, CDC)."
        ]
      }
    },
    {
      slug: "booking-saga-vs-2pc",
      name: "Saga or 2PC for a Multi-Service Booking Flow",
      category: "Architecture Patterns",
      difficulty: "Hard",
      minutes: 45,
      summary: "compensations, orchestration vs choreography, pivot transactions",
      statement:
        "<p>A travel platform books trips that span three services owned by three teams: flights (reserves a seat via an airline GDS), hotels (holds a room via a partner API), and payments (charges the card). A trip is only 'booked' when all three succeed; if any fails, the customer must end up with nothing held and nothing charged. Today this is one method with try/catch cleanup that misses cases — customers occasionally get charged with no flight, or a room stays held for days.</p><p>The team is split. One camp wants two-phase commit 'so it's just a transaction again'. The other wants a saga. You are the architect brought in to decide.</p><p>Make the call and defend it: why 2PC does or doesn't fit here, orchestration versus choreography for the saga, what each compensation actually does (and what it means that a compensated charge still shows on the customer's statement), how you order the steps, and what happens when a compensation itself fails at 2 a.m.</p>",
      clarifying: [
        "Do the external systems (GDS, hotel partner, card processor) even expose prepare/commit semantics, or only book/cancel?",
        "What holds are reversible and at what cost — is a flight cancellation free within 24h? Does a voided auth vs a refund differ on the statement?",
        "What is the customer-visible latency budget for 'booking…' — seconds of spinner, or async 'we'll email you'?",
        "How long may the system sit in a partially-booked state before it must resolve one way or the other?",
        "Failure rates per step: how often does each leg actually fail, and which fails most (that ordering matters)?",
        "Is there a manual-operations team today who resolves stuck bookings, and what tooling do they have?",
        "Are add-ons coming (car rental, insurance) — is this a 3-step flow forever or an N-step flow?"
      ],
      functional: [
        "A booking either completes fully (seat + room + charge) or resolves to a clean zero state with every hold released and no net charge.",
        "The customer sees a definitive outcome (confirmed / failed) within the latency budget, or an honest pending state that always resolves.",
        "Every saga instance is inspectable: current step, attempts, compensation status — support can answer 'where is my booking' precisely.",
        "Compensations are automatic; human escalation only when a compensation exhausts retries.",
        "Adding a fourth step (car rental) does not require rewriting the existing steps' logic."
      ],
      nonfunctional: [
        "No booking stuck in an ambiguous state longer than 15 minutes without either auto-resolution or a paged human.",
        "Happy-path booking completes in ≤ 8 s p95 (dominated by external API latency, not our machinery).",
        "The flow survives crash of the coordinating component at any point — state is durable, resumption automatic.",
        "External partner outage of 30 minutes degrades to queued/failed bookings, never to inconsistent ones.",
        "Financial invariant: at no point does completed-charge exist without either a confirmed trip or an initiated refund; reconciliation proves it daily."
      ],
      estimation: {
        prompts: [
          "Bookings/day and peak booking starts/sec — does this even need throughput engineering, or just correctness?",
          "Partial-failure volume: bookings/day × per-step failure rates → compensations/day the ops team will see.",
          "Stuck-saga math: if compensations fail 1% of the time, how many human escalations per week?",
          "Hold-expiry pressure: seat/room hold TTLs vs your worst-case retry timeline — where does the clock beat you?"
        ],
        worked:
          "<p>Assume 30k bookings/day, peak 3/s — throughput is a non-issue; every hard thing here is a correctness or ops problem.</p><pre>failure rates (measured, per attempt):\n  hotel hold  3%   flight reserve  2%   payment  4%\nP(at least one leg fails) ≈ 1 - (.97 × .98 × .96) ≈ 8.7%\n→ ~2,600 compensating runs/day — this is a PRODUCT flow, not an edge case</pre><p>Escalation load, the number that decides how much tooling to build:</p><pre>2,600 compensations/day × 1% compensation-failure ≈ 26 escalations/day\n→ that's a queue with an owner and an SLA, not an occasional page\n→ invest in the ops console up front, not after launch</pre><p>Hold-expiry clock: GDS holds commonly live minutes-to-hours, hotel holds ~24h, card auths ~7 days. Worst retry timeline (30-min partner outage + backoff) must stay inside the shortest hold, so the flight — shortest fuse, and the step whose failure strands the most value — anchors the step ordering and the retry budget (total ≤ 15 min before we abandon and compensate).</p>"
      },
      model: {
        highlevel:
          "<p>Decision first: <b>2PC is not available here, and would be wrong if it were.</b> 2PC requires every participant to expose prepare/vote and to hold locks while the coordinator decides. The GDS, the hotel partner, and the card network expose book/cancel APIs, not XA — you cannot enroll systems you don't own in a distributed transaction. Even internally, 2PC's blocking-on-coordinator-failure behavior is exactly what a customer-facing flow can't absorb. So: <b>orchestrated saga</b>.</p><pre>booking-svc ─▶ saga orchestrator (durable state machine, per booking)\n\n  step 1: RESERVE FLIGHT   (shortest hold, most constrained — go first)\n  step 2: HOLD HOTEL\n  step 3: AUTHORIZE card   ── pivot ──▶ step 4: CAPTURE + CONFIRM both\n\n  failure at step k → run compensations k-1 … 1 in reverse:\n    release hotel hold · cancel flight reserve · void auth\n  every transition = durable write (outbox) before the external call</pre><p>Orchestration over choreography, deliberately: with three teams and money involved, one durable state machine gives a single place where the flow is defined, observed, and evolved. Choreography (each service reacting to events) scatters the flow's correctness across three codebases — nobody can answer 'what are all the paths' without archaeology, and adding step 4 means touching everyone.</p>",
        data:
          "<p>The saga's state is the product. It must survive crashes and be legible to support.</p><pre>saga_instances\n  saga_id UUID PK, booking_id, state ENUM(\n    flight_reserving, hotel_holding, authorizing,\n    capturing_confirming,            -- past the pivot\n    compensating_hotel, compensating_flight, compensating_auth,\n    completed, compensated, needs_human)\n  current_attempt INT, next_wake_at TIMESTAMP, last_error TEXT\n\nsaga_steps\n  saga_id, step, attempt, direction ENUM(forward, compensate),\n  external_ref TEXT,     -- GDS locator / hold id / auth id\n  idempotency_key TEXT,  -- sent to the partner on EVERY call\n  status, started_at, finished_at\n</pre><p>Rules encoded here: every external call carries an idempotency key so crash-retry never double-books; every external reference is persisted <i>before</i> we consider the step done, because a compensation cannot cancel a hold whose id we lost; and <code>needs_human</code> is a first-class state with a queue behind it, not an exception log.</p>",
        deepdives:
          "<p><b>1. Step ordering and the pivot.</b> Order steps so the cheapest-to-compensate and most-likely-to-fail run earliest, and place the <b>pivot transaction</b> — the step after which you stop compensating backward and instead retry forward to completion — as late as possible. Here the pivot is capture: before it, everything is a reversible hold (void an auth and it never posts to the statement); after capture, we own the customer's money and the only acceptable direction is forward — retry the confirmations until they succeed or a human intervenes. This is also why we authorize-then-capture rather than charge outright: it converts the worst compensation (refund, 5-10 days on a statement, support tickets) into a void (invisible). Compensation is not an undo — the seat may resell at a different price, the customer sees a pending auth for a day — it is a <i>business-acceptable counteraction</i>, and product must sign off on what each one means.</p><p><b>2. When a compensation fails.</b> Compensations must themselves be idempotent and retried with backoff; but a hotel-partner outage can outlive the retry budget. The design answer is a semantic escrow: the saga parks in <code>compensating_hotel</code> with <code>next_wake_at</code> scheduling re-attempts for hours, escalating to <code>needs_human</code> only when the hold's own expiry will beat us anyway (many holds self-expire — sometimes the correct 'compensation' is verified expiry). The 2 a.m. rule: nothing pages a human if the system can safely keep retrying; pages are reserved for money-at-risk states (post-capture failures).</p><p><b>3. Isolation anomalies sagas allow.</b> Sagas give up isolation: between reserve and compensate, other reads see a seat held for a trip that won't exist. Countermeasures by anomaly: <i>semantic lock</i> (the hold itself, with TTL) prevents double-sale; <i>commutative updates</i> for counters; and customer-facing reads show saga-aware status ('finalizing') rather than raw step state. Name this honestly — pretending a saga is a transaction is how teams get burned.</p>",
        tradeoffs:
          "<p>We chose <b>saga over 2PC</b> because the participants are external systems without prepare/vote semantics, and because 2PC converts coordinator failure into global blocking — availability we can't sacrifice in checkout; the price is lost isolation and compensation semantics leaking into the product, which we pay down with holds, pivots-late ordering, and product-approved compensation definitions. We chose <b>orchestration over choreography</b> because the flow's correctness must live somewhere one team can own, test, and evolve; the price is the orchestrator as a critical component — mitigated by making it a durable, crash-resumable state machine rather than an in-memory loop, and keeping it free of business logic that belongs in the steps. We chose <b>auth-capture over immediate charge</b> to make the money step reversible until the pivot; the price is auth expiry as one more clock to manage. The residual risk we watch: compensation code paths are exercised 8.7% of the time — high enough to stay honest, but still test them with fault injection, because untested compensations are the try/catch mess with better branding.</p>",
        scaling:
          "<p><b>Now (3/s peak):</b> orchestrator as a library + DB state machine inside the booking service, woken by a scheduler. No workflow engine needed; the table above is enough.</p><p><b>More flows (car, insurance, packages):</b> the step/compensation contract becomes a paved road — each new leg implements reserve/confirm/cancel with idempotency keys, and registers into a flow definition. This is the point where adopting a workflow engine (Temporal-class) pays: durable timers, retries, and history come free, and the org has more than one team writing sagas.</p><p><b>10-100x volume:</b> saga state partitions naturally by saga_id; external partners' rate limits become the ceiling long before your machinery does — so per-partner concurrency budgets and admission control (queue booking starts) matter more than orchestrator throughput. The daily financial reconciliation (auths vs captures vs confirmed trips) scales from a script to a first-class pipeline; it is the invariant's ultimate backstop at any size.</p>"
      },
      followups: [
        "A teammate says 'use choreography, orchestrators are a single point of failure.' Rebut or agree with precision.",
        "The hotel partner starts returning success after actually failing (their bug). Which of your safeguards notices, and when?",
        "Product wants 'reserve now, pay later' — payment moves days after booking. What does that do to your pivot and your states?",
        "Walk through a crash exactly between the capture succeeding and the saga state committing. Where does the money go?",
        "When would 2PC be the right answer? Name a concrete internal scenario where you'd actually use it.",
        "How do you fault-inject compensation paths in staging when the real GDS charges per call?"
      ],
      rubric: {
        senior: [
          "Rules out 2PC on participant capability and blocking behavior, not on fashion.",
          "Designs a durable, crash-resumable orchestrator with persisted external references and idempotency keys on every call.",
          "Orders steps by compensation cost and failure likelihood, and uses auth/capture to keep money reversible.",
          "Makes compensation failure a designed state with retries, timers, and an escalation queue.",
          "Defines what each compensation actually does in business terms, including statement visibility."
        ],
        staff: [
          "Names the pivot transaction and derives the forward-only regime after it from the financial invariant.",
          "States the isolation anomalies sagas admit and pairs each with a countermeasure (semantic locks, TTL holds, saga-aware reads).",
          "Sizes the compensation and escalation volume from failure rates and staffs/tools the ops queue accordingly.",
          "Chooses orchestration for organizational legibility across three teams, and can say when choreography wins instead.",
          "Backstops the whole design with independent reconciliation, treating it as the invariant's proof rather than optional hygiene."
        ]
      }
    },
    {
      slug: "vendor-circuit-breaker",
      name: "Contain a Flaky Vendor API Before It Sinks You",
      category: "Architecture Patterns",
      difficulty: "Medium",
      minutes: 40,
      summary: "circuit breaker states, bulkheads, fallback design",
      statement:
        "<p>Your product depends on a third-party address-verification vendor. Every checkout and every account-creation flow calls it. The vendor is usually fine, but two or three times a month it degrades: p99 latency jumps from 150 ms to 20+ seconds, or it starts returning 5xx for an hour. Last month's episode took your whole checkout down — not because addresses matter that much, but because every request thread in the fleet ended up parked waiting on the vendor, and the thread pools starved out everything else, including flows that never touch addresses.</p><p>Design the containment layer: timeouts, a circuit breaker with defensible thresholds, bulkheads so vendor slowness can't consume shared resources, and fallbacks per flow. Then go further than the pattern names — how do you tune the breaker so it neither flaps on noise nor sleeps through real failures, how do you test this, and how do you stop the retry logic you add from becoming a DDoS against a recovering vendor?</p>",
      clarifying: [
        "Per flow, what does address verification actually protect — fraud, shipping cost, deliverability? What is the real cost of skipping it once?",
        "What's the vendor call profile: QPS, normal p50/p99, and the shape of past incidents (slow vs erroring vs mixed)?",
        "Is the response cacheable — do the same addresses recur (warehouse-heavy B2B) or is every address novel (consumer)?",
        "What concurrency model do the calling services use — thread-per-request pools, or async I/O? Bulkhead design differs.",
        "Does the vendor publish rate limits and a status page, and does our contract have an SLA with credits worth enforcing?",
        "Is there a second vendor we could dual-source, and what would integration parity cost?",
        "Which flows are synchronous-critical (checkout) vs deferrable (batch address cleanup)?"
      ],
      functional: [
        "Vendor failure or slowness never blocks checkout: flows degrade to a defined fallback (accept unverified + flag for async re-check) automatically.",
        "A circuit breaker per vendor endpoint opens on sustained failure, serves fallback instantly while open, and probes recovery without a thundering herd.",
        "Vendor calls run in an isolated resource pool (bulkhead) sized so exhaustion affects only vendor-dependent operations.",
        "Breaker state, trip events, and fallback rates are observable and alerting — a silent open breaker is an outage you don't know about.",
        "Operators can force a breaker open or closed manually during incidents and vendor maintenance windows."
      ],
      nonfunctional: [
        "Checkout p99 impact bounded: vendor timeout budget ≤ 800 ms inline; beyond that the flow proceeds on fallback.",
        "Breaker reacts to a genuine outage within 30 s and does not trip on blips shorter than its rolling window.",
        "During a full vendor outage, added load on our own services is near-zero (fail fast, no queued retries in the hot path).",
        "Recovery probing keeps vendor traffic ≤ 1% of normal until confirmed healthy, then ramps over minutes.",
        "The containment layer itself adds ≤ 1 ms overhead when the vendor is healthy."
      ],
      estimation: {
        prompts: [
          "Thread-starvation math: fleet request threads vs vendor QPS × 20 s hang time — how fast does the old design die?",
          "Bulkhead sizing: Little's Law on vendor concurrency (QPS × normal latency) with headroom.",
          "Breaker window math: at your QPS, how many samples land in a 10 s window, and what error-rate threshold is statistically meaningful?",
          "Cache math: address repeat rate × TTL → achievable hit ratio and vendor bill reduction."
        ],
        worked:
          "<p>Why the fleet died, in numbers: 60 vendor calls/s across 12 instances with 200-thread pools = 2,400 threads total.</p><pre>vendor hangs at 20 s → threads parked = 60/s × 20 s = 1,200 threads\n→ HALF the fleet's threads gone in 20 seconds, all of them in ~40 s\n   (that matches the incident timeline: total brownout in under a minute)</pre><p>Bulkhead sizing via Little's Law — concurrency = arrival rate × latency:</p><pre>healthy: 60/s × 0.15 s ≈ 9 concurrent calls\nbulkhead = 30 permits (3x headroom) + queue of 0 in the hot path\nworst case now: 30 threads stuck, 1.25% of fleet capacity — contained</pre><p>Breaker window: at 60/s, a 10 s rolling window holds ~600 samples — plenty to trust a 50% error threshold with a 20-call minimum. At a low-traffic endpoint doing 0.5/s, the same window holds 5 calls; one flaky call is 20% — hence per-endpoint minimum-volume floors, not one global config. Cache: consumer addresses repeat weakly (~15%) but retries and back-button resubmits repeat strongly; a 24 h TTL cache still cuts ~25% of calls and, during outages, serves as a partial fallback.</p>"
      },
      model: {
        highlevel:
          "<p>Layered containment, applied in this order because each layer assumes the previous: <b>timeout → bulkhead → circuit breaker → fallback</b>, wrapped around every vendor call site via a shared client library (one implementation, not five copies).</p><pre>caller ─▶ vendor-client\n           ├─ 1 timeout: connect 200 ms / total 800 ms  (no timeout,\n           │             no containment — everything else is moot)\n           ├─ 2 bulkhead: 30 permits, acquire-or-fail-fast\n           ├─ 3 breaker per endpoint:\n           │     CLOSED ─(err% ≥ 50 over ≥20 calls in 10 s, or\n           │              slow-call% ≥ 50 at &gt;800 ms)──▶ OPEN\n           │     OPEN ─(after 30 s cool-off)──▶ HALF-OPEN\n           │     HALF-OPEN: 5 probe calls → all pass: CLOSED\n           │                              → any fail: OPEN (backoff ×2, cap 5 m)\n           └─ 4 fallback per FLOW (not per client):\n                checkout: accept + enqueue async re-verify\n                account:  cache lookup → accept-with-flag\n                batch:    pause and drain later</pre><p>The slow-call trigger matters as much as the error trigger: the incident that killed checkout was latency, not errors — a breaker watching only 5xx would have slept through it.</p>",
        data:
          "<p>Not a storage-heavy problem, but the states and contracts deserve precision:</p><pre>breaker config (per endpoint, hot-reloadable)\n  window: rolling 10 s (count-based min 20)\n  failure_rate_threshold: 50%\n  slow_call_threshold: 800 ms, slow_rate_threshold: 50%\n  open_cooloff: 30 s, half_open_probes: 5, open_backoff: exp ×2 cap 300 s\n  manual_override: FORCED_OPEN | FORCED_CLOSED | AUTO\n\nfallback contract (what callers receive)\n  {\"verified\": false, \"source\": \"fallback|cache|vendor\",\n   \"recheck_enqueued\": true}\n  -- callers branch on source; nothing downstream may treat\n  -- fallback output as vendor truth (fraud scoring reads source)\n\nasync re-verify queue\n  order_id, address, enqueued_at  — drained when breaker closes;\n  mismatches → correction workflow before the shipping label prints</pre><p>The fallback contract is the part teams skip: a fallback that silently impersonates a real answer poisons downstream decisions (fraud models, shipping estimates). Degraded data must be labeled as degraded.</p>",
        deepdives:
          "<p><b>1. Tuning so it neither flaps nor sleeps.</b> Flapping comes from small samples and instant reclose: fix with minimum-volume floors (20 calls), rate-over-window rather than consecutive-failure counting, and exponential open-state backoff so a still-sick vendor is probed at 30 s, 60 s, 120 s… not hammered every 30 s forever. Sleeping-through comes from watching the wrong signal: include slow-call rate, and set the slow threshold from the vendor's <i>healthy</i> p99 (~150 ms) with margin — 800 ms — not from your own patience. Derive thresholds from measured baselines, put them in dynamic config, and revisit after every real trip: the first config is a hypothesis, not a constant.</p><p><b>2. Bulkhead placement and the retry-storm trap.</b> The bulkhead isolates the vendor's concurrency from the shared request pool — permits (semaphore) for async stacks, a dedicated small pool for thread-per-request. But containment can be undone one layer up: if callers retry rejected calls, or a gateway retries 503s, open-breaker fast-failures multiply into a storm that hits the vendor exactly when it's recovering. Rules: retries live in ONE layer (the vendor client), never stacked; retry budget ≤ 1 retry with jittered backoff, and <i>zero</i> retries when the failure came from the breaker or bulkhead (those are decisions, not accidents); the async re-verify queue drains with a concurrency cap that respects the ramp-up rate. Herd math is unforgiving: 12 instances × independent probes can multiply recovery load — coordinate probes per-instance-randomized so the vendor sees a trickle.</p><p><b>3. Testing the thing nobody tests.</b> Breaker logic that first executes during a real outage is unverified code in production. Three tiers: unit-test the state machine with a fake clock (window edges, backoff caps, manual overrides); fault-inject in staging with a vendor stub that replays the real incident shapes (20 s hangs, 5xx bursts, mixed 30% degradation — the hardest shape, since it hovers at thresholds); and run a production game day quarterly using the manual FORCED_OPEN override to verify fallbacks, alerts, and the re-verify drain actually work at real traffic. The mixed-degradation replay is where most configs fail their first contact.</p>",
        tradeoffs:
          "<p>We chose <b>fail-open (accept unverified addresses) over fail-closed (block checkout)</b> because the measured cost of a wrongly-accepted address (a correction workflow, occasional re-ship) is far below the cost of zero revenue during a vendor hour; this is a product decision made explicit and signed off, with the async re-verify shrinking the exposure window — and it would flip for a vendor whose check is load-bearing for compliance (sanctions screening fails closed, full stop). We chose <b>per-endpoint breakers over one vendor-wide breaker</b> because vendors degrade unevenly (verify can be down while autocomplete is fine); cost is more state and config, handled by the shared library. We chose <b>a semaphore bulkhead over a separate thread pool</b> for the async services (cheaper, no context-switch tax) and a small dedicated pool for the legacy servlet stack — the pattern bends to the concurrency model, not vice versa. Residual risk: the fallback path itself is now load-bearing during incidents and must be capacity-tested; a fallback that ORMs its way into the same database lock as the main flow just moves the outage."
        ,
        scaling:
          "<p><b>One vendor, five call sites (now):</b> shared client library with config-driven breaker + bulkhead; alerts on trip events and fallback rate. Resist the service-mesh pitch at this size — a library is debuggable by the team that owns the flow.</p><p><b>Many vendors, many teams:</b> promote the pattern to platform: mesh- or sidecar-level breakers give uniform telemetry and manual overrides across languages, while <i>fallback logic stays in the application</i> — infrastructure can fail fast, only the product knows what degraded-but-acceptable means per flow. A vendor-health dashboard (breaker states fleet-wide) becomes the incident commander's first screen.</p><p><b>Strategic scale:</b> dual-source the truly critical vendors: same client interface, weighted routing, breaker-per-vendor, automatic failover when one side's breaker opens — at which point the breaker has grown from a defense mechanism into a routing signal, which is the pattern reaching maturity. The contract/SLA lever matters here too: measured trip minutes and fallback rates are the evidence that funds the second vendor or wins the credit negotiation.</p>"
      },
      followups: [
        "Your breaker opened correctly but nobody noticed for 6 hours and 40k orders shipped unverified. What was missing, and is that an engineering or product failure?",
        "The vendor says your recovery probes violate their rate limit during their incidents. How do you probe a rate-limited vendor politely?",
        "A new team wraps your client in their own retry-3-times helper. What breaks, and what governance prevents it?",
        "When is a circuit breaker the wrong tool — name a dependency where you would deliberately not use one.",
        "How would you decide between investing in the second vendor vs a richer cache/fallback for the first?",
        "The vendor's status page says green during your trips. Whose telemetry wins the SLA-credit argument, and how do you make yours court-worthy?"
      ],
      rubric: {
        senior: [
          "Layers timeout, bulkhead, breaker, fallback in the right order and explains why timeouts are the foundation.",
          "Adds a slow-call trigger, not just error rate — matching the actual incident shape.",
          "Sizes the bulkhead with Little's Law from measured latency and QPS, with stated headroom.",
          "Designs per-flow fallbacks with a labeled degraded-data contract, not one generic 'return null'.",
          "Includes half-open probing with backoff and manual override states."
        ],
        staff: [
          "Runs the thread-starvation arithmetic to explain the original outage mechanically, not anecdotally.",
          "Prevents retry storms structurally: single retry layer, zero retries on breaker/bulkhead rejections, coordinated probe ramp.",
          "Frames fail-open vs fail-closed as a product decision with a cost model, and names a case where it flips.",
          "Tests the containment layer as a first-class artifact: state-machine units, incident-replay fault injection, production game days.",
          "Positions the pattern organizationally: library now, mesh at multi-team scale, fallbacks staying in the app — and uses breaker telemetry as SLA evidence."
        ]
      }
    },
    {
      slug: "dashboard-cqrs-decision",
      name: "Does This Dashboard Actually Need CQRS?",
      category: "Architecture Patterns",
      difficulty: "Medium",
      minutes: 40,
      summary: "read models, denormalization ladder, resisting resume-driven design",
      statement:
        "<p>A B2B SaaS product has an analytics dashboard: each customer sees order volumes, fulfillment status breakdowns, and trend charts over their own data. The dashboard reads hammer the same Postgres that serves the transactional workload — some aggregate queries scan millions of rows, p95 dashboard load is 6 seconds, and twice last quarter a heavy dashboard query degraded checkout writes. Reads outnumber writes about 200:1 on the affected tables.</p><p>A senior engineer has written a design doc proposing full CQRS with event sourcing: separate command and query services, an event store as the source of truth, and projections feeding a dedicated read database. It is a competent doc. Your job as architect is to review it: steelman it, then decide what this problem actually needs.</p><p>Walk the escalation ladder from 'add an index' to full CQRS, name the cheapest rung that meets the requirements, and specify what evidence would justify climbing further. Then design the rung you chose properly — including how stale the read side may be and how you'd communicate that.</p>",
      clarifying: [
        "Which queries are actually slow — is it 3 aggregate shapes or 30? Get the pg_stat_statements top list before designing anything.",
        "How fresh must dashboard data be — is 60 s staleness acceptable? 5 minutes? Does any number on it drive a same-minute operational decision?",
        "Is the write model itself awkward for the domain, or is it fine and only the reads hurt? (CQRS fixes the former; cheaper tools fix the latter.)",
        "Do we need audit/temporal queries ('state as of last Tuesday') that would independently justify event sourcing?",
        "What's the team's operational maturity — who runs the event store, projections, and replay tooling on-call?",
        "What growth is projected — will 200:1 become 2000:1, and will multi-tenant aggregates outgrow row-store scans regardless?",
        "Are the degradation incidents purely dashboard-query contention, or is connection-pool sizing / missing statement timeout part of it?"
      ],
      functional: [
        "Dashboard p95 load ≤ 1 s for every customer, including the largest tenant.",
        "Dashboard queries can never degrade transactional writes — enforced by isolation, not by hope.",
        "Read data staleness ≤ 60 s, with the actual freshness shown on the dashboard ('as of 12:04:31').",
        "New chart types can be added without new load on the transactional primary.",
        "Historical trends retained for 24 months at daily granularity, 90 days at hourly."
      ],
      nonfunctional: [
        "The chosen design is operable by the existing team without a new specialist on-call rotation.",
        "Each rung of the design is reversible or evolvable to the next rung without data loss or a rewrite.",
        "Read-side rebuild from the source of truth completes in under 4 hours (corruption recovery bound).",
        "Cost ceiling: read-side infrastructure ≤ 20% of current database spend.",
        "Correctness: read-side aggregates reconcile against the primary within 0.1% daily."
      ],
      estimation: {
        prompts: [
          "Read vs write QPS on the affected tables, and what the 200:1 ratio implies about where to spend.",
          "Working-set math: rows scanned by the worst query × tenants × refresh rate — how much compute is being burned re-aggregating unchanged data?",
          "Rollup table size: tenants × metrics × hourly buckets × 24 months.",
          "Full-CQRS overhead honestly costed: components added, on-call surface, engineer-months to first value."
        ],
        worked:
          "<p>Measure the waste before designing: the worst query aggregates ~2M rows per large tenant, and dashboards auto-refresh every 60 s.</p><pre>reads: ~400 dashboard QPS vs ~2 write QPS on these tables (200:1)\nre-aggregation burn: 2M rows × 300 tenants × 1 refresh/min —\n  but &lt;0.1% of those rows changed in the last minute\n→ we recompute ~99.9% identical answers, forever. The problem is\n  WHERE reads run and WHAT shape the data is in — not command/query\n  service separation.</pre><p>Rollup sizing shows how small the right answer is:</p><pre>300 tenants × 40 metrics × 24 h × 730 d ≈ 210M hourly rows worst case\n→ with 90-day hourly retention + daily beyond: ~30M rows, ~6 GB\n   a single modest read store holds this with room to grow 20x</pre><p>Full-CQRS cost for contrast: event store + command service + query service + projection workers + replay tooling ≈ 4-6 new operational components, realistically 2-3 engineer-quarters to parity. Against a 6 GB rollup problem, that is a two-order-of-magnitude mismatch between solution mass and problem mass.</p>"
      },
      model: {
        highlevel:
          "<p>The escalation ladder, cheapest first — each rung only if the previous demonstrably fails the requirements:</p><pre>rung 0  statement_timeout + separate connection pool for dashboards\n        (stops reads killing writes TODAY, whatever else we build)\nrung 1  indexes / partial indexes for the top offender queries\nrung 2  read replica — dashboards read it, physically isolated\nrung 3  precomputed rollups (hourly/daily aggregate tables),\n        incrementally maintained ← THE RUNG THIS PROBLEM NEEDS\nrung 4  dedicated read store fed by CDC (denormalized projections)\nrung 5  full CQRS: separate command/query services\nrung 6  + event sourcing as the system of record</pre><p>Chosen design = rung 2 + 3 combined: replica for isolation, rollups for speed.</p><pre>app writes ─▶ Postgres primary ══ streaming replication ══▶ replica\n                   │                                          ▲\n                   └─ incremental rollup job (every 60 s):     │\n                      aggregate rows changed since last        │\n                      watermark → UPSERT rollup tables ────────┘\ndashboard API ─▶ replica: rollup tables only (never raw scans)</pre><p>This is, honestly stated, CQRS's <i>idea</i> — a read model shaped for reads — at 10% of its ceremony: same database technology, same team, same deployment, no new source of truth.</p>",
        data:
          "<p>Rollup schema and the watermark that makes maintenance incremental:</p><pre>rollup_hourly\n  tenant_id, metric, bucket_ts, dims JSONB, value NUMERIC\n  PK (tenant_id, metric, bucket_ts, dims)\nrollup_daily      -- same shape; hourly compacts into it past 90 d\nrollup_watermark\n  job_name, last_processed_at, last_source_id\n\nincremental job (every 60 s):\n  SELECT … FROM orders WHERE updated_at &gt; watermark      -- needs the\n  GROUP BY tenant, metric, hour → UPSERT rollups          -- updated_at\n  advance watermark in the same transaction               -- index\n\ndashboard API\n  GET /api/dashboard/{tenant}/metrics?range=30d\n   → {\"as_of\": \"2026-08-21T12:04:31Z\", \"series\": […]}   -- staleness is\n                                                          -- part of the\n                                                          -- contract</pre><p>Late-arriving updates (an order edited from last week) are why UPSERT-by-bucket beats append-only counters: the job recomputes any bucket containing changed rows, so corrections flow through automatically. The <code>as_of</code> field turns staleness from a support ticket into a displayed fact.</p>",
        deepdives:
          "<p><b>1. Steelmanning the CQRS doc — then locating the actual claim.</b> Real CQRS benefits: read and write models can diverge fully (different stores, different shapes), scale independently, and event sourcing adds a perfect audit log and time travel. The honest test is: which stated requirement needs model <i>divergence</i> rather than read <i>relocation</i>? Here, none — the write model is fine, freshness tolerance is 60 s, and no temporal-audit requirement exists. The doc's strongest card, 'new charts without touching the primary', is fully served by rung 3-4. Write the decision down with its triggers: adopt rung 4 (CDC-fed read store) when rollup shapes stop fitting SQL aggregation (e.g. funnel/path queries) or the replica can't hold the read load; adopt rung 5-6 only if the domain develops genuine command-model complexity or a legal audit-trail requirement. That gives the engineer's ambition a legitimate on-ramp instead of a flat no.</p><p><b>2. The failure modes of the rung you chose.</b> Rollups drift (bug in the job, missed watermark window, clock skew on updated_at): run a nightly reconciliation that recomputes a random 1% of buckets from raw data and alerts on &gt;0.1% divergence. Replica lag spikes during vacuum/bulk loads: the dashboard's <code>as_of</code> reflects true watermark time, and alerting fires at 5 min lag. Rebuild story: rollups are derived data — a full recompute from the primary is a 4-hour batch job, tested quarterly, which is precisely the cheap replayability that event-sourcing advocates want, obtained without changing the system of record.</p><p><b>3. Why rung 0 ships this week regardless.</b> The checkout-degradation incidents are a resource-governance failure independent of architecture: dashboards sharing the primary's connection pool with no <code>statement_timeout</code>. A separate pool with timeout + <code>work_mem</code> caps stops the bleeding in days, buys political time, and — importantly for the review — demonstrates that the incidents were never an argument for CQRS at all. Distinguishing 'what stops the pain now' from 'what the end-state needs' is the architect's core move in this review.</p>",
        tradeoffs:
          "<p>We chose <b>rollups on a replica over full CQRS</b> because the requirement is read relocation and pre-aggregation, not model divergence; we pay with SQL-shaped read models only (no arbitrary projections) and a 60 s freshness floor — both inside stated requirements. We chose <b>incremental watermark maintenance over triggers or full nightly recompute</b> because triggers tax every transactional write (the thing we're protecting) and nightly recompute misses the 60 s freshness bar; we pay with watermark/late-data machinery, contained in one job. We chose <b>same-technology (Postgres) read side over a specialized OLAP store</b> to stay inside the team's operational competence; the exit trigger is written down (query shapes or volume the replica can't serve). The decision-process trade matters most: by publishing the ladder with evidence-based triggers, we spend a little authority telling a good engineer 'not yet' and buy the org protection from resume-driven architecture — while keeping the path open for the day the evidence arrives.</p>",
        scaling:
          "<p><b>Now (300 tenants):</b> primary + 1 replica + rollup job + rung-0 governance. Dashboard p95 drops from 6 s to ~100 ms because every chart is a rollup point-range scan.</p><p><b>10x tenants / bigger tenants:</b> replica count scales reads linearly; rollup job partitions by tenant range if the 60 s cycle can't keep up. Hourly table hits ~2B rows → native partitioning by bucket month, compaction to daily beyond 90 days as designed. Still no new technology.</p><p><b>Requirement change, not scale, triggers rung 4+:</b> product wants sub-second freshness on live ops views, or ad-hoc funnel analytics rollups can't express → CDC (logical decoding) into a purpose-built store (columnar/OLAP) fed by the same watermark discipline. The rollup schema becomes the projection contract, so dashboards migrate store-by-store, not big-bang. If event sourcing ever genuinely arrives (audit mandate), it arrives as a new system of record for specific aggregates — a domain decision made on domain evidence, not a performance fix that grew.</p>"
      },
      followups: [
        "The senior engineer counters: 'rollups ARE projections, so we're half-doing CQRS badly — do it properly.' Respond.",
        "A tenant disputes a dashboard number against a raw export taken 30 seconds later. Walk the support path your design gives them.",
        "Product now wants alerts within 5 seconds of a metric crossing a threshold. Which rung does that force, for which data?",
        "How would your answer change if the write model were genuinely painful — say, order state transitions scattered across 14 tables with race conditions?",
        "The rollup job silently died Friday night; Monday's dashboards show flat lines and three customers filed tickets. What detection was missing?",
        "Where would you actually recommend event sourcing? Name a domain and the requirement that earns it."
      ],
      rubric: {
        senior: [
          "Walks an explicit escalation ladder and picks the cheapest rung meeting stated requirements.",
          "Separates the isolation problem (replica, pools, timeouts) from the speed problem (rollups).",
          "Designs incremental rollup maintenance with watermarks, UPSERT semantics, and late-data handling.",
          "Makes staleness an explicit, displayed contract rather than a hidden property.",
          "Ships a rung-0 mitigation immediately instead of waiting for the end-state design."
        ],
        staff: [
          "Steelmans the CQRS proposal and identifies the precise claim (model divergence) the requirements don't make.",
          "Quantifies the mismatch: solution mass (components, quarters, on-call) against problem mass (6 GB of rollups).",
          "Writes down evidence-based triggers for climbing each rung, converting 'no' into 'not yet, and here's what changes it'.",
          "Builds reconciliation and rebuild paths so the derived read side is provably correct and cheaply recoverable.",
          "Handles the human dimension: protects the org from resume-driven design without burning a good engineer's trust."
        ]
      }
    }
  );
})();
