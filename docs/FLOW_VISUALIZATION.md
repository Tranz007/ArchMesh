# Flow visualization

ArchMesh flow animation is a visualization of **detected relationship direction**, not captured network traffic.

## Direction semantics

| Relationship | Animated direction | Meaning |
| --- | --- | --- |
| `calls` | source → target | Caller initiates a request to the target. |
| `writes` | source → target | Data leaves the source and is written to the target. |
| `reads` | target → source | Data is read from the target into the source. |
| `integrates-with` | source → target | ArchMesh has evidence that the source uses the integration; runtime traffic is not implied beyond that evidence. |

ArchMesh stores a read relationship as `reader reads resource`. The 3D renderer itself expects directional particles to move from its rendered source toward its rendered target, so ArchMesh swaps only the **render endpoints** for reads. The graph evidence remains unchanged while the visual data movement is resource → reader.

If ArchMesh detects independent evidence in both directions between the same two nodes, the renderer can emit pulses moving both ways. Examples include a service that both reads from and writes to a datastore, or two services that each call the other.

## Visual treatment

Flow is deliberately subordinate to architecture:

- pulses are small and lightweight;
- static flow uses one-shot pulses emitted on independently staggered intervals rather than permanent synchronized particle loops;
- the timing is intentionally illustrative and randomized; it does not encode request rate or throughput;
- selecting a new node or connection while Flow is enabled automatically enters **Focus** so unrelated flow stops receiving new pulses;
- users can still explicitly switch back to **All** after making a selection;
- Focus modestly emphasizes active connections and compact direction arrows;
- All keeps normal architecture-line styling and uses the moving pulse itself to communicate flow, avoiding a graph-wide recolor;
- All does not add directional arrows to every eligible relationship;
- health state overrides semantic flow color when a relationship is warning, error, or impacted.

## Focus and All

**Focus** emits intermittent pulses only for the selected connection or the directional relationships touching the selected node. Each eligible relationship has its own timer, so a hub with many connections does not visually fire every relationship on the same frame.

**All** emits intermittent pulses across all eligible visible relationships with wider randomized spacing. It is useful for understanding overall directionality, but it remains a simulation of static evidence rather than a traffic monitor.

## Evidence boundary

Flow mode does **not** claim to show live packets, throughput, latency, request volume, or frequency. Those require runtime telemetry. Static flow is derived from scanned source semantics and should remain visibly distinct from any future runtime-observed flow layer.

A future runtime layer can reuse the same directional graph while driving emission cadence, latency, errors, and volume from observed telemetry instead of illustrative timing.
