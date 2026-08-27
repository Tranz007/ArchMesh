import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { compareGraphs } from './compare';

function graph(overrides: Partial<ArchGraphData> = {}): ArchGraphData {
  return {
    project: 'Example',
    generatedAt: '2026-08-27T20:00:00.000Z',
    nodes: [],
    edges: [],
    ...overrides,
  };
}

describe('compareGraphs', () => {
  it('detects added, removed, and modified architecture while ignoring edge ids', () => {
    const previous = graph({
      nodes: [
        { id: 'page', label: 'Page', kind: 'route', path: 'src/app/page.tsx', health: 'healthy' },
        {
          id: 'service',
          label: 'Service',
          kind: 'service',
          path: 'src/service.ts',
          health: 'healthy',
          metadata: { provider: 'internal' },
        },
        { id: 'legacy', label: 'Legacy', kind: 'service', path: 'src/legacy.ts', health: 'healthy' },
      ],
      edges: [
        { id: 'edge:1', source: 'page', target: 'service', relation: 'imports', health: 'healthy' },
        { id: 'edge:2', source: 'service', target: 'legacy', relation: 'calls', health: 'healthy' },
      ],
    });

    const current = graph({
      generatedAt: '2026-08-27T20:01:00.000Z',
      nodes: [
        { id: 'page', label: 'Page', kind: 'route', path: 'src/app/page.tsx', health: 'healthy' },
        {
          id: 'service',
          label: 'Service',
          kind: 'service',
          path: 'src/service.ts',
          health: 'healthy',
          metadata: { provider: 'internal-v2' },
        },
        { id: 'api', label: 'API', kind: 'api', path: 'src/app/api/route.ts', health: 'healthy' },
      ],
      edges: [
        { id: 'edge:99', source: 'page', target: 'service', relation: 'imports', health: 'healthy' },
        { id: 'edge:100', source: 'service', target: 'api', relation: 'calls', health: 'healthy' },
      ],
    });

    const result = compareGraphs(previous, current);

    expect(result.summary).toEqual({
      addedNodes: 1,
      removedNodes: 1,
      modifiedNodes: 1,
      addedEdges: 1,
      removedEdges: 1,
      modifiedEdges: 0,
    });
    expect(result.graph.nodes.find((node) => node.id === 'page')?.drift).toBe('stable');
    expect(result.graph.nodes.find((node) => node.id === 'service')?.drift).toBe('modified');
    expect(result.graph.nodes.find((node) => node.id === 'api')?.drift).toBe('added');
    expect(result.graph.nodes.find((node) => node.id === 'legacy')?.drift).toBe('removed');
    expect(result.graph.edges.find((edge) => edge.source === 'page' && edge.target === 'service')?.drift)
      .toBe('stable');
    expect(result.graph.edges.find((edge) => edge.source === 'service' && edge.target === 'api')?.drift)
      .toBe('added');
    expect(result.graph.edges.find((edge) => edge.source === 'service' && edge.target === 'legacy')?.drift)
      .toBe('removed');
  });

  it('does not treat health or Git change overlays as architecture drift', () => {
    const previous = graph({
      nodes: [
        { id: 'service', label: 'Service', kind: 'service', path: 'src/service.ts', health: 'healthy' },
      ],
      edges: [],
    });
    const current = graph({
      generatedAt: '2026-08-27T20:01:00.000Z',
      nodes: [
        {
          id: 'service',
          label: 'Service',
          kind: 'service',
          path: 'src/service.ts',
          health: 'error',
          change: 'changed',
          metadata: {
            healthSource: 'typescript',
            healthMessage: 'Compilation failed',
            healthTimestamp: '2026-08-27T20:01:00.000Z',
          },
        },
      ],
      edges: [],
    });

    const result = compareGraphs(previous, current);

    expect(result.summary.modifiedNodes).toBe(0);
    expect(result.graph.nodes[0].drift).toBe('stable');
    expect(result.graph.nodes[0].health).toBe('error');
    expect(result.graph.nodes[0].change).toBe('changed');
  });

  it('detects structural edge metadata changes without relying on runtime health evidence', () => {
    const previous = graph({
      nodes: [
        { id: 'client', label: 'Client', kind: 'service', path: 'src/client.ts', health: 'healthy' },
        { id: 'api', label: 'API', kind: 'api', path: 'src/api.ts', health: 'healthy' },
      ],
      edges: [
        {
          id: 'old',
          source: 'client',
          target: 'api',
          relation: 'calls',
          label: 'POST /api',
          health: 'healthy',
          metadata: { protocol: 'http' },
        },
      ],
    });
    const current = graph({
      generatedAt: '2026-08-27T20:01:00.000Z',
      nodes: previous.nodes,
      edges: [
        {
          id: 'new',
          source: 'client',
          target: 'api',
          relation: 'calls',
          label: 'POST /api',
          health: 'error',
          metadata: {
            protocol: 'https',
            healthMessage: 'Request failed',
          },
        },
      ],
    });

    const result = compareGraphs(previous, current);

    expect(result.summary.modifiedEdges).toBe(1);
    expect(result.graph.edges[0].drift).toBe('modified');
  });
});
