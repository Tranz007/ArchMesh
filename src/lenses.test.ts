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

  it('budgets dense healthy System Map relationships while preserving priority evidence', () => {
    const featureNodes = Array.from({ length: 26 }, (_, index) =>
      node(`feature:${index}`, 'feature', { metadata: { memberCount: 30 - index } }));
    const denseEdges: ArchGraphData['edges'] = featureNodes.map((feature, index) => ({
      id: `contains:${index}`,
      source: 'product',
      target: feature.id,
      relation: 'contains',
      health: 'healthy',
    }));

    for (let index = 0; index < 26; index += 1) {
      for (let offset = 1; offset <= 3; offset += 1) {
        denseEdges.push({
          id: `dependency:${index}:${offset}`,
          source: `feature:${index}`,
          target: `feature:${(index + offset) % 26}`,
          relation: 'depends-on',
          health: 'healthy',
        });
      }
    }

    for (let index = 0; index < 20; index += 1) {
      denseEdges.push({
        id: `integration:${index}`,
        source: `feature:${index}`,
        target: 'provider',
        relation: 'integrates-with',
        health: 'healthy',
      });
    }

    denseEdges.push({
      id: 'priority-dependency',
      source: 'feature:24',
      target: 'feature:25',
      relation: 'depends-on',
      health: 'warning',
    });

    const denseGraph: ArchGraphData = {
      project: 'Dense Example',
      generatedAt: new Date(0).toISOString(),
      nodes: [node('product', 'product'), ...featureNodes, node('provider', 'integration')],
      edges: denseEdges,
    };

    const result = projectSystemOverview(denseGraph);
    expect(result.edges.filter((edge) => edge.relation === 'contains')).toHaveLength(26);
    expect(result.edges.filter((edge) => edge.relation === 'depends-on').length).toBeLessThanOrEqual(37);
    expect(result.edges.filter((edge) => edge.relation === 'integrates-with').length).toBeLessThanOrEqual(8);
    expect(result.edges.some((edge) => edge.id === 'priority-dependency')).toBe(true);
    expect(Number(result.metadata?.hiddenEdges ?? 0)).toBeGreaterThan(0);
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
