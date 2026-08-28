import { nextJsAdapter } from './frameworks/nextjs.js';
import { javascriptTypeScriptPlugin } from './languages/javascript-typescript.js';
import type { FrameworkAdapter, LanguagePlugin } from './types.js';

/**
 * First-party plugins compiled into ArchMesh. External plugin loading is kept
 * separate so no third-party code is executed implicitly during a scan.
 */
export const builtInLanguagePlugins: LanguagePlugin[] = [javascriptTypeScriptPlugin];

export const builtInFrameworkAdapters: FrameworkAdapter[] = [nextJsAdapter];
