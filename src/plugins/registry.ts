import { javascriptTypeScriptPlugin } from './languages/javascript-typescript.js';
import type { FrameworkAdapter, LanguagePlugin } from './types.js';

/**
 * First-party plugins compiled into ArchMesh. External plugin loading is kept
 * separate so no third-party code is executed implicitly during a scan.
 */
export const builtInLanguagePlugins: LanguagePlugin[] = [javascriptTypeScriptPlugin];

/** Framework adapters will migrate here as framework semantics are extracted. */
export const builtInFrameworkAdapters: FrameworkAdapter[] = [];
