import type { ArchEdge, ArchGraphData } from '../types';
import type { TraceDirection } from './trace';

export interface PathOptions {
  sourceId: string;
  targetId: string;
  direction?: TraceDirection;
  maxDepth?: number;
}

interface TraversalStep {
  nodeId: string;
  edge: ArchEdge;
}

function neighbors(data: ArchGraphData, nodeId: string, direction: TraceDirection): TraversalStep[] {
  const result: TraversalStep[] = [];
  for (const edge of data.edges) {
    if ((direction === 'outbound' || direction === 'both') && edge.source === nodeId) {
      result.push({ nodeId: edge.target, edge });
    }
    if ((direction === 'inbound' || direction === 'both') && edge.target === nodeId) {
      result.push({ nodeId: edge.source, edge });
    }
  }
  return result;
}

export function projectPath(data: ArchGraphData, options: PathOptions): ArchGraphData {
  const direction = options.direction ?? 'both';
  const maxDepth = Math.max(1, Math.min(12, options.maxDepth ?? 8));
  const nodeIds = new Set(data.nodes.map((node) => node.id));
  const validEndpoints = nodeIds.has(options.sourceId) && nodeIds.has(options.targetId);

  if (!validEndpoints) {
    return {
      ...data,
      nodes: [],
      edges: [],
      metadata: {
        ...data.metadata,
        graphKind: 'path',
        pathSourceId: options.sourceId,
        pathTargetId: options.targetId,
        pathDirection: direction,
        pathFound: false,
        pathMissingEndpoint: true,
      },
    };
  }

  if (options.sourceId === options.targetId) {
    return {
      ...data,
      nodes: data.nodes.filter((node) => node.id === options.sourceId),
      edges: [],
      metadata: {
        ...data.metadata,
        graphKind: 'path',
        pathSourceId: options.sourceId,
        pathTargetId: options.targetId,
        pathDirection: direction,
        pathFound: true,
        pathLength: 0,
      },
    };
  }

  const queue: Array<{ id: string; depth: number }> = [{ id: options.sourceId, depth: 0 }];
  const visited = new Set<string>([options.sourceId]);
  const previous = new Map<string, { nodeId: string; edgeId: string }>();
  let found = false;

  while (queue.length > 0 && !found) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    for (const step of neighbors(data, current.id, direction)) {
      if (visited.has(step.nodeId)) continue;
      visited.add(step.nodeId);
      previous.set(step.nodeId, { nodeId: current.id, edgeId: step.edge.id });

      if (step.nodeId === options.targetId) {
        found = true;
        break;
      }
      queue.push({ id: step.nodeId, depth: current.depth + 1 });
    }
  }

  if (!found) {
    return {
      ...data,
      nodes: data.nodes.filter((node) => node.id === options.sourceId || node.id === options.targetId),
      edges: [],
      metadata: {
        ...data.metadata,
        graphKind: 'path',
        pathSourceId: options.sourceId,
        pathTargetId: options.targetId,
        pathDirection: direction,
        pathFound: false,
        pathMaxDepth: maxDepth,
        hiddenNodes: Math.max(0, data.nodes.length - 2),
      },
    };
  }

  const orderedNodeIds = [options.targetId];
  const orderedEdgeIds: string[] = [];
  let cursor = options.targetId;

  while (cursor !== options.sourceId) {
    const step = previous.get(cursor);
    if (!step) break;
    orderedEdgeIds.push(step.edgeId);
    orderedNodeIds.push(step.nodeId);
    cursor = step.nodeId;
  }

  orderedNodeIds.reverse();
  orderedEdgeIds.reverse();
  const pathNodes = new Set(orderedNodeIds);
  const pathEdges = new Set(orderedEdgeIds);

  return {
    ...data,
    nodes: data.nodes.filter((node) => pathNodes.has(node.id)),
    edges: data.edges.filter((edge) => pathEdges.has(edge.id)),
    metadata: {
      ...data.metadata,
      graphKind: 'path',
      pathSourceId: options.sourceId,
      pathTargetId: options.targetId,
      pathDirection: direction,
      pathFound: true,
      pathLength: orderedEdgeIds.length,
      pathMaxDepth: maxDepth,
      hiddenNodes: Math.max(0, data.nodes.length - orderedNodeIds.length),
    },
  };
}
