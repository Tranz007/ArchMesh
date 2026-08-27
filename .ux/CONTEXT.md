# ArchMesh UX context

## Product

ArchMesh is a local-first visual architecture explorer for modern software projects. It scans source code, builds a graph of architectural relationships, and presents that graph as the primary interface for understanding a system.

The product should evolve from static architecture exploration into a live architecture/observability surface where direct failures, downstream impact, and changes can be understood visually.

## Primary user

The initial user is a hands-on technical architect/product designer/developer working with AI coding agents and complex application ecosystems. They need to understand how a system fits together without manually reconstructing architecture from files, logs, or code search.

Future users may include engineers, technical leads, designers working close to implementation, design-system teams, platform teams, and architects.

## Core jobs

- Understand the architecture of an unfamiliar or evolving codebase.
- See how products, features, routes, services, components, data, and integrations connect.
- Trace the blast radius of a change or failure.
- Find a specific architectural entity quickly and inspect its immediate context.
- Separate the direct source of a failure from downstream systems that may be affected.
- Reduce the cognitive load of large codebases and AI-generated changes.

## Experience principles

- Visual first, text second.
- Progressive detail rather than one giant dependency cloud.
- Preserve spatial stability where possible so users build a mental map.
- Health is part of architecture, not a separate dashboard.
- Direct evidence and inferred impact must remain distinguishable.
- Local-first/privacy should be obvious, not buried in settings.
- The user should not need graph-theory vocabulary to operate the product.

## Current technical environment

- React + TypeScript
- Vite
- Sigma.js
- Graphology
- ForceAtlas2 layout
- Node/TypeScript scanner
- Local JSON graph interchange for the first slice

## Accessibility expectations

The viewer should not rely on color alone for health. Search, filters, inspector controls, and navigation should use semantic controls and visible focus states. Graph-only relationships should have an accessible textual representation in the inspector or future alternative view.

## Known constraints

- Core operation must remain local-first.
- Source code should not require upload to a third-party service.
- The first scanner is intentionally conservative and incomplete.
- Large repositories will require semantic grouping/filtering; rendering every file at once is not a sufficient long-term UX.
- Runtime observability is planned but not yet implemented.

## Evidence status

The product direction and interaction principles are deliberate design decisions. Broader-market user research has not yet been conducted; do not represent future-user needs as validated research findings.
