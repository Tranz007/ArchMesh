# Codebase Support Matrix

ArchMesh is designed around a layered support model. A framework does not need a dedicated adapter before ArchMesh can provide value, but dedicated adapters make the graph substantially richer.

This document distinguishes what ArchMesh can **prove from source today** from deeper framework semantics that are still planned.

## Support levels

| Level | Meaning |
| --- | --- |
| **Deep** | ArchMesh scans the source graph and understands important framework-specific architecture such as routes, handlers, or platform semantics. |
| **Structural** | ArchMesh scans supported source files, resolves local imports, builds dependency structure, applies generic classification, and can detect supported static HTTP/integration evidence. Framework-specific runtime semantics may be missing. |
| **Partial** | ArchMesh can scan JavaScript/TypeScript portions of the repository, but important framework-native files or boundaries are not parsed yet. |
| **Planned** | The primary source language or framework file format is not currently scanned. |

A support level describes ArchMesh's evidence coverage. It does **not** mean ArchMesh can prove every runtime relationship in that stack.

## Framework and application support

| Codebase / framework | Current level | What ArchMesh can see today | Important current gaps |
| --- | --- | --- | --- |
| **Next.js App Router** | **Deep** | TS/JS graph, pages, API route handlers, route paths, exported HTTP methods, server-action evidence, internal `/api/...` fetch mapping, static external fetches | Client/server component boundaries, dynamic URLs, framework-generated virtual modules |
| **React + Vite** | **Structural** | TS/JS/JSX/TSX graph, components, services, imports, static `fetch()`, supported integrations | React Router/Vite semantics are not first-class yet |
| **React / Create React App** | **Structural** | TS/JS/JSX/TSX graph, components, services, imports, static `fetch()`, supported integrations | Router semantics and build-specific boundaries are not first-class yet |
| **Node.js services / libraries** | **Structural** | TS/JS modules, imports, services/repositories/adapters, static `fetch()`, supported integrations | Framework route registration, queues, workers, and runtime-only loading need adapters |
| **Express / Fastify / Hono** | **Structural** | Underlying TS/JS dependency graph and supported static HTTP/integration evidence | Route registration, middleware chains, request/response flow, framework-specific handlers |
| **NestJS** | **Structural** | TypeScript dependency graph, generic service/component classification, supported integrations | Controllers, modules, providers, DI, decorators, guards/interceptors are not semantic entities yet |
| **Angular** | **Structural** | TypeScript graph, components/services by convention, local imports, TS aliases, supported integrations | Angular Router, modules/standalone metadata, DI, templates, signals/RxJS flow, `HttpClient` semantics |
| **React Native / Expo** | **Structural** | TS/JS dependency graph, components, services, static `fetch()`, supported integrations | Expo Router/navigation, native modules, platform boundaries, app configuration semantics |
| **Electron** | **Structural** | TS/JS graph across main/renderer source when inside the scanned root | IPC, preload/context bridge, process boundaries are not modeled yet |
| **npm / pnpm / Yarn monorepos** | **Partial** | Source under the selected root is walked; TS/JS imports and configured aliases can resolve inside that root | Workspace/package boundaries, package-to-package architecture, aliases outside the scan root |
| **Turborepo / Nx** | **Partial** | Underlying TS/JS source can be scanned | Workspace/project graph and task graph semantics are not imported yet |
| **Vue / Nuxt** | **Partial** | Standalone `.ts` / `.js` source is scanned | `.vue` single-file components and Nuxt routing/server semantics are not parsed yet |
| **Svelte / SvelteKit** | **Partial** | Standalone `.ts` / `.js` source is scanned | `.svelte` components and SvelteKit routing/server semantics are not parsed yet |
| **Astro** | **Partial** | Standalone `.ts` / `.js` source is scanned | `.astro` files, islands, and Astro routing semantics are not parsed yet |
| **Python / Django / FastAPI / Flask** | **Planned** | — | Python parser/import graph and framework adapters |
| **Java / Spring** | **Planned** | — | Java parser/import graph, Spring controllers/services/DI/data semantics |
| **Kotlin / Spring** | **Planned** | — | Kotlin parser/import graph and Spring semantics |
| **C# / .NET / ASP.NET Core** | **Planned** | — | C# parser/project graph, controllers/minimal APIs, DI/data semantics |
| **Go** | **Planned** | — | Go module/import graph, HTTP/router/framework semantics |
| **Rust** | **Planned** | — | Cargo/module graph and web-framework semantics |
| **Ruby / Rails** | **Planned** | — | Ruby parser, Rails routes/controllers/models/jobs semantics |
| **PHP / Laravel** | **Planned** | — | PHP parser, Laravel routes/controllers/models/jobs semantics |

## Source-file support today

ArchMesh currently treats these as first-class source files:

| Extension | Status |
| --- | --- |
| `.ts` | Supported |
| `.tsx` | Supported |
| `.js` | Supported |
| `.jsx` | Supported |
| `.mjs` | Supported |
| `.cjs` | Supported |

Files such as `.vue`, `.svelte`, `.astro`, `.py`, `.java`, `.kt`, `.cs`, `.go`, `.rs`, `.rb`, and `.php` are not parsed as source nodes yet.

Configuration files such as `tsconfig.json`, `jsconfig.json`, and `archmesh.config.json` can influence scanning even though they are not represented as ordinary source nodes.

## Cross-framework capabilities

For supported JavaScript/TypeScript source, the following capabilities do not depend on Next.js:

- recursive source discovery inside the selected project root;
- static `import`, `export`, and dynamic-import discovery;
- relative module resolution;
- TypeScript `baseUrl` / `paths` resolution;
- generic component/service/data/file classification by convention;
- static `fetch()` discovery;
- external HTTP host discovery;
- security evidence on statically inspectable `fetch()` payload fields;
- selected integration package detection;
- Git change-impact overlays;
- TypeScript diagnostics;
- health-signal ingestion;
- architecture drift between live scans;
- lenses, Flow, Trace, search, inspection, and editor navigation over whatever graph evidence was detected.

That is why a React, Angular, Node, NestJS, Expo, or Electron repository can already produce a useful ArchMesh graph even before it has a dedicated framework adapter.

## What deeper framework support means

A dedicated adapter should add semantic architecture without replacing the underlying source graph.

For example, deeper Angular support should eventually recognize evidence such as:

```text
Angular source graph
      │
      ├── routes / lazy routes
      ├── standalone components / NgModules
      ├── services + dependency injection
      ├── HttpClient calls
      ├── guards / resolvers / interceptors
      ├── template-to-component relationships
      └── selected RxJS/data-flow evidence
```

Likewise, Express support should understand registered routes and middleware; Vue support should parse SFCs; Spring support should understand controllers, services, repositories, and DI.

## Expansion priority

Breadth matters to ArchMesh. The long-term architecture should be **language parser + framework adapters + shared graph model**, rather than one scanner accumulating framework-specific special cases.

A practical expansion sequence is:

1. deepen the JavaScript/TypeScript ecosystem: Angular, Express/Fastify/Hono, NestJS, React Router/Vite, Expo Router;
2. add framework-native component formats: Vue/Nuxt, Svelte/SvelteKit, Astro;
3. improve workspace/monorepo semantics: npm/pnpm/Yarn workspaces, Nx, Turborepo;
4. add major backend language families: Python, Java/Kotlin, C#/.NET, Go;
5. extend into additional ecosystems based on representative repositories and contributor demand.

This ordering is not a promise of release dates. Support should be promoted only when representative fixtures and tests prove the claimed behavior.

## Promotion rule

A stack moves upward in this matrix only when the corresponding behavior is covered by automated fixtures or representative repository validation.

ArchMesh should never label a framework **Deep** because its files happen to parse. Deep support means the graph understands meaningful architecture unique to that framework.
