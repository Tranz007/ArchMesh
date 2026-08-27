# Graph model

ArchMesh uses one graph model for static architecture and future runtime health. The model is intentionally small enough to serialize, inspect, test, and evolve without binding the project to a specific graph database.

## Root document

```ts
interface ArchGraphData {
  project: string;
  generatedAt: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
}
```

The first implementation serializes this structure to `public/archmesh.json` for the local viewer.

## Nodes

```ts
interface ArchNode {
  id: string;
  label: string;
  kind: NodeKind;
  path?: string;
  health: HealthState;
  metadata?: Record<string, string | number | boolean | null>;
}
```

### Current node kinds

- `product`
- `feature`
- `route`
- `component`
- `service`
- `api`
- `data`
- `integration`
- `file`
- `module`
- `unknown`

These are architectural roles, not language syntax. A future symbol-level layer may add additional types, but new kinds should not be introduced merely to mirror every AST construct.

### Node identity

IDs should be deterministic for the same architectural entity whenever practical. Current source-file IDs use the form:

```text
file:path/to/file.ts
```

Known external integrations use IDs such as:

```text
integration:firebase
integration:stripe
```

Stable identity matters because future health events, history, annotations, layout memory, and change-impact data need to attach to the same entity across scans.

## Edges

```ts
interface ArchEdge {
  id: string;
  source: string;
  target: string;
  relation:
    | 'contains'
    | 'imports'
    | 'calls'
    | 'reads'
    | 'writes'
    | 'depends-on'
    | 'integrates-with';
  health: HealthState;
  label?: string;
}
```

### Relationship direction

Direction should describe the detected relationship, not visual preference. Examples:

```text
component → imports → hook
route → calls → API
service → writes → Firestore collection
Stripe → calls → webhook handler
product → contains → feature
```

If the UI needs to render an inverse perspective, it should derive that view without rewriting the source relationship.

## Health

```ts
type HealthState =
  | 'healthy'
  | 'warning'
  | 'error'
  | 'impacted'
  | 'unknown';
```

Health applies to both nodes and edges. See `HEALTH_AND_OBSERVABILITY.md` for semantics and propagation rules.

## Evidence and confidence

The current first slice does not yet store evidence provenance or confidence. Before adding richer inference, the graph model should gain explicit metadata rather than encoding uncertainty only in labels.

A likely future direction is:

```ts
interface Evidence {
  source: 'ast' | 'runtime' | 'config' | 'git' | 'user';
  certainty: 'detected' | 'inferred' | 'configured';
  detail?: string;
}
```

This is intentionally not implemented yet; do not pretend current edges carry a confidence model they do not have.

## Semantic overlays

Framework adapters may enrich generic file/import relationships with higher-level architecture. For example:

```text
app/api/billing/route.ts
```

may be represented as an `api` node rather than only a generic `file` node.

Later, an adapter could add a semantic `feature` node and `contains` edges without deleting the underlying technical relationships.

## Graph design rule

More nodes are not automatically more useful. The viewer should optimize for understandable relationships, and the scanner should prefer a smaller trustworthy graph over a massive speculative one.
