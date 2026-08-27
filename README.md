# ArchMesh

**A local-first, interactive architecture explorer for modern software projects.**

ArchMesh scans a codebase on your machine and turns it into a living visual map of files, routes, components, services, APIs, integrations, and dependencies. The graph is designed to grow beyond static architecture: runtime failures can mark the exact broken connection red and show downstream impact separately.

> See how your system connects. See when it doesn't.

## What works in this first slice

- Interactive graph visualization with Sigma.js + Graphology
- TypeScript/JavaScript repository scanning
- Relative import dependency mapping
- Basic Next.js route/API/component/service classification
- Recognition of selected integrations such as Firebase, Stripe, OpenAI, WorkOS, Resend, and Vercel
- Search and node inspection
- Health states on nodes and edges: `healthy`, `warning`, `error`, `impacted`, `unknown`
- Red failing connections and orange downstream-impact connections
- **Errors only** view for isolating unhealthy paths
- Fully local operation; no hosted database or source upload required

## Run it locally

Requirements: Node.js 22.18+.

```bash
 git clone https://github.com/Tranz007/ArchMesh.git
 cd ArchMesh
 npm install
 npm run atlas -- /absolute/path/to/your/project
```

ArchMesh scans the target repository, writes the local graph data to `public/archmesh.json`, starts the viewer on port `4242`, and opens your browser.

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
healthy  → normal relationship
warning  → degraded or suspicious
error    → directly failing
impacted → downstream of a known failure
unknown  → health not yet established
```

That lets ArchMesh evolve from a static architecture viewer into a visual debugging and observability surface without replacing the graph model later.

## Direction

The next layers are expected to add richer framework semantics, especially Next.js, React, Firebase, API calls, Stripe/webhooks, AI integrations, Git change impact, and local/runtime error ingestion.

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

The failing path is red. Potential downstream blast radius is visually distinct.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the evolving technical design.

## License

MIT
