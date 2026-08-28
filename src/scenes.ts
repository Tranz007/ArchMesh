import type { ArchGraphData, ArchNode, NodeKind } from './types';

export type SceneDirection = 'inbound' | 'both' | 'outbound';
export type SceneSource = 'detected' | 'saved';

export interface ArchitectureScene {
  id: string;
  name: string;
  seedId: string;
  seedKind: NodeKind;
  direction: SceneDirection;
  depth: number;
  source: SceneSource;
  createdAt?: string;
  updatedAt?: string;
}

const sceneKindWeight: Partial<Record<NodeKind, number>> = {
  integration: 120,
  feature: 105,
  system: 100,
  api: 92,
  data: 88,
  service: 84,
  route: 78,
  component: 55,
};

function degreeMap(data: ArchGraphData) {
  const degree = new Map<string, number>();
  for (const edge of data.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return degree;
}

function sceneName(node: ArchNode) {
  if (node.kind === 'integration') return `${node.label} integration`;
  if (node.kind === 'data') return `${node.label} data`;
  return node.label;
}

export function sceneFromNode(
  node: ArchNode,
  options: Partial<Pick<ArchitectureScene, 'name' | 'direction' | 'depth' | 'source'>> = {},
): ArchitectureScene {
  const source = options.source ?? 'detected';
  const now = new Date().toISOString();
  return {
    id: source === 'saved' ? `saved:${node.id}:${Date.now()}` : `scene:${node.id}`,
    name: options.name ?? sceneName(node),
    seedId: node.id,
    seedKind: node.kind,
    direction: options.direction ?? 'both',
    depth: Math.max(1, Math.min(4, options.depth ?? 2)),
    source,
    ...(source === 'saved' ? { createdAt: now, updatedAt: now } : {}),
  };
}

export function deriveSceneCandidates(data: ArchGraphData, limit = 10): ArchitectureScene[] {
  const degree = degreeMap(data);

  return data.nodes
    .filter((node) => sceneKindWeight[node.kind] !== undefined)
    .map((node) => ({
      node,
      score: (sceneKindWeight[node.kind] ?? 0)
        + Math.min(80, (degree.get(node.id) ?? 0) * 4)
        + (node.health === 'error' ? 50 : node.health === 'warning' || node.health === 'impacted' ? 25 : 0)
        + (node.change === 'changed' ? 24 : node.change === 'affected' ? 12 : 0),
    }))
    .sort((left, right) => right.score - left.score || left.node.label.localeCompare(right.node.label))
    .slice(0, Math.max(0, limit))
    .map(({ node }) => sceneFromNode(node));
}

export function projectScene(data: ArchGraphData, scene: ArchitectureScene): ArchGraphData {
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  if (!nodeById.has(scene.seedId)) {
    return {
      ...data,
      nodes: [],
      edges: [],
      metadata: {
        ...data.metadata,
        graphKind: 'scene',
        sceneId: scene.id,
        sceneName: scene.name,
        sceneSeedId: scene.seedId,
        sceneMissingSeed: true,
      },
    };
  }

  const visited = new Set<string>([scene.seedId]);
  let frontier = new Set<string>([scene.seedId]);

  for (let depth = 0; depth < scene.depth; depth += 1) {
    const next = new Set<string>();

    for (const edge of data.edges) {
      const outbound = frontier.has(edge.source);
      const inbound = frontier.has(edge.target);

      if ((scene.direction === 'outbound' || scene.direction === 'both') && outbound) {
        if (!visited.has(edge.target)) next.add(edge.target);
      }
      if ((scene.direction === 'inbound' || scene.direction === 'both') && inbound) {
        if (!visited.has(edge.source)) next.add(edge.source);
      }
    }

    if (next.size === 0) break;
    for (const id of next) visited.add(id);
    frontier = next;
  }

  const nodes = data.nodes.filter((node) => visited.has(node.id));
  const edges = data.edges.filter((edge) => visited.has(edge.source) && visited.has(edge.target));

  return {
    ...data,
    nodes,
    edges,
    metadata: {
      ...data.metadata,
      graphKind: 'scene',
      sceneId: scene.id,
      sceneName: scene.name,
      sceneSeedId: scene.seedId,
      sceneDirection: scene.direction,
      sceneDepth: scene.depth,
      hiddenNodes: Math.max(0, data.nodes.length - nodes.length),
      hiddenEdges: Math.max(0, data.edges.length - edges.length),
    },
  };
}
