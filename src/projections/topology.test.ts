import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { projectTopology } from './topology';

describe('projectTopology', () => {
  it('aggregates code-level data and integration edges by feature', () => {
    const graph: ArchGraphData = {
      project: 'Vetttd',
      generatedAt: '2026-08-27T00:00:00.000Z',
      nodes: [
        { id: 'story-service', label: 'story.ts', kind: 'service', path: 'src/app/story/story.ts', health: 'error' },
        { id: 'story-worker', label: 'worker.ts', kind: 'service', path: 'src/app/story/worker.ts', health: 'healthy' },
        { id: 'hiring-page', label: 'page.tsx', kind: 'route', path: 'src/app/hiring/page.tsx', health: 'healthy' },
        { id: 'stories', label: 'stories', kind: 'data', health: 'healthy', metadata: { provider: 'Firebase' } },
        { id: 'stripe', label: 'Stripe', kind: 'integration', health: 'healthy' },
      ],
      edges: [
        { id: 'e1', source: 'story-worker', target: 'stories', relation: 'writes', health: 'healthy' },
        {
          id: 'e2',
          source: 'story-service',
          target: 'stories',
          relation: 'writes',
          health: 'error',
          metadata: { healthSource: 'runtime', healthMessage: 'Firestore write failed' },
        },
        { id: 'e3', source: 'hiring-page', target: 'stories', relation: 'reads', health: 'healthy' },
        { id: 'e4', source: 'story-service', target: 'stripe', relation: 'integrates-with', health: 'healthy' },
      ],
    };

    const topology = projectTopology(graph);

    expect(topology.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'feature:story' }),
        expect.objectContaining({ id: 'feature:hiring' }),
        expect.objectContaining({ id: 'stories' }),
        expect.objectContaining({ id: 'stripe' }),
      ]),
    );
    expect(topology.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'feature:story',
          target: 'stories',
          relation: 'writes',
          health: 'error',
          metadata: expect.objectContaining({ healthMessage: 'Firestore write failed' }),
        }),
        expect.objectContaining({ source: 'feature:hiring', target: 'stories', relation: 'reads' }),
        expect.objectContaining({ source: 'feature:story', target: 'stripe' }),
      ]),
    );
  });
});
