# Contributing to ArchMesh

Thanks for helping improve ArchMesh. The project is early, so contributions should strengthen the product model rather than simply increase feature count.

## Start here

Read `AGENTS.md` and the documentation under `docs/` before making substantive changes. Product context and design decisions also live under `.ux/`.

## Principles

- Keep the core local-first.
- Preserve the graph as the primary experience.
- Prefer trustworthy relationships over speculative completeness.
- Keep direct failures distinct from downstream impact.
- Add framework behavior through explicit adapters as the scanner evolves.
- Avoid graph density that makes the architecture harder to understand.
- Update documentation when behavior or contracts change.

## Development

Install dependencies:

```bash
npm install
```

Run ArchMesh against itself:

```bash
npm run atlas
```

Run against another project:

```bash
npm run atlas -- /absolute/path/to/project
```

Before opening a pull request:

```bash
npm run typecheck
npm test
npm run build
```

For UI changes, visually inspect the default graph, selection, search, errors-only view, direct-error state, impacted state, and a narrow viewport.

## UX Skills

ArchMesh includes project UX context and an `AGENTS.md` UX contract. Contributors using Agent Skills can install Tony Moura's canonical suite with:

```bash
npm run ux:install
```

Then run `setup-ux` once through the agent.

## Scanner contributions

When adding a scanner rule or adapter, include:

- the exact input evidence;
- the graph node/edge output;
- whether the result is detected or inferred;
- known limitations;
- a focused test/fixture when the test harness supports it.

Do not create relationships solely because they look plausible in the graph.

## Pull requests

Keep PRs focused. Explain:

- the problem being solved;
- user-visible behavior;
- architectural/schema impact;
- validation performed;
- known limitations or follow-up work.

If a change modifies a consequential product/architecture decision, update `.ux/DECISIONS.md`.

## Licensing

By contributing, you agree that your contribution is provided under the repository's MIT License.
