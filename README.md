# ArchMesh

**A local-first visual architecture explorer for modern software projects.**

ArchMesh scans a codebase on your machine and turns it into an interactive map of how the system is actually put together: product areas, routes, services, APIs, data stores, integrations, source files, dependencies, errors, and change impact.

> **See how your system connects. See when it doesn't.**

ArchMesh is built for developers, architects, designers, and AI coding agents who need to understand a real codebase without repeatedly reconstructing the architecture from folders and search results.

## Why ArchMesh

Large applications are difficult to reason about from source files alone. A change in one service may affect several features. A Firestore collection may be read in one product area and written in another. An API error may begin in one file but affect an entirely different user-facing workflow.

ArchMesh makes those relationships visible.

It keeps the exact scanned code graph as its evidence layer, then projects that graph into views that answer different questions:

- **Architecture** — How is the product organized?
- **Topology** — Which features touch which data stores and external systems?
- **Code** — What are the exact file-level dependencies?
- **Health** — What is directly failing, and what may be affected downstream?
- **Change impact** — What changed, and what else depends on it?

The core experience runs locally. Your source code does not need to be uploaded to an ArchMesh service.

## Current status

ArchMesh is early, but it is already runnable and useful on TypeScript/JavaScript projects.

### Visual exploration

- Interactive Sigma.js + Graphology graph rendering
- Stable ForceAtlas2 layout
- Search and node inspection
- Selectable graph connections
- Directed inbound/outbound dependency inspection
- Architecture, Topology, and Code views
- Feature drill-down without expanding unrelated implementation details
- Errors-only filtering

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

### Change impact

ArchMesh also keeps source-control change state separate from runtime health:

- `changed` — directly modified source
- `affected` — reverse dependents of changed source

A file can therefore be changed without being presented as broken, or changed *and* failing at the same time.

Git working-tree and base-ref change detection are under active development.

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
      ├─────────────┬──────────────┐
      ▼             ▼              ▼
 Architecture    Topology         Code
 projection      projection       view
      │             │              │
      └─────────────┼──────────────┘
                    ▼
             Health overlays
             Change overlays
                    │
                    ▼
            Sigma.js viewer
```

The exact code graph remains the evidence layer. Architecture and Topology are derived projections rather than replacements for the underlying relationships.

That matters because an error or change discovered at file level can still be explained when the user zooms out to a feature or product view.

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

## Project structure

```text
src/
├── scanner/       Source scanning and static semantics
├── projections/   Architecture/topology graph projections
├── health/        Health signals and propagation
├── changes/       Git change-impact analysis
├── GraphCanvas    Sigma.js graph rendering
└── App             Product UI and inspector

docs/
├── PRODUCT.md
├── ARCHITECTURE.md
├── GRAPH_MODEL.md
├── SCANNER.md
├── CONFIGURATION.md
├── HEALTH_AND_OBSERVABILITY.md
├── DEVELOPMENT.md
├── ROADMAP.md
└── UX_SKILLS.md
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

The near-term direction is focused on making ArchMesh useful during day-to-day development rather than adding cloud infrastructure:

1. finish Git change-impact visualization;
2. add file watching and incremental rescans;
3. improve large-repository progressive detail and layout stability;
4. expand Firebase, HTTP, Stripe, AI, and framework adapters;
5. ingest additional local test/build/runtime failures;
6. add Git history / change-to-failure correlation;
7. package the CLI toward an eventual `npx archmesh .` experience.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full capability roadmap.

## What ArchMesh is not

ArchMesh is not intended to be:

- a hosted source-code requirement;
- an AI replacement for architecture understanding;
- a generic dashboard with a graph bolted onto it;
- a guarantee that every inferred relationship is correct;
- a copy or derivative of GitNexus.

ArchMesh is an independent implementation built around a different product goal: a living, visual architecture and debugging surface that can connect code structure, product semantics, data topology, failures, and change impact.

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md) before making changes.

## License

MIT © Tony Moura
