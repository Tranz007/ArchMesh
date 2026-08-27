# Development

## Requirements

- Node.js 22.18+
- npm
- Git
- A modern browser with WebGL support for Sigma.js

## Install

```bash
npm install
```

## Run ArchMesh against itself

```bash
npm run atlas
```

The scanner targets the current working directory when no project path is supplied.

## Run against another local project

```bash
npm run atlas -- /absolute/path/to/project
```

The launcher:

1. builds the graph from the target repository;
2. applies optional Git-change and health overlays;
3. writes `public/archmesh.json` in the ArchMesh checkout;
4. starts Vite on port `4242`;
5. opens the browser.

## Live watch mode

```bash
npm run atlas -- /absolute/path/to/project --watch
```

Watch mode observes supported source files and ArchMesh-relevant project configuration. Events are debounced, and rebuilds are serialized so a burst of filesystem changes cannot start overlapping scans.

When a rebuild finishes, the launcher writes the new graph and sends a custom Vite event (`archmesh:graph`). The viewer re-fetches `archmesh.json` without a full page reload. This preserves the current graph mode and preserves node/edge selection when the selected identity still exists.

Ignored watch paths include common generated/vendor directories and ArchMesh's own generated `public/archmesh.json`, preventing self-scan loops.

Current watch mode performs a full graph rebuild. Incremental scanning and graph deltas are future work.

## Git change impact

Current working tree:

```bash
npm run atlas -- /absolute/path/to/project --changes
```

Changes since a base ref:

```bash
npm run atlas -- /absolute/path/to/project --changes-from main
```

Combine with watch mode:

```bash
npm run atlas -- /absolute/path/to/project --changes --watch
```

`changed` means the source file itself is in the selected Git change set. `affected` means a reverse dependency leads to changed code. These are source-control states, not runtime-health states.

## Health overlays

TypeScript diagnostics:

```bash
npm run atlas -- /absolute/path/to/project --diagnostics
```

Generic health signal file:

```bash
npm run atlas -- /absolute/path/to/project --health ./signals.json
```

Useful combinations are intentionally supported:

```bash
npm run atlas -- /absolute/path/to/project --watch --changes --diagnostics
```

A node can therefore be `changed` and `error`, or `affected` and `impacted`, without ArchMesh conflating the two dimensions.

## Scan without starting the viewer

```bash
npm run scan -- /absolute/path/to/project
```

The scan command uses the same shared graph-build pipeline as the viewer launcher. It accepts the same overlay flags, including `--changes`, `--changes-from`, `--diagnostics`, `--health`, and `--watch`.

To inspect a one-time scan in the viewer afterward:

```bash
npm run dev
```

## Graph build pipeline

All CLI entry points use `src/build-graph.ts`:

```text
scan source
   ↓
exact graph
   ↓
optional Git change impact
   ↓
optional health signals / TypeScript diagnostics
   ↓
ArchGraphData
```

Do not reimplement this composition in new commands or adapters. Extend the shared pipeline instead.

## Quality checks

Before proposing a change:

```bash
npm run typecheck
npm test
npm run build
```

Do not report a command as passing unless it was executed.

CI additionally runs ArchMesh against itself through `npm run scan`, exercising the shared build pipeline on a clean GitHub runner.

## UX Skills

ArchMesh follows the UX guardrails in `AGENTS.md` whether or not the portable UX Skills suite is installed.

To install Tony Moura's canonical UX Skills into your agent environment from the ArchMesh project directory:

```bash
npm run ux:install
```

This invokes:

```bash
npx skills add Tranz007/ux-skills --all
```

Then ask your agent to run `setup-ux` once so it can use the committed `.ux/` project context and inspect the repository.

The canonical skills remain in `Tranz007/ux-skills`; ArchMesh does not vendor a duplicate copy.

## Generated graph data

`public/archmesh.json` is generated scan output. It is local working data, not architecture documentation and not a canonical fixture.

Do not commit project source information accidentally. Purpose-built test fixtures should contain only deliberate sample code.

## Adding scanner behavior

Before adding a new recognition rule:

- define what evidence triggers it;
- define the node/edge output;
- decide whether it is detected or inferred;
- document limitations;
- add a focused fixture/test;
- avoid broad regexes that create convincing but false architecture.

Framework-specific behavior should migrate toward adapters as the scanner grows.

## Adding health adapters

Health producers should emit the generic health-signal contract rather than directly mutating the graph. The health application layer owns severity and impact propagation.

A direct error must remain distinguishable from inferred downstream `impacted` state.

## Adding change behavior

Git/change producers should feed changed source paths into the change-impact layer. `changed` and `affected` must remain separate from health.

Do not use red/error styling merely because source changed.

## Adding UI behavior

Preserve graph stability and progressive disclosure. Validate at least:

- Architecture view;
- Topology view;
- Changes view;
- Code view;
- selected node;
- selected edge;
- search result navigation;
- errors-only filtering;
- direct error path;
- impacted path;
- changed and affected paths;
- keyboard focus for ordinary controls;
- narrow viewport behavior.

Live-refresh work should avoid resetting view state unnecessarily.

## Debugging

If the graph is empty:

1. run `npm run scan -- <target>` and inspect the node/edge counts;
2. inspect `public/archmesh.json`;
3. confirm the target contains supported source extensions;
4. confirm source files are not under ignored/generated directories.

If Changes is empty, verify ArchMesh was run with `--changes` or `--changes-from <ref>` and that the changed files are part of the scanned source graph.

If watch mode does not refresh, first verify the changed path passes `shouldWatchPath`, then check the terminal for rebuild errors and the browser console for the `archmesh:graph` HMR path.

If the viewer fails to render but data exists, inspect browser console/WebGL errors and run `npm run typecheck` and `npm run build`.

## Branch and PR expectations

Use focused feature branches. Keep product/architecture documentation in the same change when behavior or contracts change. PR descriptions should explain user-visible behavior, architectural impact, validation performed, and known limitations.
