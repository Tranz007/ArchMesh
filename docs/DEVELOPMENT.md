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

1. scans the target repository;
2. writes `public/archmesh.json` in the ArchMesh checkout;
3. starts Vite on port `4242`;
4. opens the browser.

## Scan without starting the viewer

```bash
npm run scan -- /absolute/path/to/project
```

Then run:

```bash
npm run dev
```

## Quality checks

Before proposing a change:

```bash
npm run typecheck
npm test
npm run build
```

Do not report a command as passing unless it was executed.

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

Do not commit project source information accidentally. Purpose-built test fixtures should live under a future `test/fixtures/` or equivalent directory and contain only deliberate sample code.

## Adding scanner behavior

Before adding a new recognition rule:

- define what evidence triggers it;
- define the node/edge output;
- decide whether it is detected or inferred;
- document limitations;
- add a focused fixture/test;
- avoid broad regexes that create convincing but false architecture.

Framework-specific behavior should migrate toward adapters as the scanner grows.

## Adding UI behavior

Preserve graph stability and progressive disclosure. Validate at least:

- default graph;
- selected node;
- search result navigation;
- errors-only filtering;
- direct error path;
- impacted path;
- keyboard focus for ordinary controls;
- narrow viewport behavior.

## Debugging

If the graph is empty:

1. run `npm run scan -- <target>` and inspect the node/edge counts;
2. inspect `public/archmesh.json`;
3. confirm the target contains supported source extensions;
4. confirm source files are not under ignored/generated directories.

If the viewer fails to render but data exists, inspect browser console/WebGL errors and run `npm run typecheck` and `npm run build`.

## Branch and PR expectations

Use focused feature branches. Keep product/architecture documentation in the same change when behavior or contracts change. PR descriptions should explain user-visible behavior, architectural impact, validation performed, and known limitations.
