# Product definition

## What ArchMesh is

ArchMesh is a local-first visual architecture explorer for software systems. It turns source code and, eventually, runtime signals into a living map of the system: products, features, routes, components, services, APIs, data, integrations, files, and the relationships between them.

The long-term product idea is simple:

> See how your system connects. See when it doesn't.

## The problem

Modern codebases are difficult to hold in a person's head. Architecture diagrams become stale, repository search exposes fragments rather than systems, logs describe symptoms without architecture, and AI coding agents can change code faster than people can reconstruct the resulting blast radius.

A developer or architect often needs to answer questions such as:

- What is this feature actually connected to?
- Where does this API response go?
- What reads or writes this data?
- If I change this shared service, what else may move?
- Where did this failure enter the system?
- Is this downstream feature broken, or merely at risk because something upstream failed?

ArchMesh makes those relationships navigable visually.

## Product hierarchy

ArchMesh should eventually support progressive levels of architectural detail:

```text
Ecosystem
  ↓
Product / application
  ↓
Feature / capability
  ↓
Route / component / service / API / data / integration
  ↓
File / symbol / function / type
  ↓
Source
```

The user should be able to start with semantic architecture and move deeper only when the task requires it.

## Core experiences

### Explore

Open a project and understand its shape without reading the entire repository. Search for a feature or technical entity, click it, and see its immediate context.

### Trace

Follow a relationship through the system: UI → API → service → data, webhook → handler → subscription, route → component → shared module, and similar flows.

### Impact

Select something that may change and reveal upstream/downstream relationships so the user can understand probable blast radius before editing.

### Health

Attach runtime/build/test evidence to architectural nodes and edges. Directly failing paths become `error`; downstream paths become `impacted` until direct evidence establishes their own state.

### Focus

Collapse the graph to a meaningful slice: errors only, a selected neighborhood, a feature, a product area, a data store, an integration, or another semantic boundary.

## What ArchMesh is not

ArchMesh is not intended to become:

- a generic code editor;
- a replacement for source control;
- a giant static dependency graph with no semantic hierarchy;
- an LLM product that cannot function without AI;
- a hosted observability requirement;
- a diagramming tool where architecture must be manually maintained;
- a source of invented architectural relationships or inferred certainty.

## Local-first promise

The core product should work with a local repository and a local browser. A user should be able to understand their architecture without sending source code to ArchMesh, a model provider, or a hosted graph database.

Optional future hosted/team features may exist, but they must not redefine the core product around cloud dependency.

## Initial target ecosystem

The first practical target is modern TypeScript/JavaScript applications, with early semantic adapters for:

- Next.js
- React
- Firebase
- Stripe
- OpenAI / AI services
- WorkOS
- Resend
- generic HTTP/API relationships

The underlying graph model must remain capable of supporting other languages and frameworks later.

## Success criteria

ArchMesh succeeds when a user can answer an architectural question faster by looking at and interacting with the graph than by reconstructing the answer through repository search, logs, and memory.

The visual should reduce cognitive load rather than merely render more technical information.
