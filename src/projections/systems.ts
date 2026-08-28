import { withMergedFlowDirection } from '../flow';
import type {
  ArchEdge,
  ArchGraphData,
  ArchNode,
  ChangeState,
  HealthState,
} from '../types';

const healthRank: Record<HealthState, number> = {
  healthy: 0,
  unknown: 1,
  impacted: 2,
  warning: 3,
  error: 4,
};

const changeRank: Record<ChangeState, number> = {
  unchanged: 0,
  affected: 1,
  changed: 2,
};

function worstHealth(left: HealthState, right: HealthState): HealthState {
  return healthRank[right] > healthRank[left] ? right : left;
}

function worstChange(left: ChangeState, right?: ChangeState): ChangeState {
  if (!right) return left;
  return changeRank[right] > changeRank[left] ? right : left;
}

function metadataString(node: ArchNode, key: string) {
  const value = node.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function systemId(key: string) {
  return `system:${key}`;
}

function projectId(project: string) {
  return `product:${project.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function isExternalResource(node?: ArchNode) {
  return Boolean(node && (node.kind === 'integration' || (node.kind === 'data' && !node.path)));
}

function aggregateRelation(relation: ArchEdge['relation']): ArchEdge['relation'] {
  if (relation === 'imports' || relation === 'contains') return 'depends-on';
  return relation;
}

interface SystemBucket {
  id: string;
  key: string;
  label: string;
  type?: string;
  root?: string;
  source?: string;
  memberCount: number;
  health: HealthState;
  change: ChangeState;
}

function boundaryKey(node?: ArchNode) {
  return node ? metadataString(node, 'systemKey') : undefined;
}

function addAggregatedEdge(
  edges: ArchEdge[],
  dedupe: Map<string, ArchEdge>,
  incoming: Omit<ArchEdge, 'id'>,
) {
  const key = `${incoming.source}->${incoming.target}:${incoming.relation}`;
  const existing = dedupe.get(key);
  if (existing) {
    const previousCount = typeof existing.metadata?.evidenceCount === 'number'
      ? existing.metadata.evidenceCount
      : 1;
    const previousMetadata = existing.metadata;
    const incomingMoreSevere = healthRank[incoming.health] >= healthRank[existing.health];
    existing.health = worstHealth(existing.health, incoming.health);
    existing.change = worstChange(existing.change ?? 'unchanged', incoming.change);
    const preferredMetadata = {
      ...(incomingMoreSevere ? previousMetadata : incoming.metadata),
      ...(incomingMoreSevere ? incoming.metadata : previousMetadata),
      evidenceCount: previousCount + 1,
      aggregated: true,
    };
    existing.metadata = withMergedFlowDirection(
      preferredMetadata,
      incomingMoreSevere ? previousMetadata : incoming.metadata,
    );
    if (existing.label !== incoming.label) existing.label = `${previousCount + 1} relationships`;
    return;
  }

  const edge: ArchEdge = {
    ...incoming,
    id: `system-edge:${edges.length + 1}`,
    change: incoming.change ?? 'unchanged',
    metadata: {
      ...(incoming.metadata ?? {}),
      evidenceCount: 1,
      aggregated: true,
    },
  };
  edges.push(edge);
  dedupe.set(key, edge);
}

export function projectSystemBoundaries(data: ArchGraphData): ArchGraphData | undefined {
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  const systems = new Map<string, SystemBucket>();

  for (const node of data.nodes) {
    const key = boundaryKey(node);
    if (!key) continue;
    const id = systemId(key);
    const existing = systems.get(key);
    const bucket = existing ?? {
      id,
      key,
      label: metadataString(node, 'systemLabel') ?? key,
      type: metadataString(node, 'systemType'),
      root: metadataString(node, 'systemRoot'),
      source: metadataString(node, 'systemSource'),
      memberCount: 0,
      health: 'healthy' as HealthState,
      change: 'unchanged' as ChangeState,
    };
    bucket.memberCount += 1;
    bucket.health = worstHealth(bucket.health, node.health);
    bucket.change = worstChange(bucket.change, node.change);
    systems.set(key, bucket);
  }

  if (systems.size === 0) return undefined;

  // Relationship evidence can make a system unhealthy even when the direct
  // source nodes themselves still look healthy.
  for (const edge of data.edges) {
    const sourceKey = boundaryKey(nodeById.get(edge.source));
    const targetKey = boundaryKey(nodeById.get(edge.target));
    for (const key of [sourceKey, targetKey]) {
      if (!key) continue;
      const bucket = systems.get(key);
      if (!bucket) continue;
      bucket.health = worstHealth(bucket.health, edge.health);
      bucket.change = worstChange(bucket.change, edge.change);
    }
  }

  const nodes: ArchNode[] = [];
  const edges: ArchEdge[] = [];
  const dedupe = new Map<string, ArchEdge>();
  const rootId = projectId(data.project);
  let productHealth: HealthState = 'healthy';
  let productChange: ChangeState = 'unchanged';

  for (const bucket of systems.values()) {
    productHealth = worstHealth(productHealth, bucket.health);
    productChange = worstChange(productChange, bucket.change);
  }

  nodes.push({
    id: rootId,
    label: data.project,
    kind: 'product',
    health: productHealth,
    change: productChange,
    metadata: {
      synthetic: true,
      systemCount: systems.size,
      semanticSource: 'system-boundaries',
    },
  });

  for (const bucket of [...systems.values()].sort((left, right) => left.label.localeCompare(right.label))) {
    nodes.push({
      id: bucket.id,
      label: bucket.label,
      kind: 'system',
      health: bucket.health,
      change: bucket.change,
      metadata: {
        synthetic: true,
        systemKey: bucket.key,
        systemType: bucket.type ?? 'package',
        systemRoot: bucket.root ?? null,
        systemSource: bucket.source ?? null,
        memberCount: bucket.memberCount,
      },
    });
    addAggregatedEdge(edges, dedupe, {
      source: rootId,
      target: bucket.id,
      relation: 'contains',
      health: bucket.health,
      change: bucket.change,
    });
  }

  const externalIds = new Set<string>();

  for (const rawEdge of data.edges) {
    const sourceNode = nodeById.get(rawEdge.source);
    const targetNode = nodeById.get(rawEdge.target);
    const sourceKey = boundaryKey(sourceNode);
    const targetKey = boundaryKey(targetNode);
    const sourceSystem = sourceKey ? systems.get(sourceKey) : undefined;
    const targetSystem = targetKey ? systems.get(targetKey) : undefined;

    if (sourceSystem && targetSystem && sourceSystem.id !== targetSystem.id) {
      addAggregatedEdge(edges, dedupe, {
        source: sourceSystem.id,
        target: targetSystem.id,
        relation: aggregateRelation(rawEdge.relation),
        health: rawEdge.health,
        change: rawEdge.change,
        label: rawEdge.label,
        metadata: rawEdge.metadata,
      });
      continue;
    }

    if (sourceSystem && isExternalResource(targetNode)) {
      externalIds.add(targetNode!.id);
      addAggregatedEdge(edges, dedupe, {
        source: sourceSystem.id,
        target: targetNode!.id,
        relation: rawEdge.relation,
        health: rawEdge.health,
        change: rawEdge.change,
        label: rawEdge.label,
        metadata: rawEdge.metadata,
      });
      continue;
    }

    if (targetSystem && isExternalResource(sourceNode)) {
      externalIds.add(sourceNode!.id);
      addAggregatedEdge(edges, dedupe, {
        source: sourceNode!.id,
        target: targetSystem.id,
        relation: rawEdge.relation,
        health: rawEdge.health,
        change: rawEdge.change,
        label: rawEdge.label,
        metadata: rawEdge.metadata,
      });
    }
  }

  nodes.push(...data.nodes.filter((node) => externalIds.has(node.id)));

  return {
    ...data,
    nodes,
    edges,
    metadata: {
      ...(data.metadata ?? {}),
      graphKind: 'system-boundaries',
      systemBoundaryCount: systems.size,
      hiddenNodes: Math.max(0, data.nodes.length - externalIds.size),
    },
  };
}
