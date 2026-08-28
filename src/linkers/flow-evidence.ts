import {
  flowDirectionFromReadWrite,
  type FlowDirection,
} from '../flow.js';
import type { ArchEdge, ArchGraphData, ArchNode } from '../types.js';

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function providerName(node?: ArchNode) {
  return text(node?.metadata?.provider) ?? (node?.kind === 'integration' ? node.label : undefined);
}

function sameProvider(resource: ArchNode | undefined, integration: ArchNode | undefined) {
  const resourceProvider = providerName(resource)?.toLowerCase();
  const integrationProvider = providerName(integration)?.toLowerCase();
  return Boolean(resourceProvider && integrationProvider && resourceProvider === integrationProvider);
}

function directionForActorIntegration(
  actorId: string,
  integration: ArchNode,
  graph: ArchGraphData,
): { direction?: FlowDirection; evidenceCount: number } {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  let reads = 0;
  let writes = 0;

  for (const edge of graph.edges) {
    if (edge.source !== actorId || (edge.relation !== 'reads' && edge.relation !== 'writes')) continue;
    if (!sameProvider(nodeById.get(edge.target), integration)) continue;
    if (edge.relation === 'reads') reads += 1;
    if (edge.relation === 'writes') writes += 1;
  }

  return {
    direction: flowDirectionFromReadWrite(reads > 0, writes > 0),
    evidenceCount: reads + writes,
  };
}

/**
 * Generic `integrates-with` edges are often created from imports. An import is
 * evidence of usage, not of network/data direction, so those edges should not
 * animate by default. When the same source has provider-matched read/write
 * evidence, enrich the integration edge with the direction ArchMesh can prove.
 */
export function applyDirectionalFlowEvidence(graph: ArchGraphData): ArchGraphData {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  let directionalIntegrationCount = 0;
  let bidirectionalIntegrationCount = 0;

  const edges: ArchEdge[] = graph.edges.map((edge) => {
    if (edge.relation !== 'integrates-with') return edge;

    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    const integration = targetNode?.kind === 'integration'
      ? targetNode
      : sourceNode?.kind === 'integration'
        ? sourceNode
        : undefined;
    const actor = integration?.id === targetNode?.id ? sourceNode : targetNode;
    if (!integration || !actor) return edge;

    const evidence = directionForActorIntegration(actor.id, integration, graph);
    if (!evidence.direction) return edge;

    const direction = integration.id === targetNode?.id
      ? evidence.direction
      : evidence.direction === 'source-to-target'
        ? 'target-to-source'
        : evidence.direction === 'target-to-source'
          ? 'source-to-target'
          : evidence.direction;

    directionalIntegrationCount += 1;
    if (direction === 'both') bidirectionalIntegrationCount += 1;

    return {
      ...edge,
      metadata: {
        ...(edge.metadata ?? {}),
        flowDirection: direction,
        flowEvidence: `Provider-matched read/write relationships support ${direction} flow.`,
        flowEvidenceCount: evidence.evidenceCount,
      },
    };
  });

  return {
    ...graph,
    edges,
    metadata: {
      ...(graph.metadata ?? {}),
      directionalIntegrationCount,
      bidirectionalIntegrationCount,
    },
  };
}
