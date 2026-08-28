import { fastApiAdapter } from './frameworks/fastapi.js';
import { nextJsAdapter } from './frameworks/nextjs.js';
import { javascriptTypeScriptPlugin } from './languages/javascript-typescript.js';
import { pythonPlugin } from './languages/python.js';
import type { FrameworkAdapter, LanguagePlugin } from './types.js';

/**
 * First-party plugins compiled into ArchMesh. External plugin loading is kept
 * separate so no third-party code is executed implicitly during a scan.
 */
export const builtInLanguagePlugins: LanguagePlugin[] = [
  javascriptTypeScriptPlugin,
  pythonPlugin,
];

export const builtInFrameworkAdapters: FrameworkAdapter[] = [
  nextJsAdapter,
  fastApiAdapter,
];
