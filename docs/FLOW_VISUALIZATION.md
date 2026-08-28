# Flow visualization

ArchMesh flow animation is a visualization of **detected relationship direction**, not captured network traffic.

## Direction semantics

| Relationship | Animated direction | Meaning |
| --- | --- | --- |
| `calls` | source → target | Caller initiates a request to the target. |
| `writes` | source → target | Data leaves the source and is written to the target. |
| `reads` | target → source | Data is read from the target into the source. |
| `integrates-with` | evidence-dependent | The relationship animates only when stronger source evidence proves source → target, target → source, or both. An import alone proves usage, not traffic direction. |

ArchMesh stores a read relationship as `reader reads resource`. The architecture graph keeps that structural orientation unchanged while the visual flow layer renders the data movement as resource → reader.

### Integration direction

A package import such as a Firebase, Stripe, or other provider SDK is enough to prove that code **uses** an integration. It is not enough to prove whether data travels to the provider, from the provider, or both ways. Generic `integrates-with` edges therefore remain visible architecture but do not animate by default.

When ArchMesh has stronger provider-matched evidence, it can enrich the integration relationship:

- matching write evidence supports source → integration flow;
- matching read evidence supports integration → source flow;
- both read and write evidence support bidirectional flow;
- unrelated provider data never supplies direction for another integration.

When multiple lower-level relationships collapse into one feature, topology, or system edge, ArchMesh merges their directional evidence. Opposite proven directions become `both` rather than allowing whichever relationship was processed last to win.

## Visual-only flow layer

Flow packets are rendered in a separate Three.js overlay. They are **not links in the force graph** and therefore do not participate in d3 layout, camera fitting, system-boundary projection, or topology.

That separation is deliberate. A previous implementation changed or duplicated force-link endpoints to make reverse packets travel correctly. Because those visual links participated in force layout, a rendering concern could destabilize the entire scene. The current implementation keeps structural source and target endpoints immutable.

The overlay interpolates a packet between the already-rendered source and target node positions:

- source → target evidence moves a packet forward along the existing connection;
- target → source evidence moves a packet backward along the same connection;
- bidirectional evidence creates two independently staggered visual streams, one in each direction;
- unknown direction creates no packet animation rather than inventing traffic semantics.

## Visual treatment

Flow is deliberately subordinate to architecture:

- packets are visible but lightweight;
- one-shot pulses are emitted on independently staggered intervals rather than permanent synchronized loops;
- the timing is intentionally illustrative and randomized; it does not encode request rate or throughput;
- enabling Flow produces visible activity quickly instead of waiting several seconds for the first pulse;
- selecting a new node or connection while Flow is enabled automatically enters **Focus** so unrelated flow stops receiving new pulses;
- users can still explicitly switch back to **All** after making a selection;
- Focus modestly emphasizes active connections and packets;
- All keeps normal architecture-line styling and uses moving packets to communicate direction;
- health state overrides semantic flow color when a relationship is warning, error, or impacted;
- active packet count is bounded so dense graphs cannot turn the visual layer into a rendering workload problem.

## Focus and All

**Focus** emits intermittent packets only for the selected connection or the directional relationships touching the selected node. Each eligible direction has its own timer, so a hub with many connections does not visually fire every relationship on the same frame.

**All** emits intermittent packets across all eligible visible relationships with wider randomized spacing. It is useful for understanding overall directionality, but it remains a simulation of static evidence rather than a traffic monitor.

## Evidence boundary

Flow mode does **not** claim to show live packets, throughput, latency, request volume, or frequency. Those require runtime telemetry. Static flow is derived from scanned source semantics and should remain visibly distinct from any future runtime-observed flow layer.

A future runtime layer can reuse the same directional graph while driving emission cadence, latency, errors, and volume from observed telemetry instead of illustrative timing.
