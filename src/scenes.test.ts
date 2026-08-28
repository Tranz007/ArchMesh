import { describe, expect, it } from 'vitest';
import { deriveSceneCandidates, projectScene, sceneFromNode } from './scenes';
import type { ArchGraphData } from './types';

const graph: ArchGraphData = {
  project: 'Example',
  generatedAt: '2026-08-28T00:00:00.000Z',
  nodes: [
    { id: 'product', label: 'Example', kind: 'product', health: 'healthy' },
    { id: 'feature:account', label: 'Account', kind: 'feature', health: 'healthy' },
    { id: 'route:profile', label: 'Profile', kind: 'route', health: 'healthy' },
    { id: 'service:session', label: 'Session', kind: 'service', health: 'healthy' },
    { id: 'integration:identity', label: 'Identity', kind: 'integration', health: 'healthy' },
    { id: 'file:other', label: 'Other', kind: 'file', health: 'healthy' },
  ],
  edges: [
    { id: 'e1', source: 'product', target: 'feature:account', relation: 'contains', health: 'healthy' },
    { id: 'e2', source: 'feature:account', target: 'route:profile', relation: 'contains', health: 'healthy' },
    { id: 'e3', source: 'route:profile', target: 'service:session', relation: 'calls', health: 'healthy' },
    { id: 'e4', source: 'service:session', target: 'integration:identity', relation: 'integrates-with', health: 'healthy' },
    { id: 'e5', source: 'file:other', target: 'integration:identity', relation: 'integrates-with', health: 'healthy' },
  ],
};

describe('architecture scenes', () => {
  it('derives meaningful candidates instead of file-level noise', () => {
    const scenes = deriveSceneCandidates(graph, 5);
    expect(scenes.some((scene) => scene.seedId === 'integration:identity')).toBe(true);
    expect(scenes.some((scene) => scene.seedId === 'file:other')).toBe(false);
  });

  it('does not let one node kind consume the entire suggested-scene list', () => {
    const manyIntegrations: ArchGraphData = {
      ...graph,
      nodes: [
        ...graph.nodes,
        ...Array.from({ length: 8 }, (_, index) => ({
          id: `integration:${index}`,
          label: `Provider ${index}`,
          kind: 'integration' as const,
          health: 'healthy' as const,
        })),
        { id: 'system:web', label: 'Web app', kind: 'system', health: 'healthy' },
        { id: 'feature:billing', label: 'Billing', kind: 'feature', health: 'healthy' },
        { id: 'data:accounts', label: 'Accounts', kind: 'data', health: 'healthy' },
      ],
    };

    const scenes = deriveSceneCandidates(manyIntegrations, 9);
    expect(scenes.filter((scene) => scene.seedKind === 'integration').length).toBeLessThanOrEqual(3);
    expect(new Set(scenes.map((scene) => scene.seedKind)).size).toBeGreaterThan(1);
  });

  it('projects a bounded neighborhood around a seed', () => {
    const seed = graph.nodes.find((node) => node.id === 'route:profile')!;
    const scene = sceneFromNode(seed, { depth: 1, direction: 'both' });
    const projected = projectScene(graph, scene);

    expect(projected.nodes.map((node) => node.id).sort()).toEqual([
      'feature:account',
      'route:profile',
      'service:session',
    ]);
    expect(projected.edges.map((edge) => edge.id).sort()).toEqual(['e2', 'e3']);
  });

  it('marks a saved scene whose seed no longer exists', () => {
    const projected = projectScene(graph, {
      id: 'saved:missing',
      name: 'Missing',
      seedId: 'missing',
      seedKind: 'service',
      direction: 'both',
      depth: 2,
      source: 'saved',
    });

    expect(projected.nodes).toHaveLength(0);
    expect(projected.metadata?.sceneMissingSeed).toBe(true);
  });
});
