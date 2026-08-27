import type { ArchGraphData, ChangeState } from '../types.js';

function normalizePath(value: string) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function cloneGraph(graph: ArchGraphData): ArchGraphData {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      metadata: node.metadata ? { ...node.metadata } : undefined,
    })),
    edges: graph.edges.map((edge) => ({
      ...edge,
      metadata: edge.metadata ? { ...edge.metadata } : undefined,
    })),
  };
}

function strongerChange(current: ChangeState | undefined, next: ChangeState) {
  if (current === 'changed' || next === 'changed') return 'changed';
  if (current === 'affected' || next === 'affected') return 'affected';
  return 'unchanged';
}

export function applyChangeImpact(graphInput: ArchGraphData, changedPaths: string[]) {
  const graph = cloneGraph(graphInput);
  const wanted = new Set(changedPaths.map(normalizePath));
  const changedNodeIds = new Set<string>();

  for (const node of graph.nodes) {
    node.change = node.change ?? 'unchanged';
    if (!node.path || !wanted.has(normalizePath(node.path))) continue;
    node.change = 'changed';
    node.metadata = {
      ...(node.metadata ?? {}),
      changeSource: 'git',
      changeState: 'changed',
    };
    changedNodeIds.add(node.id);
  }

  for (const edge of graph.edges) edge.change = edge.change ?? 'unchanged';

  const queue = [...changedNodeIds];
  const visited = new Set(queue);

  while (queue.length > 0) {
    const changedOrAffectedId = queue.shift()!;

    for (const edge of graph.edges) {
      if (edge.target !== changedOrAffectedId) continue;
      edge.change = strongerChange(edge.change, 'affected');

      const dependent = graph.nodes.find((node) => node.id === edge.source);
      if (!dependent || changedNodeIds.has(dependent.id)) continue;
      dependent.change = strongerChange(dependent.change, 'affected');
      dependent.metadata = {
        ...(dependent.metadata ?? {}),
        changeSource: 'git',
        changeState: 'affected',
      };

      if (!visited.has(dependent.id)) {
        visited.add(dependent.id);
        queue.push(dependent.id);
      }
    }
  }

  return graph;
}
