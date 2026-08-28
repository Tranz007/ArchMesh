import { scanProject as scanJavaScriptTypeScriptProject } from '../../scanner/scan.js';
import { ARCHMESH_PLUGIN_API_VERSION, type LanguagePlugin } from '../types.js';

export const javascriptTypeScriptPlugin: LanguagePlugin = {
  apiVersion: ARCHMESH_PLUGIN_API_VERSION,
  id: 'javascript-typescript',
  displayName: 'JavaScript / TypeScript',
  languages: ['JavaScript', 'TypeScript'],
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  capabilities: [
    'source-files',
    'imports',
    'module-resolution',
    'components',
    'services',
    'http-calls',
    'data-resources',
    'integrations',
    'security-evidence',
    // Next.js-specific route/API/server-action semantics still live in the
    // legacy scanner today and will migrate into a framework adapter next.
    'routes',
    'api-handlers',
    'server-actions',
  ],
  scan: ({ root }) => scanJavaScriptTypeScriptProject(root),
};
