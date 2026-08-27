# Health and observability

ArchMesh treats health as part of architecture. The goal is not to bolt a monitoring dashboard onto a dependency graph; it is to let runtime/build/test evidence illuminate the architectural path users already understand.

Runtime ingestion is not implemented in the first slice. The graph schema and UI states are intentionally prepared for it.

## Health states

### `healthy`

No known failure is associated with the entity or relationship in the active context.

`healthy` must not be interpreted as proof that a system is globally correct. It means ArchMesh currently has no evidence marking it otherwise.

### `warning`

The entity or relationship is degraded, suspicious, incomplete, or deserves attention but does not meet the definition of a direct failure.

Examples may eventually include repeated retries, elevated latency, partial test failure, stale scan data, or ambiguous runtime evidence.

### `error`

Direct evidence identifies the node or edge as failing.

Examples:

- a route returned a 500;
- a build error maps to a specific module/import relationship;
- a test failure maps to a service interaction;
- a webhook handler threw;
- an instrumented dependency call failed.

### `impacted`

The entity or relationship is downstream of a known error and may be affected, but ArchMesh does not have direct evidence that it is failing.

This distinction is fundamental.

```text
Stripe
  │ ERROR
  ▼
Webhook handler
  │ ERROR
  ▼
Subscription service
  │ impacted
  ├────────► Hiring
  └────────► Story
```

The direct failing path is `error`. Blast radius is `impacted`.

### `unknown`

ArchMesh lacks sufficient evidence to establish health.

Unknown should be used when evidence is absent or stale rather than silently presenting certainty.

## Propagation

Future health propagation should follow directed architecture relationships and explicit rules.

A direct error may mark downstream paths `impacted`, but propagation should be bounded and explainable. Not every transitive dependency should automatically become visually alarming.

Possible controls include:

- maximum traversal depth;
- relation types eligible for propagation;
- semantic boundaries;
- confidence/evidence thresholds;
- user-selected impact scope.

## Evidence model

A future health event should retain enough information to answer: “Why is this red?”

Likely fields include:

```ts
interface HealthEvent {
  id: string;
  state: 'warning' | 'error';
  targetNodeId?: string;
  targetEdgeId?: string;
  source: 'build' | 'test' | 'runtime' | 'log' | 'browser' | 'external';
  message: string;
  observedAt: string;
  sourceLocation?: {
    path?: string;
    line?: number;
    column?: number;
  };
  metadata?: Record<string, unknown>;
}
```

This is directional design, not the current implemented schema.

## Planned local signal sources

The earliest useful health sources can remain local:

- TypeScript/compiler errors
- Vite/Next.js build errors
- test failures
- lint failures where they represent meaningful breakage
- browser runtime errors
- failed local HTTP requests
- development-server exceptions

These can provide immediate value without requiring production telemetry.

## Planned optional production sources

Future adapters may consume evidence from systems such as:

- Vercel logs/runtime errors
- Firebase/Cloud Functions errors
- PostHog errors
- Stripe webhook failures
- application logging/OTel sources

Hosted integrations must remain optional. The local-first architecture should not become dependent on any one vendor.

## Error inspector

Selecting a red path should eventually expose:

- what failed;
- direct evidence/message;
- source location when available;
- when it was observed;
- the relationship that failed;
- directly affected node(s);
- downstream `impacted` paths;
- relevant code/log navigation actions.

The inspector should distinguish observed facts from inferred impact.

## Time and history

A later history layer can correlate architecture with Git and health events:

```text
commit / change
   ↓
changed architectural entities
   ↓
first observed failure
   ↓
error path
   ↓
impact path
```

This can enable a “what changed before this broke?” workflow without turning ArchMesh into a full source-control product.

## Visual rules

- Error: strong red path treatment.
- Impacted: visually distinct orange/coral or dashed treatment.
- Warning: amber.
- Healthy: neutral.
- Unknown: muted.
- Do not rely on color alone.
- Preserve enough surrounding context to understand the path.
- Avoid propagating red through the entire graph simply because a node is transitively connected.
