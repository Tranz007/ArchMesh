# Scanner

The ArchMesh scanner converts a source repository into `ArchGraphData`. The first implementation is deliberately conservative and focused on TypeScript/JavaScript applications.

## Current behavior

The scanner:

- recursively walks the target project;
- ignores common generated/vendor directories such as `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, and `.turbo`;
- reads JavaScript/TypeScript source files;
- parses import/export declarations and dynamic imports with the TypeScript compiler API;
- resolves relative imports to local source files;
- classifies some files using Next.js/common project conventions;
- recognizes selected external packages as integration nodes.

## Current file classification

The first classifier recognizes:

- Next.js API handlers as `api`;
- Next.js pages as `route`;
- component-like files/directories as `component`;
- service/client/repository/adapter patterns as `service`;
- schema/model/type locations as `data`;
- remaining source files as `file`.

Classification is heuristic. It is not evidence that a file has a particular runtime role beyond the matched convention.

## Current integrations

Package imports can create integration nodes for:

- Firebase
- Stripe
- OpenAI
- WorkOS
- Resend
- Vercel

An external package should not automatically become a first-class architecture node. Add integrations when they represent a meaningful system boundary users are likely to reason about.

## Resolution limits

The first scanner resolves relative imports. It does not yet fully resolve:

- TypeScript `paths` aliases;
- workspace/package aliases;
- framework-generated modules;
- barrel-export provenance beyond the import target;
- runtime-only module loading;
- API calls hidden behind client libraries;
- data read/write semantics.

These limitations should remain visible in documentation until adapters address them.

## Adapter direction

Framework and platform semantics should be implemented as explicit adapters rather than accumulated as arbitrary regexes in the core scanner.

A future adapter should define:

```text
input evidence
    ↓
recognition rule
    ↓
node/edge additions or enrichment
    ↓
provenance / certainty
```

Examples:

### Next.js

- App Router pages/layouts
- route handlers
- server actions
- middleware
- client/server boundaries

### Firebase

- collections/documents
- reads/writes/listeners
- auth
- storage
- functions

### HTTP

- `fetch`/client calls
- route targets
- request/response relationships

### Stripe

- webhook handlers
- checkout/session calls
- subscription/billing paths

## False-positive policy

A missed edge is inconvenient. A fabricated edge damages trust in the whole graph.

Prefer conservative detection and mark inferred relationships explicitly once evidence metadata exists.

## Performance direction

The current scanner performs a straightforward source walk and parse. As repositories grow, planned optimizations include:

- incremental scans;
- content hashing;
- changed-file analysis;
- cached module resolution;
- worker-based parsing;
- adapter-level invalidation;
- graph deltas instead of full regeneration.

Optimization should follow measured bottlenecks rather than premature complexity.
