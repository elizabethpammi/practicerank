(function () {
  "use strict";
  window.DESIGN_QUESTIONS = window.DESIGN_QUESTIONS || [];
  window.DESIGN_QUESTIONS.push(
    {
      slug: "url-shortener",
      name: "Design a URL Shortener",
      category: "System Design",
      difficulty: "Easy",
      minutes: 35,
      summary: "short-links, 301 vs 302, hot-key reads",
      statement:
        "<p>Your company wants an in-house link-shortening service, similar in spirit to the short links you see in text messages and printed flyers. Marketing pastes a long campaign URL into a dashboard and gets back something like <code>https://sho.rt/x7Kp2Qa</code>. Anyone who opens the short link is redirected to the original destination, and the marketing team wants click counts per link.</p><p>Design the whole service: the write path that mints codes, the read path that redirects, storage, caching, and analytics. Assume the read side dwarfs the write side by orders of magnitude, and that a single link tweeted by a celebrity can suddenly receive most of your traffic for an hour.</p><p>Walk through your API, how you generate codes without collisions, how you keep redirect latency low worldwide, and what happens when a link expires or is taken down for abuse.</p>",
      clarifying: [
        "Can users pick custom aliases (e.g. <code>sho.rt/summer-sale</code>), or are all codes machine-generated?",
        "Do links expire? If so, is expiry a default TTL, per-link setting, or both?",
        "Should the redirect be a 301 (cached by browsers, cheaper) or 302 (every hit reaches us, so analytics stay accurate)?",
        "What analytics granularity is required — raw click events, or hourly rollups per link?",
        "Is there an authenticated dashboard (teams, ownership, deletion), or is this write-once and anonymous?",
        "What is the expected write rate vs read rate, and how skewed are reads toward a few hot links?",
        "Do we need abuse handling — malware-domain blocklists, takedown, rate limits on creation?"
      ],
      functional: [
        "POST a long URL, receive a unique short code of 7 characters; optional custom alias if unclaimed.",
        "GET on a short code issues an HTTP redirect to the stored destination.",
        "Links support an optional expiry timestamp; expired links return 410 Gone.",
        "Per-link click counts are queryable, accurate to within a few minutes.",
        "Owners can delete or disable their links; disabled codes are never re-issued."
      ],
      nonfunctional: [
        "Redirect latency p99 under 60 ms measured at the edge, p50 under 15 ms.",
        "99.99% availability on the read path — a down redirect service breaks links printed on physical media.",
        "Durability: an accepted short link must never be lost; replicate to 3 nodes before acking creation.",
        "Scale target: 40M redirects/day sustained, with hot links spiking to 8,000 requests/sec each.",
        "Analytics may lag real time by up to 5 minutes (eventual consistency is fine there)."
      ],
      estimation: {
        prompts: [
          "Creations per day and the write QPS they imply.",
          "Redirects per day, average and peak QPS, and the read:write ratio.",
          "Storage for 5 years of links (row size × volume).",
          "Cache size needed to hold the hot set at a 90%+ hit rate."
        ],
        worked:
          "<p>Assume 500k new links/day and 40M redirects/day — an 80:1 read:write ratio, which drives every later decision toward read optimization.</p><pre>writes: 500,000 / 86,400 s  ≈ 6 QPS avg  → ~30 QPS peak (5x)\nreads:  40,000,000 / 86,400 ≈ 460 QPS avg → ~4,600 QPS peak (10x, spiky)\nhot link worst case: 8,000 QPS on ONE key (celebrity tweet)</pre><p>Storage per row: 7-byte code, 2 KB max URL (average ~200 B), owner id, timestamps, flags — call it 500 B average with index overhead.</p><pre>500,000 links/day × 365 × 5 yr ≈ 912M rows\n912M × 500 B ≈ 456 GB  → fits comfortably on one replicated DB, sharding is optional\nclick events: 40M/day × 60 B ≈ 2.4 GB/day raw → roll up hourly, keep raw 30 days (~72 GB)</pre><p>Cache: link access is Zipfian; the top ~5% of links take ~90% of reads. Hot set ≈ 45M active links × 5% × 500 B ≈ 1.1 GB — a single Redis replica pair holds it easily; budget 4 GB for headroom.</p>"
      },
      model: {
        highlevel:
          "<p>Two independent paths share one store. The <b>read path</b>: client → DNS/anycast → edge CDN (optional 301 caching) → load balancer → stateless redirect service → Redis cache → primary DB on miss. The <b>write path</b>: dashboard → API gateway (auth, creation rate limit) → shortening service → key allocator → DB (replicated write) → cache warm. Clicks are not written inline; the redirect service fires an async event to a queue consumed by an analytics aggregator.</p><pre>            ┌────────────┐   miss   ┌──────────┐\nreader ─LB─▶│ redirect   │─────────▶│  Redis   │─miss─▶ DB (replica)\n            │ service    │◀─────────│  cache   │\n            └─────┬──────┘  fill    └──────────┘\n                  │ async click event\n                  ▼\n            [ queue ] ─▶ aggregator ─▶ rollup table\n\nwriter ─▶ API gw ─▶ shorten svc ─▶ key allocator\n                        └──────────▶ DB primary (3-way replicated)</pre><p>Every component on the read path is stateless except cache and DB, so it scales horizontally behind the LB with no coordination.</p>",
        data:
          "<p>One core table plus an append-only click stream. The short code itself is the primary key — no auto-increment exposed anywhere.</p><pre>links\n  code        CHAR(7) PK        -- base62\n  long_url    TEXT (≤ 2 KB)\n  owner_id    BIGINT NULL\n  created_at  TIMESTAMP\n  expires_at  TIMESTAMP NULL\n  state       ENUM(active, disabled, expired)\n\nclicks_hourly (rollup)\n  code, hour_bucket, count      -- PK (code, hour_bucket)\n\nAPI\n  POST /api/links   {\"url\": \"https://…\", \"alias\": \"summer-sale?\", \"expires_at\": …}\n     → 201 {\"code\": \"x7Kp2Qa\", \"short_url\": \"https://sho.rt/x7Kp2Qa\"}\n  GET  /{code}      → 302 Location: long_url   (410 if expired, 404 unknown)\n  GET  /api/links/{code}/stats → {\"clicks_24h\": 1204, \"clicks_total\": 88231}</pre><p>If we ever shard, hash the code itself — it is uniformly random, so hash-mod or a consistent-hash ring gives even distribution with zero hot-shard risk from the keyspace (hot <i>traffic</i> is the cache's job, not the shard map's).</p>",
        deepdives:
          "<p><b>1. Code generation without collisions.</b> Hashing the long URL (MD5, take 7 chars) collides and leaks that two users shortened the same URL. Instead run a <b>key allocator</b>: a counter service hands out dense integer ranges (e.g. blocks of 10,000) to each shortening node; each node base62-encodes counter values locally. Collisions are impossible by construction, allocation is one RPC per 10k creations, and a crashed node merely burns an unused block — with 62^7 ≈ 3.5 trillion codes, waste is irrelevant. To stop codes being enumerable (sequential codes let scrapers walk your entire link space), apply a fixed secret permutation (a Feistel cipher over the 43-bit space) before encoding.</p><p><b>2. Hot keys.</b> One code at 8,000 QPS would hammer a single Redis shard. Defenses in order: the redirect service keeps a tiny in-process LRU (say 10k entries, 1 s TTL) — at 8k QPS that turns per-request cache hits into ~1 refresh/sec/instance; and for links marked cacheable we return <code>Cache-Control: max-age=300</code> with a 301 so CDN edges absorb repeats entirely.</p><p><b>3. 301 vs 302.</b> 301 is cached aggressively by browsers — great for latency, fatal for analytics and for takedowns (you cannot un-redirect a cached 301). We default to 302 for analytics-bearing links and use 301+CDN only for links whose owner opts out of stats. This is a policy knob, not a global constant.</p>",
        tradeoffs:
          "<p>We chose <b>302 over 301</b> as the default because accurate click data is a stated requirement and stale 301s make abuse takedown impossible; we pay for it with every repeat visitor hitting our edge. We chose a <b>central range-allocating counter over per-node random generation</b> because random 7-char codes need a uniqueness check per insert (a read-before-write race) while ranges make uniqueness free; the cost is one more service, mitigated by making range grants large and pre-fetched. We chose <b>async click events over inline counter increments</b> because an UPDATE per redirect would make the DB the read-path bottleneck at 4,600 QPS; the cost is up-to-5-minute stat lag, which the requirement explicitly allows. Main bottleneck to watch: the cache tier during hot-key storms — hence the in-process LRU layer.</p>",
        scaling:
          "<p><b>1x (launch, ~460 QPS avg):</b> one region, 3 redirect instances, one Redis pair, one Postgres primary with two replicas. Nothing exotic.</p><p><b>10x (4.6k avg / 46k peak):</b> the DB read path saturates first on cache misses after deploys (cold cache). Fix: persistent cache warming from a keyspace scan of links created in the last 90 days, plus replica reads. Move click rollups to a proper stream (Kafka-class) because the aggregator's batch inserts start contending.</p><p><b>100x (46k avg, global):</b> single-region RTT dominates p99 for far-away users. Go multi-region active-active for reads: full link table replicated to each region (it is only ~half a TB), writes still routed to a home region — links are immutable after creation, so cross-region replication lag only delays a brand-new link working globally by ~1 s, which we accept and document. At this point the code table outgrows one node's write throughput too, so shard the primary by hash(code) across 8 shards.</p>"
      },
      followups: [
        "A customer's link got a cached 301 pointing to a domain that is now serving malware. What can you actually do?",
        "How would you support bulk creation of 10 million links in one batch job without disturbing live traffic?",
        "Marketing wants unique-visitor counts, not just clicks. What changes?",
        "How do you prevent someone from enumerating all short codes and scraping destinations?",
        "The counter/range-allocator service is down. What exactly stops working, and for how long?",
        "How would you delete a user's data (GDPR) when clicks are already merged into hourly rollups?"
      ],
      rubric: {
        senior: [
          "States the read:write ratio early and lets it drive the design (cache-first, async analytics).",
          "Resolves 301 vs 302 with a reasoned default rather than listing both and moving on.",
          "Chooses a collision-free key scheme and explains why hash-of-URL is inferior.",
          "Handles the hot-key case with a concrete mechanism, not just 'add caching'.",
          "Defines the API and data model precisely, including expiry and error codes."
        ],
        staff: [
          "Quantifies the hot-key math (8k QPS vs per-instance LRU refresh rate) instead of hand-waving.",
          "Raises code enumerability as a security concern and proposes a permutation fix.",
          "Names the failure blast radius of the allocator and shows pre-fetched ranges bound it.",
          "Gives a multi-region story that exploits link immutability, with the replication-lag caveat stated.",
          "Discusses takedown/abuse operationally: blocklist checks at creation, kill-switch semantics with CDN purge."
        ]
      }
    },
    {
      slug: "api-rate-limiter",
      name: "Design an API Rate Limiter",
      category: "System Design",
      difficulty: "Easy",
      minutes: 35,
      summary: "token bucket, distributed counters, fail-open",
      statement:
        "<p>Your platform exposes a public API used by thousands of third-party apps. A handful of badly written clients retry in tight loops and periodically brown out the backend for everyone. You are asked to design a rate-limiting layer that enforces per-API-key quotas — for example, 100 requests per minute on the free tier and 5,000 per minute for paid keys — across a fleet of API gateway instances.</p><p>The limiter must make an allow/deny decision on every request without adding meaningful latency, behave sensibly when its own storage is degraded, and give clients enough signal (headers, status codes) to back off correctly. Design the algorithm, the shared state, and the failure behavior.</p>",
      clarifying: [
        "Is the limit per API key, per user, per IP, or some combination with different windows?",
        "Do we need strict global accuracy, or is a small overshoot (say ≤ 5%) acceptable across gateway nodes?",
        "Should limits be smooth (token bucket allows bursts) or hard-edged windows?",
        "What should happen when the limiter's backing store is unreachable — fail open or fail closed?",
        "Do rejected requests need <code>Retry-After</code> and remaining-quota headers?",
        "Are limits static per tier, or dynamically configurable per customer at runtime?",
        "Do any endpoints need separate, stricter limits (e.g. login attempts) with different burst behavior?"
      ],
      functional: [
        "Every request is checked against the caller's quota before reaching backend services.",
        "Over-limit requests receive HTTP 429 with <code>Retry-After</code> and <code>X-RateLimit-Remaining</code> headers.",
        "Limits are configurable per key at runtime without redeploying gateways; changes apply within 30 s.",
        "Multiple rules can apply to one request (per-key per-minute AND per-key per-day) — all must pass.",
        "Operators can query current usage for any key for support and abuse investigations."
      ],
      nonfunctional: [
        "Decision latency budget: p99 ≤ 2 ms added to the request path.",
        "Accuracy: enforcement within 5% of the configured limit under normal operation; never more than 2x under store failure.",
        "The limiter must survive the loss of any single cache node without dropping legitimate traffic (availability of the API > strictness of the limit).",
        "Scale: 50,000 requests/sec across the gateway fleet, 200,000 distinct active keys per hour.",
        "Counter state may be lost on cache restart — limits reset, which is acceptable; durability is NOT required."
      ],
      estimation: {
        prompts: [
          "Requests/sec the limiter must decide on, and per-decision latency budget.",
          "Memory footprint of counters for all active keys.",
          "Network round trips per decision and whether they fit the 2 ms budget.",
          "Load on the shared store and whether one node suffices."
        ],
        worked:
          "<p>Fleet-wide load and state are both small once you do the math — the challenge is latency and failure semantics, not scale.</p><pre>decisions: 50,000 req/s sustained; peak 2x → 100,000/s\nactive keys/hour: 200,000\nstate per key: 2 rules × (counter 8 B + window ts 8 B + key hash ~40 B) ≈ 120 B\ntotal counter memory: 200,000 × 120 B ≈ 24 MB  → trivially fits one Redis node</pre><p>Round trips: a naive read-then-write is 2 RTTs and racy; a single atomic Lua/script call is 1 RTT. Same-AZ Redis RTT ≈ 0.3–0.5 ms, so 1 call fits the 2 ms p99 budget with room for TLS and queuing.</p><pre>store ops: 100,000 decisions/s × 1 scripted call ≈ 100k ops/s\none Redis node handles ~100–150k simple ops/s → at peak we are at the edge,\nso shard counters by hash(key) across 3 nodes → ~33k ops/s each, and\nany single node loss degrades only 1/3 of keys to local-only limiting.</pre>"
      },
      model: {
        highlevel:
          "<p>The limiter lives inside the API gateway as a library, backed by a small sharded Redis tier for shared counters and a config service for rules. Request flow: client → LB → gateway instance → <b>limiter middleware</b> → (atomic counter op on the Redis shard owning this key) → allow → backend, or deny → 429. A <b>rules service</b> publishes limit configs to gateways via a watch/poll channel (30 s propagation). A tiny <b>usage query API</b> reads the same counters for support tooling.</p><pre>client ─▶ LB ─▶ gateway ──▶ limiter lib ──▶ redis shard [hash(key) % 3]\n                   │              │ deny\n                   ▼ allow        ▼\n               backend svc      429 + Retry-After\n\nrules svc ──(push/poll, 30s)──▶ gateway config cache</pre><p>Crucially the gateway also keeps a <b>local fallback limiter</b> per key (in-process token bucket at limit ÷ number-of-gateways × safety factor) that takes over when the owning Redis shard is unreachable — this is what makes fail-open bounded rather than unlimited.</p>",
        data:
          "<p>State is one Redis hash per (key, rule) pair, mutated by a single server-side script so check-and-decrement is atomic.</p><pre>redis key:  rl:{api_key}:{rule_id}        TTL = 2 × window\nfields:     tokens   (float)  -- current bucket level\n            ts       (ms)     -- last refill time\n\nscript(now, rate, burst):\n  tokens = min(burst, tokens + (now - ts) × rate)\n  if tokens ≥ 1: tokens -= 1; return ALLOW, remaining\n  else:          return DENY, retry_after = (1 - tokens) / rate\n\nrule config (rules service, replicated to gateways):\n  { rule_id, match: {tier: \"free\"}, window: \"1m\", limit: 100, burst: 20 }\n\nresponse headers:\n  X-RateLimit-Limit: 100\n  X-RateLimit-Remaining: 37\n  Retry-After: 12          (on 429 only)</pre><p>TTL twice the window means idle keys evict themselves; there is no cleanup job and no unbounded growth.</p>",
        deepdives:
          "<p><b>1. Algorithm choice.</b> Fixed windows allow a 2x burst at the boundary (100 at 11:59:59 + 100 at 12:00:01). Sliding-window <i>log</i> is exact but stores one timestamp per request — 100k/s of writes, absurd here. <b>Token bucket</b> gives smooth refill, native burst control, O(1) state, and a directly computable <code>Retry-After</code>; sliding-window <i>counter</i> (weighted blend of two fixed windows) is the runner-up. We take token bucket for its burst semantics: paid tiers explicitly want short bursts above steady-state rate.</p><p><b>2. Distributed accuracy.</b> With counters sharded by key, each key has exactly one authoritative bucket — no cross-node summation problem, and accuracy is exact per key as long as its shard is up. The race that remains is script execution vs failover: an async replica promotion can lose the last ~1 s of decrements, briefly refilling buckets. That's an under-enforcement of a few requests, within the 5% tolerance, so we accept it rather than pay for synchronous replication on the hot path.</p><p><b>3. Failure semantics.</b> Fail-closed turns a cache incident into a full API outage — unacceptable. Pure fail-open invites exactly the stampedes the limiter exists to stop. The bounded compromise: on shard timeout (budget 5 ms), the gateway flips that key to its local token bucket sized at <code>limit / N_gateways × 1.5</code>. With 20 gateways that caps fleet-wide overshoot at 1.5x, satisfying the 'never more than 2x' requirement, and it needs no coordination because N comes from service discovery.</p>",
        tradeoffs:
          "<p>We chose <b>token bucket over sliding-window log</b> because exactness is not a requirement but per-decision cost is: O(1) memory per key vs O(requests) is decisive at 100k/s. We chose <b>a shared Redis tier over gossip-summed local counters</b> because gossip converges too slowly for 1-minute windows and makes support queries ('what is key X's usage now?') unanswerable. We chose <b>bounded fail-open over fail-closed</b> because the API's availability SLO outranks limiter strictness — and we made the bound explicit (1.5x) rather than leaving 'fail open' as an unquantified shrug. Bottleneck watch: the Redis script CPU at peak; mitigation is adding shards, since keys are hash-distributed and shards share nothing.</p>",
        scaling:
          "<p><b>1x (50k/s):</b> 3 Redis shards, limiter as gateway middleware, one rules service. Done.</p><p><b>10x (500k/s):</b> Redis network hops become the cost center. Introduce a two-tier scheme: gateways batch-lease tokens (e.g. grab 20 tokens per remote call for high-rate keys) and serve decisions locally, syncing with the shard every 100 ms. Accuracy loosens to the lease granularity — still within 5% for any key doing > 200 req/min. Low-rate keys stay on the exact 1-RTT path.</p><p><b>100x (5M/s, multi-region):</b> keep enforcement regional (each region enforces limit × its traffic share, rebalanced hourly from global usage stats) rather than a global synchronous counter — cross-region RTT of 60–150 ms can never fit a 2 ms budget, so global exactness is physically off the table; we say so and bound the error instead. Abuse detection graduates from limiting to an offline pipeline flagging keys with pathological patterns for hard blocks.</p>"
      },
      followups: [
        "A customer on the paid tier reports 429s while their dashboard shows usage under the limit. How do you debug it?",
        "How would you add a per-IP limit for unauthenticated endpoints without exploding counter cardinality from spoofed IPs?",
        "Leadership wants limits enforced globally-exactly across 3 regions. What do you tell them?",
        "How does your design handle a thundering herd of retries the moment a 429'd window resets?",
        "Can the limiter itself be abused as a DoS vector (attacker exhausts someone else's quota)?",
        "How would you test that the bounded fail-open actually bounds overshoot at 1.5x?"
      ],
      rubric: {
        senior: [
          "Compares at least three algorithms and commits to one with a reason tied to requirements.",
          "Makes the decision path a single atomic store operation, not read-modify-write.",
          "Specifies 429 semantics including Retry-After computed from bucket state.",
          "Addresses store failure explicitly with a defined degraded mode.",
          "Keys counters so each key has one authoritative owner (no cross-node summing)."
        ],
        staff: [
          "Quantifies the fail-open bound (limit/N × factor) and connects it to the stated 2x ceiling.",
          "Rejects global-exact multi-region limiting on RTT physics and offers regional apportionment instead.",
          "Proposes token leasing at 10x and states the accuracy cost of the lease granularity.",
          "Considers failover-induced counter loss and argues why it is acceptable rather than ignoring it.",
          "Covers operability: runtime rule changes, usage queries for support, cardinality control."
        ]
      }
    },
    {
      slug: "distributed-kv-store",
      name: "Design a Distributed Key-Value Store",
      category: "System Design",
      difficulty: "Hard",
      minutes: 50,
      summary: "replication, quorums, conflict repair, partition math",
      statement:
        "<p>Build a horizontally scalable key-value store from first principles — the storage substrate a company would run under its session data, shopping carts, and device state. Values are opaque blobs up to 1 MB; keys are strings. The store must keep serving reads and writes through node failures and network partitions, across a cluster you can grow from 6 nodes to 600 without downtime.</p><p>You own everything: partitioning, replication, the consistency contract you offer clients, failure detection, and how replicas that have drifted apart get repaired. Interviewers will push hardest on what happens during a partition and on the exact guarantees your GET and PUT provide.</p><p>Assume a mixed fleet where disks die weekly at scale and rolling deploys restart nodes daily — recovery must be routine, not an event.</p>",
      clarifying: [
        "What consistency do clients need — read-your-own-writes, linearizable, or eventual with bounded staleness?",
        "What is the read:write ratio and the value-size distribution (median vs the 1 MB tail)?",
        "During a network partition, should the minority side keep accepting writes (AP) or refuse (CP)?",
        "Do we need range scans or only point GET/PUT/DELETE? (This decides the partitioning scheme.)",
        "Are there multi-key transactions, or is single-key atomicity enough?",
        "What durability is required on ack — fsync on how many replicas?",
        "Is there a TTL/expiry feature, and can clients tolerate resurrected deleted keys?"
      ],
      functional: [
        "GET(key), PUT(key, value), DELETE(key) with single-key atomicity; no cross-key transactions.",
        "Per-request consistency override: default eventual, optional quorum read for read-your-writes.",
        "Cluster membership changes (add/remove node) rebalance data automatically with no write downtime.",
        "TTL per key; expired keys stop being returned within 1 s of expiry even if physical purge lags.",
        "Admin API exposes per-node key counts, replication lag, and hinted-handoff backlog."
      ],
      nonfunctional: [
        "p99 GET ≤ 10 ms and p99 PUT ≤ 25 ms in-region for values ≤ 64 KB.",
        "Availability 99.99% for the default (eventual) mode, including during single-node failures and rolling deploys.",
        "Durability: an acked PUT survives the simultaneous loss of any 2 nodes (replication factor 3, W=2 with fsync).",
        "Scale: 1B keys, 20 TB logical data, 300k reads/s and 60k writes/s at peak.",
        "Rebalancing moves no more than 1/N of the data when the cluster grows by one node."
      ],
      estimation: {
        prompts: [
          "Total physical storage with replication and overhead, and per-node share at 60 nodes.",
          "Per-node QPS at peak and whether one node's disk/network can carry it.",
          "Memory needed for the in-RAM index vs a page-cache approach.",
          "How long node recovery takes (data to re-replicate after a disk loss)."
        ],
        worked:
          "<p>Logical data 20 TB; with RF=3 plus ~30% LSM/space-amp overhead:</p><pre>physical = 20 TB × 3 × 1.3 ≈ 78 TB\nat 60 nodes → 1.3 TB/node (fine for 2 TB NVMe with headroom)\n\ntraffic: 300k reads/s + 60k writes/s = 360k ops/s cluster-wide\ncoordinator spread over 60 nodes ≈ 6k ops/s/node front-door\nbut each op fans to 3 replicas → ~18k internal ops/s/node — NVMe + 10 GbE ok\n(1 MB tail values: 6k × even 1% × 1 MB = 60 MB/s/node network — watch this)</pre><p>Index: 1B keys × RF 3 / 60 nodes = 50M key-entries/node; at ~60 B/entry an in-RAM hash index costs ~3 GB/node — affordable, so point reads avoid disk for the index and pay one seek for the value.</p><pre>disk-loss recovery: 1.3 TB re-replicated from 59 peers\nthrottle 40 MB/s per source pair-stream, ~10 parallel streams → ≈ 55 min\n→ window of RF=2 exposure ≈ 1 hour; acceptable vs 2-node durability spec</pre>"
      },
      model: {
        highlevel:
          "<p>A symmetric, coordinator-per-request design: every node can accept any request. Client → smart client library (or thin proxy) with a cached ring map → <b>coordinator node</b> → the N=3 replica nodes owning the key's partition. Components on each node: request coordinator, storage engine (LSM tree: memtable + WAL + SSTables), <b>failure detector</b> (gossip heartbeats), <b>hinted-handoff buffer</b>, and an <b>anti-entropy service</b> (Merkle-tree sync). A tiny strongly consistent <b>membership service</b> (3–5 node Raft group) is the source of truth for the ring map only — it is on no data path.</p><pre>client(lib w/ ring map) ─▶ coordinator (any node)\n                             ├─▶ replica A (owner)   ─┐\n                             ├─▶ replica B            ├─ W=2 acks → OK\n                             └─▶ replica C            ─┘\n gossip: all nodes ◀──▶ all nodes (liveness, load)\n membership raft: ring changes only (add/remove node)</pre><p>Writes append to WAL + memtable and ack at W=2 of 3; reads default to R=1 with async read-repair, or R=2 when the client asks for quorum. W+R &gt; N (2+2 &gt; 3) yields read-your-writes when requested.</p>",
        data:
          "<p>Partitioning: hash(key) onto a consistent-hash ring with virtual nodes (covered as its own question in this set); each physical node owns ~200 vnodes so adding one node moves ~1/N of the data. Per-key metadata makes conflict handling explicit:</p><pre>stored record\n  key            bytes\n  value          bytes (≤ 1 MB)\n  version_vector {node_id → counter}   -- detects concurrent writes\n  timestamp_ms   int64                 -- LWW tiebreak (client-visible policy)\n  ttl_deadline   int64 | null\n  tombstone      bool                  -- deletes are writes; purged after 3 d\n\nAPI\n  PUT  /kv/{key}    body=value  hdr: X-Consistency: eventual|quorum\n     → 200 {\"version\": \"A:12,B:7\"}\n  GET  /kv/{key}    hdr: X-Consistency\n     → 200 value + version | 404\n  DELETE /kv/{key}  → 204   (writes tombstone)</pre><p>Storage engine is LSM because the workload is write-heavy for a disk structure (60k/s): sequential WAL appends, background compaction, bloom filters to keep point-GET read-amp near 1.</p>",
        deepdives:
          "<p><b>1. The partition decision.</b> We commit to AP for the default path: during a partition both sides keep accepting writes, because carts-and-sessions workloads price availability above single-copy semantics. Concurrent writes to one key produce divergent version vectors; on read, the coordinator detects vector incomparability. Rather than punting siblings to every client, policy is per-namespace: LWW (timestamp) for session-like data where losing one racing write is fine, and application-merge (sibling return) only for namespaces that opt in, like carts where union-of-items is the correct merge. Saying 'we return conflicts to the app' globally is a non-answer — most apps will not handle them.</p><p><b>2. Failure detection and hinted handoff.</b> Gossip-based phi-accrual detection marks a node suspect in ~2 s without a central health checker. While replica C is down, the coordinator writes C's copy to a designated stand-in node as a <i>hint</i> (keyed by C's id); when C returns, hints stream back. Hints are capped (e.g. 4 GB/node, 3 h) — beyond that we stop hinting and rely on anti-entropy, otherwise a long outage turns every neighbor into a landfill.</p><p><b>3. Anti-entropy and deletes.</b> Replicas periodically exchange Merkle trees per vnode range and stream only differing leaves — this is what heals drift that handoff missed. Deletes must be tombstones with a purge horizon (3 days) strictly longer than the max repair interval; purge earlier and a lagging replica resurrects the key, the classic KV-store bug. TTL expiry is enforced at read time (filter by deadline) so correctness never waits on compaction.</p>",
        tradeoffs:
          "<p>We chose <b>AP with tunable quorums over a Raft-per-shard CP design</b> because the SLO demands writes through partitions and single-key semantics don't need consensus; the cost is version vectors, repair machinery, and a weaker default contract — which we surface honestly in the API as per-request consistency. We chose <b>LSM over B-tree</b> for sequential-write throughput at 60k/s; the cost is compaction I/O competing with foreground reads, bounded by rate-limiting compaction to 30% of disk bandwidth. We chose <b>a Raft membership core over fully emergent gossip membership</b> because two nodes disagreeing about ring ownership silently misroutes writes — ring truth must be strongly consistent even in an AP store; data stays AP, metadata is CP. Bottleneck watch: large-value (1 MB) traffic on node NICs — mitigate by streaming values and considering a separate blob tier if the tail grows.</p>",
        scaling:
          "<p><b>1x (6 nodes, ~2 TB logical):</b> RF=3, vnodes on, anti-entropy weekly. The Raft membership group can colocate on data nodes.</p><p><b>10x (60 nodes, 20 TB, 360k ops/s):</b> first breakage is operational: manual repair scheduling and compaction storms during peak. Automate: continuous incremental anti-entropy, compaction throttling tied to p99, and dedicated (non-colocated) membership nodes. Smart clients now matter — proxy hops cost ~1 ms of the 10 ms budget.</p><p><b>100x (600 nodes, 200 TB, 3.6M ops/s):</b> gossip convergence and full-mesh chatter strain at 600 nodes — move to a partial-view gossip and per-rack aggregation. Blast radius becomes the design driver: split into cells of ~100 nodes with namespaces pinned to cells, so a bad deploy or poison workload takes down 1/6 of tenants, not all. Cross-region: async ring-to-ring replication with per-namespace conflict policy — reusing the same version-vector machinery, which is why we built it in at 1x.</p>"
      },
      followups: [
        "A client does PUT then immediately GET on another connection and sees the old value. Walk me through exactly why, and every knob that changes it.",
        "Two writes to the same key raced during a partition. Show the version vectors and what the read returns under each conflict policy.",
        "Why must the tombstone purge horizon exceed the max anti-entropy interval? What breaks otherwise?",
        "A node was down 6 hours — past the hint cap. What is the sequence that makes its data consistent again?",
        "How would you add range scans, and what does that do to your hash partitioning?",
        "What is your consistency story for a counter (increment) on top of this store, and why is it awkward?"
      ],
      rubric: {
        senior: [
          "States an explicit consistency contract (N/W/R values) and what W+R>N buys.",
          "Partitions with consistent hashing + vnodes and ties it to the 1/N rebalancing requirement.",
          "Covers the full repair triad: read repair, hinted handoff, anti-entropy — not just one.",
          "Handles deletes as tombstones with a purge horizon justified against repair intervals.",
          "Chooses a storage engine (LSM) with a workload-based reason."
        ],
        staff: [
          "Separates data-plane AP from control-plane CP (Raft-backed ring) and says why both, with the misrouting failure mode named.",
          "Makes conflict policy per-namespace with concrete merge examples, rejecting 'return siblings' as a universal answer.",
          "Quantifies recovery: 1.3 TB in ~55 min, and connects the RF=2 exposure window to the durability SLO.",
          "Caps hinted handoff and explains the landfill failure mode of unbounded hints.",
          "Plans blast-radius cells at 100x rather than scaling one flat ring forever."
        ]
      }
    }
  );
  window.DESIGN_QUESTIONS.push(
    {
      slug: "consistent-hashing",
      name: "Design Consistent Hashing for a Cache Cluster",
      category: "System Design",
      difficulty: "Medium",
      minutes: 40,
      summary: "build the ring, virtual nodes, minimal-movement rebalancing",
      statement:
        "<p>Your team runs a 12-node cache cluster fronting a product database. Today keys are routed with <code>hash(key) % 12</code>. Last week one node died and the modulo shifted almost every key to a different node — the cache hit rate fell off a cliff and the database nearly buckled under the miss storm. You have been asked to design the routing layer properly.</p><p>Design consistent hashing as a system in its own right: the ring construction, how keys and nodes map onto it, why naive one-point-per-node placement produces lopsided load, and how virtual nodes fix it. Then treat operations as first-class: adding a node, removing a node, a node with double the RAM of the others, and how every client agrees on the same ring at the same time.</p><p>Be quantitative — the interviewer will ask what fraction of keys move in each scenario and how imbalanced the ring can get.</p>",
      clarifying: [
        "How many nodes now, and how often does membership actually change (planned scale-ups vs crashes)?",
        "Is the fleet homogeneous, or do some nodes deserve more keyspace (heterogeneous capacity)?",
        "Who routes — a smart client library in every service, or a central proxy tier?",
        "What staleness can we tolerate in ring views? Is a few seconds of split-view acceptable for a cache?",
        "Do we need replication on the ring (key stored on next R successors), or is this a pure single-copy cache?",
        "What key count and skew are we routing — are there hot keys the ring cannot help with?",
        "Is there an existing coordination service (ZooKeeper/etcd-class) we can lean on for membership?"
      ],
      functional: [
        "Map any key to exactly one owning node deterministically, identically from every router.",
        "Adding one node to an N-node ring relocates ~1/(N+1) of keys, touching no other assignments.",
        "Removing/losing a node redistributes only that node's keys, spread across many survivors — not dumped on one neighbor.",
        "Support weighted nodes: a 2x-capacity node receives ~2x the keyspace via proportionally more vnodes.",
        "Expose a lookup debug API: given a key, return its owning node and the vnode interval that claimed it."
      ],
      nonfunctional: [
        "Routing decision is in-process and O(log V) — under 5 µs per lookup, no network hop.",
        "Load spread: with vnodes tuned, max node load ≤ 1.1x mean (10% imbalance ceiling) at 12–200 nodes.",
        "Ring-view convergence across all routers within 5 s of a membership change.",
        "Memory for the ring structure under 10 MB per router even at 200 nodes × 250 vnodes.",
        "Node-loss cache-miss spike bounded: losing 1 of 12 nodes costs ~8% hit rate, not ~90% like modulo."
      ],
      estimation: {
        prompts: [
          "Fraction of keys that move under modulo vs consistent hashing when N goes 12 → 13.",
          "Standard deviation of per-node load vs vnode count — how many vnodes for ≤10% imbalance?",
          "Ring memory: entries × bytes at 200 nodes × 250 vnodes.",
          "Lookup cost: binary search depth over the vnode array."
        ],
        worked:
          "<p>The motivating disaster, quantified. With modulo routing, going 12 → 13 nodes remaps every key whose <code>hash % 12 ≠ hash % 13</code>:</p><pre>modulo:      keys unmoved ≈ 1/13 → ~92% of keys MOVE (hit rate craters)\nconsistent:  keys moved   ≈ 1/13 ≈ 7.7% (only the slice the new node claims)</pre><p>Balance vs vnodes: with V random points per node, per-node load imbalance shrinks roughly with 1/√V. Empirically:</p><pre>V = 1    → max/mean often 2–3x   (useless)\nV = 100  → spread ≈ ±10%\nV = 250  → spread ≈ ±5–6%  ← our pick for the 1.1x ceiling with margin</pre><p>Ring memory and lookup at the high end:</p><pre>200 nodes × 250 vnodes = 50,000 ring entries\nentry = 8 B hash + 2 B node idx ≈ 10 B → 500 KB sorted array (≪ 10 MB budget)\nlookup = binary search over 50k ≈ 16 comparisons ≈ sub-µs in-process</pre><p>Node-loss math at 12 nodes: the dead node owned ~1/12 ≈ 8.3% of keys; with 250 vnodes its slices scatter across all 11 survivors, so each survivor absorbs ~0.75% extra load — no neighbor doubles.</p>"
      },
      model: {
        highlevel:
          "<p>Three pieces: a <b>ring library</b> embedded in every router (smart client), a <b>membership authority</b> (small etcd/ZooKeeper-class quorum) holding the node list + weights as the single source of truth, and a <b>watch channel</b> pushing membership revisions to routers. The routers do all routing locally; the authority is only consulted on change.</p><pre>            ┌── membership authority (3-node quorum) ──┐\n            │  {node, weight, state, revision}         │\n            └───────────────┬──────────────────────────┘\n                    watch / push (rev n)\n        ┌───────────┬───────┴────────┬───────────┐\n     router A    router B        router C     router D\n     [ring lib: sorted vnode array, rev n]\n        │ hash(key) → binary search → owner\n        ▼\n     cache node 7  (of 12)</pre><p>Ring construction: for each node i with weight w_i, generate <code>250 × w_i</code> vnode positions as <code>hash64(node_id + \":\" + j)</code>; merge all positions into one sorted array. A key routes to the first vnode clockwise from <code>hash64(key)</code>. Nodes never choose their own positions at runtime — positions are a pure function of (id, weight), so every router derives an identical ring from the same membership revision.</p>",
        data:
          "<p>The state is deliberately tiny — that is the point of the design.</p><pre>membership record (authority)\n  revision   int64      -- monotonically increases on any change\n  nodes: [ {id: \"cache-07\", host, port, weight: 1.0,\n            state: joining|active|leaving|dead} ]\n\nrouter in-memory ring\n  positions  uint64[]   -- sorted, 250 × Σweights entries\n  owner_idx  uint16[]   -- parallel array → node table\n\nlookup(key):\n  h = hash64(key)                        // 64-bit, well-mixed (xxhash-class)\n  i = first index with positions[i] ≥ h  // binary search, wrap to 0\n  return nodes[owner_idx[i]]\n\ndebug API (per router)\n  GET /ring/lookup?key=sku:123\n   → {\"owner\": \"cache-07\", \"vnode\": \"cache-07:184\",\n      \"interval\": [\"0x8a41…\", \"0x8a63…\"], \"revision\": 4412}</pre><p>Replication, if wanted later, falls out naturally: walk clockwise to the next R vnodes with <i>distinct physical nodes</i> — the distinctness check matters, since adjacent vnodes can belong to one node.</p>",
        deepdives:
          "<p><b>1. Why virtual nodes, precisely.</b> With one point per node, the arc lengths between N random points on a circle are wildly uneven — the largest arc is typically several times the mean, so one node eats a multiple of its fair share. Averaging each node over 250 arcs concentrates its total share around the mean (variance drops ~1/V). Vnodes also solve two more problems for free: <b>heterogeneity</b> (weight 2.0 → 500 vnodes → 2x keyspace) and <b>failure scatter</b> (a dead node's 250 slices spread across all survivors instead of dumping onto one clockwise neighbor). The cost is ring size and slightly slower rebuild — both trivial at 500 KB.</p><p><b>2. Agreeing on the ring.</b> Two routers on different revisions briefly send the same key to different nodes. For a cache this is a correctness non-event (a few duplicate misses) but we still bound it: every membership change bumps <code>revision</code>, routers attach their revision to a heartbeat, and the authority alerts if any router lags &gt; 5 s. What we must NOT do is let cache nodes gossip membership among themselves ad hoc — split-brain ring views are how 'mysterious 2% miss rate' incidents are born. One authority, monotonic revisions, derived rings.</p><p><b>3. Rebalancing choreography.</b> Adding a node cold means its ~7.7% of keys all miss at once. Instead: state <code>joining</code> — routers send it writes/fills but on read-miss fall through to the <i>previous</i> owner (computable from the old revision's ring) for a warmup window of ~10 min, promoting entries as they're touched. Removal mirrors it: <code>leaving</code> drains by serving reads while new fills go to successors. Both need the router to hold two ring revisions at once, which costs another 500 KB — cheap insurance against self-inflicted miss storms.</p>",
        tradeoffs:
          "<p>We chose <b>smart-client routing over a proxy tier</b> because a proxy adds a network hop (breaking the 5 µs in-process budget) and becomes its own scaling problem; the cost is that the ring library must exist for every client language, so we keep its contract dead simple (sorted array + binary search). We chose <b>deterministic vnode positions (pure hash of id:index) over randomly assigned/persisted positions</b> so routers can rebuild identical rings from a 2 KB membership record with no position database. We chose <b>250 vnodes over 1000</b>: beyond ~250 the balance gain per doubling is marginal (1/√V flattens) while membership-change churn in the sorted array grows linearly. And we accept <b>brief dual-revision divergence</b> instead of paying for a synchronized ring flip — a cache tolerates it; a storage system would not, which is exactly the nuance worth saying aloud.</p>",
        scaling:
          "<p><b>1x (12 nodes):</b> the design above, possibly with membership riding an existing etcd. Honest note: at a fixed 12 nodes forever, even a static config file for membership would do — the machinery earns its keep the day membership changes weekly.</p><p><b>10x (120 nodes):</b> ring math is unfazed (30k entries). What breaks is operations: crash-detection must be automated (authority marks <code>dead</code> after missed leases, routers react on watch), and rolling deploys must use the joining/leaving warmup states or every deploy dents the hit rate by a few percent.</p><p><b>100x (1,200 nodes, multi-tenant):</b> one giant ring makes every membership event touch every router fleet-wide. Partition into cells of ~100 nodes, with a top-level (rendezvous or static) mapping of namespaces → cells; each cell runs its own ring and authority. Also at this scale, per-key hot spots dominate imbalance more than arc variance does — the ring balances <i>keyspace</i>, not <i>traffic</i> — so pair it with hot-key detection and per-key replication (route hot keys to K nodes, pick randomly per read). Knowing the ring's blind spot is the 100x insight.</p>"
      },
      followups: [
        "Prove the ~1/(N+1) movement claim for adding a node. What is the exact expected fraction with vnodes?",
        "A node with weight 2.0 still shows only 1.4x traffic. What explains the gap between keyspace share and traffic share?",
        "Two routers disagree on the ring for 30 s. What symptoms appear, and how would your monitoring catch it?",
        "Compare against rendezvous (highest-random-weight) hashing — when would you pick it over the ring?",
        "How do you migrate the existing modulo-routed cluster to the ring with zero downtime?",
        "Your ring balances keyspace but one key takes 20% of all traffic. What layer fixes that, and how?"
      ],
      rubric: {
        senior: [
          "Quantifies modulo's ~92% remap vs consistent hashing's ~1/N and uses it as the motivation.",
          "Explains vnodes via arc-length variance, not just 'they help balance'.",
          "Derives weighted nodes from vnode counts rather than bolting on a special case.",
          "Specifies the concrete data structure (sorted array + binary search) with lookup complexity.",
          "Handles both add and remove paths and states the movement fraction for each."
        ],
        staff: [
          "Insists on a single membership authority with monotonic revisions and names the split-brain failure mode it prevents.",
          "Designs warmup/drain (joining/leaving) choreography to bound the miss spike, holding two ring revisions.",
          "Calls out the ring's blind spot — keyspace balance ≠ traffic balance — and layers hot-key handling on top.",
          "Compares against rendezvous hashing and modulo honestly, including when the simpler tool wins.",
          "Admits the static-12-node case doesn't need this machinery; justifies it by membership-change frequency."
        ]
      }
    }
  );
  window.DESIGN_QUESTIONS.push(
    {
      slug: "unique-id-generator",
      name: "Design a Distributed Unique ID Generator",
      category: "System Design",
      difficulty: "Medium",
      minutes: 40,
      summary: "64-bit sortable ids, clock skew, worker-id assignment",
      statement:
        "<p>Every service at your company mints its own primary keys today — some use database auto-increment, some UUIDv4 — and it is causing pain: auto-increment forces a single-writer database, and random UUIDs shred B-tree index locality and cannot be sorted by creation time. You are asked to design a company-wide ID generation service (or library) that issues unique, roughly time-ordered 64-bit integers.</p><p>The IDs will become primary keys in sharded databases, message IDs in queues, and public identifiers in URLs. Design the bit layout, decide library vs service, and treat the two classic failure modes as first-class problems: two generators accidentally sharing an identity, and a machine whose clock jumps backward after an NTP correction.</p><p>Callers are latency-sensitive — ID minting sits inside every write path in the company.</p>",
      clarifying: [
        "Must IDs be strictly monotonic per generator, or is roughly-time-ordered across the fleet enough?",
        "Is 64 bits a hard requirement (fits BIGINT, compact in URLs), or is 128 acceptable?",
        "Peak IDs/sec per process and fleet-wide — do we ever exceed ~4M/sec on one node?",
        "May IDs leak information (creation time, rough volume between two ids)? Any product objection?",
        "Library embedded in each service, or a central network service — what latency budget do callers have?",
        "How many concurrent generator instances must be supported (bounds the worker-id bits)?",
        "What should a generator do when its clock moves backward — block, error, or borrow from a logical counter?"
      ],
      functional: [
        "Generate a unique 64-bit ID on demand; no two IDs ever collide across the fleet, ever.",
        "IDs sort by generation time to within ~1 second across machines (index locality + cheap time-range scans).",
        "A generator instance acquires its identity (worker id) automatically at startup — no hand-maintained config.",
        "The epoch and bit layout are versioned so the scheme can evolve without colliding with old IDs.",
        "Provide a decode utility: given an ID, return its timestamp, worker id, and sequence for debugging."
      ],
      nonfunctional: [
        "Latency: p99 ≤ 50 µs per ID when embedded as a library (no network hop on the hot path).",
        "Throughput: ≥ 400k IDs/sec per generator instance; 50M/sec fleet-wide headroom.",
        "Availability 99.995%: ID minting must not depend on any remote call at generation time.",
        "Correctness under clock skew: tolerate NTP steps of ±5 s with zero duplicates issued.",
        "Capacity horizon: the layout must not exhaust timestamps for at least 60 years."
      ],
      estimation: {
        prompts: [
          "Bit budget: how to split 64 bits among timestamp, worker, sequence — and what each choice caps.",
          "Years of runway from the timestamp bits at millisecond resolution.",
          "Max IDs/sec per worker implied by the sequence bits, vs the 400k/sec requirement.",
          "How many concurrent workers the worker-id bits allow, vs fleet size."
        ],
        worked:
          "<p>Start from the constraints and let them fix the layout. Sign bit stays 0 (some languages choke on unsigned 64).</p><pre>layout: [1 sign][41 timestamp ms][10 worker][12 sequence]\n\ntimestamp: 2^41 ms ≈ 2.199e12 ms ≈ 69.7 years from our custom epoch\n           (epoch 2026-01-01 → runs out ~2095, beats the 60-yr spec)\nworker:    2^10 = 1,024 concurrent generators\nsequence:  2^12 = 4,096 ids/ms/worker → 4,096,000/sec/worker\n           → 10x the 400k/sec requirement per instance</pre><p>Fleet ceiling: 1,024 workers × 4.096M/s ≈ 4.2B IDs/sec — the 50M/s fleet target uses ~1% of headroom. If the company ever needs &gt;1,024 concurrent generators, steal a sequence bit (2,048 workers × 2.048M/s) — still 5x per-instance spec; this knob is why the layout is versioned.</p><pre>sanity: 50M ids/s × 86,400 s ≈ 4.3T ids/day — dwarfed by the 2^63 space;\nexhaustion risk is timestamp bits, not total volume.</pre>"
      },
      model: {
        highlevel:
          "<p>Two planes. The <b>hot path is a library</b> compiled into every service: it holds (epoch, worker_id, last_ts, sequence) in memory and mints IDs with a few arithmetic ops under a per-instance lock or via sharded per-thread sub-sequences. The <b>control plane is a small coordination service</b> used only at startup and lease renewal: it assigns worker ids as leases so the hot path never makes a network call.</p><pre>startup:  service ──▶ worker-id registry (backed by etcd/ZK-class quorum)\n                      lease worker_id=317, TTL=60 s, renew every 20 s\n\nhot path (in-process, no network):\n  now = clock_ms()\n  if now == last_ts:  seq++            (roll to next ms if seq > 4095)\n  if now >  last_ts:  seq = 0\n  if now <  last_ts:  CLOCK REGRESSION → handle (deep dive 2)\n  id = (now - epoch) << 22 | worker << 12 | seq</pre><p>A generator that cannot renew its lease must stop minting before the TTL expires — the registry may reassign 317 to someone else after that point. The safety invariant is simple: <i>at most one live minter per worker id at any wall-clock moment</i>, and everything in the control plane exists to enforce exactly that sentence.</p>",
        data:
          "<p>There is almost no data — that is the feature. The registry holds leases; the library holds a few words of state.</p><pre>registry (strongly consistent KV)\n  /idgen/workers/317 → {holder: \"orders-7f2c\", acquired_at, ttl: 60}\n  acquisition: transactional create of the lowest free slot;\n  renewal: heartbeat every ttl/3; expiry frees the slot.\n\nlibrary state (per process)\n  epoch=1767225600000, worker_id=317, last_ts, seq\n\ndecode(id):\n  ts     = (id >> 22) + epoch      → \"2026-08-21T09:14:07.123Z\"\n  worker = (id >> 12) & 0x3FF      → 317\n  seq    = id & 0xFFF              → 42\n\nAPI surface\n  lib.next_id() → int64                     (hot, in-process)\n  GET /idgen/decode/{id} → {ts, worker, seq} (debug tool, off hot path)</pre><p>For services that cannot embed the library (odd runtimes), offer a thin sidecar that pre-fetches blocks: it leases its own worker id and hands the app batches of 4,096 ids over localhost — network cost amortized to ~zero.</p>",
        deepdives:
          "<p><b>1. Worker-id assignment is the real uniqueness problem.</b> Every duplicate-ID incident in schemes like this traces to two processes minting with the same worker id — from copied config, cloned VM images, or a stale process that missed its lease loss. Defenses stack: (a) leases with TTL and mandatory self-fencing — the library keeps a monotonic deadline and refuses to mint past <code>lease_expiry - safety_margin(5 s)</code>; (b) the registry never reassigns a slot until TTL + margin has passed; (c) at acquisition, write the holder's identity and reject a renew from a different holder token (fencing token pattern). A stop-the-world GC pause of 30 s is the scenario to rehearse: the process wakes, believes it holds 317, but the deadline check fails closed and it re-acquires before minting.</p><p><b>2. Backward clocks.</b> NTP step corrections and VM migrations can move wall time backward. If <code>now &lt; last_ts</code>: for regressions ≤ 20 ms, spin-wait (cheap, invisible); for larger jumps, switch to <b>logical time</b> — keep minting at <code>last_ts</code> with the sequence field, rolling <code>last_ts</code> forward by 1 ms each time seq exhausts, until real time catches up. At 4,096 ids/ms of logical capacity, a 5 s regression sustains full 400k/s throughput for over 50 s before catch-up — no blocking, no duplicates, IDs merely lie about time by up to 5 s, which the 1 s-ordering NFR forces us to document as degraded-mode behavior. Alarm on it; never silently normalize it.</p><p><b>3. Information leakage.</b> Time-sortable ids leak creation time, and consecutive ids leak volume (German-tank style: order counts estimable from two order ids a day apart). Where that is commercially sensitive, keep the internal id but expose an encrypted form publicly (a 64-bit format-preserving permutation of the internal id) — sortability preserved internally, opaque externally, one function at the API boundary, no second id column.</p>",
        tradeoffs:
          "<p>We chose <b>library over central service</b> because a network hop per ID puts a remote call inside every write path in the company — 50 µs p99 is unreachable over a network and the availability of all writes would couple to one service; the cost is polyglot library maintenance, softened by the sidecar option. We chose <b>time-ordered 64-bit over UUIDv4</b> for index locality (sequential inserts append to the B-tree right edge instead of random-page writes) and 8-byte keys; the cost is coordination for worker ids and the leakage handling above — real costs, paid deliberately. We chose <b>logical-time catch-up over blocking</b> on clock regression because blocking turns a clock blip into a company-wide write outage. Bottleneck honesty: the per-instance lock serializes minting around 4M/s; shard the sequence across threads (per-thread sub-ranges of the 12 bits) if any single process ever approaches that.</p>",
        scaling:
          "<p><b>1x (a few services, ~100k ids/s):</b> the design as stated; registry can be the company's existing etcd. Some teams could honestly use DB auto-increment still — the generator earns adoption via sharded databases, not mandate.</p><p><b>10x (hundreds of services, 5M ids/s):</b> worker-id slots become the scarce resource as autoscaled fleets churn instances. Fixes: scope worker-id namespaces per service (each service gets its own 1,024 space, uniqueness only needs to hold within an id-consumer domain, e.g. one table's keyspace), and recycle aggressively with the fencing discipline above.</p><p><b>100x (multi-region, 50M ids/s):</b> do NOT centralize leasing globally — run a registry per region and partition the worker space by region prefix (2 region bits carved from the worker field: 4 regions × 256 workers each, per namespace). Generation stays region-local with zero cross-region calls; ordering across regions degrades to clock quality (~1 s NTP sync), which the spec already tolerates. If a future requirement demands strict global ordering, that is a different product (a sequencer log) — say so rather than bending this one.</p>"
      },
      followups: [
        "A service was cloned from a VM snapshot and both copies mint with worker id 317. How does your design prevent duplicates, step by step?",
        "Show the exact arithmetic for decoding a given id, and what a wrong epoch constant would do.",
        "Your ids appear in public URLs and a competitor estimates your daily order volume from them. Fix it without a schema migration.",
        "A 30-second GC pause spans a lease expiry. Trace the timeline and show where minting is fenced.",
        "Why do sequential ids insert faster than UUIDv4 into a B-tree? Roughly quantify the difference.",
        "When would you recommend plain UUIDv7 instead of building any of this?"
      ],
      rubric: {
        senior: [
          "Derives the bit layout from stated requirements (years of runway, ids/sec, worker count) with arithmetic shown.",
          "Chooses library-embedded generation and justifies it via hot-path latency and availability coupling.",
          "Handles backward clocks with a concrete mechanism, not 'use NTP'.",
          "Automates worker-id assignment with leases instead of hand config.",
          "Explains why time-ordered beats random UUIDs for B-tree index locality."
        ],
        staff: [
          "Identifies worker-id collision (clones, stale leases, GC pauses) as the dominant real-world risk and layers fencing defenses.",
          "Quantifies logical-time degraded mode (how long 4,096/ms sustains full rate during a 5 s regression) and insists on alarming it.",
          "Raises information leakage (timing + volume inference) and resolves it with an FPE boundary transform.",
          "Partitions the worker space by region at 100x, keeping generation region-local, and names the ordering trade.",
          "Knows when NOT to build it: recommends UUIDv7 for teams without sharded-key or 64-bit constraints."
        ]
      }
    }
  );
  window.DESIGN_QUESTIONS.push(
    {
      slug: "web-crawler",
      name: "Design a Web Crawler",
      category: "System Design",
      difficulty: "Medium",
      minutes: 45,
      summary: "politeness, frontier scheduling, dedupe at billions of URLs",
      statement:
        "<p>Your company is building a search product and needs its own crawl of the public web: fetch pages, extract links, store content for the indexing pipeline, and revisit pages as they change. Target: one billion pages crawled per month, with fresh recrawls of fast-changing sites.</p><p>The interesting tension is that a crawler is a system whose main job is to <i>restrain itself</i>. An unthrottled fleet would be a DDoS cannon; a maximally polite one never finishes. Design the URL frontier (what to fetch next), per-host politeness, robots.txt handling, deduplication of both URLs and content, and the trap-avoidance machinery that keeps the fleet from drowning in infinite calendars and session-id URL spam.</p><p>Assume seed lists exist and the downstream indexer is someone else's problem — your contract ends at 'parsed page + outlinks durably stored'.</p>",
      clarifying: [
        "Is this a broad web crawl or scoped to a domain whitelist? How large is the seed set?",
        "What freshness contract — fixed recrawl intervals, or adaptive per-page based on observed change rate?",
        "Do we render JavaScript, or fetch raw HTML only? (A headless-browser fleet is ~20x the compute.)",
        "How strictly do we honor robots.txt and <code>Crawl-delay</code>, and what is our per-host max request rate?",
        "Do we store full page bodies (and how many versions), or extracted text only?",
        "How should we handle near-duplicate content (mirrors, tracking-param URL variants)?",
        "Any geographic/legal scoping — domains or content classes we must not fetch?"
      ],
      functional: [
        "Fetch pages from a seeded frontier, parse HTML, extract and normalize outlinks, enqueue new URLs.",
        "Honor robots.txt (cached ≤ 24 h per host) and never exceed 1 request/sec/host by default.",
        "Deduplicate URLs before enqueue and detect near-duplicate content after fetch.",
        "Schedule recrawls adaptively: pages observed to change often are refetched more often (10 min floor, 90 d ceiling).",
        "Persist raw page, parse metadata, and the link graph durably before a URL is marked done."
      ],
      nonfunctional: [
        "Throughput: 1B pages/month ≈ 385 fetches/sec sustained fleet-wide, with burst to 1,000/sec.",
        "Politeness is a hard invariant: per-host limits hold even during retries, failovers, and queue replays.",
        "Storage: raw HTML at ~80 KB average must fit a ~75 TB/month compressed budget.",
        "Frontier durability: a crashed worker loses at most in-flight URLs (re-leased after timeout), never queued ones.",
        "Cost ceiling: total egress+compute per crawled page ≤ $0.0002 (drives fetch-vs-render decisions)."
      ],
      estimation: {
        prompts: [
          "Fetch QPS for 1B pages/month, and worker count given fetch latency.",
          "Bandwidth in and storage per month at ~80 KB/page.",
          "Memory/size of the seen-URL structure at 10B known URLs.",
          "How many distinct hosts a 385 QPS crawl touches given a 1 req/s/host cap."
        ],
        worked:
          "<p>Throughput first:</p><pre>1e9 pages / (30 × 86,400 s) ≈ 385 fetches/s sustained\nmean fetch ≈ 600 ms (DNS+TLS+TTFB+body) → ~1.7 fetches/s per connection\n→ ~230 concurrent connections needed; with politeness stalls and retries,\n  budget 3x → ~700 in-flight → 12 fetcher workers × 64 async slots</pre><p>Politeness shapes the frontier more than throughput does: at 1 req/s/host, sustaining 385 QPS requires ≥ 385 hosts simultaneously eligible — the frontier must be wide, not deep, at every instant.</p><pre>bandwidth: 385/s × 80 KB ≈ 31 MB/s ≈ 2.7 TB/day ingest\nstorage: 1e9 × 80 KB = 80 TB/mo raw → ~5:1 gzip on HTML → ~16 TB/mo\n         + link graph ~50 outlinks × 16 B × 1e9 ≈ 0.8 TB/mo  (within 75 TB budget)\nseen-URLs at 10B: exact 8-B fingerprint hash table ≈ 80 GB+overhead → shard it;\n  bloom front (1% FP, ~12 GB) screens before the exact store</pre>"
      },
      model: {
        highlevel:
          "<p>A pipeline with one politeness-owning heart: the <b>frontier service</b>. Flow: seeds → frontier → <b>fetcher fleet</b> (async HTTP, per-host token gate) → <b>parser workers</b> (extract text, outlinks, change signature) → <b>dedupe service</b> (URL-seen + content-simhash) → back into the frontier for new URLs, while page + links land in blob storage and the link-graph store. A separate <b>robots/DNS cache service</b> keeps per-host rules and resolved IPs warm so fetchers never block on either. A <b>scheduler</b> feeds recrawl candidates back into the frontier from observed change history.</p><pre>seeds ─▶ ┌─────────── frontier ───────────┐\n         │ front: priority queues (score)  │\n         │ back: per-host FIFO + next-ok-at│\n         └───────┬────────────────────────┘ lease\n                 ▼\n          fetcher fleet ──▶ robots/DNS cache (sidecar check)\n                 │ raw page\n                 ▼\n          parser workers ─▶ blob store (raw+text), link graph\n                 │ outlinks\n                 ▼\n          dedupe (bloom → exact seen-set, simhash) ─▶ frontier (new URLs)\n                 ▲\n          recrawl scheduler (change-rate model) ────┘</pre>",
        data:
          "<p>The frontier's two-level structure is the core data design: priority decides <i>what deserves fetching</i>; per-host queues decide <i>what may be fetched now</i>.</p><pre>frontier\n  front  : K priority buckets, score = f(page-rank-ish, depth, freshness debt)\n  back   : one FIFO per active host + host_state {next_ok_at, robots_rev, fail_ct}\n  lease  : fetcher takes (url, lease_id, 90 s); done|failed → ack|requeue\n\nurl_seen   : shard by hash(url_fp); bloom (12 GB) → exact RocksDB-class store\n             url_fp = 64-bit fingerprint of canonicalized URL\npage_store : blob key = url_fp/fetch_ts → {headers, body.gz, simhash64}\nlink_graph : src_fp → [dst_fp, anchor_hash]  (append-only, monthly compaction)\nhistory    : url_fp → [{ts, simhash, changed?}] → drives recrawl interval\n\ncanonicalize(url): lowercase host; strip fragment; sort query params;\n  drop known tracker params (utm_*, fbclid, gclid); resolve ../; punycode host</pre><p>Canonicalization runs <b>before</b> the seen-check — it is the cheapest dedupe there is, collapsing the utm_* explosion at the door.</p>",
        deepdives:
          "<p><b>1. Politeness that survives failure.</b> The invariant '≤ 1 req/s/host' must hold under retries and worker crashes, so it cannot live in fetcher memory. Each host's <code>next_ok_at</code> lives in the frontier's host state; a fetcher may only lease a URL whose host is eligible, and completing (or timing out) a fetch atomically advances <code>next_ok_at</code>. Host-to-queue assignment is sticky (hash of host → one frontier shard) so no two shards can independently release requests to one host. Retries re-enter the same host queue and wait their turn — a retry storm is just a longer queue, never a faster hammer. One subtlety: rate-limit by resolved IP as well as hostname, or a thousand vanity domains on one shared server defeat the cap.</p><p><b>2. Dedupe at two layers.</b> URL layer: canonicalize → bloom (fast no) → exact seen-store (authoritative). The bloom's 1% false positives would wrongly skip new URLs, so a bloom 'maybe-seen' always falls through to the exact check — the bloom only short-circuits definite-new. Content layer: exact-duplicate via body hash, near-duplicate via 64-bit simhash with Hamming distance ≤ 3 across a sliding index of recent crawl — catches mirrors and boilerplate-shuffled reprints. Near-dupes are still stored once but their outlinks are down-prioritized, which quietly starves link-farm clusters.</p><p><b>3. Traps and adaptive recrawl.</b> Calendar pages, faceted search, and session-id URLs generate unbounded URL spaces. Mechanical defenses: max URL length (2 KB), max path depth (16), per-host budget per cycle (e.g. 100k URLs — a hard cap on how much of the frontier one host may occupy), and a repeating-path-segment detector (<code>/a/b/a/b/a/b</code>). Statistical defense: per-host yield tracking — hosts whose fetched pages are &gt;80% near-dupes or zero-outlink get their crawl budget halved each cycle. Recrawl uses the change history: interval halves when a fetch shows change, doubles when unchanged, clamped to [10 min, 90 d] — an exponential tracker that needs no per-site tuning.</p>",
        tradeoffs:
          "<p>We chose <b>raw-HTML fetching over headless rendering</b> for the base fleet because rendering multiplies compute ~20x and blows the $0.0002/page ceiling; the cost is missing JS-only content, patched by routing the small set of high-value JS-dependent hosts (detected by empty-body-with-scripts heuristic) to a separate 5-worker render pool. We chose <b>centralized frontier politeness over fetcher-local rate limiting</b> because local limits break under rebalancing — the sticky host-shard mapping is the invariant carrier. We chose <b>simhash near-dupe over shingle/MinHash</b> for its 8-byte footprint at 1B pages (8 GB vs hundreds); the cost is coarser similarity, acceptable since our goal is budget-steering, not plagiarism-grade matching. Bottleneck watch: the seen-store's random reads at ~20k checks/s (50 outlinks × 385 pages) — hence the bloom screen absorbing ~90% of them.</p>",
        scaling:
          "<p><b>1x (385 QPS, 1B/mo):</b> as designed — a dozen fetchers, 3 frontier shards, one seen-store cluster. The whole thing fits in one region; crawl traffic is outbound anyway.</p><p><b>10x (4k QPS, 10B/mo):</b> the frontier's host-state updates become the contention point (every fetch touches <code>next_ok_at</code>). Shard the frontier by host-hash to 30 shards — politeness stays correct because sharding is <i>by host</i>. The seen-store reaches 100B URLs (~1 TB fingerprints); move the bloom per-shard and re-set it monthly from the exact store to control FP drift. DNS becomes a real rate problem — run resolvers with aggressive negative caching.</p><p><b>100x (40k QPS, ~search-engine scale):</b> single-region egress and peering costs dominate; split the crawl geographically — assign hosts to regions by resolved-IP locality, cutting mean RTT ~40% and improving per-connection throughput. The link graph outgrows monthly compaction; move it to an incremental graph store the ranking team can read directly. At this scale the hardest problems are relational, not technical: webmaster complaints, crawl-budget fairness, and takedown compliance need an operations surface — per-host kill switches, a verified 'why did you crawl me' lookup, and audit logs of every fetch.</p>"
      },
      followups: [
        "A misconfigured retry loop is hitting one small blog at 50 req/s. Which layer failed, and how does the design make that impossible?",
        "How do you crawl a site whose robots.txt returns 503 — fetch freely, skip entirely, or something else?",
        "Two URLs differ only in parameter order and a gclid. Trace them through your dedupe layers.",
        "Your bloom filter's false-positive rate has drifted to 6% after a year. What is the symptom and the fix?",
        "The product team wants JS-rendered pages for the top 10k retail sites. Integrate that without doubling cost.",
        "How would you detect that you're stuck in a crawler trap that your static rules missed?"
      ],
      rubric: {
        senior: [
          "Designs a two-level frontier separating priority from per-host politeness.",
          "Makes politeness a stateful invariant in the frontier, not a fetcher-local courtesy.",
          "Canonicalizes URLs before dedupe and layers bloom → exact correctly (maybe-seen falls through).",
          "Handles robots.txt with caching and a defined policy for unreachable robots files.",
          "Includes concrete trap defenses (depth, budget, repeating-segment) rather than 'avoid traps'."
        ],
        staff: [
          "Derives that politeness, not throughput, dictates frontier width (≥385 eligible hosts at all times).",
          "Rate-limits by resolved IP as well as hostname, naming the shared-server failure mode.",
          "Uses yield-based statistical budget cuts to starve link farms and unseen trap classes.",
          "Costs the render-vs-fetch decision against the $/page ceiling and scopes rendering to a routed subset.",
          "Raises the operational/relational surface at scale: kill switches, crawler identity verification, audit trail."
        ]
      }
    }
  );
  window.DESIGN_QUESTIONS.push(
    {
      slug: "notification-system",
      name: "Design a Notification System",
      category: "System Design",
      difficulty: "Medium",
      minutes: 45,
      summary: "push/email/sms fan-out, dedupe, preferences, provider failover",
      statement:
        "<p>Every product team at your company sends user notifications today by calling email and push-provider APIs directly from their own services. The result: users get triple-notified across channels, unsubscribes only apply to one team's messages, nobody retries failures consistently, and one team's marketing blast once exhausted the shared SMS provider quota during a password-reset surge.</p><p>Design a central notification platform: teams submit a notification intent (user, event type, payload) and the platform decides channels, renders templates, respects user preferences and quiet hours, enforces rate caps, delivers via third-party providers with retry and failover, and records delivery state. It must keep transactional messages (password reset, 2FA) flowing even when a 10M-recipient campaign is in flight.</p><p>Design for both shapes of traffic: a steady drizzle of single-user events and occasional bulk campaigns that fan one intent out to millions of recipients.</p>",
      clarifying: [
        "Which channels at launch — push (APNs/FCM-class), email, SMS, in-app inbox? Webhooks later?",
        "What's the split and priority between transactional and promotional/campaign traffic?",
        "What delivery guarantee — at-least-once with dedupe keys, or is occasional loss tolerable for promos?",
        "Latency targets per class: 2FA SMS in seconds vs digest email in minutes?",
        "Who owns templates and rendering — the platform, or do teams submit pre-rendered content?",
        "How rich are user preferences — per-channel, per-category, quiet hours, per-user frequency caps?",
        "Peak fan-out: what is the largest single campaign (recipients) and the required drain time?"
      ],
      functional: [
        "Accept a notification intent (user_id or segment, event_type, payload, class) via API; return an intent id for tracking.",
        "Resolve channels per user from preferences + event class; render per-channel templates with locale support.",
        "Enforce per-user frequency caps (e.g. ≤ 5 promos/day) and quiet hours (promos held, transactional exempt).",
        "Deliver with at-least-once semantics, idempotency keys end-to-end, and per-provider retry/failover.",
        "Track state per message (accepted → rendered → sent → delivered/bounced/opened) queryable by intent id."
      ],
      nonfunctional: [
        "Transactional latency: p95 ≤ 5 s intent-to-provider-handoff (2FA SMS p95 ≤ 2 s); promos may queue for minutes.",
        "Isolation: a 10M-recipient campaign must not raise transactional p95 by more than 500 ms.",
        "Throughput: sustain 5k notifications/sec steady, absorb 50k/sec bursts, drain a 10M campaign in ≤ 2 h.",
        "Durability: an accepted intent is never lost — persisted and replicated before the API acks.",
        "Duplicate rate ≤ 0.01% delivered duplicates despite at-least-once internals."
      ],
      estimation: {
        prompts: [
          "Steady and peak message rates by channel, given DAU and events/user.",
          "Queue depth and drain time for a 10M-recipient campaign at provider-capped send rates.",
          "Storage for 90 days of delivery-state records.",
          "Provider cost per month, and what the SMS line item alone looks like."
        ],
        worked:
          "<p>Assume 20M users, 8M DAU, ~3 notifications/DAU/day steady:</p><pre>steady: 24M/day ≈ 280/s avg; diurnal peak ~4x ≈ 1,100/s\n  channel split: push 70% / email 25% / SMS 5%\ncampaign: 10M recipients in ≤ 2 h → 1,390/s just for the campaign\n  but email provider caps us at 500/s per IP pool → need 3 pools,\n  or accept 5.5 h — this is a business knob, surface it, don't hide it</pre><p>State storage, 90-day retention:</p><pre>24M msgs/day × ~6 state events × 150 B ≈ 22 GB/day → ~2 TB for 90 d\n  → time-partitioned table, drop whole partitions at expiry (no delete storms)</pre><p>Cost reality check (why frequency caps are also a finance feature):</p><pre>SMS: 24M × 5% = 1.2M/day × $0.0075 ≈ $9k/day ≈ $270k/mo\npush: ~free; email: 6M/day ≈ $6k/mo\n→ SMS is 97% of spend at 5% of volume; routing one promo class\n  from SMS to push saves more than any infra optimization discussed today</pre>"
      },
      model: {
        highlevel:
          "<p>An ingestion API in front of a class-partitioned pipeline: <b>intake service</b> (validate, assign intent id, persist, ack) → durable log (Kafka-class) with <b>separate topic lanes per class</b> (transactional / promotional / bulk-campaign) → <b>fan-out workers</b> (expand segments to recipients) → <b>preference & policy engine</b> (channel resolution, caps, quiet hours, dedupe) → <b>render service</b> (templates, locale) → per-channel <b>delivery workers</b> (APNs/FCM, email, SMS) each with provider adapters, circuit breakers, and failover → <b>state tracker</b> consuming provider callbacks/webhooks into the delivery-state store.</p><pre>team svc ─▶ intake ─▶ log: [txn][promo][bulk]   (separate lanes)\n                          │      │      │\n                          ▼      ▼      ▼\n                     fan-out workers (segment → user_ids)\n                          ▼\n                 preference/policy engine ── prefs store, caps store\n                          ▼\n                    render service ── template store\n                          ▼\n            ┌─────────────┼─────────────┐\n         push wkrs     email wkrs     sms wkrs ─▶ providers A/B\n            └────────── state tracker ◀── provider webhooks\n                          ▼\n                  delivery-state store (90 d)</pre><p>The lane separation is the isolation mechanism: transactional workers never share consumer capacity, provider quota pools, or rate budgets with campaign traffic.</p>",
        data:
          "<p>Idempotency and preference data shape the schema:</p><pre>POST /v1/notifications\n  { idempotency_key: \"pwreset:u123:tok9\",   -- caller-supplied, required\n    class: \"transactional\",\n    event_type: \"password_reset\",\n    to: {user_id: \"u123\"} | {segment_id: \"s-lapsed-30d\"},\n    payload: {...}, ttl_s: 900 }             -- 2FA expires; don't send stale\n  → 202 {intent_id}\n\nprefs (per user)\n  user_id → { channels: {push: on, email: on, sms: txn_only},\n              categories: {promo: off, digest: weekly},\n              quiet: {tz: \"America/Los_Angeles\", from: \"21:00\", to: \"08:00\"} }\n\nmessage state (partitioned by day)\n  (intent_id, user_id, channel) → state, provider, provider_msg_id,\n                                  attempt_ct, last_ts\ndedupe store: idempotency_key → intent_id   (TTL 48 h, checked at intake)\nper-message key: hash(intent_id, user_id, channel) — checked at delivery,\n  so a replayed queue message cannot double-send</pre><p>TTL matters more than it looks: a 2FA code delivered 20 minutes late after a queue backup is worse than not delivered — expired messages are dropped and counted, not sent.</p>",
        deepdives:
          "<p><b>1. Isolation under a campaign flood.</b> Three stacked mechanisms: separate topics (a 10M-message backlog in the bulk lane cannot delay transactional consumption); separate provider quota pools (transactional SMS has its own provider sub-account, so the marketing quota exhaustion incident is structurally impossible); and admission shaping at fan-out (bulk fan-out workers are token-bucket-limited to drain at the provider-negotiated rate rather than dumping 10M renders into the pipeline at once). The last one keeps the render service and prefs store from being collateral damage — backpressure belongs at the widest point of the funnel.</p><p><b>2. Exactly-once <i>appearance</i> over at-least-once plumbing.</b> Every hop retries, so duplicates are inevitable internally; the delivery worker is the last line: atomically check-and-set the per-message dedupe key before the provider call. The unavoidable hole: worker sends, then crashes before recording — on restart it may resend, because provider APIs are largely non-idempotent. We shrink the hole by recording 'attempting' durably pre-call and reconciling against provider webhooks on restart; residual duplicates land well under the 0.01% budget. Saying 'exactly-once is impossible, here is how narrow we make the window' is the answer; claiming exactly-once is a red flag.</p><p><b>3. Provider failover without flapping.</b> Each channel has ≥ 2 providers behind an adapter interface. Circuit breaker per provider: error rate &gt; 20% or p95 latency &gt; 10 s over a 30 s window trips it; traffic shifts to secondary; half-open probes restore. Two subtleties: failover must carry the idempotency state (the message might have been accepted by provider A before its timeout — reconcile A's webhooks before B resends), and SMS failover changes sender numbers, which can break conversation threading — so 2FA prefers a delayed retry on the primary (up to TTL) before switching providers.</p>",
        tradeoffs:
          "<p>We chose <b>a durable log between intake and processing over direct synchronous processing</b> because the ack-then-process pattern is what makes the durability NFR and burst absorption (50k/s into a 5k/s pipeline) possible; the cost is intent-to-delivery observability spanning async hops, paid down with the state tracker. We chose <b>platform-owned templates over pre-rendered payloads</b> so preferences, locale, and unsubscribe footers are enforced centrally — the entire reason the platform exists; the cost is a template release process for teams. We chose <b>per-class provider sub-accounts over shared quota</b>, trading some quota efficiency for the guarantee that promos can never starve 2FA. Bottleneck watch: the prefs store at fan-out (10M reads per campaign) — cache it aggressively; prefs tolerate 60 s staleness except unsubscribes, which are checked read-through at delivery time for legal safety.</p>",
        scaling:
          "<p><b>1x (280/s steady):</b> the full pipeline but modest: 3-broker log, single-digit workers per stage, two providers per channel. Do not skip the lanes even now — isolation is a launch-day requirement, not a scale feature.</p><p><b>10x (2.8k/s, 100M-recipient campaigns):</b> fan-out expansion becomes the long pole (segment query returning 100M rows). Move segment materialization offline: campaigns reference a pre-materialized recipient snapshot in blob storage, and fan-out streams it in chunks with checkpointing, so a worker crash resumes mid-campaign instead of restarting. Delivery-state writes (~600M/day) push the store to an LSM/wide-column system partitioned by (day, intent).</p><p><b>100x (28k/s steady, multi-region):</b> route users to home regions for delivery (data residency + provider latency), with the campaign control plane global but execution regional — each region drains its own residents from the shared snapshot. In-app inbox and webhooks join as channels, which flips the read pattern (users pull inbox history) and earns a separate read-optimized store fed by the same pipeline. The state tracker's webhook ingestion (opens, bounces) now exceeds send volume 3x and effectively becomes an analytics stream — hand it a stream-processing pipeline of its own rather than letting it bloat the transactional store.</p>"
      },
      followups: [
        "A user reports getting the same promo push three times. Walk the pipeline and list every place the duplicate could have been born and which check missed it.",
        "Marketing schedules a 10M blast for 9 AM Monday — exactly the transactional peak. What actually happens, mechanism by mechanism?",
        "How do you honor an unsubscribe that arrives while a campaign including that user is mid-drain?",
        "Your SMS provider silently accepts messages but delivers only 60%. How do you detect it, and what flips the circuit breaker if latency and errors look fine?",
        "Add a digest feature: bundle a user's promo notifications into one daily email. What components change?",
        "A team wants read receipts to trigger follow-up logic in their service. Design that callback surface safely."
      ],
      rubric: {
        senior: [
          "Separates transactional and promotional traffic structurally (lanes/queues), not just by priority field.",
          "Carries idempotency keys end-to-end with dedupe at both intake and delivery.",
          "Puts TTLs on time-sensitive messages and drops expired ones deliberately.",
          "Designs provider abstraction with circuit-breaker failover per channel.",
          "Centralizes preferences/quiet-hours/caps in one policy engine and states the transactional exemption."
        ],
        staff: [
          "States plainly that exactly-once delivery is impossible and quantifies the residual duplicate window instead.",
          "Applies backpressure at fan-out (widest funnel point) and explains why shaping later is too late.",
          "Catches the silent-provider-degradation case with delivery-rate reconciliation, beyond error/latency breakers.",
          "Treats unsubscribe as read-through-at-delivery for legal correctness while caching everything else.",
          "Brings cost into the design (SMS dominance) and proposes routing policy as a cost lever."
        ]
      }
    }
  );
  window.DESIGN_QUESTIONS.push(
    {
      slug: "news-feed",
      name: "Design a News Feed",
      category: "System Design",
      difficulty: "Medium",
      minutes: 45,
      summary: "fan-out on write vs read, celebrity problem, feed cache",
      statement:
        "<p>You are building the home feed for a social app: users follow other users, post short updates with optional media, and open the app to a reverse-chronological feed of posts from everyone they follow. The app has 30M users; most follow a few hundred accounts, but a small set of creator accounts have millions of followers each.</p><p>The central design tension: when someone posts, do you push that post into every follower's precomputed feed (fan-out on write), or compute each reader's feed at request time by pulling from everyone they follow (fan-out on read)? Each answer fails at one end of the follower distribution — design a system that handles both ends.</p><p>Cover the write path, the read path, the feed cache, and what happens for a user who opens the app after two weeks away. Ranking can stay chronological; the plumbing is the interview.</p>",
      clarifying: [
        "Strictly chronological, or will ranking come later? (Ranking changes what we precompute.)",
        "What is the follower distribution — median follows/followers, and how extreme is the celebrity tail?",
        "How fresh must feeds be — is a 30-second delay for a celebrity's post acceptable?",
        "Read:write ratio — feed opens per day vs posts per day?",
        "How much history must a feed scroll back through — 3 days, or infinite scroll to account creation?",
        "Do deletes and edits need to propagate to already-materialized feeds, and how fast?",
        "Are there privacy scopes (followers-only, blocks) that must be enforced at read time?"
      ],
      functional: [
        "Post creation: text ≤ 500 chars + media refs; visible to the author immediately (read-your-own-post).",
        "Feed read: first page (20 items) of followed users' posts, newest first, with cursor pagination.",
        "Follows/unfollows take effect on the next feed load; unfollowed content stops appearing within 60 s.",
        "Deleted posts disappear from all feeds within 60 s of deletion.",
        "Inactive users returning after weeks get a correct, complete first page without a multi-second stall."
      ],
      nonfunctional: [
        "Feed first-page latency: p50 ≤ 100 ms, p99 ≤ 300 ms.",
        "Post-to-visible latency: ≤ 5 s for normal authors; ≤ 30 s tolerated for 5M-follower accounts.",
        "Scale: 30M users, 12M DAU, 8 feed opens/DAU/day; 4M posts/day.",
        "Feed cache holds the top 400 post-ids per active user; cache miss must degrade gracefully, not error.",
        "Availability 99.95% for reads; a degraded (slightly stale) feed beats an error page."
      ],
      estimation: {
        prompts: [
          "Feed-read QPS vs post-write QPS — establish the ratio that justifies precomputation.",
          "Fan-out write volume per day given follower distribution (median vs celebrity split).",
          "Feed-cache memory for 12M active users × 400 post ids.",
          "The celebrity worst case: one post's fan-out cost at 5M followers."
        ],
        worked:
          "<p>Read/write asymmetry first, since it decides the architecture:</p><pre>reads:  12M DAU × 8 opens ≈ 96M feed loads/day ≈ 1,100/s avg, ~4,500/s peak\nwrites: 4M posts/day ≈ 46/s avg, ~200/s peak\nratio ≈ 24:1 on requests — but fan-out multiplies writes:\n  median author: 300 followers → 4M × 300 = 1.2B feed-insertions/day ≈ 14k/s\n  → precomputation turns 46 post-writes/s into 14k list-pushes/s: fine for\n    an in-memory store, and it buys 100 ms reads. This is the trade, stated.</pre><p>The celebrity case breaks it:</p><pre>one 5M-follower post = 5M insertions; at 50k pushes/s/shard burst budget\n→ 100 s on one shard, or a thundering write herd across shards —\n  and 4.9M of those followers won't open the app before the post ages out.\n→ hybrid: push for ≤ 100k followers, pull for the ~2k accounts above it.</pre><p>Feed cache: 12M active × 400 ids × (8 B id + 8 B ts + overhead ≈ 24 B) ≈ 115 GB → a 6-node Redis-class cluster with room; post bodies live in a separate shared object cache (4M/day × 1 KB × 7 d ≈ 28 GB) so a post is stored once, referenced everywhere.</p>"
      },
      model: {
        highlevel:
          "<p>A hybrid push/pull design. Write path: client → post service (persist to post store, publish event) → <b>fan-out service</b> decides per author: normal authors → push post_id into each follower's feed list (via follower-graph service, batched); mega authors (&gt; 100k followers) → no push, post lands only in the author's own outbox timeline. Read path: client → <b>feed service</b> → fetch precomputed list from feed cache → <i>merge at read time</i> with recent posts from the reader's followed mega-accounts (a per-reader list that is short — almost nobody follows more than a few dozen celebrities) → hydrate ids from the post cache/store → filter (deletes, blocks, privacy) → page out.</p><pre>write: client ─▶ post svc ─▶ post store + event bus\n                                   │\n                          fan-out svc ── follower graph\n                          /                \\\n              ≤100k followers          >100k followers\n              push to N feed lists      write outbox only\n\nread:  client ─▶ feed svc ─▶ feed cache (pushed ids)\n                     │            +\n                     └─▶ outboxes of followed celebs (pull, ~dozens)\n                     merge by ts → hydrate → filter → page</pre><p>Both paths meet at the merge — that single step is what makes the two strategies composable instead of an either/or.</p>",
        data:
          "<p>Three stores with different shapes, plus the graph:</p><pre>post store (durable, sharded by post_id)\n  post_id (time-ordered 64-bit) → {author_id, text, media_refs,\n                                   created_at, deleted, scope}\nfeed cache (per-user list, sharded by user_id)\n  feed:{user_id} → [post_id …]  capped 400, trimmed on push\ncelebrity outbox (small, hot, replicated)\n  outbox:{author_id} → [post_id …] capped 200\nfollower graph (sharded both directions)\n  followers(author) → user_id list   (for fan-out)\n  following(user)  → author_id list + is_mega flag (for merge set)\n\nAPI\n  POST /posts {text, media} → {post_id}\n  GET  /feed?cursor=post_id_7731&limit=20\n    → {items: [{post, author}…], next_cursor}\ncursor = last post_id (time-ordered ids make cursors trivial and stable\n  under concurrent inserts, unlike offset pagination)</pre><p>Deletes are handled at hydration: the feed list may contain a deleted id for up to its cache life, but hydration checks the post record's tombstone — one authoritative check instead of 300 list-removals racing pushes.</p>",
        deepdives:
          "<p><b>1. The hybrid threshold.</b> Why 100k? Push cost is followers × one list-op paid once at write; pull cost is one extra outbox read per follower <i>per feed load</i>. Break-even: a 100k-follower author whose followers open 8 feeds/day costs 100k pushes once vs 800k outbox reads/day pulled — but outbox reads are batched (one read serves the whole page merge) and hit a replicated hot cache, so the real constraint is write-burst pain, not steady-state totals: 100k pushes complete in ~2 s at 50k/s, which meets the 5 s visibility SLO. Above that, bursts blow the SLO, so those authors flip to pull, where 'visibility' is instant (outbox write is one op). The threshold is an operational dial, re-derived from measured burst capacity, not a constant to memorize.</p><p><b>2. The returning user.</b> A user inactive 3 weeks has a stale feed list (posts older than peers' 400-cap trims) and is likely evicted from cache entirely. Options: rebuild-on-read (pull from all ~300 followed users' outboxes — but normal users don't have outboxes in the push model) — so instead: keep a compact <b>per-author recent-post index</b> (author_id → last 50 post_ids, which the post store's author-sharded secondary index gives nearly free). Cache miss → feed service fans out reads to the reader's following list against that index, merges top 400, repopulates the cache — ~300 batched index reads ≈ 40–80 ms, inside the p99 budget, and it happens once per return. Inactive users are also pruned from push fan-out (no pushes to users idle &gt; 30 d), which cuts the 1.2B daily insertions by the inactive fraction — the returning-user rebuild is what makes that optimization safe.</p><p><b>3. Consistency edges.</b> Read-your-own-post: the author's client can't wait for fan-out, so the feed service always unions the reader's own outbox/recent posts into their feed — trivial and eliminates the most-reported 'bug'. Unfollow: drop the author from the merge set immediately (following list is read fresh) and filter their ids at hydration; the stale ids in the cached list become invisible instantly even though they're physically present until natural trim. Blocks work the same way — enforcement at hydration, the one chokepoint every path shares.</p>",
        tradeoffs:
          "<p>We chose <b>hybrid push/pull over pure push</b> because pure push makes one celebrity post a 5M-write event with no reader to justify most of it, and <b>over pure pull</b> because 300 scatter reads per feed load at 4,500 loads/s is 1.35M reads/s for latency-critical requests — precomputing for the 99.9% of authors where push is cheap buys the 100 ms read SLO. We chose <b>ids-only feed lists with hydration over storing rendered posts per feed</b>: 24 B/entry vs ~1 KB/entry (40x memory), and it centralizes delete/privacy enforcement at hydration — the alternative leaves deleted posts visible in 5M cached copies. We chose <b>hydration-time filtering over eager cache repair</b> for deletes/unfollows/blocks, accepting physically-present-but-invisible ids to avoid write storms against feed lists. Bottleneck watch: the follower-graph read at fan-out (streaming 100k follower ids) — it must be a streamed, batched scan, never a single materialized list in memory.</p>",
        scaling:
          "<p><b>1x (12M DAU):</b> as designed — 6-node feed cache, sharded post store, fan-out workers consuming the post event stream with per-author ordering.</p><p><b>10x (120M DAU, 40M posts/day):</b> fan-out insertions hit ~140k/s sustained; shard fan-out workers by follower-id range so one hot author's fan-out parallelizes across shards instead of serializing on one worker. The follower graph itself becomes the scaling risk (billions of edges): move to an edge store partitioned both ways with its own cache tier. Ranking usually arrives at this scale: precompute candidate ids as today, add a ranking stage between hydration and response — the ids-only design absorbs it cleanly, which is a quiet reason it was right at 1x.</p><p><b>100x (Twitter-scale):</b> the pull side's celebrity outboxes become planet-hot keys — replicate each mega outbox to every feed-cache shard (they're tiny: 200 ids) so merges never cross shards. Multi-region: feeds are per-user, so home-region the feed cache and fan-out per user; posts replicate globally async, and cross-region followers see +1–2 s post-to-visible, within the 30 s celebrity SLO and negotiable for the rest. The deepest change is organizational: the fan-out threshold, inactive-pruning window, and cache cap sizes become continuously tuned control knobs with dashboards — the architecture stops changing and the <i>tuning system</i> becomes the work.</p>"
      },
      followups: [
        "A user posts and immediately opens their own feed on another device. Trace both paths and show where read-your-own-write is guaranteed.",
        "Your fan-out queue is 20 minutes behind after an incident. What do users see, and what is your recovery order?",
        "How would you add 'liked by people you follow' items to the feed without a second fan-out system?",
        "A celebrity deletes a post 10 seconds after posting, mid-fan-out. Walk through every copy and how each becomes invisible.",
        "Product wants ranked feeds with ML scores. Which parts of your design survive unchanged, and which don't?",
        "What breaks first if median follows grow from 300 to 3,000 (users following aggressively)?"
      ],
      rubric: {
        senior: [
          "Frames fan-out on write vs read as a cost equation and lands on a hybrid with a concrete threshold.",
          "Designs the read-time merge of pushed lists and pulled celebrity outboxes.",
          "Stores ids-only in feed lists with hydration, and defends the memory and consistency wins.",
          "Handles read-your-own-post explicitly via self-union at read.",
          "Uses time-ordered ids for stable cursor pagination and says why offsets fail."
        ],
        staff: [
          "Derives the push/pull threshold from burst capacity and the visibility SLO, presenting it as a tunable dial.",
          "Solves the returning-user rebuild path and pairs it with inactive-user fan-out pruning as a coupled optimization.",
          "Centralizes delete/block/privacy enforcement at hydration and defends physically-stale-but-invisible cache entries.",
          "Anticipates ranking arriving later and shows the ids-only pipeline absorbs it without rearchitecture.",
          "Plans hot-key replication for celebrity outboxes and per-user home-regioning at extreme scale."
        ]
      }
    }
  );
  window.DESIGN_QUESTIONS.push(
    {
      slug: "chat-messenger",
      name: "Design a Chat / Messenger Service",
      category: "System Design",
      difficulty: "Hard",
      minutes: 50,
      summary: "1:1 + group chat, delivery states, ordering, offline sync",
      statement:
        "<p>Design the messaging backbone for a mobile-first chat app: 1:1 conversations and groups up to 500 members, with the delivery-state ladder users expect — one check when the server has it, two when the recipient's device has it, and a read marker when they've seen it. Messages must survive the sender's phone dying the moment after send, arrive in a sensible order on every device, and sync completely to a user's second device or a reinstalled app.</p><p>The hard parts are stateful: millions of long-lived connections that must survive server deploys, per-conversation ordering without a global clock, receipts that can outnumber messages several-fold, and the offline user who returns to 40 groups' worth of backlog. Media can be handled as blob references; end-to-end encryption may be discussed as a variant at the end but the core design is server-visible messages.</p><p>Assume 40M users, 25M DAU, and users who genuinely notice a 300 ms delivery difference.</p>",
      clarifying: [
        "Group size cap and shape — is 500 the max, and are huge broadcast channels in or out of scope?",
        "Multi-device: how many devices per account, and must history fully sync to a brand-new device?",
        "What ordering guarantee — per-conversation total order, or causal ('reply never before original') enough?",
        "Are read receipts and typing indicators required, and can typing be best-effort/lossy?",
        "Message retention — server-stored forever, or purge after all devices have synced?",
        "Is end-to-end encryption required at launch? (It reshapes receipts, search, and multi-device.)",
        "What's acceptable for delivery latency online-to-online, and for push-notification wake on offline?"
      ],
      functional: [
        "Send/receive in 1:1 and groups ≤ 500, with text + blob-referenced media; sender sees per-message state: sent → delivered → read (group: counts or member lists).",
        "Per-conversation ordering: all devices converge on identical message order for a conversation.",
        "Offline users receive push notifications and a complete, gap-free backlog on reconnect.",
        "Multi-device: up to 5 devices per account, each independently synced with per-device cursors; a new device can pull full history.",
        "Typing indicators and presence, best-effort (never queued, dropped when stale)."
      ],
      nonfunctional: [
        "Online-to-online delivery p50 ≤ 150 ms, p99 ≤ 500 ms in-region.",
        "Durability: a message acked to the sender is replicated to 3 nodes; loss rate effectively zero.",
        "Connection scale: 8M concurrent WebSocket-class connections; a gateway deploy drops no messages and reconnects clients within 10 s.",
        "Sync correctness: reconnect after any gap yields exactly the missed messages — no holes, no duplicates — via cursor semantics.",
        "Receipt traffic (≈ 3–5x message volume) must not degrade message-path latency."
      ],
      estimation: {
        prompts: [
          "Messages/day and peak message QPS from DAU and per-user send rates.",
          "Concurrent connections and gateway fleet size at a given per-node connection budget.",
          "Receipt event volume relative to messages, especially in groups.",
          "Storage/year for message history at expected message sizes."
        ],
        worked:
          "<p>Volume:</p><pre>25M DAU × 40 msgs sent/day ≈ 1B msgs/day ≈ 11.6k/s avg → ~58k/s peak (5x)\ngroup amplification: avg conversation fan-out ≈ 6 recipients\n  → delivery events ≈ 6B/day ≈ 70k/s avg, 350k/s peak</pre><p>Receipts are the hidden elephant: each delivered message generates a delivered-receipt and often a read-receipt, per recipient:</p><pre>receipts ≈ 2 × 6B ≈ 12B events/day — 12x the message send rate\n→ receipts get their own lane: batched (100 ms windows), coalesced\n  (read@msg_47 implies read@≤47 — one cursor update, not 47 events)</pre><p>Connections and storage:</p><pre>8M concurrent / 100k conns per gateway node ≈ 80 gateways (120 with headroom)\nstorage: 1B msgs/day × 300 B (body+meta, media external) ≈ 300 GB/day\n  ≈ 110 TB/yr → hot store 90 d (~27 TB), colder tiers beyond</pre>"
      },
      model: {
        highlevel:
          "<p>Split stateful edge from stateless core. <b>Gateway tier</b>: WebSocket servers holding connections; a <b>session registry</b> (replicated in-memory KV) maps user_id+device_id → gateway. <b>Messaging core</b>: stateless chat service that persists to the <b>conversation store</b> (the source of truth, sharded by conversation_id) and then routes: for each recipient device, look up its gateway in the registry and push, or hand to the <b>offline/push service</b> (APNs/FCM-class) if absent. <b>Receipt service</b> runs a parallel, batched lane. <b>Sync service</b> serves cursor-based backlog pulls on reconnect. Presence/typing ride the gateways peer-to-peer through a lossy pub/sub, touching no storage.</p><pre>device A ─ws─▶ gateway 12 ─▶ chat svc ─▶ conversation store (3x repl)\n                                 │            (seq assigned here)\n                                 ├─▶ session registry: B online? \n                                 │      yes → gateway 47 ─ws─▶ device B\n                                 │      no  → offline svc → APNs/FCM\n                                 └─▶ receipt svc (batched lane)\nreconnect: device ─▶ sync svc ─▶ store.range(conv, cursor…) ─▶ backlog</pre><p>The invariant that simplifies everything: <b>persist-then-fan-out</b>. The sender's single check mark means 'replicated in the conversation store' — every downstream failure after that is recoverable by sync, so the realtime push path is allowed to be lossy.</p>",
        data:
          "<p>Ordering is solved in the schema, not in clocks: the conversation-store shard that owns a conversation assigns a per-conversation monotonic sequence number at persist time.</p><pre>message\n  conv_id      (shard key)\n  seq          int64  -- per-conversation, assigned by owning shard\n  msg_id       uuid   -- client-generated, idempotency key for resend\n  sender_id, sender_device, sent_ts (client) , server_ts\n  body | blob_ref, kind\n\nper-device cursor\n  (user_id, device_id, conv_id) → last_synced_seq\nreceipt state (coalesced)\n  (conv_id, user_id) → {delivered_upto_seq, read_upto_seq}\n  -- group 'read by 37' = count of members with read_upto ≥ seq\n\nclient protocol (over the socket)\n  → send {client_msg_id, conv_id, body}\n  ← ack  {client_msg_id, seq}                  -- one check\n  ← recv {conv_id, seq, msg…}                  -- push to recipient\n  → delivered {conv_id, upto_seq}              -- batched by client\n  sync: GET /sync?conv=…&after_seq=8841&limit=200 (paged, gap-free)</pre><p>Client-generated <code>msg_id</code> makes send retries idempotent: a sender that times out and resends gets the same seq back, never a duplicate — the store upserts on (conv_id, msg_id).</p>",
        deepdives:
          "<p><b>1. Ordering without global time.</b> Per-conversation seq from the owning shard gives total order per conversation cheaply — the shard is already the serialization point because all writes for the conversation land there; the counter is one atomic increment co-located with the write. Client timestamps are display metadata only. The interviewer's trap: 'does this order across conversations?' No, and it shouldn't — cross-conversation order is neither user-visible nor worth a global sequencer. Second trap: two devices of the same sender racing — both serialize through the shard, and each device reconciles its optimistic local echo against the acked seq. The cost of shard-assigned seq is that the shard is a per-conversation write chokepoint: fine at 500 members, and the honest reason broadcast channels (100k members) would need a different design.</p><p><b>2. Receipts at 12x message volume.</b> Treat receipts as <i>state, not events</i>: 'read up to seq 8841' is one row update, idempotent and coalescible, replacing thousands of per-message receipt rows in a 500-member group. Clients batch receipt sends on a 100 ms timer; the receipt service coalesces again server-side and fans out <i>summaries</i> (updated read counts) on a low-priority lane with a 1 s debounce per conversation. Result: receipt fan-out shrinks from 12B events/day to roughly one summary per conversation per active second, and the message path never queues behind a receipt.</p><p><b>3. Connection survival and gap-free sync.</b> Gateways are cattle: on deploy, they push a reconnect-hint, clients reconnect elsewhere (jittered to avoid a thundering herd of 100k), and the registry updates. Any message routed to a dead/stale gateway is simply not acked at the device level — and because delivery truth is the per-device cursor, not the push, the client's reconnect sync closes the gap deterministically: <code>after_seq</code> paging per conversation, ordered, idempotent. This is why the design needs no reliable-delivery machinery in the realtime path at all; push is an optimization of sync, not the source of truth. New-device onboarding is the same code path with cursor 0 (paged lazily, recent conversations first).</p>",
        tradeoffs:
          "<p>We chose <b>persist-then-push over push-then-persist</b> (or parallel) because it makes the ack meaningful (durable, replicated) and downgrades every realtime failure to a sync catch-up; the cost is the store's write latency (~10–20 ms) inside the delivery path — affordable within a 150 ms budget. We chose <b>per-conversation shard-assigned sequences over Lamport/vector clocks</b> because a serialization point already exists at the owning shard, and total per-conversation order is exactly the user-visible requirement — vector clocks would buy causal ordering across conversations nobody perceives, at real client complexity. We chose <b>cursor-state receipts over per-message receipt events</b>, trading per-message read granularity in groups ('who read exactly message 47') for a 1000x traffic reduction — with read-upto semantics, per-message answers are still derivable. We chose <b>lossy presence/typing over queued</b> because a 30-second-old typing indicator is worse than none. Bottleneck watch: the session registry at 350k lookups/s peak — replicate it read-heavy and cache gateway-locally with short TTL.</p>",
        scaling:
          "<p><b>1x (25M DAU, 8M conns):</b> 120 gateways, conversation store on ~20 shards, single region. The receipt lane and sync service exist from day one — they are correctness features, not scale features.</p><p><b>10x (250M DAU, 80M conns):</b> the session registry becomes the hottest shared thing (millions of lookups/s); partition it by user_id and move gateway caches to subscription-based invalidation. Conversation-store shards split further; the crucial guard is shard-splitting a live conversation without breaking seq monotonicity — freeze-and-handoff of the counter during split, a 100 ms blip per conversation, done rolling. Hot groups (500 members, all chatting) start to matter: per-conversation fan-out batching (one gateway-bound bundle per gateway, not per recipient) cuts core→gateway traffic ~10x.</p><p><b>100x (global):</b> home-region each conversation (not each user) so seq assignment stays single-region and fast; cross-region members pay one inter-region hop (~80 ms) on the push path, still inside p99. Store tiers split hot/cold with 90-day boundary. E2EE, if demanded, lands here as the great re-architect: the server stops seeing bodies (fine — routing/seq/receipts are metadata) but multi-device and new-device history break, needing per-device encryption fan-out and device-to-device history transfer — scope it as its own project, and say so plainly rather than waving it in.</p>"
      },
      followups: [
        "A sender's app crashes right after tapping send. Walk every case of where the message can be, and how the retry avoids a duplicate.",
        "In a 500-member group, message 8841 shows 'read by 212'. Show the exact reads and writes that produced that number.",
        "Two devices of one user send simultaneously into the same conversation. What order results, and what does each device display in the interim?",
        "A gateway with 100k connections is killed uncleanly. Trace the next 10 seconds for an in-flight message to one of its users.",
        "How would you add edit and unsend within 15 minutes, propagating to devices that already displayed the message?",
        "What specifically breaks if you now require end-to-end encryption, feature by feature?"
      ],
      rubric: {
        senior: [
          "Establishes persist-then-fan-out and defines what the 'sent' check actually guarantees.",
          "Solves ordering with per-conversation sequences at the owning shard and rejects global ordering as a non-requirement.",
          "Uses client message ids for idempotent resends end-to-end.",
          "Builds sync on per-device cursors so reconnects are gap-free and duplicate-free by construction.",
          "Separates lossy realtime (presence/typing) from durable messaging explicitly."
        ],
        staff: [
          "Quantifies receipts at ~12x message volume and redesigns them as coalesced cursor state, not events.",
          "Treats the realtime push as an optimization over sync, eliminating reliable-delivery machinery from the hot path.",
          "Handles live-shard splits without breaking seq monotonicity and names the freeze-and-handoff mechanism.",
          "Homes conversations (not users) per region to keep the serialization point fast, and prices the cross-region hop.",
          "Scopes E2EE honestly: identifies exactly which features break (multi-device sync, history, server search) instead of hand-waving it in."
        ]
      }
    }
  );
})();
