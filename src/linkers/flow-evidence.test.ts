import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types.js';
import { applyDirectionalFlowEvidence } from './flow-evidence.js';

function baseGraph(edges: ArchGraphData['edges']): ArchGraphData {
  return {
    project: 'sample',
    generatedAt: new Date(0).toISOString(),
    nodes: [
      { id: 'file:client.ts', label: 'client.ts', kind: 'service', path: 'src/client.ts', health: 'healthy' },
      { id: 'integration:cloud-data', label: 'Cloud Data', kind: 'integration', health: 'healthy' },
      {
        id: 'data:cloud-data:profiles',
        label: 'profiles',
        kind: 'data',
        health: 'healthy',
        metadata: { provider: 'Cloud Data' },
      },
      { id: 'integration:other', label: 'Other Provider', kind: 'integration', health: 'healthy' },
    ],
    edges,
  };
}

describe('directional integration flow evidence', () => {
  it('marks an integration bidirectional when the same source both reads and writes provider data', () => {
    const graph = applyDirectionalFlowEvidence(baseGraph([
      { id: 'integration', source: 'file:client.ts', target: 'integration:cloud-data', relation: 'integrates-with', health: 'healthy' },
      { id: 'read', source: 'file:client.ts', target: 'data:cloud-data:profiles', relation: 'reads', health: 'healthy' },
      { id: 'write', source: 'file:client.ts', target: 'data:cloud-data:profiles', relation: 'writes', health: 'healthy' },
    ]));

    expect(graph.edges.find((edge) => edge.id === 'integration')?.metadata).toMatchObject({
      flowDirection: 'both',
      flowEvidenceCount: 2,
    });
    expect(graph.metadata).toMatchObject({
      directionalIntegrationCount: 1,
      bidirectionalIntegrationCount: 1,
    });
  });

  it('uses target-to-source for read-only provider evidence', () => {
    const graph = applyDirectionalFlowEvidence(baseGraph([
      { id: 'integration', source: 'file:client.ts', target: 'integration:cloud-data', relation: 'integrates-with', health: 'healthy' },
      { id: 'read', source: 'file:client.ts', target: 'data:cloud-data:profiles', relation: 'reads', health: 'healthy' },
    ]));

    expect(graph.edges.find((edge) => edge.id === 'integration')?.metadata?.flowDirection).toBe('target-to-source');
  });

  it('does not invent direction from an integration import alone', () => {
    const graph = applyDirectionalFlowEvidence(baseGraph([
      { id: 'integration', source: 'file:client.ts', target: 'integration:cloud-data', relation: 'integrates-with', health: 'healthy' },
    ]));

    expect(graph.edges[0].metadata?.flowDirection).toBeUndefined();
    expect(graph.metadata?.directionalIntegrationCount).toBe(0);
  });

  it('does not use read/write evidence from a different provider', () => {
    const graph = applyDirectionalFlowEvidence(baseGraph([
      { id: 'integration', source: 'file:client.ts', target: 'integration:other', relation: 'integrates-with', health: 'healthy' },
      { id: 'write', source: 'file:client.ts', target: 'data:cloud-data:profiles', relation: 'writes', health: 'healthy' },
    ]));

    expect(graph.edges.find((edge) => edge.id === 'integration')?.metadata?.flowDirection).toBeUndefined();
  });
});
