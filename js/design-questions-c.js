(function () {
  "use strict";
  window.DESIGN_QUESTIONS = window.DESIGN_QUESTIONS || [];
  window.DESIGN_QUESTIONS.push(
    {
      slug: "metrics-pipeline",
      name: "Design a Metrics & Monitoring Pipeline",
      category: "System Design",
      difficulty: "Medium",
      minutes: 40,
      summary: "Ingest, aggregate, and alert on time-series metrics from 50k hosts.",
      statement:
        "<p>Your company runs roughly 50,000 hosts and containers across three regions. Every service emits counters, gauges, and latency histograms. You are asked to design the in-house metrics platform: an ingestion tier that accepts metric points from agents, a storage and aggregation layer that supports dashboard queries over the last 15 minutes to 13 months, and an alerting engine that evaluates threshold and anomaly rules with low latency.</p><p>The platform must survive the exact moment it is most needed: a regional outage, when write volume spikes because everything is erroring at once and every on-call engineer opens dashboards simultaneously. Losing alert evaluation during an incident is the one unforgivable failure mode.</p><p>Walk through ingestion protocol, aggregation strategy (client-side vs server-side rollups), the storage engine layout, downsampling and retention tiers, and how alert rules are sharded and evaluated without missing a firing condition.</p>",
      clarifying: [
        "What is the metric cardinality budget per service — do we allow unbounded label values like user_id, or enforce a cap?",
        "What alert evaluation latency is acceptable end-to-end, from a bad data point being emitted to a page firing?",
        "Do dashboards need raw-resolution data, or is 10s resolution for the last day and 5m beyond that acceptable?",
        "Is at-least-once delivery of metric points acceptable (double-counted samples), or do we need dedup on ingest?",
        "Are histograms pre-aggregated on the agent (fixed buckets) or do we need accurate arbitrary quantiles server-side?",
        "Do alerts need to evaluate cross-region (global error rate) or is per-region evaluation with a rollup acceptable?",
        "What is the retention requirement driven by — capacity planning (13 months for YoY) or compliance?"
      ],
      functional: [
        "Agents push counters, gauges, and histogram buckets every 10 seconds over a batched binary protocol.",
        "Dashboards query arbitrary label filters and aggregations (sum, rate, p50/p95/p99) over any window up to 13 months.",
        "Alert rules evaluate every 30 seconds against streaming data, with for-duration clauses (e.g. 'above 1% for 5m').",
        "Recording rules precompute expensive aggregations (per-service RED metrics) so common dashboards stay cheap.",
        "Cardinality limiter rejects or samples series beyond a per-team quota and surfaces the offender to the team."
      ],
      nonfunctional: [
        "Ingest sustains 15M points/sec globally with p99 write acknowledgment under 200ms.",
        "Alert evaluation lag stays under 60s end-to-end even at 3x normal write volume during incidents.",
        "Dashboard queries over the last hour return in p95 < 500ms; 30-day queries in p95 < 3s.",
        "Ingest tier is available at 99.99%; alerting keeps working with a full region down (no cross-region hard dependency).",
        "Raw 10s resolution kept 24h, 1m rollups 30 days, 5m rollups 13 months; storage cost under $0.02 per active series per month."
      ],
      estimation: {
        prompts: [
          "Estimate active series count: 50k hosts, average series per host, plus per-service custom metrics.",
          "Compute ingest throughput in points/sec and bytes/sec on the wire with a compact protocol.",
          "Size hot storage for 24h of raw data with a Gorilla-style compressed TSDB (~1.5 bytes/point).",
          "Estimate alert-engine load: 20k rules, each touching an average of 50 series, evaluated every 30s."
        ],
        worked:
          "<p>Start with series count, because everything in a metrics system is priced in series, not hosts. 50k hosts with ~400 machine-level series each (CPU per core, memory, disk, network per interface) gives 20M infra series. Add application metrics: ~2,000 services, each with RED metrics across ~15 endpoints and ~8 label permutations plus histogram buckets — call it 30M more. Round to <b>50M active series</b>.</p><pre>Points/sec  = 50M series / 10s interval        = 5M points/sec steady\nIncident 3x = 15M points/sec design target\nWire bytes  = 5M x ~30B (delta-encoded batch)  = 150 MB/s ingress\nHot 24h raw = 5M pts/s x 86,400s x 1.5B/pt     = ~650 GB/day compressed\n1m rollup   = 50M series x 1,440 min x 1.5B    = ~108 GB/day -> 30d = 3.2 TB\nAlert load  = 20k rules x 50 series / 30s      = ~33k series-reads/sec</pre><p>The punchline: hot raw storage is small enough (under a TB a day) to keep on local NVMe in each region, which is what lets alert evaluation stay region-local and survive a cross-region partition. The alert read load (33k series-reads/sec) is trivial if evaluation runs against the in-memory head block instead of the query path — that is the key architectural move.</p>"
      },
      model: {
        highlevel:
          "<p>Three planes, deliberately decoupled. <b>Ingest plane:</b> agents batch to regional gateway pods behind an L4 load balancer; gateways validate, apply cardinality quotas, and write to a partitioned log (Kafka-style) keyed by hash(series labels). <b>Storage plane:</b> stateless ingesters consume the log and write to sharded TSDB nodes — an in-memory head block (last 2h) plus immutable compressed blocks flushed to object storage. <b>Query/alert plane:</b> a query frontend fans out to shards, merges, and caches; the alert engine is a separate consumer of the same log, evaluating rules against its own in-memory state so alerting never depends on the query path or object storage being healthy.</p><p>Each region is self-sufficient: local ingest, local storage, local alert evaluation. A thin global layer federates queries and evaluates the minority of rules that genuinely need cross-region data.</p>",
        data:
          "<p>A series is identified by its sorted label set; the series ID is a 64-bit hash of that set, and shard assignment is hash(series) mod N so all points of one series land on one shard — required for compression and for range reads. Inside a shard: an inverted index (label name/value → posting list of series IDs) plus per-series chunks of delta-of-delta timestamps and XOR-compressed values (~1.5 bytes/point). Every 2 hours the head block seals into an immutable block with its own index, uploaded to object storage; a compactor merges blocks and produces 1m and 5m downsampled versions with sum/count/min/max per window so rate() and avg() stay correct after downsampling. Histograms are stored as cumulative fixed-bucket counters per series, so quantiles are a query-time computation, not a storage type.</p>",
        deepdives:
          "<p><b>Alert isolation:</b> the alert engine consumes the ingest log directly and maintains a rolling window (say 30m) of only the series referenced by rules — a tiny working set (20k rules x 50 series x 60 points = 60M points, a few GB of RAM). It never queries the TSDB for streaming rules, so dashboard load and object-storage brownouts cannot delay pages. Rules are sharded by rule ID with a lease-based scheduler; a crashed evaluator's leases expire in 15s and another node replays from the log to rebuild for-duration state.</p><p><b>Cardinality defense:</b> the gateway keeps a per-tenant HyperLogLog of active series; past quota it drops new series (never existing ones) and increments a visible 'discarded series' meter for that team. This turns a platform outage into a per-team quality-of-service problem.</p><p><b>Out-of-order writes:</b> accept up to 10m of lateness into the head block; older samples go to a slow-path repair queue rather than blocking the hot path.</p>",
        tradeoffs:
          "<p><b>Push vs pull:</b> pull (Prometheus-style scraping) gives free liveness detection but fights short-lived containers and cross-network scraping; at 50k hosts with an existing agent fleet, push into a log wins, and liveness is recovered with an explicit per-agent heartbeat series. <b>Log in the ingest path:</b> costs ~100ms extra latency and a Kafka bill, but buys replayability (alert engine, new consumers, backfill after a storage bug) and absorbs the 3x incident spike without backpressure reaching agents. That is the right trade for a system whose worst failure is dropping data during an incident. <b>Downsampling with sum/count instead of averaging:</b> storing pre-averaged points would corrupt any re-aggregation; storing sum+count doubles rollup storage but keeps math associative. <b>Exact quantiles:</b> declined — fixed-bucket histograms with ~2 significant-figure error are accepted, because exact p99 across 50M series is a research project, not a platform.</p>",
        scaling:
          "<p>Scaling axis one is series churn, not point rate: deploys recreate every pod's series, so a fleet-wide deploy can double active head-block series for 2h. Size head memory for 2x steady-state and make the index handle high-churn posting lists (roaring bitmaps). Axis two is query fan-out: a 13-month query touching 5m rollups across 50M series must be pushed down — the query frontend splits by time range, caches immutable sub-results keyed by (query, block), and executes shard-local aggregation so only partial sums cross the network. Axis three is regions: adding a fourth region is purely additive because nothing global sits in the write path; the only global component is query federation and the ~5% of rules doing cross-region math, which degrade to per-region evaluation during partitions rather than going silent.</p>"
      },
      followups: [
        "A team ships a label with request UUIDs and creates 40M series in an hour. Walk through exactly what happens at each layer and what the team sees.",
        "How would you add exemplars (trace IDs attached to histogram buckets) without blowing up storage?",
        "Alert evaluation and ingest disagree: a dashboard shows the threshold was crossed but no page fired. How do you debug it?",
        "The CFO asks to cut metrics spend 40%. What do you cut first and what do you refuse to cut?",
        "How do you migrate 20k existing alert rules to this platform with zero missed pages during cutover?",
        "Would you support ad-hoc PromQL-style queries in alert rules, or a restricted rule DSL? Defend the choice."
      ],
      rubric: {
        senior: [
          "Prices the system in series/cardinality rather than hosts, and proposes a concrete cardinality defense.",
          "Separates the alert path from the query path and can say precisely why (incident-time isolation).",
          "Knows rollups must store sum/count/min/max, not averages, to keep re-aggregation correct.",
          "Produces consistent numbers: points/sec, bytes/point compressed, hot storage per day.",
          "Handles the deploy-churn problem (series doubling) rather than assuming steady state.",
          "Chooses push vs pull with a real justification tied to the container fleet, not preference."
        ],
        staff: [
          "Designs regional self-sufficiency so alerting has no cross-region hard dependency, and states the partition behavior of global rules.",
          "Uses the ingest log as an architectural pivot (replay, new consumers, backfill) and prices its latency cost honestly.",
          "Treats the 3x incident write spike plus simultaneous dashboard stampede as the design point, not the edge case.",
          "Frames cardinality quotas as tenant-level QoS with visible feedback, converting outages into per-team signals.",
          "Can articulate the org rollout: migration of existing rules, dual-firing period, and how trust in the new pager is earned."
        ]
      }
    },
    {
      slug: "cdn-design",
      name: "Design a Content Delivery Network",
      category: "System Design",
      difficulty: "Hard",
      minutes: 45,
      summary: "Global edge cache network with invalidation, origin shield, and cache-key control.",
      statement:
        "<p>Design a CDN for a company that serves 2M requests/sec of mixed traffic: small static assets (JS/CSS/images), large video segments, and a growing share of cacheable API responses. You control 120 points of presence (PoPs) worldwide, each with a rack of cache servers, and customers configure behavior per-domain: cache keys, TTLs, and purge rules.</p><p>The interesting problems are not 'put Varnish in a rack.' They are: how a request finds the right PoP and the right server inside it; how you protect origins from thundering herds when a popular object expires; how a customer purge of 'everything under /products/*' propagates to 120 PoPs in seconds; and how you serve a 2GB video file from servers with 64GB of RAM each.</p><p>Design the request routing, intra-PoP architecture, cache hierarchy including origin shield, the invalidation system, and the consistency story you are actually promising customers.</p>",
      clarifying: [
        "What purge propagation SLA do customers need — seconds (retail price changes) or minutes (asset deploys)?",
        "Is TLS terminated at the edge, and do we need to support customer-managed certificates per domain?",
        "What fraction of traffic is range requests over large files vs whole small objects? This changes the storage design.",
        "Do cacheable API responses vary by auth token or cookies — i.e., how hairy do custom cache keys get?",
        "Do we need soft purge (mark stale, revalidate) in addition to hard purge (drop immediately)?",
        "Is stale-while-revalidate / stale-if-error behavior acceptable to customers by default?",
        "Are PoPs allowed to fetch from each other (peer fill), or only from shield and origin?"
      ],
      functional: [
        "Route each client to a healthy nearby PoP via anycast (with DNS-based steering as the coarse-grained escape hatch).",
        "Per-domain configuration: cache key composition (path, selected query params, selected headers), TTL overrides, signed URLs.",
        "Purge API: single URL, tag-based, and prefix purge, with a completion callback when globally applied.",
        "Origin shield: a designated mid-tier PoP per origin that collapses all edge misses into one origin fetch stream.",
        "Large-file handling: range requests served from partial objects; segment-level caching for video."
      ],
      nonfunctional: [
        "Global purge propagation p99 under 5 seconds; single-URL purge p50 under 1 second.",
        "Cache hit ratio at least 92% at edge for static assets; origin request rate reduced at least 50:1 overall.",
        "Added latency for a cache hit under 5ms server-side; TLS+TCP handled with session resumption at the edge.",
        "A PoP failure sheds its traffic to neighbors within 30 seconds without origin overload (shield absorbs the refill).",
        "Config changes (TTL, cache key) propagate to all PoPs in under 60 seconds."
      ],
      estimation: {
        prompts: [
          "Estimate per-PoP request load and egress bandwidth at 2M req/s globally with a realistic traffic skew.",
          "Size the edge cache: what disk footprint yields 92% hit ratio given a Zipf-like popularity curve?",
          "Compute origin offload: requests reaching origin with and without shield at 92% edge hit ratio.",
          "Estimate purge fan-out message volume: 500 purges/sec propagated to 120 PoPs."
        ],
        worked:
          "<p>Traffic is skewed: the top 10 PoPs carry ~40% of load. Average PoP sees 2M/120 ≈ 17k req/s, but design the big metros for ~80k req/s. At a 60KB mean object size (mix of small assets and video segments), a big PoP pushes ~38 Gbps egress — so a rack of 20 servers needs 2x25GbE NICs and the intra-PoP hashing layer must not bottleneck.</p><pre>Edge miss rate       = 8%  -> 160k req/s leave the edges globally\nWithout shield       = 160k req/s hit customer origins\nWith shield @85% hit = 160k x 0.15 = 24k req/s to origins  (~83:1 offload)\nPurge fan-out        = 500 purges/s x 120 PoPs = 60k msg/s\n             (trivial for a pub/sub bus; the hard part is the ack tracking, not the volume)\nCache sizing (Zipf a~0.9): hit ratio grows ~log(cache size); getting 85->92%\n             roughly means 4-6x the disk. 20 servers x 8TB NVMe = 160TB/PoP.</pre><p>The estimation lesson: shield converts a linear miss stream into a nearly constant origin load, and the last few points of hit ratio are bought with disproportionate disk — which is why per-customer hit-ratio economics matter more than a global average.</p>"
      },
      model: {
        highlevel:
          "<p><b>Routing:</b> anycast announces the same IP block from all PoPs; BGP delivers the client to the nearest one, and a traffic-steering control plane withdraws announcements or applies DNS overrides to drain a PoP. <b>Inside a PoP:</b> an L4 tier spreads connections across cache servers, then consistent hashing on the cache key sends each object to one primary owner (plus one replica for hot objects), so the PoP's disks behave as one large sharded cache rather than N duplicated ones. <b>Hierarchy:</b> edge miss → origin shield PoP (chosen per-origin, near the origin) → customer origin, with request collapsing at both layers: concurrent misses for the same key wait on a single in-flight fetch. <b>Control plane:</b> a config store compiles per-domain settings into a versioned artifact pushed to every PoP; the purge system is a separate low-latency pub/sub with per-PoP acks.</p>",
        data:
          "<p>The cache key is compiled per-domain: scheme + host + normalized path + whitelisted query params (sorted) + selected Vary headers. Whitelisting query params — rather than including all of them — is the single biggest practical hit-ratio lever, since marketing tags (utm_*) otherwise shred the key space. Objects over 8MB are split into 1MB internal chunks, each cached independently under (key, chunk_index), so a range request for the middle of a 2GB video hits only the chunks it needs and eviction works at chunk granularity. Metadata (headers, TTL, tags, variant map) lives in an in-memory index; bodies live on NVMe in a log-structured store with FIFO segments plus a small LRU-managed hot set in RAM — full LRU over billions of disk objects costs more than it saves. Each object also stores its purge-tag list and the config version it was written under.</p>",
        deepdives:
          "<p><b>Invalidation:</b> single-URL purge is a broadcast of the exact key — each PoP deletes and acks; the API returns when a quorum acks and reports full completion asynchronously. Prefix and tag purges cannot enumerate keys, so they are implemented as <i>version barriers</i>: the purge publishes (pattern, timestamp); each cache server stores recent barriers in memory and lazily discards any object whose write time predates a matching barrier at lookup time. This makes prefix purge O(1) to propagate and moves the cost to lookups, bounded by keeping only ~24h of barriers and letting TTLs handle the rest. <b>Thundering herd:</b> request collapsing plus serve-stale: when a popular object expires, one request refreshes it while others get the stale copy within a customer-configured stale-while-revalidate window; stale-if-error keeps serving through origin outages. <b>Shield failover:</b> each origin has a primary and secondary shield PoP; failover is a config-plane change, and edges retry through the secondary automatically, accepting a temporary hit-ratio dip rather than stampeding the origin.</p>",
        tradeoffs:
          "<p><b>Anycast vs DNS steering:</b> anycast gives instant failover and simple client config but coarse control and occasional suboptimal BGP paths; DNS steering gives fine-grained load control but is hostage to resolver TTLs and mis-located resolvers. Use anycast as primary with DNS steering as the drain/override mechanism — you need both. <b>Consistency promise:</b> we promise purge-then-read-within-5s, not read-your-writes; customers who need strict freshness get short TTLs plus soft purge, and we say so explicitly rather than pretending a 120-PoP cache is strongly consistent. <b>Barrier-based prefix purge vs key enumeration:</b> barriers cost a per-lookup check and can over-invalidate (anything older than the barrier matching the pattern), but enumeration requires a global reverse index of every cached key, which is enormous and always stale. Over-invalidation is a hit-ratio tax; a stale price on a product page is a customer incident. Easy call. <b>Peer fill between edges:</b> declined at the edge tier — it doubles intra-network bandwidth for modest hit-ratio gain; the shield tier already provides the aggregation point.</p>",
        scaling:
          "<p>Growth pressure shows up in three places. <b>Hot-object skew:</b> a viral 5MB asset at 200k req/s would melt its single consistent-hash owner, so owners track per-object QPS and promote hot objects to a replicated tier served from RAM by every server in the PoP — detection to promotion in under a second. <b>Config scale:</b> at 100k customer domains the compiled config artifact is pushed as deltas with a full-snapshot fallback, and every object records its config version so a bad config can be rolled back and its objects invalidated by version barrier. <b>New PoPs:</b> a cold PoP announced into anycast would refill from origins, so new PoPs warm from the shield tier with announcement ramped via selective BGP communities. The endgame problem is API caching: as cacheable-API share grows, Vary complexity and sub-second TTLs push the architecture toward the soft-purge/tag model being the primary interface, with TTLs as the backstop.</p>"
      },
      followups: [
        "A customer reports a stale price served 40 minutes after a purge, but purge logs show all PoPs acked in 3s. Where do you look?",
        "How do signed URLs and token-authenticated content interact with the shared cache without leaking across users?",
        "Design the cache-warming story for a product launch where one page will take 500k req/s at a known time.",
        "A BGP misconfiguration at a transit provider sends 30% of Europe to a US PoP. What limits the blast radius?",
        "How would you support edge compute (customer code mutating responses) without destroying hit ratio or safety?",
        "What changes if the CDN must also handle non-cacheable WebSocket traffic — is that even the same product?"
      ],
      rubric: {
        senior: [
          "Designs intra-PoP consistent hashing so disks shard rather than duplicate, and adds a hot-object replication path.",
          "Implements request collapsing and serve-stale, and can explain the expiry thundering-herd failure without prompting.",
          "Handles large files with chunked/partial caching instead of whole-object semantics.",
          "Explains origin shield's offload math and its failover behavior.",
          "Treats cache-key normalization (query-param whitelisting, Vary) as a first-class hit-ratio lever.",
          "States an honest consistency promise for purge rather than implying strong consistency."
        ],
        staff: [
          "Invents or recognizes the version-barrier technique for prefix/tag purge and argues its over-invalidation trade-off.",
          "Designs the control plane (config compilation, versioning, rollback, purge acking) as carefully as the data plane.",
          "Reasons about BGP/anycast failure modes and drain mechanics, not just happy-path proximity routing.",
          "Connects cache economics to the business: hit-ratio marginal cost, per-customer offload, why the last 3% of hit ratio may not be worth it.",
          "Anticipates the product's evolution (API caching, edge compute) and keeps the architecture compatible with it."
        ]
      }
    },
    {
      slug: "blob-storage",
      name: "Design an S3-Class Blob Storage System",
      category: "System Design",
      difficulty: "Hard",
      minutes: 45,
      summary: "Durable object store: placement, erasure coding, durability math, repair pipeline.",
      statement:
        "<p>Design a multi-tenant object storage service in the S3 mold: PUT/GET/DELETE/LIST over HTTP, objects from 1KB to 5TB, flat namespace of buckets and keys, target durability of eleven nines. You operate three datacenters in a metro region and must survive the loss of any one datacenter, any rack, and continuous background disk failure — at fleet scale, disks die every hour of every day.</p><p>The design should cover: how the namespace (bucket/key → object metadata) is stored and scaled separately from the bytes; how objects are placed across failure domains; the erasure-coding scheme and the actual durability arithmetic behind the marketing number; the repair pipeline that races disk failures; and how multipart upload, versioning, and LIST are made to work on top.</p><p>Numbers matter here more than anywhere: an interviewer should leave convinced you could defend the eleven-nines claim to an auditor.</p>",
      clarifying: [
        "Is the durability target per-object annual (11 nines) with availability separate (e.g. 4 nines), and can we quote them independently?",
        "What is the object size distribution? Millions of 4KB objects and 5TB objects stress completely different parts of the system.",
        "Is read-after-write consistency required for overwrite PUTs, or only for new keys?",
        "What LIST semantics do customers need — lexicographic pagination with prefixes/delimiters, and how fresh must results be?",
        "Are cross-datacenter synchronous writes acceptable at ~2ms RTT, or must PUT ack from a single DC?",
        "What is the delete model — immediate, or versioned with lifecycle expiration, and is there a compliance hold requirement?",
        "What fraction of the fleet's disks fail annually (AFR), and what rebuild bandwidth can repair traffic consume?"
      ],
      functional: [
        "PUT/GET/DELETE/HEAD with strong read-after-write consistency for both new and overwritten keys.",
        "Multipart upload: parts uploaded in parallel, resumable, completed atomically; abandoned uploads garbage-collected.",
        "LIST with prefix/delimiter and stable lexicographic pagination over billions of keys per bucket.",
        "Object versioning and lifecycle rules (transition to cold tier, expiration).",
        "Per-object integrity: end-to-end checksums verified on write, on read, and by continuous background scrub."
      ],
      nonfunctional: [
        "Durability 99.999999999% annually per object; availability 99.99% for reads, 99.95% for writes.",
        "Survive concurrent loss of one full datacenter plus one additional rack elsewhere with zero data loss.",
        "GET time-to-first-byte p99 under 60ms for warm objects; PUT p99 under 300ms for 1MB objects.",
        "Scale to 500 PB, 1 trillion objects, 200k requests/sec; metadata scales independently of data.",
        "Mean time to repair a failed 20TB disk under 30 minutes at fleet scale (parallel rebuild, not disk-to-disk copy)."
      ],
      estimation: {
        prompts: [
          "Compute storage overhead for a candidate erasure-coding scheme vs 3x replication at 500 PB.",
          "Do the durability math: with AFR ~1.5% and 30-minute repair, what is the probability of losing a stripe?",
          "Estimate metadata scale: 1 trillion objects at ~500 bytes of metadata each.",
          "Compute repair bandwidth: 20TB disk failure, k-of-n reconstruction, 30-minute target."
        ],
        worked:
          "<p>Take EC 12-of-16 (12 data, 4 parity shards, each shard on a distinct rack, spread across 3 DCs). Overhead is 16/12 = 1.33x vs 3.0x replication — at 500 PB logical, that is 667 PB raw vs 1.5 EB, roughly a $100M-scale hardware difference. Durability: a stripe dies only if 5 shards are lost before repair.</p><pre>Disk AFR 1.5% -> per-disk failure rate ~1.7e-6 per hour\nRepair window 0.5h -> P(disk dies in window) ~ 8.6e-7\nP(5 of remaining 15 shards die in window)\n  ~ C(15,5) x (8.6e-7)^5  ~ 3,003 x 4.7e-31 ~ 1.4e-27 per incident\nMultiply by fleet failure events (~50k disk failures/yr) and stripes/disk:\nstill ~1e-17 annual per-stripe -> comfortably beyond 1e-11 target</pre><p>The honest caveat a strong candidate raises: independent-failure math is the <i>optimistic bound</i>. Correlated failures — bad firmware batches, a rack losing cooling, a repair-pipeline bug — dominate real risk, which is why shards spread across racks/DCs, firmware diversity, and scrubbing appear in the design rather than more parity. Metadata: 1T objects x 500B = 500 TB of metadata — itself a large sharded database problem. Repair: rebuilding 20TB requires reading 12x the lost data's share from peers; parallelized across ~200 source disks it is ~100GB per source in 30 min ≈ 460 Mbps per disk — feasible, but repair QoS must be capped so it never starves foreground traffic.</p>"
      },
      model: {
        highlevel:
          "<p>Two sharply separated systems. <b>Metadata service:</b> a sharded, Paxos/Raft-replicated key-value store mapping (bucket, key, version) → object manifest (size, checksum, stripe locations, encoding). Partitioned by key range within a bucket so LIST is a local scan; replicated across all three DCs with quorum writes, which is what makes read-after-write consistency and DC-loss survival possible. <b>Data plane:</b> stateless gateway nodes stream incoming bytes, chunk them, erasure-code each chunk into 16 shards, and write shards directly to storage nodes chosen by a placement service; the PUT acks only after all metadata quorum-commits and at least 14 of 16 shards land (the remaining 2 complete asynchronously or are repaired). GET reads any 12 shards, preferring local-DC ones, and reconstructs on the fly if some are slow or missing — degraded read is a normal mode, not an exception.</p>",
        data:
          "<p>Small objects are the economics problem: a 4KB object cannot pay for 16 shards. Objects under ~1MB are appended into shared <i>extents</i> — large log-structured containers (say 1GB) that are themselves erasure-coded as a unit; the manifest points to (extent_id, offset, length). Deletes of small objects mark garbage in the extent; a compactor rewrites extents when garbage exceeds ~40%, and this GC pipeline is a first-class subsystem with its own throttling, because runaway compaction has taken down real storage fleets. Large objects are chunked at 64MB, each chunk independently EC'd, enabling parallel PUT/GET and multipart mapping (each part = one or more chunks; complete-multipart is a pure metadata commit that atomically publishes the manifest). Every chunk carries a CRC and the object carries a whole-object checksum, verified end-to-end.</p>",
        deepdives:
          "<p><b>Placement:</b> the placement service maintains the failure-domain tree (DC → row → rack → node → disk) and assigns each stripe's 16 shards to 16 distinct racks with a max of 6 per DC — so losing a DC costs at most 6 shards, leaving 10... which is insufficient for 12-of-16! This is the trap in the problem: with 3 DCs you must use a DC-aware code — e.g. 8-of-14 with ≤5 shards per DC (lose a DC → 9 remain ≥ 8), or a two-level code with local parity per DC for cheap intra-DC repair plus global parity for DC loss. Catching that interaction between the code parameters and the DC count is the single best signal in this interview. <b>Repair:</b> a scanner detects missing/corrupt shards via storage-node heartbeats and scrub results, prioritizes stripes by how many shards they have lost (a stripe down 3 shards outranks a thousand stripes down 1), and fans reconstruction across the fleet. <b>Scrub:</b> every byte is re-read and checksum-verified on a ~30-day cycle to catch latent sector errors — without scrub, the durability math is fiction because 'failed' shards sit undetected.</p>",
        tradeoffs:
          "<p><b>EC vs replication:</b> EC saves ~2.2x raw storage but costs reconstruction reads on degraded GETs and repair CPU; small hot objects additionally get extent indirection. Resolution: EC for everything at rest, plus an optional replicated SSD cache tier for hot small objects — cache is a performance layer, never counted toward durability. <b>Sync cross-DC PUT vs async:</b> quorum metadata + spread shards makes PUT latency include inter-DC RTT (~2ms) — acceptable, and it buys zero-RPO DC loss; an async-replication design would ack faster and quietly convert DC loss into data loss, which is the wrong product. <b>Ack at 14/16 vs 16/16:</b> acking early cuts tail latency (no waiting on the slowest disk) at the cost of briefly running new objects at reduced margin; bounded by counting sub-full stripes in repair priority. <b>Versioning as immutable manifests:</b> overwrites write a new manifest version rather than mutating — simplifies consistency and makes DELETE a metadata tombstone, at the cost of a GC obligation (lifecycle + compaction) that the design must treat as production-critical.</p>",
        scaling:
          "<p>Metadata is the scaling frontier, not disks. Hot buckets with sequential key patterns (timestamps) hammer one range shard — mitigate with shard auto-splitting on load and salting guidance for pathological workloads; LIST across split shards does a merge scan. At 1 trillion objects, even listing garbage (orphaned multipart parts, unreferenced extents' chunks) requires a periodic map-reduce-style reconciliation between metadata and storage-node inventories — plan it as a scheduled pipeline with strict read-only guarantees and a quarantine-before-delete rule, because a reconciliation bug is precisely how you lose eleven-nines data. Fleet growth runs through the placement service: new capacity must fill without migrating everything (placement weights by free space), and decommissioning a DC generation becomes a background re-encode. The system's maturity curve ends with tiering: cold objects re-encoded to a wider, cheaper code (e.g. 17-of-20) on high-density disks, which the manifest indirection makes a background job instead of a migration event.</p>"
      },
      followups: [
        "A firmware bug causes silent bit rot on one disk model, 8% of the fleet. Walk through detection, blast-radius assessment, and recovery.",
        "How does LIST stay consistent with concurrent PUTs and DELETEs — what exact staleness can a paginated LIST show?",
        "Design the abandoned-multipart-upload GC so it can never delete parts of an upload that is completing concurrently.",
        "A customer disputes durability after losing an object. What audit trail proves what happened to every shard?",
        "How would you add a strongly consistent conditional PUT (if-match ETag) and what does it cost?",
        "Extend the design to async cross-region replication — what changes in the manifest and delete model?"
      ],
      rubric: {
        senior: [
          "Separates metadata from data plane and scales/replicates them independently with quorum reasoning.",
          "Chooses EC parameters and can compute overhead vs replication at stated fleet scale.",
          "Solves the small-object problem (extents/containers) and acknowledges the GC obligation it creates.",
          "Presents durability arithmetic with a repair-window term, not just 'erasure coding is durable.'",
          "Designs repair with priority by shards-lost and bounded bandwidth vs foreground traffic.",
          "Handles multipart upload as an atomic metadata commit over independently uploaded chunks."
        ],
        staff: [
          "Catches the code-parameters × failure-domain interaction (12-of-16 does NOT survive a 3-DC layout) and fixes it with a DC-aware or locally-repairable code.",
          "States that correlated failure, not independent math, dominates real durability risk, and designs diversity/scrub/quarantine accordingly.",
          "Treats GC, scrub, and reconciliation as production-critical subsystems with their own failure analysis.",
          "Reasons about metadata hot-shard behavior under realistic key distributions and LIST semantics under splits.",
          "Frames the availability/durability/latency trade of quorum cross-DC PUT as a product decision with a defensible RPO of zero."
        ]
      }
    },
    {
      slug: "hotel-reservation",
      name: "Design a Hotel Reservation & Inventory System",
      category: "System Design",
      difficulty: "Medium",
      minutes: 40,
      summary: "Room-night inventory, date-range availability search, holds, and overbooking.",
      statement:
        "<p>Design the reservation backbone for a hotel chain: 5,000 properties, ~150 rooms each, bookable 18 months out. The core object is not a room — it is a <i>room-night</i>: (property, room type, date) with a finite count. Guests search availability for a date range across properties, hold a rate while entering payment, and confirm; the business side sets prices and allotments, sells through third-party channels (OTAs), and deliberately oversells because 8-12% of bookings no-show or cancel.</p><p>The hard parts: date-range availability queries that stay fast under heavy search traffic (search:book ratios of 500:1); avoiding oversell beyond the configured overbooking buffer even when two channels sell the last room simultaneously; holds that expire cleanly; and multi-night bookings that must be atomic across every night of the stay.</p><p>Design the data model, the availability search path, the booking transaction, and the overbooking mechanics including what happens on arrival day when the building is genuinely full.</p>",
      clarifying: [
        "Is inventory managed per room type with a count (pool model), or per physical room? Does room assignment happen at booking or check-in?",
        "What overbooking policy applies — a fixed buffer per room type per date, or a yield-managed percentage set by revenue management?",
        "How do OTA channels integrate — do they hold allotments (dedicated blocks) or sell from the shared pool with an availability feed?",
        "What is the hold semantics: how long does a payment hold last, and does it decrement shared availability while active?",
        "Are modifications (extend stay, change room type) in scope, and must they be atomic swaps rather than cancel+rebook?",
        "What consistency does search need — can availability shown in search be seconds stale if the booking step is strictly correct?",
        "What are peak search and booking rates, and are they spiky (flash sales, event dates)?"
      ],
      functional: [
        "Search availability by (location or property, check-in, check-out, guests) returning bookable room types with prices.",
        "Create a time-limited hold (10 min) covering every night of the stay; convert to a confirmed booking on payment.",
        "Cancel and modify bookings with correct inventory restoration, including partial-stay modifications.",
        "Revenue managers set allotments, close-outs (stop-sell on a date), min/max stay rules, and per-date overbooking buffers.",
        "Push availability updates to OTA channels and reconcile OTA bookings that arrive after local sell-out."
      ],
      nonfunctional: [
        "Availability search p95 under 200ms across a metro area (200 properties, 30-night window).",
        "Booking confirmation is strictly serializable per (property, room type, date): oversell never exceeds buffer, ever.",
        "Sustain 5,000 searches/sec and 10 bookings/sec steady; 50x booking spikes on event on-sale dates.",
        "Holds expire within 5 seconds of their deadline; expired holds never block a sale.",
        "Channel availability updates propagate to OTAs in under 30 seconds to bound cross-channel oversell exposure."
      ],
      estimation: {
        prompts: [
          "Size the inventory keyspace: properties x room types x 550 bookable days.",
          "Estimate search fan-out: one metro search touches how many (room type, date) counters?",
          "Compute write contention: bookings/sec on the single hottest (property, room type, date) during an event on-sale.",
          "Estimate the overbooking economics: 10% no-show on 150 rooms vs walk cost at 1.5x room rate."
        ],
        worked:
          "<p>Keyspace first: 5,000 properties x ~6 room types x 550 days ≈ <b>16.5M inventory counters</b>. Each is a handful of integers (physical, allotted, held, sold, buffer) — call it 100 bytes; the whole live inventory is ~1.6GB. That single number reshapes the design: <i>the entire chain's availability fits in RAM on one machine</i>, so the search tier can be an in-memory replica updated by a change stream, and only the booking commit needs a durable transactional store.</p><pre>Metro search: 200 properties x 6 types x 30 nights = 36,000 counters scanned\n  -> trivial in-memory; the real cost is pricing each candidate, so\n     availability filter FIRST, price only the ~200 survivors\nEvent spike: one property, 2 room types, 1 date, 500 attempts/min\n  -> ~8 commits/sec on ONE row: fine for row locks, fatal for optimistic\n     retry storms if the whole stay is one big serializable txn done naively\nOverbooking: 150 rooms, 10% no-show -> ~15 expected no-shows\n  buffer 8 (conservative, ~1 walk per 2 sell-out nights at P(no-shows<8)~2%)\n  revenue: +8 room-nights x $200 = $1,600/night vs walk cost ~$300 x 0.5 = $150</pre><p>Conclusion: search reads scale by replication because staleness is acceptable; correctness concentrates in a tiny hot write path that must serialize per counter.</p>"
      },
      model: {
        highlevel:
          "<p>Split by consistency requirement. <b>Search path (eventually consistent):</b> in-memory availability replicas per region, populated from the booking database's change stream, answering date-range queries with bitmap operations; results are advisory. <b>Booking path (strictly consistent):</b> a transactional store partitioned by property_id — all counters for one property live on one shard, so any single-property booking, however many nights, is a single-shard ACID transaction. The flow: search → quote (re-verify + price) → hold (transactional decrement of held count on every night, with an expiry) → confirm (payment succeeds → held becomes sold) or expire (background sweeper + lazy expiry on read). OTA channels consume an availability feed derived from the same change stream and post bookings through the same transactional path with a channel-priority rule for the last-room case.</p>",
        data:
          "<p>Core table: <code>inventory(property_id, room_type, date) → {physical, allotment, buffer, sold, held}</code> with the invariant <code>sold + held ≤ allotment + buffer</code> enforced in the transaction. Bookings: <code>booking(id, property_id, room_type, guest, check_in, check_out, status, hold_expires_at)</code>. Holds are rows in the same shard as their counters — never a separate service — so decrement-and-hold is one transaction. For search, each replica keeps a 550-bit availability bitmap per (property, room type): bit d = 1 if at least one unit is open on date d. A stay of nights [d, d+n) is available iff a mask of n bits ANDs clean — a 30-night range check across a metro is a few thousand 64-bit AND operations. Min-stay/close-out rules compile into the bitmap layer (a close-out just clears a bit for search purposes) so search never evaluates rule logic per query.</p>",
        deepdives:
          "<p><b>The booking transaction:</b> read all n night-counters FOR UPDATE in date order (a deterministic lock order preventing deadlock with overlapping stays), check the invariant on each, decrement held on all-or-none, write the hold row, commit. Multi-night atomicity is why counters are colocated per property. <b>Hold expiry:</b> two mechanisms, belt and suspenders — a sweeper scans holds past deadline every 5s and releases counters; additionally the invariant check treats expired-but-unswept holds as free (lazy expiry), so a slow sweeper can never block the last-room sale. <b>Overbooking & arrival day:</b> the buffer is per (room type, date), set by revenue management from historical no-show curves. On arrival day, a nightly reconciliation ranks at-risk bookings and the property runs the walk protocol (upgrade internally first, then walk lowest-priority late arrivals to a partner hotel with compensation) — the system's job is to surface projected overage per date 7 days out so buffers get tuned, not to pretend oversell can't happen: it is deliberate. <b>OTA race:</b> stop-sell notifications go out when remaining ≤ channel-latency exposure (e.g. 2 rooms), shrinking the window where an OTA can sell inventory that just disappeared; OTA bookings past sell-out land in an oversell queue that consumes buffer first, then triggers the walk protocol.</p>",
        tradeoffs:
          "<p><b>Count-based pool vs per-physical-room booking:</b> pool counters make availability O(1) per night and defer assignment to check-in, matching real hotel ops; per-room booking would give guests 'room 412 guaranteed' but multiplies the keyspace 150x and turns availability into interval scheduling. Pool wins; specific-room requests become preferences resolved at assignment. <b>Serializable single-shard vs distributed transactions:</b> partition-by-property means zero cross-shard bookings, at the cost of hot shards for mega-properties during on-sales — mitigated by per-counter row locking (contention is per room-type-date, not per property) and queueing at 50x spikes. Chosen deliberately over a 2PC design that would be slower every day to handle a cross-property itinerary feature we don't have (multi-property trips are separate bookings with saga-style compensation). <b>Stale search vs consistent search:</b> seconds-stale search costs some 'sorry, just sold out' at quote time (~0.2% of quotes at 500:1 search:book); consistent search would put every search on the transactional store — a 500x load multiplier to avoid an apology screen. <b>Holds decrement shared availability:</b> yes — the alternative (overselling holds) turns every checkout race into a payment-then-fail experience, the worst possible UX.</p>",
        scaling:
          "<p>Read scaling is embarrassingly parallel: availability replicas are ~2GB, so add replicas per region and shard the metro search fan-out by geography. Write scaling has a natural ceiling per property — a 150-room hotel physically cannot need more than tens of commits/sec — so the risk is not throughput but <i>spike shape</i>: an event on-sale funnels thousands of users at one (room type, date). Handle with a bounded FIFO admission queue per hot counter (fail fast beyond queue depth with honest 'high demand' messaging) rather than letting lock convoys inflate tail latency for the whole shard. Growth to 50,000 properties multiplies shards linearly with no cross-shard coupling. The long-term complexity magnet is rules (rate plans, length-of-stay, channel-specific allotments): keep the transactional invariant brutally simple — counters and buffer — and compile all rule complexity into the search/quote layer, so correctness never depends on the fancy logic.</p>"
      },
      followups: [
        "A property retires 20 rooms for renovation with 300 future bookings affected. Design the re-accommodation workflow.",
        "Add a 'reserve now, pay at hotel' option — how does it change hold semantics and no-show modeling?",
        "Two modifications to the same booking race (guest extends stay while front desk upgrades room). What happens?",
        "Revenue management wants to A/B test overbooking buffers. What guardrails does the platform enforce?",
        "How would you support a corporate block (100 rooms held for a conference, released 30 days out) in this model?",
        "Design the audit trail that answers 'why did we oversell 3 rooms on March 14' six months later."
      ],
      rubric: {
        senior: [
          "Identifies room-night counters as the core model and computes that live inventory fits in memory.",
          "Separates eventually-consistent search from strictly-consistent booking and justifies the staleness budget.",
          "Makes multi-night booking atomic with deterministic lock ordering or equivalent.",
          "Designs hold expiry that can never block a sale (lazy expiry backstopping the sweeper).",
          "Treats overbooking as configured business policy with a buffer invariant, not as a bug to prevent.",
          "Uses bitmaps or an equivalent structure for fast date-range availability."
        ],
        staff: [
          "Partitions by property to keep bookings single-shard and defends that against the cross-property alternative honestly.",
          "Bounds cross-channel oversell exposure quantitatively (stop-sell threshold vs channel latency).",
          "Designs the arrival-day walk protocol and the feedback loop that tunes buffers — owns the business outcome, not just the invariant.",
          "Anticipates spike-shape failure (lock convoys on one counter) and admission-controls it.",
          "Keeps the transactional core minimal and pushes rule complexity to compiled search layers, articulating why that protects correctness."
        ]
      }
    },
    {
      slug: "realtime-leaderboard",
      name: "Design a Real-Time Leaderboard",
      category: "System Design",
      difficulty: "Medium",
      minutes: 35,
      summary: "Top-k and my-rank at scale: 50M players, 100k score updates/sec, live ranks.",
      statement:
        "<p>Design the leaderboard service for a mobile game with 50M monthly players. During live tournaments, 5M concurrent players submit score updates at up to 100k updates/sec. Every player sees: the global top 100, their own rank and score, a window of ±25 players around them, and a friends leaderboard. Tournaments run in seasons; when a season ends, final ranks pay out rewards and must be exact and auditable.</p><p>The tension to explore: exact global rank for 50M players on every read is expensive, but players stare at their rank obsessively — it must feel live. Top-100 must be exactly right (money is on it); whether rank 4,382,117 vs 4,382,204 is exact is a product conversation you are expected to drive.</p><p>Cover the core ranking structure, the read and write paths, what precision you promise at each rank band, cheat resistance at the ingestion boundary, and the end-of-season settlement process.</p>",
      clarifying: [
        "Is a score update always-increasing (high-water mark) or can scores decrease? Monotonicity changes everything about caching.",
        "What staleness is acceptable for my-rank at mid-board — is 5 seconds fine if top-100 is real-time?",
        "How are ties ranked — by earliest achievement time? This affects the sort key structure.",
        "How many concurrent leaderboards — one global, or thousands (per-country, per-league, per-mode) with players on several at once?",
        "What is the friends-graph size distribution (median ~50, max ~5,000?) and does friends rank need server-side computation?",
        "What anti-cheat posture is required at submission — server-authoritative scoring, statistical anomaly detection, or trust-the-client?",
        "At season end, is there a settlement freeze window, and what audit artifacts must survive for disputes?"
      ],
      functional: [
        "Submit score update; leaderboard reflects it in top-100 within 1s and in my-rank within 5s.",
        "Read top-100 (exact), my rank + score, and the ±25 window around my rank.",
        "Friends leaderboard computed from the player's friend list, fresh within 30s.",
        "Season lifecycle: create, run, freeze, settle with exact final ranks, archive for queries.",
        "Suspicious-score quarantine: flagged updates are excluded from public boards pending review without losing the data."
      ],
      nonfunctional: [
        "Sustain 100k score writes/sec with p99 write latency under 50ms.",
        "Serve 500k leaderboard reads/sec (5M concurrent players polling ~every 10s) with p95 under 100ms.",
        "Top-100 is exact and globally consistent within 1 second of any qualifying update.",
        "Mid-board rank error bounded: displayed rank within 0.1% of true rank, staleness under 5 seconds.",
        "Season settlement produces a deterministic, replayable final ranking for 50M players in under 10 minutes."
      ],
      estimation: {
        prompts: [
          "Memory to hold 50M (player_id, score, tiebreak) entries in a sorted structure — does it fit on one node?",
          "Write amplification: 100k updates/sec against a sorted structure — what operations per update?",
          "Read load breakdown: what fraction of 500k reads/sec can be served from a cached top-100 vs per-player rank lookups?",
          "Bucket-histogram approach: how many buckets for 0.1% rank precision at 50M players?"
        ],
        worked:
          "<p>Sizing the naive-but-correct core: 50M entries x (8B id + 8B packed score+tiebreak + ~40B sorted-set node overhead) ≈ <b>~3GB</b>. It fits in RAM on one box with room to spare — so a single sharded-by-necessity design is over-engineering for capacity, and sharding decisions should be driven by write throughput and isolation instead.</p><pre>Writes: 100k/s x O(log 50M ~ 26) skiplist ops ~ 2.6M node ops/s\n  -> heavy for one instance; shard by score-range or player-hash to ~8 ways\nReads: top-100 poll = cached snapshot, refreshed 1/s, served from CDN-ish\n  edge cache -> effectively free regardless of player count\nMy-rank: hash-sharded exact rank needs fan-out (sum counts above score\n  across shards): 500k/s x 8 shard-queries = 4M/s -- too hot.\n  Bucket histogram instead: 50k score-buckets, prefix-sum array refreshed\n  every 2s -> rank estimate error ~ bucket width ~ 50M/50k = 1,000 players\n  = 0.002% at mid-board. One array lookup per read.</pre><p>Takeaway: split the product into three read classes — exact cached head, approximate histogram middle, exact-on-demand window — and each class becomes cheap independently.</p>"
      },
      model: {
        highlevel:
          "<p>Write path: score submissions hit a validation gateway (auth, monotonicity check, anomaly screen), then land in a partitioned log for durability and replay. Rank-serving consumers build two structures per leaderboard: <b>(1)</b> sharded in-memory sorted sets (score-range sharded, so rank = local rank + sum of higher shards' counts, maintained by a lightweight shard-count exchange every 500ms) holding the exact board; <b>(2)</b> a global score histogram (50k buckets with prefix sums, rebuilt every 2s) answering my-rank in O(1). The head of the board (top ~1,000) is additionally mirrored into a tiny exact replica updated synchronously on any qualifying write, snapshotted once per second, and cached at the edge — top-100 reads never touch the core. The log is the source of truth; every in-memory structure is a rebuildable view, which is also exactly what makes settlement auditable.</p>",
        data:
          "<p>Sort key is a single 64-bit packed value: <code>score (high 40 bits) | inverted_timestamp (low 24 bits)</code> — ties break toward the earlier achiever, and one integer comparison orders everything (no comparator logic in the hot path). Player index: hash map player_id → current packed key, needed to locate/remove the old entry on update. The histogram is a plain array: bucket = score / width, value = count, plus a prefix-sum array; my-rank = prefix_sum(bucket above mine) + position-in-bucket estimate. Friends leaderboard is computed read-side: fetch friend list (median 50), point-lookup each friend's score from the player index, sort 50 items in-process — no precomputed friend boards, because materializing 50M friend-views is strictly worse than 50 point reads. Season archive: the settled board is written as an immutable sorted file with a rank index, served for historical queries without any live infrastructure.</p>",
        deepdives:
          "<p><b>Monotonic high-water marks:</b> if scores only increase, updates below the current stored score are dropped at the gateway — during tournaments this discards a large fraction of writes before they cost anything, and it makes retries/duplicates idempotent for free. If the game later needs decreasing scores, that guarantee collapses; flag it as a contract with the game team, not an implementation detail. <b>Shard rebalancing:</b> score-range shards skew as the population climbs (everyone migrates upward through the ranges); shards split/merge on count thresholds, and because true state lives in the log, a rebalance is 'spin up new consumers with new ranges, replay, atomically switch' — no live-migration surgery. <b>Cheat boundary:</b> the leaderboard trusts the gateway's verdict; the gateway checks server-authoritative recomputation where the game supports it, else statistical screens (score delta vs playtime, impossible rates). Flagged updates still enter the log tagged quarantined — visible in the player's own view (so cheaters don't get a clean signal they were caught) but excluded from public boards. <b>Settlement:</b> freeze = gateway stops accepting for the season at T; settlement replays the season's log deterministically (same tie-breaks, quarantine rulings applied), producing a final board whose hash is recorded; disputes re-run the replay. Exactness comes from the log, not from trusting the live in-memory view.</p>",
        tradeoffs:
          "<p><b>Exact everywhere vs banded precision:</b> exact my-rank for 50M players at 500k reads/sec means either massive fan-out or per-write global counter maintenance; the histogram gives 0.002% error for one array read. Players at rank 4M cannot perceive a 1,000-place error; players at rank 40 can perceive a 1-place error — hence exact head + approximate middle, with the ±25 window query (which IS exact, served from the owning shard) covering the 'players near me' emotional need. This is a product-shaped technical decision and should be presented to product as such. <b>Score-range vs hash sharding:</b> hash sharding balances load perfectly but makes rank queries touch every shard; range sharding makes rank local-plus-prefix but needs rebalancing. Range wins because reads dominate 5:1 and rebalancing is cheap given log-replay. <b>Push vs poll to clients:</b> 5M websockets pushing every rank change is enormous fan-out for mostly-imperceptible changes; poll-with-jitter at 10s plus push only for head-of-board changes matches perception at ~1% of the cost. <b>Redis sorted sets vs custom:</b> a managed sorted-set store gets to market fastest and is the right v1; the histogram layer and log-replay settlement are the parts worth owning either way.</p>",
        scaling:
          "<p>From 50M to 500M players: memory grows to ~30GB — still single-digit machines; the histogram stays O(buckets) regardless of population; top-100 caching is population-independent. What actually strains is <b>leaderboard count</b>: thousands of concurrent boards (per-country, per-league, per-event) each need their structures, so the platform becomes a multi-tenant scheduler placing boards on serving nodes by expected write rate, with small boards packed hundreds-to-a-node and tournament boards isolated. The second strain is write bursts at tournament end (everyone's final run lands in the last 5 minutes): the log absorbs the burst, the head replica stays synchronous (it must), and histogram refresh degrades gracefully from 2s to 10s under load — an explicit, monitored degradation order rather than an accidental one. Low-end reality check on the client side: the ±25 window endpoint returns display-ready data (names, avatars resolved) so clients on 2G in tournament markets make one request, not 51.</p>"
      },
      followups: [
        "Tournament ends and 2M players submit within the final 60 seconds. Trace the write path and what degrades.",
        "A bug double-counted some scores for 3 hours mid-season. Using the log-replay architecture, design the remediation.",
        "Add a 'percentile' display (top 2% badge). What does it cost on top of the histogram, and where does it break?",
        "How would you run 200 country-level boards plus the global board on one score submission without 201 writes?",
        "Product wants rank-change notifications ('you dropped out of top 100'). Design the detection without scanning.",
        "A partner wants read access to live ranks for a TV broadcast overlay with 500ms freshness. What do you build them?"
      ],
      rubric: {
        senior: [
          "Computes that the full board fits in memory and lets throughput, not capacity, drive sharding.",
          "Splits reads into exact head / approximate middle / exact window and prices each independently.",
          "Uses a packed sort key handling tie-breaks in one comparison.",
          "Computes friends boards read-side and can say why materialization is worse.",
          "Exploits score monotonicity for idempotency and write shedding, and names it as a contract.",
          "Keeps a durable log as source of truth with in-memory structures as rebuildable views."
        ],
        staff: [
          "Frames precision banding as a product decision with perceptual justification, and drives it rather than waiting for requirements.",
          "Designs deterministic log-replay settlement with audit hashes, separating live-view correctness from payout correctness.",
          "Plans multi-tenancy (thousands of boards) as the real scaling axis with placement/isolation strategy.",
          "Specifies an explicit degradation order under burst (what gets stale first, what never does).",
          "Positions the cheat boundary correctly (gateway verdict, quarantine-not-drop) and explains the product reasoning."
        ]
      }
    },
    {
      slug: "design-system-library",
      name: "Design a Design System & Component Library",
      category: "Frontend System Design",
      difficulty: "Medium",
      minutes: 40,
      summary: "Tokens, theming, versioning, a11y contract, and distribution for 40 product teams.",
      statement:
        "<p>Your company has 40 product teams shipping web apps in three frameworks (React majority, some Vue, some server-rendered templates), and every team has hand-rolled its own buttons. You are designing the design system: the token architecture, the component library, theming (light/dark plus white-label brands for enterprise customers), the accessibility contract, and — hardest of all — the versioning and distribution strategy that lets 40 teams upgrade on their own schedules without the system fragmenting.</p><p>This is an architecture problem, not a styling problem. The interviewer wants to see: how tokens are layered so a rebrand is a data change, not a code change; how components expose behavior without dictating markup where it matters; how breaking changes actually roll out across a fleet of consuming apps; and how you measure whether the system is being adopted or quietly forked.</p>",
      clarifying: [
        "Which frameworks must be first-class? Is a web-components core with framework wrappers on the table, or is this React-first with tokens-only support elsewhere?",
        "How many white-label brands, and how deep does theming go — colors and type only, or component-level shape changes (border radius, density, iconography)?",
        "What is the accessibility bar — WCAG 2.2 AA as a hard contract with audit evidence, or best-effort?",
        "Do consuming apps bundle the library themselves (npm) or is there a shared runtime/CDN requirement for consistency across a portal shell?",
        "What is the versioning tolerance — can we require all teams within 2 majors, or must v1 consumers live indefinitely?",
        "Is there a dedicated team owning this long-term, and do we have design-side ownership of tokens (Figma as source of truth)?",
        "Do multiple versions of the library need to coexist on one page (microfrontends), which constrains global CSS and singleton patterns?"
      ],
      functional: [
        "Three-tier token system (primitive → semantic → component) published as a framework-agnostic package consumable by CSS, JS, and native design tools.",
        "Core component set (~40 components) with full keyboard/screen-reader behavior, composable primitives for the long tail.",
        "Runtime theming: light/dark and brand switching without reload, scoped so two themes can coexist on one page.",
        "Versioned releases with codemods for breaking changes, a deprecation pipeline, and per-component adoption telemetry.",
        "Figma libraries and code stay synchronized from the same token source, with drift detection in CI."
      ],
      nonfunctional: [
        "Library adds ≤ 50KB gzipped JS to a typical app importing 15 components (tree-shaking verified in CI with size budgets per component, e.g. Button ≤ 3KB).",
        "Zero runtime style recalculation cost for theme tokens: theme switch applies via CSS custom property scope flip in under 16ms (one frame).",
        "Every interactive component passes WCAG 2.2 AA: axe-core clean in CI, plus manual screen-reader test evidence per release.",
        "Breaking-change policy: max 1 major per year, codemod coverage for ≥ 80% of call sites, 12-month support window per major.",
        "Component SSR-safe and hydration-clean: no layout shift on hydration (CLS contribution 0), no client-only rendering for core components."
      ],
      estimation: {
        prompts: [
          "Estimate token count across 3 tiers for 4 brands x 2 color schemes, and the size of the generated CSS custom-property payload.",
          "Estimate bundle contribution: 40 components, per-component budgets, what a typical app actually imports.",
          "Estimate migration effort for one breaking change: call sites across 40 apps, codemod coverage, residual manual work.",
          "Estimate adoption telemetry volume: component render counts sampled from 40 apps."
        ],
        worked:
          "<p>Tokens: ~120 primitives (color ramps, type scale, spacing, radii, shadows, motion) → ~180 semantic tokens (text-primary, surface-raised, border-interactive...) → ~300 component tokens (button-primary-bg, input-border-focus...). Only semantic and component tiers ship to the browser as CSS custom properties: ~480 declarations x ~40 bytes ≈ <b>19KB raw, ~4KB gzipped per theme scope</b> — cheap enough that all brand themes can ship for portal cases, or be split per-brand for single-tenant apps.</p><pre>Bundle: typical app imports ~15 components\n  Button 3KB + Input 4KB + Select 9KB + Dialog 8KB + Table 12KB + ...\n  ~= 45KB gz JS + 8KB gz CSS -- within the 50KB budget, enforced per-PR\nMigration (rename Button variant prop):\n  40 apps x ~120 Button call sites = ~4,800 sites\n  codemod covers ~85% -> ~720 manual sites / 40 teams = ~18 per team, ~2h each\nTelemetry: dev-build only, sampled 1% in prod\n  40 apps x ~1M component renders/day x 1% = 400k events/day -- negligible</pre><p>The migration arithmetic is the important one: it converts 'we should rename this prop' from an aesthetic debate into a ~90 engineer-hour org-wide cost, which is exactly the number a staff engineer brings to the breaking-change decision.</p>"
      },
      model: {
        highlevel:
          "<p>Four layers with strict dependency direction. <b>(1) Token core:</b> a single JSON source of truth (built with a style-dictionary-style pipeline) emitting CSS custom properties, TS constants, and Figma variables — the rebrand artifact. <b>(2) Behavior primitives:</b> headless, unstyled logic — focus management, listbox/combobox state machines, dismissable-layer stacking, roving tabindex — where all the accessibility engineering concentrates. <b>(3) Styled components:</b> the branded components teams actually import, composing primitives + tokens; React first-class, with the primitive layer kept DOM-centric enough that Vue wrappers share the behavior contract. <b>(4) Distribution:</b> npm packages per layer (tokens / primitives / components), semver'd independently, plus a docs site that is itself the reference consumer. Server-rendered template teams consume tokens + CSS + a small set of web-component wrappers for the interactive essentials, an explicitly narrower contract than the React surface.</p>",
        data:
          "<p>The theming contract is the core data design. Components never reference primitives — only semantic/component tokens — so themes are pure token-value maps applied by scope, not cascade order:</p><pre>tokens.json (source of truth)\n  primitive:  blue.600: \"#2A5CAA\"\n  semantic:   color.bg.interactive: \"{blue.600}\"\n  component:  button.primary.bg: \"{color.bg.interactive}\"\n\nCSS emission (scoped, coexistence-safe):\n  [data-theme=\"acme-light\"] { --ds-button-primary-bg: #2A5CAA; ... }\n  [data-theme=\"acme-dark\"]  { --ds-button-primary-bg: #7FA8E0; ... }\n\nComponent (React):\n  &lt;Button variant=\"primary\"&gt;  // resolves var(--ds-button-primary-bg)\n\nSurface (long-tail escape hatch):\n  &lt;Dialog&gt; = composition of &lt;DismissableLayer&gt; + &lt;FocusScope&gt;\n            + &lt;Portal&gt; primitives -- teams can rebuild variants\n            from the same primitives instead of forking styles</pre><p>Because theming is attribute-scoped custom properties, two brands coexist on one page (portal shell + embedded product), theme switching is one attribute flip with zero JS re-render, and dark mode respects <code>prefers-color-scheme</code> by default while remaining overridable.</p>",
        deepdives:
          "<p><b>Accessibility as contract, not aspiration:</b> each component ships a written a11y spec — role/state mapping, full keyboard grid, focus behavior, screen-reader announcement script — and CI enforces it: axe-core on every story, keyboard-navigation integration tests (real Tab/Arrow sequences via Playwright), and a release gate requiring manual NVDA + VoiceOver passes on changed components. The primitives layer is where this pays off: 40 teams get correct combobox keyboard handling because exactly one implementation exists. <b>Versioning mechanics:</b> deprecations land as runtime dev-mode warnings + eslint rules one major ahead; breaking changes ship with codemods tested against a corpus of real product code cloned in CI; the library publishes an adoption dashboard (which app is on which major, per-component usage from telemetry) so the platform team hunts stragglers with data. <b>Coexistence for microfrontends:</b> no global styles, no singletons — dismissable-layer stacks and portal roots register through a versioned window-scoped protocol so a v3 dialog and a v4 dropdown on one page maintain a coherent z-order and escape-key stack. That protocol is the subtlest part of the design and worth stating explicitly. <b>Figma sync:</b> tokens push to Figma variables via API on release; CI diffs Figma against tokens.json weekly and files drift tickets — design drift is treated like schema drift.</p>",
        tradeoffs:
          "<p><b>Headless primitives + styled layer vs styled-only:</b> costs a second API surface and more docs, but it converts the fork pressure of the long tail ('our card is special') into composition instead of copy-paste — forks are the death of design systems, so this is the load-bearing trade. <b>Web-components core vs per-framework:</b> a WC core would unify all three frameworks but taxes the React majority (SSR friction, event interop, ref forwarding) to subsidize the minority; chosen instead: React-native implementation, shared behavior specs, tokens-everywhere, narrow WC bridge for template apps. Honest cost: Vue support is a wrapper burden owned by the platform team. <b>CSS custom properties vs build-time theming:</b> runtime properties cost a few hundred declarations in memory but make brand switching data-driven and coexistent; build-time theming would minify smaller but forces one-brand-per-build and kills the portal case. <b>Strict semver with 12-month windows vs evergreen:</b> evergreen (everyone on latest) is fiction across 40 teams with their own deadlines; unlimited support is a museum. The 12-month window with codemods is the negotiated middle, and the design system team's roadmap explicitly reserves ~25% capacity for migration tooling — under-resourcing that line item is how systems die.</p>",
        scaling:
          "<p>Scaling axis one is <b>consumers:</b> from 40 to 100 teams, the bottleneck becomes support load — solved with office hours, a triage rotation, contribution guidelines that let product teams PR new variants behind design review, and the primitives layer absorbing customization demand. Axis two is <b>surface area:</b> component count wants to grow unboundedly; hold the styled layer at ~50 components and let the long tail live in a community/experimental tier with explicit no-guarantee labeling, promoting only proven patterns. Axis three is <b>performance at the low end:</b> token CSS is fixed-cost, but component JS must stay tree-shakeable as the library grows — CI runs size-limit per component and a canary app measuring real LCP/INP impact of upgrades on a throttled 4x-CPU profile, so a Select rewrite that regresses INP by 40ms on low-end Android gets caught before 40 apps inherit it. The endgame risk is not technical: it is the system drifting from product reality until teams route around it — the adoption telemetry and the contribution path are the immune system, and both need executive air cover to function.</p>"
      },
      followups: [
        "A team needs a component the system lacks, ships their own, and now 3 teams copied it. Walk through the graduation process into the system.",
        "An enterprise customer's brand fails contrast requirements with your semantic token structure. Who bends — the tokens, the component, or the customer?",
        "How do you test that a codemod is safe across 40 codebases you don't own?",
        "Two majors coexist in one microfrontend page and dialogs from each fight over focus. Debug the layering protocol.",
        "Design the density theming story (compact tables for data-heavy enterprise screens) without forking components.",
        "What telemetry would prove to leadership the system saved engineering time, not just standardized pixels?"
      ],
      rubric: {
        senior: [
          "Structures tokens in tiers with components referencing only semantic/component tokens, making rebrand a data change.",
          "Separates headless behavior primitives from styled components and explains the fork-pressure rationale.",
          "Specifies concrete a11y enforcement: axe in CI, real keyboard tests, manual screen-reader gates.",
          "Designs theming via scoped CSS custom properties supporting coexistence and one-frame switching.",
          "Enforces size budgets per component in CI and knows what a typical app's import set costs.",
          "Ships breaking changes with codemods and deprecation lead time, not just semver labels."
        ],
        staff: [
          "Treats versioning across 40 autonomous teams as the core problem: support windows, migration cost arithmetic, adoption telemetry, straggler strategy.",
          "Makes the framework-strategy call (React-first vs WC core) by taxing analysis of the majority vs minority, and owns its costs explicitly.",
          "Designs the cross-version coexistence protocol (layer stacking, portals) for microfrontend pages.",
          "Builds the org mechanics — contribution path, graduation process, capacity reservation for migration tooling — as part of the architecture.",
          "Connects the system to measurable outcomes (INP/LCP canary, time-saved telemetry) rather than consistency for its own sake."
        ]
      }
    }
  );
})();
