(function () {
  "use strict";
  window.DESIGN_QUESTIONS = window.DESIGN_QUESTIONS || [];
  window.DESIGN_QUESTIONS.push(
    {
      slug: "inventory-oversell-cap",
      name: "Inventory Oversell: CAP on a Real Feature",
      category: "Distributed Judgment",
      difficulty: "Hard",
      minutes: 45,
      summary: "CP vs AP per operation, reservations, oversell as a business dial",
      statement:
        "<p>A retailer sells limited-stock items — sneaker drops, clearance lots, concert merch — from warehouses behind a multi-region storefront. During a drop, thousands of buyers race for a few hundred units. The current system decrements a stock counter in one primary database; during the last big drop, cross-region latency to that primary stretched checkout to 4+ seconds, and when the primary's region had a 90-second blip, every region stopped selling everything.</p><p>Leadership asks for 'no oversell, no downtime, fast everywhere.' You know CAP means you cannot have all three unconditionally: when a partition happens, each operation must choose consistency or availability. Your job is to make that choice <i>per operation</i>, on purpose, with the business in the room.</p><p>Design the inventory system: which operations are CP, which are AP, how reservations bound the blast radius of each choice, and how you turn 'oversell' from an engineering sin into a priced business decision.</p>",
      clarifying: [
        "What does one oversold unit actually cost — an apology email and a refund, or a contractual penalty (marketplace SLA, ticketed event)?",
        "Is stock physically partitioned by warehouse/region already, or is it one global pool any region can sell?",
        "What fraction of the catalog is contended? Drops are rare SKUs; is the long tail effectively uncontended?",
        "Latency target per region for add-to-cart vs for final purchase — do they need the same guarantee?",
        "How long may a reservation hold stock (cart TTL), and what's the measured cart-abandonment rate?",
        "During a region partition, is 'stop selling the contended SKUs but keep selling everything else' acceptable to the business?",
        "Are there flash-sale calendar signals we can use to pre-position stock and pre-scale, or are spikes unannounced?"
      ],
      functional: [
        "Browsing and product pages always render, showing possibly-stale availability with honest wording ('low stock' not exact counts).",
        "Add-to-cart takes a reservation with a TTL; expired reservations return stock automatically.",
        "Final purchase confirms against an authoritative allocation — oversell bounded to an explicit, configured tolerance (which may be zero for some SKUs).",
        "Stock can be split and rebalanced across regional pools without taking sales offline.",
        "Operators can flip a SKU between strict (CP) and tolerant (AP) modes without a deploy."
      ],
      nonfunctional: [
        "Add-to-cart p99 ≤ 150 ms in-region during drops; purchase confirm p99 ≤ 1 s.",
        "A single-region failure never stops other regions selling their allocated stock.",
        "Oversell on tolerant SKUs bounded to the configured percentage even under partition; strict SKUs never oversell, accepting unavailability instead.",
        "Reconciliation detects any pool-vs-ledger divergence within 5 minutes.",
        "System handles a 500x read spike and 100x reservation spike on a single SKU at drop time."
      ],
      estimation: {
        prompts: [
          "Drop-moment load: watchers vs units — what ratio of reservation attempts to stock should you expect in the first second?",
          "Regional allocation math: units per region under proportional split, and how quickly a hot region exhausts its lease.",
          "Oversell exposure: if a partition lasts 90 s with AP writes at measured attempt rates, what is worst-case oversell per SKU with and without regional caps?",
          "Reservation churn: cart TTL × abandonment rate → how much stock is in limbo at any moment and the return-flow rate."
        ],
        worked:
          "<p>A representative drop: 500 units, 200k people watching, sales open at 10:00.</p><pre>first second: ~40k reservation attempts (20% of watchers instantly)\n→ 80:1 attempts per unit; the system's real job is REJECTING\n  39,500 requests/s gracefully, not processing 500 sales fast</pre><p>Regional leases, 4 regions, demand-weighted split (us-east hottest):</p><pre>allocation: 200/150/100/50. us-east at ~15k attempts/s drains its\n200-unit lease in tens of ms — every later attempt needs only the\nLOCAL 'sold out here' answer, no cross-region call. Rebalance sweep\nevery 5 s moves unsold units toward regions still selling.</pre><p>Partition exposure — the number that prices the AP choice:</p><pre>strict mode: partitioned region stops selling that SKU. Lost sales,\n  zero oversell.\ntolerant mode with local cap: partitioned region may sell only its\n  remaining lease (say 37 units) — worst-case oversell = 0 because the\n  lease IS the bound. Oversell only appears if we let a region exceed\n  its lease; cap overshoot at +5% → worst case 10 units on 200.\nlimbo stock: 30% abandonment × 10-min TTL at 500 res/min steady state\n  ≈ 1,500 units reserved-not-bought at any time on the wider catalog —\n  the return flow, not the sale flow, sets steady-state accuracy.</pre>"
      },
      model: {
        highlevel:
          "<p>Core move: stop treating stock as one global counter (which forces a global consistency choice) and <b>partition it into regional leases</b>, so most operations become local. CAP still applies, but you shrink the set of operations that ever need cross-region agreement.</p><pre>            allocator (source of truth: total per SKU)\n                 │  leases: {us-east:200, eu:150, apac:100, us-west:50}\n     ┌───────────┼───────────────┬─────────────┐\n     ▼           ▼               ▼             ▼\n regional pool  regional pool   regional pool  regional pool\n  (CP locally: atomic reserve/confirm/release against the lease)\n     ▲                    every 5 s: usage reports ▲ / rebalance ▼\n\n reads (browse):      AP — cached counts, stale ok, worded honestly\n add-to-cart:         CP against LOCAL pool only (fast + strict)\n purchase confirm:    CP local pool + payment; decrements lease\n lease rebalance:     async, eventual — the only cross-region flow\n partition behavior:  region keeps selling ITS lease; allocator\n                      unreachable → no top-ups, sell-to-lease-then-stop\n                      (strict) or +5% overshoot (tolerant SKUs)</pre><p>The lease converts CAP from one global dilemma into a bounded local contract: consistency where money changes hands, availability everywhere else, and the partition-time behavior is a number (the lease) rather than a hope.</p>",
        data:
          "<p>Three records matter: the allocation ledger, the regional pool, and the reservation.</p><pre>allocation_ledger (allocator DB, strongly consistent)\n  sku, total_units, leases {region: granted, confirmed_sold},\n  policy ENUM(strict, tolerant), overshoot_pct, version\n\nregional_pool (per-region store, atomic ops)\n  sku, leased, reserved, sold        -- invariant:\n  reserved + sold ≤ leased (+ overshoot if tolerant)\n\nreservations (per-region)\n  res_id UUID, sku, qty, cart_id, expires_at, state\n  -- reserve = single atomic op:\n  --   IF reserved+sold+qty ≤ cap THEN reserved += qty  ELSE reject\n  -- expiry sweeper: state→expired, reserved -= qty  (idempotent)\n\nAPI\n  POST /reserve {sku, qty}   → 200 {res_id, expires_at} | 409 sold_out\n  POST /confirm {res_id}     → 200 | 410 expired\n  POST /release {res_id}     → 204 (idempotent)</pre><p>Every quantity change flows through reserve/confirm/release/expire events into the ledger asynchronously — the ledger is the reconciliation truth, the pools are the fast path, and divergence between them is a detectable defect, not a mystery.</p>",
        deepdives:
          "<p><b>1. Where exactly CAP bites, operation by operation.</b> Browse reads: AP, trivially — stale 'in stock' costs a later 409, priced near zero if copy says 'selling fast' instead of '3 left'. Reservation: CP <i>within the region</i> — a partition between regions doesn't touch it; only a partition between a user and their nearest region does, and that's ordinary unavailability, routed around by anycast. The allocator is the deliberate CP island: lease grants and rebalances need agreement, so they run on a consensus-backed store — but they're background flows, so allocator unavailability degrades <i>rebalancing</i>, not selling. This is the architect's CAP answer in one line: <b>place the consistency boundary so that partition-time unavailability lands on flows that can wait.</b></p><p><b>2. Oversell as a dial, not a sin.</b> Strict mode buys zero oversell at the price of lost sales during partitions and exhausted leases; tolerant mode buys continued selling at the price of ≤ overshoot_pct apology-and-refund events, each costing roughly (refund handling + goodwill credit) ≈ $15-40. Put those two prices in a spreadsheet with drop revenue and let the business set the dial per SKU class — limited editions strict, clearance tolerant. The engineering deliverable is that the dial <i>holds under partition</i>: overshoot is enforced by the local cap arithmetic, not by best-effort coordination that partitions disable.</p><p><b>3. The failure that actually gets you: duplicate confirms and lost releases.</b> Retry storms at drop moments mean every mutation arrives ≥1 times. Reserve/confirm/release are idempotent by res_id; the expiry sweeper and release race benignly (both decrement-once via state check). The ugly case is a region dying mid-drop with reservations in flight: its lease state is rebuilt from the replicated pool log, and any truly lost reservations expire by TTL — stock returns within one cart window. Worst case customer impact: someone's cart 'lost' a hold; that is an apology, not oversell, and it's the correct side to err on.</p>",
        tradeoffs:
          "<p>We chose <b>partitioned leases over a global strongly-consistent counter</b> because the global counter makes every add-to-cart pay cross-region consensus latency and makes one region's failure global — the exact incidents in the brief; the price is rebalancing machinery and the possibility that region A shows sold-out while region B holds stock for a few seconds, which we accept and smooth with the 5 s sweep. We chose <b>CP for reservations, AP for reads</b> because a wrong 'reserved' costs money and a wrong 'in stock' costs a click; this is CAP applied with a price list rather than a slogan. We chose <b>TTL reservations over decrement-at-purchase</b> because decrement-at-purchase makes the race window the whole checkout duration, guaranteeing drop-time oversell or serialized checkouts; the price is limbo stock (sized above) and sweeper machinery. Bottleneck to watch: the single hot SKU's regional pool row — mitigate with striped sub-counters within the region if a drop ever exceeds one row's atomic-op throughput (~10k ops/s before that's real).</p>",
        scaling:
          "<p><b>Normal catalog (uncontended):</b> the whole apparatus degrades gracefully to boring — leases rarely rebalance, pools rarely conflict. Don't run drop machinery for the long tail; a simple threshold flags SKUs into 'contended mode'.</p><p><b>Big drops (100x reservation spike):</b> the front line is admission control, not the pool: a queue-with-token gate (waiting room) upstream turns 40k attempts/s into an orderly stream the pools absorb, and turns 'error page' into 'you're in line', which is also better product. Pools scale by SKU sharding; the hot-row ceiling gets striped counters.</p><p><b>More regions / marketplace sellers:</b> the allocator's ledger becomes the contract with third-party sellers (their stock, our leases) — at which point reconciliation graduates from hygiene to a billing-grade pipeline, and lease policy (who gets stock when demand skews) becomes a product feature with fairness rules rather than an ops script.</p>"
      },
      followups: [
        "Marketing wants exact live counts ('7 left!') on product pages. What does that cost in your design, and what do you counter-offer?",
        "A partition heals and two regions' pool logs disagree with the ledger by 3 units. Walk the reconciliation and who eats the difference.",
        "How would this change for digital goods (license keys) where 'stock' is artificial and oversell is impossible but exclusivity still matters?",
        "The waiting-room queue itself becomes the target of scalpers' bots. Which layer owns fairness, and what signals feed it?",
        "Legal says ticketed-event SKUs may never oversell, ever, even during partitions. Show the exact configuration and its availability price.",
        "Your CFO asks: 'why not just buy Spanner/a global strongly-consistent DB and keep the one counter?' Answer with numbers."
      ],
      rubric: {
        senior: [
          "Applies CAP per operation with a stated price for each choice, not as a system-wide label.",
          "Partitions stock into regional leases so the common path never crosses regions.",
          "Designs TTL reservations with idempotent reserve/confirm/release and an expiry sweeper.",
          "Bounds partition-time oversell arithmetically via local caps rather than by coordination.",
          "Keeps browsing available with honest staleness wording while purchases stay strict."
        ],
        staff: [
          "Frames oversell as a priced business dial per SKU class and gets the business to set it.",
          "Places the CP island (allocator) so partition unavailability lands only on flows that tolerate waiting.",
          "Computes worst-case exposure (lease bound, overshoot, limbo stock) instead of asserting safety.",
          "Adds admission control as the real drop-time defense and reasons about the hot-row ceiling.",
          "Builds ledger-vs-pool reconciliation as a first-class detection loop with a divergence SLA."
        ]
      }
    },
    {
      slug: "consistency-model-selection",
      name: "Pick a Consistency Model Per Feature, Not Per Database",
      category: "Distributed Judgment",
      difficulty: "Medium",
      minutes: 40,
      summary: "read-your-writes, monotonic reads, session tokens, cost of strength",
      statement:
        "<p>A collaboration SaaS (think docs + comments + billing) is going multi-region with replicated storage. The platform team asks each feature team to declare a consistency requirement, and gets back a wall of 'strong, obviously' — which would force every read through cross-region quorums and triple the latency budget the product just promised.</p><p>You are the architect writing the guidance. Take four concrete user stories and assign each the weakest consistency model that keeps its promise to the user: (1) a user renames a document and immediately sees the old name in their file list; (2) a user posts a comment, refreshes, and their comment is gone — then reappears; (3) an admin revokes a contractor's access, and the contractor keeps reading documents for 90 seconds; (4) a customer upgrades their plan and the invoice preview still shows the old price.</p><p>Define the models precisely (strong, bounded staleness, session guarantees — read-your-writes, monotonic reads — and plain eventual), show the mechanism that delivers each (session tokens, sticky routing, quorum reads), and give teams a decision procedure so 'strong, obviously' stops being the default.</p>",
      clarifying: [
        "For each story, who observes the anomaly — the writer themselves, or a different user? (Writer-observed anomalies are session problems, cheap to fix; cross-user ones are ordering problems, expensive.)",
        "What are the replication topology and typical/worst lag between regions — 100 ms or 10 s? The mechanisms differ by an order of magnitude of lag.",
        "Does revocation (story 3) have a compliance clock — a contractual 'access ends within N seconds' — or is it hygiene?",
        "Are clients thick (can hold session tokens across requests) or is every request from a stateless edge?",
        "Do any flows span devices — write on laptop, read on phone seconds later — where sticky routing can't help?",
        "What's the latency budget per read path, and what does a cross-region quorum read cost from the worst region pair?",
        "Is there an existing gateway/session layer where consistency tokens could live without every team building their own?"
      ],
      functional: [
        "A writer always observes their own writes across requests and devices (read-your-writes at session scope).",
        "No user ever observes state moving backwards (monotonic reads): once seen, a comment or rename never un-happens from their view.",
        "Access revocation is enforced everywhere within a stated bound (≤ 5 s), independent of replica lag on document reads.",
        "Billing-visible state (plan, price, invoice) is strongly consistent at the moment of financial commitment.",
        "Teams declare consistency per endpoint via a small vocabulary the platform enforces, with 'eventual' as the default."
      ],
      nonfunctional: [
        "In-region reads (session-guaranteed) p99 ≤ 30 ms; cross-region strong reads permitted only on flows budgeted ≥ 250 ms.",
        "The session-token mechanism adds ≤ 1 ms and no cross-region traffic on the happy path.",
        "Staleness bound for 'bounded' reads: ≤ 2 s, monitored, with alerting when replication lag threatens the bound.",
        "The enforcement point (gateway middleware) is one implementation shared by all teams, not N copies.",
        "Consistency downgrades under failure are explicit: a region losing quorum serves labeled-stale reads or errors, per endpoint policy — never silently weaker."
      ],
      estimation: {
        prompts: [
          "Latency price list: in-region replica read vs leader read vs cross-region quorum, from your worst region pair.",
          "What fraction of total reads would pay the quorum tax if 'strong, obviously' won — and the fleet cost of that.",
          "Session-token overhead: token size × requests/day — is piggybacking on every response actually free?",
          "Revocation propagation: entitlement-cache TTL vs push invalidation — events/day and worst-case seconds-to-enforced for each."
        ],
        worked:
          "<p>Price list first, because the argument is economic (numbers from the platform's own region pair measurements):</p><pre>in-region replica read:          2-5 ms\nin-region leader read:           5-10 ms\ncross-region quorum read (worst pair, us↔apac): 180-320 ms\n\nread mix: ~400M reads/day; genuinely money-adjacent (billing commit,\nplan change): ~0.2%. 'Strong obviously' taxes 100% of reads with the\nworst-pair budget to protect 0.2% that actually need it.</pre><p>Session tokens are near-free: a hybrid timestamp token is ~24 bytes, piggybacked on responses already flowing; even at 400M reads/day that's ~10 GB/day of header bytes across the whole fleet — noise.</p><pre>revocation: ~50k entitlement changes/day.\n  TTL-only cache at 90 s → worst case 90 s of wrongful access (story 3's bug).\n  push invalidation (~1 msg/change fan-out to gateways) at 50k/day\n  ≈ 0.6 msg/s — trivial load; worst-case enforcement = propagation\n  p99 ≈ 1-2 s + one in-flight request. TTL stays as the ≤30 s backstop.</pre><p>Conclusion the numbers force: session guarantees + targeted strength cost ~nothing; blanket strength costs the product's latency promise.</p>"
      },
      model: {
        highlevel:
          "<p>The guidance is a small ladder, each rung with its delivering mechanism, enforced in one shared gateway layer:</p><pre>model                guarantees                      mechanism\n─────────────────────────────────────────────────────────────────\neventual             convergence, no ordering        any replica\nmonotonic reads      your view never rewinds         session token:\n                                                     min-read-timestamp\nread-your-writes     you see your own writes         session token:\n(+monotonic = 'session')                             last-write-ts; read\n                                                     waits/routes to catch up\nbounded staleness    everyone ≤ T behind             lag-monitored replicas,\n                                                     reject/relabel if > T\nstrong               one order, latest value         leader or quorum read\n─────────────────────────────────────────────────────────────────\nstory 1 rename → read-your-writes   story 2 comment → monotonic\nstory 3 revoke → strong ON THE ENTITLEMENT CHECK (push+TTL), reads stay weak\nstory 4 invoice → strong at commit; preview = bounded + 'as of' label</pre><p>Story 3 is the teaching case: the naive fix ('make document reads strong') taxes the highest-volume path to solve an <i>authorization</i> freshness problem. Move the strength to the tiny entitlement path — push invalidation to gateway caches with a short-TTL backstop — and document reads stay cheap.</p>",
        data:
          "<p>The session token is the working heart; keep it dumb and portable:</p><pre>session token (opaque to clients, minted by gateway)\n  {\"last_write_ts\": hlc,   -- max HLC of this session's writes\n   \"min_read_ts\":  hlc}    -- max HLC this session has OBSERVED\n  carried: response header → client stores → request header\n  cross-device: token attached to the USER session record, so laptop\n  writes raise the floor for the phone within ~1 replication hop\n\nread path (gateway middleware)\n  need = endpoint.consistency  -- declared in API spec, reviewed\n  if session-class: pick replica with applied_ts ≥ token floor;\n    none in-region? wait ≤ 50 ms for catch-up, else leader read\n  if bounded: replica with lag ≤ 2 s (lag gossiped per replica)\n  if strong: leader/quorum, budget-checked at review time\n\nentitlements\n  revoke → write authz store (strong) → publish invalidation\n  gateways: cache {user, resource-class} with TTL 30 s + invalidation\n</pre><p>Endpoint consistency is declared in the API definition and linted — that is what actually changes team behavior: the default is <code>eventual</code>, and requesting <code>strong</code> requires a stated latency budget in the same review.</p>",
        deepdives:
          "<p><b>1. Why each story maps where it does.</b> Story 1 (rename vanishes from your own list) is the writer observing their own write late: read-your-writes, delivered by the token floor — no global coordination, because nobody else cares about microsecond freshness of your rename. Story 2 (comment disappears then reappears) is a view rewinding: the refresh landed on a laggier replica than the first read. Monotonic reads via <code>min_read_ts</code> fixes it — note the comment can still take a second to appear <i>initially</i>; the promise is no going backwards, which is what actually feels broken to users. Story 4 splits in two: the preview can be bounded-stale with an 'as of' label, but the <i>commitment</i> — computing the amount actually charged — reads plan state strongly inside the billing transaction. The pattern behind all four: find the smallest scope (session, entitlement check, commit point) at which strength is needed, and buy it only there.</p><p><b>2. The failure modes of the mechanisms themselves.</b> Session tokens die when clients drop headers (retry libraries, new tabs): design for token loss = graceful degrade to eventual, never an error, and put the token in the user session record so loss is rare. Catch-up waits can stack under lag spikes: cap the wait (50 ms), then escalate to leader read, and alert on escalation rate — that alert is your early warning that replication lag is eating your latency budget. Push invalidation can drop messages: the TTL backstop bounds the damage; the compliance answer for story 3 is therefore 'p99 ~2 s, hard ceiling 30 s', stated in the contract rather than discovered in an audit.</p><p><b>3. The decision procedure you leave the teams.</b> Three questions per endpoint: (a) Who observes the anomaly — the writer (session guarantee), one reader over time (monotonic), or any two users compared side by side (true ordering problem)? (b) What does one anomaly cost — annoyance, support ticket, money, or legal exposure? (c) What's the read volume — is this a path that can afford quorum? Session-class fixes cover (a) at ~zero cost; only cross-user, money-or-legal, low-volume paths earn 'strong'. Teams apply the procedure in design review; the platform's job is making the weak rungs so cheap and well-tooled that they're the path of least resistance.</p>",
        tradeoffs:
          "<p>We chose <b>session guarantees as the workhorse over blanket strength</b> because the observed bugs (stories 1-2) are session anomalies, and the price list shows quorum reads would spend 60x the latency to fix what a 24-byte token fixes; the cost is token plumbing and the cross-device edge, handled at the user-session record. We chose <b>moving strength to the entitlement path over strengthening document reads</b> for story 3 because authorization freshness is a different, far smaller problem than data freshness — this is the single highest-leverage reframe in the design; the cost is an invalidation bus and a dual mechanism (push + TTL), both trivial at 0.6 msg/s. We chose <b>declared-per-endpoint consistency with a linted default of eventual</b> over per-team discretion because defaults, not documents, set organizational behavior; the cost is governance friction at review time, which is precisely where we want the argument to happen. Residual risk: teams caching at the application layer above the gateway can silently re-break monotonicity — the guidance must name app-level caches as part of the consistency surface, and the linter should flag endpoints that declare session-class but sit behind a CDN.</p>",
        scaling:
          "<p><b>Two regions, modest lag:</b> everything above works with async replication and the gateway middleware; strong reads go to the leader region.</p><p><b>Many regions / write-heavy features:</b> leader reads from far regions blow budgets → either regional write leadership per document (data gravity follows the collaborators, so most sessions are leader-local anyway) or a consensus store for the narrow strong set (entitlements, billing) while documents stay on async replication. The ladder survives; only the 'strong' rung's implementation changes.</p><p><b>Organizational scale:</b> the vocabulary is the durable artifact. New teams inherit five words, a decision procedure, a price list, and middleware that makes the right thing free — which is what 'architect' means here: most of the win was never in the replication protocol, it was in making 400 engineers stop writing 'strong, obviously'.</p>"
      },
      followups: [
        "A team declares 'strong' for a leaderboard read at 20k QPS. Walk through the review conversation, including the number where you'd concede.",
        "Two users on a call compare screens: one sees the rename, one doesn't, for ~2 s. Which rung fixes cross-user comparison, and is it worth it here?",
        "Your retry middleware resends a request without the session token after a failover. What anomaly can the user now see, and how do you catch this class of bug?",
        "Legal upgrades story 3 to 'access must end within 1 second, provably'. What changes — mechanism, cost, and what you push back on?",
        "How do bounded-staleness reads behave during a replication-lag incident (lag 45 s)? Show the endpoint policy options and who chooses.",
        "A mobile client offline for an hour reconnects with a stale token floor. What should the gateway do, and what must it never do?"
      ],
      rubric: {
        senior: [
          "Defines the ladder precisely and maps each story to the weakest sufficient rung with the delivering mechanism.",
          "Designs a session-token scheme (write floor + read floor) including the cross-device path.",
          "Separates authorization freshness from data freshness in the revocation story.",
          "Splits billing into stale-labeled preview vs strongly-read commitment.",
          "Prices the rungs with real latency numbers rather than qualitative labels."
        ],
        staff: [
          "Reframes the problem economically: blanket strength taxes 100% of reads to protect 0.2%, with fleet-level numbers.",
          "Designs the enforcement point (declared per endpoint, linted, default eventual) so the guidance changes behavior, not just documents it.",
          "Names the mechanisms' own failure modes — token loss, catch-up stacking, dropped invalidations — and bounds each.",
          "Gives teams a reusable decision procedure (who observes, what it costs, what volume) instead of a case-by-case verdict.",
          "Identifies app-level caches and CDNs as part of the consistency surface that middleware alone can't govern."
        ]
      }
    },
    {
      slug: "exactly-once-idempotency",
      name: "The Exactly-Once Myth and a Real Idempotency-Key Design",
      category: "Distributed Judgment",
      difficulty: "Hard",
      minutes: 45,
      summary: "delivery vs processing, key scope, claim-check protocol, retention",
      statement:
        "<p>Your company's public API lets partners create payouts — real money leaving real accounts. A partner's integration retried a timed-out request last month and a vendor was paid twice: $18,400 out the door, weeks of clawback. The postmortem action item reads 'implement exactly-once delivery'. You are the architect who has to explain, kindly, that exactly-once <i>delivery</i> is not a thing anyone can buy — and then design what actually works: exactly-once <i>effects</i> built from at-least-once delivery plus idempotency.</p><p>Design the idempotency-key mechanism for this API end to end: who mints the key, what scope it covers, how the server enforces it under concurrent duplicates, what gets stored and for how long, and how the guarantee survives your own internal pipeline (the payout service itself calls a banking partner). Then be precise about the boundaries — what the mechanism does not protect, and where the myth tends to sneak back into designs via broker marketing.</p>",
      clarifying: [
        "What does the banking partner's API offer — an idempotency key of its own, a client-reference field, or nothing? The last hop bounds the whole chain.",
        "Retry behavior of partners: SDKs we control, or arbitrary HTTP clients with homegrown retry loops?",
        "Same-key-different-body: partner bug or legitimate 'update'? What should the API do — 409, or process-first-wins?",
        "How long can a retry legitimately arrive after the first attempt — seconds (network) or days (partner replays a failed batch)?",
        "Is there one payout creation endpoint, or do batches, scheduled payouts, and dashboard-initiated payouts all need the same guarantee?",
        "What's the concurrent-duplicate profile — do partners fire parallel retries (hedged requests), or strictly sequential?",
        "What audit requirements exist for proving a payout happened once — does the dedup record itself need to be evidence-grade?"
      ],
      functional: [
        "Every payout-creating request carries a client-minted idempotency key; requests without one are rejected (this API, given the stakes).",
        "Replays with the same key return the original response (same status, same payout id) without re-executing the effect.",
        "Same key with a different request body is rejected with 422 and a distinct error code — never silently processed.",
        "Concurrent duplicates resolve to one execution: losers either wait for and receive the winner's response, or get 409 retry-later.",
        "The guarantee extends through the internal pipeline to the banking partner via a derived downstream reference."
      ],
      nonfunctional: [
        "Key lookup adds ≤ 5 ms p99 to the request path.",
        "Keys are honored for 30 days (partner batch-replay window), with storage sized accordingly.",
        "The dedup store's failure mode is fail-closed for payouts: if we cannot check the key, we do not move money.",
        "Crash at any single point between accept and effect leaves the system able to resolve to exactly-one-effect on retry.",
        "Dedup records are immutable and auditable for 7 years (financial evidence), with the hot store holding only the 30-day window."
      ],
      estimation: {
        prompts: [
          "Duplicate rate: measured timeout rate × partner retry multiplier — how many replays/day will the mechanism absorb?",
          "Dedup store sizing: payouts/day × record size × 30-day window; and the archive at 7 years.",
          "Lock/claim contention: concurrent-duplicate window length × arrival spread — how often do two duplicates race within it?",
          "Cost of the alternative: expected duplicate payouts/year × average clawback cost, without the mechanism."
        ],
        worked:
          "<p>Volume: 250k payouts/day. Measured p99 timeout rate at the edge ~0.4%, and partners average 2.5 attempts per timed-out call:</p><pre>replays: 250k × 0.4% × 2.5 ≈ 2,500 duplicate-bearing requests/day —\nnot rare events; a daily flow the design must treat as normal traffic.</pre><p>Dedup store, 30-day hot window:</p><pre>record ≈ 700 B (key, fingerprint, state, response snapshot, refs, ts)\n250k/day × 30 d × 700 B ≈ 5.3 GB hot — one small strongly-consistent\nstore. 7-yr archive: 250k × 365 × 7 × 700 B ≈ 450 GB in cold object\nstorage — pennies, and it settles the audit requirement.</pre><p>Race window: the dangerous overlap is two duplicates arriving inside the first attempt's execution time (~1-2 s for a payout accept). At 2,500 replays/day, hedged-retry partners make same-second pairs a several-times-daily event — the concurrent path is a main path. The counterfactual that funds all of this: even one $18k incident per quarter dwarfs the ~$100/mo the dedup store costs.</p>"
      },
      model: {
        highlevel:
          "<p>First, the naming discipline that dissolves the myth: delivery guarantees live on the <i>transport</i> (at-most-once or at-least-once — pick one; 'exactly-once delivery' over a network with timeouts is impossible because a timeout is indistinguishable from success), while exactly-once <i>effects</i> are manufactured at each effectful boundary by dedup + atomic state. Broker 'exactly-once' features are real but scoped: they cover processing <i>within</i> the broker's transaction domain, and expire the moment a side effect leaves it — which is exactly where a payout goes.</p><pre>partner ──(key K, retries)──▶ API gateway ─▶ payout-svc\n                                              │ claim-check on K\n                                              ▼\n                                dedup store (strongly consistent)\n         states: CLAIMED(in-flight) → SUCCEEDED(resp) / FAILED(resp)\n                                              │\n                             effect: create payout row + outbox (1 txn)\n                                              │\n                             worker ─▶ banking partner API\n                                       (their idempotency ref = f(K))\n\nchain rule: every effectful hop re-manufactures the guarantee —\ngateway→svc (key K), svc→DB (txn), svc→bank (derived ref f(K)).\nA chain with ONE non-idempotent hop has that hop's semantics.</pre>",
        data:
          "<p>The dedup record and the claim protocol are the whole trick; the store must support an atomic conditional insert.</p><pre>idempotency_records\n  key         TEXT PK        -- partner-minted UUID\n  scope       TEXT           -- partner_id + endpoint  (part of PK!)\n  fingerprint SHA256         -- canonicalized request body hash\n  state       ENUM(claimed, succeeded, failed)\n  response    JSONB NULL     -- status + body snapshot to replay\n  resource_id UUID NULL      -- the payout created\n  claimed_at, completed_at, expires_at\n\nprotocol per request:\n  1. INSERT (key,scope,fingerprint,claimed) IF NOT EXISTS   -- atomic\n     inserted → we are the WINNER: execute, then update state+response\n  2. exists, state=succeeded/failed → fingerprint match?\n        match    → replay stored response (200 with original body)\n        mismatch → 422 idempotency_key_reuse\n  3. exists, state=claimed → a twin is in flight:\n        poll ≤ 2 s for completion, then replay; else 409 + Retry-After\n  4. claimed but claimed_at &gt; T_stuck (crash orphan) →\n        recovery: reconcile against payout table + bank ref before\n        either completing the record or releasing the claim</pre><p>Scope inside the primary key matters: keys are namespaced per partner and per endpoint, so partner A's key can never collide with partner B's, and a key used on /payouts cannot suppress a /refunds call.</p>",
        deepdives:
          "<p><b>1. The crash windows, enumerated.</b> (a) Crash after claim, before effect: record stuck in <code>claimed</code>; recovery job finds no payout row → release the claim; partner's retry then executes cleanly. (b) Crash after effect, before marking succeeded: the nasty one — recovery finds a payout row (via resource lookup keyed by the idempotency key stored <i>on the payout row too</i>) → complete the record from the payout, replay to the retry. Storing the key on the created resource is the load-bearing detail: it makes the effect itself the evidence that closes the window. (c) Crash inside the bank call: same structure one hop down — the bank ref is derived deterministically from K, so the recovery job can ask the bank 'does f(K) exist?' before ever re-sending. Every window closes by the same pattern: <i>make the effect queryable by the key, then reconcile claims against effects.</i></p><p><b>2. Key semantics partners will get wrong.</b> Minting: the key must identify the <i>intent</i> ('pay invoice 4412'), not the attempt — SDKs mint it once per logical operation and reuse it across retries; docs must show the wrong version (new UUID per retry) explicitly, because that version compiles and passes every happy-path test while providing zero protection. Fingerprinting: canonicalize before hashing (field order, encodings) or legitimate replays 422 spuriously. Response replay: return the <i>original</i> status and body even if policy changed since — a replay is a read of history, not a re-decision. TTL: 30 days honors the batch-replay window; after expiry a reused key is a new operation, which is why the payout row keeps the key forever for audit even after the hot record ages out.</p><p><b>3. Where the myth sneaks back in.</b> Watch for these in reviews: 'the broker is exactly-once so consumers don't need dedup' (the broker's boundary ends before the bank's API); 'we use TCP so messages aren't duplicated' (retries happen above TCP); 'we'll dedup by (amount, vendor, day) heuristics' (legitimate twice-in-a-day payments exist — heuristic dedup causes <i>missed</i> payments, the opposite incident); and 'at-most-once is safer for money' (it converts duplicates into silent losses, which reconcile worse than duplicates). The architect's rule: name the effectful boundaries, and require each to state its dedup mechanism in the design doc — a table with three rows ends most of these arguments.</p>",
        tradeoffs:
          "<p>We chose <b>mandatory client-minted keys over server-side heuristic dedup</b> because only the client knows intent boundaries; the cost is partner integration burden, paid down with SDKs that mint and persist keys correctly by default. We chose <b>fail-closed on dedup-store unavailability</b> because a declined payout retries cleanly while a duplicated one claws back for weeks — availability of this endpoint is deliberately subordinated to correctness, and the store is sized tiny and replicated to make the trade rarely visible. We chose <b>claim-then-execute over execute-then-record</b> because the latter's crash window produces exactly the double-payout we're killing; the cost is orphaned claims, handled by the reconcile job. We chose <b>synchronous 2 s wait for concurrent twins over immediate 409</b> because most partner retry loops treat 409 as failure and retry harder; absorbing the twin quietly is kinder to the ecosystem. The residual exposure to state plainly: a partner who mints fresh keys per retry gets no protection — detectable by monitoring near-duplicate fingerprints under different keys, which we alert on and raise with the partner rather than silently 'fix'.</p>",
        scaling:
          "<p><b>Now (250k/day, ~3 wr/s):</b> one small strongly-consistent store (the payments DB itself is fine — the conditional insert rides the same ACID engine). Do not reach for a cache: dedup state must be durable and linearizable; a Redis SETNX that can lose an ack is a double-payout generator with better latency.</p><p><b>100x (300 wr/s, multi-region API):</b> the conditional insert must stay single-home per key — route by hash(scope,key) to a home partition (keys are random, so distribution is even); cross-region partners pay one home-region round trip on the write path, acceptable for payout creation. Hot window still fits memory; the archive tier absorbs growth linearly.</p><p><b>Org scale:</b> promote the mechanism to a platform primitive — a dedup library + provisioned store that any team's effectful endpoint can adopt with one annotation, plus the review-time rule that every external side effect names its idempotency story. The durable win is cultural: 'exactly-once' stops appearing in postmortem action items, replaced by 'which boundary lacked dedup'.</p>"
      },
      followups: [
        "A partner reports their retry got a 422 fingerprint mismatch but swears the body was identical. What are the three most likely causes, in order?",
        "The recovery job finds a claim whose payout row exists but whose bank ref f(K) is unknown to the bank. Which crash produced this, and what's safe to do?",
        "Batches: one request creates 500 payouts. One key for the batch, or 500 derived keys? Design the partial-failure semantics.",
        "Your dedup store failed over and lost 40 seconds of acknowledged writes. What is the exposure, how do you measure it, and what do you tell partners?",
        "A staff engineer proposes moving dedup into the API gateway 'so every service gets it free'. What breaks?",
        "How does this design extend to a webhook you SEND partners — can you offer them exactly-once delivery? What do you offer instead?"
      ],
      rubric: {
        senior: [
          "Separates delivery guarantees from effect guarantees and scopes broker exactly-once claims correctly.",
          "Designs the claim-check protocol with atomic conditional insert and all four states, including concurrent twins.",
          "Namespaces key scope (partner, endpoint) and fingerprints canonicalized bodies with a 422 mismatch path.",
          "Extends the guarantee through the pipeline with a derived downstream reference at the bank hop.",
          "Chooses fail-closed for money with an explicit availability trade."
        ],
        staff: [
          "Enumerates the crash windows and closes each by making effects queryable by key (key stored on the resource, f(K) at the bank).",
          "Treats duplicates as a measured daily flow and sizes the mechanism (store, race window, TTL) from real rates.",
          "Anticipates partner misuse (key-per-retry) and builds detection for unprotected traffic rather than assuming compliance.",
          "Applies the chain rule — every effectful hop re-manufactures the guarantee — and rejects gateway-level 'free' dedup on those grounds.",
          "Names the myth's recurring disguises (broker EOS, TCP, heuristic dedup, at-most-once) and installs the review-time table that kills them."
        ]
      }
    },
    {
      slug: "ingestion-backpressure",
      name: "Back-Pressure and Load Shedding for an Ingestion API",
      category: "Distributed Judgment",
      difficulty: "Hard",
      minutes: 45,
      summary: "queues hide, they don't absorb; priority shedding; goodput over throughput",
      statement:
        "<p>Your platform ingests telemetry from ~80,000 customer-deployed agents: metrics, logs, and billing-relevant usage events, all POSTed to one ingestion API and written through a processing pipeline into storage. Twice recently the pipeline slowed (a storage incident, then a bad deploy), and the 'obvious' buffer queue in the middle absorbed traffic for 40 minutes — then the queue itself filled, latency went vertical, agents timed out and retried, and the retry amplification took ingestion fully down for 3 hours. Data arrived up to 9 hours late; some was lost when the queue was purged to recover.</p><p>Design ingestion that survives its own overload. The queue-fills-then-dies pattern means the system had no real back-pressure — the queue only postponed the reckoning. You need: admission control at the edge, differentiated shedding (usage events are billing data; debug logs are not), back-pressure signals that agents actually obey, and retry behavior that doesn't amplify. Define what 'degraded but healthy' looks like and how the system returns to it automatically.</p>",
      clarifying: [
        "Which data classes exist and what is each worth — is usage-event loss a revenue/billing incident while debug-log loss is shrug-tier?",
        "Do we control the agent code (can ship backoff/buffering behavior), or are some senders third-party integrations we can't change?",
        "Can agents buffer locally, and for how long — disk spool size on customer machines, and what happens when THAT fills?",
        "What's the pipeline's sustainable drain rate today, and how quickly can it actually scale out when pressed?",
        "Is ordering required within an agent's stream, or can shed-and-backfill arrive out of order?",
        "What freshness do consumers of this data need — alerting on metrics needs seconds; billing rollups need completeness by end of day, not speed?",
        "During the incidents, what did agents receive — 200s with silent queuing, or any signal at all that they should slow down?"
      ],
      functional: [
        "Every request is classified at admission (usage / metrics / logs) and admitted against per-class budgets.",
        "When capacity drops, classes shed in priority order: debug logs first, metrics sampled next, usage events only after declared emergency — and shedding is signaled, never silent.",
        "Rejected requests receive 429 with Retry-After; agents honor it with jittered exponential backoff and local spooling.",
        "Usage events are durably acknowledged only after replicated persistence — an acked usage event is never lost thereafter.",
        "Recovery is automatic and gradual: admitted load ramps as pipeline health returns, draining agent spools without re-triggering collapse."
      ],
      nonfunctional: [
        "Ingestion ack latency p99 ≤ 250 ms for admitted requests at all times — including during overload (fast rejection is the mechanism that keeps it true).",
        "Goodput under 50% pipeline capacity loss ≥ 45% of normal (near-linear degradation, not a cliff).",
        "Zero acked-data loss for usage events; metrics/logs loss during shedding is bounded, measured, and reported per customer.",
        "Queue depth bounded such that worst-case drain time ≤ 10 minutes — the queue is a shock absorber, not a lake.",
        "Retry amplification factor under full rejection ≤ 1.2x offered load (verified by game day)."
      ],
      estimation: {
        prompts: [
          "Offered load: agents × events/sec × payload size — normal and worst-case (all agents flushing spools simultaneously).",
          "Queue math: at what depth does queue wait exceed the agents' timeout, making everything in it dead-on-arrival?",
          "Retry amplification: timeout rate × retry policy across 80k agents — what multiplier turned slowdown into collapse?",
          "Shedding arithmetic: per-class volume shares — how much capacity does dropping logs and sampling metrics actually buy?"
        ],
        worked:
          "<p>Normal load and the class mix set the shedding budget:</p><pre>80k agents × ~25 events/s avg batchable to ~2 req/s each →\n~160k req/s worth of events, batched to ~12k HTTP req/s, ~450 MB/s\nclass mix by volume: logs 68% · metrics 27% · usage 5%\n→ shedding logs alone recovers 2/3 of capacity; logs + metric\n  sampling (1:4) recovers ~88%. Usage (the sacred 5%) fits in any\n  plausible remnant — the priority scheme works BECAUSE the\n  precious class is small.</pre><p>Why the old queue was a trap, in numbers:</p><pre>drain rate during incident: 40% of normal → deficit 7.2k req/s\nqueue at 40 min: ~17M requests deep. agent timeout 10 s;\nqueue wait at that depth ≈ 35 min → EVERYTHING in the queue was\nalready abandoned+retried — the pipeline spent hours processing\nghosts. Bounded-queue rule: depth ≤ drain_rate × agent_timeout\n(≈ 48k requests at 10 s), i.e. ~350x smaller than what we ran.</pre><p>Amplification: 80k agents timing out on 10 s with naive 3x-retry-no-jitter ≈ 4x offered load within a minute — matching the observed collapse. Jittered exponential backoff with a retry budget caps the same scenario at ~1.15x.</p>"
      },
      model: {
        highlevel:
          "<p>Principle: <b>reject early, cheaply, and loudly at the edge; keep queues short; make the client part of the control loop.</b> The old design had implicit infinite buffering and zero signaling — the fix is an explicit feedback path from pipeline health to admission decisions to agent behavior.</p><pre>agents (spool + backoff) ──▶ edge admission layer\n   ▲                          │ per-class token buckets, scaled by\n   │ 429 + Retry-After        │ a health signal from downstream\n   │ (the back-pressure       ▼\n   │  signal agents obey)   short bounded queues, one PER CLASS\n   │                          │ (usage queue isolated + replicated)\n   │                          ▼\n   └────────── pipeline workers ─▶ storage\n                    │\n        health controller: measures drain rate + queue depth +\n        storage latency → publishes admission budget per class\n        (AIMD: cut multiplicatively on distress, recover additively)</pre><p>Per-class queues make priority real — one shared queue lets debug logs occupy the same slots as billing events, which is how the last incident drowned the important 5% in the worthless 68%.</p>",
        data:
          "<p>The control loop's contract and the classes' declared guarantees:</p><pre>class table (the product decision, written down)\n  usage:   guarantee=durable-ack  shed=never*  queue=replicated, 60 s\n  metrics: guarantee=best-effort  shed=sample 1:N under pressure\n  logs:    guarantee=best-effort  shed=drop first, whole-class\n  (*usage 'never' = only by human-declared emergency, audited)\n\nadmission budget (published every 2 s by health controller)\n  {class: tokens/s} — derived: measured_drain × safety(0.85),\n  allocated priority-first (usage fully funded, then metrics, logs)\n\n429 response body (the agent-facing protocol)\n  {\"retry_after_ms\": 8000 ± jitter,   -- server-chosen, load-aware\n   \"shed_classes\": [\"logs\"],          -- agent stops SENDING these,\n   \"spool\": true}                     -- not just retrying them\n\nagent contract (shipped in SDK)\n  spool to disk (cap 500 MB, oldest-logs-first eviction),\n  exponential backoff ×2 to 5 min, full jitter, retry budget 10%,\n  drain spool at ≤ 1/3 of normal send rate on recovery signal</pre><p>The <code>shed_classes</code> field is the high-leverage part: telling 80k agents to stop <i>sending</i> logs moves the shed upstream of the network, saving the bandwidth and the edge CPU — rejection at the server still pays to receive and parse the request.</p>",
        deepdives:
          "<p><b>1. Why the queue failed, stated as a law.</b> A queue converts a temporary rate mismatch into latency; it can never fix a sustained one — if arrival exceeds drain for longer than (bounded depth ÷ deficit), the only outcomes are rejection (chosen, orderly, at the edge) or collapse (unchosen, at the worst layer). Sizing rule: max useful depth = drain_rate × client_timeout; beyond that, every queued item is already abandoned and the pipeline is doing archaeology. Corollary the team must internalize: <b>unbounded buffering is deferred, interest-bearing rejection.</b> The 3-hour outage was 40 minutes of borrowed rejection plus interest.</p><p><b>2. The control loop and its stability.</b> Static rate limits protect against abusive clients but not against your own pipeline slowing — the budget must track measured drain. AIMD (halve admission on distress signals — queue depth growth, storage p99, worker saturation — recover +5%/interval) is chosen because it's the well-understood stable regulator under feedback delay; a naive proportional controller oscillates when the signal lags the action by seconds. Two stability details: hysteresis (recover on sustained health, not one good sample) so the system doesn't flap between shed levels, and slow spool-drain (agents return at 1/3 rate) so recovery itself doesn't present as a new spike — the retry-herd-after-recovery is the classic second collapse, and it's prevented client-side.</p><p><b>3. Shedding with intent: goodput over throughput.</b> Fairness inside a class matters as much as priority between classes: shed per-tenant proportionally (weighted per-tenant buckets) or one noisy customer's log storm consumes the whole logs budget while quiet tenants lose everything. Sampling metrics beats dropping metrics — 1-in-4 with the sample rate stamped on the data keeps dashboards truthful (rescale) instead of showing a fake 75% drop. And shed <i>visibly</i>: per-customer 'data degraded' events into the status feed. Silent shedding converts an infrastructure save into a data-integrity scandal three weeks later when someone audits a gap.</p>",
        tradeoffs:
          "<p>We chose <b>fast 429s over buffering for degraded periods</b> because agents have disk and retry logic — the system's total buffer capacity is 80k spools × 500 MB ≈ 40 TB at the edge, versus a lake in the middle that rots at 10-minute drain cost; the price is requiring an agent behavior contract, and a legacy/third-party sender tier that gets a small compatibility buffer with best-effort semantics only. We chose <b>per-class isolated queues over one prioritized queue</b> because priority within a shared, deep queue still leaves the head-of-line full of cheap data during the transition; the price is 3x queue infrastructure, trivial next to the incident cost. We chose <b>AIMD from measured drain over statically provisioned limits</b> because both incidents were self-inflicted capacity drops, which static limits don't see; the price is a control loop that itself needs testing (game days inject synthetic pipeline slowness monthly and verify the ramp). Residual risk named: usage events' 'never shed' is physics-bounded — if the replicated usage queue itself is dying, we prefer brief ingestion unavailability for usage (agents spool, data delays, nothing lost) over relaxing durability; that preference is written in the class table where product signed it.</p>",
        scaling:
          "<p><b>Now:</b> edge admission + three queues + AIMD controller. The controller is deliberately simple (one signal in, budgets out) — resist making it clever before it's proven boring.</p><p><b>3-5x agents:</b> admission layer scales stateless-horizontally; token buckets shard per edge node with periodic reconciliation (approximate global limits are fine — errors of a few percent are inside the safety factor). Per-tenant fairness state moves to a shared fast store or stays node-local with consistent-hash routing per tenant.</p><p><b>Class evolution:</b> new data classes (traces, profiles) slot into the table with declared guarantee + shed policy at design time — the durable artifact is that no data class ever ships without answering 'what happens to you under pressure'. That question, asked at review, is the whole lesson of the 3-hour outage institutionalized.</p>"
      },
      followups: [
        "A third-party integration you can't update ignores 429s and hammers on. Contain it without harming compliant tenants.",
        "During recovery, goodput sits at 60% but queues are empty and workers idle. What's your first hypothesis in the control loop?",
        "Billing disputes a customer's usage total for the incident day. Reconstruct what you can prove — acked vs spooled vs shed — and identify the gap in evidence, if any.",
        "The team proposes 'just autoscale the pipeline' as the real fix so shedding never triggers. Where does that argument hold, and where does it break?",
        "How does this design change if agents are mobile SDKs with no disk spool and battery constraints?",
        "Write the game-day scenario that would have caught the original 3-hour collapse in staging."
      ],
      rubric: {
        senior: [
          "Diagnoses the queue-fills-then-dies pattern: unbounded buffering with no feedback is postponed collapse.",
          "Designs edge admission with per-class budgets and priority shedding tied to measured drain rate.",
          "Specifies agent-side behavior — jittered exponential backoff, retry budgets, disk spooling — as part of the system.",
          "Bounds queue depth by drain_rate × client_timeout and can defend the formula.",
          "Differentiates guarantees per data class, with durable ack for billing events."
        ],
        staff: [
          "States the buffering law and the goodput-over-throughput framing, then derives the design from them.",
          "Engineers control-loop stability: AIMD choice justified, hysteresis, slow spool-drain to prevent the recovery herd.",
          "Pushes shedding upstream (shed_classes tells agents to stop sending) and prices the difference vs server-side rejection.",
          "Treats shedding as a product surface: per-tenant fairness, stamped sample rates, visible degradation reporting.",
          "Institutionalizes the lesson — every future data class must declare its under-pressure behavior at design review, verified by scheduled game days."
        ]
      }
    },
    {
      slug: "queue-vs-stream",
      name: "Queue or Stream: Pick the Boring One on Purpose",
      category: "Distributed Judgment",
      difficulty: "Medium",
      minutes: 40,
      summary: "competing consumers vs replayable log, ops cost, decision table",
      statement:
        "<p>A 60-engineer company is standardizing async infrastructure. Three teams have three proposals on the table, and each has chosen mostly by familiarity: (a) the notifications team wants a Kafka-class partitioned log for sending emails and push notifications; (b) the data team wants the same cluster to carry clickstream events into the warehouse; (c) the imaging team wants it too, for thumbnail-generation jobs. The platform lead suspects one team is right, one should use an SQS-class queue, and one could go either way — and has asked you to build the decision framework, apply it, and put real cost and operations numbers behind the recommendation.</p><p>Work the distinction from first principles: competing-consumer queues (per-message state, delete-on-consume, unordered-ish, elastic workers) versus partitioned replayable logs (offset-based, retained, ordered per key, consumer groups). Apply it to the three workloads, price both options for each, and address the second-order question: what does the company pay for running one technology for everything versus the right tool per job?</p>",
      clarifying: [
        "Per workload: does any consumer need to re-read history (replay, backfill, a second consumer added later reading from the past)?",
        "Does per-key ordering matter — must notification N for user U send after N-1? Do clickstream analysts need per-session order?",
        "What are the volumes and payload sizes for each — messages/day now and at 3-year projection?",
        "How many independent consumers exist per stream now, and realistically in two years?",
        "What operational capacity exists — is there a team that can own a stateful broker's capacity planning, upgrades, and partition rebalancing on-call?",
        "Are managed offerings acceptable (cloud SQS/Kinesis/MSK-class), or is there a self-hosting mandate?",
        "What failure semantics does each workload need — per-message retry with DLQ (jobs) vs at-least-once bulk delivery (analytics)?"
      ],
      functional: [
        "Notifications: per-user ordering for related messages, per-message retry with backoff, DLQ for poisoned messages, no replay requirement.",
        "Clickstream: multiple independent consumers (warehouse loader, sessionization, future ML), 7-30 day replay for backfill and reprocessing, per-session ordering useful.",
        "Thumbnails: work distribution across elastic workers, per-job retry/DLQ, visibility timeout for crashed workers, strict no-duplicate-visible-effects via idempotent output paths.",
        "Each system exposes lag/depth metrics to standard monitoring, with alerting templates provided by platform.",
        "A documented decision table lets future teams self-serve the queue-vs-stream choice in design review."
      ],
      nonfunctional: [
        "Notifications end-to-end p95 ≤ 30 s; thumbnails p95 ≤ 2 min at 10x daily peak; clickstream loader lag ≤ 5 min.",
        "Clickstream retains 30 days replayable at full volume within the storage budget.",
        "Total platform operational load for async infra ≤ 0.5 FTE ongoing after setup.",
        "Monthly infrastructure cost per workload stated and reviewed; no option adopted without its 3-year cost curve.",
        "Any chosen technology must degrade legibly: queue depth or consumer lag visible and alertable before user impact."
      ],
      estimation: {
        prompts: [
          "Volume per workload: messages/day, bytes/day, and peak multipliers — which of these is actually big?",
          "Clickstream retention math: events/day × payload × 30 days, replicated — the number that justifies a log.",
          "Cost both ways per workload: managed-queue per-request pricing vs partitioned-log cluster/throughput pricing at each volume.",
          "Ops-load estimate in FTE-hours/month: managed queue vs self-run stateful cluster (upgrades, rebalances, capacity reviews)."
        ],
        worked:
          "<p>The three workloads are different sizes and shapes — that asymmetry is the answer's skeleton:</p><pre>notifications: 2M msg/day, 2 KB, peak 5x  → 4 GB/day, ~23/s avg\nthumbnails:    300k jobs/day, 1 KB msg    → tiny; work is in the\n                                            workers, not the pipe\nclickstream:   900M events/day, 600 B, peak 3x → 540 GB/day raw\n  30-day replay × 3x replication ≈ ~49 TB retained — THIS is the\n  workload with log-shaped requirements and log-shaped volume</pre><p>Cost sketch both ways (managed-service list-price arithmetic, rounded):</p><pre>notifications on queue: 2M/day × 30 = 60M req-units/mo → tens of $\nnotifications on a dedicated log cluster: smallest HA managed\n  cluster ≈ $600-900/mo + partition/consumer ops → 20-40x for\n  features (replay, ordering beyond per-user) it doesn't need\nclickstream on queue: 900M/day → per-request pricing ≈ thousands/mo,\n  no replay, fan-out via extra queues per consumer (pay again per\n  consumer) → wrong shape AND worse price at this volume\nclickstream on log: throughput-priced cluster ≈ $2-3k/mo incl.\n  49 TB retention → right shape, and cheaper per added consumer\nops: managed queue ≈ ~0 FTE; self-run log cluster ≈ 0.3-0.5 FTE\n  (upgrades, rebalancing, quota policing) — the hidden line item\n  that dominates the 3-year TCO at a 60-engineer company</pre>"
      },
      model: {
        highlevel:
          "<p>The framework: queues and logs differ on <b>what the broker remembers and who owns position</b>. A queue tracks per-message state (available, in-flight, done-deleted) so competing workers can grab, fail, retry, and DLQ individual messages; history is gone on consume. A log is an append-only, retained sequence per partition; the broker remembers nothing per message — each consumer group owns an offset, so history is re-readable, consumers are independent, and per-key order falls out of partitioning. Decision procedure, in priority order:</p><pre>1. will anyone re-read history (replay/backfill/late-added\n   consumer)?                          yes → log\n2. &gt;1 independent consumer of the SAME data, now or plausibly?\n                                       yes → log leans heavy\n3. per-message lifecycle (individual retry, DLQ, visibility\n   timeout) the dominant need?         yes → queue\n4. is it job dispatch (do work once) vs fact propagation\n   (this happened)?                    jobs → queue · facts → log\n5. still ambiguous → take the one with LOWER OPS BURDEN\n\napplied:  thumbnails → queue (jobs, textbook)\n          clickstream → log (facts, replay, multi-consumer, volume)\n          notifications → queue, despite the team's ask —\n            it's job dispatch with per-message retry/DLQ;\n            per-user ordering handled at the sender (see deep dive)</pre>",
        data:
          "<p>The shapes teams actually build against — and the contracts that keep them healthy:</p><pre>thumbnail queue\n  msg {job_id(=idempotency key), image_ref, sizes[], attempt}\n  visibility_timeout 3 min (&gt; p99 job time), maxReceive 4 → DLQ\n  workers scale on queue depth; output write is idempotent by job_id\n\nnotification queue(s)\n  msg {notif_id, user_id, template, dedup_key}\n  per-user ordering: sender serializes per user (outbox ordered by\n  user seq) OR FIFO-queue message-group per user where offered —\n  ordering need is 'don't send #2 before #1 for one user', which is\n  group-level, not global; a partitioned log is not required for it\n\nclickstream log\n  topic clicks, partitions 64, key = session_id (per-session order),\n  retention 30 d, compaction OFF (facts, not state)\n  consumer groups: warehouse-loader, sessionizer, (future) ml-feed —\n  each with own offsets; adding one touches nobody\n  schema registry + versioned envelopes from day one: with N\n  independent consumers, the schema IS the public API</pre>",
        deepdives:
          "<p><b>1. The notifications call, argued honestly.</b> The team's log arguments: 'we might want to replay sends' (you don't — re-sending yesterday's push notifications is an incident, not a feature; the audit need is served by an events table), 'ordering' (group-level, solved at sender or FIFO groups), and 'everyone's moving to streaming' (fashion, not requirement). What the queue buys them that the log makes hard: per-message retry with backoff — in a partitioned log, one poisoned message at an offset blocks its partition or forces per-consumer skip/park bookkeeping that queues give for free via DLQ. Job-shaped workloads on logs end up reimplementing queue semantics (retry topics, parking-lot topics, per-message state in a side store) — more moving parts to get worse behavior. The steelman that survives: if notifications later needs an analytics consumer of send-events, emit a <i>separate</i> fact stream to the log alongside the job queue — dispatch and facts are different data products.</p><p><b>2. The one-technology-for-everything argument.</b> Real benefits: one client library, one monitoring stack, one on-call skillset, volume pricing. Real costs: the log-for-jobs impedance above, per-request pricing at clickstream volume if the 'one tech' is the queue, and — decisive at 60 engineers — a stateful cluster whose blast radius now spans every async workload in the company; a bad rebalance takes down thumbnails <i>and</i> notifications <i>and</i> the warehouse. Verdict: standardize on <b>two</b> primitives (managed queue + managed log), each with a paved-road template, and forbid the third option (someone's pet broker) — that captures most of the consolidation benefit while keeping shapes matched. The framework table, not the technology, is what gets standardized.</p><p><b>3. Semantics fine print that changes designs.</b> Queues: visibility timeout must exceed worst-case processing or you get duplicate <i>processing</i> (not just delivery) by design; FIFO/group throughput caps are per-group, so hot users serialize — fine for notifications, check the math. Logs: consumer-group rebalances pause consumption (seconds to minutes) — budget it in lag SLOs; partition count is a semi-permanent choice (rekeying is a migration, not a config change) — size for 3-year volume; and 'exactly-once' claims stop at the connector boundary, so the warehouse loader still needs idempotent loads by (partition, offset) watermark. Both: at-least-once is the planning assumption everywhere, so every consumer states its dedup story in review — the same discipline, whichever pipe.</p>",
        tradeoffs:
          "<p>We chose <b>two standardized primitives over one universal broker</b> because workload shapes genuinely differ and the single-cluster blast radius is a company-wide outage domain; the price is two client libraries and two monitoring templates, bounded by making both managed services. We chose <b>managed offerings over self-hosting</b> because the 3-year TCO is dominated by the 0.3-0.5 FTE a stateful cluster demands, which this org can't staff without robbing product teams; the price is per-unit premiums and provider limits, acceptable at these volumes and revisitable past ~5x clickstream growth. We chose <b>queue-for-notifications against the requesting team's preference</b> on the retry/DLQ argument; the price is a team feeling overruled — paid down by documenting the decision table they were run through, and by the fact-stream compromise that meets their future-analytics ambition through the correct door. The bet that could age worst: partition count and key choice on clickstream; mitigated by 3-year sizing now and a documented rekeying playbook for the day it's wrong.</p>",
        scaling:
          "<p><b>Now:</b> thumbnails and notifications on the managed queue (separate queues, shared template: DLQ, alarm on depth and age); clickstream on a managed log at 64 partitions, schema registry from day one.</p><p><b>10x clickstream:</b> throughput-priced log scales by partition/broker adds; the loader parallelizes per partition. Watch consumer-group rebalance times as group sizes grow; move heavy consumers to static membership/assignment patterns.</p><p><b>Org growth:</b> the decision table goes in the design-review checklist; platform provides both paved roads with cost calculators. New shapes get triaged by the same five questions — and when a workload genuinely straddles (event-sourced domain state, req/reply over messaging), it gets an explicit design exception with an owner, not a silent third technology. Two years from now, the measure of success is boring: nobody remembers the argument because both pipes just work and the review question 'queue or log, and why' takes five minutes.</p>"
      },
      followups: [
        "A poisoned clickstream event is crashing the sessionizer at offset 4,412,090,113. Walk through handling it on a log — and contrast with how the queue would have handled it.",
        "The notifications team returns in a year wanting 'send history replay' for a compliance audit. What did your design already give them, and what would you add?",
        "Thumbnail workers occasionally process the same job twice and customers see two webhook callbacks. Which knob was set wrong, and what's the layered fix?",
        "At what clickstream volume or feature need would you revisit managed vs self-hosted for the log, and what would the FTE math have to look like?",
        "A new team wants request/reply RPC over the log 'since it's already there'. Run them through your table out loud.",
        "The CFO asks why you're paying for two messaging systems. Give the two-minute answer with the blast-radius and TCO numbers."
      ],
      rubric: {
        senior: [
          "Grounds the distinction in broker-remembers-what and who-owns-position, not vendor names.",
          "Applies a clear decision procedure (replay, multi-consumer, per-message lifecycle, jobs-vs-facts) to all three workloads.",
          "Gets the fine print right: visibility timeouts, DLQ policy, partition keys, rebalance pauses, at-least-once planning.",
          "Prices both options per workload with real arithmetic, including the retention math that justifies the log.",
          "Designs the notifications ordering need at the right layer instead of buying a log for it."
        ],
        staff: [
          "Makes ops burden and FTE cost first-class decision inputs, dominating 3-year TCO over sticker price.",
          "Argues the standardization question with blast-radius reasoning and lands on two paved roads, not one universal broker.",
          "Steelmans the overruled team and finds the compromise (separate fact stream) that meets the real underlying need.",
          "Distinguishes dispatch from fact propagation as different data products even when they originate from one action.",
          "Leaves an organizational artifact — decision table in design review — so the judgment scales beyond the person who made it."
        ]
      }
    }
  );
})();
