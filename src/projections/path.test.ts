import { describe, expect, it } from 'vitest';
import { projectPath } from './path';
import type { ArchGraphData } from '../types';

const data: ArchGraphData = {
  project: 'Example',
  generatedAt: '2026-08-28T00:00:00.000Z',
  nodes: [
    { id: 'a', label: 'A', kind: 'route', health: 'healthy' },
    { id: 'b', label: 'B', kind: 'service', health: 'healthy' },
    { id: 'c', label: 'C', kind: 'api', health: 'healthy' },
    { id: 'd', label: 'D', kind: 'integration', health: 'healthy' },
  ],
  edges: [
    { id: 'ab', source: 'a', target: 'b', relation: 'calls', health: 'healthy' },
    { id: 'bc', source: 'b', target: 'c', relation: 'calls', health: 'healthy' },
    { id: 'cd', source: 'c', target: 'd', relation: 'integrates-with', health: 'healthy' },
  ],
};

describe('projectPath', () => {
  it('finds a shortest outbound path using existing relationships', () => {
    const result = projectPath(data, { sourceId: 'a', targetId: 'd', direction: 'outbound' });
    expect(result.metadata?.pathFound).toBe(true);
    expect(result.edges.map((edge) => edge.id)).toEqual(['ab', 'bc', 'cd']);
  });

  it('does not invent a path in the wrong direction', () => {
    const result = projectPath(data, { sourceId: 'd', targetId: 'a', direction: 'outbound' });
    expect(result.metadata?.pathFound).toBe(false);
    expect(result.nodes).toHaveLength(0);
  });

  it('can find a structural connection in both directions', () => {
    const result = projectPath(data, { sourceId: 'd', targetId: 'a', direction: 'both' });
    expect(result.metadata?.pathFound).toBe(true);
    expect(result.metadata?.pathLength).toBe(3);
  });
});
