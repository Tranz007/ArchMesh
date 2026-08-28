# Incremental Graph Engine

## Purpose

ArchMesh watch mode currently rebuilds the entire graph after every debounced source change. That is acceptable for small projects, but it becomes the wrong cost model as repositories and semantic adapters grow.

The incremental engine should make live architecture updates proportional to the code that actually changed while preserving the same deterministic graph contract as a clean full scan.

## Core rule

**Incremental output must be equivalent to a clean full scan.**

Performance is never allowed to create a second, approximate architecture truth.

## Delivery sequence

### Stage 1 — Per-file analysis cache

Cache expensive source analysis for unchanged files:

- parsed TypeScript/JavaScript source;
- discovered imports/exports/dynamic imports;
- Next.js route/action semantics;
- HTTP call semantics;
- Firestore accesses;
- other adapter evidence that is local to one source file.

The cache is process-local initially. A clean ArchMesh launch still starts from source of truth on disk.

A file cache entry is reusable only while its filesystem signature remains unchanged. Watch events may also invalidate an entry explicitly.

### Stage 2 — Deterministic relinking

Rebuild project-level relationships from cached per-file analyses instead of reparsing every file.

This still produces a complete graph, but avoids most AST and semantic-analysis work when only a small number of files changed.

Project-wide configuration changes such as `tsconfig.json`, `jsconfig.json`, `archmesh.config.json`, or relevant package/workspace configuration invalidate the semantic cache because module resolution or feature ownership may have changed globally.

### Stage 3 — Graph deltas

Once cached relinking is proven equivalent to full scanning, calculate explicit graph deltas:

- nodes added / removed / modified;
- edges added / removed / modified;
- affected synthetic projections.

The viewer can then update Graphology incrementally rather than replacing and relaying out the whole graph.

### Stage 4 — Stable progressive layout

Use graph deltas to preserve coordinates for unchanged entities and lay out only new or materially changed neighborhoods.

This is the point where large-project watch mode should feel visually stable rather than like a fresh diagram after every edit.

## Cache correctness

The first cache is intentionally memory-only.

Benefits:

- no source-derived cache is written into the scanned repository;
- no stale cache survives a new ArchMesh process;
- no cache migration/versioning problem yet;
- correctness is easy to reason about while the contract settles.

Persistent cache can come later behind a versioned format if measurement proves startup analysis is a material bottleneck.

## Invalidation

### File-local invalidation

Reanalyze when:

- a source file changes;
- a source file is created;
- a source file is deleted or renamed.

### Global invalidation

Clear semantic analysis when any input can change interpretation across many files, including:

- `tsconfig.json`;
- `jsconfig.json`;
- `archmesh.config.json`;
- relevant workspace/package resolution configuration;
- scanner semantic-version changes.

Health signals and Git change overlays are not source-analysis cache inputs. They apply after the structural scan and should not force AST reparsing.

## Measurement

Incremental work should expose scan metrics rather than relying on subjective speed:

- discovered source-file count;
- files analyzed;
- cache hits;
- cache misses;
- files removed from cache;
- scan/relink duration;
- total graph nodes/edges.

These metrics can remain CLI/debug output initially and later support a small local performance inspector.

## Testing contract

For every incremental scenario, tests should compare incremental output against a fresh scan of the same final filesystem state.

Required cases:

- edit one leaf file;
- edit a highly depended-on service;
- add a source file;
- delete a source file;
- rename a source file;
- change an import target;
- change `tsconfig` path aliases;
- change ArchMesh feature configuration;
- add/remove API routes;
- add/remove data or integration evidence.

Canonical graph comparison should ignore generation timestamps and generated edge IDs where identity is structural rather than semantic.

## Non-goals for this slice

- persistent database/cache service;
- cloud indexing;
- speculative partial graphs;
- sacrificing correctness for animation smoothness;
- changing health, Git impact, or Drift semantics.

The incremental engine is infrastructure for the existing product surfaces, not a new competing graph model.
