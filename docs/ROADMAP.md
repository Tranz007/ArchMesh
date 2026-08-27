# Roadmap

The roadmap is organized around product capability, not calendar promises. Sequence can change as real codebases expose what matters most.

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

Remaining:

- stronger React component semantics beyond imports;
- workspace/package resolution;
- large-repository clustering and progressive levels of detail;
- source-editor navigation;
- further layout stability/performance work.

## Slice 3 — Data and integration topology

Status: **in progress**

Delivered:

- Firebase/Firestore collection discovery;
- read/write/listener relationships;
- generic internal and external HTTP/fetch relationships;
- dedicated Topology view;
- first-class Firebase, Stripe, OpenAI, WorkOS, Resend, Vercel, and HTTP-host nodes.

Remaining:

- richer Stripe webhook/billing semantics;
- WorkOS/Resend/OpenAI-specific operation semantics;
- Firebase Auth/Storage/Functions topology;
- additional evidence/provenance metadata for semantic adapters.

## Slice 4 — Change impact

Status: **working baseline delivered**

Delivered:

- Git working-tree change ingestion;
- Git base-ref comparisons;
- separate `changed` and `affected` state;
- reverse-dependency traversal;
- dedicated Changes view;
- change-state inspector explanations;
- feature-level change aggregation in Architecture view;
- product-level change aggregation;
- direct changed/affected member counts on feature nodes;
- cross-feature relationship change propagation;
- health remains independent from change state.

Remaining:

- bounded traversal controls;
- persisted graph comparisons across commits/snapshots;
- richer Git status/commit context;
- change history and change-to-failure correlation.

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

Remaining:

- test failure adapters;
- Next.js/Vite build-error adapters;
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
- viewer updates through a custom Vite event without a full page reload;
- active graph view preserved across refreshes;
- node/edge selection preserved when identity still exists;
- graph-to-graph architecture drift between consecutive successful scans;
- separate `added`, `removed`, `modified`, and `stable` drift states;
- dedicated Drift view with one-hop stable context;
- removed historical nodes/connections preserved as selectable ghost entities;
- local `archmesh-drift.json` output reset at watch-session start;
- structural drift fingerprints that ignore health/change overlays.

Remaining:

- incremental scanning instead of full rescans;
- content hashing and adapter-level invalidation;
- graph deltas instead of whole-graph replacement;
- architecture-change animation/highlighting across refreshes;
- persisted snapshot history and recent-change timeline.

## Slice 7 — Optional production telemetry

Status: **planned**

Goals:

- pluggable runtime event interface;
- optional Vercel/Firebase/PostHog/Stripe/OTel adapters;
- configurable retention/history;
- no requirement for a hosted ArchMesh backend.

## Slice 8 — Portable developer tool

Status: **planned / partially underway**

Goals:

- package/CLI experience approaching `npx archmesh .`;
- first-run project setup;
- `.archmesh/` project semantics and state;
- adapter/plugin contracts;
- public sample projects and fixtures;
- installation/update documentation;
- performance work for large repositories.

## Near-term priorities

1. Incremental scanning, content hashing, and graph deltas for watch mode.
2. Large-repository progressive disclosure and layout stability.
3. Source-editor navigation from graph entities.
4. More useful platform semantics for Firebase, Stripe, OpenAI, WorkOS, and Resend.
5. Test/build/browser/runtime health adapters.
6. Persisted snapshots, Git history, and change-to-failure correlation.
7. Performance testing on genuinely large repositories.
8. Packaging toward a one-command install/run experience.

## Later possibilities

These are ideas, not commitments:

- cross-repository/system graphs;
- team annotations;
- architectural rules and drift detection;
- MCP tools for AI coding agents;
- natural-language graph filtering;
- generated architecture summaries/diagrams;
- desktop packaging;
- optional collaboration/server mode.

The core local visual experience should remain useful even if none of these are built.
