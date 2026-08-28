# Changelog

All notable changes to ArchMesh will be documented here.

ArchMesh is pre-1.0 and its architecture may evolve quickly. Entries should still describe user-visible behavior and graph/schema changes clearly.

## Unreleased

### Added

#### Visual architecture

- Local-first React/Vite architecture viewer.
- Sigma.js + Graphology graph rendering with ForceAtlas2 layout.
- Architecture, Topology, Changes, Drift, and Code views.
- Search, node inspection, directional dependency inspection, and selectable graph connections.
- Feature drill-down that reveals exact implementation without expanding unrelated product areas.
- Errors-only filtering.

#### Focused understanding and explanation

- Detected architecture Scenes that isolate meaningful integrations, product areas, routes/APIs, data entities, services, and other strong graph seeds.
- Local saved views backed by stable graph identities and browser storage.
- Scene direction and depth controls for bounded architectural context.
- Multi-depth inbound, outbound, and bidirectional Trace.
- Evidence-backed shortest-path finding between known graph entities, with explicit no-path states.
- Deterministic “Why are these connected?” evidence in the connection inspector.
- User-initiated hypothetical blast-radius projection that remains separate from Git change impact and runtime health.
- Locally saved Journey stops for ordered architecture walkthroughs.
- Journey playback that moves through bounded graph contexts rather than replaying the entire codebase.
- Local Journey recording from the graph canvas, preferring MP4 when the browser supports it and truthfully falling back to WebM otherwise.
- Health and Drift capability awareness so unavailable lenses do not appear active when no supporting evidence/history exists.

#### Scanner and semantics

- TypeScript/JavaScript repository scanning.
- Static imports, exports, and nested dynamic imports.
- Relative-import and TypeScript `baseUrl` / `paths` resolution.
- Next.js App Router page/API recognition, route paths, route-handler HTTP methods, and server-action directives.
- Component, service, data, route, API, and integration classification.
- Optional `archmesh.config.json` product/feature semantics with explicit configured-vs-detected provenance.

#### Data and integrations

- Internal `fetch('/api/...')` relationships.
- External HTTP-host integrations.
- Firestore collection discovery with read, write, and listener relationships.
- First-class integration nodes for Firebase, Stripe, OpenAI, WorkOS, Resend, and Vercel.
- Dedicated data/integration Topology projection.

#### Health and failures

- Graph health states: `healthy`, `warning`, `error`, `impacted`, `unknown`.
- Generic `.archmesh/health.json` / `--health` signal ingestion.
- TypeScript compiler-diagnostic ingestion via `--diagnostics`.
- Direct failure vs inferred downstream blast-radius propagation.
- Health evidence on nodes and edges.
- Selectable red connections showing source, target, relation, evidence, and timestamp.
- Health/evidence preservation through Architecture and Topology aggregation.
- Root graph capability metadata describing whether health evidence is actually attached to the current scan.

#### Git change impact

- Independent `unchanged`, `changed`, and `affected` source-control states.
- Working-tree change detection including staged, unstaged, and untracked source.
- Base-ref comparison via `--changes-from <ref>`.
- Reverse-dependency impact traversal.
- Dedicated Changes view with blue direct changes and purple affected dependents.
- Feature-level change aggregation in Architecture view.
- Product-level change aggregation.
- Feature/product change counts in the inspector.
- Cross-feature relationships preserve change impact.

#### Live architecture and drift

- `--watch` mode.
- Debounced, serialized rebuilds with generated/vendor path filtering.
- Shared graph-build pipeline for launcher and scan CLI.
- Viewer graph refresh through a Vite custom event without a full page reload.
- Active graph mode preserved across refreshes.
- Node/edge selection preserved while the selected identity still exists.
- Graph-to-graph drift comparison between consecutive successful watch scans.
- Independent `stable`, `added`, `removed`, and `modified` architecture states.
- Structural comparison based on stable node identity and structural edge signatures rather than generated edge IDs.
- Structural fingerprints ignore runtime health and Git change overlays.
- Dedicated Drift view with teal added, pink removed, gold modified, and muted one-hop stable context.
- Removed nodes and connections retained as selectable historical ghost entities.
- Separate gitignored `public/archmesh-drift.json` generated locally and reset at watch-session start.
- Explicit drift availability metadata distinguishing the initial no-baseline state from a real comparison.

#### Project and contributor experience

- `AGENTS.md` plus committed `.ux/` context.
- Canonical UX Skills installer via `npm run ux:install`.
- Product, architecture, graph, scanner, configuration, health, development, roadmap, UX Skills, security, contribution, and Code of Conduct documentation.
- Dedicated Understand and Explain product contract and acceptance criteria.
- MIT license.
- GitHub Actions CI for install, typecheck, tests, production build, package smoke testing, self-scan, headless viewer rendering, and Flow smoke testing.

### Changed

- The exact file graph remains the evidence layer while Architecture, Topology, Changes, Drift, Scenes, Trace, Path, and Impact are derived views.
- Runtime health, source-control change state, hypothetical impact, and architecture drift are intentionally independent dimensions.
- Health-specific UI is hidden when the active scan has no attached health evidence.
- Drift-specific UI is hidden until a watch session has a prior successful scan to compare.
- Static Flow animation is explicitly illustrative directionality, not realtime traffic or health telemetry.
- Focused Scene traversal now treats `Both` as independent inbound and outbound walks from the selected seed, preventing parent containers and shared dependencies from exploding a route Scene back into the full repository.
- Focused Scenes are hard-bounded for dense repositories and retain metadata when the projection reaches that safety limit.
- Route and API Scene names prefer detected route/endpoint semantics instead of ambiguous filenames such as `page.tsx` and `route.ts`.
- The active Scene state and depth/direction controls are visually explicit and explain what changed in the graph instead of appearing as an unexplained selected card.
- Current watch mode performs full graph rebuilds; incremental scanning is a future optimization rather than an undocumented assumption.

### Next

- Incremental scan/content-hash caching and graph deltas for watch mode.
- Large-repository progressive disclosure and layout stability.
- Broader representative framework fixtures and cross-platform validation.
- Richer Firebase, Stripe, OpenAI, WorkOS, and Resend semantics.
- Test/build/browser/runtime health adapters.
- Persisted snapshots, Git history, and change-to-failure correlation.
- Optional production telemetry connectors that preserve the local-first core.
