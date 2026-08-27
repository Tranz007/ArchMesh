# Scanner

The ArchMesh scanner converts a source repository into `ArchGraphData`. The implementation is deliberately conservative and currently focused on TypeScript/JavaScript applications.

## Current behavior

The scanner:

- recursively walks the target project;
- ignores common generated/vendor directories such as `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, and `.turbo`;
- reads JavaScript/TypeScript source files;
- parses import/export declarations and nested dynamic imports with the TypeScript compiler API;
- resolves relative imports to local source files;
- uses the project's TypeScript module resolver for `baseUrl` / `paths` aliases;
- classifies files using Next.js/common project conventions;
- derives Next.js page/API route paths;
- detects exported API route HTTP methods;
- detects `use server` directives as server-action evidence;
- recognizes selected package imports as integration nodes;
- detects static `fetch()` calls;
- maps static internal `/api/...` fetch calls to matching Next.js API route nodes;
- maps absolute HTTP(S) fetch calls to host integration nodes;
- detects selected Firestore reads, writes, and listeners against statically named collections;
- applies optional feature ownership from `archmesh.config.json` or `.archmesh/config.json`.

## Current file classification

The classifier recognizes:

- Next.js API handlers as `api`;
- Next.js pages as `route`;
- component-like files/directories as `component`;
- service/client/repository/adapter patterns as `service`;
- schema/model/type locations as `data`;
- remaining source files as `file`.

Classification is heuristic. It is not evidence that a file has a particular runtime role beyond the matched convention.

## Next.js semantics

For App Router pages and route handlers, ArchMesh stores metadata such as:

```text
framework = nextjs
routePath = /hiring/candidates/[id]
routeType = page | api
httpMethods = GET, POST
serverActionCount = 1
```

Route groups such as `(main)` and parallel-route segments beginning with `@` are omitted from derived URLs.

## TypeScript path aliases

When a `tsconfig.json` or `jsconfig.json` exists, ArchMesh uses TypeScript's own module resolver rather than reimplementing alias rules.

For example:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

An import such as:

```ts
import { Card } from '@/components/Card';
```

can therefore resolve to the same local file node as a relative import.

## Current integrations

Package imports can create integration nodes for:

- Firebase
- Stripe
- OpenAI
- WorkOS
- Resend
- Vercel

Static absolute `fetch()` calls can also create host-level HTTP integration nodes such as:

```text
api.example.com
```

An external package should not automatically become a first-class architecture node. Integrations are added when they represent a meaningful system boundary users are likely to reason about.

## Internal HTTP calls

Given a detected API route:

```text
src/app/api/story/publish/route.ts
→ /api/story/publish
```

and a static call:

```ts
fetch('/api/story/publish', { method: 'POST' })
```

ArchMesh creates a directed `calls` edge from the calling source file to the API route and labels it:

```text
POST /api/story/publish
```

Current HTTP detection intentionally requires a statically readable URL. Dynamic template strings and URLs assembled at runtime are not guessed.

## Firestore topology

When a file imports Firestore and uses supported operations against a statically named collection, ArchMesh creates a data-resource node.

Example:

```ts
getDocs(collection(db, 'stories'))
setDoc(doc(db, 'stories', id), value)
```

produces:

```text
story service ──reads──► stories
story service ──writes─► stories
```

Supported first-pass operations:

Reads/listeners:

- `getDoc`
- `getDocs`
- `onSnapshot`

Writes:

- `setDoc`
- `addDoc`
- `updateDoc`
- `deleteDoc`

Collection detection is conservative. ArchMesh currently uses the first statically readable collection segment and does not invent names from dynamic expressions.

## Feature semantics

Feature/product-area mappings can be explicitly configured. See [`CONFIGURATION.md`](CONFIGURATION.md).

Configured ownership is stored on scanned nodes and takes precedence over inferred folder ownership in the Architecture and Topology projections.

## Remaining resolution limits

Current known gaps include:

- workspace/package aliases that resolve outside the scanned project root;
- framework-generated virtual modules;
- barrel-export provenance beyond the resolved module target;
- runtime-only module loading where the module string is not statically available;
- dynamic HTTP URLs and client abstractions such as custom Axios wrappers;
- Firestore collection names assembled dynamically;
- subcollection hierarchy beyond the first statically readable collection segment;
- full symbol-level call graphs;
- framework client/server component boundaries.

These limitations should remain visible rather than being hidden behind confident graph output.

## Adapter direction

Framework and platform semantics should continue moving into explicit detectors/adapters rather than accumulating arbitrary inference in one monolithic pass.

An adapter should preserve:

```text
input evidence
    ↓
recognition rule
    ↓
node/edge additions or enrichment
    ↓
provenance / certainty
```

## False-positive policy

A missed edge is inconvenient. A fabricated edge damages trust in the whole graph.

Prefer conservative detection and preserve whether product grouping was configured or detected.

## Performance direction

The current scanner performs a straightforward source walk and parse. Planned optimizations include:

- incremental scans;
- content hashing;
- changed-file analysis;
- cached module resolution;
- worker-based parsing;
- adapter-level invalidation;
- graph deltas instead of full regeneration.

Optimization should follow measured bottlenecks rather than premature complexity.
