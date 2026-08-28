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
- feature/product change-state aggregation from exact source impact;
- source-editor navigation from scanned source nodes through the local launcher.

Remaining before or near v0.1:

- workspace/package resolution where needed for common monorepos;
- large-repository progressive detail;
- measured layout stability/performance improvements.

## Slice 2.5 — Codebase breadth and framework adapters

Status: **cross-framework structural baseline exists; validation expansion required for v0.1**

Delivered:

- first-class scanning of `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, and `.cjs` source;
- generic import/dependency architecture usable across many JavaScript/TypeScript repository shapes;
- generic component/service/data classification by convention;
- shared static `fetch()` and integration evidence independent of Next.js;
- Deep Next.js App Router semantics layered on top of the shared source graph;
- explicit public support tiers: Deep, Structural, Partial, and Planned;
- public [`SUPPORT_MATRIX.md`](SUPPORT_MATRIX.md) describing current behavior and gaps.

Required before v0.1:

- representative fixture/e2e validation for **Next.js** as a Deep path;
- representative fixture/e2e validation for **React + Vite**, **Angular**, and a **Node.js service** as distinct Structural paths;
- correct any generic scanner assumptions those repositories expose;
- verify partial stacks fail gracefully when primary framework file formats are unsupported;
- promote support levels only when fixtures or representative repositories prove the claim.

High-priority JavaScript/TypeScript adapters after the structural baseline is proven:

- Angular Router, standalone/NgModule metadata, dependency injection, templates, and `HttpClient`;
- Express/Fastify/Hono route and middleware semantics;
- NestJS controllers/modules/providers/DI/guards/interceptors;
- React Router/Vite application routing semantics;
- Expo Router/navigation and selected native-module boundaries;
- Vue/Nuxt SFC and routing/server semantics;
- Svelte/SvelteKit component and routing/server semantics;
- Astro components/islands/routing semantics;
- workspace/package architecture for npm/pnpm/Yarn, Nx, and Turborepo.

The scanner should evolve toward **language parser + framework adapters + shared graph model**, not a monolithic collection of framework special cases.

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

Status: **package foundation delivered; release identity pending**

Delivered:

- compiled Node CLI exposed as `archmesh`;
- `--help` and `--version`;
- source checkout and packaged CLI share the same option model;
- package contents/publish configuration;
- isolated OS-temporary runtime graph storage for installed use;
- package dry-run validation;
- tarball install into a clean temporary consumer project;
- installed compiled CLI smoke test.

Remaining for v0.1:

- finalize registry/package identity;
- publish the package;
- verify clean install from the actual registry package;
- supported Node-version policy beyond the current baseline;
- operating-system compatibility checks;
- public representative fixture/end-to-end validation.

## Slice 8 — Release usability and scale

Status: **required for v0.1**

Delivered:

- source-editor navigation from scanned entities;
- explicit Cursor / VS Code / Zed launcher preference with safe local path validation.

Remaining:

- representative small/medium/large repository benchmarks;
- progressive detail that avoids an unusable default file hairball;
- stable identity/layout checks across rescans;
- narrow viewport and accessibility review of all primary views;
- end-to-end fixtures covering the documented Deep and Structural codebase tiers plus Architecture, Topology, Changes, Drift, Code, Health, Security, Flow, and Trace;
- README/install docs verified from a clean environment and, after publish, the registry package.

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
- non-JavaScript/TypeScript language families and deeper framework adapters beyond the validated support matrix.

## Near-term v0.1 sequence

1. Build the multi-framework representative fixture suite: Next.js, React + Vite, Angular, and Node.js service shapes.
2. Fix generic scanner/resolution assumptions exposed by those fixtures and keep the public support matrix synchronized.
3. Add cross-platform CI/support validation.
4. Benchmark scan/watch performance and implement incremental invalidation where measurements require it.
5. Improve progressive detail/layout stability on larger repositories.
6. Validate accessibility and all primary empty/error states.
7. Finalize registry/package identity, publish, and verify clean installs against both Deep and Structural sample repositories.
8. Cut v0.1 when the gates in `DEFINITION_OF_DONE.md` are satisfied.

The release decision should be gate-driven, not roadmap-length-driven.
