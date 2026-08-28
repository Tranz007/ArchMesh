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

## 2026-08-27 — Public repository examples are project-neutral

README examples, configuration samples, demo graph data, tests, fixtures, and documentation must use generic fictional product names and data. Internal/private project names and structures do not belong in the public ArchMesh repository.

Reason: the public repo should be safe to inspect, fork, teach from, and contribute to without disclosing unrelated private product context.

## 2026-08-27 — v0.1 has a bounded release definition

ArchMesh v0.1 is considered done when it is a trustworthy, installable, local developer tool that completes the core Architecture, Topology, Changes, Drift, Code, and Health workflows for the documented TypeScript/JavaScript baseline.

Cloud collaboration, production telemetry backends, LLM chat, MCP, cross-repository architecture, desktop packaging, and broad language support are explicitly post-v0.1 unless user evidence shows they are required for the core promise.

Reason: prevent an expanding roadmap from delaying a coherent first release indefinitely. The detailed release gates live in `docs/DEFINITION_OF_DONE.md`.

## 2026-08-28 — Viewport resize preserves the 3D camera

After the initial graph framing, resizing the browser or graph container updates the rendering viewport without automatically invoking `Fit graph`. Automatic fitting is reserved for a new graph identity or the initial viewport-fit fallback; users can explicitly reframe with the `Fit graph` control.

Reason: resizing the viewport should not overwrite orbit, pan, or zoom state or destroy the user's spatial context while inspecting a selected entity.

## 2026-08-28 — Lenses answer what; Scenes answer where

Architecture lenses describe the kind of question a user is asking of the system: architecture, topology, change, security, implementation detail, and similar perspectives. Focused Scenes describe which bounded part of the architecture the user wants to understand.

A Scene is a projection over the existing graph, not a separately maintained diagram. Candidate Scenes are derived from detected architecture; users may also save local custom views that reference stable graph IDs.

Reason: a large code graph is useful as terrain, but comprehension happens when a user can isolate a concrete architectural concern such as one integration, feature, route, service, or data boundary without losing evidence.

## 2026-08-28 — Health and Drift are capability-aware

Health is surfaced as an active lens only when direct health evidence or an explicitly enabled local health adapter backs the graph. Drift is surfaced only after a previous successful graph exists for comparison.

The UI must not present an apparently functional Health or Drift control when selecting it cannot materially change the evidence shown.

Reason: empty affordances undermine trust and can imply runtime or historical knowledge that ArchMesh does not actually possess.

## 2026-08-28 — Static Flow is illustrative, not telemetry

Directional Flow derived from source and semantic graph evidence communicates detected direction. It does not represent measured request volume, latency, timing, or live runtime activity unless a future runtime connector explicitly supplies that evidence.

Reason: animation can make architecture easier to understand, but motion must not be mistaken for observability data.

## 2026-08-28 — Journeys are local architectural explanations

A Journey is an ordered sequence of known graph entities used to explain architecture through focused camera/context changes. Journey playback and baseline recording remain local and operate only on existing graph evidence.

The browser recording path prefers a supported MP4 `MediaRecorder` format. When the browser cannot produce MP4 directly, ArchMesh exports a truthfully labeled WebM rather than requiring a hosted transcoding service or creating a mislabeled file.

Reason: architecture walkthroughs should be easy to share while preserving the project's local-first boundary and evidence discipline.
