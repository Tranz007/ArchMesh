import fs from 'node:fs/promises';
import path from 'node:path';
import type { SyntaxNode } from '@lezer/common';
import { parser as pythonParser } from '@lezer/python';
import type { ArchEdge, ArchGraphData, ArchNode, NodeKind } from '../../types.js';
import { ARCHMESH_PLUGIN_API_VERSION, type LanguagePlugin } from '../types.js';

const IGNORED_DIRS = new Set([
  '.git',
  '.venv',
  'venv',
  'env',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  '.tox',
  '.nox',
  'dist',
  'build',
  'site-packages',
]);

const integrationMatchers: Array<[RegExp, string]> = [
  [/^stripe(?:\.|$)/, 'Stripe'],
  [/^openai(?:\.|$)/, 'OpenAI'],
  [/^firebase_admin(?:\.|$)/, 'Firebase'],
  [/^resend(?:\.|$)/, 'Resend'],
  [/^workos(?:\.|$)/, 'WorkOS'],
  [/^(?:boto3|botocore)(?:\.|$)/, 'AWS'],
];

interface PythonFileEvidence {
  imports: string[];
  functionCount: number;
  classCount: number;
}

function toPosix(value: string) {
  return value.split(path.sep).join('/');
}

function fileId(relativePath: string) {
  return `file:${toPosix(relativePath)}`;
}

function classifyPythonFile(relativePath: string): NodeKind {
  const normalized = toPosix(relativePath).toLowerCase();
  const basename = path.posix.basename(normalized);

  if (basename === '__init__.py') return 'module';
  if (/(^|\/)(models?|schemas?|entities|domain)(\/|$)/.test(normalized)
    || /(^|[_-])(model|schema|entity)\.py$/.test(basename)
    || /^(models?|schemas?)\.py$/.test(basename)) return 'data';
  if (/(^|\/)(services?|repositories|clients?|providers?|adapters?)(\/|$)/.test(normalized)
    || /(^|[_-])(service|repository|client|provider|adapter)\.py$/.test(basename)
    || /^(service|repository|client|provider|adapter)s?\.py$/.test(basename)) return 'service';

  return 'file';
}

async function walkPython(dir: string, files: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkPython(absolute, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.py')) files.push(absolute);
  }
}

function visit(node: SyntaxNode, text: string, evidence: PythonFileEvidence) {
  if (node.name === 'ImportStatement') evidence.imports.push(text.slice(node.from, node.to).trim());
  if (node.name === 'FunctionDefinition') evidence.functionCount += 1;
  if (node.name === 'ClassDefinition') evidence.classCount += 1;

  for (let child = node.firstChild; child; child = child.nextSibling) {
    visit(child, text, evidence);
  }
}

function parsePythonEvidence(text: string): PythonFileEvidence {
  const evidence: PythonFileEvidence = { imports: [], functionCount: 0, classCount: 0 };
  visit(pythonParser.parse(text).topNode, text, evidence);
  return evidence;
}

function stripAlias(value: string) {
  return value.trim().split(/\s+as\s+/i, 1)[0]?.trim() ?? '';
}

function importedModules(statement: string) {
  const compact = statement.replace(/\s+/g, ' ').trim();
  if (compact.startsWith('import ')) {
    return compact
      .slice('import '.length)
      .split(',')
      .map(stripAlias)
      .filter(Boolean)
      .map((module) => ({ module, importedNames: [] as string[] }));
  }

  const match = /^from\s+([.A-Za-z_][.A-Za-z0-9_]*)\s+import\s+(.+)$/.exec(compact);
  if (!match) return [];
  const importedNames = match[2]
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map(stripAlias)
    .filter((name) => name && name !== '*');

  return [{ module: match[1], importedNames }];
}

function moduleNamesForPath(relativePath: string) {
  const normalized = toPosix(relativePath);
  const withoutExtension = normalized.replace(/\.py$/, '');
  const parts = withoutExtension.split('/').filter(Boolean);
  const variants: string[][] = [parts];
  if (parts[0] === 'src' && parts.length > 1) variants.push(parts.slice(1));

  const names = new Set<string>();
  for (const variant of variants) {
    const moduleParts = variant.at(-1) === '__init__' ? variant.slice(0, -1) : variant;
    if (moduleParts.length > 0) names.add(moduleParts.join('.'));
  }
  return [...names];
}

function packagePartsForPath(relativePath: string) {
  const normalized = toPosix(relativePath).replace(/\.py$/, '');
  let parts = normalized.split('/').filter(Boolean);
  if (parts[0] === 'src' && parts.length > 1) parts = parts.slice(1);
  if (parts.at(-1) === '__init__') return parts.slice(0, -1);
  return parts.slice(0, -1);
}

function resolveRelativeModule(rawModule: string, relativePath: string) {
  if (!rawModule.startsWith('.')) return rawModule;
  const leadingDots = rawModule.match(/^\.+/)?.[0].length ?? 0;
  const suffix = rawModule.slice(leadingDots);
  const packageParts = packagePartsForPath(relativePath);
  const up = Math.max(0, leadingDots - 1);
  const base = packageParts.slice(0, Math.max(0, packageParts.length - up));
  if (suffix) base.push(...suffix.split('.').filter(Boolean));
  return base.join('.');
}

function localTargetsForImport(
  statement: string,
  relativePath: string,
  moduleToFileId: Map<string, string>,
) {
  const targets = new Set<string>();

  for (const entry of importedModules(statement)) {
    const module = resolveRelativeModule(entry.module, relativePath);
    const baseTarget = moduleToFileId.get(module);
    if (baseTarget) targets.add(baseTarget);

    for (const name of entry.importedNames) {
      const childModule = [module, name].filter(Boolean).join('.');
      const childTarget = moduleToFileId.get(childModule);
      if (childTarget) targets.add(childTarget);
    }
  }

  return [...targets];
}

function integrationForImport(statement: string) {
  const modules = importedModules(statement).map((entry) => entry.module.replace(/^\.+/, ''));
  for (const module of modules) {
    const integration = integrationMatchers.find(([matcher]) => matcher.test(module))?.[1];
    if (integration) return integration;
  }
  return undefined;
}

export async function scanPythonProject(rootInput: string): Promise<ArchGraphData> {
  const root = path.resolve(rootInput);
  const project = path.basename(root);
  const files: string[] = [];
  await walkPython(root, files);
  files.sort((a, b) => a.localeCompare(b));

  const nodes = new Map<string, ArchNode>();
  const moduleToFileId = new Map<string, string>();
  const evidenceByFile = new Map<string, PythonFileEvidence>();

  for (const absolute of files) {
    const relative = toPosix(path.relative(root, absolute));
    const id = fileId(relative);
    const text = await fs.readFile(absolute, 'utf8');
    const evidence = parsePythonEvidence(text);
    evidenceByFile.set(relative, evidence);

    nodes.set(id, {
      id,
      label: path.basename(relative),
      kind: classifyPythonFile(relative),
      path: relative,
      health: 'healthy',
      metadata: {
        language: 'python',
        ...(evidence.classCount > 0 ? { classCount: evidence.classCount } : {}),
        ...(evidence.functionCount > 0 ? { functionCount: evidence.functionCount } : {}),
      },
    });

    for (const moduleName of moduleNamesForPath(relative)) {
      if (!moduleToFileId.has(moduleName)) moduleToFileId.set(moduleName, id);
    }
  }

  const edges: ArchEdge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (edge: Omit<ArchEdge, 'id'>) => {
    const key = `${edge.source}->${edge.target}:${edge.relation}:${edge.label ?? ''}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ ...edge, id: `edge:python:${edges.length + 1}` });
  };

  for (const [relative, evidence] of evidenceByFile) {
    const source = fileId(relative);
    for (const statement of evidence.imports) {
      const localTargets = localTargetsForImport(statement, relative, moduleToFileId);
      for (const target of localTargets) {
        if (target !== source) addEdge({ source, target, relation: 'imports', health: 'healthy' });
      }

      if (localTargets.length > 0) continue;
      const integration = integrationForImport(statement);
      if (!integration) continue;
      const target = `integration:${integration.toLowerCase().replace(/\s+/g, '-')}`;
      if (!nodes.has(target)) {
        nodes.set(target, {
          id: target,
          label: integration,
          kind: 'integration',
          health: 'healthy',
          metadata: { language: 'python', evidence: 'import' },
        });
      }
      addEdge({ source, target, relation: 'integrates-with', health: 'healthy' });
    }
  }

  return {
    project,
    generatedAt: new Date().toISOString(),
    nodes: [...nodes.values()],
    edges,
  };
}

export const pythonPlugin: LanguagePlugin = {
  apiVersion: ARCHMESH_PLUGIN_API_VERSION,
  id: 'python',
  displayName: 'Python',
  languages: ['Python'],
  extensions: ['.py'],
  capabilities: [
    'source-files',
    'imports',
    'module-resolution',
    'services',
    'data-resources',
    'integrations',
  ],
  scan: ({ root }) => scanPythonProject(root),
};
