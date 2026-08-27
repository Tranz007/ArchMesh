import { describe, expect, it } from 'vitest';
import {
  projectHealthContext,
  projectProductAreas,
  projectRequestFlow,
  projectSystemOverview,
} from './lenses';
import type { ArchGraphData, ArchNode } from './types';

function node(id: string, kind: ArchNode['kind'], extras: Partial<ArchNode> = {}): ArchNode {
  return { id, label: id, kind, health: 'healthy', ...extras };
}

const graph: ArchGraphData = {
  project: 'Example',
  generatedAt: new Date(0).toISOString(),
  nodes: [
    node('product', 'product'),
    node('feature:a', 'feature', { metadata: { memberCount: 40 } }),
    node('feature:b', 'feature', { metadata: { memberCount: 2 } }),
    node('feature:c', 'feature', { health: 'error', metadata: { memberCount: 1 } }),
    node('stripe', 'integration'),
    node('route', 'route'),
    node('service', 'service'),
    node('data', 'data'),
    node('file', 'file'),
  ],
  edges: [
    { id: 'e1', source: 'product', target: 'feature:a', relation: 'contains', health: 'healthy' },
    { id: 'e2', source: 'product', target: 'feature:b', relation: 'contains', health: 'healthy' },
    { id: 'e3', source: 'product', target: 'feature:c', relation: 'contains', health: 'error' },
    { id: 'e4', source: 'feature:a', target: 'stripe', relation: 'integrates-with', health: 'healthy' },
    { id: 'e5', source: 'route', target: 'service', relation: 'calls', health: 'healthy' },
    { id: 'e6', source: 'service', target: 'data', relation: 'reads', health: 'healthy' },
    { id: 'e7', source: 'file', target: 'service', relation: 'imports', health: 'healthy' },
  ],
};

describe('architecture lenses', () => {
  it('keeps important and failing features in the system overview', () => {
    const result = projectSystemOverview(graph, 1, 4);
    expect(result.nodes.some((item) => item.id === 'feature:a')).toBe(true);
    expect(result.nodes.some((item) => item.id === 'feature:c')).toBe(true);
    expect(result.nodes.some((item) => item.id === 'feature:b')).toBe(false);
  });

  it('shows only product and feature nodes in product areas', () => {
    const result = projectProductAreas(graph);
    expect(new Set(result.nodes.map((item) => item.kind))).toEqual(new Set(['product', 'feature']));
  });

  it('keeps routes, services, and useful request context', () => {
    const result = projectRequestFlow(graph);
    expect(result.nodes.some((item) => item.id === 'route')).toBe(true);
    expect(result.nodes.some((item) => item.id === 'service')).toBe(true);
    expect(result.nodes.some((item) => item.id === 'data')).toBe(true);
    expect(result.nodes.some((item) => item.id === 'file')).toBe(false);
  });

  it('keeps failing architecture and its immediate context', () => {
    const result = projectHealthContext(graph);
    expect(result.nodes.some((item) => item.id === 'feature:c')).toBe(true);
    expect(result.nodes.some((item) => item.id === 'product')).toBe(true);
    expect(result.nodes.some((item) => item.id === 'feature:b')).toBe(false);
  });
});
