import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from './types.js';
import { startupSummaryLines, summarizeGraph } from './graph-summary.js';

function fixture(): ArchGraphData {
  return {
    project: 'sample',
    generatedAt: '2026-01-01T00:00:00.000Z',
    metadata: {
      languagePlugins: 'javascript-typescript',
      frameworkAdapters: 'nextjs',
    },
    nodes: [
      { id: 'file:page', label: 'page.tsx', kind: 'route', health: 'healthy' },
      { id: 'file:api', label: 'route.ts', kind: 'api', health: 'healthy' },
      { id: 'data:profiles', label: 'profiles', kind: 'data', health: 'healthy' },
      { id: 'integration:stripe', label: 'Stripe', kind: 'integration', health: 'healthy' },
      { id: 'integration:firebase', label: 'Firebase', kind: 'integration', health: 'healthy' },
    ],
    edges: [
      {
        id: 'edge:1',
        source: 'file:page',
        target: 'file:api',
        relation: 'calls',
        health: 'healthy',
        metadata: {
          securitySensitiveData: true,
          securityFinding: 'sensitive-data-crosses-external-boundary',
        },
      },
    ],
  };
}

describe('graph startup summary', () => {
  it('turns plugin metadata and graph evidence into a human-readable overview', () => {
    expect(summarizeGraph(fixture())).toEqual({
      technologies: ['JavaScript / TypeScript', 'Next.js'],
      routes: 1,
      apis: 1,
      dataStores: 1,
      integrations: ['Firebase', 'Stripe'],
      securityFindings: 1,
      sensitiveFlows: 1,
    });

    expect(startupSummaryLines(fixture())).toEqual([
      'Detected: JavaScript / TypeScript + Next.js',
      'Architecture: 1 route · 1 API · 1 data store · 2 integrations',
      'Integrations: Firebase, Stripe',
      'Security evidence: 1 security finding · 1 sensitive flow',
    ]);
  });

  it('omits empty categories rather than presenting zero-heavy output', () => {
    const graph: ArchGraphData = {
      project: 'empty',
      generatedAt: '2026-01-01T00:00:00.000Z',
      nodes: [],
      edges: [],
    };
    expect(startupSummaryLines(graph)).toEqual([]);
  });
});
