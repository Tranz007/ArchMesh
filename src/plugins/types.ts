import type { ArchEdge, ArchGraphData, ArchNode, GraphMetadata } from '../types.js';

export const ARCHMESH_PLUGIN_API_VERSION = 1 as const;

export type ArchMeshPluginApiVersion = typeof ARCHMESH_PLUGIN_API_VERSION;

export type PluginCapability =
  | 'source-files'
  | 'imports'
  | 'module-resolution'
  | 'components'
  | 'services'
  | 'routes'
  | 'api-handlers'
  | 'http-calls'
  | 'data-resources'
  | 'integrations'
  | 'security-evidence'
  | 'server-actions';

export interface LanguagePluginContext {
  root: string;
}

export interface LanguagePlugin {
  /** Contract version understood by the ArchMesh host. */
  apiVersion: ArchMeshPluginApiVersion;
  /** Stable machine-readable identifier, e.g. `javascript-typescript`. */
  id: string;
  displayName: string;
  /** Human-readable language names covered by this parser. */
  languages: string[];
  /** Source extensions the plugin is expected to understand. */
  extensions: string[];
  /** Evidence capabilities currently produced by this parser. */
  capabilities: PluginCapability[];
  /**
   * Produce a graph fragment from the project root. A plugin should return an
   * empty graph when the project contains none of its supported source files.
   */
  scan(context: LanguagePluginContext): Promise<ArchGraphData>;
}

export interface GraphContribution {
  nodes?: ArchNode[];
  edges?: ArchEdge[];
  metadata?: GraphMetadata;
}

export interface FrameworkAdapterContext {
  root: string;
  graph: ArchGraphData;
  activeLanguagePluginIds: string[];
}

export interface FrameworkAdapter {
  apiVersion: ArchMeshPluginApiVersion;
  id: string;
  displayName: string;
  /** Language plugins this adapter can enrich. */
  languagePluginIds: string[];
  /** Additional semantic capabilities supplied by this adapter. */
  capabilities: PluginCapability[];
  /** Return true only when repository evidence supports applying the adapter. */
  detect(context: FrameworkAdapterContext): boolean | Promise<boolean>;
  /**
   * Add framework/platform semantics without replacing the underlying source
   * graph. Contributions are merged by stable node/edge identity.
   */
  enrich(context: FrameworkAdapterContext): GraphContribution | Promise<GraphContribution>;
}
