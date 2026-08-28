import { withMergedFlowDirection } from '../flow';
import type { ArchEdge, ArchGraphData, ArchNode, HealthState } from '../types';
import { projectArchitecture } from './architecture';

const healthRank: Record<HealthState, number> = {
  healthy: 0,
  unknown: 1,
  impacted: 2,
  warning: 3,
  error: 4,
};

function worstHealth(a: HealthState, b: HealthState) {
  return healthRank[b] > healthRank[a] ? b : a;
}

function isTopologyResource(node: ArchNode) {
  return node.kind === 'integration' || (node.kind === 'data' && !node.path);
}

function addEdge(edges: ArchEdge[], dedupe: Map<string, ArchEdge>, edge: Omit<ArchEdge, 'id'>) {
  const key = `${edge.source}->${edge.target}:${edge.relation}`;
  const existing = dedupe.get(key);
  if (existing) {
    const incomingIsAtLeastAsSevere = healthRank[edge.health] >= healthRank[existing.health];
    const previousMetadata = existing.metadata;
    existing.health = worstHealth(existing.health, edge.health);
    if (!existing.label && edge.label) existing.label = edge.label;
    const preferredMetadata = incomingIsAtLeastAsSevere && edge.metadata
      ? { ...edge.metadata }
      : previousMetadata
        ? { ...previousMetadata }
        : undefined;
    existing.metadata = withMergedFlowDirection(preferredMetadata, incomingIsAtLeastAsSevere ? previousMetadata : edge.metadata);
    return;
  }
  const created: ArchEdge = {
    ...edge,
    metadata: edge.metadata ? { ...edge.metadata } : undefined,
    id: `topology:${edges.length + 1}`,
  };
  edges.push(created);
  dedupe.set(key, created);
}

export function projectTopology(data: ArchGraphData): ArchGraphData {
  const architecture = projectArchitecture(data);
  const membership = architecture.featureMembership;
  const featureNodes = architecture.graph.nodes.filter((node) => node.kind === 'feature');
  const resources = data.nodes.filter(isTopologyResource);
  const resourceIds = new Set(resources.map((node) => node.id));
  const connectedFeatureIds = new Set<string>();
  const edges: ArchEdge[] = [];
  const dedupe = new Map<string, ArchEdge>();

  for (const edge of data.edges) {
    const sourceFeature = membership.get(edge.source);
    const targetFeature = membership.get(edge.target);
    const sourceResource = resourceIds.has(edge.source);
    const targetResource = resourceIds.has(edge.target);

    if (sourceFeature && targetResource) {
      connectedFeatureIds.add(sourceFeature);
      addEdge(edges, dedupe, {
        source: sourceFeature,
        target: edge.target,
        relation: edge.relation,
        health: edge.health,
        label: edge.label,
        metadata: edge.metadata,
      });
      continue;
    }

    if (sourceResource && targetFeature) {
      connectedFeatureIds.add(targetFeature);
      addEdge(edges, dedupe, {
        source: edge.source,
        target: targetFeature,
        relation: edge.relation,
        health: edge.health,
        label: edge.label,
        metadata: edge.metadata,
      });
      continue;
    }

    if (sourceResource && targetResource) {
      addEdge(edges, dedupe, {
        source: edge.source,
        target: edge.target,
        relation: edge.relation,
        health: edge.health,
        label: edge.label,
        metadata: edge.metadata,
      });
    }
  }

  const nodes = [
    ...featureNodes.filter((node) => connectedFeatureIds.has(node.id)),
    ...resources.filter((node) => edges.some((edge) => edge.source === node.id || edge.target === node.id)),
  ];

  return {
    ...data,
    nodes,
    edges,
  };
}
