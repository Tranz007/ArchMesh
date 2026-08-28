# Understand and Explain workflows

ArchMesh has three related jobs:

1. **Explore** — see the shape of a software system.
2. **Understand** — isolate one architectural concern and answer a concrete question about it.
3. **Explain** — turn that understanding into a repeatable visual walkthrough that can be shared.

This document defines the product direction for the second and third jobs. The underlying graph remains evidence-based and local-first; none of these workflows may invent a relationship to make a story look complete.

## Focused architecture views (Scenes)

A **Scene** is a named projection of the existing graph around a meaningful architectural concern. It is not a separate graph and it does not duplicate source evidence.

Examples of useful scene seeds include:

- an external integration;
- a product area or feature;
- a route or API boundary;
- a data store or collection;
- a service or package;
- a user-selected node neighborhood.

ArchMesh should automatically offer candidate scenes from detected architecture and allow the user to save additional views locally.

A scene records only projection intent such as seed IDs, direction, depth, and display name. It must remain resilient to rescans by using stable graph IDs where possible.

### Scene behavior

Opening a scene should:

- isolate a bounded neighborhood instead of showing the entire implementation graph;
- retain enough surrounding context to understand where the slice sits in the larger system;
- fit the focused context rather than unexpectedly reframing the entire graph;
- preserve evidence and inspector behavior;
- make Flow useful by animating the focused relationships rather than every visible edge by default.

## Trace and path finding

Trace answers **what is directly connected to this?** Path finding answers **how does A reach B?**

ArchMesh should support:

- inbound trace;
- outbound trace;
- both directions;
- configurable depth;
- shortest defensible path between two known graph entities;
- re-rooting while exploring.

A path result is a projection over existing edges. If no path exists in the detected graph, ArchMesh should say so rather than infer missing steps.

## Why are these connected?

Every selectable relationship should be explainable from the evidence already present on the edge and its endpoints.

The inspector should surface, where available:

- relationship type;
- source and target;
- source paths;
- scanner or adapter provenance;
- operation, route, collection, host, or other semantic metadata;
- health, change, drift, and security evidence independently.

The goal is not an AI-generated explanation. The first implementation should be deterministic and evidence-backed.

## Change impact / blast radius

A user should be able to select an entity and ask **what may be affected if this changes?**

The impact projection walks reverse dependencies from the selected entity. It should:

- distinguish the selected source from affected dependents;
- support a bounded depth;
- summarize affected node kinds and product areas;
- avoid claiming runtime failure;
- preserve exact graph relationships so the user can inspect why an entity is in the blast radius.

This is complementary to Git Change Impact: the user-initiated impact workflow answers a hypothetical question before a change is made.

## Saved views

Users should be able to save the current focused scene in the browser without requiring an account or hosted database.

Initial persistence should use local browser storage and contain projection configuration only. Source code and graph data remain local.

Saved views should support:

- name;
- seed/root node;
- projection direction/depth;
- optional path endpoint;
- created/updated timestamps;
- open and delete actions.

## Journeys

A **Journey** is an ordered sequence of graph stops used to explain a system flow.

A journey can be assembled from selected nodes or saved scenes. Each stop may contain:

- a node or scene reference;
- a short title;
- optional note/caption;
- duration;
- flow emphasis.

Playback should move the camera deterministically through the selected architecture, highlight the active stop, and use Flow only on relevant relationships.

Journeys must never imply that an animated packet represents live runtime traffic unless runtime telemetry explicitly provides that evidence. Static-flow animation remains illustrative.

## Video capture

ArchMesh should support recording a Journey directly from the graph viewport.

The browser recorder should:

- capture only the graph canvas rather than browser chrome;
- use deterministic Journey playback;
- prefer MP4 when the browser exposes a supported MP4 MediaRecorder codec;
- fall back to WebM when MP4 recording is not supported rather than silently producing a mislabeled file;
- include the actual container/codec in the downloaded filename;
- remain entirely local.

A later export pipeline may add deterministic offline rendering/encoding when a cross-browser MP4 implementation is justified. The first implementation must not require a hosted transcoding service.

## Health and Drift availability

Health and Drift should not present as active lenses when there is no evidence backing them.

### Health

Health is available when the current graph includes direct health evidence or the local run explicitly enabled a health adapter such as diagnostics or a health-signal file. A graph with no health evidence should not imply live runtime monitoring.

### Drift

Drift is available only after ArchMesh has a previous successful graph to compare with the current graph. In the current local architecture that normally means a watch session has observed at least one successful rebuild.

Unavailable capabilities should be hidden from the primary lens list. Contextual explanatory copy may state how they become available.

## Runtime telemetry boundary

ArchMesh is not currently a production realtime monitoring connection merely because Flow is animating. Flow derived from static source evidence is illustrative.

Optional runtime connectors can later map telemetry onto known graph identities. They must not fabricate architecture and must remain separate from the local-first core.

## Acceptance criteria for this capability family

- A user can select an integration, feature, route, API, service, data entity, or source node and isolate a useful bounded context.
- Candidate scenes are derived from the scanned graph and do not contain project-specific hard-coded knowledge.
- A user can save and reopen a focused view locally.
- A user can trace inbound/outbound/both at more than one depth.
- A user can find a path between two nodes when one exists and receives an explicit no-path result when one does not.
- A selected connection can show deterministic evidence explaining why it exists.
- A user can inspect a hypothetical reverse-dependency blast radius without conflating impact with failure.
- Health and Drift are hidden when their required evidence is unavailable.
- A user can assemble and play a Journey.
- A user can record Journey playback locally, with MP4 used when supported and a truthful WebM fallback otherwise.
- Full-code overview continues to work as terrain; focused workflows become the primary comprehension state.
