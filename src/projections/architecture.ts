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

function worstHealth(...states: HealthState[]): HealthState {
  return states.reduce<HealthState>((current, next) =>
    healthRank[next] > healthRank[current] ? next : current, 'healthy');
}

function worstChange(...states: Array<ChangeState | undefined>): ChangeState {
  return states.reduce<ChangeState>((current, next) => {
    if (!next) return current;
    return changeRank[next] > changeRank[current] ? next : current;
  }, 'unchanged');
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanRouteSegment(segment: string | undefined) {
  if (!segment) return undefined;
  if (segment.startsWith('(') || segment.startsWith('[')) return undefined;
  if (/^(page|layout|loading|error|not-found|route)\.[jt]sx?$/.test(segment)) return undefined;
  return segment;
}

export function featureKeyForPath(input?: string) {
  if (!input) return undefined;
  const path = input.replace(/\\/g, '/');
  const parts = path.split('/').filter(Boolean);

  const featureRoots = ['features', 'modules', 'domains'];
  for (const root of featureRoots) {
    const index = parts.indexOf(root);
    if (index >= 0) {
      const segment = cleanRouteSegment(parts[index + 1]);
      if (segment) return segment;
    }
  }

  const appIndex = parts.indexOf('app');
  if (appIndex >= 0) {
    const afterApp = parts.slice(appIndex + 1);
    if (afterApp[0] === 'api') afterApp.shift();
    for (const segment of afterApp) {
      const cleaned = cleanRouteSegment(segment);
      if (cleaned) return cleaned;
    }
    return 'app-shell';
  }

  if (parts.some((part) => /^components?$/i.test(part))) return 'shared-ui';
  if (parts.some((part) => /^(services?|lib|utils?|providers?|adapters?)$/i.test(part))) return 'shared-core';
  if (parts.some((part) => /^(schemas?|models?|types?)$/i.test(part))) return 'shared-data';

  return 'core';
}

function featureId(key: string) {
  return `feature:${key}`;
}

interface FeatureBucket {
  key: string;
  id: string;
  label: string;
  source: 'config' | 'detected';
  health: HealthState;
  change: ChangeState;
  memberIds: Set<string>;
  counts: Record<'route' | 'api' | 'component' | 'service' | 'data' | 'file', number>;
  changeCounts: Record<'changed' | 'affected', number>;
}

function makeBucket(key: string, label?: string, source: FeatureBucket['source'] = 'detected'): FeatureBucket {
  return {
    key,
    id: featureId(key),
    label: label?.trim() || titleCase(key),
    source,
    health: 'healthy',
    change: 'unchanged',
    memberIds: new Set(),
    counts: { route: 0, api: 0, component: 0, service: 0, data: 0, file: 0 },
    changeCounts: { changed: 0, affected: 0 },
  };
}

function addEdge(edges: ArchEdge[], dedupe: Map<string, ArchEdge>, edge: Omit<ArchEdge, 'id'>) {
  const key = `${edge.source}->${edge.target}:${edge.relation}`;
  const existing = dedupe.get(key);
  if (existing) {
    const incomingIsAtLeastAsSevere = healthRank[edge.health] >= healthRank[existing.health];
    existing.health = worstHealth(existing.health, edge.health);
    existing.change = worstChange(existing.change, edge.change);
    if (!existing.label && edge.label) existing.label = edge.label;
    if (incomingIsAtLeastAsSevere && edge.metadata) existing.metadata = { ...edge.metadata };
    return;
  }
  const created: ArchEdge = {
    ...edge,
    change: edge.change ?? 'unchanged',
    metadata: edge.metadata ? { ...edge.metadata } : undefined,
    id: `projection:${edges.length + 1}`,
  };
  edges.push(created);
  dedupe.set(key, created);
}

function configuredFeature(node: ArchNode) {
  const key = node.metadata?.featureKey;
  if (typeof key !== 'string' || key.trim().length === 0) return undefined;
  const label = node.metadata?.featureLabel;
  return {
    key,
    label: typeof label === 'string' && label.trim().length > 0 ? label : undefined,
  };
}

function isExternalResource(node: ArchNode) {
  return node.kind === 'integration' || (node.kind === 'data' && !node.path);
}

function buildBuckets(data: ArchGraphData) {
  const buckets = new Map<string, FeatureBucket>();
  const membership = new Map<string, string>();
  const bucketById = new Map<string, FeatureBucket>();

  for (const node of data.nodes) {
    if (node.kind === 'product' || node.kind === 'feature' || isExternalResource(node)) continue;
    const configured = configuredFeature(node);
    const key = configured?.key ?? featureKeyForPath(node.path) ?? 'core';
    const source: FeatureBucket['source'] = configured ? 'config' : 'detected';
    const existing = buckets.get(key);
    const bucket = existing ?? makeBucket(key, configured?.label, source);

    if (configured?.label && existing?.source !== 'config') bucket.label = configured.label;
    if (configured) bucket.source = 'config';

    bucket.memberIds.add(node.id);
    bucket.health = worstHealth(bucket.health, node.health);
    bucket.change = worstChange(bucket.change, node.change);
    if (node.change === 'changed') bucket.changeCounts.changed += 1;
    if (node.change === 'affected') bucket.changeCounts.affected += 1;

    if (node.kind in bucket.counts) {
      bucket.counts[node.kind as keyof FeatureBucket['counts']] += 1;
    } else {
      bucket.counts.file += 1;
    }
    buckets.set(key, bucket);
    bucketById.set(bucket.id, bucket);
    membership.set(node.id, bucket.id);
  }

  for (const edge of data.edges) {
    const sourceFeature = membership.get(edge.source);
    const targetFeature = membership.get(edge.target);
    if (sourceFeature) {
      const bucket = bucketById.get(sourceFeature);
      if (bucket) {
        bucket.health = worstHealth(bucket.health, edge.health);
        bucket.change = worstChange(bucket.change, edge.change);
      }
    }
    if (targetFeature) {
      const bucket = bucketById.get(targetFeature);
      if (bucket) {
        bucket.health = worstHealth(bucket.health, edge.health);
        bucket.change = worstChange(bucket.change, edge.change);
      }
    }
  }

  return { buckets, membership, bucketById };
}

function bucketNode(bucket: FeatureBucket): ArchNode {
  return {
    id: bucket.id,
    label: bucket.label,
    kind: 'feature',
    health: bucket.health,
    change: bucket.change,
    metadata: {
      synthetic: true,
      semanticSource: bucket.source,
      memberCount: bucket.memberIds.size,
      routes: bucket.counts.route,
      apis: bucket.counts.api,
      components: bucket.counts.component,
      services: bucket.counts.service,
      data: bucket.counts.data,
      changedMembers: bucket.changeCounts.changed,
      affectedMembers: bucket.changeCounts.affected,
    },
  };
}

export interface ArchitectureProjection {
  graph: ArchGraphData;
  featureMembership: Map<string, string>;
}

export function projectArchitecture(data: ArchGraphData, focusedFeatureId?: string): ArchitectureProjection {
  const { buckets, membership, bucketById } = buildBuckets(data);
  const nodes: ArchNode[] = [];
  const edges: ArchEdge[] = [];
  const dedupe = new Map<string, ArchEdge>();
  const projectId = `product:${data.project.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const projectChange = worstChange(...[...buckets.values()].map((bucket) => bucket.change));

  nodes.push({
    id: projectId,
    label: data.project,
    kind: 'product',
    health: worstHealth(...[...buckets.values()].map((bucket) => bucket.health)),
    change: projectChange,
    metadata: {
      synthetic: true,
      featureCount: buckets.size,
      changedFeatures: [...buckets.values()].filter((bucket) => bucket.change === 'changed').length,
      affectedFeatures: [...buckets.values()].filter((bucket) => bucket.change === 'affected').length,
    },
  });

  for (const bucket of buckets.values()) {
    nodes.push(bucketNode(bucket));
    addEdge(edges, dedupe, {
      source: projectId,
      target: bucket.id,
      relation: 'contains',
      health: bucket.health,
      change: bucket.change,
    });
  }

  const integrations = new Map(data.nodes.filter((node) => node.kind === 'integration').map((node) => [node.id, node]));

  for (const edge of data.edges) {
    const sourceFeature = membership.get(edge.source);
    const targetFeature = membership.get(edge.target);
    const sourceIntegration = integrations.get(edge.source);
    const targetIntegration = integrations.get(edge.target);

    if (sourceFeature && targetIntegration) {
      if (!nodes.some((node) => node.id === targetIntegration.id)) nodes.push(targetIntegration);
      addEdge(edges, dedupe, {
        source: sourceFeature,
        target: targetIntegration.id,
        relation: 'integrates-with',
        health: edge.health,
        change: edge.change,
        label: edge.label,
        metadata: edge.metadata,
      });
      continue;
    }

    if (sourceIntegration && targetFeature) {
      if (!nodes.some((node) => node.id === sourceIntegration.id)) nodes.push(sourceIntegration);
      addEdge(edges, dedupe, {
        source: sourceIntegration.id,
        target: targetFeature,
        relation: 'integrates-with',
        health: edge.health,
        change: edge.change,
        label: edge.label,
        metadata: edge.metadata,
      });
      continue;
    }

    if (sourceFeature && targetFeature && sourceFeature !== targetFeature) {
      addEdge(edges, dedupe, {
        source: sourceFeature,
        target: targetFeature,
        relation: 'depends-on',
        health: edge.health,
        change: edge.change,
        label: edge.label,
        metadata: edge.metadata,
      });
    }
  }

  if (focusedFeatureId && buckets.size > 0) {
    const focused = bucketById.get(focusedFeatureId);
    if (focused) {
      const memberIds = focused.memberIds;
      const relevantOriginalEdges = data.edges.filter(
        (edge) => memberIds.has(edge.source) || memberIds.has(edge.target),
      );
      const externalResourceIds = new Set<string>();
      const neighborFeatureIds = new Set<string>();

      for (const edge of relevantOriginalEdges) {
        const sourceNode = data.nodes.find((node) => node.id === edge.source);
        const targetNode = data.nodes.find((node) => node.id === edge.target);
        if (sourceNode && isExternalResource(sourceNode)) externalResourceIds.add(sourceNode.id);
        if (targetNode && isExternalResource(targetNode)) externalResourceIds.add(targetNode.id);
        const sourceFeature = membership.get(edge.source);
        const targetFeature = membership.get(edge.target);
        if (sourceFeature && sourceFeature !== focusedFeatureId) neighborFeatureIds.add(sourceFeature);
        if (targetFeature && targetFeature !== focusedFeatureId) neighborFeatureIds.add(targetFeature);
      }

      const detailNodes: ArchNode[] = [
        nodes.find((node) => node.id === projectId)!,
        bucketNode(focused),
        ...data.nodes.filter((node) => memberIds.has(node.id)),
        ...data.nodes.filter((node) => externalResourceIds.has(node.id)),
        ...[...neighborFeatureIds]
          .map((id) => bucketById.get(id))
          .filter((bucket): bucket is FeatureBucket => Boolean(bucket))
          .map(bucketNode),
      ];
      const detailNodeIds = new Set(detailNodes.map((node) => node.id));
      const detailEdges: ArchEdge[] = [];
      const detailDedupe = new Map<string, ArchEdge>();

      addEdge(detailEdges, detailDedupe, {
        source: projectId,
        target: focusedFeatureId,
        relation: 'contains',
        health: focused.health,
        change: focused.change,
      });

      for (const memberId of memberIds) {
        const member = data.nodes.find((node) => node.id === memberId);
        addEdge(detailEdges, detailDedupe, {
          source: focusedFeatureId,
          target: memberId,
          relation: 'contains',
          health: member?.health ?? 'unknown',
          change: member?.change ?? 'unchanged',
        });
      }

      for (const edge of relevantOriginalEdges) {
        const sourceFeature = membership.get(edge.source);
        const targetFeature = membership.get(edge.target);
        let source = edge.source;
        let target = edge.target;

        if (!detailNodeIds.has(source) && sourceFeature) source = sourceFeature;
        if (!detailNodeIds.has(target) && targetFeature) target = targetFeature;
        if (!detailNodeIds.has(source) || !detailNodeIds.has(target) || source === target) continue;

        addEdge(detailEdges, detailDedupe, {
          source,
          target,
          relation: edge.relation,
          health: edge.health,
          change: edge.change,
          label: edge.label,
          metadata: edge.metadata,
        });
      }

      return {
        graph: { ...data, nodes: detailNodes, edges: detailEdges },
        featureMembership: membership,
      };
    }
  }

  return {
    graph: { ...data, nodes, edges },
    featureMembership: membership,
  };
}
