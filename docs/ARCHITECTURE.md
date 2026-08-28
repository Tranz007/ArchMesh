# ArchMesh architecture

ArchMesh is intentionally local-first. Source code is scanned on the developer's machine, transformed into a shared graph model, enriched by optional framework/platform semantics, and rendered in the browser. No external database, hosted service, or LLM is required for the core experience.

## System shape

```text
┌──────────────────────────┐
│ Target repository        │
│ one or many languages    │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Scanner plugin host      │
├──────────────────────────┤
│ JS / TS language plugin  │
│ Python plugin (future)   │
│ JVM plugin (future)      │
│ .NET plugin (future)     │
│ ...                      │
└────────────┬─────────────┘
             │ graph fragments
             ▼
┌──────────────────────────┐
│ Shared ArchGraphData     │
│ merge by stable identity │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Framework adapters       │
├──────────────────────────┤
│ Next.js                  │
│ Angular (future)         │
│ FastAPI (future)         │
│ Spring (future)          │
│ ASP.NET (future)         │
│ ...                      │
└────────────┬─────────────┘
             │ semantic contributions
             ▼
┌──────────────────────────┐
│ ArchGraphData            │
│ nodes + edges + evidence │
└────────────┬─────────────┘
             │
             ├── health overlays
             ├── Git change impact
             ├── drift comparison
             ├── lenses / trace
             └── security evidence
             │
             ▼
┌──────────────────────────┐
│ Three.js/WebGL viewer    │
│ 3D / Flow / Trace / UI   │
└──────────────────────────┘
```

The important boundary is the shared graph contract. A Python parser, Java parser, or .NET parser should not need to know anything about Three.js, Flow animation, Security Lens, change impact, or the inspector. It only needs to produce defensible ArchMesh graph evidence.

## Why plugins are the scanner architecture

Language breadth is a core product requirement, but a single scanner containing every parser and every framework rule would become difficult to extend and impossible for outside contributors to reason about safely.

ArchMesh therefore separates two extension types.

### Language plugins

A language plugin owns source parsing and structural evidence for one language or closely related language family.

Examples:

```text
javascript-typescript
  ├── .ts / .tsx
  ├── .js / .jsx
  ├── .mjs / .cjs
  ├── imports / exports
  ├── module resolution
  └── generic calls / integrations / source evidence

python (future)
  ├── .py
  ├── Python import graph
  ├── modules / packages
  └── generic call / integration evidence

jvm (future)
  ├── Java parser
  ├── Kotlin parser
  ├── package/import graph
  └── JVM project/module evidence

dotnet (future)
  ├── C# parser
  ├── project/solution graph
  └── .NET dependency evidence
```

A plugin may cover more than one file extension or closely related language when a shared parser/runtime makes that boundary useful. The contract is capability-based rather than assuming one package per extension.

### Framework adapters

A framework adapter sits on top of one or more compatible language plugins and adds framework-specific architecture.

Examples:

```text
JavaScript / TypeScript graph
        │
        ├── Next.js adapter
        │     routes / API handlers / server actions
        │
        ├── Angular adapter
        │     router / DI / components / HttpClient
        │
        └── NestJS adapter
              modules / controllers / providers / guards

Python graph
        │
        ├── FastAPI adapter
        ├── Django adapter
        └── Flask adapter

JVM graph
        │
        └── Spring adapter

.NET graph
        │
        └── ASP.NET Core adapter
```

This prevents framework semantics from being duplicated inside language parsers and lets several frameworks reuse the same structural graph.

The built-in `nextjs` adapter is the reference implementation. It activates only when repository evidence indicates Next.js and owns the currently supported App Router page/API paths, exported route methods, server-action evidence, and static same-origin `/api/...` call mapping. The base JavaScript/TypeScript parser does not infer those semantics from filenames alone.

## Plugin host contract

The current internal contract lives under `src/plugins/` and is deliberately versioned.

A language plugin declares:

- plugin API version;
- stable ID and display name;
- languages and extensions it covers;
- evidence capabilities it currently produces;
- a `scan()` function that returns an `ArchGraphData` fragment.

A framework adapter declares:

- plugin API version;
- stable ID and display name;
- compatible language-plugin IDs;
- semantic capabilities it adds;
- conservative framework detection;
- an `enrich()` function that contributes nodes, edges, or metadata.

The host merges graph fragments by stable node/edge identity and records active plugin/adapter IDs and capabilities in graph metadata.

A repository may eventually activate multiple language plugins in the same scan. For example:

```text
repo/
├── web/       React + TypeScript
└── api/       Python + FastAPI
```

can become one ArchMesh graph rather than requiring two unrelated products or viewers.

## External plugin safety

The same internal contract is intended to become the basis for external first-party/community plugins, but ArchMesh must not automatically download or execute arbitrary packages based only on detected file extensions.

Parser plugins necessarily receive local source access. Therefore future external loading should be explicit and auditable, for example through installed/allow-listed packages in project or user configuration.

A future package family may look like:

```text
@archmesh/plugin-python
@archmesh/plugin-jvm
@archmesh/plugin-dotnet
@archmesh/adapter-angular
@archmesh/adapter-fastapi
@archmesh/adapter-spring
```

Names are illustrative until the public plugin packaging contract is finalized.

The host rejects incompatible plugin API versions rather than attempting best-effort execution.

## Current migration state

The plugin host is part of the real graph-build path. The existing JavaScript/TypeScript scanner is registered as the first built-in language plugin, and Next.js is the first production framework adapter.

The base JS/TS parser now remains framework-neutral for route/page/server-action behavior. Next.js detection and enrichment sit behind the adapter boundary with regression coverage for App Router pages, API routes, exported HTTP methods, server actions, internal API calls, and false-positive lookalike repositories.

The next parser work can therefore use the same extension path rather than adding more framework-specific branches to `src/scanner/scan.ts`.

## Repository structure

```text
src/
├── plugins/
│   ├── languages/
│   │   └── javascript-typescript.ts
│   ├── frameworks/
│   │   └── nextjs.ts
│   ├── merge.ts
│   ├── orchestrator.ts
│   ├── registry.ts
│   └── types.ts
├── scanner/
│   ├── scan.ts
│   ├── semantics.ts
│   └── config.ts
├── projections/
├── security/
│   ├── classify.ts
│   └── http.ts
├── health/
├── changes/
├── drift/
├── editor/
├── GraphCanvas.tsx
├── App.tsx
└── types.ts
```

## Graph boundary

`src/types.ts` defines the core interchange contract. Language plugins, framework adapters, health sources, Git impact, drift, projections, and the viewer converge on this contract rather than passing parser/framework-specific objects through the application.

The graph contains:

- architectural nodes;
- directed relationships;
- health/change/drift state;
- optional path and evidence metadata.

See [`GRAPH_MODEL.md`](GRAPH_MODEL.md).

## Viewer boundary

`GraphCanvas.tsx` translates `ArchGraphData` into the Three.js/WebGL 3D scene. It owns camera interaction, semantic node rendering, connection rendering, Flow particles, and graph-selection emphasis.

`App.tsx` owns product UI state such as:

- active graph/lens;
- selection and inspector context;
- search;
- Trace state;
- Flow state;
- high-level health/change/security context.

The viewer does not own source parsing rules.

## Progressive architecture

Rendering every technical entity simultaneously will not scale cognitively even if WebGL can draw it.

ArchMesh uses progressive architecture:

```text
system
  → product
    → feature
      → technical entities
        → source-level detail
```

Lenses, Trace, semantic grouping, filtering, and levels of detail are product requirements, not merely rendering optimizations.

## Health and security overlays

Runtime/build/test evidence and security evidence enrich the same stable graph rather than creating separate disconnected diagrams.

A health source must map evidence to known graph identity. It must not fabricate a relationship merely to create a complete-looking trace.

Security follows the same evidence rule: Unknown is preferable to a confident claim that source evidence cannot prove.

## Persistence

ArchMesh currently uses generated local JSON and an in-memory graph. A database should only be introduced when a concrete requirement demands it, such as large-scale history, cross-repository graphs, or efficient incremental querying.

## AI boundary

ArchMesh does not require an LLM for parsing, graph construction, layout, exploration, Flow, Trace, health, or security visualization.

AI may later consume the graph for natural-language filtering, explanation, semantic grouping, or documentation, but it should not become the authority that invents the graph.

## Security/privacy boundary

The source repository and generated graph remain local in the default architecture. Future hosted integrations and external parser plugins must be explicit and document exactly what code/data they can access or transmit.

See [`../SECURITY.md`](../SECURITY.md).
