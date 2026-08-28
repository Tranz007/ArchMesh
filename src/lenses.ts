import type { ArchEdge, ArchGraphData, ArchNode, HealthState } from './types';

export type ArchitectureLens =
  | 'system'
  | 'areas'
  | 'topology'
  | 'request-flow'
  | 'security'
  | 'changes'
  | 'health'
  | 'drift'
  | 'code';

const MAX_SYSTEM_DEPENDENCY_EDGES = 36;
const MAX_SYSTEM_CONNECTIONS_PER_INTEGRATION = 8;

const healthWeight: Record<HealthState, number> = {
  healthy: 0,
  unknown: 25,
  impacted: 120,
  warning: 180,
  error: 240,
};

function nodeDegree(data: ArchGraphData) {
  const degree = new Map<string, number>();
  for (const edge of data.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return degree;
}

function numberMetadata(node: ArchNode, key: string) {
  const value = node.metadata?.[key];
  return typeof value === 'number' ? value : 0;
}

function featureImportance(node: ArchNode, degree: Map<string, number>) {
  const memberCount = numberMetadata(node, 'memberCount');
  const routeCount = numberMetadata(node, 'routes');
  const apiCount = numberMetadata(node, 'apis');
  const serviceCount = numberMetadata(node, 'services');
  const changed = node.change === 'changed' ? 90 : node.change === 'affected' ? 50 : 0;
  return (
    memberCount * 3
    + routeCount * 8
    + apiCount * 10
    + serviceCount * 8
    + (degree.get(node.id) ?? 0) * 5
    + healthWeight[node.health]
    + changed
  );
}

function withNodes(data: ArchGraphData, nodeIds: Set<string>, graphKind: string): ArchGraphData {
  const nodes = data.nodes.filter((node) => nodeIds.has(node.id));
  const edges = data.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return {
    ...data,
    nodes,
    edges,
    metadata: {
      ...data.metadata,
      graphKind,
      hiddenNodes: Math.max(0, data.nodes.length - nodes.length),
    },
  };
}

function edgeIsPriority(edge: ArchEdge) {
  return edge.health !== 'healthy' || edge.change === 'changed' || edge.change === 'affected';
}

function edgeImportance(
  edge: ArchEdge,
  nodeById: Map<string, ArchNode>,
  degree: Map<string, number>,
) {
  let score = 0;
  for (const id of [edge.source, edge.target]) {
    const node = nodeById.get(id);
    if (!node) continue;
    if (node.kind === 'feature') score += featureImportance(node, degree);
    else score += (degree.get(node.id) ?? 0) * 8 + healthWeight[node.health];
  }
  if (edge.change === 'changed') score += 180;
  if (edge.change === 'affected') score += 90;
  score += healthWeight[edge.health] * 2;
  return score;
}

function isIntegrationLike(node?: ArchNode) {
  return Boolean(node && (node.kind === 'integration' || (node.kind === 'data' && !node.path)));
}

function trimSystemOverviewEdges(data: ArchGraphData, degree: Map<string, number>) {
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  const keep = new Set<string>();
  const dependencyEdges: ArchEdge[] = [];
  const integrationEdges = new Map<string, ArchEdge[]>();

  for (const edge of data.edges) {
    if (edge.relation === 'contains' || edgeIsPriority(edge)) {
      keep.add(edge.id);
      continue;
    }

    if (edge.relation === 'depends-on') {
      dependencyEdges.push(edge);
      continue;
    }

    if (edge.relation === 'integrates-with') {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      const integration = isIntegrationLike(source)
        ? source
        : isIntegrationLike(target)
          ? target
          : undefined;
      if (!integration) {
        keep.add(edge.id);
        continue;
      }
      const bucket = integrationEdges.get(integration.id) ?? [];
      bucket.push(edge);
      integrationEdges.set(integration.id, bucket);
      continue;
    }

    keep.add(edge.id);
  }

  dependencyEdges
    .sort((left, right) => edgeImportance(right, nodeById, degree) - edgeImportance(left, nodeById, degree))
    .slice(0, MAX_SYSTEM_DEPENDENCY_EDGES)
    .forEach((edge) => keep.add(edge.id));

  for (const edges of integrationEdges.values()) {
    edges
      .sort((left, right) => edgeImportance(right, nodeById, degree) - edgeImportance(left, nodeById, degree))
      .slice(0, MAX_SYSTEM_CONNECTIONS_PER_INTEGRATION)
      .forEach((edge) => keep.add(edge.id));
  }

  const edges = data.edges.filter((edge) => keep.has(edge.id));
  return {
    edges,
    hiddenEdges: Math.max(0, data.edges.length - edges.length),
  };
}

export function projectSystemOverview(data: ArchGraphData, maxFeatures = 26, maxIntegrations = 12): ArchGraphData {
  const degree = nodeDegree(data);
  const products = data.nodes.filter((node) => node.kind === 'product');
  const features = data.nodes.filter((node) => node.kind === 'feature');
  const integrations = data.nodes.filter((node) => node.kind === 'integration' || (node.kind === 'data' && !node.path));

  const priorityFeatures = features
    .filter((node) => node.health !== 'healthy' || node.change === 'changed' || node.change === 'affected')
    .sort((a, b) => featureImportance(b, degree) - featureImportance(a, degree));
  const priorityIds = new Set(priorityFeatures.map((node) => node.id));
  const rankedNormalFeatures = features
    .filter((node) => !priorityIds.has(node.id))
    .sort((a, b) => featureImportance(b, degree) - featureImportance(a, degree));

  const featureIds = new Set<string>(priorityIds);
  for (const feature of rankedNormalFeatures.slice(0, maxFeatures)) {
    featureIds.add(feature.id);
  }

  const integrationIds = new Set(integrations.map((node) => node.id));
  const connectedIntegrationIds = new Set<string>();
  for (const edge of data.edges) {
    if (featureIds.has(edge.source) && integrationIds.has(edge.target)) connectedIntegrationIds.add(edge.target);
    if (featureIds.has(edge.target) && integrationIds.has(edge.source)) connectedIntegrationIds.add(edge.source);
  }

  const rankedIntegrations = integrations
    .filter((node) => connectedIntegrationIds.has(node.id) || node.health !== 'healthy')
    .sort((a, b) => (healthWeight[b.health] + (degree.get(b.id) ?? 0) * 8) - (healthWeight[a.health] + (degree.get(a.id) ?? 0) * 8));

  const nodeIds = new Set(products.map((node) => node.id));
  for (const id of featureIds) nodeIds.add(id);
  for (const integration of rankedIntegrations.slice(0, maxIntegrations)) nodeIds.add(integration.id);
  for (const integration of rankedIntegrations) {
    if (integration.health !== 'healthy') nodeIds.add(integration.id);
  }

  const projected = withNodes(data, nodeIds, 'system-overview');
  const trimmed = trimSystemOverviewEdges(projected, degree);
  return {
    ...projected,
    edges: trimmed.edges,
    metadata: {
      ...projected.metadata,
      hiddenEdges: trimmed.hiddenEdges,
    },
  };
}

export function projectProductAreas(data: ArchGraphData): ArchGraphData {
  const nodeIds = new Set(
    data.nodes
      .filter((node) => node.kind === 'product' || node.kind === 'feature')
      .map((node) => node.id),
  );
  return withNodes(data, nodeIds, 'product-areas');
}

export function projectRequestFlow(data: ArchGraphData): ArchGraphData {
  const coreKinds = new Set(['route', 'api', 'service']);
  const contextKinds = new Set(['route', 'api', 'service', 'integration', 'data', 'feature', 'product']);
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  const nodeIds = new Set<string>();

  for (const node of data.nodes) {
    if (coreKinds.has(node.kind)) nodeIds.add(node.id);
  }

  for (const edge of data.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;
    if (nodeIds.has(source.id) && contextKinds.has(target.kind)) nodeIds.add(target.id);
    if (nodeIds.has(target.id) && contextKinds.has(source.kind)) nodeIds.add(source.id);
  }

  return withNodes(data, nodeIds, 'request-flow');
}

export function projectHealthContext(data: ArchGraphData): ArchGraphData {
  const nodeIds = new Set<string>();
  for (const node of data.nodes) {
    if (node.health === 'error' || node.health === 'warning' || node.health === 'impacted') nodeIds.add(node.id);
  }
  for (const edge of data.edges) {
    if (
      edge.health === 'error'
      || edge.health === 'warning'
      || edge.health === 'impacted'
      || nodeIds.has(edge.source)
      || nodeIds.has(edge.target)
    ) {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
  }

  if (nodeIds.size === 0) {
    const product = data.nodes.find((node) => node.kind === 'product');
    if (product) nodeIds.add(product.id);
  }

  return withNodes(data, nodeIds, 'health-context');
}
