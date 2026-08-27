# Definition of Done

ArchMesh needs an explicit finish line. Without one, a visual architecture tool can expand indefinitely into more scanners, more integrations, more telemetry, and more views without ever becoming a dependable product.

This document defines two levels of done:

1. **Done for an individual change** — the standard every merged feature or fix should meet.
2. **Done for ArchMesh v0.1** — the minimum bar for calling the first public release useful, trustworthy, and supportable.

The roadmap may continue well beyond v0.1. Meeting this definition does not mean ArchMesh is finished forever; it means the first coherent product is finished.

---

## 1. Definition of Done for a change

A change is done only when all applicable conditions below are true.

### Behavior

- The requested behavior works through the real product path, not only through an isolated helper or demo.
- Empty, loading, error, and no-result states are handled where relevant.
- Existing graph semantics are preserved unless the change intentionally updates the contract.
- Direct evidence, inference, health, Git impact, and architecture drift remain semantically distinct.

### Trust

- New scanner relationships have a defensible evidence source.
- Heuristics are conservative and documented.
- A false relationship is treated as a correctness defect, not merely a visualization defect.
- Private or project-specific source names, paths, data, or fixtures are not introduced into the public repository.

### Tests

- New logic has focused automated coverage.
- Regression coverage is added when fixing a defect.
- Graph identity, direction, and state precedence are tested when affected.
- The full test suite passes on a clean CI runner.

### Type and build quality

- TypeScript typechecking passes.
- Production build passes.
- ArchMesh self-scan passes.
- No generated scan data is accidentally committed.

### UX and accessibility

- The graph remains understandable without relying on color alone.
- New states have textual labels or inspector explanation.
- Selection and navigation remain stable enough to preserve the user's mental map.
- Normal controls are keyboard reachable where applicable.
- Narrow viewport behavior is not knowingly broken.
- New complexity is progressively disclosed instead of added permanently to the default canvas.

### Documentation

- README is updated when public usage changes.
- Relevant product, architecture, scanner, graph, health, development, or configuration docs are updated in the same change.
- Consequential design/architecture decisions are recorded in `.ux/DECISIONS.md` when appropriate.
- Roadmap status is updated when a planned capability becomes delivered.

### Reviewability

- The PR explains user-visible behavior, architectural impact, validation performed, and known limits.
- The branch is green before merge.
- The change can be understood without relying on private conversation history.

If an applicable item above is knowingly missing, the change is not done. It may still be a useful prototype or checkpoint, but it should be labeled accordingly.

---

## 2. Definition of Done for ArchMesh v0.1

v0.1 is the first release we should be comfortable giving to someone who has never seen the project and saying:

> Point ArchMesh at your repository. It will help you understand what is connected, what changed, what drifted, and what is failing — locally and without needing us to explain the tool first.

The release is done when the following gates are met.

## A. Installation and first run

- A new user can install/run ArchMesh with a documented one-command experience approaching:

  ```bash
  npx archmesh .
  ```

- No repository clone of ArchMesh is required for ordinary use.
- First run gives a useful result with no mandatory configuration.
- Configuration remains optional and additive.
- Startup errors explain what the user needs to fix.

## B. Supported baseline

v0.1 must clearly define and reliably support its first target rather than claiming universal language support.

Required baseline:

- TypeScript and JavaScript repositories;
- React/Next.js projects as a first-class path;
- relative and TypeScript path-alias module resolution;
- routes, APIs, components, services, data resources, and integrations at a useful architectural level;
- generic projects still receive a useful Code/Architecture graph even when framework-specific semantics are unavailable.

Anything outside the documented baseline may work, but is not part of the v0.1 support promise.

## C. Core product workflows

A user can complete these workflows without maintainer assistance:

1. **Explore architecture** — understand product/feature shape and drill into implementation.
2. **Inspect topology** — see meaningful data-store and external-system relationships.
3. **Trace dependencies** — select a node or connection and understand inbound/outbound context.
4. **See source change impact** — identify directly changed code and reverse-dependent affected code.
5. **See architecture drift** — identify added, removed, and modified structural entities between live scans.
6. **See local health** — map TypeScript diagnostics and generic health signals onto nodes/edges.
7. **Understand blast radius** — distinguish direct `error` evidence from inferred `impacted` paths.
8. **Navigate to source** — open a scanned source entity in the user's editor from the inspector.

## D. Live development experience

- Watch mode is reliable on supported operating systems.
- Graph refresh does not require a browser reload.
- Stable entity identity preserves selection where the entity still exists.
- Rebuild loops are prevented.
- The project has a measured performance baseline on representative repositories.
- Watch behavior is fast enough for normal development use on the documented target size.

Incremental scanning is strongly preferred for v0.1 if full rescans fail the measured performance target. The implementation choice is subordinate to the user-facing performance requirement.

## E. Graph trust and explainability

- Scanner output is conservative and deterministic enough for repeated scans.
- Configured semantics remain distinguishable from detected semantics.
- Direct health evidence remains distinguishable from inferred impact.
- Git `changed` / `affected` remains separate from runtime health.
- Drift `added` / `removed` / `modified` remains separate from both health and Git state.
- Selectable failure connections explain the evidence that made them unhealthy.
- Removed drift entities are visibly historical rather than presented as current architecture.

## F. Large-graph usability

- ArchMesh does not default to an unusable file hairball on representative repositories.
- Architecture view provides meaningful semantic grouping.
- Search and focus make important entities reachable.
- Progressive detail or clustering handles graphs larger than the comfortable default canvas.
- Layout is sufficiently stable across ordinary rescans to support spatial memory.

## G. Privacy and local-first guarantee

- Core scan, graph generation, health overlay, change analysis, drift, and viewer operation work locally.
- No source code is uploaded by default.
- No account is required for the core experience.
- Any future networked adapter is optional and documents exactly what data leaves the machine.
- Generated graph artifacts are gitignored by default.
- Public examples and tests contain no private project names or data.

## H. Quality and compatibility

- CI passes on the supported Node versions.
- CI covers the supported operating-system matrix or equivalent platform-specific tests exist.
- Typecheck, tests, production build, and self-scan are mandatory release checks.
- A representative fixture/e2e repository validates the main scanner/viewer path.
- Known limitations are documented rather than hidden.
- No critical or high-severity known defect remains in a core workflow.

## I. Documentation and onboarding

- README accurately describes current behavior.
- Installation and first-run instructions work from a clean environment.
- CLI options are documented.
- Configuration, health signals, change impact, drift, privacy, development, and contribution docs are current.
- `AGENTS.md` accurately describes the project contract for coding agents.
- Definition of Done and roadmap agree about what remains before v0.1.

## J. Release readiness

- Package name and CLI entry point are finalized for v0.1.
- Versioning and changelog are ready.
- License and contribution/security docs are present.
- The release can be tagged from a green `main` branch.
- A clean install of the published package passes a smoke test against at least one representative repository.

---

## Explicitly not required for v0.1

These may be valuable later, but they must not hold the first release hostage unless user testing proves one is necessary for the core promise:

- hosted ArchMesh accounts;
- collaboration/team features;
- production telemetry backends;
- Vercel/PostHog/Stripe/Firebase production connectors;
- LLM or natural-language graph queries;
- MCP integration;
- cross-repository architecture;
- persistent cloud history;
- support for every language/framework;
- desktop packaging;
- enterprise administration.

The first release should be a strong local developer tool before it becomes a platform.

---

## Release decision rule

When every v0.1 gate above is met, remaining roadmap items must be evaluated as **v0.2+ enhancements**, not reasons to postpone release.

If we cannot explain which unmet gate blocks v0.1, the proposed work does not block v0.1.
