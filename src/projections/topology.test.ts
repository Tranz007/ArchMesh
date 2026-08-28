import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { projectTopology } from './topology';

describe('projectTopology', () => {
  it('aggregates code-level data and integration edges by feature', () => {
    const graph: ArchGraphData = {
      project: 'ExampleApp',
      generatedAt: '2026-08-27T00:00:00.000Z',
      nodes: [
        { id: 'catalog-service', label: 'catalog.ts', kind: 'service', path: 'src/app/catalog/catalog.ts', health: 'error' },
        { id: 'catalog-worker', label: 'worker.ts', kind: 'service', path: 'src/app/catalog/worker.ts', health: 'healthy' },
        { id: 'orders-page', label: 'page.tsx', kind: 'route', path: 'src/app/orders/page.tsx', health: 'healthy' },
        { id: 'products', label: 'products', kind: 'data', health: 'healthy', metadata: { provider: 'Firebase' } },
        { id: 'stripe', label: 'Stripe', kind: 'integration', health: 'healthy' },
      ],
      edges: [
        { id: 'e1', source: 'catalog-worker', target: 'products', relation: 'writes', health: 'healthy' },
        {
          id: 'e2',
          source: 'catalog-service',
          target: 'products',
          relation: 'writes',
          health: 'error',
          metadata: { healthSource: 'runtime', healthMessage: 'Firestore write failed' },
        },
        { id: 'e3', source: 'orders-page', target: 'products', relation: 'reads', health: 'healthy' },
        { id: 'e4', source: 'catalog-service', target: 'stripe', relation: 'integrates-with', health: 'healthy' },
      ],
    };

    const topology = projectTopology(graph);

    expect(topology.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'feature:catalog' }),
        expect.objectContaining({ id: 'feature:orders' }),
        expect.objectContaining({ id: 'products' }),
        expect.objectContaining({ id: 'stripe' }),
      ]),
    );
    expect(topology.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'feature:catalog',
          target: 'products',
          relation: 'writes',
          health: 'error',
          metadata: expect.objectContaining({ healthMessage: 'Firestore write failed' }),
        }),
        expect.objectContaining({ source: 'feature:orders', target: 'products', relation: 'reads' }),
        expect.objectContaining({ source: 'feature:catalog', target: 'stripe' }),
      ]),
    );
  });

  it('merges opposite integration directions when feature members collapse together', () => {
    const graph: ArchGraphData = {
      project: 'ExampleApp',
      generatedAt: '2026-08-27T00:00:00.000Z',
      nodes: [
        { id: 'reader', label: 'reader.ts', kind: 'service', path: 'src/app/catalog/reader.ts', health: 'healthy' },
        { id: 'writer', label: 'writer.ts', kind: 'service', path: 'src/app/catalog/writer.ts', health: 'healthy' },
        { id: 'firebase', label: 'Firebase', kind: 'integration', health: 'healthy' },
      ],
      edges: [
        {
          id: 'read-integration',
          source: 'reader',
          target: 'firebase',
          relation: 'integrates-with',
          health: 'healthy',
          metadata: { flowDirection: 'target-to-source' },
        },
        {
          id: 'write-integration',
          source: 'writer',
          target: 'firebase',
          relation: 'integrates-with',
          health: 'healthy',
          metadata: { flowDirection: 'source-to-target' },
        },
      ],
    };

    const topology = projectTopology(graph);
    const integration = topology.edges.find((edge) => edge.source === 'feature:catalog' && edge.target === 'firebase');
    expect(integration?.metadata?.flowDirection).toBe('both');
  });
});
