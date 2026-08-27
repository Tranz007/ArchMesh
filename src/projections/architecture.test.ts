import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { featureKeyForPath, projectArchitecture } from './architecture';

describe('featureKeyForPath', () => {
  it('finds Next.js product areas and shared code', () => {
    expect(featureKeyForPath('src/app/orders/[id]/page.tsx')).toBe('orders');
    expect(featureKeyForPath('src/app/api/catalog/publish/route.ts')).toBe('catalog');
    expect(featureKeyForPath('src/features/accounts/components/Card.tsx')).toBe('accounts');
    expect(featureKeyForPath('src/components/Button.tsx')).toBe('shared-ui');
    expect(featureKeyForPath('src/services/auth.ts')).toBe('shared-core');
  });
});

describe('projectArchitecture', () => {
  const graph: ArchGraphData = {
    project: 'ExampleApp',
    generatedAt: '2026-08-27T00:00:00.000Z',
    nodes: [
      { id: 'catalog-page', label: 'page.tsx', kind: 'route', path: 'src/app/catalog/page.tsx', health: 'healthy' },
      { id: 'catalog-service', label: 'catalog-service.ts', kind: 'service', path: 'src/app/catalog/catalog-service.ts', health: 'error' },
      { id: 'orders-page', label: 'page.tsx', kind: 'route', path: 'src/app/orders/page.tsx', health: 'impacted' },
      { id: 'stripe', label: 'Stripe', kind: 'integration', health: 'healthy' },
    ],
    edges: [
      { id: 'e1', source: 'catalog-page', target: 'catalog-service', relation: 'imports', health: 'healthy' },
      { id: 'e2', source: 'orders-page', target: 'catalog-service', relation: 'imports', health: 'impacted' },
      {
        id: 'e3',
        source: 'catalog-service',
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
        expect.objectContaining({ id: 'feature:catalog', kind: 'feature' }),
        expect.objectContaining({ id: 'feature:orders', kind: 'feature' }),
        expect.objectContaining({ id: 'stripe', kind: 'integration' }),
      ]),
    );
    expect(projection.nodes.some((node) => node.id === 'catalog-page')).toBe(false);
    expect(projection.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'feature:orders', target: 'feature:catalog', relation: 'depends-on' }),
        expect.objectContaining({
          source: 'feature:catalog',
          target: 'stripe',
          relation: 'integrates-with',
          health: 'error',
          metadata: expect.objectContaining({ healthMessage: 'Stripe request failed' }),
        }),
      ]),
    );
  });

  it('drills into one feature without expanding unrelated files', () => {
    const projection = projectArchitecture(graph, 'feature:catalog').graph;

    expect(projection.nodes.some((node) => node.id === 'catalog-page')).toBe(true);
    expect(projection.nodes.some((node) => node.id === 'catalog-service')).toBe(true);
    expect(projection.nodes.some((node) => node.id === 'orders-page')).toBe(false);
    expect(projection.nodes.some((node) => node.id === 'feature:orders')).toBe(true);
    expect(projection.nodes.some((node) => node.id === 'stripe')).toBe(true);
  });

  it('uses configured feature identity and label before path inference', () => {
    const configuredGraph: ArchGraphData = {
      project: 'ExampleApp',
      generatedAt: graph.generatedAt,
      nodes: [
        {
          id: 'browse',
          label: 'page.tsx',
          kind: 'route',
          path: 'src/app/browse/page.tsx',
          health: 'healthy',
          metadata: {
            featureKey: 'catalog',
            featureLabel: 'Product Catalog',
            featureSource: 'config',
          },
        },
      ],
      edges: [],
    };

    const projection = projectArchitecture(configuredGraph).graph;
    const catalog = projection.nodes.find((node) => node.id === 'feature:catalog');

    expect(catalog?.label).toBe('Product Catalog');
    expect(catalog?.metadata?.semanticSource).toBe('config');
    expect(projection.nodes.some((node) => node.id === 'feature:browse')).toBe(false);
  });

  it('rolls direct and affected code changes up to feature and product nodes', () => {
    const changedGraph: ArchGraphData = {
      project: 'ExampleApp',
      generatedAt: graph.generatedAt,
      nodes: [
        {
          id: 'catalog-page',
          label: 'page.tsx',
          kind: 'route',
          path: 'src/app/catalog/page.tsx',
          health: 'healthy',
          change: 'affected',
        },
        {
          id: 'catalog-service',
          label: 'catalog-service.ts',
          kind: 'service',
          path: 'src/app/catalog/catalog-service.ts',
          health: 'healthy',
          change: 'changed',
        },
        {
          id: 'orders-page',
          label: 'page.tsx',
          kind: 'route',
          path: 'src/app/orders/page.tsx',
          health: 'healthy',
          change: 'affected',
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'catalog-page',
          target: 'catalog-service',
          relation: 'imports',
          health: 'healthy',
          change: 'affected',
        },
        {
          id: 'e2',
          source: 'orders-page',
          target: 'catalog-service',
          relation: 'imports',
          health: 'healthy',
          change: 'affected',
        },
      ],
    };

    const projection = projectArchitecture(changedGraph).graph;
    const product = projection.nodes.find((node) => node.kind === 'product');
    const catalog = projection.nodes.find((node) => node.id === 'feature:catalog');
    const orders = projection.nodes.find((node) => node.id === 'feature:orders');
    const ordersToCatalog = projection.edges.find(
      (edge) => edge.source === 'feature:orders' && edge.target === 'feature:catalog',
    );

    expect(catalog?.change).toBe('changed');
    expect(catalog?.metadata?.changedMembers).toBe(1);
    expect(catalog?.metadata?.affectedMembers).toBe(1);
    expect(orders?.change).toBe('affected');
    expect(orders?.metadata?.changedMembers).toBe(0);
    expect(orders?.metadata?.affectedMembers).toBe(1);
    expect(product?.change).toBe('changed');
    expect(product?.metadata?.changedFeatures).toBe(1);
    expect(product?.metadata?.affectedFeatures).toBe(1);
    expect(ordersToCatalog?.change).toBe('affected');
  });

  it('preserves member change state in a focused feature view', () => {
    const changedGraph: ArchGraphData = {
      project: 'ExampleApp',
      generatedAt: graph.generatedAt,
      nodes: [
        {
          id: 'catalog-page',
          label: 'page.tsx',
          kind: 'route',
          path: 'src/app/catalog/page.tsx',
          health: 'healthy',
          change: 'affected',
        },
        {
          id: 'catalog-service',
          label: 'catalog-service.ts',
          kind: 'service',
          path: 'src/app/catalog/catalog-service.ts',
          health: 'healthy',
          change: 'changed',
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'catalog-page',
          target: 'catalog-service',
          relation: 'imports',
          health: 'healthy',
          change: 'affected',
        },
      ],
    };

    const projection = projectArchitecture(changedGraph, 'feature:catalog').graph;
    const feature = projection.nodes.find((node) => node.id === 'feature:catalog');
    const containsService = projection.edges.find(
      (edge) => edge.source === 'feature:catalog' && edge.target === 'catalog-service',
    );

    expect(feature?.change).toBe('changed');
    expect(containsService?.change).toBe('changed');
  });
});
