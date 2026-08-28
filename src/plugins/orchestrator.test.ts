import { describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types.js';
import { scanProjectWithPlugins } from './orchestrator.js';
import { ARCHMESH_PLUGIN_API_VERSION, type FrameworkAdapter, type LanguagePlugin } from './types.js';

function graph(project: string, nodes: ArchGraphData['nodes'], edges: ArchGraphData['edges'] = []): ArchGraphData {
  return { project, generatedAt: '2026-01-01T00:00:00.000Z', nodes, edges };
}

function languagePlugin(id: string, result: ArchGraphData): LanguagePlugin {
  return {
    apiVersion: ARCHMESH_PLUGIN_API_VERSION,
    id,
    displayName: id,
    languages: [id],
    extensions: [`.${id}`],
    capabilities: ['source-files', 'imports'],
    scan: async () => result,
  };
}

describe('scanProjectWithPlugins', () => {
  it('merges graph fragments from multiple language plugins', async () => {
    const first = languagePlugin('alpha', graph('repo', [
      { id: 'file:a.alpha', label: 'a.alpha', kind: 'file', health: 'healthy' },
      { id: 'integration:shared', label: 'Shared', kind: 'integration', health: 'healthy', metadata: { fromAlpha: true } },
    ], [
      { id: 'edge:1', source: 'file:a.alpha', target: 'integration:shared', relation: 'integrates-with', health: 'healthy' },
    ]));
    const second = languagePlugin('beta', graph('repo', [
      { id: 'file:b.beta', label: 'b.beta', kind: 'file', health: 'healthy' },
      { id: 'integration:shared', label: 'Shared', kind: 'integration', health: 'healthy', metadata: { fromBeta: true } },
    ], [
      { id: 'edge:1', source: 'file:b.beta', target: 'integration:shared', relation: 'integrates-with', health: 'healthy' },
    ]));

    const result = await scanProjectWithPlugins('/tmp/repo', {
      languagePlugins: [first, second],
      frameworkAdapters: [],
    });

    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'file:a.alpha',
      'file:b.beta',
      'integration:shared',
    ]));
    expect(result.nodes.find((node) => node.id === 'integration:shared')?.metadata).toMatchObject({
      fromAlpha: true,
      fromBeta: true,
    });
    expect(result.edges).toHaveLength(2);
    expect(result.metadata).toMatchObject({
      languagePluginCount: 2,
      languagePlugins: 'alpha, beta',
      languageCapabilities: 'imports, source-files',
      frameworkAdapterCount: 0,
    });
  });

  it('applies compatible framework adapters after language parsing', async () => {
    const language = languagePlugin('javascript-typescript', graph('repo', [
      { id: 'file:src/app.ts', label: 'app.ts', kind: 'file', health: 'healthy' },
    ]));
    const adapter: FrameworkAdapter = {
      apiVersion: ARCHMESH_PLUGIN_API_VERSION,
      id: 'example-framework',
      displayName: 'Example Framework',
      languagePluginIds: ['javascript-typescript'],
      capabilities: ['routes'],
      detect: ({ graph: current }) => current.nodes.some((node) => node.id === 'file:src/app.ts'),
      enrich: async () => ({
        nodes: [{
          id: 'file:src/app.ts',
          label: 'app.ts',
          kind: 'route',
          health: 'healthy',
          metadata: { framework: 'example' },
        }],
      }),
    };

    const result = await scanProjectWithPlugins('/tmp/repo', {
      languagePlugins: [language],
      frameworkAdapters: [adapter],
    });

    expect(result.nodes.find((node) => node.id === 'file:src/app.ts')).toMatchObject({
      kind: 'route',
      metadata: { framework: 'example' },
    });
    expect(result.metadata).toMatchObject({
      frameworkAdapterCount: 1,
      frameworkAdapters: 'example-framework',
      frameworkCapabilities: 'routes',
    });
  });

  it('does not apply an adapter for an inactive language plugin', async () => {
    let called = false;
    const empty = languagePlugin('javascript-typescript', graph('repo', []));
    const adapter: FrameworkAdapter = {
      apiVersion: ARCHMESH_PLUGIN_API_VERSION,
      id: 'nextjs',
      displayName: 'Next.js',
      languagePluginIds: ['javascript-typescript'],
      capabilities: ['routes'],
      detect: () => {
        called = true;
        return true;
      },
      enrich: async () => ({}),
    };

    const result = await scanProjectWithPlugins('/tmp/repo', {
      languagePlugins: [empty],
      frameworkAdapters: [adapter],
    });

    expect(called).toBe(false);
    expect(result.metadata).toMatchObject({ languagePluginCount: 0, frameworkAdapterCount: 0 });
  });

  it('rejects plugins built for an incompatible host API', async () => {
    const incompatible = {
      ...languagePlugin('future', graph('repo', [])),
      apiVersion: 2,
    } as unknown as LanguagePlugin;

    await expect(scanProjectWithPlugins('/tmp/repo', {
      languagePlugins: [incompatible],
      frameworkAdapters: [],
    })).rejects.toThrow('targets ArchMesh plugin API v2');
  });
});
