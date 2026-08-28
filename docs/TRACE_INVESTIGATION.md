# Trace investigation

Trace turns a selected node into a small, directional investigation scene without changing the underlying Architecture Lens.

## Why Trace exists

A whole-system graph is useful for orientation, but investigation requires less context, not more. Trace isolates the selected node and the architecture immediately connected to it so a user can answer questions such as:

- What calls this service?
- What does this feature depend on?
- Which systems receive data from this node?
- What can reach this external integration?
- Which security-relevant connections touch this resource?

Trace is intentionally progressive. It does not expand several hops at once and recreate the original hairball.

## Start a trace

Select a node and choose **Trace from here** in the inspector.

ArchMesh keeps the current Lens and creates a one-hop view around the selected node.

For example, starting in Security Lens preserves security connection colors and evidence. Starting in Data & Integrations preserves that projection's semantics.

## Direction controls

Trace supports three directions:

- **Inbound** — relationships whose target is the trace root;
- **Both** — inbound and outbound relationships;
- **Outbound** — relationships whose source is the trace root.

Direction here is the graph relationship direction. Flow mode may visualize data movement differently for relationships such as `reads`, where data travels from the target resource back to the reader.

## Walk the architecture

Trace is one hop by design.

To continue following a path:

1. select a visible neighboring node;
2. choose **Continue trace from here**;
3. ArchMesh re-roots the trace around that node.

This makes architecture investigation feel like walking a graph rather than repeatedly zooming through a large scene.

## Trace + Flow

Flow mode works inside Trace.

A useful investigation pattern is:

1. Trace from a service, API, data resource, or integration;
2. choose Inbound / Both / Outbound;
3. enable **Flow**;
4. keep Flow in **Focus** to animate the selected node's eligible calls, reads, writes, and integration relationships.

The smaller scene makes direction substantially easier to understand than animating the full system.

## Trace + Security

Trace is especially useful in Security Lens because it preserves the Lens while removing unrelated architecture.

Examples:

- trace inbound to an external system to see what reaches it;
- trace outbound from a service handling sensitive fields;
- re-root through a sequence of security-relevant nodes;
- combine Flow with security colors to distinguish **what the security evidence says** from **which direction data moves**.

This is the foundation for richer attack-path and sensitive-data-path investigation. The current Trace feature does not claim exploitability or infer an attacker path.

## Scope

The first Trace implementation is deliberately one hop and operates on the graph already visible in the active Lens.

Future work may add:

- controlled multi-hop expansion;
- shortest path between two selected entities;
- save/share a trace definition;
- security-specific "to external boundary" and "from public entry point" traces;
- runtime-observed traces when telemetry is available.
