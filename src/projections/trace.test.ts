import { describe, expect, it } from 'vitest';
import { projectTrace } from './trace';
import type { ArchGraphData } from '../types';

const graph: ArchGraphData = {
  project: 'trace-fixture',
  generatedAt: '2026-08-28T00:00:00.000Z',
  nodes: [
    { id: 'root', label: 'Root', kind: 'service', health: 'healthy' },
    { id: 'upstream', label: 'Upstream', kind: 'api', health: 'healthy' },
    { id: 'downstream', label: 'Downstream', kind: 'data', health: 'healthy' },
    { id: 'other', label: 'Other', kind: 'file', health: 'healthy' },
  ],
  edges: [
    { id: 'in', source: 'upstream', target: 'root', relation: 'calls', health: 'healthy' },
    { id: 'out', source: 'root', target: 'downstream', relation: 'writes', health: 'healthy' },
    { id: 'unrelated', source: 'other', target: 'upstream', relation: 'imports', health: 'healthy' },
  ],
};

describe('trace projection', () => {
  it('shows the immediate neighborhood in both directions by default', () => {
    const result = projectTrace(graph, { rootId: 'root' });
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['downstream', 'root', 'upstream']);
    expect(result.edges.map((edge) => edge.id).sort()).toEqual(['in', 'out']);
    expect(result.metadata?.traceDirection).toBe('both');
    expect(result.metadata?.hiddenNodes).toBe(1);
  });

  it('can isolate outbound relationships', () => {
    const result = projectTrace(graph, { rootId: 'root', direction: 'outbound' });
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['downstream', 'root']);
    expect(result.edges.map((edge) => edge.id)).toEqual(['out']);
  });

  it('can isolate inbound relationships', () => {
    const result = projectTrace(graph, { rootId: 'root', direction: 'inbound' });
    expect(result.nodes.map((node) => node.id).sort()).toEqual(['root', 'upstream']);
    expect(result.edges.map((edge) => edge.id)).toEqual(['in']);
  });

  it('returns an explicit empty trace when the root is not in the current lens', () => {
    const result = projectTrace(graph, { rootId: 'missing' });
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.metadata?.traceMissingRoot).toBe(true);
  });
});
