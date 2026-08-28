import type { ArchGraphData } from '../types';

export type TraceDirection = 'inbound' | 'both' | 'outbound';

export interface TraceOptions {
  rootId: string;
  direction?: TraceDirection;
  depth?: number;
}

/**
 * Project a graph to the selected root plus a bounded directional neighborhood.
 *
 * Trace remains deliberately bounded. The purpose is investigation, not another
 * whole-system view. Depth defaults to one hop and is capped to keep dense graphs
 * understandable. Users can also re-root the trace while following a path.
 */
export function projectTrace(data: ArchGraphData, options: TraceOptions): ArchGraphData {
  const direction = options.direction ?? 'both';
  const depth = Math.max(1, Math.min(4, options.depth ?? 1));
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));

  if (!nodeById.has(options.rootId)) {
    return {
      ...data,
      nodes: [],
      edges: [],
      metadata: {
        ...data.metadata,
        graphKind: 'trace',
        traceRootId: options.rootId,
        traceDirection: direction,
        traceDepth: depth,
        traceMissingRoot: true,
      },
    };
  }

  const nodeIds = new Set<string>([options.rootId]);
  const edgeIds = new Set<string>();
  let frontier = new Set<string>([options.rootId]);

  for (let hop = 0; hop < depth; hop += 1) {
    const next = new Set<string>();

    for (const edge of data.edges) {
      const outbound = frontier.has(edge.source);
      const inbound = frontier.has(edge.target);
      const include = direction === 'both'
        ? outbound || inbound
        : direction === 'outbound'
          ? outbound
          : inbound;

      if (!include) continue;
      edgeIds.add(edge.id);

      if (outbound && !nodeIds.has(edge.target)) next.add(edge.target);
      if (inbound && !nodeIds.has(edge.source)) next.add(edge.source);
    }

    if (next.size === 0) break;
    for (const id of next) nodeIds.add(id);
    frontier = next;
  }

  const nodes = data.nodes.filter((node) => nodeIds.has(node.id));
  const edges = data.edges.filter((edge) => edgeIds.has(edge.id));

  return {
    ...data,
    nodes,
    edges,
    metadata: {
      ...data.metadata,
      graphKind: 'trace',
      traceRootId: options.rootId,
      traceDirection: direction,
      traceDepth: depth,
      traceNodeCount: nodes.length,
      traceEdgeCount: edges.length,
      hiddenNodes: Math.max(0, data.nodes.length - nodes.length),
    },
  };
}
