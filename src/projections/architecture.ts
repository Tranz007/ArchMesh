import type { ArchEdge, ArchGraphData, ArchNode, HealthState } from '../types';

const healthRank: Record<HealthState, number> = {
  healthy: 0,
  unknown: 1,
  impacted: 2,
  warning: 3,
  error: 4,
};

function worstHealth(...states: HealthState[]): HealthState {
  return states.reduce<HealthState>((current, next) =>
    healthRank[next] > healthRank[current] ? next : current, 'healthy');
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
  health: HealthState;
  memberIds: Set<string>;
  counts: Record<'route' | 'api' | 'component' | 'service' | 'data' | 'file', number>;
}

function makeBucket(key: string): FeatureBucket {
  return {
    key,
    id: featureId(key),
    label: titleCase(key),
    health: 'healthy',
    memberIds: new Set(),
    counts: { route: 0, api: 0, component: 0, service: 0, data: 0, file: 0 },
  };
}

function addEdge(edges: ArchEdge[], dedupe: Map<string, ArchEdge>, edge: Omit<ArchEdge, 'id'>) {
  const key = `${edge.source}->${edge.target}:${edge.relation}`;
  const existing = dedupe.get(key);
  if (existing) {
    existing.health = worstHealth(existing.health, edge.health);
    return;
  }
  const created: ArchEdge = { ...edge, id: `projection:${edges.length + 1}` };
  edges.push(created);
  dedupe.set(key, created);
}

function buildBuckets(data: ArchGraphData) {
  const buckets = new Map<string, FeatureBucket>();
  const membership = new Map<string, string>();

  for (const node of data.nodes) {
    if (node.kind === 'integration' || node.kind === 'product' || node.kind === 'feature') continue;
    const key = featureKeyForPath(node.path) ?? 'core';
    const bucket = buckets.get(key) ?? makeBucket(key);
    bucket.memberIds.add(node.id);
    bucket.health = worstHealth(bucket.health, node.health);
    if (node.kind in bucket.counts) {
      bucket.counts[node.kind as keyof FeatureBucket['counts']] += 1;
    } else {
      bucket.counts.file += 1;
    }
    buckets.set(key, bucket);
    membership.set(node.id, bucket.id);
  }

  for (const edge of data.edges) {
    const sourceFeature = membership.get(edge.source);
    const targetFeature = membership.get(edge.target);
    if (sourceFeature) {
      const bucket = [...buckets.values()].find((candidate) => candidate.id === sourceFeature);
      if (bucket) bucket.health = worstHealth(bucket.health, edge.health);
    }
    if (targetFeature) {
      const bucket = [...buckets.values()].find((candidate) => candidate.id === targetFeature);
      if (bucket) bucket.health = worstHealth(bucket.health, edge.health);
    }
  }

  return { buckets, membership };
}

function bucketNode(bucket: FeatureBucket): ArchNode {
  return {
    id: bucket.id,
    label: bucket.label,
    kind: 'feature',
    health: bucket.health,
    metadata: {
      synthetic: true,
      memberCount: bucket.memberIds.size,
      routes: bucket.counts.route,
      apis: bucket.counts.api,
      components: bucket.counts.component,
      services: bucket.counts.service,
      data: bucket.counts.data,
    },
  };
}

export interface ArchitectureProjection {
  graph: ArchGraphData;
  featureMembership: Map<string, string>;
}

export function projectArchitecture(data: ArchGraphData, focusedFeatureId?: string): ArchitectureProjection {
  const { buckets, membership } = buildBuckets(data);
  const nodes: ArchNode[] = [];
  const edges: ArchEdge[] = [];
  const dedupe = new Map<string, ArchEdge>();
  const projectId = `product:${data.project.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  nodes.push({
    id: projectId,
    label: data.project,
    kind: 'product',
    health: worstHealth(...[...buckets.values()].map((bucket) => bucket.health)),
    metadata: { synthetic: true, featureCount: buckets.size },
  });

  for (const bucket of buckets.values()) {
    nodes.push(bucketNode(bucket));
    addEdge(edges, dedupe, {
      source: projectId,
      target: bucket.id,
      relation: 'contains',
      health: bucket.health,
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
        label: edge.label,
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
        label: edge.label,
      });
      continue;
    }

    if (sourceFeature && targetFeature && sourceFeature !== targetFeature) {
      addEdge(edges, dedupe, {
        source: sourceFeature,
        target: targetFeature,
        relation: 'depends-on',
        health: edge.health,
      });
    }
  }

  if (focusedFeatureId && buckets.size > 0) {
    const focused = [...buckets.values()].find((bucket) => bucket.id === focusedFeatureId);
    if (focused) {
      const memberIds = focused.memberIds;
      const relevantOriginalEdges = data.edges.filter(
        (edge) => memberIds.has(edge.source) || memberIds.has(edge.target),
      );
      const integrationIds = new Set<string>();
      const neighborFeatureIds = new Set<string>();

      for (const edge of relevantOriginalEdges) {
        if (integrations.has(edge.source)) integrationIds.add(edge.source);
        if (integrations.has(edge.target)) integrationIds.add(edge.target);
        const sourceFeature = membership.get(edge.source);
        const targetFeature = membership.get(edge.target);
        if (sourceFeature && sourceFeature !== focusedFeatureId) neighborFeatureIds.add(sourceFeature);
        if (targetFeature && targetFeature !== focusedFeatureId) neighborFeatureIds.add(targetFeature);
      }

      const detailNodes: ArchNode[] = [
        nodes.find((node) => node.id === projectId)!,
        bucketNode(focused),
        ...data.nodes.filter((node) => memberIds.has(node.id)),
        ...data.nodes.filter((node) => integrationIds.has(node.id)),
        ...[...neighborFeatureIds]
          .map((id) => [...buckets.values()].find((bucket) => bucket.id === id))
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
      });

      for (const memberId of memberIds) {
        addEdge(detailEdges, detailDedupe, {
          source: focusedFeatureId,
          target: memberId,
          relation: 'contains',
          health: data.nodes.find((node) => node.id === memberId)?.health ?? 'unknown',
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
          label: edge.label,
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
