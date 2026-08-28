# ArchMesh

**A local-first visual architecture explorer for modern software projects.**

ArchMesh scans a codebase on your machine and turns it into an interactive map of how the system is actually put together: product areas, routes, services, APIs, data stores, integrations, source files, dependencies, failures, source changes, architecture drift, directional data flow, and security evidence.

> **See how your system connects. See when it doesn't.**

ArchMesh is built for developers, architects, designers, and AI coding agents who need to understand a real codebase without repeatedly reconstructing the architecture from folders, search results, and logs.

## Why ArchMesh

Large applications are difficult to hold in your head. A shared service can affect several features. A data collection can be read in one area and written in another. A runtime error can begin in one file and affect a distant user workflow. Sensitive data can cross a system boundary without that fact being obvious from a directory tree. During active development, architecture itself can change without anyone noticing a new dependency or removed route.

ArchMesh makes those relationships visible while keeping the exact scanned code graph as the evidence layer underneath higher-level views.

### Views and lenses

- **Architecture** — How is the product organized?
- **Topology** — Which features touch which data stores and external systems?
- **Security** — Where does security-relevant data move, what boundaries does it cross, and what protections can source evidence actually prove?
- **Changes** — What source changed, and what else depends on it?
- **Drift** — What architecture was added, removed, or modified between live scans?
- **Code** — What are the exact file-level dependencies?
- **Health** — What is directly failing, and what may be affected downstream?

The core experience runs locally. Your source code does not need to be uploaded to an ArchMesh service.

## Current capabilities

ArchMesh is pre-1.0, but already supports a useful TypeScript/JavaScript baseline:

- interactive Three.js/WebGL 3D architecture graph with orbit, zoom, pan, and fit-to-view controls;
- semantic node shapes and colors for products, features, services/APIs, routes, data, integrations, components, files, and modules;
- Architecture Lenses for System Map, Product Areas, Data & Integrations, Routes & APIs, Security, Change Impact, Health, Architecture Drift, and Code Structure;
- progressive disclosure so the default architecture view prioritizes meaningful product structure instead of opening as a file-level hairball;
- directional **Trace from here** investigation with Inbound / Both / Outbound controls and progressive re-rooting;
- optional directional Flow mode with small animated pulses for calls, reads, writes, and integration relationships;
- bidirectional-looking flow when independent evidence exists in both directions between the same nodes;
- security evidence for static sensitive payload fields, external boundaries, cleartext HTTP, TLS-requested HTTPS, and unknown protection states;
- security-specific connection colors without replacing semantic node identity;
- search, node inspection, selectable connections, and directional dependency inspection;
- Architecture, Topology, Changes, Drift, and Code views;
- feature drill-down without expanding unrelated implementation detail;
- TypeScript/JavaScript imports, exports, and nested dynamic imports;
- relative imports and TypeScript `baseUrl` / `paths` aliases;
- Next.js App Router pages, API routes, route paths, HTTP methods, metadata files, and server-action evidence;
- internal `fetch('/api/...')` call mapping and external HTTP host discovery;
- Firebase/Firestore collection read/write/listener relationships;
- first-class integration nodes for Firebase, Stripe, OpenAI, WorkOS, Resend, and Vercel;
- optional project-defined product/feature semantics through `archmesh.config.json`;
- TypeScript diagnostics and generic health-signal ingestion;
- Git working-tree and base-ref change impact;
- live watch mode with browser refresh without a full page reload;
- architecture drift comparison between consecutive successful live scans;
- a compiled/packageable `archmesh` CLI with clean packed-install smoke testing;
- source-backed graph nodes can open directly in Cursor, VS Code, or Zed through the local launcher.

## Health is part of the graph

ArchMesh distinguishes:

- `healthy` — no current evidence of a problem;
- `warning` — degraded or suspicious;
- `error` — directly observed failure;
- `impacted` — downstream blast radius inferred from a direct failure;
- `unknown` — insufficient evidence.

Example:

```text
Payment provider
      │
      │ ERROR
      ▼
Billing API
      │
      │ ERROR
      ▼
Subscription service
      │
      ├ - - impacted - - ► Orders
      └ - - impacted - - ► Account
```

A red connection is selectable. When evidence exists, the inspector explains why the relationship is red rather than using color without context.

Health, source-control impact, architecture drift, and security evidence are deliberately independent dimensions:

```text
Runtime health       Git impact         Architecture drift       Security evidence
error / impacted     changed / affected added / removed / modified sensitive / cleartext / TLS requested / unknown
```

A changed file is not automatically broken. An affected feature is not automatically failing. A removed route is not automatically a runtime error. A security-relevant boundary crossing is not automatically a vulnerability.

## Run ArchMesh locally

### Requirements

- Node.js **22.18+**
- npm
- a modern browser with WebGL support

### Package status

ArchMesh now builds a real npm-style package with an `archmesh` executable. CI creates a tarball, installs it into a clean temporary npm project, and runs the installed compiled CLI as a consumer smoke test.

The public npm registry package has **not been claimed as released yet**, so the documented source checkout remains the supported public installation path until the release/package identity is finalized.

```bash
git clone https://github.com/Tranz007/ArchMesh.git
cd ArchMesh
npm install
npm run atlas -- /absolute/path/to/your/project
```

The packaged executable uses the same syntax:

```bash
archmesh /absolute/path/to/your/project
```

ArchMesh scans the target, creates an isolated OS-temporary runtime workspace, starts the viewer on port `4242`, and opens the browser. The runtime graph/drift artifacts are removed when the launcher shuts down normally.

If no target is provided during source development, ArchMesh scans itself:

```bash
npm run atlas
```

### Keep the map live

Source checkout:

```bash
npm run atlas -- /absolute/path/to/project --watch
```

Packaged command:

```bash
archmesh /absolute/path/to/project --watch
```

Watch mode debounces filesystem events, serializes rebuilds, refreshes the graph in the browser without a page reload, and compares each successful scan with the previous one for structural drift.

Current watch mode performs a full scan on each debounced rebuild. Incremental invalidation is a performance optimization to be driven by representative repository benchmarks rather than assumed necessary in advance.

### Open a graph entity in your editor

Select a source-backed node and use **Open in editor** beneath its path in the inspector.

The default editor preference is `auto`. You can make it explicit:

```bash
npm run atlas -- /absolute/path/to/project --editor cursor
npm run atlas -- /absolute/path/to/project --editor code
npm run atlas -- /absolute/path/to/project --editor zed
```

The packaged command uses the same option:

```bash
archmesh . --editor cursor
```

ArchMesh validates that the requested source path resolves inside the scanned project before invoking a local editor CLI. Absolute machine paths are not embedded in the graph JSON.

### Trace an architecture path

Select a node and choose **Trace from here** to isolate that node and its immediate architecture neighborhood without leaving the active Lens.

Trace supports:

- **Inbound** — relationships pointing into the trace root;
- **Both** — inbound and outbound relationships;
- **Outbound** — relationships leaving the trace root.

Trace is intentionally one hop. To continue investigating, select a visible neighboring node and choose **Continue trace from here**. ArchMesh re-roots the scene around that node so you can walk the architecture progressively instead of expanding several hops into another hairball.

Trace preserves the active Lens. For example, tracing inside Security Lens keeps security connection colors and evidence. Flow can also remain active inside the smaller trace scene, which makes movement direction easier to understand.

See [`docs/TRACE_INVESTIGATION.md`](docs/TRACE_INVESTIGATION.md).

### Animate directional flow

Use **Flow** in the lower-right graph controls to animate relationships that represent detected request or data movement.

Flow intentionally animates only:

- `calls` — source → target request/execution flow;
- `reads` — target → source because data moves from the resource back to the reader;
- `writes` — source → target because data leaves the writer and enters the resource;
- `integrates-with` — source → target integration usage based on detected evidence.

Static relationships such as `contains`, `imports`, and `depends-on` are not animated as traffic.

When Flow is enabled:

- **Focus** animates eligible incoming and outgoing relationships for the selected node, or the selected connection itself;
- **All** animates every eligible visible relationship in the current lens/view;
- if two nodes have independent read/write or other opposite-direction relationships, pulses can visibly travel both ways;
- runtime warning/error/impact colors override normal relation colors outside Security Lens;
- in Security Lens, security color stays on the connection while pulses show detected movement direction.

Flow is deliberately subtle: packets and active lines are visual guidance, not a claim about packet size, throughput, request volume, or runtime frequency.

See [`docs/FLOW_VISUALIZATION.md`](docs/FLOW_VISUALIZATION.md).

### Inspect security evidence

Choose the **Security** Architecture Lens to focus the graph on connections and resources with security-relevant evidence.

The first Security Lens can detect:

- statically visible sensitive payload field names such as email, phone, identifiers, credentials, and payment-related fields;
- `http://` cleartext external transport;
- `https://` as **TLS requested**;
- external HTTP/HTTPS boundary crossings;
- Firestore reads/writes and statically visible sensitive write fields;
- same-origin, provider-SDK transport, and managed-service at-rest protection as **Unknown** when the repository cannot prove the control.

ArchMesh intentionally does **not** turn “HTTPS” into a generic green “secure” claim. `TLS requested` means the code requests HTTPS; it does not prove certificate behavior, proxy configuration, negotiated protocol, or provider storage controls at runtime.

Likewise, **Unknown** means ArchMesh cannot prove the control from repository evidence. It does not mean the control is absent.

Only detected field names/classifications are copied into security graph metadata. ArchMesh does not copy statically visible URL credentials, query values, or fragments into graph artifacts.

The Security Lens is architecture intelligence, not a replacement for SAST, DAST, dependency scanning, penetration testing, or a compliance audit.

See [`docs/SECURITY_LENS.md`](docs/SECURITY_LENS.md).

### Visualize Git change impact

Working tree, including staged, unstaged, and untracked files:

```bash
npm run atlas -- /absolute/path/to/project --changes
```

Compare the current branch to a base ref:

```bash
npm run atlas -- /absolute/path/to/project --changes-from main
```

Combine modes when useful:

```bash
npm run atlas -- /absolute/path/to/project --watch --changes --diagnostics
```

### Show TypeScript errors

```bash
npm run atlas -- /absolute/path/to/project --diagnostics
```

TypeScript diagnostics become direct health signals on matching source nodes. Reverse dependents can be shown as `impacted`.

### Feed other health signals

ArchMesh looks for `<project>/.archmesh/health.json`, or accepts an explicit file:

```bash
npm run atlas -- /absolute/path/to/project --health ./signals.json
```

Example:

```json
{
  "signals": [
    {
      "id": "checkout-submit-500",
      "severity": "error",
      "source": "runtime",
      "message": "POST /api/checkout/submit returned 500",
      "edge": {
        "source": { "path": "src/app/checkout/page.tsx" },
        "target": { "path": "src/app/api/checkout/submit/route.ts" }
      }
    }
  ]
}
```

See [`docs/HEALTH_AND_OBSERVABILITY.md`](docs/HEALTH_AND_OBSERVABILITY.md).

### Scan without launching the viewer

The development-only scan command still writes a gitignored snapshot into the ArchMesh checkout for inspection/testing:

```bash
npm run scan -- /absolute/path/to/project
```

That output is not the packaged launcher's runtime storage model.

## Teach ArchMesh your product language

Automatic detection is useful, but teams often know their product boundaries better than a generic scanner.

Add `archmesh.config.json` to the project being scanned:

```json
{
  "features": [
    {
      "id": "catalog",
      "label": "Catalog",
      "paths": ["src/app/catalog/**", "src/features/catalog/**"]
    },
    {
      "id": "orders",
      "label": "Orders",
      "paths": ["src/app/orders/**", "src/features/orders/**"]
    },
    {
      "id": "accounts",
      "label": "Accounts",
      "paths": ["src/app/accounts/**", "src/features/accounts/**"]
    }
  ]
}
```

Configured semantics take precedence over path inference, and ArchMesh records whether grouping came from project configuration or automatic detection.

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
      ├── HTTP relationships + transport evidence
      ├── Firestore relationships + field evidence
      └── integration detection
      │
      ▼
 Exact code graph
      │
      ├────────────┬────────────┬────────────┬────────────┬───────────┐
      ▼            ▼            ▼            ▼            ▼           ▼
 Architecture   Topology      Security      Changes       Code       Drift
 projection     projection    projection    projection    view    comparison
      │            │            │            │            │           │
      └────────────┴────────────┴──────┬─────┴────────────┴───────────┘
                                      ▼
                         lenses + trace + state overlays
                                      │
                                      ▼
                             Three.js/WebGL 3D viewer
                                      ▲
                                      │
                               optional watch loop
```

The exact code graph remains the evidence layer. Higher-level views, traces, and comparisons are projections, not replacements for the underlying relationships.

## Design principles

**Local first.** Core architecture exploration must work without a hosted service, account, graph database, LLM, or source-code upload.

**Visual first.** The graph is the primary interface, not decoration around a report.

**Evidence over inference.** Prefer an omitted relationship over a convincing fabricated one. Keep configured, detected, inferred, and unknown information distinct when it matters.

**Unknown is not absent.** If source evidence cannot prove a runtime or provider security control, ArchMesh says Unknown rather than secure or insecure.

**Progressive investigation over expansion.** Trace begins with one hop and lets the user re-root deliberately instead of expanding an arbitrary number of relationships into another hairball.

**Human architecture over file hairballs.** Start with product areas and features; reveal routes, services, data, files, and source detail progressively.

**Error is not impact. Change is not failure. Drift is structural. Security is independent.** These meanings stay separate throughout the graph and inspector.

## Project structure

```text
src/
├── scanner/       source scanning and static semantics
├── projections/   architecture/topology/security/trace/change/drift projections
├── security/      conservative sensitive-data classification
├── health/        health signals and propagation
├── changes/       Git change-impact analysis
├── drift/         graph-to-graph structural comparison
├── editor/        safe local source-editor navigation
├── flow           directional request/data-flow semantics
├── lenses         progressive architecture lens projections
├── build-graph    shared graph-build pipeline
├── watch          live filesystem rebuild pipeline
├── GraphCanvas    Three.js/WebGL 3D rendering
└── App            product UI and inspector
```

## Documentation

- [Product definition](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Graph model](docs/GRAPH_MODEL.md)
- [Scanner](docs/SCANNER.md)
- [Configuration](docs/CONFIGURATION.md)
- [Trace investigation](docs/TRACE_INVESTIGATION.md)
- [Flow visualization](docs/FLOW_VISUALIZATION.md)
- [Security Lens](docs/SECURITY_LENS.md)
- [Health and observability](docs/HEALTH_AND_OBSERVABILITY.md)
- [Development](docs/DEVELOPMENT.md)
- [Definition of Done](docs/DEFINITION_OF_DONE.md)
- [Roadmap](docs/ROADMAP.md)
- [UX Skills integration](docs/UX_SKILLS.md)
- [Contributing](CONTRIBUTING.md)
- [Security and privacy](SECURITY.md)

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run scan
npm run dev
```

CI validates dependency installation, TypeScript typechecking, tests, production build, compiled CLI help, package contents, a clean packed-install consumer smoke test, and an ArchMesh self-scan.

ArchMesh also includes [`AGENTS.md`](AGENTS.md) plus committed `.ux/` project context. The canonical [UX Skills](https://github.com/Tranz007/ux-skills) suite can be installed with:

```bash
npm run ux:install
```

## Definition of Done

ArchMesh has an explicit finish line for both individual changes and the first stable public release. See [`docs/DEFINITION_OF_DONE.md`](docs/DEFINITION_OF_DONE.md).

The short version: a feature is not done because code exists, and v0.1 is not done because the graph looks impressive. It is done when a new user can install ArchMesh, run it on a representative repository, understand the result, trust its claims, and complete the core workflows without private project knowledge or maintainer intervention.

## Roadmap

The remaining v0.1 work is release-gate driven:

1. representative end-to-end fixture and consumer smoke path;
2. cross-platform CI/support validation;
3. measured scan/watch performance and incremental invalidation only where needed;
4. progressive detail and layout stability on larger repositories;
5. accessibility and primary empty/error-state validation;
6. finalize registry/package identity and publish a green v0.1 release.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`docs/DEFINITION_OF_DONE.md`](docs/DEFINITION_OF_DONE.md).

## What ArchMesh is not

ArchMesh is not intended to be a hosted-source requirement, an AI replacement for architecture understanding, a generic observability dashboard with a graph bolted on, a replacement for dedicated application-security testing, or a source of invented relationships.

ArchMesh is independently implemented under the MIT license.

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md) before making changes.

## License

MIT © Tony Moura
