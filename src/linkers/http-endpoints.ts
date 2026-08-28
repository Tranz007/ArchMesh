import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { collectHttpCalls, type HttpCall } from '../scanner/semantics.js';
import { httpSecurityMetadata } from '../security/http.js';
import type { ArchEdge, ArchGraphData, ArchNode } from '../types.js';
import type { GraphContribution } from '../plugins/types.js';

const JAVASCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

interface EndpointCandidate {
  node: ArchNode;
  method: string;
  routePath: string;
}

function scriptKindFor(file: string) {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.tsx') return ts.ScriptKind.TSX;
  if (extension === '.jsx') return ts.ScriptKind.JSX;
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function metadataString(node: ArchNode, key: string) {
  const value = node.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizePath(value: string) {
  const withoutQuery = value.split(/[?#]/)[0] ?? value;
  if (!withoutQuery.startsWith('/')) return undefined;
  const compact = withoutQuery.replace(/\/+/g, '/');
  return compact.length > 1 ? compact.replace(/\/$/, '') : '/';
}

function endpointMethods(node: ArchNode) {
  const raw = metadataString(node, 'httpMethods');
  if (!raw) return [];
  return raw.split(',').map((method) => method.trim().toUpperCase()).filter(Boolean);
}

function endpointCandidates(graph: ArchGraphData) {
  const candidates: EndpointCandidate[] = [];
  for (const node of graph.nodes) {
    if (node.kind !== 'api') continue;
    const routePath = metadataString(node, 'routePath');
    const normalized = routePath ? normalizePath(routePath) : undefined;
    if (!normalized) continue;
    for (const method of endpointMethods(node)) candidates.push({ node, method, routePath: normalized });
  }
  return candidates;
}

function routePatternMatches(pattern: string, requestPath: string) {
  if (pattern === requestPath) return true;
  const patternParts = pattern.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  if (patternParts.length !== requestParts.length) return false;

  return patternParts.every((part, index) => {
    if (/^\{[^{}]+\}$/.test(part)) return Boolean(requestParts[index]);
    return part === requestParts[index];
  });
}

function uniqueEndpointForCall(call: HttpCall, candidates: EndpointCandidate[]) {
  const requestPath = normalizePath(call.url);
  if (!requestPath) return undefined;
  const method = call.method.toUpperCase();
  const methodCandidates = candidates.filter((candidate) => candidate.method === method);

  const exact = methodCandidates.filter((candidate) => candidate.routePath === requestPath);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;

  const patterned = methodCandidates.filter((candidate) => routePatternMatches(candidate.routePath, requestPath));
  return patterned.length === 1 ? patterned[0] : undefined;
}

function isJavaScriptSourceNode(node: ArchNode) {
  return Boolean(node.path && node.id.startsWith('file:') && JAVASCRIPT_EXTENSIONS.has(path.extname(node.path).toLowerCase()));
}

async function sourceFile(root: string, node: ArchNode) {
  if (!node.path) return undefined;
  try {
    const absolute = path.join(root, node.path);
    const text = await fs.readFile(absolute, 'utf8');
    return ts.createSourceFile(absolute, text, ts.ScriptTarget.Latest, true, scriptKindFor(absolute));
  } catch {
    return undefined;
  }
}

function alreadyResolved(graph: ArchGraphData, sourceId: string, call: HttpCall) {
  const requestPath = normalizePath(call.url);
  if (!requestPath) return false;
  const label = `${call.method.toUpperCase()} ${requestPath}`;
  return graph.edges.some((edge) => edge.source === sourceId && edge.relation === 'calls' && edge.label === label);
}

function inferredLanguage(node: ArchNode) {
  const extension = node.path ? path.extname(node.path).toLowerCase() : '';
  if (JAVASCRIPT_EXTENSIONS.has(extension)) return 'javascript-typescript';
  if (extension === '.py') return 'python';
  return 'unknown';
}

export async function linkStaticHttpEndpoints(rootInput: string, graph: ArchGraphData): Promise<GraphContribution> {
  const root = path.resolve(rootInput);
  const candidates = endpointCandidates(graph);
  if (candidates.length === 0) return {};

  const edges: ArchEdge[] = [];
  const seen = new Set<string>();

  for (const node of graph.nodes) {
    if (!isJavaScriptSourceNode(node)) continue;
    const parsed = await sourceFile(root, node);
    if (!parsed) continue;

    for (const call of collectHttpCalls(parsed)) {
      const requestPath = normalizePath(call.url);
      if (!requestPath || alreadyResolved(graph, node.id, call)) continue;
      const endpoint = uniqueEndpointForCall(call, candidates);
      if (!endpoint || endpoint.node.id === node.id) continue;

      const key = `${node.id}->${endpoint.node.id}:${call.method.toUpperCase()}:${requestPath}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const sourceSystem = metadataString(node, 'systemKey');
      const targetSystem = metadataString(endpoint.node, 'systemKey');
      const sourceLanguage = inferredLanguage(node);
      const targetLanguage = inferredLanguage(endpoint.node);
      const crossSystem = Boolean(sourceSystem && targetSystem && sourceSystem !== targetSystem);
      const crossLanguage = sourceLanguage !== 'unknown' && targetLanguage !== 'unknown' && sourceLanguage !== targetLanguage;

      edges.push({
        id: `edge:http-link:${edges.length + 1}`,
        source: node.id,
        target: endpoint.node.id,
        relation: 'calls',
        health: 'healthy',
        label: `${call.method.toUpperCase()} ${requestPath}`,
        metadata: {
          ...httpSecurityMetadata(call),
          endpointMatch: 'static-method-path',
          matchedRoutePath: endpoint.routePath,
          matchedFramework: metadataString(endpoint.node, 'framework') ?? 'unknown',
          sourceLanguage,
          targetLanguage,
          crossLanguage,
          crossSystem,
          ...(crossSystem ? { architectureBoundary: 'cross-system' } : {}),
        },
      });
    }
  }

  return {
    edges,
    metadata: {
      staticEndpointMatchCount: edges.length,
      crossLanguageEndpointMatchCount: edges.filter((edge) => edge.metadata?.crossLanguage === true).length,
      crossSystemEndpointMatchCount: edges.filter((edge) => edge.metadata?.crossSystem === true).length,
    },
  };
}
