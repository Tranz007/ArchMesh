import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types';
import { projectSystemBoundaries } from './systems';

describe('system boundary projection', () => {
  it('collapses source into systems and retains cross-boundary runtime evidence', () => {
    const data: ArchGraphData = {
      project: 'workspace',
      generatedAt: new Date(0).toISOString(),
      nodes: [
        { id: 'web', label: 'orders.ts', kind: 'component', path: 'apps/web/orders.ts', health: 'healthy', metadata: { systemKey: 'apps-web', systemLabel: 'Web App', systemType: 'application', systemRoot: 'apps/web' } },
        { id: 'api', label: 'POST /orders', kind: 'api', path: 'services/api/main.py', health: 'healthy', metadata: { systemKey: 'services-api', systemLabel: 'Orders API', systemType: 'service', systemRoot: 'services/api' } },
        { id: 'stripe', label: 'Stripe', kind: 'integration', health: 'healthy' },
      ],
      edges: [
        { id: 'call', source: 'web', target: 'api', relation: 'calls', label: 'POST /orders', health: 'warning' },
        { id: 'stripe-edge', source: 'api', target: 'stripe', relation: 'integrates-with', health: 'healthy' },
      ],
    };

    const graph = projectSystemBoundaries(data)!;
    expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'product:workspace', 'system:apps-web', 'system:services-api', 'stripe',
    ]));
    expect(graph.nodes.some((node) => node.id === 'web' || node.id === 'api')).toBe(false);
    expect(graph.nodes.find((node) => node.id === 'system:apps-web')).toMatchObject({ kind: 'system', health: 'warning' });
    expect(graph.nodes.find((node) => node.id === 'system:services-api')).toMatchObject({ kind: 'system', health: 'warning' });
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'system:apps-web', target: 'system:services-api', relation: 'calls', label: 'POST /orders' }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: 'system:services-api', target: 'stripe', relation: 'integrates-with' }));
    expect(graph.metadata).toMatchObject({ graphKind: 'system-boundaries', systemBoundaryCount: 2, systemMapBudgeted: true });
  });

  it('budgets a dense detected system map instead of feeding every integration link to the force renderer', () => {
    const integrationCount = 30;
    const data: ArchGraphData = {
      project: 'dense-workspace',
      generatedAt: new Date(0).toISOString(),
      nodes: [
        {
          id: 'app',
          label: 'app.ts',
          kind: 'service',
          path: 'apps/web/app.ts',
          health: 'healthy',
          metadata: {
            systemKey: 'apps-web',
            systemLabel: 'Web App',
            systemType: 'application',
            systemRoot: 'apps/web',
          },
        },
        ...Array.from({ length: integrationCount }, (_, index) => ({
          id: `provider-${index}`,
          label: `Provider ${index}`,
          kind: 'integration' as const,
          health: 'healthy' as const,
        })),
      ],
      edges: Array.from({ length: integrationCount }, (_, index) => ({
        id: `provider-edge-${index}`,
        source: 'app',
        target: `provider-${index}`,
        relation: 'integrates-with' as const,
        health: 'healthy' as const,
      })),
    };

    const graph = projectSystemBoundaries(data)!;
    const visibleIntegrations = graph.nodes.filter((node) => node.kind === 'integration');

    expect(visibleIntegrations).toHaveLength(12);
    expect(graph.nodes).toContainEqual(expect.objectContaining({ id: 'product:dense-workspace', kind: 'product' }));
    expect(graph.nodes).toContainEqual(expect.objectContaining({ id: 'system:apps-web', kind: 'system' }));
    expect(graph.edges.filter((edge) => edge.relation === 'integrates-with')).toHaveLength(12);
    expect(graph.metadata).toMatchObject({
      graphKind: 'system-boundaries',
      systemMapBudgeted: true,
      hiddenNodes: 18,
      hiddenEdges: 18,
    });
    const visibleIds = new Set(graph.nodes.map((node) => node.id));
    expect(graph.edges.every((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))).toBe(true);
  });

  it('keeps unhealthy integrations even when they exceed the normal overview budget', () => {
    const integrationCount = 14;
    const data: ArchGraphData = {
      project: 'priority-workspace',
      generatedAt: new Date(0).toISOString(),
      nodes: [
        {
          id: 'app',
          label: 'app.ts',
          kind: 'service',
          path: 'apps/web/app.ts',
          health: 'healthy',
          metadata: { systemKey: 'apps-web', systemLabel: 'Web App' },
        },
        ...Array.from({ length: integrationCount }, (_, index) => ({
          id: `provider-${index}`,
          label: `Provider ${index}`,
          kind: 'integration' as const,
          health: index === 13 ? 'warning' as const : 'healthy' as const,
        })),
      ],
      edges: Array.from({ length: integrationCount }, (_, index) => ({
        id: `provider-edge-${index}`,
        source: 'app',
        target: `provider-${index}`,
        relation: 'integrates-with' as const,
        health: index === 13 ? 'warning' as const : 'healthy' as const,
      })),
    };

    const graph = projectSystemBoundaries(data)!;
    expect(graph.nodes).toContainEqual(expect.objectContaining({ id: 'provider-13', health: 'warning' }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ target: 'provider-13', health: 'warning' }));
  });

  it('returns undefined when no system boundary metadata exists', () => {
    const data: ArchGraphData = {
      project: 'single-app', generatedAt: new Date(0).toISOString(),
      nodes: [{ id: 'file', label: 'app.ts', kind: 'file', path: 'src/app.ts', health: 'healthy' }],
      edges: [],
    };
    expect(projectSystemBoundaries(data)).toBeUndefined();
  });
});
