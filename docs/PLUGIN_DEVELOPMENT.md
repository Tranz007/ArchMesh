# Parser and framework plugin development

ArchMesh is designed to expand across languages and frameworks without turning its core scanner into a monolith.

The extension model has two layers:

1. **Language plugins** parse source and produce structural graph evidence.
2. **Framework adapters** enrich that graph with framework-specific architecture.

Both layers target the shared `ArchGraphData` contract.

## When to build a language plugin

Create a language plugin when ArchMesh does not parse the primary source language at all.

Examples:

- Python
- Java/Kotlin
- C#/.NET
- Go
- Rust
- Ruby
- PHP

A language plugin should focus on evidence common across frameworks in that language: files/modules, imports, packages, resolvable calls/dependencies, generic service/data patterns, and external boundaries where they can be defended from source.

Do **not** put Django, Spring, ASP.NET, or Rails-specific semantics into the base language parser unless they are genuinely language semantics.

## When to build a framework adapter

Create a framework adapter when the language graph already exists but ArchMesh needs to understand architecture unique to a framework or platform.

Examples:

- Next.js routes, route handlers, and server actions
- Angular routes, DI, standalone components, guards, and `HttpClient`
- NestJS modules/controllers/providers/guards
- FastAPI route decorators and dependency injection
- Spring controllers/services/repositories/DI
- ASP.NET Core controllers/minimal APIs/DI

Adapters add meaning without replacing the source graph.

The built-in `nextjs` adapter in `src/plugins/frameworks/nextjs.ts` is the first production reference implementation. It demonstrates conservative framework detection, enrichment of existing source nodes, framework-owned call edges, and capability declarations without coupling the viewer to Next.js.

## Language plugin contract

The current TypeScript contract is in `src/plugins/types.ts`.

A minimal language plugin looks like:

```ts
import {
  ARCHMESH_PLUGIN_API_VERSION,
  type LanguagePlugin,
} from '../types.js';

export const pythonPlugin: LanguagePlugin = {
  apiVersion: ARCHMESH_PLUGIN_API_VERSION,
  id: 'python',
  displayName: 'Python',
  languages: ['Python'],
  extensions: ['.py'],
  capabilities: [
    'source-files',
    'imports',
    'module-resolution',
  ],
  async scan({ root }) {
    return scanPythonProject(root);
  },
};
```

The scanner function returns an `ArchGraphData` fragment. It should return an empty graph when no supported source is present.

## Framework adapter contract

A minimal adapter looks like:

```ts
import {
  ARCHMESH_PLUGIN_API_VERSION,
  type FrameworkAdapter,
} from '../types.js';

export const fastApiAdapter: FrameworkAdapter = {
  apiVersion: ARCHMESH_PLUGIN_API_VERSION,
  id: 'fastapi',
  displayName: 'FastAPI',
  languagePluginIds: ['python'],
  capabilities: ['routes', 'api-handlers'],

  async detect({ root, graph }) {
    return hasFastApiEvidence(root, graph);
  },

  async enrich(context) {
    return collectFastApiSemantics(context);
  },
};
```

`enrich()` returns only its contribution: nodes, edges, and/or metadata. The host merges the contribution with existing graph identity.

## Stable identity rules

Plugin interoperability depends on deterministic identity.

Language plugins should prefer stable IDs derived from source identity, for example:

```text
file:src/example.py
module:com.example.orders
integration:http:api.example.com
```

Framework adapters should enrich an existing source node when possible rather than inventing a duplicate representation of the same entity.

When an architectural entity truly exists above source files, use an explicit semantic namespace:

```text
route:fastapi:/orders/{id}:GET
service:spring:com.example.OrderService
```

Identity conventions will be tightened before third-party plugin publication; contributors should preserve deterministic, human-debuggable IDs in the meantime.

## Graph merge behavior

The host can combine graph fragments from multiple language plugins.

For a mixed repository:

```text
repo/
├── web/   TypeScript
└── api/   Python
```

ArchMesh can eventually run both language plugins and merge their nodes/edges into one graph.

Duplicate stable node IDs are merged, including metadata. Duplicate logical edges are deduplicated by:

```text
source + target + relation + label
```

Final edge IDs are regenerated after merge so separate plugins cannot collide on local `edge:1` identifiers.

## Capability declarations

Plugins declare capabilities such as:

- `source-files`
- `imports`
- `module-resolution`
- `components`
- `services`
- `routes`
- `api-handlers`
- `http-calls`
- `data-resources`
- `integrations`
- `security-evidence`
- `server-actions`

These are evidence claims, not marketing labels. A plugin should declare a capability only when representative fixtures prove it.

The active plugin/adapter IDs and capabilities are recorded in graph metadata. This can later power support reporting, diagnostics, and generated portions of the public support matrix.

## API versioning

The host checks `apiVersion` at runtime.

If an external plugin targets a different ArchMesh plugin API, the host must fail clearly rather than attempt a best-effort load that could silently corrupt graph semantics.

The first internal contract is:

```text
ARCHMESH_PLUGIN_API_VERSION = 1
```

The TypeScript interface may evolve while plugins are internal. Once external package loading is declared stable, API-version compatibility becomes part of the public extension contract.

## External plugin safety

A parser plugin executes local code and needs access to the repository it scans. That makes plugin loading a security boundary.

ArchMesh must **not** automatically install or execute arbitrary packages because a matching extension was detected.

Future external plugins should be explicitly installed and allow-listed through an ArchMesh configuration mechanism. Documentation must make clear that enabling a third-party parser grants it source access with the permissions of the ArchMesh process.

First-party plugins may eventually use package names such as:

```text
@archmesh/plugin-python
@archmesh/plugin-jvm
@archmesh/plugin-dotnet
@archmesh/adapter-angular
```

Those names are illustrative until package identity is finalized.

## Testing requirements

A new language plugin should include fixtures that prove at least:

- supported file discovery;
- local import/dependency direction;
- stable IDs;
- duplicate-free edges;
- representative project/module behavior;
- absence of fabricated relationships for unsupported dynamic constructs.

A framework adapter should include fixtures for:

- conservative framework detection;
- each semantic capability it claims;
- stable enrichment of existing source nodes;
- route/data/call direction where applicable;
- false-positive cases where similar syntax is not the framework behavior.

A support-matrix status must not be promoted until those fixtures or representative repositories justify the claim.

## Current migration sequence

1. Plugin host and merge contract — **implemented**.
2. Existing JavaScript/TypeScript scanner registered as first built-in language plugin — **implemented**.
3. Next.js-specific route/API/server-action semantics extracted into the first production framework adapter — **implemented**.
4. Add deeper Angular / Node-framework adapters.
5. Add the first non-JavaScript language plugin.
6. Finalize explicit external plugin discovery/loading only after the internal API has survived real parser additions.

This sequence intentionally proves the contract internally before asking third-party contributors to depend on it.
