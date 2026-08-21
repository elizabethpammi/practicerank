(function () {
  "use strict";
  window.DESIGN_QUESTIONS = window.DESIGN_QUESTIONS || [];
  window.DESIGN_QUESTIONS.push(
    {
      slug: "typeahead",
      name: "Design Search Autocomplete",
      category: "System Design",
      difficulty: "Medium",
      minutes: 35,
      summary: "Prefix suggestions in under 100 ms at 40k QPS; precomputed top-k vs live trie walk.",
      statement: "<p>Your company runs a consumer search box used by 30 million people a day. Product wants suggestions to appear under the cursor as the user types: after every keystroke the client asks the backend for the ten best completions of the current prefix. The suggestion payload must arrive fast enough that it never feels laggy while typing, which in practice means the whole round trip has to land well under 100 ms.</p><p>Suggestions are ranked by global popularity: how often real users submitted that full query over roughly the last week. Freshness matters at the scale of hours, not milliseconds. A query that suddenly spikes (a breaking news term) should surface within a few hours; nobody expects it within seconds.</p><p>Design the read path, the ranking pipeline that turns raw query logs into suggestion data, and the storage layout. Be explicit about what is precomputed and what is computed per request, because that single decision drives almost everything else in this problem.</p>",
      clarifying: [
        "Is ranking personalized per user, or one global ranking? (Assume global; personalization is a follow-up.)",
        "How fresh must popularity scores be — seconds, hours, or daily? (Hours is acceptable.)",
        "Do we suggest only previously-seen full queries, or generate novel completions? (Only seen queries.)",
        "What is the maximum prefix length we serve? Do 1-character prefixes need suggestions too?",
        "Multi-language and Unicode: do we normalize case, accents, and CJK input methods?",
        "Do we need to filter offensive or legally-blocked suggestions, and how quickly must a blocklist entry take effect?",
        "What does the client do while a request is in flight — debounce, cancel stale requests, or fire every keystroke?"
      ],
      functional: [
        "Given a prefix, return the top 10 completions ranked by trailing-7-day query frequency.",
        "Ingest the full query log continuously and refresh rankings at least every 4 hours.",
        "Apply a blocklist that removes a suggestion from serving within 15 minutes of the entry being added.",
        "Normalize input (lowercase, trim, collapse whitespace, strip accents) identically at ingest and at serve time.",
        "Cap suggestions at 60 characters and drop queries seen fewer than 5 times in the window."
      ],
      nonfunctional: [
        "p99 server-side latency under 25 ms so the end-to-end budget of 100 ms survives mobile network jitter.",
        "Sustain 40,000 suggestion requests/sec at peak (each typed query fans out to ~8 keystroke requests).",
        "99.95% availability; on failure the search box must degrade to no suggestions, never to an error dialog.",
        "Suggestion data refresh must complete over a ~500 GB weekly log window without pausing serving.",
        "Serving fleet memory budget: the entire suggestion structure must fit in RAM on each node, target under 24 GB."
      ],
      estimation: {
        prompts: [
          "Convert 30M daily searchers into peak suggestion QPS, assuming ~8 keystrokes issue requests per search.",
          "Estimate the size of the distinct-query set after the min-frequency filter, and the bytes per entry.",
          "Size the in-memory structure if every prefix up to length 8 stores a precomputed top-10 list.",
          "Estimate daily raw query-log volume feeding the ranking pipeline.",
          "How much does response caching at the CDN/edge cut origin QPS, given prefix skew?"
        ],
        worked: "<p>Traffic first. 30M users, average 4 searches each, is 120M searches/day. Each search emits about 8 keystroke requests, so 960M suggestion requests/day. Averaged that is ~11k QPS; with a 3.5x evening peak we design for ~40k QPS.</p><pre>120M searches/day x 8 keystrokes  = 960M req/day\n960M / 86,400 s                   = ~11.1k QPS avg\n11.1k x 3.5 peak factor           = ~39k QPS  -> design 40k</pre><p>Storage next. Distinct queries seen 5+ times in a week: call it 200M. Precomputing top-10 per prefix for prefixes of length 1..8 gives at most 8 prefix entries per query, but prefixes collide heavily; measured prefix sets on real logs land around 3x the query count, so ~600M prefix keys. Each key stores 10 suggestion IDs (4 B each) plus scores: ~60 B of payload, ~100 B with key and overhead, so ~60 GB total — too big for one node's 24 GB budget, which is exactly why we shard the prefix space (first two characters give us natural, if skewed, shards). Log volume: 120M searches x ~60 B/line is ~7 GB/day, ~50 GB/week raw before enrichment — comfortably a single daily batch job.</p>"
      },
      model: {
        highlevel: "<p>The core decision: do not walk a trie and rank candidates per request. Precompute the answer for every servable prefix offline, and make the read path a single sharded hash lookup: <code>prefix -> [10 suggestions]</code>. At 40k QPS with a 25 ms p99, per-request ranking work is a liability; a memory lookup is essentially free and its latency is flat regardless of how popular the prefix is.</p><pre>client --> edge cache --> suggest-api --> prefix-shard (RAM hash map)\n                                             ^\n                query logs -> Kafka -> hourly agg job -> builder -> versioned\n                                                          snapshot   shard files</pre><p>Two planes. The serving plane is a fleet of stateless API nodes fronting prefix shards that hold immutable in-memory maps. The build plane tails query logs, aggregates counts hourly, decays them across the 7-day window, applies the blocklist and normalization, computes top-10 per prefix, and writes versioned shard files to object storage. Shards download the new version, mmap it, and atomically swap a pointer — serving never sees a half-built structure. The blocklist alone gets a fast path: a small filter set pushed to serving nodes every few minutes, applied at read time, so takedowns do not wait for the next full build.</p>",
        data: "<p>The build output is a flat, immutable, mmap-friendly file per shard: a sorted array of prefix hashes with offsets into a payload region, payload being 10 (suggestion_id, score) pairs plus a string table. Immutability is what makes the swap trivial and lets us skip locks entirely on the read path.</p><pre>GET /v1/suggest?q=how+to+tie&lang=en\n-> 200 {\"suggestions\":[{\"text\":\"how to tie a tie\",\"score\":81234}, ...]}\n\nShard file layout (per prefix-range shard):\n  header   { version, build_ts, entry_count }\n  index    [ prefix_hash u64 | payload_offset u32 ]  (sorted, binary search)\n  payload  [ 10 x { sugg_id u32, score u32 } ] per prefix\n  strings  suggestion_id -> utf8 text (deduped; one query shared by many prefixes)\n\nBuild-plane tables:\n  query_counts(query, hour_bucket, count)          -- rolling 7d, hourly grain\n  blocklist(pattern, added_at, mode: exact|prefix) -- pushed to serving every 5 min</pre><p>The string table dedup matters: a popular query appears under up to 8 prefixes, so storing text once and referencing 4-byte IDs is roughly a 5x payload saving versus inlining strings per prefix.</p>",
        deepdives: "<p><b>Long-tail prefixes.</b> Precomputing every prefix up to length 8 covers the hot path, but users type longer prefixes. Two honest options: (a) after length 8, filter the length-8 result set client- or server-side by string prefix match — cheap, correct whenever the true top-10 for the longer prefix is a subset of a few hundred candidates we can afford to store; (b) fall back to a secondary structure (a per-shard sorted array of full queries, binary-searched by prefix). Option (a) with a stored candidate list of 100 per length-8 prefix costs 10x payload only on length-8 entries (~15% of keys) and answers 99%+ of long prefixes without a second system. Take (a).</p><p><b>Freshness vs. blast radius.</b> Rebuilding 60 GB of shards hourly is wasteful and makes every build a full-fleet deployment. Split scoring into a slow component (7-day decayed count, rebuilt every 4 hours) and a fast trending overlay: a tiny top-K structure (heavy-hitters sketch over the last 2 hours, a few MB) merged at read time with a boost multiplier. A spiking query enters the overlay within minutes; the full build absorbs it later. The read path merges 10 base + up to 3 overlay candidates — bounded, still trivially fast.</p><p><b>Hot-shard skew.</b> Sharding by first two characters makes the 'th', 'ho', 'wh' shards enormously hotter than 'xq'. Fix with shard-level replication weighted by observed traffic: hot prefix ranges get 12 replicas, cold ranges 2, assignment recomputed daily from access logs. This is operationally simpler than re-hashing the keyspace and keeps any single lookup one hop.</p>",
        tradeoffs: "<p><b>Precomputed top-k vs. live trie:</b> we bought flat, predictable latency and a lock-free read path at the price of freshness (hours, patched by the trending overlay) and storage amplification (every query indexed under many prefixes). For a global-ranking product this is the right trade; a per-user personalized ranker would flip it, because you cannot precompute per-user answers for 600M prefixes.</p><p><b>Edge caching:</b> prefix popularity is extremely skewed, so caching <code>GET /suggest</code> responses at the edge for 60 s absorbs an outsized share of traffic — but it caps blocklist takedown latency at the TTL. We accept 60 s of cache staleness on top of the 5-minute blocklist push; legal-grade takedowns purge the CDN explicitly.</p><p><b>Bottleneck honesty:</b> the real production bottleneck is the build pipeline, not serving. A 4-hour build that starts failing silently means rankings quietly go stale; the fix is freshness monitoring as a first-class SLO (alert when serving snapshot age exceeds 6 hours), not more serving replicas.</p>",
        scaling: "<p><b>1x (single region, 40k QPS):</b> ~24 prefix shards x a few replicas, one Kafka log, one build job. The whole suggestion dataset would nearly fit on one big-memory box; we shard anyway for deployment safety and blast-radius control, not raw capacity.</p><p><b>10x (400k QPS, global users):</b> latency budget forces multi-region serving — 100 ms end-to-end does not survive an ocean crossing. Replicate the immutable snapshots to 3 regions (they are just files in object storage; replication is a copy, not a consensus problem). Builds stay centralized; logs ship to one region. The trending overlay becomes per-region, which is actually a feature: trends differ by geography.</p><p><b>100x (4M QPS):</b> the edge does the serving. Push the top ~5 GB of hottest prefix entries to CDN edge compute as a static dataset refreshed every 15 minutes; the origin fleet handles only long-tail prefixes and overlay merging, perhaps 10% of traffic. At this scale the organizational problem dominates: the build pipeline becomes a multi-team dependency, so snapshot format versioning and backward compatibility (serving N and N-1 formats simultaneously) stops being optional.</p>"
      },
      followups: [
        "Add per-user personalization (recent queries first) without destroying the precomputation model — where does the merge happen?",
        "Suggestions must now update within 60 seconds of a trend emerging. What breaks, and what replaces the hourly aggregation?",
        "How would you A/B test a new ranking formula when the ranking is baked into offline snapshots?",
        "Support fuzzy prefixes (typo within edit distance 1) — what does that do to your storage math?",
        "A court order requires a suggestion removed globally within 5 minutes, including CDN caches. Walk the exact path.",
        "How do you validate a new snapshot before it takes traffic — what would a bad build even look like?"
      ],
      rubric: {
        senior: [
          "Immediately separates the serve path from the build path and keeps per-request work O(1)-ish.",
          "Does concrete QPS and memory math and notices the dataset does not fit the stated per-node budget.",
          "Handles Unicode/normalization consistently across ingest and serve rather than hand-waving it.",
          "Proposes a real answer for prefixes longer than the precomputed depth.",
          "Designs atomic snapshot swap so serving never reads a partially-built structure.",
          "Identifies prefix skew and gives a workable hot-shard mitigation."
        ],
        staff: [
          "Frames precomputed-vs-live as the load-bearing decision and states what would reverse it (personalization).",
          "Splits freshness into slow base + fast trending overlay instead of speeding up the whole pipeline.",
          "Treats blocklist takedown latency as a product/legal SLO with its own faster propagation path.",
          "Names the build pipeline, not serving, as the operational risk and proposes a snapshot-age SLO.",
          "Reasons about edge caching interaction with takedowns and quantifies the staleness ceiling."
        ]
      }
    },
    {
      slug: "video-streaming",
      name: "Design a Video Streaming Platform",
      category: "System Design",
      difficulty: "Hard",
      minutes: 45,
      summary: "Upload, transcode to ABR ladders, serve via CDN; 500k uploads/day, 100M watch hours.",
      statement: "<p>Design the backbone of a video platform where creators upload videos of up to 4 hours and viewers stream them on everything from a 4G phone to a 4K TV. The system covers three lifecycles: ingesting large uploads reliably, transcoding each source file into a ladder of quality renditions, and serving playback at global scale through CDNs.</p><p>Assume 500,000 uploads per day with a median source of 700 MB, and 100 million watch-hours daily. A newly uploaded video should be playable in at least one quality within a couple of minutes, with higher renditions arriving as they finish. Playback must adapt to the viewer's bandwidth mid-stream without rebuffering.</p><p>Focus on the pipeline architecture and the serving economics. Recommendation, comments, and live streaming are explicitly out of scope; copyright scanning can be treated as one async step in your pipeline rather than designed in depth.</p>",
      clarifying: [
        "Is low-latency live streaming in scope, or only video-on-demand? (VOD only.)",
        "What is the target time-to-first-playable after upload completes — seconds or minutes? (Under 2 minutes for a baseline rendition.)",
        "Do we control the player, so we can choose HLS vs DASH and the ABR logic? (Yes, first-party players plus standard protocol support.)",
        "What percentage of videos ever get meaningful views — how skewed is watch traffic? (Extremely: assume 5% of videos take 95% of watch time.)",
        "Are uploads resumable a hard requirement given multi-GB files on flaky connections?",
        "What durability is required for the original source file after renditions exist?",
        "Any DRM requirement, or is content-protection just signed URLs? (Signed URLs; DRM is a follow-up.)"
      ],
      functional: [
        "Resumable, chunked upload of source files up to 40 GB with integrity verification per chunk.",
        "Transcode every source into an ABR ladder (e.g., 240p through 4K where the source allows) in a segmented streaming format.",
        "Publish a video as playable the moment its first rendition and manifest exist; add renditions to the manifest as they complete.",
        "Serve playback globally via CDN with signed, expiring URLs; support seeking and mid-stream quality switching.",
        "Expose processing status to the creator (uploaded, processing, playable, fully processed, failed with reason)."
      ],
      nonfunctional: [
        "Time-to-first-playable p90 under 2 minutes after upload completion for a 10-minute source.",
        "Playback start (manifest + first segment) p95 under 1.5 s from CDN edge; rebuffer ratio under 0.5% of watch time.",
        "11-nines-style durability posture for source files (multi-region object storage); renditions are re-derivable and can be single-region.",
        "Sustain 500k uploads/day (~350 GB/min aggregate ingest at peak) and 100M watch-hours/day (~2.3 Tbps average egress).",
        "Transcoding backlog must drain: worker fleet sized so queue latency p99 stays under 10 minutes even at 2x daily peak."
      ],
      estimation: {
        prompts: [
          "Convert 100M daily watch-hours into average and peak egress bandwidth at a 3 Mbps mean delivered bitrate.",
          "Estimate daily ingest volume and the storage growth rate per year, source plus renditions.",
          "Size the transcoding fleet: CPU-hours per source hour across the full ladder, times daily upload hours.",
          "What fraction of egress must the CDN absorb for origin costs to be sane, given the 5%/95% skew?",
          "Estimate manifest/metadata QPS relative to segment QPS during playback."
        ],
        worked: "<p>Egress dominates everything, so start there. 100M watch-hours/day at an average delivered 3 Mbps:</p><pre>100M h x 3600 s = 3.6e11 watch-seconds/day\n3.6e11 s x 3 Mbps = 1.08e18 bits/day = ~135 PB/day\n135 PB / 86,400 s = ~12.5 Tbps ... check: 1.08e18 / 86400 = 1.25e13 bps = 12.5 Tbps? \nRecompute: 3.6e11 s-streams x 3e6 bps = 1.08e18 bit-s/day -> /8.64e4 s = 1.25e13 bps\nAverage egress ~ 12.5 Tbps is too high vs stated 2.3 -- resolve: mean concurrent viewers\n  = 100M h / 24 h = 4.17M concurrent x 3 Mbps = 12.5 Tbps average, ~20 Tbps peak.</pre><p>So the honest number is ~12.5 Tbps average, ~20 Tbps at peak — this single number is why 98%+ CDN offload is not an optimization but a requirement; a 2% origin miss rate is still 250-400 Gbps of origin egress. Ingest is comparatively tiny: 500k x 700 MB = 350 TB/day of source, roughly 4 GB/s sustained. Renditions add ~1.5x source size, so storage grows ~875 TB/day, ~320 PB/year before cold-tiering. Transcoding: a full ladder costs ~8 CPU-hours per source-hour with software encoders; 500k uploads at a 12-minute median is 100k source-hours/day, so 800k CPU-hours/day — a steady-state fleet of ~33k cores, doubled for peak headroom.</p>"
      },
      model: {
        highlevel: "<p>Three loosely-coupled planes joined by object storage and a queue. The upload plane terminates resumable chunked uploads and lands sources in object storage. The processing plane is a queue of per-video jobs fanned out into per-segment transcode tasks executed by a stateless worker fleet. The serving plane is CDN-first: origin is a thin signed-URL-aware shield over the renditions bucket, and almost no viewer traffic should ever reach it.</p><pre>creator -> upload-svc -> S3 sources -> orchestrator -> task queue -> transcode\n                              |             |                          workers\n                              v             v                            |\n                        copyright scan   manifest-svc <-- rendition segments\n                                                            v\nviewer -> CDN edge (segments, manifests) -> shield -> S3 renditions</pre><p>The key structural choice is segment-parallel transcoding: split the source by keyframe-aligned chunks (~6 s), transcode chunks independently across hundreds of workers, then stitch. That is what turns a 4-hour source from a 30-hour serial encode into minutes of wall-clock, and it is also what makes 'playable in 2 minutes' achievable — the first rendition's early segments finish first, the manifest service publishes a growing manifest, and playback can begin before the tail of the video is encoded.</p>",
        data: "<p>Metadata is small and relational; media is immutable blobs. Keep them apart. The manifest is the contract between processing and playback: it is regenerated, never edited in place, and versioned so CDN caching stays coherent.</p><pre>POST   /v1/videos                     -> {video_id, upload_url, chunk_size}\nPUT    upload_url?part=N  (resumable; per-part SHA-256)\nPOST   /v1/videos/{id}/complete       -> enqueues processing\nGET    /v1/videos/{id}/status         -> {state, renditions:[...], failure?}\nGET    cdn.example.com/v/{id}/master.m3u8?sig=...&exp=...\n\nvideos(video_id, owner_id, state: uploading|processing|playable|ready|failed,\n       duration_s, source_key, created_at)\nrenditions(video_id, height, bitrate_kbps, codec, state, segment_count)\njobs(job_id, video_id, kind: probe|segment_encode|stitch|manifest, state,\n     attempt, worker_id, heartbeat_at)\n\nObject layout:\n  sources/{video_id}/original\n  renditions/{video_id}/{height}/{seg_00001}.m4s\n  manifests/{video_id}/v{n}/master.m3u8</pre><p>Job rows carry heartbeats so the orchestrator can reap and reassign tasks from dead workers; segment tasks are idempotent (same input chunk, same output key), which makes retry logic boring — the property you want.</p>",
        deepdives: "<p><b>Segment-parallel encode correctness.</b> Naive splitting breaks at chunk boundaries: encoders need closed GOPs, or you get glitches at every stitch point. The probe step first analyzes the source, picks split points on existing keyframes (or forces a fast remux pass to insert them), and records exact PTS ranges per chunk. Every segment task gets (source_key, byte_range, pts_range, ladder_rung) and produces a self-contained fMP4 segment. Audio is encoded once as its own track to avoid boundary artifacts, then muxed. The stitch step is metadata-only — it writes the manifest, it does not rewrite media.</p><p><b>Time-to-first-playable.</b> Priority-schedule the ladder: the 360p rendition's first ~20 segments are high-priority tasks; everything else is bulk. With ~200 ms encode per 6 s segment-rung on one core and 20 tasks in parallel, the baseline rendition of the opening minutes exists within seconds of upload; the 2-minute p90 budget is mostly queue wait, which is why queue latency is a stated SLO with its own autoscaling signal (queue age, not queue depth — depth lies when tasks vary 100x in cost).</p><p><b>Origin protection at 20 Tbps.</b> The CDN absorbs the hot 5%, but the long tail defeats edge caches. Layer the misses: edge -> regional CDN shield -> our own origin shield -> object storage, with request coalescing at each layer so a thundering herd on a suddenly-viral video collapses into one origin fetch per segment. Signed URLs are validated at the edge via key-pair signatures, not by calling us — an auth callback at this scale would be a self-inflicted DDoS.</p>",
        tradeoffs: "<p><b>Per-title vs. fixed ladder:</b> a fixed ladder wastes bits on simple content (slideshows encoded like sports). Per-title encoding (probe complexity, pick bitrates per video) saves 20-40% egress — at 12.5 Tbps that is enormous money — but adds a probe-encode pass and pipeline complexity. Resolve it by tiering: fixed ladder at upload for speed, per-title re-encode as a background job only for videos that cross a views threshold, since 95% of egress comes from 5% of videos. You get most of the savings for a twentieth of the compute.</p><p><b>Storage cost vs. re-encode cost:</b> keep every rendition of every video forever, or drop cold renditions and re-encode on demand? Sources are sacred (multi-region, never deleted); renditions of videos unwatched for 18 months can be reduced to the 360p rung plus source, re-deriving others on first request with a one-time quality delay. This trades a rare bad first-play experience on dead content for petabytes of storage.</p><p><b>Bottleneck:</b> the orchestrator's job table is the write hotspot — 500k videos x ~2,000 segment tasks/day is ~10k task-state writes/sec. Keep it a sharded, boring KV with per-video partitioning rather than a relational bottleneck.</p>",
        scaling: "<p><b>1x:</b> single region for processing and origin, multi-CDN for delivery from day one (egress economics, plus CDN failure is your top availability risk). ~33k-core encode fleet on spot/preemptible instances — segment tasks are idempotent and short, the ideal preemptible workload.</p><p><b>10x:</b> ingest becomes multi-region (creators upload to the nearest region; sources replicate async). The job orchestrator shards by video_id. Encode capacity stops being elastic-enough on demand, so introduce a two-tier queue: latency-sensitive first-rendition tasks on reserved capacity, bulk ladder work on spot. Per-title encoding graduates from experiment to default for the popular tier.</p><p><b>100x:</b> you are now a meaningful fraction of internet traffic; the game changes from renting CDNs to building edge presence — cache appliances inside ISPs serving the hot catalog, with your CDN as the fill path. Hardware encoders (ASIC) take over the bulk ladder at ~10x the perf/watt of software, with software encoders reserved for the premium quality tier. The catalog outgrows any single metadata store; videos shard by id with a directory service, and the manifest service becomes the only component that still needs a global view.</p>"
      },
      followups: [
        "Add live streaming: which parts of the VOD pipeline survive, and where does the architecture fork?",
        "Viewers in one country report constant rebuffering; walk your debugging path from player metrics to root cause.",
        "Add DRM (Widevine/FairPlay): where do license servers sit, and what does that do to CDN cacheability?",
        "A copyright strike requires takedown across CDNs within 5 minutes — design the purge path and its verification.",
        "Support instant clipping (creator marks 30 s of an existing video as a new shareable video) without re-encoding.",
        "How would you cut egress cost 30% with zero perceived quality loss? Rank your levers."
      ],
      rubric: {
        senior: [
          "Designs resumable chunked upload with per-chunk integrity rather than a single giant PUT.",
          "Knows why segmented ABR formats (HLS/DASH) exist and designs the manifest as the processing/playback contract.",
          "Parallelizes transcoding at segment granularity and handles keyframe alignment at split points.",
          "Does the egress math and concludes CDN offload is structural, not optional.",
          "Makes transcode tasks idempotent and reaps dead workers via heartbeats.",
          "Separates immutable media blobs from mutable metadata with distinct stores and lifecycles."
        ],
        staff: [
          "Prioritizes time-to-first-playable via scheduling (first rendition, first segments) instead of raw fleet size.",
          "Exploits the 5/95 watch-skew everywhere: per-title encoding tiers, rendition cold-tiering, CDN strategy.",
          "Autoscales encode on queue age, not depth, and can say why depth is the wrong signal.",
          "Treats CDN failure and origin protection (coalescing, shields, edge-validated signatures) as first-class design.",
          "Reasons about cost as a design input — egress, spot encode fleets, storage tiering — with numbers."
        ]
      }
    },
    {
      slug: "file-sync",
      name: "Design Cloud File Storage & Sync",
      category: "System Design",
      difficulty: "Hard",
      minutes: 45,
      summary: "Chunked dedup storage, delta sync across devices, offline edits and conflict handling.",
      statement: "<p>Design a Drive/Dropbox-class product: users install a client on several devices, drop files into a synced folder, and every device converges to the same state — including devices that were offline for a week. Files range from 10 KB documents edited hundreds of times to 20 GB disk images written once.</p><p>The interesting tension is that this is really two systems wearing one trench coat: a metadata system that must be strongly consistent (two devices must agree on what version 12 of a file is) and a blob system that must be cheap and scalable (petabytes of chunks where consistency barely matters because chunks are immutable and content-addressed).</p><p>Design both, plus the sync protocol between client and server: how a device learns what changed, how it uploads only what is new, and what happens when two offline devices edit the same file. Sharing and permissions can be sketched; real-time collaborative editing (OT/CRDT) is explicitly out of scope.</p>",
      clarifying: [
        "Is real-time co-editing in scope, or is last-writer-plus-conflict-copy acceptable? (Conflict copies; no OT/CRDT.)",
        "How many devices per user, and can several be actively writing at once? (Assume up to 5, concurrent writes possible.)",
        "What is the maximum file size we must sync, and are partial-file updates common? (20 GB; yes — logs, archives, VM images.)",
        "Do we need version history / restore, and for how long? (30 days of versions.)",
        "Is client-side encryption required, which would break cross-user dedup? (No — server-side encryption at rest.)",
        "How quickly must an edit on device A appear on device B when both are online — seconds or minutes?",
        "Is bandwidth a constrained resource for users (metered connections), making delta sync a hard requirement?"
      ],
      functional: [
        "Sync a folder tree across up to 5 devices per user, propagating creates, edits, renames, moves, and deletes.",
        "Upload/download only changed chunks of a file, not the whole file, for files above a small threshold.",
        "Detect concurrent conflicting edits and preserve both versions (canonical winner plus a visible conflict copy) — never silently drop data.",
        "Keep 30 days of version history per file with restore.",
        "Support share links and folder sharing between users at the metadata level.",
        "Full offline operation: queue local changes and reconcile correctly after any period offline."
      ],
      nonfunctional: [
        "Online edit-to-visible on a peer device: p95 under 10 seconds for small files.",
        "Metadata operations strongly consistent per namespace; a device never observes version N+1 before N.",
        "Chunk store durability 99.999999999%-class via erasure-coded object storage; metadata via replicated consensus DB.",
        "Support 50M users, 100M active devices, ~1 PB/day of logical upload reduced by dedup/delta to a fraction of that on the wire and on disk.",
        "Client CPU/battery budget: hashing and chunking must run incrementally without pegging a laptop for minutes after a small edit."
      ],
      estimation: {
        prompts: [
          "With 4 MB average chunks and 30% cross-file dedup, estimate daily physical chunk-store growth from 1 PB logical upload.",
          "Estimate metadata write QPS from 50M users averaging 40 file events/day, with a 5x peak factor.",
          "Size the notification fan-out: one edit must reach up to 4 other devices — what does 100M devices' long-poll/WebSocket load look like?",
          "Estimate per-user metadata size (files x versions x rows) and total metadata footprint.",
          "How much wire traffic does delta sync save on a 200 MB file where 2 MB changed?"
        ],
        worked: "<p>Metadata QPS first, because that is the strongly-consistent (expensive) part. 50M users x 40 events/day = 2B events/day ≈ 23k writes/sec average, ~115k/sec at peak. Each event is a small transaction (new version row + journal append), very shardable by user/namespace — comfortably a sharded consensus DB, hopeless as a single instance.</p><pre>2e9 events / 86,400 s        = ~23k wps avg -> ~115k wps peak\nChunk store: 1 PB logical/day\n  x 0.7 after dedup          = 700 TB\n  x ~0.5 delta (only changed chunks of edited files) = ~350 TB/day physical\n  x 1.4 erasure-coding overhead = ~490 TB/day raw disk\nDelta example: 200 MB file, 2 MB changed, 4 MB chunks:\n  fixed chunking -> 1-2 chunks re-uploaded (~4-8 MB) vs 200 MB full = ~96% saved</pre><p>Metadata footprint: assume 10k files/user average and ~6 versions retained: 3e12 version rows globally at ~300 B = ~900 TB of metadata — which is why version rows must live in the sharded store with the journal, not in some 'small relational DB' the design hand-waves. Notification load: 100M devices holding a connection each is ~100M mostly-idle sockets; at 1M connections per gateway node that is a 100-node stateless tier — the fan-out messages themselves (2B events x 4 peers = 8B tiny pushes/day ≈ 90k msg/s average) are trivial compared to holding the sockets.</p>"
      },
      model: {
        highlevel: "<p>Split the system along the consistency boundary. The <b>metadata plane</b> (namespaces, file entries, versions, a per-namespace change journal) lives in a sharded, strongly-consistent database and is the source of truth. The <b>block plane</b> is a content-addressed store of immutable, encrypted, compressed chunks keyed by hash of plaintext content. A file version is just metadata: an ordered list of chunk hashes. Upload order is blocks-then-metadata: a version is committed only after every chunk it references is durable, so metadata can never point at missing data.</p><pre>client A --chunks--> block store (content-addressed, immutable)\n   |                     ^\n   +--commit(version, [hashes])--> metadata plane --journal--> notifier\n                                        |                        |\nclient B <----- long-lived connection: \"namespace 17 at cursor 8842\" ----+\nclient B --pull journal since 8842--> metadata plane --fetch missing chunks--> block store</pre><p>Sync is journal-based, not state-comparison-based: every namespace has an append-only change journal with a monotonic cursor. A device stores its cursor, pulls the journal tail on reconnect, and applies changes. Notifications are only a hint ('your cursor is stale') — correctness never depends on a push arriving, which is what makes offline a first-class mode rather than an error path.</p>",
        data: "<p></p><pre>namespaces(ns_id, owner, type: private|shared)\nfiles(ns_id, file_id, parent_dir_id, name, current_version)\nversions(ns_id, file_id, version, chunk_hashes[], size, mtime,\n         author_device, parent_version)   -- parent_version powers conflict detection\njournal(ns_id, cursor BIGSERIAL, op: add|edit|move|delete, file_id, version)\nchunks: hash -> {refcount-ish liveness, storage_key}   (content-addressed)\n\nAPI:\n  POST /v1/blocks           body: chunk  -> {hash}        (no-op if exists)\n  HEAD /v1/blocks/{hash}                -> 200/404        (skip-upload probe)\n  POST /v1/commit  {ns, file_id, base_version, chunk_hashes[]}\n        -> 200 {version} | 409 {latest_version}           (compare-and-swap)\n  GET  /v1/journal?ns=17&cursor=8842    -> [changes...], next_cursor\n  WS   /v1/notify   -> {ns, cursor} hints</pre><p>The load-bearing line is <code>commit</code> as a compare-and-swap on <code>base_version</code>: the server accepts a version only if the client built it on the current head. That single primitive is the entire concurrency-control story — no locks, no server-side merge.</p>",
        deepdives: "<p><b>Chunking strategy.</b> Fixed 4 MB chunks are simple but suffer boundary-shift: insert one byte at the front of a file and every subsequent chunk hash changes, destroying delta sync exactly where it matters (documents, logs). Content-defined chunking (a rolling hash chooses boundaries from content, ~1-4 MB average) keeps chunks after an insertion identical. Cost: more CPU on the client and variable chunk sizes complicating the store. Resolution: CDC for files under ~1 GB where edits dominate; fixed chunks for huge mostly-append or write-once files, chosen per file by the client and invisible to the server since chunks are just hashes either way.</p><p><b>Conflicts.</b> Device A and B both edit v12 offline. A reconnects first, commits with base_version 12, becomes v13. B commits base 12, gets 409. B then: keeps its local content as a new file 'report (conflict, Bob's laptop, 2026-08-21).docx' committed normally, and syncs down v13. Both edits survive; the human resolves. The critical properties are that conflict resolution happens client-side (the server never merges bytes), it is deterministic (both devices would name the copy identically), and deletes are just journal ops that lose to edits (an edit to a deleted file resurrects it as a conflict copy — data loss is the only unforgivable outcome).</p><p><b>Garbage collection without refcounts.</b> Cross-user dedup means chunk refcounting is a global contended counter — a classic trap. Instead run mark-and-sweep: chunks are immutable, version rows enumerate their hashes, so a periodic job walks live versions (including the 30-day history window) building a Bloom-filter liveness set, then deletes chunks unseen for 2 consecutive sweeps and older than 7 days. The double-sweep-plus-age guard makes races with in-flight commits (blocks uploaded, commit not yet written) safely impossible.</p>",
        tradeoffs: "<p><b>Journal-pull vs. push-state:</b> we chose pull-with-hints. Pure push is lower-latency but turns every disconnect into a distributed-state-repair problem; pull from a durable journal means a device offline for a month reconciles by the exact same code path as one offline for a second. We pay: journals must be retained (compact them by folding superseded entries once all a user's devices' cursors pass them).</p><p><b>Cross-user dedup vs. privacy/encryption:</b> content-addressed dedup requires the server to see convergent content identity. Client-side end-to-end encryption would break it (identical files encrypt differently per user) and roughly 1.4x our storage. We chose server-side encryption and keep E2E as a paid 'vault' feature with no dedup — an explicit product trade, not a technical oversight.</p><p><b>Bottleneck:</b> hot shared namespaces — a 10,000-member company folder serializes all commits through one journal. Mitigate by sharding journals per top-level directory within huge namespaces, accepting weaker cross-directory ordering inside that org, which no user can observe anyway.</p>",
        scaling: "<p><b>1x (1M users):</b> a handful of metadata shards, one object-storage region, one notification tier. CDC chunking and the CAS commit protocol are in from day one — retrofitting a sync protocol is a rewrite, so the protocol is where early rigor pays.</p><p><b>10x (10M users):</b> metadata shards by user; shared namespaces get placed independently of their members. The GC sweep goes from a nightly job to a continuously-running partitioned pipeline. Block store adds a second region with async replication; metadata stays home-regioned per user for consistency, with users pinned to a region.</p><p><b>100x (100M+ users):</b> multi-region becomes user-visible: EU users demand EU-resident data, so region is now a sharding dimension with real product meaning, and shared folders spanning regions force a decision — we pick single-home-per-namespace (the folder lives where its owner lives; remote members eat cross-region latency on commit, reads are served from replicated caches). Cold chunks (unreferenced by any version touched in 90 days) tier to archival storage with a restore-latency SLA. The journal-compaction system is now load-bearing for storage costs and gets its own team.</p>"
      },
      followups: [
        "Add real-time collaborative editing for documents — what changes, and why doesn't the CAS-commit model survive?",
        "Add end-to-end encryption as an opt-in vault: enumerate everything it breaks (dedup, delta, server-side preview) and your mitigations.",
        "A bug shipped that corrupted chunk hashes for 0.1% of commits over 6 hours. Design the detection and repair.",
        "LAN sync: two devices on the same network should exchange chunks directly. Protocol and security implications?",
        "Selective sync (device holds placeholders, hydrates on open): what does 'open a 4 GB placeholder on a plane' do to your design?",
        "How do you migrate a 10,000-member shared namespace to a different metadata shard without a write freeze?"
      ],
      rubric: {
        senior: [
          "Separates strongly-consistent metadata from content-addressed immutable blocks, with blocks-before-metadata commit ordering.",
          "Designs delta sync via chunking and can explain why content-defined chunking beats fixed for edited files.",
          "Uses compare-and-swap on base_version as the concurrency primitive rather than locks or server merges.",
          "Handles offline as a normal path via a durable journal and device cursors, not as an exception.",
          "Produces conflict copies deterministically client-side and never silently loses an edit, including edit-vs-delete.",
          "Does the metadata-scale math and shards accordingly instead of assuming 'metadata is small'."
        ],
        staff: [
          "Identifies chunk GC under cross-user dedup as the hard distributed problem and rejects global refcounting for mark-and-sweep with race guards.",
          "Articulates the dedup-vs-E2E-encryption conflict as a product decision with quantified storage impact.",
          "Designs journal compaction and retention as a first-class cost/correctness system.",
          "Anticipates hot shared-namespace serialization and trades ordering scope for throughput deliberately.",
          "Keeps the sync protocol minimal (blocks, CAS commit, journal, hints) and can defend why every primitive is necessary."
        ]
      }
    },
    {
      slug: "nearby-places",
      name: "Design a Nearby Places Service",
      category: "System Design",
      difficulty: "Easy",
      minutes: 30,
      summary: "Geo-indexed search over 150M places: cell-based indexing, expanding-ring queries, caching.",
      statement: "<p>Design the service behind a 'restaurants near me' feature: given a latitude/longitude and a radius, return matching places ranked by distance (optionally filtered by category, rating, or open-now). The catalog holds 150 million places worldwide, updated by merchants and data pipelines at a modest rate — a few hundred writes per second — while reads run five orders of magnitude hotter.</p><p>The core problem is that latitude/longitude pairs do not fit ordinary B-tree thinking: 'give me rows within 3 km of this point' is not a range scan over either coordinate alone. You need a spatial indexing scheme that turns two-dimensional proximity into something a database or cache can answer fast.</p><p>Design the index, the query path, and the caching strategy. Business data (photos, reviews) hangs off the place record and is out of scope beyond ID references; real-time entities like drivers are a follow-up, not the base problem.</p>",
      clarifying: [
        "Are the entities static places (restaurants, ATMs), or moving objects like drivers? (Static; movers are a follow-up.)",
        "Typical and maximum search radius? (Default 2-5 km, cap at 50 km.)",
        "How stale may results be after a merchant edit — seconds, minutes, an hour? (A few minutes is fine.)",
        "What ranking beyond distance — rating, popularity, sponsored placement? (Distance primary, rating tiebreak; ads out of scope.)",
        "Expected read volume and geographic skew — how concentrated is traffic in dense cities?",
        "Do we need 'open now' filtering, which mixes slowly-changing hours data into the query path?",
        "Result page size and whether pagination must be stable across requests?"
      ],
      functional: [
        "Given (lat, lng, radius, filters), return up to 50 places sorted by distance, correctly including places just inside the radius across cell boundaries.",
        "Support category and open-now filters applied before ranking.",
        "Merchant updates (new place, moved, closed, hours change) visible in search within 5 minutes.",
        "Return precise distance per result computed from true coordinates, not cell centroids.",
        "Batch lookup of full place details by ID for the result page."
      ],
      nonfunctional: [
        "p99 read latency under 80 ms end-to-end at 200k reads/sec peak.",
        "Read availability 99.99%; index rebuild or update must never block reads.",
        "Handle extreme geographic skew: 1% of cells (Manhattan, Tokyo) receive a majority of queries.",
        "Writes are ~300/sec and may be eventually consistent with a 5-minute visibility SLO.",
        "Index memory footprint small enough to replicate whole: target under 40 GB so every node holds the full index."
      ],
      estimation: {
        prompts: [
          "Estimate the in-memory index size for 150M places at ~64 B per entry plus cell overhead.",
          "At geohash-6 (~1.2 km x 0.6 km cells), how many places sit in the densest cells, and what does a 5 km query touch?",
          "Convert 200k QPS with 80%+ cacheable hot cells into origin index QPS.",
          "How many cells does an expanding-ring search touch for a 2 km vs 50 km radius, and what bounds worst-case work?",
          "Estimate write amplification of an update: how many structures does one merchant edit touch?"
        ],
        worked: "<p>Index size decides the whole architecture, so compute it first. Per place in the index we need: place_id (8 B), lat/lng as fixed-point (8 B), category bits (2 B), rating (1 B), flags (1 B) — about 20 B of payload, ~40 B with cell-bucket structure overhead. 150M x 40 B = 6 GB. Even tripled for secondary structures (category-partitioned lists in hot cells, ID maps) we are under 20 GB.</p><pre>150M places x ~40 B = 6 GB core index\n  x 3 safety (aux structures, headroom) = ~18 GB  << 40 GB budget\n=> full replica per node; NO spatial sharding needed\n\nQuery cost, geohash-6 cells (~1.2 x 0.6 km):\n  2 km radius  -> ~3x5 = 15 cells; dense city ~2k places/cell -> 30k candidates\n  50 km radius -> naive ~70x160 cells: use coarser level (geohash-4) -> ~dozens</pre><p>That '30k candidates for a downtown query' number motivates per-cell pre-sorting and early termination; scanning 30k entries with a distance check is ~1 ms of CPU, fine — but only if the data is in local memory, which the 18 GB result makes possible. This is the key insight of the sizing: the problem that looks like a sharding problem is actually a replication problem. 200k QPS across, say, 40 replicas is 5k QPS/node against local RAM — comfortable.</p>"
      },
      model: {
        highlevel: "<p>Because the whole index fits in ~18 GB, run it as a fully-replicated in-memory index on every query node — no spatial sharding, no cross-node fan-out, no hot-shard problem, since every node can serve any city. The source of truth is a plain database of places; a builder pipeline turns it into immutable index snapshots plus a stream of incremental updates.</p><pre>merchant/API writes -> places DB -> CDC stream -> index-builder\n                                                    |  snapshots (hourly)\n                                                    |  + deltas (streamed)\n                                                    v\nclient -> LB -> query node [RAM: cell buckets + place records] x N replicas</pre><p>Query path: map the search circle to a set of covering cells at a zoom level chosen from the radius (finer cells for small radii, coarser for large), pull each cell's candidate list from local memory, compute true haversine distance per candidate, filter, and heap-select the top 50. Nodes apply streamed deltas continuously and swap to a fresh snapshot hourly, which bounds delta-log growth and gives a clean recovery story (boot from snapshot, replay deltas).</p>",
        data: "<p></p><pre>GET /v1/nearby?lat=37.3519&lng=-121.9769&radius_m=3000\n              &category=restaurant&open_now=1&limit=20\n-> {\"results\":[{\"place_id\":\"p_91\",\"distance_m\":142,\"name\":\"...\",\"rating\":4.5}]}\nGET /v1/places?ids=p_91,p_87        (batch details, separate store)\n\nSource of truth:\n  places(place_id, name, lat, lng, categories[], rating, hours, status, updated_at)\n\nIn-memory index (per node, rebuilt from snapshot+deltas):\n  cells:  cell_id (geohash-6) -> array of {place_id, lat_fx, lng_fx,\n                                           cat_bits, rating, open_bitmap_ref}\n  coarse: cell_id (geohash-4) -> array of top-500-by-rating (for wide radii)\n  byid:   place_id -> index entry (for delta application)</pre><p>'Open now' is precomputed: hours compile into a weekly bitmap of 15-minute slots (672 bits) so the query path does a single bit test instead of parsing hours logic per candidate per request — a classic move-work-to-write-time call, cheap here because writes are 300/sec.</p>",
        deepdives: "<p><b>Boundary correctness.</b> A user standing on a cell edge must see the restaurant 50 m away in the neighboring cell. The circle-to-cells covering must include every cell intersecting the circle, not just the center cell and its 8 neighbors at a fixed level — the neighbor heuristic fails when the radius exceeds cell size. Compute the covering properly from the radius (or use a library-grade cell covering like S2's region coverer concept: hierarchical cells give near-optimal coverings for any radius). Then rank by true point distance so cell geometry never leaks into results.</p><p><b>Radius vs. cell-level mismatch.</b> A 50 km radius at geohash-6 touches thousands of cells. Choose cell level by radius: level such that the circle covers roughly 10-50 cells. But coarse cells in dense areas hold hundreds of thousands of places, so coarse levels store a capped, pre-ranked candidate list (top-500 by rating per coarse cell) — a wide-radius query is a discovery query ('best restaurants within 50 km'), not an exhaustive one, so capping is a product-correct optimization, and stating that assumption out loud is the senior move.</p><p><b>Update path without pauses.</b> Deltas mutate per-cell arrays while queries read them. Avoid locks with per-cell copy-on-write: an update clones the (small) cell array, applies the change, and CAS-swaps the pointer; readers hold a reference to whichever array they started with. Places that move cells are an insert into the new cell plus a tombstone-then-remove in the old, ordered so the place is briefly in both cells rather than briefly in neither — duplicate-then-dedupe beats disappear.</p>",
        tradeoffs: "<p><b>Geohash vs. hierarchical cells (S2/H3-style) vs. PostGIS:</b> a database with a spatial index (R-tree/GiST) is the simplest correct system and the right v1 at low traffic — but at 200k QPS the DB becomes a replicated read fleet anyway, at which point the in-memory cell index is less machinery, not more. Geohash rectangles distort badly near poles and have edge-neighbor quirks; hierarchical spherical cells cover circles more accurately. At our scale either works; choose by library quality, and encapsulate the cell scheme so it can change without touching the protocol.</p><p><b>Full replication vs. sharding:</b> replication wins here only because the index is small and read-mostly. The honest boundary: if entries grew 30x (every road segment, every POI attribute in-index) or writes grew 100x, per-node replication of the write stream becomes the bottleneck and you shard by region — accepting the hot-city-shard problem you were previously immune to. State the boundary; don't pretend the design is universal.</p><p><b>Bottleneck today:</b> dense-cell candidate scans (30k candidates x haversine). Mitigate with pre-sorted-by-rating cell arrays and early termination once the heap is full of results closer than any remaining candidate could be.</p>",
        scaling: "<p><b>1x (20k QPS):</b> honestly, PostGIS with read replicas clears this bar with 10x less code. Build the in-memory tier only when the read fleet math or latency SLO forces it — say 50k+ QPS or a sub-50 ms p99.</p><p><b>10x (200k QPS):</b> the described design: fully-replicated RAM index, ~40 nodes across 3 regions (geo-DNS routes users to the nearest region; the index is global so any region serves any query correctly — regional deployment is for latency, not partitioning). CDN-cache popular query results (rounded coordinates + common filters, 60 s TTL) to shave another 30-50% of load in hot cities.</p><p><b>100x (20M QPS or a 30x bigger catalog):</b> full replication breaks — either the write stream saturates every node or the index outgrows RAM. Shard by continental region with an index-aware router, keep per-shard full replication within the shard, and pin the hot-cell problem with per-city cache tiers. At this scale you are also serving movers (delivery, rideshare), and the static-place design forks: high-churn entities get their own short-TTL in-memory layer with no snapshots, merged with static results at query time.</p>"
      },
      followups: [
        "Extend to moving entities (10M drivers updating every 4 s) — which parts of the static design survive?",
        "Add sponsored results with distance floors and pacing budgets — where does ad logic enter the query path?",
        "A data pipeline bug marked 2M places closed overnight. How does your system detect, alert, and roll back?",
        "Support polygon search ('within this drawn neighborhood') instead of radius — what changes in the covering step?",
        "How would you serve 'nearby' offline on-device for a maps app, and what subset of the index ships to phones?",
        "Add multi-tenant rate limiting so one scraping client cannot degrade the p99 for everyone."
      ],
      rubric: {
        senior: [
          "Explains why lat/lng B-trees fail and introduces a cell/space-filling scheme with a chosen resolution and real cell sizes.",
          "Gets boundary correctness right: circle-to-cell covering plus true-distance ranking, not center-cell-plus-neighbors.",
          "Sizes the index, notices it fits in RAM, and concludes replication beats sharding — with the math shown.",
          "Chooses cell level by radius and bounds worst-case candidate counts in dense cells.",
          "Designs a non-blocking update path (snapshot + streamed deltas, copy-on-write cells).",
          "Precomputes 'open now' into a cheap query-time test instead of evaluating hours per candidate."
        ],
        staff: [
          "States the replication-vs-sharding boundary condition explicitly (what growth flips the decision).",
          "Recommends the boring PostGIS v1 at low scale and can name the QPS/SLO threshold that justifies the custom tier.",
          "Treats wide-radius queries as a distinct product shape (discovery) and caps them deliberately, stating the assumption.",
          "Handles cell-migration updates with duplicate-then-dedupe ordering, showing instinct for user-visible failure modes.",
          "Anticipates the movers extension and keeps the static design cleanly separable from a high-churn layer."
        ]
      }
    },
    {
      slug: "ride-hailing",
      name: "Design a Ride-Hailing Platform",
      category: "System Design",
      difficulty: "Hard",
      minutes: 45,
      summary: "1M drivers pinging every 4 s, sub-30 s matching, surge pricing per zone.",
      statement: "<p>Design the dispatch core of a ride-hailing service: riders request trips, drivers stream their locations, and the system matches each request to a nearby driver within seconds, then tracks the trip through pickup, ride, and completion. Layer surge pricing on top: when demand outstrips supply in an area, prices rise to rebalance both sides.</p><p>The defining workload is the location firehose. A million concurrent drivers reporting position every 4 seconds is 250,000 writes per second of data that is worthless 30 seconds later — which should make you suspicious of any design that routes it through a durable database. Matching, meanwhile, is a consistency problem in disguise: two riders must not be matched to the same driver, and a driver who accepts a trip must be atomically removed from the available pool.</p><p>Design the location ingestion layer, the matching engine, the trip state machine, and the surge computation. Payments, ratings, and routing/ETA algorithms are out of scope beyond treating ETA as a callable service.</p>",
      clarifying: [
        "Scale assumptions: how many concurrent drivers and requests/sec at peak in the largest city? (1M global, ~100k in the largest metro; 500 requests/sec globally at peak.)",
        "Matching objective: nearest driver, best ETA, or batch-optimized assignment across simultaneous requests?",
        "Does the driver accept/decline, and what is the offer timeout? (Yes; 15 s per offer, then next candidate.)",
        "How is surge scoped — per city, per zone, per cell — and how often may it change? (Per zone, recompute every 60 s.)",
        "What happens to in-flight trips if the matching service dies — must trip state survive any single failure? (Yes, trips are durable.)",
        "Is driver location shown live to the rider during pickup, and at what update rate?",
        "Regulatory/data-retention: must raw location trails be stored, and for how long?"
      ],
      functional: [
        "Ingest driver location updates every 4 s and maintain a queryable view of available drivers by area.",
        "Match a ride request to a candidate driver within 30 s end-to-end, including up to two 15 s offer rounds.",
        "Guarantee a driver is offered/assigned to at most one trip at a time, atomically.",
        "Drive the trip state machine: requested, matched, en-route, arrived, in-trip, completed/cancelled, with both parties seeing consistent state.",
        "Compute a per-zone surge multiplier from supply/demand every 60 s and apply it at quote time, honoring the quoted price for that request.",
        "Stream driver position to the matched rider at 1-2 s cadence during pickup and trip."
      ],
      nonfunctional: [
        "Sustain 250k location writes/sec with p99 ingestion-to-queryable under 2 s.",
        "Matching decision latency p95 under 3 s from request to first driver offer.",
        "Trip state durable and consistent: no lost trips, no double-assignment, across any single node/AZ failure.",
        "Location data loss is acceptable (next ping heals it); trip and payment-relevant events are not.",
        "City-level isolation: a failure or overload in one city's matching must not degrade other cities."
      ],
      estimation: {
        prompts: [
          "Confirm the location write rate from 1M drivers at 4 s cadence, and its bandwidth at ~100 B/update.",
          "Estimate the size of the in-memory available-driver index for the largest city.",
          "Matching QPS vs. candidate-query cost: how many drivers does one match evaluate?",
          "Daily raw location-trail volume if regulation requires 90-day retention.",
          "How many trip-state transitions per second does 500 requests/sec produce?"
        ],
        worked: "<p>The firehose: 1M drivers / 4 s = 250k updates/sec, at ~100 B each is only ~25 MB/s — trivial bandwidth, brutal write rate. That asymmetry is the tell: this is a memory-and-fan-out problem, not a storage problem.</p><pre>1,000,000 / 4 s               = 250k writes/s  (~25 MB/s)\nLargest city index: 100k drivers x ~50 B (id, pos, status, ts, vehicle bits)\n                              = 5 MB  -- one process holds a whole megacity\nMatching: 500 req/s x ~50 candidates scored = 25k ETA-ish evaluations/s\nTrip transitions: 500 req/s x ~8 lifecycle events = 4k durable writes/s\nTrail retention: 250k/s x 100 B x 86,400 = ~2.2 TB/day raw\n                 -> 90 days = ~200 TB before compression (~4x) = ~50 TB stored</pre><p>Two conclusions fall out. First, per-city in-memory indexes are tiny — 5 MB for a megacity — so the matching engine can be a single-writer process per city with a hot standby, which turns the atomic-assignment problem from a distributed-locking nightmare into a local data-structure update. Second, durable load is small (4k writes/sec of trip events globally), so a boring replicated SQL/log store handles the part that must never be wrong. The design splits cleanly along the disposable/durable line the estimation exposes.</p>"
      },
      model: {
        highlevel: "<p>Shard everything by city, because nothing about dispatch crosses city lines. Within a city, three layers: an ingestion tier that terminates driver connections and forwards pings; a <b>single-writer in-memory matcher</b> holding the city's available-driver spatial index and running assignment; and a durable trip service owning the trip state machine in a replicated store. Location pings flow through a log (for trail archival and standby feed) but the matcher consumes them directly for freshness.</p><pre>drivers --gRPC/WS--> ingest tier --pings--> city matcher (in-mem index,\n   ^                     |                    single writer + hot standby)\n   |                     +--> Kafka --> trail archive (90d, compressed)\n   |                                        |\nriders --request/quote--> API --> matcher --offer--> driver\n                            |         |\n                        surge svc   trip service (durable state machine)\n                        (per-zone,     |\n                         60 s loop)  rider/driver push (live position, status)</pre><p>The matcher is deliberately a consistency island: one process per city mutates the available set, so 'remove driver D and create offer O' is a plain critical section, not a distributed transaction. Its state is reconstructible in seconds (drivers re-ping every 4 s; offers are re-derivable from the trip service), so failover is cheap: standby promotes, index refills from live pings, in-flight offers are re-validated against the trip store. Durability lives only where it belongs — the trip service.</p>",
        data: "<p></p><pre>POST /v1/quotes   {pickup, dropoff}          -> {quote_id, price, surge, ttl:120s}\nPOST /v1/trips    {quote_id}                 -> {trip_id, state:\"matching\"}\nWS   /v1/trips/{id}/events                   -> state + driver position stream\nPOST /v1/driver/status {available|offline}\nWS   /v1/driver/feed                          -> offers; accept/decline in-band\n\ntrips(trip_id, rider_id, driver_id?, state, quote_id, price_locked,\n      zone, requested_at, version)            -- optimistic version on transitions\ntrip_events(trip_id, seq, event, ts, actor)   -- append-only audit\nquotes(quote_id, price, surge_mult, zone, expires_at)\nsurge(zone_id, mult, computed_at)             -- small, cache everywhere\n\nMatcher in-memory (per city):\n  cell -> [driver_id, pos, heading, status, last_ping]\n  driver_id -> cell backref; offers: driver_id -> {trip_id, expires_at}</pre><p>Every trip transition is a compare-and-swap on <code>version</code> in the trip store; the matcher proposes, the trip service disposes. That keeps the authoritative state machine in the durable tier even though matching decisions happen in memory.</p>",
        deepdives: "<p><b>Atomic assignment without distributed locks.</b> The single-writer matcher makes local assignment atomic, but the full handshake spans systems: matcher reserves driver in-memory, writes trip transition <code>matching -> offered(driver)</code> via CAS to the trip service, then pushes the offer. Crash between steps? Reconciliation rule: the trip store is truth; on matcher failover, any in-memory reservation without a corresponding trip row is dropped, and any <code>offered</code> trip row whose offer timer lapsed transitions back to <code>matching</code>. Offers carry expirations precisely so every failure mode resolves by timeout rather than by operator.</p><p><b>Matching quality vs. latency.</b> Greedy nearest-driver is fast but globally poor when requests arrive in bursts — the first request takes the driver the second request needed more. Batch matching (collect requests for 2 s, solve a small assignment problem minimizing total pickup ETA across the batch) measurably cuts average ETA in dense zones for the price of 2 s added latency. Resolve per-zone: batch mode in dense zones where conflicts are common, greedy in sparse zones where a 2 s wait buys nothing. The 3 s match SLO absorbs the batch window.</p><p><b>Surge without feedback whiplash.</b> Surge computed naively (instant demand/supply ratio) oscillates: high price kills demand, price crashes, demand floods back. Compute per-zone surge from smoothed inputs — 5-minute EWMA of requests, quotes-viewed-but-abandoned (latent demand), and available-driver-minutes — with hysteresis (multiplier moves at most one step per 60 s tick) and neighbor-zone blending so a zone boundary is not a price cliff drivers game by parking across the street. Quoted prices are locked for the quote TTL: the user who saw 1.4x pays 1.4x even if the tick moved to 1.6x — pricing honesty is a correctness requirement, not UX polish.</p>",
        tradeoffs: "<p><b>Single-writer matcher vs. partitioned matching:</b> single-writer buys atomicity and simplicity, costs a scalability ceiling and a failover story. The estimation defends it: a megacity is 5 MB of state and a few thousand matches/minute — orders of magnitude below the ceiling. If a city ever exceeds one process (mega-events), partition the city into fixed districts with border-zone double-checking, and accept the reintroduced coordination at the seams. Do not build that until forced.</p><p><b>Location through a log vs. direct:</b> routing pings through Kafka first adds a durability hop the data does not need and 100-500 ms of freshness cost. Chosen: ingest tier writes to the matcher directly and tees to Kafka for archive/standby — dual-path, with the understanding that the archive may miss what the matcher saw during incidents, which is acceptable for a trail and unacceptable for trips (which is why trips never ride this path).</p><p><b>Bottleneck:</b> the rider-facing live-position fan-out during trips (hundreds of thousands of 1-2 s streams) dwarfs matching itself; it is a stateless push tier scaled horizontally, kept strictly out of the matcher's process.</p>",
        scaling: "<p><b>1x (one country, 50k drivers):</b> a handful of city matchers colocated in one region, one trip DB, surge as a cron-like loop. The city-sharded architecture is already the final shape — growth adds cities, not new mechanisms.</p><p><b>10x (1M drivers, global):</b> regional deployments: each region hosts its cities' matchers, trip shards, and ingest tiers; nothing dispatch-related crosses regions. The trail archive centralizes for data science. Hot-standby matchers get formalized: standby consumes the ping tee continuously so promotion means seconds of degraded matching, not minutes of index refill. Surge inputs graduate from counts to a small forecasting model, same interface.</p><p><b>100x (10M drivers, plus food/freight verticals):</b> the matcher becomes a platform: multiple demand types (rides, food, packages) competing for overlapping supply pools forces a shared assignment layer with per-vertical objective functions — the single-writer-per-city core survives, but 'available driver' becomes a multi-product reservation problem, and cross-vertical fairness/starvation becomes the new hard problem. Trip storage shards by city-and-time; the 90-day trail at 100x (5 PB) moves to columnar storage with privacy-driven aggregation-after-N-days, because at this scale retention policy is a legal architecture, not a disk-size question.</p>"
      },
      followups: [
        "Add scheduled rides (book for tomorrow 8 AM) — what new component owns them and when do they enter matching?",
        "Two riders, one driver, simultaneous accept: trace your exact message ordering and prove no double-assignment.",
        "The matcher's city process is at 90% CPU during a stadium event. What degrades first, and what is your load-shed order?",
        "Add shared rides (pooling): how does the matching objective and the trip state machine change?",
        "Regulators demand surge caps during declared emergencies, effective within 5 minutes. Where does that control live?",
        "Design the driver-side offer fairness: how do you prevent the same nearby driver getting every offer?"
      ],
      rubric: {
        senior: [
          "Classifies location pings as disposable high-rate data and keeps them out of the durable write path.",
          "Shards by city and justifies a single-writer in-memory matcher with the state-size math.",
          "Designs the offer/accept handshake with CAS transitions and timeout-based recovery for every crash point.",
          "Keeps the trip state machine durable and authoritative, with the matcher only proposing transitions.",
          "Locks quoted prices for a TTL and separates quote-time surge from tick-time surge.",
          "Sizes the fan-out (rider live-position streams) and isolates it from the matching core."
        ],
        staff: [
          "Argues greedy vs. batch matching with the latency/quality trade and resolves it per-zone rather than globally.",
          "Designs surge as a control loop with smoothing, hysteresis, and neighbor blending to prevent oscillation and gaming.",
          "Defines the reconciliation invariant (trip store is truth; memory is cache) and derives failover behavior from it.",
          "States the single-writer ceiling and the partitioned-city escape hatch without prematurely building it.",
          "Treats retention of location trails as a privacy/legal design dimension with concrete aggregation policy."
        ]
      }
    },
    {
      slug: "ticket-booking",
      name: "Design a Ticket Booking System",
      category: "System Design",
      difficulty: "Medium",
      minutes: 40,
      summary: "60k seats, 2M buyers at on-sale: holds, atomic seat claims, queueing the stampede.",
      statement: "<p>Design the booking system for reserved-seat events: concerts, games, theater. Each event has a seat map (say 60,000 seats for a stadium), each seat sells exactly once, and the hard moment is the on-sale: 2 million people hitting the system in the first minutes to fight over those seats. A user browses availability, holds specific seats for a few minutes while paying, and either completes the purchase or the seats return to the pool.</p><p>The problem is high-contention inventory with a human in the loop. Unlike a warehouse decrementing a stock counter, every unit here is unique and user-selected, holds must expire reliably, payment takes tens of seconds and can fail, and overselling a seat is a customer-facing disaster that support cannot paper over.</p><p>Design the seat inventory model, the hold/purchase flow, the on-sale traffic strategy, and the failure handling around payment. Dynamic pricing and the resale market are out of scope; payment itself is a black-box service with success/failure/timeout outcomes.</p>",
      clarifying: [
        "Reserved seating only, or also general-admission (counted) tickets? (Both; GA is a counter, reserved is per-seat.)",
        "Hold duration while paying, and can it be extended? (8 minutes, one 2-minute extension.)",
        "Is a virtual waiting room acceptable UX for on-sales, or must everyone hit the seat map at once? (Waiting room is acceptable and expected.)",
        "Max seats per transaction and any anti-scalper constraints in scope? (8 per transaction; bot mitigation at the edge is in scope conceptually.)",
        "How fresh must the availability map be for browsing users — real-time or seconds stale?",
        "What does the business prefer under extreme failure: sell slower, or risk oversell? (Never oversell; degrade throughput instead.)",
        "Are there presales/allocations (fan club, sponsors) carving the seat map into pools?"
      ],
      functional: [
        "Display a seat map with near-real-time availability (staleness under 5 s acceptable while browsing).",
        "Atomically hold up to 8 specific seats; holds auto-expire at 8 minutes with one 2-minute extension.",
        "Convert a hold to a confirmed purchase on payment success; release seats on failure, abandonment, or expiry.",
        "Guarantee each seat is sold at most once per event — ever, under any failure interleaving.",
        "Run a fair virtual waiting room for on-sales that admits users at a controlled rate.",
        "Support allocation pools (presale codes see only their carved-out inventory)."
      ],
      nonfunctional: [
        "Zero oversell — correctness is absolute; throughput and latency degrade first.",
        "Seat-hold operation p99 under 300 ms for admitted users at an admission rate of 2,000 users/min.",
        "Survive 2M concurrent waiting-room users while the booking core sees only admitted traffic.",
        "Hold expiry accuracy within 5 s — seats must return to the pool promptly, or hot events strand inventory.",
        "Availability view may be 5 s stale, but a hold attempt must be evaluated against true current state."
      ],
      estimation: {
        prompts: [
          "At 2,000 admitted users/min averaging 4 seats per attempt, what write QPS does the seat store see, including failed/contended attempts?",
          "How long does a 60k-seat sellout take at that admission rate and a 60% purchase completion rate?",
          "Size the per-event seat state: can one event's inventory live in one shard/process?",
          "Estimate waiting-room infrastructure load for 2M queued users polling/holding connections.",
          "What is the peak hold-expiry rate the reaper must handle without lagging?"
        ],
        worked: "<p>Size the seat state first, because it determines whether contention is a distributed problem or a local one. 60k seats x ~64 B (seat_id, state, hold_owner, hold_expiry, pool, version) = ~4 MB per event. One event's entire inventory fits in one database partition or one in-memory process — so the fight over seats can be made local, and the design should refuse to let it become distributed.</p><pre>60k seats x 64 B = ~4 MB  -> single-partition per event, always\nAdmission 2,000 users/min, avg 4 seats:\n  hold ops     = 2,000/60 x ~2 attempts (contention retries) = ~65/s\n  seat writes  = 65 x 4 seats                                 = ~260 seat-CAS/s\nSellout time: 60,000 seats / (2,000 users/min x 4 x 0.6 complete)\n  = 60,000 / 4,800 per min = ~12.5 min of admitted flow\nExpiry: worst case ~40% of holds lapse -> 2,000 x 4 x 0.4 / 60 = ~55 seat-releases/s</pre><p>The numbers are almost embarrassingly small — a few hundred writes/sec — and that is the point: the waiting room converts a 2M-user stampede into a 65 ops/sec trickle the inventory core handles trivially. The 2M-user problem is real but it lives entirely in the (stateless, horizontally boring) queue tier: 2M users on a 5 s poll is 400k cheap reads/sec against a cache, or better, 2M held SSE connections across ~20 gateway nodes. Estimation reveals the architecture: the hard part is not the inventory math, it is keeping the stampede away from it.</p>"
      },
      model: {
        highlevel: "<p>Three rings. Outermost: a CDN-served static seat map and a <b>virtual waiting room</b> that owns the stampede — every user gets a queue token; a rate controller admits tokens at a pace the core is measured to handle. Middle: the booking API for admitted users only, enforcing per-user limits. Innermost: the <b>seat inventory core</b>, partitioned by event, where every seat transition is an atomic conditional write, and a purchase pipeline that coordinates holds with the payment black box.</p><pre>2M users -> CDN (map, assets) + waiting room (token, position, SSE)\n                     | admit @ controlled rate (signed admission token)\n                     v\n              booking API -> seat core [per-event partition:\n                     |         seat rows, CAS transitions, hold TTLs]\n                     v\n              payment svc (black box) --> confirm/release\n              reaper: expiry scan per event, releases lapsed holds</pre><p>Availability browsing reads a 2-5 s cached snapshot of the map (cheap, stale-tolerant); the hold path alone touches truth. Admission tokens are signed and event-scoped so the booking API can reject non-admitted traffic statelessly at the edge of the middle ring. The rate controller is closed-loop: it watches seat-core p99 and error rate and adjusts admission, because the correct admission rate is discovered, not configured.</p>",
        data: "<p>Seat state is a five-state machine per seat: <code>available -> held -> sold</code>, plus <code>released</code> (back to available) and <code>blocked</code> (ops/allocation). Every transition is a compare-and-swap on (state, version); there are no locks to leak and no transaction spanning more than one event partition.</p><pre>seats(event_id, seat_id, state, pool_id, hold_id?, hold_expires_at?, version)\nholds(hold_id, event_id, user_id, seat_ids[], state: active|converted|lapsed,\n      created_at, expires_at)\norders(order_id, hold_id, user_id, amount, state: pending|paid|failed|refunded,\n       payment_ref, idempotency_key)\n\nPOST /v1/events/{id}/holds   {seat_ids[], admission_token}\n  -> 201 {hold_id, expires_at} | 409 {unavailable_seats[]}\nPOST /v1/holds/{id}/extend    -> once, +2 min\nPOST /v1/holds/{id}/purchase  {payment_method, idempotency_key}\n  -> 202 {order_id}   (async payment; result via poll/SSE)\nGET  /v1/events/{id}/map      -> cached availability bitmap (ETag, ~2 s TTL)</pre><p>The multi-seat hold is all-or-nothing within the single event partition: attempt CAS on all requested seats in one transaction; on any conflict, roll back the batch and return exactly which seats were lost, so the client can re-offer neighbors instead of making the user restart.</p>",
        deepdives: "<p><b>Hold expiry that cannot strand or double-sell.</b> Expiry via a background reaper alone is late under lag; expiry via lazy check alone strands seats nobody re-requests. Use both: each seat row carries <code>hold_expires_at</code>, and every state-changing operation validates it inline (a purchase of a lapsed hold fails even if the reaper is behind), while the per-event reaper scans each second releasing lapsed holds so browsing users see seats return. The inline check is the correctness mechanism; the reaper is a freshness mechanism. This layering means reaper downtime degrades UX, never correctness.</p><p><b>Payment limbo.</b> Payment takes 5-60 s and can time out ambiguously — the classic dangerous window. Rules: (1) the hold, not the payment, protects the seats, so a slow payment inside a live hold is safe; (2) if payment succeeds after the hold lapsed and seats were resold, the order pipeline detects the conversion-CAS failure (hold no longer active) and auto-refunds — money is refundable, a double-sold seat is not, so the invariant hierarchy is seats > money > latency; (3) all payment calls carry an idempotency key derived from the hold, so retries of ambiguous timeouts cannot double-charge. The purchase endpoint is async (202 + status stream) because synchronous 60 s HTTP holds are how you exhaust every pool upstream.</p><p><b>Waiting-room fairness.</b> Naive FIFO by arrival time rewards bots that connect milliseconds after on-sale. Instead: users arriving within the first window (e.g., 5 minutes) are pooled and randomized, then FIFO afterward; queue tokens are bound to account + device fingerprint, rate-limited per account, and admission tokens are single-use. Fairness is a product statement — publish the mechanism, because perceived rigging is a reputational incident even when the system is honest.</p>",
        tradeoffs: "<p><b>Pessimistic holds vs. optimistic checkout:</b> pure optimistic (pick seats, find out at pay time you lost them) maximizes throughput but produces rage at exactly the moment users are most invested. Timed holds cost stranded inventory (mitigated by short TTL + extension) and are the right call for high-emotion unique inventory. GA tickets flip the trade: a counter with atomic decrement, no holds needed beyond payment.</p><p><b>Per-event single partition vs. distributed inventory:</b> we confine each event to one partition on the strength of the 4 MB / 260 writes-sec math, gaining local transactions and losing nothing until an event needs more than one partition's throughput — which the waiting room ensures it never does. The admission rate is the pressure-relief valve that makes this promise hold; that coupling (admission controller protects partition SLO) should be explicit and monitored.</p><p><b>Cached availability vs. truthful map:</b> a 2-5 s stale map means users sometimes click a just-taken seat. Accepted deliberately: the 409 with alternative suggestions is cheaper than making 400k browsers hit truth. The one place staleness is forbidden — the hold CAS — is also the one place load is tiny.</p>",
        scaling: "<p><b>1x (theater chain, 2k-seat rooms, no stampedes):</b> skip the waiting room; the seat core plus holds is the whole system and a single modest database carries hundreds of events. The seat state machine and CAS discipline are unchanged — that part is scale-invariant correctness, not scale infrastructure.</p><p><b>10x (arenas, real on-sales):</b> the full three-ring design. Waiting room and map CDN absorb the crowd; per-event partitioning means concurrent on-sales scale linearly by adding partitions. The reaper and rate controller become per-event control loops with dashboards; bot defense (fingerprinting, proof-of-work challenges, account velocity limits) becomes a standing arms race owned as a product surface.</p><p><b>100x (global platform, thousands of simultaneous on-sales, 100M queue users):</b> the waiting room becomes its own multi-region product with regional queue affinity and signed cross-region admission. Event partitions are placed by expected demand (a world-tour on-sale gets dedicated hardware). The new hard problems are organizational-scale: allocation pools and presale windows turn the seat map into overlapping inventory views needing a policy engine, and post-sale (transfers, resale, refunds) starts to dwarf the on-sale system — the seat state machine grows states, and the guarantee 'sold at most once' matures into 'owned by exactly one account at all times', which is the same invariant wearing a bigger system.</p>"
      },
      followups: [
        "Add best-available seating (system picks contiguous seats) — how does contention change when everyone wants the algorithm's same answer?",
        "A payment provider outage strands 3,000 active holds mid-purchase. Walk the recovery and the user communication.",
        "Add ticket transfer between accounts post-purchase while preventing double-spend of a ticket at the venue gate.",
        "The venue releases 500 production-hold seats 30 minutes before showtime. How do they enter inventory without a mini-stampede?",
        "Design offline gate scanning: validating tickets when the venue's internet drops.",
        "How would you load-test the on-sale path realistically without risking real inventory?"
      ],
      rubric: {
        senior: [
          "Makes every seat transition an atomic conditional write with an explicit state machine, no lock leakage possible.",
          "Designs timed holds with dual expiry (inline validation + reaper) and can say which one is for correctness.",
          "Separates the stale-tolerant browse path from the truthful hold path and defends the staleness budget.",
          "Uses a waiting room to convert the stampede into a controlled admission rate, with signed admission tokens.",
          "Handles payment ambiguity with idempotency keys, async purchase, and the refund-over-oversell rule.",
          "Does the math showing one event fits one partition and keeps multi-seat holds single-partition-atomic."
        ],
        staff: [
          "Frames admission control as a closed loop protecting the seat-core SLO, not a static config number.",
          "States the invariant hierarchy (never oversell > money > latency) and derives failure behavior from it.",
          "Treats waiting-room fairness and bot resistance as product-visible design, including the randomized first window.",
          "Distinguishes reserved-seat from GA inventory and applies different concurrency models to each.",
          "Identifies stranded-inventory risk from holds and bounds it with TTL policy tied to sellout economics."
        ]
      }
    },
    {
      slug: "payment-system",
      name: "Design a Payment System",
      category: "System Design",
      difficulty: "Hard",
      minutes: 45,
      summary: "Exactly-once money movement: idempotency keys, double-entry ledger, reconciliation.",
      statement: "<p>Design the payment platform for a marketplace: buyers pay, the platform takes a fee, sellers get paid out. Under the hood you call external card networks and bank rails that are slow, occasionally ambiguous (timeouts where you cannot tell if the charge happened), and periodically wrong. Your system must move money exactly once per intent, keep an auditable record that always balances, and detect every discrepancy between what you believe happened and what the processor says happened.</p><p>This problem is less about throughput than about correctness under partial failure. A retried request must not double-charge. A crash between 'processor said yes' and 'we recorded it' must be recoverable. And because you will still get it wrong sometimes — or the processor will — reconciliation is not an afterthought but a load-bearing subsystem.</p><p>Design the payment flow, the idempotency machinery, the ledger, and the reconciliation pipeline. PCI scope minimization matters (you should not store raw card numbers); fraud scoring is a black-box call in the flow, not something you design.</p>",
      clarifying: [
        "Which flows are in scope: charge, refund (full/partial), and seller payout? (All three.)",
        "One payment processor or several with failover/routing? (Start with one; multi-processor is a follow-up.)",
        "What consistency does the balance display need — exact real-time, or is minutes-stale acceptable for sellers?",
        "Expected volume: transactions/day and peak multiplier? (2M/day, 10x peak bursts during sales events.)",
        "What are the processor's idempotency semantics — does it accept a client-supplied idempotency key?",
        "Regulatory retention: how long must ledger records be immutable and queryable? (7 years.)",
        "Are multi-currency and FX conversion in scope? (Single currency; FX is a follow-up.)"
      ],
      functional: [
        "Accept a payment intent, authorize and capture via the external processor, and record the result durably.",
        "Guarantee idempotency: the same client intent, retried any number of times through any path, charges exactly once.",
        "Maintain a double-entry ledger covering buyer charge, platform fee, seller balance, and processor fees — always summing to zero.",
        "Support full and partial refunds bounded by the original capture amount, and scheduled seller payouts.",
        "Reconcile daily against processor settlement files, surfacing every mismatch with a workflow to resolution.",
        "Expose payment status transitions to clients via query and webhook."
      ],
      nonfunctional: [
        "Zero double-charges and zero lost captures — correctness over availability; when in doubt, fail closed and resolve asynchronously.",
        "Ledger append availability 99.99%; a ledger write is never lost once acknowledged (replicated, fsynced).",
        "p99 payment-initiation latency under 2 s excluding processor time; processor calls bounded by a 30 s timeout with defined ambiguity handling.",
        "Sustain 2M transactions/day (~23 avg, ~250 peak TPS) with 10-year ledger retention, immutable and auditable.",
        "Reconciliation completes within 4 hours of settlement-file arrival with 100% of transactions matched or exception-queued."
      ],
      estimation: {
        prompts: [
          "Convert 2M transactions/day into average and peak TPS, and ledger entries per second (multiple legs per transaction).",
          "Estimate ledger growth per year at ~5 legs per transaction and ~250 B per entry, over 7-year retention.",
          "Size the daily reconciliation job: settlement file rows vs. internal records to match.",
          "What is the expected daily volume of ambiguous outcomes (timeouts) at a 0.1% ambiguity rate, and what does that imply for the recovery queue?",
          "Estimate webhook/event fan-out volume to merchants and internal consumers."
        ],
        worked: "<p>Throughput is the easy part — the estimate's job is to show where the real weight is. 2M/day is ~23 TPS average, ~250 TPS at the stated 10x peak. Each transaction writes ~5 ledger legs (buyer debit, seller credit, platform fee, processor fee, clearing account), so peak ledger append is ~1,250 entries/s — well within a replicated SQL store with an append-only table.</p><pre>2M / 86,400            = ~23 TPS avg; x10 peak = ~230-250 TPS\nLedger: 2M x 5 legs    = 10M entries/day x 250 B = ~2.5 GB/day\n        x 365 x 7 yr   = ~6.4 TB retained  (partition by month, archive cold)\nAmbiguity: 2M x 0.1%   = ~2,000 unresolved-outcome payments/day\nReconciliation: ~2M settlement rows vs ~2M internal captures, daily batch\n  at 20k comparisons/s -> ~100 s of matching; the 4 h SLO is for exceptions,\n  not the happy path</pre><p>Two numbers shape the design. First, ~2,000 ambiguous outcomes per day: that is not an edge case, it is a steady operational stream, so ambiguity resolution must be an automated pipeline (status-query retries, then reconciliation catch-all), not an on-call runbook. Second, 6.4 TB of immutable ledger over retention: modest in size but absolute in integrity requirements — the engineering effort goes to append-only enforcement, hash-chaining for tamper evidence, and archival access, not to storage scale.</p>"
      },
      model: {
        highlevel: "<p>The core is a <b>payment state machine</b> wrapped in idempotency at the edge and recorded in a double-entry ledger at the bottom, with reconciliation as the independent auditor of the whole stack. Flow: client creates a payment intent with an idempotency key; the orchestrator walks the state machine (created → authorizing → authorized → capturing → captured → settled, with failed/voided/refunded branches); every processor call carries a derived idempotency key so retries are safe end-to-end; every state transition that moves money appends balanced ledger legs in the same local transaction as the state update.</p><pre>client --(intent, idem key)--> payments API --> orchestrator (state machine)\n                                                  |        |\n                                    tokenized card|        | balanced legs\n                                                  v        v\n                                            processor    ledger (append-only,\n                                            adapter        double-entry)\n                                                  |\n  settlement files (daily) --> reconciliation <---+   exceptions --> ops queue\n  webhooks/events <-- outbox (same-tx as state writes)</pre><p>Two invariants carry everything: (1) state transitions and their ledger legs commit atomically in one database transaction — money recorded and state advanced are never observably separate; (2) external effects (processor calls, webhooks) are made exactly-once-in-effect via idempotency keys outward and an outbox pattern inward, because you cannot get atomicity across your DB and someone else's API — you get it via keys plus recovery.</p>",
        data: "<p></p><pre>payments(payment_id, idem_key UNIQUE, buyer, seller, amount, currency,\n         state, processor_ref, created_at, version)\nledger_entries(entry_id, txn_group_id, account_id, direction: debit|credit,\n               amount, currency, created_at, prev_hash, entry_hash)\n  -- append-only; no UPDATE or DELETE grants exist on this table\naccounts(account_id, type: buyer_clearing|seller_balance|platform_fees|\n         processor_fees|payouts_pending, currency)\nidempotency(idem_key, request_hash, payment_id, response_snapshot, expires_at)\noutbox(event_id, aggregate_id, payload, published_at?)\nrecon_exceptions(id, kind: missing_internal|missing_external|amount_mismatch|\n                 state_mismatch, refs, state, assigned_to)\n\nPOST /v1/payments        Idempotency-Key: <uuid>   {amount, seller, source_token}\n  -> 201 {payment_id, state} | replay -> stored response, same status code\nPOST /v1/payments/{id}/refunds   Idempotency-Key: ...  {amount}\nGET  /v1/payments/{id}   -> full state + timeline</pre><p>Corrections never mutate: a mistaken entry is fixed by a reversing entry plus a new correct one, preserving the audit trail. The <code>request_hash</code> in the idempotency table catches the nastiest client bug — same key, different payload — which must be rejected, not replayed.</p>",
        deepdives: "<p><b>Idempotency end to end.</b> Three layers, each necessary. Edge: the client's idempotency key unique-constrains payment creation; a replay returns the stored response verbatim (same status code — a replayed failure is still that failure). Middle: the orchestrator persists state before and after each processor call, so a crashed worker resumes from recorded state instead of re-deciding. Outward: every processor call uses a deterministic derived key (<code>payment_id + attempt-scope</code>), so 'we crashed after sending, before recording the answer' resolves by re-sending the same-keyed request and getting the processor's original answer back. The rule that makes ambiguity survivable: record intent durably <i>before</i> the external call — a timeout then leaves a payment in <code>capturing</code> that recovery can chase, never a charge nobody remembers attempting.</p><p><b>Why double-entry, concretely.</b> Single-balance updates lose information and hide bugs. With every movement written as balanced debit/credit legs across real accounts (buyer clearing, seller balance, fee accounts), three properties fall out: any transaction group sums to zero (a cheap always-on invariant check), any account balance is derivable and provable from its history, and reconciliation has a precise thing to reconcile against. A partial refund is just another balanced group referencing the original capture, naturally bounded by summing prior groups.</p><p><b>Reconciliation as designed distrust.</b> Daily settlement files are parsed and matched against internal captures on (processor_ref, amount, date). Four exception kinds: they-have-it-we-don't (worst — usually a lost ack; auto-repair by querying processor status and replaying the recorded intent), we-have-it-they-don't (pending capture or our bug), amount mismatch (fees, partial captures), state mismatch (their reversal we missed). Each kind gets an automated first-pass resolver; only leftovers hit humans. Metric that matters: auto-match rate — below ~99.9% means an upstream defect, and reconciliation is your detector, not your fix.</p>",
        tradeoffs: "<p><b>Sync vs. async capture:</b> capturing inline gives the buyer a definitive answer but couples your p99 and availability to the processor's worst moments. Chosen: authorize inline (the UX-critical yes/no), capture asynchronously from a persisted queue with retries. Cost: a small window where an authorized payment later fails capture — handled by void-and-notify, acceptable at ~0.01% rates; the reverse trade (double-charge risk from hurried inline retry logic) is not acceptable at any rate.</p><p><b>Ledger in the hot path vs. trailing:</b> writing legs in the same transaction as state costs latency and couples throughput to the ledger store; writing them async from an event stream risks divergence between state and money records — the exact gap reconciliation exists to catch, so creating it internally is self-sabotage. Chosen: same-transaction, and the ~1,250 entries/s peak makes the cost trivial. This trade flips only at orders of magnitude more volume, and then the answer is sharding the ledger by account-set, not detaching it.</p><p><b>Bottleneck honesty:</b> hot seller accounts (one mega-seller receiving thousands of credits/minute) serialize on their balance row. Since balances are derivable, don't maintain a contended running balance at all: append legs freely, compute balances from periodic snapshots + tail sum. The append-only design dissolves its own hotspot.</p>",
        scaling: "<p><b>1x (2M/day):</b> a single-region replicated SQL cluster carries payments, ledger, idempotency, and outbox; the orchestrator is a worker pool draining persisted jobs. Effort goes to invariants and reconciliation coverage, not distribution.</p><p><b>10x (20M/day, multi-processor):</b> shard by payment_id for payments/idempotency; the ledger shards by account partition with txn groups kept single-shard (choose clearing-account partitioning so a payment's legs colocate). Multi-processor routing arrives: per-processor adapters behind one interface, routing by cost/health/scheme, and reconciliation becomes per-processor pipelines feeding one exception system. Ambiguity volume is now ~20k/day — the auto-resolvers must clear 99%+ of it or ops drowns.</p><p><b>100x (200M/day, global):</b> regional processing for latency and data-residency, with the ledger's zero-sum property enforced per region plus an inter-region settlement layer (regions exchange netted positions on a schedule — your own regions become counterparties you reconcile, mirroring how correspondent banking actually works). Immutable ledger archives stream to columnar storage for audit/analytics; the hash-chain roots get externally anchored. The scarcest resource at this scale is confidence: invariant checkers (every group sums to zero, every capture has legs, every processor_ref is unique) run continuously against production as first-class services with paging alerts.</p>"
      },
      followups: [
        "Add multi-currency with FX: where does conversion happen, and what new accounts and reconciliation sources appear?",
        "The processor is down for 45 minutes. What does each payment state do, and what does the buyer experience?",
        "Design payout scheduling with negative-balance protection when refunds land after a seller has been paid out.",
        "A ledger invariant check fires: one transaction group sums to +$0.03. Walk your investigation.",
        "Add a second processor with automatic failover mid-payment — which states are safe to fail over and which are not?",
        "How would you prove to an external auditor that the ledger has not been tampered with since a given date?"
      ],
      rubric: {
        senior: [
          "Implements idempotency at all three layers (client key, persisted state machine, derived processor key) and rejects same-key-different-payload.",
          "Records intent durably before every external call and resolves timeouts via keyed retry, never blind re-charge.",
          "Uses a double-entry append-only ledger with zero-sum groups, committed atomically with state transitions.",
          "Handles refunds as balanced reversing groups bounded by the original capture.",
          "Uses an outbox for webhooks/events so notifications are never lost or duplicated relative to state.",
          "Keeps raw PANs out of the system entirely via tokenization, minimizing PCI scope."
        ],
        staff: [
          "Treats reconciliation as a designed subsystem with typed exceptions and automated first-pass resolvers, sized from the ambiguity rate.",
          "Chooses inline-auth/async-capture deliberately and states the failure window it accepts and why.",
          "Dissolves the hot-account bottleneck via derived balances instead of contended counters.",
          "Runs continuous production invariant checkers and frames them as the system's real safety net.",
          "Articulates the cross-region story (netted inter-region settlement) rather than pretending one global ledger scales."
        ]
      }
    },
    {
      slug: "distributed-cache",
      name: "Design a Distributed Cache",
      category: "System Design",
      difficulty: "Medium",
      minutes: 40,
      summary: "Cache as a product: consistent-hash sharding, eviction, hot keys, invalidation.",
      statement: "<p>Design a distributed in-memory cache offered as an internal platform product — the thing dozens of teams put in front of their databases. Clients get a simple key-value API (get, set with TTL, delete); your system provides the cluster behind it: sharding data across nodes, evicting under memory pressure, surviving node failures, and growing or shrinking without a stampede on the databases it protects.</p><p>Because it is a product, the interesting questions are contract questions. What consistency does a get actually promise after a set? What happens to hit rate when a node dies or a resharding moves a third of the keyspace? How does one tenant's hot key or fat value not ruin another tenant's p99? Every answer must be something you can write in the product's documentation and defend.</p><p>Design the client protocol, the sharding and rebalancing scheme, the eviction and memory model, and the replication/consistency story. Persistence is out of scope: this is a cache, and anything that must survive belongs to the systems behind it.</p>",
      clarifying: [
        "Cache-aside from client libraries, or read-through/write-through where the cache calls the backing store? (Cache-aside; the cache never calls databases.)",
        "What consistency contract do tenants get after a set or delete — read-your-write per key, or eventual? ",
        "Value size limits and distribution — must we handle multi-MB values, and do they share clusters with 100 B values?",
        "Is data loss on node failure acceptable (it is a cache), or do some tenants need replicas for hit-rate protection?",
        "Multi-tenancy model: shared clusters with quotas, or a cluster per team?",
        "Target scale: total working set, request rate, and typical hit-rate expectations? (Assume 10 TB, 50M ops/sec platform-wide.)",
        "Do we need atomic operations (increment, compare-and-set) or pure get/set/delete?"
      ],
      functional: [
        "get/set/delete with per-key TTL; values up to 1 MB; optional compare-and-set and atomic increment on single keys.",
        "Client library handles shard routing from a versioned cluster topology; no proxy hop on the hot path.",
        "Add/remove nodes and rebalance with bounded key movement and no full-cache flush.",
        "Optional per-tenant replication (1 replica) for hit-rate protection on expensive-to-recompute data.",
        "Per-tenant namespaces with memory quotas, per-tenant metrics (hit rate, evictions, p99), and key-pattern flush.",
        "Batch multi-get across shards with per-key partial results."
      ],
      nonfunctional: [
        "p99 under 1 ms server-side, p999 under 5 ms, at 1M ops/sec per node on the hot path.",
        "A single node failure drops at most 1/N of cached data and steals no more than a few seconds of elevated misses for its key range.",
        "Rebalancing moves only the mathematically necessary fraction of keys (adding node N+1 moves ~1/(N+1) of the keyspace).",
        "Memory is bounded per node and per tenant; the process never swaps and never OOMs — eviction runs ahead of allocation.",
        "Topology changes propagate to all clients within 10 s; stale-routed requests are detected and redirected, never silently misplaced."
      ],
      estimation: {
        prompts: [
          "Size the fleet: 10 TB working set at 64 GB usable cache per node, plus headroom — how many nodes?",
          "Check per-node throughput: does 50M ops/sec across that fleet fit each node's 1M ops/sec budget?",
          "Estimate per-key memory overhead (metadata, hash table, LRU links) for an average 512 B value — what fraction of RAM is overhead?",
          "When one node in a 200-node cluster dies, what miss-rate spike hits the backing databases, in QPS?",
          "How much data moves when you grow the cluster by 10%, and how long at 1 GB/s per node?"
        ],
        worked: "<p>Fleet size first: 10 TB of values at 64 GB usable per node is ~160 nodes; overhead pushes it higher. Per-key overhead: hash-table entry, key string (~40 B), TTL, LRU pointers, slab padding — call it ~90 B per entry. At 512 B average values that is ~17% overhead, so provision ~190-200 nodes.</p><pre>10 TB / 64 GB            = ~160 nodes for values\n overhead ~90 B / 512 B  = ~17%  -> ~190 nodes; round to 200\nThroughput: 50M ops/s / 200 = 250k ops/s per node avg -- 4x headroom\n  under the 1M/node budget, BUT hot-key skew eats headroom fast\nNode death (200 nodes): 0.5% of keys -> if platform hit rate is 95%\n  and that range served ~250k ops/s, DBs absorb ~250k extra QPS\n  until refill -- refill time at 250k sets/s x 512 B = ~2 min for 32 GB? \n  Recheck: 64 GB / (250k x 0.6 KB/s = 150 MB/s) = ~7 min of elevated misses\nGrow by 20 nodes (10%): moves ~10% of 10 TB = 1 TB; at 1 GB/s aggregate\n  spread across donors = minutes, throttled to protect serving</pre><p>The math surfaces the product truth: average load is comfortable, so the entire game is skew and transitions. A dead node is a ~7-minute regional miss elevation for its range — which is exactly the number that justifies offering optional replicas to tenants whose backing stores cannot absorb a 250k QPS surprise, and it gives the SLA sentence the docs need.</p>"
      },
      model: {
        highlevel: "<p>Smart clients, dumb servers, small control plane. The client library holds a versioned topology map and routes each key directly to its owner node — no proxy tier on the hot path, because at sub-millisecond budgets an extra hop is a 2x latency tax. Nodes are single-purpose memory servers: hash table, slab allocator, eviction, and (optionally) replication to one peer. A small consensus-backed control plane owns membership, health, and the topology version; it is on the admin path, never the data path.</p><pre>tenant app + client lib [topology v42] --get(k)--> node 17 (owner of k's range)\n        ^                                             |  async repl (opt-in)\n        | topology push/pull (v43 on change)          v\n   control plane (3-5 nodes, consensus) <--heartbeats-- node 18 (replica)\n\nsharding: consistent hashing, ~200 virtual nodes per physical node</pre><p>Consistent hashing with virtual nodes gives the two properties the NFRs demand: adding a node moves only ~1/(N+1) of keys, and a failed node's range scatters across all survivors instead of doubling one neighbor's load. Every request carries the client's topology version; a node that no longer owns the key answers with a redirect plus the new topology, so stale clients self-heal in one round trip and misrouting is detectable, never silent.</p>",
        data: "<p></p><pre>Wire protocol (binary, pipelined, multiplexed):\n  GET    ns key                      -> value | MISS\n  SET    ns key ttl flags len value  -> OK | OUT_OF_QUOTA\n  DEL    ns key                      -> OK\n  CAS    ns key ttl len value cas_id -> OK | EXISTS | MISS\n  MGET   ns [keys...]                -> per-key results (client fans out per shard)\n  every response: topology_version; MOVED(range, new_owner, v43) on stale routing\n\nNode internals:\n  shard-per-core: each core owns a hash-table partition (no cross-core locks)\n  slab allocator: size classes 64 B..1 MB; per-class LRU lists\n  entry: {key_hash, key, value_ptr, ttl_at, cas_id, lru_links, ns_id}\n  per-namespace accounting: bytes, items, hits, misses, evictions\n\nControl plane state:\n  nodes(node_id, addr, state: joining|active|draining|dead, vnode_tokens[])\n  topology_version, tenant_quotas(ns_id, max_bytes, max_ops)</pre><p>TTL expiry is lazy (checked on access) plus a sampling sweeper (random-sample entries per tick, evict expired) — the memcached-proven pattern that avoids maintaining a giant timer wheel for billions of entries while keeping expired-but-resident memory bounded to a few percent.</p>",
        deepdives: "<p><b>Hot keys.</b> One celebrity key at 500k gets/sec saturates its owner core regardless of cluster size — sharding cannot help a single key. Layered response: (1) node-level tiny-LFU counters detect keys above a promotion threshold; (2) the node marks the key hot in responses, and client libraries begin serving it from a short local cache (100-500 ms TTL) — for a key read 500k times/sec, 200 ms of client-side staleness cuts server load a thousandfold and is almost always semantically fine for data that hot; (3) for hot keys that must stay fresher, replicate the single key to R nodes and have clients hash-spread reads. The product doc states plainly: hot keys trade freshness for survival, and tenants choose the knob.</p><p><b>Consistency contract.</b> Without replication, per-key operations hit one owner node, so tenants naturally get per-key linearizable behavior in steady state — but the honest contract must cover transitions: during a rebalance or failover, a brief window allows stale reads (old owner serving while topology propagates). Bound the window (ownership leases: an old owner stops serving a range when its lease lapses, ~2 s) and document it: 'reads may be up to lease-length stale during topology changes; use CAS for read-modify-write.' With optional replication, replicas are async and explicitly read-only-on-failover — promoting a replica may lose the last moments of writes, which is acceptable precisely because this is a cache and the backing store is truth.</p><p><b>Rebalancing without a stampede.</b> Moving a range must not flush it. The joining node warms each migrating range by streaming entries from the current owner (LRU-order, hottest first) while the owner still serves; when a range is ~95% streamed, the control plane flips ownership atomically via topology version bump, and the old owner forwards its brief tail of stragglers. Misses during migration are bounded to the unstreamed cold tail — the DBs behind the cache see a ripple, not a cliff. Draining a node is the same machinery in reverse.</p>",
        tradeoffs: "<p><b>Smart client vs. proxy tier:</b> smart clients save a hop (the whole latency budget at p99 &lt; 1 ms) but push topology logic into N language libraries and make upgrades a fleet-wide coordination. A proxy centralizes logic and polyglot support at the cost of latency, hardware, and a new failure tier. Chosen: smart clients for the first-class languages, plus a thin optional proxy for long-tail languages — the platform-product compromise, stated as such.</p><p><b>Replication default-off:</b> replicating everything doubles hardware for data that is by definition reconstructible. Default off; per-namespace opt-in for tenants whose recompute cost or DB fragility justifies it. The estimation's 7-minute refill number is the argument tenants use to decide.</p><p><b>LRU vs. LFU eviction:</b> pure LRU dies on scans (one batch job cycling a huge range evicts the real working set). Use a scan-resistant hybrid (probationary segment + tiny-LFU admission: a new key must beat the frequency of the key it would evict). Cost: ~2% memory for sketches and a policy that is harder to explain in docs; worth it because eviction quality is the product — hit rate is the only number tenants remember.</p><p><b>Bottleneck:</b> the network, not memory: 1M ops/s of 512 B values is ~4 Gbps per node before overhead; fat values (1 MB) on the same NIC starve small ops — hence per-connection fairness and a separate size-class cluster recommendation for large-value tenants.</p>",
        scaling: "<p><b>1x (one team, 100 GB, 500k ops/s):</b> this is a 3-node deployment where the control plane is almost embarrassing overhead — run it anyway, because topology versioning and MOVED redirects are the contract, and retrofitting a protocol is the expensive part. Honest advice at this scale: managed Redis is fine; build the platform when the second and third teams arrive.</p><p><b>10x (10 TB, 50M ops/s, 30 tenants):</b> the design as described: ~200 nodes, per-tenant quotas enforced at nodes, hot-key promotion live, migration-based rebalancing routine. Multi-tenancy pain arrives: one tenant's fat-value traffic degrading neighbors forces per-namespace network accounting and eventually placement by workload class (small-value/high-QPS clusters vs. large-value clusters).</p><p><b>100x (100 TB+, multiple regions, hundreds of tenants):</b> cells, not one giant ring: independent clusters of ~300 nodes each, tenants placed onto cells by a placement service, because a single 3,000-node consistent-hash ring makes every topology change a global event and every control-plane bug a total outage. Cross-region: caches stay region-local (cross-region RTT violates the entire latency premise); what crosses regions is invalidation — a best-effort pub/sub of delete events with a documented delivery SLO, because tenants will otherwise build seven incompatible versions of it themselves. The platform team's job shifts from serving bytes to running the placement, quota, and invalidation control planes.</p>"
      },
      followups: [
        "Add a cluster-wide invalidation bus tenants can publish deletes to — what delivery guarantee can you honestly offer, and what happens during partitions?",
        "A tenant reports p999 spikes every 30 s on one namespace. Walk your diagnosis with the metrics you built.",
        "Support values up to 64 MB for an ML-features team without wrecking small-op latency — same cluster or new tier, and why?",
        "Add read-through mode where the cache calls a tenant-registered loader on miss — what new failure modes does the cache inherit?",
        "Design cache warming for a brand-new node set before a product launch, from a snapshot of a live cluster.",
        "A topology bug made two nodes both believe they own a range for 40 s. What did tenants observe, and what detects it?"
      ],
      rubric: {
        senior: [
          "Chooses consistent hashing with virtual nodes and quantifies key movement for grows, shrinks, and failures.",
          "Keeps the data path one hop via versioned-topology smart clients with MOVED-style self-healing.",
          "Designs per-node internals concretely: shard-per-core, slab allocation, lazy+sampled TTL expiry, scan-resistant eviction.",
          "Handles hot keys with detection plus client-side micro-caching and states the staleness trade explicitly.",
          "Does the overhead and refill math (per-entry bytes, miss surge on node death) rather than treating RAM as free.",
          "Enforces per-tenant quotas and metrics as product features, not afterthoughts."
        ],
        staff: [
          "Writes the consistency contract like documentation, including the bounded staleness window during topology changes with a lease mechanism.",
          "Designs warm migration so rebalancing bounds DB miss-surge, and can say what the databases see.",
          "Argues replication default-off from recompute economics, with the opt-in criterion tenants apply.",
          "Scales by cells rather than one giant ring and explains the control-plane blast-radius reasoning.",
          "Recommends managed Redis at small scale — knows when the platform is not yet worth building."
        ]
      }
    },
    {
      slug: "message-queue",
      name: "Design a Distributed Message Queue",
      category: "System Design",
      difficulty: "Hard",
      minutes: 45,
      summary: "Partitioned log, at-least-once vs exactly-once, consumer groups and rebalancing.",
      statement: "<p>Design a distributed message queue offered as shared infrastructure: producers publish to named topics, consumers subscribe in groups where each message is processed by exactly one member, and the system persists messages durably so consumers can be offline, slow, or replaying history. Think of the product category occupied by log-based brokers, but design it from first principles.</p><p>The heart of the problem is the guarantee matrix. What ordering do you promise, and at what granularity? When a broker dies mid-publish, was the message stored? When a consumer crashes mid-processing, who sees that message again? Every choice here becomes a contract that hundreds of downstream teams build correctness on top of, so vague answers are expensive.</p><p>Design the storage layout, the replication and acknowledgment protocol, consumer groups with offset management and rebalancing, and the delivery-guarantee story from producer to consumer. Assume topics range from 100 messages/day to 500,000/second, retention up to 7 days, and messages of ~1 KB median.</p>",
      clarifying: [
        "Is ordering required globally per topic, or is per-key/per-partition ordering sufficient? (Per-partition; global ordering is explicitly not offered.)",
        "What delivery guarantee do consumers need — at-least-once with idempotent handlers, or true end-to-end exactly-once?",
        "Retention model: time-based deletion, size caps, or compaction (keep latest per key)? (Time and size; compaction as a follow-up.)",
        "Can consumers replay from arbitrary offsets, or only consume forward from a subscription point?",
        "How many consumer groups may attach to one high-volume topic, and do they multiply read fan-out?",
        "What is the tolerable publish latency budget (p99), and do producers need synchronous durable acks?",
        "Are poison messages expected — do we need dead-letter queues as a first-class feature?"
      ],
      functional: [
        "Publish to a topic with an optional partition key; messages with the same key are strictly ordered relative to each other.",
        "Durable storage with per-topic retention (up to 7 days / configurable size cap); consumers can rewind to any retained offset.",
        "Consumer groups: partitions divide among group members; each message is delivered to one member per group; groups are independent.",
        "Producers choose ack level: fire-and-forget, leader-acked, or replicated-acked.",
        "Automatic rebalance on consumer join/leave/failure, with offsets committed per group per partition.",
        "Dead-letter routing after N failed deliveries, with the original topic/offset/error attached."
      ],
      nonfunctional: [
        "Sustain 500k msg/s on the largest topic (~500 MB/s ingest) with publish p99 under 20 ms at replicated-ack level.",
        "No acknowledged message is ever lost across any single broker or AZ failure (replication factor 3, majority ack).",
        "Consumer group rebalance completes within 10 s, and only affected partitions pause — not the whole group.",
        "End-to-end delivery is at-least-once by default; duplicates are bounded and flagged, never silent design accidents.",
        "A slow consumer group must not degrade producers or other groups on the same topic (reads are independent of writes)."
      ],
      estimation: {
        prompts: [
          "Convert 500k msg/s at 1 KB into ingest bandwidth, replicated write bandwidth, and 7-day storage for the big topic.",
          "How many partitions does the big topic need if one partition sustains ~30 MB/s, and what does that imply for max group parallelism?",
          "With 4 consumer groups on the big topic, what is total read bandwidth, and when does page cache stop saving you?",
          "Estimate offset-commit write load: 500 groups x 200 partitions committing every second.",
          "What lag (in time and bytes) accumulates if a group processing 500k msg/s stalls for 10 minutes?"
        ],
        worked: "<p>Bandwidth and storage first. 500k msg/s x 1 KB = ~500 MB/s ingest; replication factor 3 makes it 1.5 GB/s of cluster write bandwidth. Storage for 7 days: 500 MB/s x 604,800 s = ~300 TB x3 replicas = ~900 TB for one topic — sequential disk, not exotic, but a real fleet.</p><pre>Ingest: 500k x 1 KB               = 500 MB/s  (x3 repl = 1.5 GB/s writes)\nRetention: 500 MB/s x 604,800 s   = ~300 TB logical, ~900 TB replicated\nPartitions: 500 MB/s / 30 MB/s    = ~17 -> provision 60 (headroom + max\n  consumer parallelism: a group can use at most 60 concurrent members)\nReads: 4 groups x 500 MB/s        = 2 GB/s read + 1.5 GB/s write; tail\n  readers ride page cache (~free); a replaying group hits disk cold\nStall math: 10 min outage         = 300M messages, 300 GB of lag;\n  catch-up at 2x consume rate     = another 10 min to drain\nOffset commits: 500 x 200 x 1/s   = 100k tiny writes/s -> must be a log\n  itself (compacted), never a per-commit DB row</pre><p>Three design facts fall out: partition count is chosen for consumer parallelism headroom, not just write throughput, and changing it later breaks key-ordering — so over-provision up front. Tail consumers are nearly free (page cache) while replay consumers are disk-bound — so replay needs its own I/O lane or it wrecks tail latency. And offset commits are themselves a high-volume stream, which is why they belong in an internal compacted topic rather than an external store.</p>"
      },
      model: {
        highlevel: "<p>The storage primitive is an append-only partitioned log. A topic is P partitions; each partition is a totally-ordered, immutable sequence of messages identified by a monotonic offset, stored as segment files on disk. Brokers host partitions; each partition has one leader taking all reads and writes and two followers replicating the log. Consumption is pull-based: consumers read from an offset they own, so the broker stays stateless about delivery — it stores bytes and serves ranges, and everything hard about delivery lives in offsets.</p><pre>producers --(key -> partition)--> partition leader --append--> segment files\n                                      | replicate                (page cache,\n                              followers (ISR)                    sequential IO)\nconsumers (group G) --fetch(partition, offset)--> leader\n         \\-- commit(G, partition, offset) --> internal __offsets log (compacted)\ncontrol plane (consensus): topic metadata, leader election, ISR tracking,\n                           group coordination (membership, partition assignment)</pre><p>Durability is majority-style: a publish at replicated-ack level is acknowledged only when all in-sync replicas have it; a leader that loses its ISR quorum stops accepting acked writes rather than lying. Ordering is promised per partition only — the produce path hashes the message key to a partition, so per-key order holds — and the product documentation says in bold that cross-partition order does not exist, because half of all queue misuse traces back to imagining it does.</p>",
        data: "<p></p><pre>Produce  {topic, key?, payload, acks: 0|1|all} -> {partition, offset} | error\nFetch    {topic, partition, offset, max_bytes} -> [messages], high_watermark\nCommit   {group, topic, partition, offset}     -> OK\nJoinGroup/Heartbeat/LeaveGroup                 (group membership protocol)\nSeek: a consumer may fetch any retained offset (replay is just a fetch)\n\nOn disk per partition:\n  segments/  00000000000000.log   (append-only; message: offset, ts, key_len,\n             00000524288000.log    key, len, crc32, payload)\n  index/     sparse offset->file-position index per segment (binary search)\n  retention: delete whole segments past time/size limits (never rewrite)\n\nInternal topics:\n  __offsets   key=(group,topic,partition) value=offset  (log-compacted)\n  __dlq.<topic>  message + {origin_partition, origin_offset, attempts, error}</pre><p>Segment-file deletion is why retention is cheap: expiry drops whole files, never rewriting live data. The sparse index keeps lookup O(log segments + small scan) while staying tiny enough to memory-map.</p>",
        deepdives: "<p><b>The guarantee ladder, honestly.</b> At-least-once is the natural physics: a producer retrying an ambiguous timeout may duplicate; a consumer crashing between processing and commit reprocesses. Producer-side dedup fixes the first: each producer session gets an ID and per-partition sequence numbers, and the leader discards duplicates idempotently — cheap, always on. The consumer side is where 'exactly-once' claims go to die: the queue cannot know whether your side effect happened. What we can offer is transactional consume-process-produce <i>within the system</i> (offsets committed atomically with output messages, so stream pipelines are effectively-once), plus a documented pattern for external effects: consumers store the (partition, offset) with their side effect and dedupe on redelivery. The docs draw this boundary in ink — inside the system: effectively-once available; across the boundary: your handler must be idempotent.</p><p><b>Rebalancing without stopping the world.</b> Naive rebalance revokes every partition from every member, then reassigns — a hiccup of one consumer freezes the whole group. Instead: sticky incremental rebalance. The group coordinator computes the minimal diff between current and target assignment; only partitions that actually move are revoked, everything else keeps flowing. A joining member picks up only its new partitions; a leaving member's partitions redistribute. Combined with a session timeout tuned against processing pauses (and a separate poll-liveness check so a slow handler is distinguished from a dead process), the 10 s rebalance SLO covers only the moved partitions.</p><p><b>Failover without losing acked data.</b> Leader dies: the control plane elects a new leader from the ISR — replicas known to have every acked message. The subtle rules: a follower that fell behind is out of the ISR and ineligible (electing it would silently truncate acked messages); if the ISR is empty, the partition goes offline rather than electing a stale replica, because unavailability is visible and data loss is not (a per-topic 'availability over durability' override exists for tenants who truly prefer it). The high-watermark (highest offset replicated to all ISR) bounds what consumers may read, so an un-replicated tail can never be observed and then vanish.</p>",
        tradeoffs: "<p><b>Pull vs. push consumption:</b> push gives lower idle latency but forces the broker to track per-consumer state and manage backpressure for thousands of heterogeneous consumers. Pull inverts control — consumers go at their own speed, replay is trivial, the broker stays a byte-server — at the cost of poll overhead, mitigated with long-poll fetches (block up to 500 ms until data). For a durable log with replay as a feature, pull wins and it is not close.</p><p><b>Partition count is a one-way door:</b> more partitions mean more parallelism but more open files, more replication channels, slower leader elections, and worse batching (500 MB/s over 600 partitions is thin per-partition traffic). Repartitioning breaks per-key order across the boundary. Resolution: over-provision to expected max parallelism (60 for the big topic), document repartitioning as a migration (new topic, dual-write, cutover), and resist per-key-unlimited-parallelism requests — that product is a different queue.</p><p><b>Slow-group isolation:</b> reads and writes share disks; a cold replaying group can evict page cache that tail readers depend on. Bound it with fetch-lane QoS: tail fetches (near high-watermark) get priority I/O; historical fetches are throttled per group. The bottleneck under growth is almost always replication bandwidth on hot-partition leaders — watch per-broker leader-byte balance, not just partition counts.</p>",
        scaling: "<p><b>1x (small org, 50 topics, 10 MB/s):</b> 3 brokers, replication 3, the control plane colocated. The full protocol (ISR, groups, offsets) exists from day one — the guarantees are the product; scale is just how many machines enforce them.</p><p><b>10x (500 MB/s aggregate, hundreds of groups):</b> the design as described: dedicated control-plane nodes, sticky rebalancing, fetch QoS lanes, DLQs. Operational maturity becomes the work: partition-balance automation (move leaders off hot brokers), quota enforcement per producing tenant, lag-based alerting as a first-class tenant metric.</p><p><b>100x (tens of GB/s, thousands of tenants):</b> two structural shifts. First, tiered storage: segments older than hours offload to object storage with brokers serving them through a read cache — 7-day retention stops dictating fleet size, and replay of history stops competing with tail I/O at the disk layer. Second, cells: multiple independent clusters behind a routing/metadata layer, because a single cluster's control plane (leader elections, rebalance storms, metadata fan-out) becomes the blast radius of every incident. Cross-region: async mirroring with per-topic policies — offsets do not translate across regions, so mirrored consumers track positions by timestamp or mirror-markers, and the docs say so plainly.</p>"
      },
      followups: [
        "Add log compaction (retain latest value per key) — what changes in storage, and which consumer assumptions break?",
        "A tenant demands strict global ordering for one topic at 100k msg/s. What do you offer, and what do you refuse?",
        "Design delayed/scheduled delivery (visible in 15 minutes) on top of the log model without per-message timers.",
        "Two consumers in one group both processed offset 41,532 during a rebalance. Reconstruct how, and what bounds it.",
        "Add per-tenant encryption at rest with tenant-managed keys — where do you draw the decryption boundary?",
        "How would you migrate a 60-partition topic to 120 partitions for a tenant whose keys must stay ordered?"
      ],
      rubric: {
        senior: [
          "Grounds the design in an append-only partitioned log with offsets, segments, and whole-segment retention.",
          "Scopes ordering to partitions via key hashing and states clearly that global order is not offered.",
          "Designs ISR-style replication where acked writes survive any single failure and stale replicas cannot be elected.",
          "Keeps consumption pull-based with group-owned offsets in a compacted internal log, making replay trivial.",
          "Derives partition count from both throughput and max consumer parallelism, noting repartitioning breaks key order.",
          "Includes DLQs with origin metadata and producer-side idempotent dedup as defaults."
        ],
        staff: [
          "Draws the exactly-once boundary precisely: effectively-once inside the system, idempotent handlers required across it.",
          "Designs incremental sticky rebalancing and separates session-liveness from processing-liveness.",
          "Chooses unavailability over silent truncation on ISR collapse and can defend it to a paged SRE.",
          "Isolates replay from tail consumption via I/O QoS, having done the page-cache math.",
          "Evolves to tiered storage and cells at 100x, and explains why control-plane blast radius forces cells."
        ]
      }
    },
    {
      slug: "full-text-search",
      name: "Design a Full-Text Search Service",
      category: "System Design",
      difficulty: "Hard",
      minutes: 45,
      summary: "Inverted index over 2B docs: ingestion pipeline, sharded retrieval, two-stage ranking.",
      statement: "<p>Design a full-text search service for a large content platform: 2 billion documents (articles, listings, posts averaging ~5 KB of text), updated at 3,000 documents/second, searched at 25,000 queries/second. A query is a handful of free-text terms plus optional filters; the result is a ranked page of matching documents, with new and edited documents searchable within about 30 seconds.</p><p>The center of gravity is the inverted index — the structure that maps each term to the list of documents containing it — and the pipeline that keeps it fresh while queries hammer it. Around that sit tokenization and analysis, sharded retrieval with scatter-gather, and relevance ranking under a tight latency budget.</p><p>Note how this differs from the autocomplete/typeahead problem: there you retrieve completions of a <i>prefix of a query string</i> from a small, precomputed vocabulary, and can precompute every answer. Here you retrieve <i>documents by the tokens they contain</i>, the corpus is orders of magnitude larger than any query log, answers cannot be precomputed per query, and ranking is computed at request time. Keep that contrast in mind; the deepdives ask you to make it precise.</p>",
      clarifying: [
        "What query features are required: phrase queries, boolean operators, fuzzy matching, or just free-text AND/OR of terms?",
        "What is the freshness SLO for creates, edits, and deletes — and are deletes (takedowns) held to a stricter bar?",
        "How deep do users paginate, and is exact total-hit-count required or is an estimate acceptable?",
        "What languages must the analyzer support, and is stemming/synonym expansion in scope at query time, index time, or both?",
        "Is relevance purely text-based (BM25-class), or do document quality/recency signals join the ranking?",
        "What filter dimensions exist (category, date, geo), and how selective are they typically?",
        "Multi-tenant or one corpus? Can one tenant's pathological queries be isolated?"
      ],
      functional: [
        "Index create/update/delete of documents, searchable within 30 s (deletes suppressed from results within 5 s via a tombstone filter).",
        "Free-text queries with implicit AND, quoted phrases, and structured filters (category, date range) combined with text matching.",
        "Two-stage ranking: cheap lexical scoring (BM25-family) for retrieval, richer feature scoring for the top candidates.",
        "Pagination to a bounded depth (e.g., 1,000 results) with an estimated total-hit count.",
        "Per-language analysis: tokenization, lowercasing/folding, stemming; identical analyzer applied at index and query time.",
        "Bulk reindex of the full corpus (analyzer or schema changes) without downtime or a freshness gap."
      ],
      nonfunctional: [
        "Query p99 under 300 ms end-to-end at 25k QPS, including scatter-gather across all shards.",
        "Ingest 3,000 docs/s sustained (~15 MB/s of text) while serving queries with no p99 cliff during segment merges.",
        "Index availability 99.95%; a single node or AZ loss degrades capacity, never correctness or coverage.",
        "Freshness: 30 s p99 from write-accepted to searchable; delete suppression within 5 s.",
        "Full reindex of 2B docs completes within 48 hours running alongside live traffic."
      ],
      estimation: {
        prompts: [
          "Estimate inverted-index size for 2B docs x ~5 KB: postings per document, bytes per posting after compression.",
          "How many shards keep per-shard query work within a ~150 ms retrieval budget, and what does 25k QPS x all-shards fan-out cost in shard-queries/sec?",
          "What indexing throughput per node is needed to sustain 3,000 docs/s, and to reindex 2B docs in 48 h?",
          "Estimate the p99 impact of scatter-gather: with 40 shards, how does per-shard p99 relate to query p99?",
          "Size the doc store (forward index) needed for snippets and re-ranking features."
        ],
        worked: "<p>Index size drives shard count. ~5 KB of text is ~800 tokens, ~400 distinct terms per doc, so 2B docs produce ~800B postings. A compressed posting (delta-encoded doc ID + positions for phrase support) averages ~6 B with positions, so ~5 TB of postings; dictionaries, skip lists, and norms push the searchable index to ~7 TB, and the doc store (compressed originals + ranking features) adds ~10 TB x replication.</p><pre>2B docs x ~400 postings      = 8e11 postings\n8e11 x ~6 B (compressed+pos) = ~5 TB postings -> ~7 TB index total\nShards: 7 TB / ~150 GB/shard (fits hot working set in RAM per node)\n  = ~48 -> choose 48 shards x 3 replicas = 144 index-serving nodes\nFan-out: 25k QPS x 48 shards = 1.2M shard-queries/s\n  / 144 nodes = ~8.3k shard-queries/s per node -- the REAL serving load\nIngest: 3,000 docs/s / 48    = ~63 docs/s/shard (light)\nReindex: 2e9 / 172,800 s     = ~11.6k docs/s pipeline rate = 4x live rate\n  -> reindex needs its own worker fleet, not spare live capacity</pre><p>The line that matters most: fan-out multiplies 25k user queries into 1.2M shard-queries/s. Every query touches every shard, so per-shard efficiency and tail control dominate the design — and p99 of the max of 48 samples is far worse than any single shard's p99, which is why tail-hedging appears in the model rather than as an afterthought.</p>"
      },
      model: {
        highlevel: "<p>Three planes. The <b>ingestion plane</b>: writes land in a durable log, indexer workers per shard consume it, analyze documents, and build small immutable index segments that are published to searchers every few seconds, with background merges compacting small segments into large ones. The <b>serving plane</b>: document-sharded index nodes (each holding full postings for its document subset) behind aggregators that scatter queries to one replica of every shard and merge ranked results. The <b>ranking plane</b>: stage one on the shards (BM25 over postings, top-200 per shard), stage two on the aggregator (feature-based re-ranking of the merged top ~500 using the doc store).</p><pre>writes -> ingest log -> analyzer/indexer (per shard) -> immutable segments\n                                              |  publish every ~5 s   + merges\nquery -> aggregator --scatter--> 48 shards (1 replica each): match + BM25\n            ^   <--top-200/shard-- |\n            +-- merge -> re-rank top 500 (doc store features) -> page 1</pre><p>Document-sharding (vs. term-sharding) is the load-bearing choice: every shard evaluates the whole query locally over its documents, so multi-term intersection never crosses the network; the cost is full fan-out per query, which the estimation shows is affordable and the tail-hedging machinery makes safe. Immutable segments are the second pillar: searchers never lock, updates are new segments plus tombstones, and merges are the price — paid off the query path with I/O throttles.</p>",
        data: "<p></p><pre>POST /v1/docs {doc_id, tenant, fields{title, body, category, ts, ...}} -> 202\nDELETE /v1/docs/{id}                                   -> 202 (tombstone, <=5 s)\nGET  /v1/search?q=noise+cancelling+headphones&filter=category:audio\n     &page=1 -> {hits:[{doc_id, score, snippet}], est_total, took_ms}\n\nPer-shard segment (immutable):\n  term dictionary: FST/trie term -> postings pointer\n  postings: [doc_id delta, term_freq, positions[]] block-compressed, skip lists\n  doc values: columnar per-doc fields (category, ts) for filters/facets\n  norms: per-doc field lengths for BM25\n  live_docs bitmap: tombstones applied at read time\nDoc store (separate KV): doc_id -> {stored fields, ranking features, snippet src}</pre><p>Filters execute as bitmap intersections over columnar doc values before scoring, so a selective filter (category:audio, 2% of docs) cuts scoring work 50x — the order of operations (filter, then match, then score) is a stated part of the design, not an implementation accident.</p>",
        deepdives: "<p><b>Contrast with typeahead, made precise.</b> Typeahead is <i>prefix retrieval over queries</i>: the key space is prefixes of a small vocabulary (~hundreds of millions of strings), the answer set per key is tiny and rank-stable for hours, so you precompute <code>prefix -> top-10</code> offline and serving is a hash lookup — O(1), no runtime ranking, freshness in hours patched by an overlay. Full-text search is <i>token retrieval over documents</i>: keys are analyzed terms, values are postings lists with millions of entries, and the answer depends on the <i>combination</i> of terms in the query — the set of possible queries is combinatorial, so precomputing answers is impossible and every request pays retrieval (postings intersection) plus scoring at runtime. Concretely: typeahead moves essentially all work to write time; search must split work — analysis at write time, intersection and ranking at read time — and that is why search needs sharding, fan-out, and tail control while typeahead needs none of them. The two systems share exactly one component-shape (a dictionary structure over strings) and nothing else; a candidate who proposes 'a trie over documents' has ported the wrong mental model.</p><p><b>Tail latency under 48-way fan-out.</b> If each shard's p99 is 150 ms, the max over 48 independent shards blows the query p99 badly (P(all &lt; t) = p^48 — you effectively experience each shard's p99.98). Controls: hedged requests (if a shard replica hasn't answered by its p95, fire the same sub-query at a second replica and take the first answer — bounding hedges to ~5% extra load); per-shard soft deadlines with partial-results-and-flag beyond them; and replica load-aware routing at the aggregator. This machinery is not optional polish; the fan-out math makes it the difference between 300 ms and multi-second p99s.</p><p><b>Merges vs. freshness vs. query cost.</b> Publishing every ~5 s creates many small segments; query cost grows with segment count (every segment's dictionary is consulted), so merging must keep per-shard segment counts in the tens. But merges are I/O-heavy rewrites that can wreck p99 if unthrottled. Tiered merge policy (merge peers of similar size; cap merge concurrency; throttle merge I/O to a byte-rate that leaves query I/O headroom) plus scheduling large merges into low-traffic windows. Deletes ride tombstone bitmaps until merges physically drop them; the 5 s takedown SLO is met by the bitmap, not by rewriting, which is what makes it cheap.</p>",
        tradeoffs: "<p><b>Document-sharding vs. term-sharding:</b> term-sharding sends each query only to shards owning its terms — less fan-out — but multi-term intersection then ships postings lists across the network (a common term's list is gigabytes), and hot terms create unfixable shard hotspots. Document-sharding pays full fan-out to keep intersection local and load naturally balanced. For interactive search with multi-term queries, document-sharding wins; term-sharding survives only in systems doing single-term lookups.</p><p><b>Index-time vs. query-time expansion:</b> stemming and synonyms applied at index time bloat the index and freeze linguistics into every segment (a synonym change means reindexing); applied at query time they multiply query terms and add latency. Chosen: aggressive normalization (case/accents) at index time — it is stable — and synonyms at query time, accepting ~1.3x average term expansion, so linguistics can ship weekly without touching 7 TB of index.</p><p><b>Snippet generation:</b> highlighting requires positions or stored text; storing positions costs ~40% index size (already in the 6 B/posting estimate) but makes phrase queries and highlighting index-native. The alternative (re-analyze stored docs at query time for the top 10) trades CPU for index size and is the right call only when phrase search is not required — we need phrases, so we pay for positions. Bottleneck honesty: the aggregator's stage-two re-rank (500 doc-store fetches per query at 25k QPS = 12.5M KV reads/s) is the hidden hot path; it needs its own aggressively-cached tier and is capped by re-ranking depth, which is a relevance-vs-cost dial the search team owns explicitly.</p>",
        scaling: "<p><b>1x (20M docs, 250 QPS):</b> one node holds the whole ~70 GB index; the architecture is a single process plus an ingest log. Use an off-the-shelf engine and spend the team on analyzers and relevance — the distributed machinery earns nothing at this size, and relevance quality is where small search products win or die.</p><p><b>10x (2B docs, 25k QPS):</b> the design as described: 48 shards x 3 replicas, hedged scatter-gather, tiered merges, query-time synonyms, two-stage ranking. Reindex-alongside-live becomes routine machinery: build v2 segments shard-by-shard from the log's full history into a parallel index generation, dual-serve briefly for comparison, flip an alias.</p><p><b>100x (20B+ docs, 250k QPS):</b> three shifts. Replicas scale reads, so QPS growth means wider replica fans per shard with the aggregator tree going two-level (regional aggregators under a root) to keep fan-in bounded. Corpus growth forces index tiering by document temperature: the newest/most-retrieved slice serves from RAM/NVMe-class nodes while the cold majority serves from cheaper storage with relaxed latency, because 300 ms p99 over the full 20B is no longer economically honest — and the product agrees most queries want recent-and-popular anyway. And relevance becomes the org: stage-two grows into a learned ranker with feature logging and online experiments, at which point index serving is the stable substrate and ranking iteration velocity is the actual product race.</p>"
      },
      followups: [
        "Add faceted navigation (counts per category alongside results) — where do facet counts compute, and what do they cost at 48-way fan-out?",
        "Add vector/semantic retrieval as a second candidate source — how do lexical and vector candidates merge before stage-two ranking?",
        "A reindex with a new analyzer must not mix old-analyzer and new-analyzer segments in one query. Design the cutover.",
        "One tenant's wildcard-heavy queries are burning 30% of cluster CPU. Design per-tenant query cost governance.",
        "Legal requires a document to be unfindable within 60 seconds globally, including cached result pages. Trace the path.",
        "How would you measure and improve relevance systematically — what is your offline metric, and what do you log online?"
      ],
      rubric: {
        senior: [
          "Builds the inverted index concretely: dictionary, compressed postings with positions, doc-values for filters, tombstone bitmaps.",
          "Chooses document-sharding over term-sharding and explains the intersection-locality argument.",
          "Designs near-real-time indexing with immutable segments, periodic publish, and throttled tiered merges.",
          "Applies the same analyzer at index and query time and can say which linguistics belong at which time.",
          "Structures ranking in two stages with explicit candidate depths and knows what stage two costs the doc store.",
          "Handles deletes via tombstones to meet a takedown SLO without rewriting segments."
        ],
        staff: [
          "Does the fan-out math (25k QPS -> 1.2M shard-queries/s) and designs hedging/partial-results because of it, not as a checklist item.",
          "Articulates the typeahead contrast precisely: precomputable prefix->top-k versus runtime token intersection, and why the corpus/query-combinatorics force it.",
          "Designs zero-downtime full reindex as parallel index generations with alias cutover, sized as its own fleet.",
          "Treats merge I/O as a managed budget competing with query I/O, with a stated throttling policy.",
          "Frames re-rank depth and index tiering as explicit cost-versus-relevance dials owned by the team, with the 100x economics reasoned through."
        ]
      }
    }
  );
})();
