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
  ],
  scan: ({ root }) => scanJavaScriptTypeScriptProject(root),
};
