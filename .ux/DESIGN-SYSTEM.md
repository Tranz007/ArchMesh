# ArchMesh design system context

ArchMesh does not yet have a formal component library. Until one emerges, preserve the visual language established in the first viewer rather than introducing unrelated patterns.

## Visual language

- Dark, technical canvas with restrained contrast.
- The graph is the dominant visual surface.
- Controls use compact, low-chrome treatment.
- Health colors are semantic, not decorative.
- Inspector surfaces should feel connected to the graph rather than like a separate admin dashboard.

## Semantic health treatment

- `healthy`: neutral/slate treatment.
- `warning`: amber treatment.
- `error`: red treatment.
- `impacted`: orange/coral treatment, visually distinct from direct error.
- `unknown`: muted neutral treatment.

Never use these colors for unrelated decoration if doing so would weaken their health meaning.

## Components currently established

- Top project/status bar
- Search/navigation field
- Source/status pill
- Errors-only filter
- Graph canvas
- Health legend
- Node inspector
- Connection list
- Health badge

Reuse and extend these before introducing new competing patterns.

## Interaction patterns

- Clicking a node selects it and emphasizes its immediate neighborhood.
- Clicking empty canvas clears selection.
- Search results navigate to a graph entity.
- Errors-only filters the graph to unhealthy/impacted paths.
- Selection should not cause unnecessary graph relayout.

## Accessibility

- Do not communicate health through color alone.
- Maintain keyboard-accessible native controls for search/filter/inspector interactions.
- Preserve visible focus states.
- Provide text labels for graph health and connection state.
- Future graph navigation should have a non-pointer alternative.

## Future design-system direction

As ArchMesh grows, extract repeated UI into typed components and tokens before introducing a general-purpose component library. Adopt third-party primitives only when they reduce complexity without visually overpowering the graph experience.
