import { describe, expect, it } from 'vitest';
import { deriveSceneCandidates, projectScene, sceneFromNode } from './scenes';
import type { ArchGraphData } from './types';

const graph: ArchGraphData = {
  project: 'Example',
  generatedAt: '2026-08-28T00:00:00.000Z',
  nodes: [
    { id: 'product', label: 'Example', kind: 'product', health: 'healthy' },
    { id: 'feature:account', label: 'Account', kind: 'feature', health: 'healthy' },
    { id: 'route:profile', label: 'page.tsx', kind: 'route', health: 'healthy', path: 'src/app/profile/page.tsx', metadata: { routePath: '/profile' } },
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

  it('uses route semantics instead of generic page filenames for scene names', () => {
    const route = graph.nodes.find((node) => node.id === 'route:profile')!;
    expect(sceneFromNode(route).name).toBe('Route /profile');
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

  it('does not fan back out through a parent container or shared dependency in both mode', () => {
    const fanoutGraph: ArchGraphData = {
      project: 'Fanout',
      generatedAt: '2026-08-28T00:00:00.000Z',
      nodes: [
        { id: 'feature', label: 'Account', kind: 'feature', health: 'healthy' },
        { id: 'route', label: 'page.tsx', kind: 'route', health: 'healthy', metadata: { routePath: '/account' } },
        { id: 'sibling', label: 'settings.tsx', kind: 'component', health: 'healthy' },
        { id: 'shared', label: 'session.ts', kind: 'service', health: 'healthy' },
        { id: 'api', label: 'account.ts', kind: 'api', health: 'healthy' },
      ],
      edges: [
        { id: 'contains-route', source: 'feature', target: 'route', relation: 'contains', health: 'healthy' },
        { id: 'contains-sibling', source: 'feature', target: 'sibling', relation: 'contains', health: 'healthy' },
        { id: 'route-shared', source: 'route', target: 'shared', relation: 'imports', health: 'healthy' },
        { id: 'sibling-shared', source: 'sibling', target: 'shared', relation: 'imports', health: 'healthy' },
        { id: 'shared-api', source: 'shared', target: 'api', relation: 'calls', health: 'healthy' },
      ],
    };

    const scene = sceneFromNode(fanoutGraph.nodes.find((node) => node.id === 'route')!, {
      depth: 2,
      direction: 'both',
    });
    const projected = projectScene(fanoutGraph, scene);

    expect(projected.nodes.map((node) => node.id).sort()).toEqual(['api', 'feature', 'route', 'shared']);
    expect(projected.nodes.some((node) => node.id === 'sibling')).toBe(false);
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
