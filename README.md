# ArchMesh

**A local-first visual architecture explorer for modern software projects.**

ArchMesh scans a codebase on your machine and turns it into an interactive map of how the system is actually put together: product areas, routes, services, APIs, data stores, integrations, source files, dependencies, failures, source changes, and architecture drift.

> **See how your system connects. See when it doesn't.**

ArchMesh is built for developers, architects, designers, and AI coding agents who need to understand a real codebase without repeatedly reconstructing the architecture from folders and search results.

## Why ArchMesh

Large applications are difficult to reason about from source files alone. A change in one service may affect several features. A Firestore collection may be read in one product area and written in another. An API error may begin in one file but affect an entirely different user-facing workflow. And during active development, the architecture itself can change without anyone noticing the new dependency or removed route.

ArchMesh makes those relationships visible.

It keeps the exact scanned code graph as its evidence layer, then derives views that answer different questions:

- **Architecture** — How is the product organized?
- **Topology** — Which features touch which data stores and external systems?
- **Changes** — What source changed, and what else depends on it?
- **Drift** — What architecture was added, removed, or modified between live scans?
- **Code** — What are the exact file-level dependencies?
- **Health** — What is directly failing, and what may be affected downstream?

The core experience runs locally. Your source code does not need to be uploaded to an ArchMesh service.

## Current status

ArchMesh is pre-1.0, but it is already runnable and useful on TypeScript/JavaScript projects.

### Visual exploration

- Interactive Sigma.js + Graphology graph rendering
- Stable ForceAtlas2 layout
- Search and node inspection
- Selectable graph connections
- Directed inbound/outbound dependency inspection
- Architecture, Topology, Changes, Drift, and Code views
- Feature drill-down without expanding unrelated implementation details
- Errors-only filtering
- Live graph refresh in watch mode without a full page reload

### Architecture understanding

- TypeScript and JavaScript source scanning
- Static imports, exports, and nested dynamic imports
- Relative-import resolution
- TypeScript `baseUrl` / `paths` alias resolution
- Next.js App Router page and API route recognition
- Next.js route-path extraction, including route groups
- HTTP method detection for route handlers
- Server-action directive detection
- Component, service, data, route, API, and integration classification
- Optional project-defined feature/product semantics through `archmesh.config.json`

### Data and integration topology

- Internal `fetch('/api/...')` call detection
- External HTTP-host detection
- Firebase / Firestore collection discovery
- Firestore read, write, and listener relationships
- First-class integrations for Firebase, Stripe, OpenAI, WorkOS, Resend, and Vercel

### Health and failures

Health is built into the graph model rather than added as a separate dashboard.

ArchMesh distinguishes:

- `healthy` — no current evidence of a problem
- `warning` — degraded or suspicious
- `error` — directly observed failure
- `impacted` — downstream blast radius inferred from a direct failure
- `unknown` — insufficient evidence

A direct failure can therefore appear like this:

```text
Stripe
  │
  │ ERROR
  ▼
Billing API
  │
  │ ERROR
  ▼
Subscription service
  │
  ├ - - impacted - - ► Hiring
  └ - - impacted - - ► Story
```

The red connection itself is selectable. When evidence exists, the inspector can show why that relationship is red rather than presenting color without explanation.

ArchMesh currently supports two local health-input paths:

- TypeScript compiler diagnostics via `--diagnostics`
- Generic health signals through `.archmesh/health.json` or `--health <file>`

### Git change impact

Source-control change state is deliberately separate from runtime health:

- `changed` — directly modified source
- `affected` — reverse dependents of changed source

A file can therefore be changed without being presented as broken, or changed *and* failing at the same time.

The **Changes** view uses a separate visual language:

- blue = directly changed
- purple = structurally affected
- red/orange still represent runtime health and take priority when a real failure exists

Change state also rolls up into Architecture and Topology so a feature or product area can show direct changed-member and affected-member counts.

### Live architecture drift

When ArchMesh runs with `--watch`, each successful graph rebuild is compared with the previous successful scan.

The **Drift** view answers a different question from Git change impact: not *which files changed*, but *how the architecture changed*.

Drift states are:

- `added` — a node or structural relationship appeared
- `removed` — it existed in the previous scan and no longer exists
- `modified` — its structural metadata changed while its stable identity remained
- `stable` — unchanged one-hop context shown to explain a drifted entity

The Drift view uses its own colors:

- teal = added
- pink = removed
- gold = modified
- muted gray = stable context

Removed routes, services, and connections remain selectable as historical ghost entities in the drift graph so disappearance is understandable rather than silently omitted.

Runtime health, Git change impact, and architecture drift are independent dimensions. A red connection does not mean the architecture drifted, and a removed route does not imply a runtime failure.

## Run ArchMesh locally

### Requirements

- Node.js **22.18+**
- npm

Clone ArchMesh:

```bash
git clone https://github.com/Tranz007/ArchMesh.git
cd ArchMesh
npm install
```

Scan another local project and launch the viewer:

```bash
npm run atlas -- /absolute/path/to/your/project
```

ArchMesh will:

1. scan the target repository;
2. generate a local graph;
3. write it to the gitignored `public/archmesh.json`;
4. start the viewer on port `4242`;
5. open the browser.

If no target is provided, ArchMesh scans itself:

```bash
npm run atlas
```

Then open:

```text
http://localhost:4242
```

## Keep ArchMesh live while you work

Use `--watch` to keep the map synchronized with source and relevant project configuration changes:

```bash
npm run atlas -- /absolute/path/to/project --watch
```

ArchMesh debounces filesystem events, serializes rebuilds, rewrites the local graph, compares each successful scan with the previous successful scan, and sends a custom Vite event to the viewer. The browser re-fetches graph and drift data without a full page reload, so the active graph mode remains selected and a node/edge selection is preserved when that entity still exists.

Watch mode generates two gitignored local artifacts:

```text
public/archmesh.json
public/archmesh-drift.json
```

The drift artifact is reset when a new watch session starts so stale history cannot leak from an earlier run.

Watch mode ignores generated/vendor paths such as `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, and `.turbo`, along with ArchMesh's own generated graph files.

You can combine watch mode with change and health overlays:

```bash
npm run atlas -- /path/to/project --watch --changes --diagnostics
```

Current watch mode performs a full scan on each debounced rebuild. Incremental parsing and content-hash invalidation are planned optimizations.

## Visualize Git change impact

Map the current working tree, including staged, unstaged, and untracked files:

```bash
npm run atlas -- /absolute/path/to/project --changes
```

Compare the current branch to a base ref:

```bash
npm run atlas -- /absolute/path/to/project --changes-from main
```

Combine either mode with `--watch` to see source impact and architecture drift evolve together:

```bash
npm run atlas -- /absolute/path/to/project --changes --watch
```

The change-impact engine walks reverse dependencies from directly changed source. It describes structural impact; it does not claim that affected behavior is broken.

## Show TypeScript errors on the graph

Run a project scan with compiler diagnostics:

```bash
npm run atlas -- /absolute/path/to/project --diagnostics
```

TypeScript diagnostics are converted into ArchMesh health signals. Directly failing files become errors; reverse dependents can be shown as impacted.

## Feed ArchMesh other health signals

ArchMesh looks for:

```text
.archmesh/health.json
```

inside the scanned project, or you can specify another file:

```bash
npm run atlas -- /absolute/path/to/project --health ./signals.json
```

Example:

```json
[
  {
    "id": "billing-webhook-500",
    "severity": "error",
    "source": "runtime",
    "message": "Stripe webhook returned 500",
    "edge": {
      "source": { "path": "src/services/billing.ts" },
      "target": { "path": "src/app/api/stripe/route.ts" }
    }
  }
]
```

ArchMesh keeps direct error evidence distinct from inferred downstream impact.

See [`docs/HEALTH_AND_OBSERVABILITY.md`](docs/HEALTH_AND_OBSERVABILITY.md) for the signal model and propagation rules.

## Teach ArchMesh your product language

Automatic detection is useful, but a product team usually knows its architecture better than a generic scanner.

Add `archmesh.config.json` to the project being scanned:

```json
{
  "features": [
    {
      "key": "story",
      "label": "Story",
      "paths": ["src/app/story/**", "src/features/story/**"]
    },
    {
      "key": "hiring",
      "label": "Hiring",
      "paths": ["src/app/hiring/**", "src/features/hiring/**"]
    },
    {
      "key": "campus",
      "label": "Campus",
      "paths": ["src/app/campus/**", "src/features/campus/**"]
    }
  ]
}
```

Configured semantics take precedence over path inference, and ArchMesh records whether a grouping came from explicit configuration or automatic detection.

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

## How it works

```text
Project source
      │
      ▼
 TypeScript / JS scanner
      │
      ├── module resolution
      ├── Next.js semantics
      ├── HTTP relationships
      ├── Firestore relationships
      └── integration detection
      │
      ▼
 Exact code graph
      │
      ├────────────┬────────────┬────────────┬───────────┐
      ▼            ▼            ▼            ▼           ▼
 Architecture   Topology      Changes       Code       Drift
 projection     projection    projection    view    comparison
      │            │            │            │           │
      └────────────┴──────┬─────┴────────────┴───────────┘
                          ▼
                   Health overlays
                   Change overlays
                          │
                          ▼
                   Sigma.js viewer
                          ▲
                          │
                   optional watch loop
```

The exact code graph remains the evidence layer. Architecture, Topology, Changes, and Drift are derived views rather than replacements for the underlying relationships.

## Design principles

### Local first

The core product should remain useful without an ArchMesh cloud service, account, or hosted graph database.

### Visual first

The graph is the primary interface, not decoration around a text report.

### Evidence over inference

ArchMesh should prefer missing a relationship over fabricating one. Explicit project configuration must remain distinguishable from heuristic detection.

### Human architecture over file hairballs

A raw dependency graph is necessary but not sufficient. ArchMesh should progressively reveal product areas, features, services, routes, data, integrations, and exact implementation detail at the level appropriate to the question.

### Error is not impact

A directly observed failure is `error`. A dependency that may be affected is `impacted`. ArchMesh must not visually claim downstream systems failed without evidence.

### Change is not failure

`changed` / `affected` are a separate dimension from `error` / `impacted`.

### Drift is structural

Architecture drift is based on graph structure and structural metadata. Health evidence and Git change overlays do not by themselves create drift.

## Project structure

```text
src/
├── scanner/       Source scanning and static semantics
├── projections/   Architecture/topology/change/drift projections
├── health/        Health signals and propagation
├── changes/       Git change-impact analysis
├── drift/         Graph-to-graph structural comparison
├── build-graph    Shared graph-build pipeline
├── watch          Live filesystem rebuild pipeline
├── GraphCanvas    Sigma.js graph rendering
└── App             Product UI and inspector
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run scan
npm run dev
```

CI validates dependency installation, TypeScript typechecking, tests, production build, and an ArchMesh self-scan on a clean GitHub runner.

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## UX Skills and agent guardrails

ArchMesh includes:

- [`AGENTS.md`](AGENTS.md)
- `.ux/CONTEXT.md`
- `.ux/DESIGN-SYSTEM.md`
- `.ux/DECISIONS.md`

The repository can also install the canonical [UX Skills](https://github.com/Tranz007/ux-skills) suite:

```bash
npm run ux:install
```

This keeps the source of truth in the UX Skills repository while giving coding agents working on ArchMesh project-specific UX context and guardrails.

## Documentation

- [Product definition](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Graph model](docs/GRAPH_MODEL.md)
- [Scanner](docs/SCANNER.md)
- [Configuration](docs/CONFIGURATION.md)
- [Health and observability](docs/HEALTH_AND_OBSERVABILITY.md)
- [Development](docs/DEVELOPMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [UX Skills integration](docs/UX_SKILLS.md)
- [Contributing](CONTRIBUTING.md)
- [Security and privacy](SECURITY.md)

## Roadmap

The near-term direction is focused on making ArchMesh useful on real, larger projects during day-to-day development:

1. incremental scanning, content hashing, and graph deltas for watch mode;
2. progressive detail and layout stability for large repositories;
3. source-editor navigation from graph entities;
4. richer Firebase, Stripe, OpenAI, WorkOS, Resend, and framework semantics;
5. test/build/browser/runtime health adapters;
6. persisted snapshots, Git history, and change-to-failure correlation;
7. packaging toward a one-command `npx archmesh .` experience.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full capability roadmap.

## What ArchMesh is not

ArchMesh is not intended to be:

- a hosted source-code requirement;
- an AI replacement for architecture understanding;
- a generic dashboard with a graph bolted onto it;
- a guarantee that every inferred relationship is correct;
- a copy or derivative of GitNexus.

ArchMesh is an independent implementation built around a different product goal: a living, visual architecture and debugging surface that connects code structure, product semantics, data topology, source changes, architecture drift, and failures.

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md) before making changes.

## License

MIT © Tony Moura
