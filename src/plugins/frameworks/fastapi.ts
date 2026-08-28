import fs from 'node:fs/promises';
import path from 'node:path';
import type { SyntaxNode } from '@lezer/common';
import { parser as pythonParser } from '@lezer/python';
import type { ArchEdge, ArchNode } from '../../types.js';
import { ARCHMESH_PLUGIN_API_VERSION, type FrameworkAdapter } from '../types.js';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
const FASTAPI_CONFIG_FILES = ['pyproject.toml', 'requirements.txt', 'requirements-dev.txt', 'Pipfile', 'poetry.lock'];

interface RouteEvidence {
  routerName: string;
  routePath: string;
  methods: string[];
  handlerName: string;
  dependencyCount: number;
}

function toPosix(value: string) {
  return value.split(path.sep).join('/');
}

function stablePart(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._/-]+/g, '-').replace(/^[-/]+|[-/]+$/g, '');
  return normalized || 'root';
}

async function readIfExists(file: string) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return undefined;
  }
}

function staticString(value: string) {
  const trimmed = value.trim();
  const match = /^(?:[rRuUbB]{0,2})(["'])(.*?)\1/.exec(trimmed);
  return match?.[2];
}

function normalizeRoutePath(prefix: string, routePath: string) {
  const combined = `${prefix || ''}/${routePath || ''}`.replace(/\/+/g, '/');
  if (combined === '/') return '/';
  return combined.startsWith('/') ? combined.replace(/\/$/, '') : `/${combined.replace(/\/$/, '')}`;
}

function firstChildNamed(node: SyntaxNode, name: string) {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name === name) return child;
  }
  return undefined;
}

function collectNodes(node: SyntaxNode, name: string, result: SyntaxNode[]) {
  if (node.name === name) result.push(node);
  for (let child = node.firstChild; child; child = child.nextSibling) {
    collectNodes(child, name, result);
  }
}

function functionName(node: SyntaxNode, text: string) {
  const nameNode = firstChildNamed(node, 'VariableName');
  return nameNode ? text.slice(nameNode.from, nameNode.to) : 'handler';
}

function routerBindings(tree: SyntaxNode, text: string) {
  const assignments: SyntaxNode[] = [];
  collectNodes(tree, 'AssignStatement', assignments);
  const bindings = new Map<string, string>();

  for (const assignment of assignments) {
    const source = text.slice(assignment.from, assignment.to);
    const match = /^\s*([A-Za-z_]\w*)\s*=\s*(FastAPI|APIRouter)\s*\(([\s\S]*)\)\s*$/.exec(source);
    if (!match) continue;
    const [, variable, constructor, args] = match;
    let prefix = '';
    if (constructor === 'APIRouter') {
      const prefixMatch = /\bprefix\s*=\s*((?:[rRuUbB]{0,2})["'][^"']*["'])/.exec(args);
      prefix = prefixMatch ? staticString(prefixMatch[1]) ?? '' : '';
    }
    bindings.set(variable, prefix);
  }

  return bindings;
}

function routeDecorator(source: string, bindings: Map<string, string>) {
  const match = /^\s*@\s*([A-Za-z_]\w*)\.([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)\s*$/.exec(source);
  if (!match) return undefined;
  const [, routerName, rawMethod, args] = match;
  if (!bindings.has(routerName)) return undefined;

  const methodName = rawMethod.toLowerCase();
  const pathMatch = /^\s*((?:[rRuUbB]{0,2})["'][^"']*["'])/.exec(args)
    ?? /\bpath\s*=\s*((?:[rRuUbB]{0,2})["'][^"']*["'])/.exec(args);
  const rawPath = pathMatch ? staticString(pathMatch[1]) : undefined;
  if (rawPath === undefined) return undefined;
  const routePath = normalizeRoutePath(bindings.get(routerName) ?? '', rawPath);

  if (methodName === 'api_route') {
    const methodsMatch = /\bmethods\s*=\s*[\[(]([^\])]+)[\])]/.exec(args);
    if (!methodsMatch) return undefined;
    const methods = [...methodsMatch[1].matchAll(/["']([A-Za-z]+)["']/g)]
      .map((item) => item[1].toUpperCase())
      .filter((method) => HTTP_METHODS.has(method));
    return methods.length > 0 ? { routerName, routePath, methods } : undefined;
  }

  const method = methodName.toUpperCase();
  if (!HTTP_METHODS.has(method)) return undefined;
  return { routerName, routePath, methods: [method] };
}

function collectRouteEvidence(text: string) {
  const tree = pythonParser.parse(text).topNode;
  const bindings = routerBindings(tree, text);
  if (bindings.size === 0) return [];

  const decoratedStatements: SyntaxNode[] = [];
  collectNodes(tree, 'DecoratedStatement', decoratedStatements);
  const routes: RouteEvidence[] = [];

  for (const decorated of decoratedStatements) {
    const handler = firstChildNamed(decorated, 'FunctionDefinition');
    if (!handler) continue;
    const handlerName = functionName(handler, text);
    const handlerSource = text.slice(handler.from, handler.to);
    const dependencyCount = (handlerSource.match(/\bDepends\s*\(/g) ?? []).length;

    for (let child = decorated.firstChild; child; child = child.nextSibling) {
      if (child.name !== 'Decorator') continue;
      const parsed = routeDecorator(text.slice(child.from, child.to), bindings);
      if (!parsed) continue;
      routes.push({ ...parsed, handlerName, dependencyCount });
    }
  }

  return routes;
}

async function hasFastApiConfig(root: string) {
  for (const relative of FASTAPI_CONFIG_FILES) {
    const content = await readIfExists(path.join(root, relative));
    if (content && /\bfastapi\b/i.test(content)) return true;
  }
  return false;
}

async function hasFastApiSource(root: string, nodes: ArchNode[]) {
  for (const node of nodes) {
    if (node.metadata?.language !== 'python' || !node.path) continue;
    const text = await readIfExists(path.join(root, node.path));
    if (text && /(?:^|\n)\s*(?:from\s+fastapi(?:\.|\s)|import\s+fastapi\b)/m.test(text)) return true;
  }
  return false;
}

export const fastApiAdapter: FrameworkAdapter = {
  apiVersion: ARCHMESH_PLUGIN_API_VERSION,
  id: 'fastapi',
  displayName: 'FastAPI',
  languagePluginIds: ['python'],
  capabilities: ['routes', 'api-handlers', 'dependency-injection'],

  async detect({ root, graph }) {
    return (await hasFastApiConfig(root)) || hasFastApiSource(root, graph.nodes);
  },

  async enrich({ root, graph }) {
    const nodes: ArchNode[] = [];
    const edges: ArchEdge[] = [];
    const seenNodes = new Set<string>();
    const seenEdges = new Set<string>();

    for (const sourceNode of graph.nodes) {
      if (sourceNode.metadata?.language !== 'python' || !sourceNode.path) continue;
      const text = await readIfExists(path.join(root, sourceNode.path));
      if (!text) continue;

      for (const route of collectRouteEvidence(text)) {
        for (const method of route.methods) {
          const id = `api:fastapi:${stablePart(toPosix(sourceNode.path))}:${stablePart(route.handlerName)}:${method.toLowerCase()}:${stablePart(route.routePath)}`;
          if (!seenNodes.has(id)) {
            seenNodes.add(id);
            nodes.push({
              id,
              label: `${method} ${route.routePath}`,
              kind: 'api',
              path: sourceNode.path,
              health: 'healthy',
              metadata: {
                framework: 'fastapi',
                routePath: route.routePath,
                routeType: 'api',
                httpMethods: method,
                handlerName: route.handlerName,
                routerName: route.routerName,
                sourceNodeId: sourceNode.id,
                ...(route.dependencyCount > 0 ? { dependencyCount: route.dependencyCount } : {}),
              },
            });
          }

          const edgeKey = `${sourceNode.id}->${id}:contains`;
          if (!seenEdges.has(edgeKey)) {
            seenEdges.add(edgeKey);
            edges.push({
              id: `edge:fastapi:${edges.length + 1}`,
              source: sourceNode.id,
              target: id,
              relation: 'contains',
              health: 'healthy',
              label: 'FastAPI handler',
            });
          }
        }
      }
    }

    return {
      nodes,
      edges,
      metadata: {
        fastApiRouteCount: nodes.length,
      },
    };
  },
};
