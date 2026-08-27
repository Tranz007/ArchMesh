import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { projectDrift } from './drift';

describe('projectDrift', () => {
  it('shows structural changes with one-hop stable context', () => {
    const graph: ArchGraphData = {
      project: 'Example',
      generatedAt: '2026-08-27T20:00:00.000Z',
      nodes: [
        { id: 'page', label: 'Page', kind: 'route', path: 'src/page.tsx', health: 'healthy', drift: 'stable' },
        { id: 'service', label: 'Service', kind: 'service', path: 'src/service.ts', health: 'healthy', drift: 'modified' },
        { id: 'api', label: 'API', kind: 'api', path: 'src/api.ts', health: 'healthy', drift: 'added' },
        { id: 'unrelated', label: 'Unrelated', kind: 'file', path: 'src/unrelated.ts', health: 'healthy', drift: 'stable' },
      ],
      edges: [
        { id: 'e1', source: 'page', target: 'service', relation: 'imports', health: 'healthy', drift: 'stable' },
        { id: 'e2', source: 'service', target: 'api', relation: 'calls', health: 'healthy', drift: 'added' },
      ],
    };

    const projection = projectDrift(graph);

    expect(projection.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(['page', 'service', 'api']),
    );
    expect(projection.nodes.some((node) => node.id === 'unrelated')).toBe(false);
    expect(projection.edges.map((edge) => edge.id)).toEqual(expect.arrayContaining(['e1', 'e2']));
  });

  it('returns an empty graph when there is no structural drift', () => {
    const graph: ArchGraphData = {
      project: 'Example',
      generatedAt: '2026-08-27T20:00:00.000Z',
      nodes: [
        { id: 'page', label: 'Page', kind: 'route', path: 'src/page.tsx', health: 'healthy', drift: 'stable' },
      ],
      edges: [],
    };

    const projection = projectDrift(graph);

    expect(projection.nodes).toEqual([]);
    expect(projection.edges).toEqual([]);
  });
});
