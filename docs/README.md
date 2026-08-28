# ArchMesh documentation

The repository README is the front door to ArchMesh. This directory contains the deeper product, usage, architecture, scanner, and contributor documentation.

If you are new to ArchMesh, start with **[Getting Started](GETTING_STARTED.md)**.

## Use ArchMesh

- **[Getting Started](GETTING_STARTED.md)** — install, launch, guided mode, watch mode, and common CLI workflows.
- **[Configuration](CONFIGURATION.md)** — teach ArchMesh project-specific product and feature boundaries.
- **[Understand and Explain Workflows](UNDERSTAND_AND_EXPLAIN.md)** — focused Scenes, paths, hypothetical impact, saved views, Journeys, and local video recording.
- **[Trace Investigation](TRACE_INVESTIGATION.md)** — investigate focused inbound and outbound architecture relationships.
- **[Flow Visualization](FLOW_VISUALIZATION.md)** — understand directional request and data-flow visualization.
- **[Security Lens](SECURITY_LENS.md)** — security-relevant evidence, sensitive data, boundaries, and conservative security semantics.
- **[Health and Observability](HEALTH_AND_OBSERVABILITY.md)** — health signals, errors, impact propagation, and external signal ingestion.

## Understand ArchMesh

- **[Product Definition](PRODUCT.md)** — the problem ArchMesh solves, intended users, core experiences, and product principles.
- **[Architecture](ARCHITECTURE.md)** — scanner host, shared graph, framework adapters, projections, and viewer architecture.
- **[Graph Model](GRAPH_MODEL.md)** — graph entities, relationships, evidence, and semantic contracts.
- **[Scanner](SCANNER.md)** — source scanning and graph construction behavior.
- **[Cross-language HTTP](CROSS_LANGUAGE_HTTP.md)** — cross-language HTTP relationship detection and modeling.
- **[Codebase Support Matrix](SUPPORT_MATRIX.md)** — current language/framework depth, structural support, limitations, and planned coverage.

## Extend and contribute

- **[Plugin Development](PLUGIN_DEVELOPMENT.md)** — language-plugin and framework-adapter contracts and extension guidance.
- **[Development](DEVELOPMENT.md)** — local development, testing, build workflows, and repository internals.
- **[UX Skills Integration](UX_SKILLS.md)** — project UX context and workflow integration.
- **[Contributing](../CONTRIBUTING.md)** — contribution expectations and workflow.
- **[Agent Guidance](../AGENTS.md)** — repository instructions for coding agents.
- **[Security and Privacy](../SECURITY.md)** — project security and disclosure guidance.

## Project direction

- **[Roadmap](ROADMAP.md)** — current release direction and planned work.
- **[Definition of Done](DEFINITION_OF_DONE.md)** — quality and release criteria for changes and the first stable public release.

## Documentation principle

ArchMesh documentation is intentionally separated by depth. The root README should explain what ArchMesh is, why someone would use it, and how to get started. Detailed behavior, implementation contracts, scanner coverage, caveats, and contributor guidance belong here so they can remain complete without turning the README into a reference manual.
