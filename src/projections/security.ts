import type { ArchEdge, ArchGraphData, ArchNode } from '../types';

function hasSecurityMetadata(metadata: ArchEdge['metadata'] | ArchNode['metadata']) {
  return Boolean(
    metadata?.securitySensitiveData
    || metadata?.securityFinding
    || metadata?.securityTransport
    || metadata?.securityExternalBoundary
    || metadata?.securityBoundary
    || metadata?.securityStorage,
  );
}

export function projectSecurity(data: ArchGraphData): ArchGraphData {
  const edges = data.edges.filter((edge) => hasSecurityMetadata(edge.metadata));
  const nodeIds = new Set<string>();
  for (const edge of edges) {
    nodeIds.add(edge.source);
    nodeIds.add(edge.target);
  }
  for (const node of data.nodes) {
    if (hasSecurityMetadata(node.metadata)) nodeIds.add(node.id);
  }

  const nodes = data.nodes.filter((node) => nodeIds.has(node.id));
  const findingCount = edges.filter((edge) => Boolean(edge.metadata?.securityFinding)).length;
  const sensitiveFlowCount = edges.filter((edge) => edge.metadata?.securitySensitiveData === true).length;
  const cleartextCount = edges.filter((edge) => edge.metadata?.securityTransport === 'cleartext').length;
  const externalBoundaryCount = edges.filter((edge) => edge.metadata?.securityExternalBoundary === true).length;

  return {
    ...data,
    nodes,
    edges,
    metadata: {
      ...data.metadata,
      graphKind: 'security',
      securityFindingCount: findingCount,
      securitySensitiveFlowCount: sensitiveFlowCount,
      securityCleartextCount: cleartextCount,
      securityExternalBoundaryCount: externalBoundaryCount,
      hiddenNodes: Math.max(0, data.nodes.length - nodes.length),
    },
  };
}
