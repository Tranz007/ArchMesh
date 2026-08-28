# System Map

System Map is the highest-level architecture view in ArchMesh. Its job is to make the shape of a codebase understandable before the user drills into implementation detail.

## Progressive disclosure

System Map intentionally does not render every detected relationship when a project is highly connected. Dense low-level dependency evidence can make a force-directed overview visually unstable and unreadable even when the underlying graph is valid.

The overview therefore keeps:

- product-to-area containment;
- warnings, failures, impacted, changed, and affected relationships;
- the highest-value feature-to-feature dependency relationships;
- a bounded set of the strongest relationships to each external integration.

The complete scan remains unchanged. Users can move into Product Areas, Data & Integrations, Routes & APIs, Topology, or Code when they need more detail.

## Why the edge budget exists

An architecture overview should answer “what are the important parts and how are they connected?” rather than reproduce every import relationship. ArchMesh uses an explicit visual edge budget in System Map so highly connected repositories remain understandable and the 3D layout remains stable.

CI includes a generic dense 39-node System Map browser render to guard this behavior.
