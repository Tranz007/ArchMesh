# Flow visualization

ArchMesh flow animation is a visualization of **detected relationship direction**, not captured network traffic.

## Direction semantics

| Relationship | Animated direction | Meaning |
| --- | --- | --- |
| `calls` | source → target | Caller initiates a request to the target. |
| `writes` | source → target | Data leaves the source and is written to the target. |
| `reads` | target → source | Data is read from the target into the source. |
| `integrates-with` | source → target | ArchMesh has evidence that the source uses the integration; runtime traffic is not implied beyond that evidence. |

If ArchMesh detects evidence in both directions between the same two nodes, the renderer shows pulses moving both ways. Examples include a service that both reads from and writes to a datastore, or two services that each call the other.

## Visual treatment

Flow is deliberately subordinate to architecture:

- pulses are small and lightweight;
- active links are only modestly brighter or thicker than their resting state;
- Focus mode uses a few pulses to make direction clear without turning the connection into a dominant visual object;
- All mode uses a single pulse per eligible visible relationship;
- health state overrides semantic flow color when a relationship is warning, error, or impacted.

## Evidence boundary

Flow mode does **not** claim to show live packets, throughput, latency, or frequency. Those require runtime telemetry. Static flow is derived from scanned source semantics and should remain visibly distinct from any future runtime-observed flow layer.
