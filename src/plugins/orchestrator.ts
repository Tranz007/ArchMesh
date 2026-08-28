import path from 'node:path';
import { linkStaticHttpEndpoints } from '../linkers/http-endpoints.js';
import { applySystemBoundaries } from '../system/boundaries.js';
import { mergeGraphContributions, mergeLanguageGraphs } from './merge.js';
import { builtInFrameworkAdapters, builtInLanguagePlugins } from './registry.js';
import {
  ARCHMESH_PLUGIN_API_VERSION,
  type FrameworkAdapter,
  type LanguagePlugin,
  type PluginCapability,
} from './types.js';

export interface ScanPluginOptions {
  languagePlugins?: LanguagePlugin[];
  frameworkAdapters?: FrameworkAdapter[];
}

function assertApiVersion(plugin: { apiVersion: number; id: string }, kind: string) {
  if (plugin.apiVersion !== ARCHMESH_PLUGIN_API_VERSION) {
    throw new Error(
      `${kind} plugin "${plugin.id}" targets ArchMesh plugin API v${plugin.apiVersion}; `
      + `this host supports v${ARCHMESH_PLUGIN_API_VERSION}.`,
    );
  }
}

function capabilitiesOf(items: Array<{ capabilities: PluginCapability[] }>) {
  return [...new Set(items.flatMap((item) => item.capabilities))].sort();
}

export async function scanProjectWithPlugins(
  rootInput: string,
  options: ScanPluginOptions = {},
) {
  const root = path.resolve(rootInput);
  const project = path.basename(root);
  const languagePlugins = options.languagePlugins ?? builtInLanguagePlugins;
  const frameworkAdapters = options.frameworkAdapters ?? builtInFrameworkAdapters;

  for (const plugin of languagePlugins) assertApiVersion(plugin, 'Language');
  for (const adapter of frameworkAdapters) assertApiVersion(adapter, 'Framework adapter');

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
    languageCapabilities: capabilitiesOf(activeLanguagePlugins).join(', '),
  };

  const activeLanguagePluginIds = activeLanguagePlugins.map((plugin) => plugin.id);
  const appliedFrameworkAdapters: FrameworkAdapter[] = [];

  for (const adapter of frameworkAdapters) {
    if (!adapter.languagePluginIds.some((id) => activeLanguagePluginIds.includes(id))) continue;

    const context = { root, graph, activeLanguagePluginIds };
    if (!(await adapter.detect(context))) continue;

    graph = mergeGraphContributions(graph, [await adapter.enrich({ ...context, graph })]);
    appliedFrameworkAdapters.push(adapter);
  }

  graph.metadata = {
    ...(graph.metadata ?? {}),
    frameworkAdapterCount: appliedFrameworkAdapters.length,
    frameworkAdapters: appliedFrameworkAdapters.map((adapter) => adapter.id).join(', '),
    frameworkCapabilities: capabilitiesOf(appliedFrameworkAdapters).join(', '),
  };

  // Boundaries are applied before graph linkers so link evidence can say
  // whether a statically matched request crosses an app/service boundary.
  graph = await applySystemBoundaries(root, graph);

  // Linkers run after all language/framework semantics exist. They may connect
  // evidence produced by different plugins, but they never fabricate a target
  // when method/path matching is ambiguous.
  graph = mergeGraphContributions(graph, [await linkStaticHttpEndpoints(root, graph)]);

  return graph;
}
