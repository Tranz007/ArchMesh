import type { ArchGraphData, NodeKind } from '../types';

export interface ImpactOptions {
  rootId: string;
  depth?: number;
}

export interface ImpactSummary {
  totalAffected: number;
  byKind: Partial<Record<NodeKind, number>>;
  productAreas: number;
}

export interface ImpactProjection {
  graph: ArchGraphData;
  summary: ImpactSummary;
}

export function projectImpact(data: ArchGraphData, options: ImpactOptions): ImpactProjection {
  const depth = Math.max(1, Math.min(6, options.depth ?? 3));
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));

  if (!nodeById.has(options.rootId)) {
    return {
      graph: {
        ...data,
        nodes: [],
        edges: [],
        metadata: {
          ...data.metadata,
          graphKind: 'impact',
          impactRootId: options.rootId,
          impactDepth: depth,
          impactMissingRoot: true,
        },
      },
      summary: { totalAffected: 0, byKind: {}, productAreas: 0 },
    };
  }

  const nodeIds = new Set<string>([options.rootId]);
  const edgeIds = new Set<string>();
  let frontier = new Set<string>([options.rootId]);

  for (let hop = 0; hop < depth; hop += 1) {
    const next = new Set<string>();

    for (const edge of data.edges) {
      if (!frontier.has(edge.target)) continue;
      edgeIds.add(edge.id);
      if (!nodeIds.has(edge.source)) next.add(edge.source);
    }

    if (next.size === 0) break;
    for (const id of next) nodeIds.add(id);
    frontier = next;
  }

  const nodes = data.nodes.filter((node) => nodeIds.has(node.id));
  const edges = data.edges.filter((edge) => edgeIds.has(edge.id));
  const affected = nodes.filter((node) => node.id !== options.rootId);
  const byKind: Partial<Record<NodeKind, number>> = {};

  for (const node of affected) {
    byKind[node.kind] = (byKind[node.kind] ?? 0) + 1;
  }

  const summary: ImpactSummary = {
    totalAffected: affected.length,
    byKind,
    productAreas: affected.filter((node) => node.kind === 'feature' || node.kind === 'product').length,
  };

  return {
    graph: {
      ...data,
      nodes,
      edges,
      metadata: {
        ...data.metadata,
        graphKind: 'impact',
        impactRootId: options.rootId,
        impactDepth: depth,
        impactAffectedCount: summary.totalAffected,
        impactProductAreaCount: summary.productAreas,
        hiddenNodes: Math.max(0, data.nodes.length - nodes.length),
      },
    },
    summary,
  };
}
