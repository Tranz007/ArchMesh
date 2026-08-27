import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { applyHealthSignals } from './apply';

describe('applyHealthSignals', () => {
  const graph: ArchGraphData = {
    project: 'Example',
    generatedAt: '2026-08-27T00:00:00.000Z',
    nodes: [
      { id: 'ui', label: 'UI', kind: 'component', path: 'src/ui.tsx', health: 'healthy' },
      { id: 'service', label: 'Service', kind: 'service', path: 'src/service.ts', health: 'healthy' },
      { id: 'api', label: 'API', kind: 'api', path: 'src/api.ts', health: 'healthy' },
    ],
    edges: [
      { id: 'e1', source: 'ui', target: 'service', relation: 'imports', health: 'healthy' },
      { id: 'e2', source: 'service', target: 'api', relation: 'calls', health: 'healthy' },
    ],
  };

  it('marks a direct node failure and reverse-propagates impact to dependents', () => {
    const result = applyHealthSignals(graph, [
      {
        id: 'ts-api',
        severity: 'error',
        source: 'typescript',
        message: 'API does not compile',
        timestamp: '2026-08-27T12:00:00.000Z',
        node: { path: 'src/api.ts' },
      },
    ]);

    const api = result.nodes.find((node) => node.id === 'api');
    expect(api?.health).toBe('error');
    expect(api?.metadata).toMatchObject({
      healthSource: 'typescript',
      healthMessage: 'API does not compile',
      healthTimestamp: '2026-08-27T12:00:00.000Z',
      healthSignalId: 'ts-api',
    });
    expect(result.nodes.find((node) => node.id === 'service')?.health).toBe('impacted');
    expect(result.nodes.find((node) => node.id === 'ui')?.health).toBe('impacted');
    expect(result.edges.find((edge) => edge.id === 'e2')?.health).toBe('impacted');
    expect(result.edges.find((edge) => edge.id === 'e1')?.health).toBe('impacted');
  });

  it('marks a failing connection red without claiming the target failed', () => {
    const result = applyHealthSignals(graph, [
      {
        id: 'request-500',
        severity: 'error',
        source: 'runtime',
        message: 'POST /api failed',
        timestamp: '2026-08-27T12:01:00.000Z',
        edge: {
          source: { id: 'service' },
          target: { id: 'api' },
        },
      },
    ]);

    const edge = result.edges.find((candidate) => candidate.id === 'e2');
    expect(edge?.health).toBe('error');
    expect(edge?.metadata).toMatchObject({
      healthSource: 'runtime',
      healthMessage: 'POST /api failed',
      healthTimestamp: '2026-08-27T12:01:00.000Z',
      healthSignalId: 'request-500',
    });
    expect(result.nodes.find((node) => node.id === 'service')?.health).toBe('error');
    expect(result.nodes.find((node) => node.id === 'api')?.health).toBe('healthy');
    expect(result.nodes.find((node) => node.id === 'ui')?.health).toBe('impacted');
  });
});
