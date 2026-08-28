import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { projectSystemBoundaries } from './systems';

describe('system boundary projection', () => {
  it('collapses source into systems and retains cross-boundary runtime evidence', () => {
    const data: ArchGraphData = {
      project: 'workspace',
      generatedAt: new Date(0).toISOString(),
      nodes: [
        { id: 'web', label: 'orders.ts', kind: 'component', path: 'apps/web/orders.ts', health: 'healthy', metadata: { systemKey: 'apps-web', systemLabel: 'Web App', systemType: 'application', systemRoot: 'apps/web' } },
        { id: 'api', label: 'POST /orders', kind: 'api', path: 'services/api/main.py', health: 'healthy', metadata: { systemKey: 'services-api', systemLabel: 'Orders API', systemType: 'service', systemRoot: 'services/api' } },
        { id: 'stripe', label: 'Stripe', kind: 'integration', health: 'healthy' },
      ],
      edges: [
        { id: 'call', source: 'web', target: 'api', relation: 'calls', label: 'POST /orders', health: 'warning' },
        { id: 'stripe-edge', source: 'api', target: 'stripe', relation: 'integrates-with', health: 'healthy' },
      ],
    };

    const graph = projectSystemBoundaries(data)!;
    expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'product:workspace', 'system:apps-web', 'system:services-api', 'stripe',
    ]));
    expect(graph.nodes.some((node) => node.id === 'web' || node.id === 'api')).toBe(false);
    expect(graph.nodes.find((node) => node.id === 'system:apps-web')).toMatchObject({ kind: 'system', health: 'warning' });
    expect(graph.nodes.find((node) => node.id === 'system:services-api')).toMatchObject({ kind: 'system', health: 'warning' });
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'system:apps-web', target: 'system:services-api', relation: 'calls', label: 'POST /orders' }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'system:services-api', target: 'stripe', relation: 'integrates-with' }));
    expect(graph.metadata).toMatchObject({ graphKind: 'system-boundaries', systemBoundaryCount: 2 });
  });

  it('returns undefined when no system boundary metadata exists', () => {
    const data: ArchGraphData = {
      project: 'single-app', generatedAt: new Date(0).toISOString(),
      nodes: [{ id: 'file', label: 'app.ts', kind: 'file', path: 'src/app.ts', health: 'healthy' }],
      edges: [],
    };
    expect(projectSystemBoundaries(data)).toBeUndefined();
  });
});
