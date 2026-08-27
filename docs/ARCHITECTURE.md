# ArchMesh Architecture

ArchMesh is intentionally local-first. Source code is scanned on the developer's machine, transformed into a small graph model, and rendered in the browser. No external database or hosted service is required for the core experience.

## Pipeline

```text
Project source
   ↓
Scanner adapters
   ↓
ArchGraphData
   ↓
Graphology
   ↓
Sigma.js viewer
```

## Graph model

Nodes represent architectural things such as files, routes, components, services, APIs, data models, integrations, features, and products.

Edges represent relationships such as imports, calls, reads, writes, containment, dependencies, and integrations.

Both nodes and edges carry a health state:

- `healthy` — normal relationship
- `warning` — degraded or suspicious
- `error` — directly failing
- `impacted` — downstream of a known failure
- `unknown` — health has not been established

Health is part of the graph schema from the beginning so static architecture and runtime observability can converge later without changing the fundamental model.

## First scanner

The initial scanner understands JavaScript/TypeScript source, relative imports, common Next.js route/component conventions, and selected external integrations such as Firebase, Stripe, OpenAI, WorkOS, Resend, and Vercel.

It intentionally starts conservative. Later adapters can add framework semantics without turning the core scanner into a monolith.

## Planned adapters

- Next.js route and server-action semantics
- React component relationships
- Firebase collections, reads, writes, listeners, and functions
- API fetch/call relationships
- Stripe webhooks and billing flows
- OpenAI agent/prompt relationships
- WorkOS, Resend, ATS, and other external integrations
- build/test/runtime error ingestion
- Git change impact and history

## Runtime health

A runtime adapter will emit health events against known node/edge IDs. A direct failure marks the failing path `error`. ArchMesh can then traverse downstream relationships and mark dependent paths `impacted` without confusing potential blast radius with the original failure.

This is the basis for the visual debugging experience: the architecture map becomes the observability surface.
