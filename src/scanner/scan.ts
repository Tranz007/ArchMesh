import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import type { ArchEdge, ArchGraphData, ArchNode, NodeKind } from '../types.js';
import { configuredFeatureForPath, loadArchMeshConfig } from './config.js';
import { collectFirestoreAccesses, collectHttpCalls } from './semantics.js';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo']);
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

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

function appRoutePath(relativePath: string, kind: NodeKind) {
  if (kind !== 'route' && kind !== 'api') return undefined;
  const parts = toPosix(relativePath).split('/').filter(Boolean);
  const appIndex = parts.indexOf('app');
  if (appIndex < 0) return undefined;

  const routeParts = parts.slice(appIndex + 1, -1).filter((segment) => {
    if (segment.startsWith('(') && segment.endsWith(')')) return false;
    if (segment.startsWith('@')) return false;
    return true;
  });

  const route = `/${routeParts.join('/')}`.replace(/\/+/g, '/');
  return route === '' ? '/' : route;
}

function isExported(node: ts.Node) {
  return ts.canHaveModifiers(node)
    && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function exportedHttpMethods(sourceFile: ts.SourceFile) {
  const methods = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement) && statement.name) {
      if (HTTP_METHODS.has(statement.name.text)) methods.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && HTTP_METHODS.has(declaration.name.text)) {
          methods.add(declaration.name.text);
        }
      }
    }
  }

  return [...methods].sort();
}

function hasDirective(statements: ts.NodeArray<ts.Statement>, directive: string) {
  return statements.some(
    (statement) => ts.isExpressionStatement(statement)
      && ts.isStringLiteral(statement.expression)
      && statement.expression.text === directive,
  );
}

function functionBlock(node: ts.Node): ts.Block | undefined {
  if (ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isConstructorDeclaration(node)) {
    return node.body && ts.isBlock(node.body) ? node.body : undefined;
  }
  return undefined;
}

function serverActionCount(sourceFile: ts.SourceFile) {
  let count = hasDirective(sourceFile.statements, 'use server') ? 1 : 0;

  const visit = (node: ts.Node) => {
    const body = functionBlock(node);
    if (body && hasDirective(body.statements, 'use server')) count += 1;
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return count;
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

function safeHttpHost(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.host;
  } catch {
    return undefined;
  }
}

function resourceId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
}

export async function scanProject(rootInput: string): Promise<ArchGraphData> {
  const root = path.resolve(rootInput);
  const projectName = path.basename(root);
  const compilerOptions = loadCompilerOptions(root);
  const archMeshConfig = await loadArchMeshConfig(root);
  const files: string[] = [];
  await walk(root, files);

  const nodes = new Map<string, ArchNode>();
  const edges: ArchEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (edge: Omit<ArchEdge, 'id'>) => {
    const key = `${edge.source}->${edge.target}:${edge.relation}:${edge.label ?? ''}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ ...edge, id: `edge:${edges.length + 1}` });
  };

  for (const absolute of files) {
    const relative = toPosix(path.relative(root, absolute));
    const id = nodeIdForFile(relative);
    const configuredFeature = configuredFeatureForPath(relative, archMeshConfig);
    const kind = classifyFile(relative);
    const routePath = appRoutePath(relative, kind);
    nodes.set(id, {
      id,
      label: path.basename(relative),
      kind,
      path: relative,
      health: 'healthy',
      metadata: {
        ...(configuredFeature
          ? {
              featureKey: configuredFeature.key,
              featureLabel: configuredFeature.label ?? null,
              featureSource: 'config',
            }
          : {}),
        ...(routePath
          ? {
              framework: 'nextjs',
              routePath,
              routeType: kind === 'api' ? 'api' : 'page',
            }
          : {}),
      },
    });
  }

  const apiRouteByPath = new Map<string, string>();
  for (const node of nodes.values()) {
    if (node.kind !== 'api') continue;
    const routePath = node.metadata?.routePath;
    if (typeof routePath === 'string') apiRouteByPath.set(routePath, node.id);
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
    const node = nodes.get(sourceId);
    const imports = collectImports(sourceFile);

    if (node) {
      const methods = node.kind === 'api' ? exportedHttpMethods(sourceFile) : [];
      const actions = serverActionCount(sourceFile);
      if (methods.length > 0 || actions > 0) {
        node.metadata = {
          ...(node.metadata ?? {}),
          ...(methods.length > 0 ? { httpMethods: methods.join(', ') } : {}),
          ...(actions > 0 ? { serverActionCount: actions } : {}),
        };
      }
    }

    for (const specifier of imports) {
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
      addEdge({ source: sourceId, target: targetId, relation, health: 'healthy' });
    }

    for (const call of collectHttpCalls(sourceFile)) {
      const localPath = call.url.startsWith('/') ? call.url.split('?')[0] : undefined;
      const localApiId = localPath ? apiRouteByPath.get(localPath) : undefined;

      if (localApiId) {
        addEdge({
          source: sourceId,
          target: localApiId,
          relation: 'calls',
          health: 'healthy',
          label: `${call.method} ${localPath}`,
        });
        continue;
      }

      const host = safeHttpHost(call.url);
      if (!host) continue;
      const integrationId = `integration:http:${resourceId(host)}`;
      if (!nodes.has(integrationId)) {
        nodes.set(integrationId, {
          id: integrationId,
          label: host,
          kind: 'integration',
          health: 'healthy',
          metadata: { provider: 'HTTP', host },
        });
      }
      addEdge({
        source: sourceId,
        target: integrationId,
        relation: 'calls',
        health: 'healthy',
        label: `${call.method} ${call.url}`,
      });
    }

    const usesFirestore = imports.some((specifier) =>
      /^(firebase|firebase-admin)(\/.*firestore|\/firestore|$)/.test(specifier),
    );

    if (usesFirestore) {
      for (const access of collectFirestoreAccesses(sourceFile)) {
        const dataId = `data:firestore:${resourceId(access.collection)}`;
        if (!nodes.has(dataId)) {
          nodes.set(dataId, {
            id: dataId,
            label: access.collection,
            kind: 'data',
            health: 'healthy',
            metadata: {
              provider: 'Firebase',
              resourceType: 'Firestore collection',
              collection: access.collection,
            },
          });
        }
        addEdge({
          source: sourceId,
          target: dataId,
          relation: access.relation,
          health: 'healthy',
          label: `Firestore ${access.operation}`,
        });
      }
    }
  }

  return {
    project: projectName,
    generatedAt: new Date().toISOString(),
    nodes: [...nodes.values()],
    edges,
  };
}
