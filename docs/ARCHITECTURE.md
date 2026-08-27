# ArchMesh architecture

ArchMesh is intentionally local-first. Source code is scanned on the developer's machine, transformed into a typed graph model, and rendered in the browser. No external database or hosted service is required for the core experience.

## System shape

```text
┌──────────────────────┐
│ Target repository    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Scanner               │
│ TypeScript/JavaScript │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ ArchGraphData         │
│ nodes + edges + health│
└──────────┬───────────┘
           │ JSON (V1)
           ▼
┌──────────────────────┐
│ Graphology           │
│ in-memory graph       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Sigma.js viewer       │
│ search / focus / UI   │
└──────────────────────┘
```

Future adapters can enrich both the scan and health inputs without replacing the core graph contract.

## Repository structure

```text
ArchMesh/
├── .github/
│   └── workflows/
├── .ux/
│   ├── CONTEXT.md
│   ├── DESIGN-SYSTEM.md
│   └── DECISIONS.md
├── docs/
├── public/
│   └── archmesh.json        # generated locally; gitignored
├── src/
│   ├── scanner/
│   │   ├── cli.ts
│   │   ├── scan.ts
│   │   └── scan.test.ts
│   ├── App.tsx
│   ├── GraphCanvas.tsx
│   ├── cli.ts
│   ├── main.tsx
│   ├── sample-graph.ts
│   ├── styles.css
│   └── types.ts
├── AGENTS.md
├── package.json
└── vite.config.ts
```

## Runtime modes

### Scan only

```bash
npm run scan -- /path/to/project
```

The scanner writes `public/archmesh.json`.

### Scan + viewer

```bash
npm run atlas -- /path/to/project
```

The launcher scans the target, starts Vite on port 4242, and opens the browser.

### Viewer only

```bash
npm run dev
```

The viewer attempts to load `public/archmesh.json`. If none exists, it falls back to deliberate demo data so the health interactions can still be explored.

## Scanner boundary

`src/scanner/scan.ts` owns source discovery and graph extraction. It should remain focused on evidence that can be defended from source/configuration.

As semantics grow, framework-specific logic should move into adapters rather than turning `scan.ts` into one large collection of unrelated heuristics.

The scanner must not depend on the viewer.

## Graph boundary

`src/types.ts` defines the core interchange contract. Scanner output, future adapters, runtime health sources, persistence/history, and the viewer should converge on this contract rather than passing framework-specific objects through the application.

The graph currently contains:

- architectural nodes;
- directed relationships;
- health state on nodes and edges;
- optional path/metadata.

See `GRAPH_MODEL.md` for details.

## Viewer boundary

`GraphCanvas.tsx` translates `ArchGraphData` into Graphology and Sigma.js rendering attributes. It handles layout, graph selection emphasis, and edge/node visual state.

`App.tsx` owns application UI state such as:

- graph source (scan/demo);
- selected node;
- search;
- errors-only filtering;
- inspector context;
- high-level health counts.

The viewer should not own source-code parsing rules.

## Layout

V1 uses ForceAtlas2 after stable deterministic seed positions. Stable seeds prevent random position changes caused solely by selecting a node/re-rendering the graph.

Longer term, layout stability matters as much as layout quality because users build a spatial mental model. Incremental scans should preserve positions when entities have stable IDs.

## Graph scale

Rendering every technical entity simultaneously will not scale cognitively even if the rendering engine can handle it.

The long-term answer is progressive architecture:

```text
system
  → product
    → feature
      → technical entities
        → source-level detail
```

Clustering, semantic grouping, filtering, and levels of detail are product requirements, not just performance optimizations.

## Health architecture

Health belongs in the same graph model as static architecture.

```text
runtime/build/test evidence
          │
          ▼
   health event adapter
          │
          ▼
 known node / known edge
          │
     direct error
          │
          ▼
 bounded downstream traversal
          │
          ▼
       impacted
```

A future health source must map evidence to known graph identity. It must not fabricate a relationship in order to create a visually complete trace.

## Persistence

V1 uses a generated JSON file and an in-memory graph. This is intentional.

A database should only be introduced when a concrete requirement demands it, such as large-scale history, cross-repository graphs, or efficient incremental querying. The core architecture should not adopt a hosted graph database simply because the product visualizes a graph.

## AI boundary

ArchMesh does not require an LLM for core scanning, layout, exploration, or health visualization.

AI may later help with natural-language graph filtering, explanation, semantic grouping, or documentation, but it should consume the same graph rather than becoming the authority that invents the graph.

## Security/privacy boundary

The source repository and generated graph remain local in the default architecture. Future hosted/production integrations must be optional and document exactly what data leaves the machine.

See `SECURITY.md`.
