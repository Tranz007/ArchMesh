import type { ArchGraphData } from '../types.js';

export function createEmptyDriftGraph(current: ArchGraphData): ArchGraphData {
  return {
    project: current.project,
    generatedAt: current.generatedAt,
    nodes: [],
    edges: [],
    metadata: {
      graphKind: 'drift',
      driftAddedNodes: 0,
      driftRemovedNodes: 0,
      driftModifiedNodes: 0,
      driftAddedEdges: 0,
      driftRemovedEdges: 0,
      driftModifiedEdges: 0,
      driftCurrentGeneratedAt: current.generatedAt,
    },
  };
}
