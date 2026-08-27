import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { applyChangeImpact } from './apply';

describe('applyChangeImpact', () => {
  const graph: ArchGraphData = {
    project: 'Example',
    generatedAt: '2026-08-27T00:00:00.000Z',
    nodes: [
      { id: 'page', label: 'Page', kind: 'route', path: 'src/page.tsx', health: 'healthy' },
      { id: 'service', label: 'Service', kind: 'service', path: 'src/service.ts', health: 'healthy' },
      { id: 'model', label: 'Model', kind: 'data', path: 'src/model.ts', health: 'healthy' },
      { id: 'other', label: 'Other', kind: 'file', path: 'src/other.ts', health: 'healthy' },
    ],
    edges: [
      { id: 'e1', source: 'page', target: 'service', relation: 'imports', health: 'healthy' },
      { id: 'e2', source: 'service', target: 'model', relation: 'imports', health: 'healthy' },
    ],
  };

  it('marks changed files and reverse-propagates affected dependents', () => {
    const result = applyChangeImpact(graph, ['src/model.ts']);

    expect(result.nodes.find((node) => node.id === 'model')?.change).toBe('changed');
    expect(result.nodes.find((node) => node.id === 'service')?.change).toBe('affected');
    expect(result.nodes.find((node) => node.id === 'page')?.change).toBe('affected');
    expect(result.nodes.find((node) => node.id === 'other')?.change).toBe('unchanged');
    expect(result.edges.find((edge) => edge.id === 'e2')?.change).toBe('affected');
    expect(result.edges.find((edge) => edge.id === 'e1')?.change).toBe('affected');
  });

  it('does not overwrite a directly changed dependent with affected', () => {
    const result = applyChangeImpact(graph, ['src/model.ts', 'src/service.ts']);

    expect(result.nodes.find((node) => node.id === 'model')?.change).toBe('changed');
    expect(result.nodes.find((node) => node.id === 'service')?.change).toBe('changed');
    expect(result.nodes.find((node) => node.id === 'page')?.change).toBe('affected');
  });
});
