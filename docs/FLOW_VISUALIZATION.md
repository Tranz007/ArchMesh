# Flow visualization

ArchMesh flow animation is a visualization of **detected relationship direction**, not captured network traffic.

## Direction semantics

| Relationship | Detected direction | Current animation support | Meaning |
| --- | --- | --- | --- |
| `calls` | source → target | Animated | Caller initiates a request to the target. |
| `writes` | source → target | Animated | Data leaves the source and is written to the target. |
| `reads` | target → source | Evidence shown; reverse pulse deferred | Data is read from the target into the source. |
| `integrates-with` | evidence-dependent | Source → target can animate when supplied to the renderer; reverse/both remain evidence-only | An import alone proves usage, not traffic direction. |

ArchMesh stores a read relationship as `reader reads resource`. That evidence orientation is also the immutable orientation of the structural force-graph link. Flow animation must never swap that link's source and target merely to make a particle travel backwards.

This separation is intentional. The earlier implementation reversed render endpoints for reads and later experimented with duplicate reverse links for bidirectional integrations. Both approaches coupled a visual effect to the d3 force topology. The graph layout now remains structural, while reverse and bidirectional evidence is preserved for a future visual-only pulse layer that does not participate in force simulation.

### Integration direction

A package import such as a Firebase, Stripe, or other provider SDK is enough to prove that code **uses** an integration. It is not enough to prove whether data travels to the provider, from the provider, or both ways. Generic `integrates-with` edges therefore remain visible architecture but do not animate by default.

When ArchMesh has stronger provider-matched evidence, it can enrich the integration relationship:

- matching write evidence supports source → integration flow;
- matching read evidence supports integration → source flow;
- both read and write evidence support bidirectional flow;
- unrelated provider data never supplies direction for another integration.

When multiple lower-level relationships collapse into one feature, topology, or system edge, ArchMesh merges their directional evidence. Opposite proven directions become `both` rather than allowing whichever relationship was processed last to win.

Reverse and bidirectional integration evidence remains part of the graph model and can be surfaced in labels and evidence views. The viewer does **not** create a second hidden force link for the reverse direction. A future reverse-pulse implementation must be visual-only so packet animation cannot alter layout stability.

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
- health state overrides semantic flow color when a relationship is warning, error, or impacted.

## Focus and All

**Focus** emits intermittent pulses only for the selected connection or the safely animatable directional relationships touching the selected node. Each eligible relationship has its own timer, so a hub with many connections does not visually fire every relationship on the same frame.

**All** emits intermittent pulses across all safely animatable visible relationships with wider randomized spacing. It is useful for understanding overall directionality, but it remains a simulation of static evidence rather than a traffic monitor.

## Evidence boundary

Flow mode does **not** claim to show live packets, throughput, latency, request volume, or frequency. Those require runtime telemetry. Static flow is derived from scanned source semantics and should remain visibly distinct from any future runtime-observed flow layer.

A future runtime layer can reuse the same directional graph while driving emission cadence, latency, errors, and volume from observed telemetry instead of illustrative timing.
