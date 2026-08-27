import type { ArchEdge, ArchGraphData } from '../types';

function hasDrift(value: { drift?: string }) {
  return value.drift && value.drift !== 'stable';
}

export function projectDrift(data: ArchGraphData): ArchGraphData {
  const changedNodeIds = new Set(
    data.nodes.filter(hasDrift).map((node) => node.id),
  );
  const includedNodeIds = new Set(changedNodeIds);
  const includedEdgeIds = new Set<string>();

  for (const edge of data.edges) {
    if (!hasDrift(edge)) continue;
    includedEdgeIds.add(edge.id);
    includedNodeIds.add(edge.source);
    includedNodeIds.add(edge.target);
  }

  // Keep one hop of stable context around structurally changed entities so a
  // newly added/removed/modified node does not appear as an isolated dot.
  for (const edge of data.edges) {
    if (includedEdgeIds.has(edge.id)) continue;
    if (!includedNodeIds.has(edge.source) && !includedNodeIds.has(edge.target)) continue;
    includedEdgeIds.add(edge.id);
    includedNodeIds.add(edge.source);
    includedNodeIds.add(edge.target);
  }

  const nodes = data.nodes.filter((node) => includedNodeIds.has(node.id));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: ArchEdge[] = data.edges.filter(
    (edge) => includedEdgeIds.has(edge.id) && nodeIds.has(edge.source) && nodeIds.has(edge.target),
  );

  return {
    ...data,
    nodes,
    edges,
  };
}
