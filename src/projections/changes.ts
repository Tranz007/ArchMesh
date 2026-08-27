import type { ArchGraphData } from '../types';

export function projectChanges(data: ArchGraphData): ArchGraphData {
  const visibleNodeIds = new Set(
    data.nodes
      .filter((node) => node.change === 'changed' || node.change === 'affected')
      .map((node) => node.id),
  );

  const nodes = data.nodes.filter((node) => visibleNodeIds.has(node.id));
  const edges = data.edges.filter((edge) =>
    visibleNodeIds.has(edge.source)
    && visibleNodeIds.has(edge.target)
    && edge.change === 'affected',
  );

  return {
    ...data,
    nodes,
    edges,
  };
}
