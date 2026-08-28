# Getting started with ArchMesh

ArchMesh is meant to be useful even if you did not hand-write the code yourself.

That includes developers, architects, designers, product builders, and people building software with AI coding tools who want a visual way to understand what the codebase has become.

## The intended first-run experience

The public package target is intentionally simple:

```bash
npx <archmesh-package>
```

The final registry package identity is still being finalized. The unscoped `archmesh` npm name is already used by an unrelated package, so ArchMesh should not publish under that name accidentally.

When ArchMesh is launched with no arguments from an interactive terminal, it starts a short guided flow:

```text
ArchMesh guided start
Map a codebase visually. Your source stays on this machine.

Project folder [/current/project]:
Keep the map live while the code changes? [Y/n]:
Open source with auto, cursor, code, or zed [auto]:
```

Pressing Enter accepts the useful defaults. Live mode defaults on because it is especially useful while building with an AI coding tool: as the code changes, the map changes with it.

After scanning, the CLI prints a plain-language summary before opening the graph, for example:

```text
Mapped 94 nodes and 131 connections.
  Detected: JavaScript / TypeScript + Next.js
  Architecture: 8 routes · 12 APIs · 4 data stores · 5 integrations
  Integrations: Firebase, OpenAI, Resend, Stripe, Vercel
  Security evidence: 2 security findings · 6 sensitive flows
```

The numbers are derived from the same graph evidence the viewer uses. They are not AI-generated guesses.

## Current source-checkout path

Until the registry package identity and first public release are finalized:

```bash
git clone https://github.com/Tranz007/ArchMesh.git
cd ArchMesh
npm install
npm run atlas -- /absolute/path/to/your/project
```

For a live map:

```bash
npm run atlas -- /absolute/path/to/your/project --watch
```

The compiled/packageable CLI supports the guided mode directly:

```bash
archmesh
archmesh --guided
```

When the package is published, the goal is that people should not need to clone the ArchMesh repository first.

## If you build with AI

A useful workflow is:

```text
AI coding tool
     │
     │ changes source
     ▼
local project ───────► ArchMesh --watch
                           │
                           ▼
                    visual architecture
```

Keep ArchMesh open beside the coding tool. As files, dependencies, routes, APIs, integrations, data relationships, or architecture boundaries change, ArchMesh rebuilds the graph.

The purpose is not to make a non-developer pretend to be a developer. It is to make the structure of the software visible enough to ask better questions:

- What did the AI just add?
- What is this feature connected to?
- Why does this page depend on that service?
- Where is user data stored?
- What external systems does this flow touch?
- What could be affected if this service changes?
- Is sensitive data crossing an external boundary?

## Guided mode and automation coexist

Guided mode is only used when ArchMesh has an interactive terminal and was started with no arguments (or explicitly with `--guided`).

Scripts, CI, coding agents, and advanced users can continue to use deterministic arguments:

```bash
archmesh . --watch
archmesh . --changes
archmesh . --changes-from main
archmesh . --diagnostics
archmesh . --editor cursor
```

A non-interactive invocation with no arguments still scans the current directory. The CLI does not block automation waiting for answers.

## Installation direction after v0.1 alpha

The release sequence should favor progressively lower-friction entry points:

1. **npm/npx** — one command, cross-platform, guided when interactive;
2. **copyable AI instruction** — documentation that users can paste into Codex/Cursor/Claude Code and let the agent launch ArchMesh for the current project;
3. **optional desktop launcher** — a future signed macOS/Windows app where a user can choose or drag in a project folder without knowing CLI syntax;
4. **editor integrations** — launch/reopen ArchMesh from coding environments without changing the core local-first scanner.

The CLI remains the foundational path because it is portable, scriptable, local-first, and works equally well for humans and coding agents.
