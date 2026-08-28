import path from 'node:path';
import { mergeGraphContributions, mergeLanguageGraphs } from './merge.js';
import { builtInFrameworkAdapters, builtInLanguagePlugins } from './registry.js';
import type { FrameworkAdapter, LanguagePlugin } from './types.js';

export interface ScanPluginOptions {
  languagePlugins?: LanguagePlugin[];
  frameworkAdapters?: FrameworkAdapter[];
}

export async function scanProjectWithPlugins(
  rootInput: string,
  options: ScanPluginOptions = {},
) {
  const root = path.resolve(rootInput);
  const project = path.basename(root);
  const languagePlugins = options.languagePlugins ?? builtInLanguagePlugins;
  const frameworkAdapters = options.frameworkAdapters ?? builtInFrameworkAdapters;

  const languageResults = await Promise.all(
    languagePlugins.map(async (plugin) => ({
      plugin,
      graph: await plugin.scan({ root }),
    })),
  );

  const activeLanguagePlugins = languageResults
    .filter(({ graph }) => graph.nodes.length > 0 || graph.edges.length > 0)
    .map(({ plugin }) => plugin);

  let graph = mergeLanguageGraphs(project, languageResults.map(({ graph: result }) => result));
  graph.metadata = {
    ...(graph.metadata ?? {}),
    languagePluginCount: activeLanguagePlugins.length,
    languagePlugins: activeLanguagePlugins.map((plugin) => plugin.id).join(', '),
  };

  const activeLanguagePluginIds = activeLanguagePlugins.map((plugin) => plugin.id);
  const appliedFrameworkAdapters: string[] = [];

  for (const adapter of frameworkAdapters) {
    if (!adapter.languagePluginIds.some((id) => activeLanguagePluginIds.includes(id))) continue;

    const context = { root, graph, activeLanguagePluginIds };
    if (!(await adapter.detect(context))) continue;

    graph = mergeGraphContributions(graph, [await adapter.enrich({ ...context, graph })]);
    appliedFrameworkAdapters.push(adapter.id);
  }

  graph.metadata = {
    ...(graph.metadata ?? {}),
    frameworkAdapterCount: appliedFrameworkAdapters.length,
    frameworkAdapters: appliedFrameworkAdapters.join(', '),
  };

  return graph;
}
