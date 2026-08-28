import { describe, expect, it } from 'vitest';
import { projectSecurity } from './security';
import type { ArchGraphData } from '../types';

const graph: ArchGraphData = {
  project: 'security-fixture',
  generatedAt: '2026-08-28T00:00:00.000Z',
  nodes: [
    { id: 'a', label: 'Profile', kind: 'service', health: 'healthy' },
    { id: 'b', label: 'Partner', kind: 'integration', health: 'healthy', metadata: { securityBoundary: 'external' } },
    { id: 'c', label: 'Unrelated', kind: 'file', health: 'healthy' },
  ],
  edges: [
    {
      id: 'edge:secure',
      source: 'a',
      target: 'b',
      relation: 'calls',
      health: 'healthy',
      metadata: {
        securitySensitiveData: true,
        securitySensitiveFields: 'email',
        securityTransport: 'tls-requested',
        securityExternalBoundary: true,
      },
    },
    {
      id: 'edge:unrelated',
      source: 'c',
      target: 'a',
      relation: 'imports',
      health: 'healthy',
    },
  ],
};

describe('security projection', () => {
  it('keeps only architecture with security evidence', () => {
    const result = projectSecurity(graph);
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['a', 'b']);
    expect(result.edges.map((edge) => edge.id)).toEqual(['edge:secure']);
    expect(result.metadata?.securitySensitiveFlowCount).toBe(1);
    expect(result.metadata?.securityExternalBoundaryCount).toBe(1);
    expect(result.metadata?.hiddenNodes).toBe(1);
  });
});
