import type { ArchEdge, ArchGraphData, ArchNode, GraphMetadata } from '../types.js';
import type { GraphContribution } from './types.js';

function mergeMetadata(left?: GraphMetadata, right?: GraphMetadata): GraphMetadata | undefined {
  if (!left && !right) return undefined;
  return { ...(left ?? {}), ...(right ?? {}) };
}

function mergeNode(existing: ArchNode | undefined, incoming: ArchNode): ArchNode {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    metadata: mergeMetadata(existing.metadata, incoming.metadata),
  };
}

function edgeIdentity(edge: Pick<ArchEdge, 'source' | 'target' | 'relation' | 'label'>) {
  return `${edge.source}->${edge.target}:${edge.relation}:${edge.label ?? ''}`;
}

export function mergeGraphContributions(
  base: ArchGraphData,
  contributions: GraphContribution[],
): ArchGraphData {
  const nodes = new Map<string, ArchNode>(base.nodes.map((node) => [node.id, node]));
  const edges = new Map<string, ArchEdge>();

  for (const edge of base.edges) edges.set(edgeIdentity(edge), edge);

  let metadata = base.metadata;

  for (const contribution of contributions) {
    for (const node of contribution.nodes ?? []) {
      nodes.set(node.id, mergeNode(nodes.get(node.id), node));
    }

    for (const edge of contribution.edges ?? []) {
      const key = edgeIdentity(edge);
      const existing = edges.get(key);
      edges.set(key, existing
        ? { ...existing, ...edge, metadata: mergeMetadata(existing.metadata, edge.metadata) }
        : edge);
    }

    metadata = mergeMetadata(metadata, contribution.metadata);
  }

  return {
    ...base,
    nodes: [...nodes.values()],
    edges: [...edges.values()].map((edge, index) => ({ ...edge, id: `edge:${index + 1}` })),
    metadata,
  };
}

export function mergeLanguageGraphs(project: string, graphs: ArchGraphData[]): ArchGraphData {
  const nonEmpty = graphs.filter((graph) => graph.nodes.length > 0 || graph.edges.length > 0);
  const base: ArchGraphData = {
    project,
    generatedAt: new Date().toISOString(),
    nodes: [],
    edges: [],
  };

  return mergeGraphContributions(
    base,
    nonEmpty.map((graph) => ({ nodes: graph.nodes, edges: graph.edges, metadata: graph.metadata })),
  );
}
