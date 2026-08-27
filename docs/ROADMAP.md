# Roadmap

The roadmap is organized around product capability, not calendar promises. Sequence may change as the first real codebases expose what matters most.

## Slice 1 — Local visual architecture

Status: in progress

Goals:

- local TypeScript/JavaScript scan;
- file/import graph;
- initial Next.js/common-role classification;
- known integration nodes;
- Sigma.js interactive graph;
- search;
- node inspector;
- health-aware node/edge schema;
- errors-only visualization using sample health states;
- project documentation and agent guardrails.

## Slice 2 — Make the graph architectural, not just structural

Goals:

- path alias/workspace resolution;
- stronger Next.js App Router semantics;
- React component relationships;
- product/feature grouping through configuration and detection;
- clustering and progressive levels of detail;
- improved graph layout stability;
- richer inspector with inbound/outbound grouping;
- navigation from graph entity to source file.

## Slice 3 — Data and integration topology

Goals:

- Firebase collection/read/write/listener relationships;
- generic HTTP/fetch relationships;
- Stripe webhook/billing flows;
- WorkOS/Resend/OpenAI semantic adapters;
- clear evidence/provenance on inferred versus detected relationships;
- integration-focused graph mode.

## Slice 4 — Change impact

Goals:

- Git diff ingestion;
- changed-node highlighting;
- upstream/downstream traversal;
- bounded blast-radius view;
- “show what this change touches” workflow;
- comparison of graph state across commits/scans.

## Slice 5 — Local health

Goals:

- compiler/build errors mapped to graph entities;
- test failures mapped to graph entities;
- browser/runtime development errors;
- failed local API calls;
- direct `error` versus propagated `impacted` paths;
- error inspector with source/message/time/evidence;
- errors-only workflow backed by real signals rather than demo data.

## Slice 6 — Live architecture

Goals:

- file watching and incremental graph updates;
- stable identities/layout across rescans;
- architecture-change highlighting;
- recent-change timeline;
- correlation of change → first failure → impacted path.

## Slice 7 — Optional production telemetry

Goals:

- pluggable runtime event interface;
- optional Vercel/Firebase/PostHog/Stripe/OTel adapters;
- configurable retention/history;
- no requirement for a hosted ArchMesh backend.

## Slice 8 — Portable developer tool

Goals:

- package/CLI experience approaching `npx archmesh .`;
- first-run project setup;
- configurable `.archmesh/` project semantics;
- adapter/plugin contracts;
- public sample projects and fixtures;
- installation/update documentation;
- performance work for large repositories.

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
