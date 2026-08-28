import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import type { ArchEdge, ArchNode } from '../../types.js';
import { ARCHMESH_PLUGIN_API_VERSION, type FrameworkAdapter, type GraphContribution } from '../types.js';

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

async function packageUsesAngular(root: string) {
  try {
    const raw = await fs.readFile(path.join(root, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const dependencyGroups = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    return dependencyGroups.some((group) => {
      const dependencies = pkg[group];
      return Boolean(dependencies && typeof dependencies === 'object' && '@angular/core' in dependencies);
    });
  } catch {
    return false;
  }
}

async function hasAngularConfig(root: string) {
  return isFile(path.join(root, 'angular.json'));
}

function loadCompilerOptions(root: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json')
    ?? ts.findConfigFile(root, ts.sys.fileExists, 'jsconfig.json');
  if (!configPath) {
    return {
      allowJs: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
    };
  }
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) return {};
  return ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath)).options;
}

function scriptKindFor(file: string) {
  const extension = path.extname(file);
  if (extension === '.tsx') return ts.ScriptKind.TSX;
  if (extension === '.jsx') return ts.ScriptKind.JSX;
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

async function parseNode(root: string, node: ArchNode) {
  if (!node.path || !/\.[cm]?[jt]sx?$/.test(node.path)) return undefined;
  try {
    const absolute = path.join(root, node.path);
    const text = await fs.readFile(absolute, 'utf8');
    return ts.createSourceFile(absolute, text, ts.ScriptTarget.Latest, true, scriptKindFor(absolute));
  } catch {
    return undefined;
  }
}

function decoratorsOf(node: ts.Node) {
  return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
}

function decoratorCall(node: ts.Node, name: string) {
  for (const decorator of decoratorsOf(node)) {
    if (!ts.isCallExpression(decorator.expression)) continue;
    const expression = decorator.expression.expression;
    if (ts.isIdentifier(expression) && expression.text === name) return decorator.expression;
  }
  return undefined;
}

function objectArgument(call: ts.CallExpression | undefined) {
  const [argument] = call?.arguments ?? [];
  return argument && ts.isObjectLiteralExpression(argument) ? argument : undefined;
}

function propertyByName(object: ts.ObjectLiteralExpression | undefined, name: string) {
  if (!object) return undefined;
  return object.properties.find((property): property is ts.PropertyAssignment => {
    if (!ts.isPropertyAssignment(property)) return false;
    const key = property.name;
    return (ts.isIdentifier(key) || ts.isStringLiteral(key)) && key.text === name;
  });
}

function staticString(expression: ts.Expression | undefined) {
  return expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
    ? expression.text
    : undefined;
}

function staticBoolean(expression: ts.Expression | undefined) {
  if (expression?.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression?.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function sourceFileNodeId(relativePath: string) {
  return `file:${toPosix(relativePath)}`;
}

function resolveLocalModule(
  fromFile: string,
  specifier: string,
  root: string,
  compilerOptions: ts.CompilerOptions,
) {
  const resolution = ts.resolveModuleName(specifier, fromFile, compilerOptions, ts.sys).resolvedModule;
  if (!resolution) return undefined;
  const resolved = path.resolve(resolution.resolvedFileName);
  if (resolved.includes(`${path.sep}node_modules${path.sep}`) || /\.d\.[cm]?ts$/.test(resolved)) return undefined;
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
  return sourceFileNodeId(relative);
}

function importedSymbolTargets(
  sourceFile: ts.SourceFile,
  root: string,
  compilerOptions: ts.CompilerOptions,
  knownNodeIds: Set<string>,
) {
  const result = new Map<string, string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const target = resolveLocalModule(sourceFile.fileName, statement.moduleSpecifier.text, root, compilerOptions);
    if (!target || !knownNodeIds.has(target)) continue;
    const clause = statement.importClause;
    if (!clause) continue;
    if (clause.name) result.set(clause.name.text, target);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const specifier of bindings.elements) result.set(specifier.name.text, target);
    } else if (bindings && ts.isNamespaceImport(bindings)) {
      result.set(bindings.name.text, target);
    }
  }
  return result;
}

function className(node: ts.ClassDeclaration) {
  return node.name?.text ?? 'AnonymousClass';
}

function injectedIdentifiers(node: ts.ClassDeclaration) {
  const names = new Set<string>();
  for (const member of node.members) {
    if (ts.isConstructorDeclaration(member)) {
      for (const parameter of member.parameters) {
        const type = parameter.type;
        if (type && ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) names.add(type.typeName.text);
      }
    }
  }

  const visit = (child: ts.Node) => {
    if (ts.isCallExpression(child)
      && ts.isIdentifier(child.expression)
      && child.expression.text === 'inject'
      && child.arguments[0]
      && ts.isIdentifier(child.arguments[0])) {
      names.add(child.arguments[0].text);
    }
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return [...names];
}

async function resolveTemplate(root: string, sourcePath: string, templateUrl: string) {
  const absolute = path.resolve(root, path.dirname(sourcePath), templateUrl);
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !(await isFile(absolute))) return undefined;
  return toPosix(relative);
}

function routeArrayCandidate(declaration: ts.VariableDeclaration, hasRouterImport: boolean) {
  if (!hasRouterImport || !declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) return false;
  const name = ts.isIdentifier(declaration.name) ? declaration.name.text : '';
  const typeText = declaration.type?.getText() ?? '';
  return /routes?$/i.test(name) || /\bRoutes\b/.test(typeText) || /\bRoute\s*\[\s*\]/.test(typeText);
}

function routeObjects(array: ts.ArrayLiteralExpression, prefix = ''): Array<{
  path: string;
  componentName?: string;
  lazyTargetSpecifier?: string;
  redirectTo?: string;
}> {
  const result: Array<{
    path: string;
    componentName?: string;
    lazyTargetSpecifier?: string;
    redirectTo?: string;
  }> = [];

  for (const element of array.elements) {
    if (!ts.isObjectLiteralExpression(element)) continue;
    const pathValue = staticString(propertyByName(element, 'path')?.initializer);
    if (pathValue === undefined) continue;
    const combined = `${prefix}/${pathValue}`.replace(/\/+/g, '/');
    const routePath = combined === '/' ? '/' : combined.replace(/\/$/, '') || '/';

    const componentExpression = propertyByName(element, 'component')?.initializer;
    const componentName = componentExpression && ts.isIdentifier(componentExpression) ? componentExpression.text : undefined;
    const redirectTo = staticString(propertyByName(element, 'redirectTo')?.initializer);

    let lazyTargetSpecifier: string | undefined;
    const loadComponent = propertyByName(element, 'loadComponent')?.initializer;
    if (loadComponent) {
      const visit = (node: ts.Node) => {
        if (lazyTargetSpecifier) return;
        if (ts.isCallExpression(node)
          && node.expression.kind === ts.SyntaxKind.ImportKeyword
          && node.arguments[0]
          && ts.isStringLiteral(node.arguments[0])) {
          lazyTargetSpecifier = node.arguments[0].text;
          return;
        }
        ts.forEachChild(node, visit);
      };
      visit(loadComponent);
    }

    result.push({ path: routePath, componentName, lazyTargetSpecifier, redirectTo });
    const children = propertyByName(element, 'children')?.initializer;
    if (children && ts.isArrayLiteralExpression(children)) result.push(...routeObjects(children, routePath));
  }

  return result;
}

function stablePart(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._/-]+/g, '-').replace(/^[-/]+|[-/]+$/g, '');
  return normalized || 'root';
}

async function enrichAngular(root: string, graph: Parameters<FrameworkAdapter['enrich']>[0]['graph']): Promise<GraphContribution> {
  const compilerOptions = loadCompilerOptions(root);
  const knownNodeIds = new Set(graph.nodes.map((node) => node.id));
  const nodes: ArchNode[] = [];
  const edges: ArchEdge[] = [];
  const edgeKeys = new Set<string>();
  let componentCount = 0;
  let injectableCount = 0;
  let routeCount = 0;
  let templateCount = 0;

  const addEdge = (edge: Omit<ArchEdge, 'id'>) => {
    const key = `${edge.source}->${edge.target}:${edge.relation}:${edge.label ?? ''}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ ...edge, id: `edge:angular:${edges.length + 1}` });
  };

  for (const sourceNode of graph.nodes) {
    if (!sourceNode.path) continue;
    const sourceFile = await parseNode(root, sourceNode);
    if (!sourceFile) continue;
    const imports = importedSymbolTargets(sourceFile, root, compilerOptions, knownNodeIds);
    const hasRouterImport = sourceFile.statements.some((statement) => ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && statement.moduleSpecifier.text === '@angular/router');

    let enrichedNode: ArchNode | undefined;

    for (const statement of sourceFile.statements) {
      if (ts.isClassDeclaration(statement)) {
        const component = objectArgument(decoratorCall(statement, 'Component'));
        const injectable = decoratorCall(statement, 'Injectable');

        if (component) {
          componentCount += 1;
          const selector = staticString(propertyByName(component, 'selector')?.initializer);
          const standalone = staticBoolean(propertyByName(component, 'standalone')?.initializer);
          const templateUrl = staticString(propertyByName(component, 'templateUrl')?.initializer);
          enrichedNode = {
            ...(enrichedNode ?? sourceNode),
            kind: 'component',
            metadata: {
              ...((enrichedNode ?? sourceNode).metadata ?? {}),
              framework: 'angular',
              angularEntity: 'component',
              componentName: className(statement),
              ...(selector ? { selector } : {}),
              ...(standalone !== undefined ? { standalone } : {}),
              ...(templateUrl ? { templateUrl } : {}),
            },
          };

          if (templateUrl) {
            const templatePath = await resolveTemplate(root, sourceNode.path, templateUrl);
            if (templatePath) {
              const templateId = sourceFileNodeId(templatePath);
              templateCount += 1;
              nodes.push({
                id: templateId,
                label: path.posix.basename(templatePath),
                kind: 'file',
                path: templatePath,
                health: 'healthy',
                metadata: {
                  framework: 'angular',
                  resourceType: 'Angular template',
                  sourceComponentId: sourceNode.id,
                },
              });
              addEdge({
                source: sourceNode.id,
                target: templateId,
                relation: 'contains',
                health: 'healthy',
                label: 'Angular template',
              });
            }
          }
        } else if (injectable) {
          injectableCount += 1;
          enrichedNode = {
            ...(enrichedNode ?? sourceNode),
            kind: 'service',
            metadata: {
              ...((enrichedNode ?? sourceNode).metadata ?? {}),
              framework: 'angular',
              angularEntity: 'injectable',
              serviceName: className(statement),
            },
          };
        }

        if (component || injectable) {
          for (const identifier of injectedIdentifiers(statement)) {
            const target = imports.get(identifier);
            if (!target || target === sourceNode.id) continue;
            addEdge({
              source: sourceNode.id,
              target,
              relation: 'depends-on',
              health: 'healthy',
              label: `Angular DI: ${identifier}`,
              metadata: { framework: 'angular', evidence: 'constructor/inject' },
            });
          }
        }
      }

      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!routeArrayCandidate(declaration, hasRouterImport) || !declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) continue;
          for (const route of routeObjects(declaration.initializer)) {
            routeCount += 1;
            const routeId = `route:angular:${stablePart(sourceNode.path)}:${stablePart(route.path)}:${routeCount}`;
            nodes.push({
              id: routeId,
              label: route.path,
              kind: 'route',
              path: sourceNode.path,
              health: 'healthy',
              metadata: {
                framework: 'angular',
                routePath: route.path,
                routeType: 'client',
                sourceNodeId: sourceNode.id,
                ...(route.componentName ? { componentName: route.componentName } : {}),
                ...(route.redirectTo ? { redirectTo: route.redirectTo } : {}),
                ...(route.lazyTargetSpecifier ? { lazy: true } : {}),
              },
            });
            addEdge({ source: sourceNode.id, target: routeId, relation: 'contains', health: 'healthy', label: 'Angular route' });

            const componentTarget = route.componentName ? imports.get(route.componentName) : undefined;
            const lazyTarget = route.lazyTargetSpecifier
              ? resolveLocalModule(sourceFile.fileName, route.lazyTargetSpecifier, root, compilerOptions)
              : undefined;
            const target = componentTarget ?? (lazyTarget && knownNodeIds.has(lazyTarget) ? lazyTarget : undefined);
            if (target) {
              addEdge({
                source: routeId,
                target,
                relation: 'depends-on',
                health: 'healthy',
                label: route.lazyTargetSpecifier ? 'Angular lazy component' : 'Angular route component',
                metadata: { framework: 'angular', ...(route.lazyTargetSpecifier ? { lazy: true } : {}) },
              });
            }
          }
        }
      }
    }

    if (enrichedNode) nodes.push(enrichedNode);
  }

  return {
    nodes,
    edges,
    metadata: {
      angularComponentCount: componentCount,
      angularInjectableCount: injectableCount,
      angularRouteCount: routeCount,
      angularTemplateCount: templateCount,
    },
  };
}

export const angularAdapter: FrameworkAdapter = {
  apiVersion: ARCHMESH_PLUGIN_API_VERSION,
  id: 'angular',
  displayName: 'Angular',
  languagePluginIds: ['javascript-typescript'],
  capabilities: ['components', 'templates', 'services', 'routes', 'dependency-injection'],
  detect: async ({ root }) => (await packageUsesAngular(root)) || hasAngularConfig(root),
  enrich: ({ root, graph }) => enrichAngular(root, graph),
};
