# Health and observability

ArchMesh treats health as part of architecture. The goal is not to bolt a monitoring dashboard onto a dependency graph; it is to let build, test, runtime, and integration evidence illuminate the architectural path users already understand.

The first health pipeline is now implemented locally:

```text
architecture scan
      +
health signals
      ↓
health overlay
      ↓
direct error/warning
      ↓
reverse dependency propagation
      ↓
impacted blast radius
      ↓
Architecture / Topology / Code views
```

## Health states

### `healthy`

No known failure is associated with the entity or relationship in the active scan.

`healthy` is not proof that a system is globally correct. It means ArchMesh currently has no evidence marking it otherwise.

### `warning`

Direct evidence says an entity or relationship deserves attention but is not a confirmed failure.

### `error`

Direct evidence identifies the node or connection as failing.

Examples:

- a route returned a 500;
- TypeScript reports an error in a source file;
- a test adapter maps a failure to a service;
- a webhook call fails;
- a dependency connection has direct runtime failure evidence.

### `impacted`

The entity or relationship depends on a known error and may be affected, but ArchMesh does not have direct evidence that it is failing.

This distinction is fundamental.

```text
UI
 │ impacted
 ▼
Service
 │ impacted
 ▼
API
   ERROR
```

Because ArchMesh dependency edges point from a consumer toward what it depends on, impact propagation walks **incoming edges** from the direct failure back toward consumers.

### `unknown`

ArchMesh lacks sufficient evidence to establish health.

## Current health signal contract

Health adapters produce a small common signal shape:

```ts
interface HealthSignal {
  id?: string;
  severity: 'warning' | 'error';
  source: string;
  message: string;
  timestamp?: string;
  node?: {
    id?: string;
    path?: string;
  };
  edge?: {
    source: { id?: string; path?: string };
    target: { id?: string; path?: string };
  };
}
```

A signal must target either a node or a directed edge.

Node signals are useful for compiler, test, or runtime failures that map cleanly to one source entity.

Edge signals are useful when the failure is specifically a relationship such as an API request or dependency call. In that case ArchMesh marks the connection itself `error` and the calling/source node `error` without claiming the target failed.

## Local health file

By default ArchMesh looks for:

```text
<project>/.archmesh/health.json
```

The file can contain either an array of signals or an object with a `signals` array.

Example:

```json
{
  "signals": [
    {
      "id": "story-publish-500",
      "severity": "error",
      "source": "runtime",
      "message": "POST /api/story/publish returned 500",
      "edge": {
        "source": { "path": "src/app/story/page.tsx" },
        "target": { "path": "src/app/api/story/publish/route.ts" }
      }
    }
  ]
}
```

An alternate file can be supplied explicitly:

```bash
npm run atlas -- /path/to/project --health ./signals.json
```

See [`examples/health.json`](../examples/health.json).

## TypeScript diagnostics

ArchMesh includes its first automatic health adapter: TypeScript compiler diagnostics.

Run:

```bash
npm run atlas -- /path/to/project --diagnostics
```

ArchMesh uses the project's `tsconfig.json`, runs TypeScript diagnostics with `noEmit`, converts file-based errors and warnings into health signals, and applies them to the graph.

A TypeScript error becomes a direct red node. Files that depend on the failing file become `impacted` through reverse dependency traversal.

The same option works with the scan-only command:

```bash
npm run scan -- /path/to/project --diagnostics
```

## Combining health sources

The health file and TypeScript diagnostics can be combined:

```bash
npm run atlas -- /path/to/project --health ./runtime-signals.json --diagnostics
```

All signals are applied to the same graph before the viewer opens.

## Evidence retained on nodes

When a direct signal maps to a node, ArchMesh stores local evidence in node metadata:

```text
healthSource
healthMessage
healthTimestamp
healthSignalId
```

This is what the inspector can use to answer “why is this red?” without confusing a propagated impact state with direct evidence.

## Propagation rules

Current propagation is deliberately simple and explainable:

1. Direct `error` evidence marks the target node or edge red.
2. For an edge failure, the caller/source node also becomes `error`.
3. ArchMesh walks incoming dependency edges from directly failing nodes.
4. Healthy dependents become `impacted`.
5. Healthy connecting edges become `impacted`.
6. Direct errors are never downgraded to impact.
7. Warnings do not currently propagate blast radius.

Future versions may add bounded depth, relation-specific propagation, and confidence rules.

## Current and planned signal sources

Implemented:

- local JSON health signals;
- TypeScript compiler diagnostics.

Planned local adapters:

- Vite/Next.js build errors;
- Vitest/Jest/Playwright failures;
- browser runtime errors;
- failed local HTTP requests;
- development-server exceptions.

Possible optional production adapters:

- Vercel logs/runtime errors;
- Firebase/Cloud Functions errors;
- PostHog errors;
- Stripe webhook failures;
- OpenTelemetry/application logging sources.

Hosted integrations must remain optional. The local-first architecture should not become dependent on any one vendor.

## Error inspector direction

The inspector separates outbound and inbound relationships:

- **Depends on** — what the selected entity consumes/calls/imports;
- **Depended on by** — what may be affected when the selected entity fails.

This direction is especially important when reading impact propagation.

## Visual rules

- Error: strong red path treatment.
- Impacted: visually distinct orange/coral treatment.
- Warning: amber.
- Healthy: neutral.
- Unknown: muted.
- Do not rely on color alone.
- Preserve enough surrounding context to understand the path.
- Do not turn every transitive connection red simply because it is related to an error.
