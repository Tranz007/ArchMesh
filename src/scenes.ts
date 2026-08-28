import type { ArchEdge, ArchGraphData, ArchNode, NodeKind } from './types';

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

const SCENE_NODE_LIMIT = 72;

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

const sceneKindCap: Partial<Record<NodeKind, number>> = {
  integration: 3,
  feature: 3,
  system: 2,
  api: 2,
  data: 2,
  service: 2,
  route: 2,
  component: 1,
};

const relationPriority: Record<ArchEdge['relation'], number> = {
  calls: 100,
  reads: 95,
  writes: 95,
  'integrates-with': 90,
  'depends-on': 75,
  imports: 60,
  contains: 45,
};

function metadataText(node: ArchNode, ...keys: string[]) {
  for (const key of keys) {
    const value = node.metadata?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pathContext(node: ArchNode) {
  if (!node.path) return undefined;
  const normalized = node.path.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return undefined;
  const file = parts.at(-1) ?? '';
  const stemmed = file.replace(/\.(?:tsx?|jsx?|mjs|cjs|py)$/i, '');
  if (['page', 'route', 'index'].includes(stemmed.toLowerCase())) parts.pop();
  const context = parts.slice(-3).join('/');
  return context || undefined;
}

function sceneName(node: ArchNode) {
  const routePath = metadataText(node, 'routePath', 'pathPattern', 'endpointPath');
  const methods = metadataText(node, 'httpMethods', 'method', 'methods');

  if (node.kind === 'route') {
    if (routePath) return `Route ${routePath}`;
    const context = pathContext(node);
    if (context) return `Route ${context}`;
  }

  if (node.kind === 'api') {
    if (routePath) return `${methods ? `${methods} ` : 'API '}${routePath}`;
    const context = pathContext(node);
    if (context) return `API ${context}`;
  }

  if (node.kind === 'integration') return `${node.label} integration`;

  if (node.kind === 'data') {
    const resource = metadataText(node, 'collectionName', 'collection', 'resourceName', 'resource');
    if (resource) return `${resource} data`;
    return `${node.label} data`;
  }

  if (/^(?:page|route|index)\.(?:tsx?|jsx?|mjs|cjs)$/i.test(node.label)) {
    const context = pathContext(node);
    if (context) return `${node.kind} · ${context}`;
  }

  return node.label;
}

function degreeMap(data: ArchGraphData) {
  const degree = new Map<string, number>();
  for (const edge of data.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return degree;
}

function orderedEdges(data: ArchGraphData) {
  return [...data.edges].sort((left, right) => {
    const priority = (relationPriority[right.relation] ?? 0) - (relationPriority[left.relation] ?? 0);
    if (priority !== 0) return priority;
    return left.id.localeCompare(right.id);
  });
}

function walkDirection(
  data: ArchGraphData,
  rootId: string,
  direction: Exclude<SceneDirection, 'both'>,
  depth: number,
  limit: number,
) {
  const visited = new Set<string>([rootId]);
  let frontier = new Set<string>([rootId]);
  let truncated = false;
  const edges = orderedEdges(data);

  for (let hop = 0; hop < depth && frontier.size > 0; hop += 1) {
    const next = new Set<string>();

    for (const edge of edges) {
      const matches = direction === 'outbound'
        ? frontier.has(edge.source)
        : frontier.has(edge.target);
      if (!matches) continue;

      const candidate = direction === 'outbound' ? edge.target : edge.source;
      if (visited.has(candidate)) continue;

      if (visited.size >= limit) {
        truncated = true;
        continue;
      }

      visited.add(candidate);
      next.add(candidate);
    }

    frontier = next;
  }

  return { visited, truncated };
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
  const ranked = data.nodes
    .filter((node) => sceneKindWeight[node.kind] !== undefined)
    .map((node) => ({
      node,
      score: (sceneKindWeight[node.kind] ?? 0)
        + Math.min(80, (degree.get(node.id) ?? 0) * 4)
        + (node.health === 'error' ? 50 : node.health === 'warning' || node.health === 'impacted' ? 25 : 0)
        + (node.change === 'changed' ? 24 : node.change === 'affected' ? 12 : 0),
    }))
    .sort((left, right) => right.score - left.score || sceneName(left.node).localeCompare(sceneName(right.node)));

  const selected: ArchNode[] = [];
  const selectedByKind = new Map<NodeKind, number>();
  const target = Math.max(0, limit);

  for (const { node } of ranked) {
    if (selected.length >= target) break;
    const cap = sceneKindCap[node.kind] ?? 1;
    const used = selectedByKind.get(node.kind) ?? 0;
    if (used >= cap) continue;
    selected.push(node);
    selectedByKind.set(node.kind, used + 1);
  }

  return selected.map((node) => sceneFromNode(node));
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

  // "Both" means two independent investigations from the seed: what this
  // entity reaches and what reaches it. Do not reverse direction at each hop.
  // Reversing mid-walk turns a shared dependency or parent container into a
  // bridge to every sibling, which is how a focused route can explode back
  // into the whole repository.
  const traversals = scene.direction === 'both'
    ? [
        walkDirection(data, scene.seedId, 'outbound', scene.depth, SCENE_NODE_LIMIT),
        walkDirection(data, scene.seedId, 'inbound', scene.depth, SCENE_NODE_LIMIT),
      ]
    : [walkDirection(data, scene.seedId, scene.direction, scene.depth, SCENE_NODE_LIMIT)];

  const visited = new Set<string>([scene.seedId]);
  let truncated = false;
  for (const traversal of traversals) {
    for (const id of traversal.visited) {
      if (visited.size >= SCENE_NODE_LIMIT && !visited.has(id)) {
        truncated = true;
        continue;
      }
      visited.add(id);
    }
    truncated = truncated || traversal.truncated;
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
      sceneSeedKind: scene.seedKind,
      sceneDirection: scene.direction,
      sceneDepth: scene.depth,
      sceneNodeCount: nodes.length,
      sceneEdgeCount: edges.length,
      sceneTruncated: truncated,
      sceneNodeLimit: SCENE_NODE_LIMIT,
      hiddenNodes: Math.max(0, data.nodes.length - nodes.length),
      hiddenEdges: Math.max(0, data.edges.length - edges.length),
    },
  };
}
