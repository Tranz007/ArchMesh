import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { featureKeyForPath, projectArchitecture } from './architecture';

describe('featureKeyForPath', () => {
  it('finds Next.js product areas and shared code', () => {
    expect(featureKeyForPath('src/app/hiring/candidates/page.tsx')).toBe('hiring');
    expect(featureKeyForPath('src/app/api/story/publish/route.ts')).toBe('story');
    expect(featureKeyForPath('src/features/campus/components/Card.tsx')).toBe('campus');
    expect(featureKeyForPath('src/components/Button.tsx')).toBe('shared-ui');
    expect(featureKeyForPath('src/services/auth.ts')).toBe('shared-core');
  });
});

describe('projectArchitecture', () => {
  const graph: ArchGraphData = {
    project: 'Vetttd',
    generatedAt: '2026-08-27T00:00:00.000Z',
    nodes: [
      { id: 'story-page', label: 'page.tsx', kind: 'route', path: 'src/app/story/page.tsx', health: 'healthy' },
      { id: 'story-service', label: 'story-service.ts', kind: 'service', path: 'src/app/story/story-service.ts', health: 'error' },
      { id: 'hiring-page', label: 'page.tsx', kind: 'route', path: 'src/app/hiring/page.tsx', health: 'impacted' },
      { id: 'stripe', label: 'Stripe', kind: 'integration', health: 'healthy' },
    ],
    edges: [
      { id: 'e1', source: 'story-page', target: 'story-service', relation: 'imports', health: 'healthy' },
      { id: 'e2', source: 'hiring-page', target: 'story-service', relation: 'imports', health: 'impacted' },
      {
        id: 'e3',
        source: 'story-service',
        target: 'stripe',
        relation: 'integrates-with',
        health: 'error',
        metadata: { healthSource: 'runtime', healthMessage: 'Stripe request failed' },
      },
    ],
  };

  it('collapses files into feature-level architecture and preserves severe edge evidence', () => {
    const projection = projectArchitecture(graph).graph;

    expect(projection.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'feature:story', kind: 'feature' }),
        expect.objectContaining({ id: 'feature:hiring', kind: 'feature' }),
        expect.objectContaining({ id: 'stripe', kind: 'integration' }),
      ]),
    );
    expect(projection.nodes.some((node) => node.id === 'story-page')).toBe(false);
    expect(projection.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'feature:hiring', target: 'feature:story', relation: 'depends-on' }),
        expect.objectContaining({
          source: 'feature:story',
          target: 'stripe',
          relation: 'integrates-with',
          health: 'error',
          metadata: expect.objectContaining({ healthMessage: 'Stripe request failed' }),
        }),
      ]),
    );
  });

  it('drills into one feature without expanding unrelated files', () => {
    const projection = projectArchitecture(graph, 'feature:story').graph;

    expect(projection.nodes.some((node) => node.id === 'story-page')).toBe(true);
    expect(projection.nodes.some((node) => node.id === 'story-service')).toBe(true);
    expect(projection.nodes.some((node) => node.id === 'hiring-page')).toBe(false);
    expect(projection.nodes.some((node) => node.id === 'feature:hiring')).toBe(true);
    expect(projection.nodes.some((node) => node.id === 'stripe')).toBe(true);
  });

  it('uses configured feature identity and label before path inference', () => {
    const configuredGraph: ArchGraphData = {
      project: 'Vetttd',
      generatedAt: graph.generatedAt,
      nodes: [
        {
          id: 'profile',
          label: 'page.tsx',
          kind: 'route',
          path: 'src/app/profile/page.tsx',
          health: 'healthy',
          metadata: {
            featureKey: 'story',
            featureLabel: 'Vetttd Story',
            featureSource: 'config',
          },
        },
      ],
      edges: [],
    };

    const projection = projectArchitecture(configuredGraph).graph;
    const story = projection.nodes.find((node) => node.id === 'feature:story');

    expect(story?.label).toBe('Vetttd Story');
    expect(story?.metadata?.semanticSource).toBe('config');
    expect(projection.nodes.some((node) => node.id === 'feature:profile')).toBe(false);
  });
});
