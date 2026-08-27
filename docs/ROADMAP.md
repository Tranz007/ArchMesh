# Roadmap

The roadmap is organized around product capability, not calendar promises. Sequence can change as real codebases expose what matters most.

The release boundary is defined in [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md). Work that does not close a v0.1 release gate should not delay v0.1.

## Slice 1 — Local visual architecture

Status: **complete baseline**

Delivered:

- local TypeScript/JavaScript scanning;
- exact file/import graph;
- Sigma.js interactive graph;
- search and inspection;
- selectable nodes and connections;
- health-aware node/edge schema;
- errors-only visualization;
- project documentation and agent guardrails;
- clean CI validation and self-scan.

## Slice 2 — Make the graph architectural, not just structural

Status: **substantial baseline delivered**

Delivered:

- TypeScript path alias resolution;
- stronger Next.js App Router semantics;
- page/API route paths and HTTP methods;
- server-action recognition;
- product/feature grouping through configuration and detection;
- Architecture view and feature drill-down;
- richer directional inspector;
- explicit provenance for configured versus detected feature semantics;
- feature/product change-state aggregation from exact source impact.

Remaining before or near v0.1:

- source-editor navigation;
- workspace/package resolution where needed for common monorepos;
- large-repository progressive detail;
- measured layout stability/performance improvements.

## Slice 3 — Data and integration topology

Status: **working baseline delivered**

Delivered:

- Firebase/Firestore collection discovery;
- read/write/listener relationships;
- generic internal and external HTTP/fetch relationships;
- dedicated Topology view;
- first-class Firebase, Stripe, OpenAI, WorkOS, Resend, Vercel, and HTTP-host nodes.

Post-baseline expansion:

- richer Stripe webhook/billing semantics;
- WorkOS/Resend/OpenAI-specific operation semantics;
- Firebase Auth/Storage/Functions topology;
- additional evidence/provenance metadata for semantic adapters.

These enrichments should not delay v0.1 unless representative repositories show the baseline topology is not useful without them.

## Slice 4 — Change impact

Status: **working baseline delivered**

Delivered:

- Git working-tree change ingestion;
- Git base-ref comparisons;
- separate `changed` and `affected` state;
- reverse-dependency traversal;
- dedicated Changes view;
- change-state inspector explanations;
- feature-level and product-level change aggregation;
- changed/affected member counts;
- cross-feature relationship change propagation;
- health remains independent from change state.

Remaining:

- bounded traversal controls if large-repo testing proves necessary;
- persisted graph comparisons across commits/snapshots;
- richer Git status/commit context;
- change history and change-to-failure correlation.

Persisted history is post-v0.1 unless needed to satisfy core usability testing.

## Slice 5 — Local health

Status: **working baseline delivered**

Delivered:

- generic health-signal schema and loader;
- TypeScript compiler diagnostics;
- direct `error` versus propagated `impacted` paths;
- selectable red connections;
- source/message/time evidence in inspector;
- evidence preservation through graph projections;
- errors-only workflow backed by real signals.

Remaining before/near v0.1:

- at least one representative test/build failure adapter if needed to validate the general health contract;
- stronger error-state UX and fixtures across supported workflows.

Later adapters:

- browser/runtime development errors;
- failed local HTTP request ingestion;
- lint/static-analysis warnings where materially useful.

## Slice 6 — Live architecture

Status: **working baseline delivered**

Delivered:

- recursive local file watching;
- debounced and serialized rebuilds;
- generated/vendor path filtering;
- shared graph-build pipeline;
- viewer updates without a full page reload;
- active graph view preserved across refreshes;
- node/edge selection preserved when identity still exists;
- graph-to-graph architecture drift between consecutive successful scans;
- separate `added`, `removed`, `modified`, and `stable` drift states;
- dedicated Drift view with one-hop stable context;
- removed historical nodes/connections preserved as selectable ghost entities;
- local drift output reset at watch-session start;
- structural drift fingerprints that ignore health/change overlays.

Remaining before v0.1:

- benchmark watch performance on representative repositories;
- implement incremental scanning/content hashing/graph deltas only to the extent needed to meet the documented performance target;
- validate watch behavior on supported operating systems.

Later:

- animation/highlighting across refreshes;
- persisted snapshot history and recent-change timeline.

## Slice 7 — Portable developer tool

Status: **required for v0.1**

Goals:

- package/CLI experience approaching `npx archmesh .`;
- ordinary use without cloning the ArchMesh repository;
- clear first-run failures and help output;
- documented package/versioning flow;
- clean-install smoke test;
- supported Node-version policy;
- operating-system compatibility checks;
- public sample/fixture repository for end-to-end validation.

## Slice 8 — Release usability and scale

Status: **required for v0.1**

Goals:

- source-editor navigation from scanned entities;
- representative small/medium/large repository benchmarks;
- progressive detail that avoids an unusable default file hairball;
- stable identity/layout checks across rescans;
- narrow viewport and accessibility review of all primary views;
- end-to-end fixture covering Architecture, Topology, Changes, Drift, Code, and Health;
- README/install docs verified from a clean environment.

## Post-v0.1 platform work

These are deliberately outside the first release boundary unless user evidence changes the decision:

- production telemetry connectors;
- Vercel/Firebase/PostHog/Stripe/OTel hosted integrations;
- collaboration/team annotations;
- cross-repository/system graphs;
- architectural policy/rule enforcement;
- MCP tools for AI coding agents;
- natural-language graph filtering;
- generated architecture summaries;
- desktop packaging;
- optional collaboration/server mode;
- broad language/framework coverage.

## Near-term v0.1 sequence

1. Package the CLI so ArchMesh can run without cloning this repository.
2. Add source-editor navigation from the inspector.
3. Build a representative end-to-end fixture and smoke-test path.
4. Add cross-platform CI/support validation.
5. Benchmark scan/watch performance and implement incremental invalidation where measurements require it.
6. Improve progressive detail/layout stability on larger repositories.
7. Validate accessibility and all primary empty/error states.
8. Cut v0.1 when the gates in `DEFINITION_OF_DONE.md` are satisfied.

The release decision should be gate-driven, not roadmap-length-driven.
