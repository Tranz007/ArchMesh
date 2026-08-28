import { describe, expect, it } from 'vitest';
import { projectImpact } from './impact';
import type { ArchGraphData } from '../types';

const data: ArchGraphData = {
  project: 'Example',
  generatedAt: '2026-08-28T00:00:00.000Z',
  nodes: [
    { id: 'feature', label: 'Feature', kind: 'feature', health: 'healthy' },
    { id: 'route', label: 'Route', kind: 'route', health: 'healthy' },
    { id: 'service', label: 'Service', kind: 'service', health: 'healthy' },
    { id: 'data', label: 'Data', kind: 'data', health: 'healthy' },
  ],
  edges: [
    { id: 'fr', source: 'feature', target: 'route', relation: 'contains', health: 'healthy' },
    { id: 'rs', source: 'route', target: 'service', relation: 'calls', health: 'healthy' },
    { id: 'sd', source: 'service', target: 'data', relation: 'reads', health: 'healthy' },
  ],
};

describe('projectImpact', () => {
  it('walks reverse dependencies from the selected entity', () => {
    const result = projectImpact(data, { rootId: 'data', depth: 3 });
    expect(result.graph.nodes.map((node) => node.id).sort()).toEqual(['data', 'feature', 'route', 'service']);
    expect(result.summary.totalAffected).toBe(3);
    expect(result.summary.byKind.service).toBe(1);
    expect(result.summary.productAreas).toBe(1);
  });

  it('bounds traversal depth', () => {
    const result = projectImpact(data, { rootId: 'data', depth: 1 });
    expect(result.graph.nodes.map((node) => node.id).sort()).toEqual(['data', 'service']);
  });
});
