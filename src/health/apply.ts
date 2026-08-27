import type { ArchGraphData, ArchNode, HealthState } from '../types.js';
import type { HealthNodeRef, HealthSignal } from './types.js';

const healthRank: Record<HealthState, number> = {
  healthy: 0,
  unknown: 1,
  impacted: 2,
  warning: 3,
  error: 4,
};

function worseHealth(current: HealthState, next: HealthState) {
  return healthRank[next] > healthRank[current] ? next : current;
}

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
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}

function resolveNode(ref: HealthNodeRef | undefined, nodes: ArchNode[]) {
  if (!ref) return undefined;
  if (ref.id) {
    const byId = nodes.find((node) => node.id === ref.id);
    if (byId) return byId;
  }
  if (ref.path) {
    const wanted = normalizePath(ref.path);
    return nodes.find((node) => node.path && normalizePath(node.path) === wanted);
  }
  return undefined;
}

function attachEvidence(node: ArchNode, signal: HealthSignal) {
  node.metadata = {
    ...(node.metadata ?? {}),
    healthSource: signal.source,
    healthMessage: signal.message,
    healthTimestamp: signal.timestamp ?? new Date().toISOString(),
    healthSignalId: signal.id ?? null,
  };
}

function propagateImpact(graph: ArchGraphData, directErrorNodeIds: Set<string>) {
  const queue = [...directErrorNodeIds];
  const visited = new Set(queue);

  while (queue.length > 0) {
    const failedOrImpactedId = queue.shift()!;

    for (const edge of graph.edges) {
      if (edge.target !== failedOrImpactedId) continue;
      if (edge.health === 'healthy' || edge.health === 'unknown') edge.health = 'impacted';

      const dependent = graph.nodes.find((node) => node.id === edge.source);
      if (!dependent) continue;
      if (directErrorNodeIds.has(dependent.id)) continue;
      if (dependent.health === 'healthy' || dependent.health === 'unknown') dependent.health = 'impacted';

      if (!visited.has(dependent.id)) {
        visited.add(dependent.id);
        queue.push(dependent.id);
      }
    }
  }
}

export function applyHealthSignals(graphInput: ArchGraphData, signals: HealthSignal[]) {
  const graph = cloneGraph(graphInput);
  const directErrors = new Set<string>();

  for (const signal of signals) {
    const signalHealth: HealthState = signal.severity;

    if (signal.node) {
      const node = resolveNode(signal.node, graph.nodes);
      if (node) {
        node.health = worseHealth(node.health, signalHealth);
        attachEvidence(node, signal);
        if (signal.severity === 'error') directErrors.add(node.id);
      }
    }

    if (signal.edge) {
      const source = resolveNode(signal.edge.source, graph.nodes);
      const target = resolveNode(signal.edge.target, graph.nodes);
      if (!source || !target) continue;

      const edge = graph.edges.find((candidate) =>
        candidate.source === source.id && candidate.target === target.id,
      );
      if (edge) edge.health = worseHealth(edge.health, signalHealth);

      source.health = worseHealth(source.health, signalHealth);
      attachEvidence(source, signal);
      if (signal.severity === 'error') directErrors.add(source.id);
    }
  }

  propagateImpact(graph, directErrors);
  return graph;
}
