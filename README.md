# ArchMesh

**A local-first, interactive architecture explorer for modern software projects.**

ArchMesh scans a codebase on your machine and turns it into a living visual map of files, routes, components, services, APIs, integrations, and dependencies. The graph is designed to grow beyond static architecture: runtime failures can mark the exact broken connection red and show downstream impact separately.

> See how your system connects. See when it doesn't.

## What works in this first slice

- Interactive graph visualization with Sigma.js + Graphology
- TypeScript/JavaScript repository scanning
- Static, exported, and nested dynamic import mapping
- Basic Next.js route/API/component/service classification
- Recognition of selected integrations such as Firebase, Stripe, OpenAI, WorkOS, Resend, and Vercel
- Search and node inspection
- Health states on nodes and edges: `healthy`, `warning`, `error`, `impacted`, `unknown`
- Red failing connections and visually distinct downstream-impact connections
- **Errors only** view for isolating unhealthy paths
- Fully local operation; no hosted database or source upload required
- `AGENTS.md` and UX Skills project context for AI-assisted development

## Run it locally

Requirements: Node.js 22.18+.

```bash
git clone https://github.com/Tranz007/ArchMesh.git
cd ArchMesh
npm install
npm run atlas -- /absolute/path/to/your/project
```

ArchMesh scans the target repository, writes local graph data to `public/archmesh.json`, starts the viewer on port `4242`, and opens your browser.

If you omit the target path, ArchMesh scans itself:

```bash
npm run atlas
```

You can also separate scanning and viewing:

```bash
npm run scan -- /absolute/path/to/your/project
npm run dev
```

Then open `http://localhost:4242`.

`public/archmesh.json` is generated local data and is gitignored because a scan can reveal filenames, paths, integrations, and architecture from a private project.

## UX Skills

ArchMesh is set up to work with [UX Skills](https://github.com/Tranz007/ux-skills), the open-source Agent Skills suite for UX practitioners.

The essential ArchMesh-specific UX contract is already in `AGENTS.md` and `.ux/`. If you use an Agent Skills-compatible coding environment, install the canonical suite with:

```bash
npm run ux:install
```

Then ask the agent to run `setup-ux` once.

The skills are not copied into this repository; the canonical source remains `Tranz007/ux-skills` so fixes and improvements do not drift between projects.

## Current architecture

```text
Project source
   ↓
TypeScript / JavaScript scanner
   ↓
ArchGraphData
   ↓
Graphology
   ↓
Sigma.js viewer
```

The core graph model intentionally includes health from day one:

```text
healthy  → no known failure
warning  → degraded or suspicious
error    → directly failing
impacted → downstream of a known failure
unknown  → insufficient health evidence
```

That lets ArchMesh evolve from a static architecture viewer into a visual debugging and observability surface without replacing the graph model later.

## Direction

The next layers are expected to add richer framework semantics, especially Next.js, React, Firebase, API calls, Stripe/webhooks, AI integrations, Git change impact, stable semantic grouping, and local/runtime error ingestion.

A future runtime adapter can map an error back onto the graph like this:

```text
Stripe
  │
  │ ERROR
  ▼
Billing API
  │
  │ ERROR
  ▼
Subscription Service
  │
  ├ - - - impacted - - - ► Hiring
  └ - - - impacted - - - ► Story
```

The failing path is red. Potential downstream blast radius is visually distinct rather than being mislabeled as another confirmed failure.

## Documentation

- [`AGENTS.md`](AGENTS.md) — operating contract for coding agents and contributors
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product definition and user jobs
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — technical architecture and boundaries
- [`docs/GRAPH_MODEL.md`](docs/GRAPH_MODEL.md) — nodes, edges, identity, and health schema
- [`docs/SCANNER.md`](docs/SCANNER.md) — scanner behavior, limitations, and adapter direction
- [`docs/HEALTH_AND_OBSERVABILITY.md`](docs/HEALTH_AND_OBSERVABILITY.md) — error/impact semantics and runtime direction
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — local development and validation
- [`docs/UX_SKILLS.md`](docs/UX_SKILLS.md) — UX Skills integration
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — capability roadmap
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution workflow
- [`SECURITY.md`](SECURITY.md) — local-data/privacy guidance
- [`CHANGELOG.md`](CHANGELOG.md) — notable changes

## Status

ArchMesh is pre-1.0 and under active development. The first slice is intentionally conservative: the graph should prefer relationships we can defend over a visually impressive graph full of guesses.

## License

MIT © Tony Moura
