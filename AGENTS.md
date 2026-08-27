# AGENTS.md

ArchMesh is a local-first visual architecture explorer. It turns source code, source-control changes, architecture drift, and runtime health signals into a living graph that helps people understand how a system is connected, what changed, what failed, and what may be affected.

## Product intent

ArchMesh is not primarily a code search tool, static diagram generator, generic observability dashboard, or AI chat wrapper. Its core value is a trustworthy visual model of software architecture that can move from ecosystem → product → feature → route/service/component → file/data/integration and can show evidence directly on relationships.

The central interaction should remain understandable to a technical product/design/architecture practitioner, not only to compiler or graph specialists.

## Read before changing the project

Read these documents before substantive work:

- `README.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/GRAPH_MODEL.md`
- `docs/SCANNER.md`
- `docs/HEALTH_AND_OBSERVABILITY.md`
- `docs/DEVELOPMENT.md`
- `docs/DEFINITION_OF_DONE.md`
- `docs/ROADMAP.md`
- `.ux/CONTEXT.md`
- `.ux/DESIGN-SYSTEM.md`
- `.ux/DECISIONS.md`

## Non-negotiable product principles

1. **Local first.** The core experience must work without uploading source code or requiring a hosted database.
2. **Visual first.** Architecture should be understandable by looking at it. Text, logs, and code are supporting evidence, not the primary experience.
3. **Progressive detail.** Prefer semantic architecture at first glance; allow users to move deeper into technical detail when needed.
4. **Trustworthy relationships.** Never invent a dependency, failure, data flow, affected path, or architectural meaning. Distinguish detected, inferred, configured, and unknown information when it matters.
5. **Failure is a path, not a decoration.** Direct failures and downstream impact are different states and must remain visually distinct.
6. **Change is not failure.** Git `changed` / `affected`, runtime `error` / `impacted`, and structural drift are independent dimensions.
7. **Do not drown the user in the graph.** Large graphs require filtering, clustering, search, semantic grouping, and progressive disclosure.
8. **Framework knowledge belongs in adapters.** Keep the core graph model generic; Next.js, Firebase, Stripe, React, and other semantics should be layered on through scanners/adapters.
9. **The graph schema is a contract.** New node, edge, health, change, and drift concepts should be documented and tested before they proliferate.
10. **The public repo is project-neutral.** Do not place private/internal product names, paths, data, screenshots, fixtures, or examples in public source, tests, docs, or demo data.

## UX Skills contract

ArchMesh uses the principles from `Tranz007/ux-skills`. If the UX Skills suite is installed, use it naturally. Do not require contributors to memorize skill names.

Always preserve these behaviors:

- **Context** — inspect what is already known before asking someone to repeat it.
- **User** — ground interaction decisions in the people using ArchMesh and the task they are trying to complete.
- **Evidence** — keep known, inferred, assumed, unknown, and conflicted information distinct.
- **System** — reuse established ArchMesh patterns before introducing new ones.
- **Clear** — lead with the useful point and remove unnecessary UI/content/process.
- **Trust** — never invent evidence, architecture, implementation status, health, or compliance.

For product/UI work, consider the UX Skills capabilities for accessibility, blindspots, challenge, critique, state-sweep, system-fit, ripple, decision, handoff, PR writing, and clear communication.

## Visual and interaction rules

- The graph is the primary canvas; controls should support it rather than compete with it.
- Use color semantically and sparingly.
- Do not encode health/change/drift by color alone; provide labels, icons, line treatment, or inspector text where appropriate.
- Direct `error` and downstream `impacted` states must never be visually indistinguishable.
- Clicking a node should make its immediate context easier to understand, not trigger a disorienting relayout.
- Search should navigate the architecture, not act like a generic repository grep UI.
- “Errors only” and other focused views should preserve enough context to understand the path.
- Dense graphs must degrade gracefully on smaller screens and remain keyboard-accessible where practical.

## Engineering rules

- TypeScript strict mode stays enabled.
- Prefer small typed modules with explicit contracts.
- Avoid adding infrastructure that conflicts with local-first operation unless it is optional and clearly separated.
- Do not make the core viewer depend on an LLM, embeddings, vector database, cloud service, or telemetry vendor.
- Adapters may enrich the graph, but raw source scanning must remain useful without them.
- Runtime health ingestion must map evidence onto known graph IDs; it must not fabricate relationships to make an error trace look complete.
- Preserve deterministic IDs for the same architectural entities whenever possible so health/history/change/drift data can attach reliably.
- Keep generated scan output out of source control except deliberate fictional fixtures.

## State semantics

### Health

- `healthy` — no known failure on this entity/relationship.
- `warning` — degraded, suspicious, or partially unhealthy.
- `error` — directly failing based on evidence.
- `impacted` — potentially affected downstream of a known failure; not itself proven to be failing.
- `unknown` — insufficient evidence to establish health.

Never promote `impacted` to `error` without direct evidence.

### Git change impact

- `changed` — source changed directly in the selected comparison.
- `affected` — a reverse dependent of changed source.

Do not imply that either state is a runtime problem.

### Architecture drift

- `added` — structural entity/relationship exists now but not in the previous scan.
- `removed` — existed previously and is retained only as historical context.
- `modified` — stable identity remains but structural metadata changed.
- `stable` — unchanged context retained to explain drift.

Do not derive drift from health or Git overlays alone.

## Scanner discipline

Detection should be conservative. A false architectural relationship damages trust more than an omitted relationship.

When adding framework semantics:

1. Define the input pattern.
2. Define the node/edge output.
3. State whether the relationship is detected or inferred.
4. Add a fictional fixture/test.
5. Document limitations and false-positive risks.

## Documentation discipline

Documentation changes are part of feature completion. If a change alters behavior, graph schema, scanner semantics, CLI usage, health semantics, architecture, or contributor workflow, update the relevant document in the same change.

Record consequential architectural/product decisions in `.ux/DECISIONS.md` rather than allowing rationale to disappear into chat or commit history.

## Definition of Done

`docs/DEFINITION_OF_DONE.md` is the project release contract. Use it when deciding whether a change is complete and whether work is required for v0.1 or belongs in a later release.

Do not keep expanding v0.1 merely because another capability would be interesting. If an unmet release gate cannot be named, the proposed work does not block v0.1.

## Before finishing a change

Run:

```bash
npm run typecheck
npm test
npm run build
```

Also confirm:

- ArchMesh self-scan succeeds;
- public examples/tests contain no private project information;
- relevant docs and roadmap status are current;
- direct evidence and inferred states remain semantically distinct.

For visual changes, inspect an ordinary architecture view, selected-node context, search/navigation, relevant focused/error/change/drift states, and narrow viewport behavior.

Do not claim a check passed unless it was actually run.
