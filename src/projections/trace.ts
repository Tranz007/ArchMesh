import type { ArchGraphData } from '../types';

export type TraceDirection = 'inbound' | 'both' | 'outbound';

export interface TraceOptions {
  rootId: string;
  direction?: TraceDirection;
}

/**
 * Project a graph to the selected root plus its immediate directional neighborhood.
 *
 * Trace deliberately starts at one hop. The purpose is investigation, not a second
 * whole-system view. Users can re-root the trace from another visible node when they
 * want to continue following a path.
 */
export function projectTrace(data: ArchGraphData, options: TraceOptions): ArchGraphData {
  const direction = options.direction ?? 'both';
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
        traceMissingRoot: true,
      },
    };
  }

  const nodeIds = new Set<string>([options.rootId]);
  const edges = data.edges.filter((edge) => {
    const outbound = edge.source === options.rootId;
    const inbound = edge.target === options.rootId;
    const include = direction === 'both'
      ? outbound || inbound
      : direction === 'outbound'
        ? outbound
        : inbound;

    if (!include) return false;
    nodeIds.add(edge.source);
    nodeIds.add(edge.target);
    return true;
  });

  const nodes = data.nodes.filter((node) => nodeIds.has(node.id));

  return {
    ...data,
    nodes,
    edges,
    metadata: {
      ...data.metadata,
      graphKind: 'trace',
      traceRootId: options.rootId,
      traceDirection: direction,
      traceNodeCount: nodes.length,
      traceEdgeCount: edges.length,
      hiddenNodes: Math.max(0, data.nodes.length - nodes.length),
    },
  };
}
