# ArchMesh decisions

## 2026-08-27 — Local-first core

ArchMesh will run locally by default. The scanner, graph data, and viewer must not require a hosted backend, cloud database, or source-code upload for the core experience.

Reason: privacy, simplicity, low operating cost, and fast adoption for individual developers and teams evaluating the tool.

## 2026-08-27 — Visual architecture is the primary product

The graph is the core experience. Code search, logs, AI assistance, and text explanations support the visual architecture rather than replacing it.

Reason: the original product insight is to make software relationships understandable at a glance and navigable by progressive detail.

## 2026-08-27 — Build independently of GitNexus

ArchMesh may use general open-source graph/rendering libraries, but its implementation and product model are independent. Do not copy GitNexus source code or rely on its noncommercial-licensed implementation.

Reason: ArchMesh should be commercially usable under its own MIT license and shaped around its own product goals.

## 2026-08-27 — Health belongs in the graph schema

Nodes and edges carry health from the first version: `healthy`, `warning`, `error`, `impacted`, and `unknown`.

Reason: runtime observability should eventually attach to the same architecture model instead of becoming a separate product surface.

## 2026-08-27 — Error and impact are different

A direct failure is `error`. A downstream entity that may be affected is `impacted`. ArchMesh must not visually or semantically collapse those states.

Reason: users need to distinguish evidence of failure from inferred blast radius.

## 2026-08-27 — Generic core, framework adapters

The graph model remains framework-neutral. Next.js, React, Firebase, Stripe, OpenAI, WorkOS, and other semantics belong in scanners/adapters.

Reason: this keeps ArchMesh usable beyond the first project and prevents framework-specific assumptions from contaminating the core.

## 2026-08-27 — UX Skills remain canonical in their own repository

ArchMesh will integrate `Tranz007/ux-skills` through project context, `AGENTS.md`, documentation, and an install helper rather than copying the entire skills suite into this repository.

Reason: avoid maintaining divergent copies while ensuring agents working on ArchMesh follow the same UX guardrails.
