# Codebase Support Matrix

ArchMesh is designed around a layered support model. A framework does not need a dedicated adapter before ArchMesh can provide value, but dedicated adapters make the graph substantially richer.

This document distinguishes what ArchMesh can **prove from source today** from deeper framework semantics that are still planned.

## Support levels

| Level | Meaning |
| --- | --- |
| **Deep** | ArchMesh scans the source graph and understands important framework-specific architecture such as routes, handlers, or platform semantics. |
| **Structural** | ArchMesh scans the primary source language, resolves supported local dependencies/imports, builds useful structure, and applies tested generic semantics. Framework-specific runtime semantics may be missing. |
| **Partial** | ArchMesh can scan some useful source in the repository, but important language/framework-native files or boundaries are not parsed yet. |
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
| **Angular** | **Deep** | TypeScript graph plus `@Component`/`@Injectable` semantics, static templates, constructor/`inject()` DI, static client routes, nested paths, redirects, eager and lazy component targets | `HttpClient`, NgModule/standalone import graphs, guards/resolvers/interceptors, dynamic route config, RxJS/data-flow semantics |
| **React Native / Expo** | **Structural** | TS/JS dependency graph, components, services, static `fetch()`, supported integrations | Expo Router/navigation, native modules, platform boundaries, app configuration semantics |
| **Electron** | **Structural** | TS/JS graph across main/renderer source when inside the scanned root | IPC, preload/context bridge, process boundaries are not modeled yet |
| **Python services / libraries** | **Structural** | `.py` source graph, absolute and relative package imports, root and `src/` layouts, module/service/data classification, selected integration imports | Dynamic imports, Python call graph, packaging semantics, framework-specific runtime meaning |
| **FastAPI** | **Deep** | Python graph plus FastAPI route decorators, static methods/paths, static `APIRouter` prefixes, semantic handler nodes, selected `Depends(...)` evidence | Router inclusion across modules, dynamic route construction, middleware/security dependency semantics, request/response models |
| **Django / Flask** | **Structural** | Underlying Python source/import graph and generic structure | Framework routes, handlers/views, middleware, ORM/framework data semantics need dedicated adapters |
| **npm / Yarn workspaces and common app/service/package layouts** | **Structural** | Supported JS/TS/Python source is merged; `package.json` workspace roots and common `apps/`, `services/`, `packages/`, `projects/`, and library boundaries become first-class System Map nodes; cross-boundary source relationships and external integrations are aggregated | Package-manager dependency declarations, nested/advanced workspace globs, deployment topology, task graphs |
| **pnpm workspaces** | **Partial** | Common directory conventions are detected, and `package.json` workspaces work when present | `pnpm-workspace.yaml` is not parsed yet; package/task graph semantics remain incomplete |
| **Turborepo / Nx** | **Partial** | Underlying supported source plus common app/package boundary conventions can be visualized | Turbo/Nx project configuration, task graph, implicit dependencies, generators, affected-project semantics |
| **Vue / Nuxt** | **Partial** | Standalone `.ts` / `.js` source is scanned | `.vue` single-file components and Nuxt routing/server semantics are not parsed yet |
| **Svelte / SvelteKit** | **Partial** | Standalone `.ts` / `.js` source is scanned | `.svelte` components and SvelteKit routing/server semantics are not parsed yet |
| **Astro** | **Partial** | Standalone `.ts` / `.js` source is scanned | `.astro` files, islands, and Astro routing semantics are not parsed yet |
| **Java / Spring** | **Planned** | — | Java parser/import graph, Spring controllers/services/DI/data semantics |
| **Kotlin / Spring** | **Planned** | — | Kotlin parser/import graph and Spring semantics |
| **C# / .NET / ASP.NET Core** | **Planned** | — | C# parser/project graph, controllers/minimal APIs, DI/data semantics |
| **Go** | **Planned** | — | Go module/import graph, HTTP/router/framework semantics |
| **Rust** | **Planned** | — | Cargo/module graph and web-framework semantics |
| **Ruby / Rails** | **Planned** | — | Ruby parser, Rails routes/controllers/models/jobs semantics |
| **PHP / Laravel** | **Planned** | — | PHP parser, Laravel routes/controllers/models/jobs semantics |

## Source-file support today

ArchMesh currently treats these as first-class source files:

| Extension | Language plugin | Status |
| --- | --- | --- |
| `.ts` | JavaScript / TypeScript | Supported |
| `.tsx` | JavaScript / TypeScript | Supported |
| `.js` | JavaScript / TypeScript | Supported |
| `.jsx` | JavaScript / TypeScript | Supported |
| `.mjs` | JavaScript / TypeScript | Supported |
| `.cjs` | JavaScript / TypeScript | Supported |
| `.py` | Python | Supported |

Files such as `.vue`, `.svelte`, `.astro`, `.java`, `.kt`, `.cs`, `.go`, `.rs`, `.rb`, and `.php` are not parsed as source nodes yet.

Angular static `templateUrl` files can appear as local graph nodes even though `.html` is not a general-purpose language plugin source format.

Configuration files such as `tsconfig.json`, `jsconfig.json`, `angular.json`, `package.json`, and `archmesh.config.json` can influence scanning even though they are not represented as ordinary source nodes.

## Language-plugin capabilities today

### JavaScript / TypeScript

The built-in JavaScript/TypeScript plugin provides:

- recursive source discovery inside the selected project root;
- static `import`, `export`, and dynamic-import discovery;
- relative module resolution;
- TypeScript `baseUrl` / `paths` resolution;
- generic component/service/data/file classification by convention;
- static `fetch()` discovery;
- external HTTP host discovery;
- security evidence on statically inspectable `fetch()` payload fields;
- selected integration package detection.

The Next.js and Angular adapters add framework-specific semantics on top of that shared language graph.

### Python

The built-in Python plugin uses a real Python syntax grammar and provides:

- recursive `.py` discovery while excluding common virtualenv/cache/build directories;
- absolute package import discovery;
- relative package import discovery;
- local module resolution for root and common `src/` project layouts;
- stable source identity for files and package `__init__.py` modules;
- generic module/service/data classification by convention;
- lightweight class/function-count evidence;
- selected integration-package detection;
- mixed-language graph merging with the JavaScript/TypeScript plugin.

Framework-specific meaning is layered on afterward. The FastAPI adapter currently adds semantic request-facing endpoints while Django/Flask remain structural-only.

## System boundary coverage

ArchMesh can now add a system layer above the source/framework graph when repository evidence supports it.

Current boundary evidence includes:

- `package.json` workspace arrays and `{ "workspaces": { "packages": [...] } }` declarations;
- common top-level architecture roots such as `apps/`, `services/`, `packages/`, `projects/`, `libs/`, and `libraries/`;
- nested `package.json` package names as human-readable system labels;
- Python `pyproject.toml` `[project]` names as labels when present;
- source-path inheritance so framework-generated semantic entities, such as a FastAPI handler, belong to the same detected service as their source file.

When at least one boundary is detected, the **System Map** can collapse lower-level implementation nodes into first-class system blocks. Cross-boundary `calls`, data relationships, integration relationships, and structural dependencies are aggregated rather than discarded. Health and Git change state bubble up to the relevant system blocks.

Boundary detection is static evidence, not deployment discovery. ArchMesh does not currently claim that a directory/package equals a separately deployed runtime. `pnpm-workspace.yaml`, Nx/Turborepo project/task graphs, container/orchestrator manifests, and cloud deployment topology are separate future evidence sources.

Single-root repositories with no defensible system boundary continue to use the existing product-area System Map rather than inventing fake services.

## Angular adapter coverage

The built-in Angular adapter currently recognizes defensible static evidence for:

- Angular presence from `@angular/core` package metadata or `angular.json`;
- `@Component` classes, including static selector and standalone metadata;
- static `templateUrl` files as local architecture resources;
- `@Injectable` classes as Angular services;
- constructor-typed injection when the type resolves to a scanned local source node;
- `inject(Service)` dependencies when the token resolves to a scanned local source node;
- static `Routes` arrays when Angular Router is imported;
- nested static route paths and redirects;
- eager component targets from local imports;
- static lazy `loadComponent(() => import(...))` source targets.

Dynamic route paths are intentionally omitted. The adapter does not yet claim `HttpClient`, guards/resolvers/interceptors, NgModule/standalone import graphs, or RxJS flow semantics.

## FastAPI adapter coverage

The built-in FastAPI adapter currently recognizes defensible static evidence for:

- FastAPI presence from package metadata or direct source imports;
- `FastAPI()` and `APIRouter()` bindings;
- `get`, `post`, `put`, `patch`, `delete`, `options`, and `head` route decorators;
- static `api_route(..., methods=[...])` method lists;
- static `APIRouter(prefix=...)` prefixes declared in the same module;
- source handler names;
- conservative `Depends(...)` counts on the handler;
- separate semantic API nodes per method/path rather than treating a whole Python file as one endpoint.

Dynamic/f-string paths are intentionally omitted. Cross-module `include_router()` prefix composition is not yet claimed.

## Capabilities shared after scanning

Once a language plugin contributes graph evidence, the rest of ArchMesh remains language-agnostic. Supported graph evidence can participate in:

- Git change-impact overlays;
- generic health-signal ingestion;
- architecture drift between live scans;
- lenses and progressive disclosure;
- system-boundary aggregation when the repository provides boundary evidence;
- Flow when a relationship has directional flow semantics;
- Trace investigation;
- search and inspection;
- source editor navigation when the node has a local path.

A mixed repository can activate multiple language plugins in one scan. For example, TypeScript frontend files and Python backend files can coexist in the same `ArchGraphData` graph and can belong to separate detected systems. Cross-language runtime endpoint matching remains a separate semantic layer and should be added only when both sides provide defensible evidence.

## What deeper framework support means

A dedicated adapter adds semantic architecture without replacing the underlying source graph. The current Next.js, Angular, and FastAPI adapters are reference implementations of that rule.

Likewise, Express support should understand registered routes and middleware; Vue support should parse SFCs; Spring support should understand controllers, services, repositories, and DI.

## Expansion priority

Breadth matters to ArchMesh. The implemented architecture is **language plugin + framework adapters + shared graph model** rather than one scanner accumulating framework-specific special cases.

A practical next sequence is:

1. add cross-language HTTP endpoint matching when a caller and handler both expose compatible static evidence;
2. extend system/workspace evidence with `pnpm-workspace.yaml`, Nx/Turborepo project graphs, and deployment descriptors;
3. deepen Angular with `HttpClient`, standalone/NgModule metadata, guards/interceptors, and selected RxJS semantics;
4. deepen Node frameworks: Express/Fastify/Hono, NestJS, React Router/Vite, Expo Router;
5. add Django/Flask adapters and framework-native component formats such as Vue/Nuxt, Svelte/SvelteKit, Astro;
6. add additional backend language families: Java/Kotlin, C#/.NET, Go;
7. extend into additional ecosystems based on representative repositories and contributor demand.

This ordering is not a promise of release dates. Support should be promoted only when representative fixtures and tests prove the claimed behavior.

## Promotion rule

A stack moves upward in this matrix only when the corresponding behavior is covered by automated fixtures or representative repository validation.

ArchMesh should never label a framework **Deep** because its files happen to parse. Deep support means the graph understands meaningful architecture unique to that framework.
