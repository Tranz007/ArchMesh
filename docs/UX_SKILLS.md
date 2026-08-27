# UX Skills integration

ArchMesh uses Tony Moura's open-source UX Skills as project-level design guardrails for AI-assisted work.

Canonical repository:

```text
https://github.com/Tranz007/ux-skills
```

## Why they are used here

ArchMesh is a technical developer tool, but its value depends heavily on interaction design: graph comprehension, progressive disclosure, state visibility, accessibility, error understanding, and preserving a user's mental model while the architecture changes.

UX Skills helps coding agents treat those concerns as product requirements rather than cosmetic cleanup.

Particularly relevant capabilities include:

- `accessibility` — ensure graph/supporting UI has accessible alternatives and state communication;
- `blindspots` — surface missing states and overlooked workflows;
- `challenge` — test assumptions before adding complexity;
- `critique` — review the experience against actual ArchMesh context;
- `state-sweep` — inspect loading, empty, error, degraded, stale, and recovery states;
- `system-fit` — reuse established ArchMesh patterns before inventing new ones;
- `ripple` — consider downstream UX impact when changing core interactions;
- `decision` — preserve consequential rationale;
- `handoff` — preserve UX intent through implementation;
- `pr` — produce reviewable UX-aware PR descriptions;
- `clear` — keep interface language and documentation direct.

## Install

From the ArchMesh repository:

```bash
npm run ux:install
```

Equivalent command:

```bash
npx skills add Tranz007/ux-skills --all
```

Then ask the coding agent to run:

```text
setup-ux
```

once for the project.

## Project context

ArchMesh commits the three small context files expected by UX Skills:

```text
.ux/
├── CONTEXT.md
├── DESIGN-SYSTEM.md
└── DECISIONS.md
```

These files are part of the repository because they describe shared product context and decisions, not personal agent configuration.

## Why the skills are not vendored

The complete skills suite stays canonical in `Tranz007/ux-skills` instead of being copied into ArchMesh.

That avoids:

- two versions drifting apart;
- fixes needing to be applied in multiple repositories;
- ArchMesh becoming a distribution mechanism for a separate project;
- contributors accidentally modifying a copied skill and assuming the canonical suite changed.

`AGENTS.md` contains the essential ArchMesh-specific UX contract so an agent still has the critical guardrails even when the portable skills are not installed.
