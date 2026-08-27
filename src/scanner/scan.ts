import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import type { ArchEdge, ArchGraphData, ArchNode, NodeKind } from '../types.js';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo']);

const integrationMatchers: Array<[RegExp, string]> = [
  [/^(firebase|firebase-admin)(\/|$)/, 'Firebase'],
  [/^stripe(\/|$)/, 'Stripe'],
  [/^(openai|@ai-sdk\/openai)(\/|$)/, 'OpenAI'],
  [/^(@workos-inc\/|workos)(.*)/, 'WorkOS'],
  [/^resend(\/|$)/, 'Resend'],
  [/^(@vercel\/|vercel)(.*)/, 'Vercel'],
];

function toPosix(value: string) {
  return value.split(path.sep).join('/');
}

function classifyFile(relativePath: string): NodeKind {
  const normalized = toPosix(relativePath);
  if (/\/app\/api\/.+\/route\.[jt]sx?$/.test(`/${normalized}`) || /(^|\/)api\/.+\.[jt]sx?$/.test(normalized)) return 'api';
  if (/\/app\/.+\/page\.[jt]sx?$/.test(`/${normalized}`) || /(^|\/)app\/page\.[jt]sx?$/.test(normalized)) return 'route';
  if (/components?\//i.test(normalized) || /[A-Z][A-Za-z0-9_-]*\.[jt]sx$/.test(path.basename(normalized))) return 'component';
  if (/(service|client|repository|store|provider|adapter)s?\//i.test(normalized) || /(service|client|repository|adapter)\.[jt]s$/i.test(normalized)) return 'service';
  if (/(schema|model|types?)\//i.test(normalized)) return 'data';
  return 'file';
}

async function walk(dir: string, files: string[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    if (IGNORED_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.includes(path.extname(entry.name))) continue;
    files.push(absolute);
  }
}

async function fileExists(candidate: string) {
  try {
    return (await fs.stat(candidate)).isFile();
  } catch {
    return false;
  }
}

async function resolveRelativeImport(fromFile: string, specifier: string, root: string) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(base, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    if (!(await fileExists(candidate))) continue;
    const relative = path.relative(root, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
    return toPosix(relative);
  }
  return undefined;
}

function loadCompilerOptions(root: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json')
    ?? ts.findConfigFile(root, ts.sys.fileExists, 'jsconfig.json');

  if (!configPath) {
    return {
      allowJs: true,
      jsx: ts.JsxEmit.Preserve,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
    };
  }

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) return {};
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  return parsed.options;
}

function resolveConfiguredImport(
  fromFile: string,
  specifier: string,
  root: string,
  compilerOptions: ts.CompilerOptions,
) {
  const resolution = ts.resolveModuleName(specifier, fromFile, compilerOptions, ts.sys).resolvedModule;
  if (!resolution) return undefined;

  const resolved = path.resolve(resolution.resolvedFileName);
  if (resolved.includes(`${path.sep}node_modules${path.sep}`)) return undefined;
  if (/\.d\.[cm]?ts$/.test(resolved)) return undefined;

  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
  if (!SOURCE_EXTENSIONS.includes(path.extname(resolved))) return undefined;
  return toPosix(relative);
}

function integrationFor(specifier: string) {
  return integrationMatchers.find(([matcher]) => matcher.test(specifier))?.[1];
}

function nodeIdForFile(relativePath: string) {
  return `file:${toPosix(relativePath)}`;
}

function collectImports(sourceFile: ts.SourceFile) {
  const imports: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) imports.push(moduleSpecifier.text);
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteral(argument)) imports.push(argument.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [...new Set(imports)];
}

function scriptKindFor(file: string) {
  const extension = path.extname(file);
  if (extension === '.tsx') return ts.ScriptKind.TSX;
  if (extension === '.jsx') return ts.ScriptKind.JSX;
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

export async function scanProject(rootInput: string): Promise<ArchGraphData> {
  const root = path.resolve(rootInput);
  const projectName = path.basename(root);
  const compilerOptions = loadCompilerOptions(root);
  const files: string[] = [];
  await walk(root, files);

  const nodes = new Map<string, ArchNode>();
  const edges: ArchEdge[] = [];
  const edgeKeys = new Set<string>();

  for (const absolute of files) {
    const relative = toPosix(path.relative(root, absolute));
    const id = nodeIdForFile(relative);
    nodes.set(id, {
      id,
      label: path.basename(relative),
      kind: classifyFile(relative),
      path: relative,
      health: 'healthy',
    });
  }

  for (const absolute of files) {
    const relative = toPosix(path.relative(root, absolute));
    const sourceId = nodeIdForFile(relative);
    const text = await fs.readFile(absolute, 'utf8');
    const sourceFile = ts.createSourceFile(
      absolute,
      text,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(absolute),
    );

    for (const specifier of collectImports(sourceFile)) {
      let targetId: string | undefined;
      const targetPath = specifier.startsWith('.')
        ? await resolveRelativeImport(absolute, specifier, root)
        : resolveConfiguredImport(absolute, specifier, root, compilerOptions);

      if (targetPath) {
        targetId = nodeIdForFile(targetPath);
      } else {
        const integration = integrationFor(specifier);
        if (integration) {
          targetId = `integration:${integration.toLowerCase()}`;
          if (!nodes.has(targetId)) {
            nodes.set(targetId, {
              id: targetId,
              label: integration,
              kind: 'integration',
              health: 'healthy',
              metadata: { package: specifier },
            });
          }
        }
      }

      if (!targetId || !nodes.has(targetId)) continue;
      const relation = targetId.startsWith('integration:') ? 'integrates-with' : 'imports';
      const key = `${sourceId}->${targetId}:${relation}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({
        id: `edge:${edges.length + 1}`,
        source: sourceId,
        target: targetId,
        relation,
        health: 'healthy',
      });
    }
  }

  return {
    project: projectName,
    generatedAt: new Date().toISOString(),
    nodes: [...nodes.values()],
    edges,
  };
}
