import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { httpSecurityMetadata } from '../../security/http.js';
import { collectHttpCalls } from '../../scanner/semantics.js';
import type { ArchEdge, ArchNode } from '../../types.js';
import { ARCHMESH_PLUGIN_API_VERSION, type FrameworkAdapter, type GraphContribution } from '../types.js';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
const NEXT_CONFIG_FILES = [
  'next.config.js',
  'next.config.mjs',
  'next.config.cjs',
  'next.config.ts',
];

function toPosix(value: string) {
  return value.split(path.sep).join('/');
}

async function isFile(candidate: string) {
  try {
    return (await fs.stat(candidate)).isFile();
  } catch {
    return false;
  }
}

async function packageUsesNext(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const dependencyGroups = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    return dependencyGroups.some((group) => {
      const dependencies = pkg[group];
      return Boolean(dependencies && typeof dependencies === 'object' && 'next' in dependencies);
    });
  } catch {
    return false;
  }
}

async function hasNextConfig(root: string) {
  for (const file of NEXT_CONFIG_FILES) {
    if (await isFile(path.join(root, file))) return true;
  }
  return false;
}

function nextEntity(pathValue: string) {
  const normalized = toPosix(pathValue);
  const parts = normalized.split('/').filter(Boolean);
  const appIndex = parts.lastIndexOf('app');
  if (appIndex < 0 || appIndex >= parts.length - 1) return undefined;

  const filename = parts.at(-1) ?? '';
  const isPage = /^page\.[jt]sx?$/.test(filename);
  const isApiRoute = parts[appIndex + 1] === 'api' && /^route\.[jt]sx?$/.test(filename);
  if (!isPage && !isApiRoute) return undefined;

  const routeParts = parts.slice(appIndex + 1, -1).filter((segment) => {
    if (segment.startsWith('(') && segment.endsWith(')')) return false;
    if (segment.startsWith('@')) return false;
    return true;
  });
  const route = `/${routeParts.join('/')}`.replace(/\/+/g, '/');

  return {
    kind: isApiRoute ? 'api' as const : 'route' as const,
    routePath: route === '' ? '/' : route,
    routeType: isApiRoute ? 'api' : 'page',
  };
}

function scriptKindFor(file: string) {
  const extension = path.extname(file);
  if (extension === '.tsx') return ts.ScriptKind.TSX;
  if (extension === '.jsx') return ts.ScriptKind.JSX;
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
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

async function parseNode(root: string, node: ArchNode) {
  if (!node.path) return undefined;
  try {
    const absolute = path.join(root, node.path);
    const text = await fs.readFile(absolute, 'utf8');
    return ts.createSourceFile(
      absolute,
      text,
      ts.ScriptTarget.Latest,
      true,
      scriptKindFor(absolute),
    );
  } catch {
    return undefined;
  }
}

async function enrichNextJs(root: string, graph: Parameters<FrameworkAdapter['enrich']>[0]['graph']): Promise<GraphContribution> {
  const nodes: ArchNode[] = [];
  const edges: ArchEdge[] = [];
  const apiRouteByPath = new Map<string, string>();
  const parsedByNodeId = new Map<string, ts.SourceFile>();

  for (const node of graph.nodes) {
    if (!node.path) continue;
    const entity = nextEntity(node.path);
    const sourceFile = await parseNode(root, node);
    if (sourceFile) parsedByNodeId.set(node.id, sourceFile);

    const actions = sourceFile ? serverActionCount(sourceFile) : 0;
    const methods = sourceFile && entity?.kind === 'api' ? exportedHttpMethods(sourceFile) : [];
    if (!entity && actions === 0) continue;

    const enriched: ArchNode = {
      ...node,
      ...(entity ? { kind: entity.kind } : {}),
      metadata: {
        ...(node.metadata ?? {}),
        ...(entity
          ? {
              framework: 'nextjs',
              routePath: entity.routePath,
              routeType: entity.routeType,
            }
          : {}),
        ...(methods.length > 0 ? { httpMethods: methods.join(', ') } : {}),
        ...(actions > 0 ? { serverActionCount: actions } : {}),
      },
    };
    nodes.push(enriched);

    if (entity?.kind === 'api') apiRouteByPath.set(entity.routePath, node.id);
  }

  for (const node of graph.nodes) {
    const sourceFile = parsedByNodeId.get(node.id);
    if (!sourceFile) continue;

    for (const call of collectHttpCalls(sourceFile)) {
      if (!call.url.startsWith('/')) continue;
      const localPath = call.url.split('?')[0];
      const localApiId = apiRouteByPath.get(localPath);
      if (!localApiId) continue;

      edges.push({
        id: `edge:nextjs:${edges.length + 1}`,
        source: node.id,
        target: localApiId,
        relation: 'calls',
        health: 'healthy',
        label: `${call.method} ${localPath}`,
        metadata: httpSecurityMetadata(call),
      });
    }
  }

  return { nodes, edges };
}

export const nextJsAdapter: FrameworkAdapter = {
  apiVersion: ARCHMESH_PLUGIN_API_VERSION,
  id: 'nextjs',
  displayName: 'Next.js',
  languagePluginIds: ['javascript-typescript'],
  capabilities: ['routes', 'api-handlers', 'server-actions'],
  detect: async ({ root }) => (await packageUsesNext(root)) || hasNextConfig(root),
  enrich: ({ root, graph }) => enrichNextJs(root, graph),
};
