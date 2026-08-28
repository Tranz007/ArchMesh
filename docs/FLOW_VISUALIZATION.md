# Flow visualization

ArchMesh flow animation is a visualization of **detected relationship direction**, not captured network traffic.

## Direction semantics

| Relationship | Animated direction | Meaning |
| --- | --- | --- |
| `calls` | source → target | Caller initiates a request to the target. |
| `writes` | source → target | Data leaves the source and is written to the target. |
| `reads` | target → source | Data is read from the target into the source. |
| `integrates-with` | evidence-dependent | The relationship animates only when stronger source evidence proves source → target, target → source, or both. An import alone proves usage, not traffic direction. |

ArchMesh stores a read relationship as `reader reads resource`. The 3D renderer itself expects directional particles to move from its rendered source toward its rendered target, so ArchMesh swaps only the **render endpoints** for reads. The graph evidence remains unchanged while the visual data movement is resource → reader.

### Integration direction

A package import such as a Firebase, Stripe, or other provider SDK is enough to prove that code **uses** an integration. It is not enough to prove whether data travels to the provider, from the provider, or both ways. Generic `integrates-with` edges therefore remain visible architecture but do not animate by default.

When ArchMesh has stronger provider-matched evidence, it can enrich the integration relationship:

- matching write evidence supports source → integration flow;
- matching read evidence supports integration → source flow;
- both read and write evidence support bidirectional flow;
- unrelated provider data never supplies direction for another integration.

When multiple lower-level relationships collapse into one feature, topology, or system edge, ArchMesh merges their directional evidence. Opposite proven directions become `both` rather than allowing whichever relationship was processed last to win.

For bidirectional evidence, the viewer keeps one visible architecture connection but creates two visual-only flow paths. Each direction receives an independent staggered pulse schedule, so the line can visibly carry data both ways without adding duplicate structural meaning or changing the force layout.

## Visual treatment

Flow is deliberately subordinate to architecture:

- pulses are visible but lightweight;
- static flow uses one-shot pulses emitted on independently staggered intervals rather than permanent synchronized particle loops;
- the timing is intentionally illustrative and randomized; it does not encode request rate or throughput;
- selecting a new node or connection while Flow is enabled automatically enters **Focus** so unrelated flow stops receiving new pulses;
- users can still explicitly switch back to **All** after making a selection;
- Focus modestly emphasizes active connections and compact direction arrows;
- All keeps normal architecture-line styling and uses the moving pulse itself to communicate flow, avoiding a graph-wide recolor;
- All does not add directional arrows to every eligible relationship;
- selected high-degree hubs prioritize a bounded set of useful neighbor labels instead of showing every connected label simultaneously;
- health state overrides semantic flow color when a relationship is warning, error, or impacted.

## Focus and All

**Focus** emits intermittent pulses only for the selected connection or the directional relationships touching the selected node. Each eligible relationship has its own timer, so a hub with many connections does not visually fire every relationship on the same frame.

**All** emits intermittent pulses across all eligible visible relationships with wider randomized spacing. It is useful for understanding overall directionality, but it remains a simulation of static evidence rather than a traffic monitor.

## Evidence boundary

Flow mode does **not** claim to show live packets, throughput, latency, request volume, or frequency. Those require runtime telemetry. Static flow is derived from scanned source semantics and should remain visibly distinct from any future runtime-observed flow layer.

A future runtime layer can reuse the same directional graph while driving emission cadence, latency, errors, and volume from observed telemetry instead of illustrative timing.
