import ts from 'typescript';
import { collectStaticObjectFields, type HttpCall } from '../../scanner/semantics.js';

const DIRECT_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const BODY_METHODS = new Set(['post', 'put', 'patch']);

function staticString(node: ts.Expression | undefined) {
  if (!node) return undefined;
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;
}

function propertyName(name: ts.PropertyName | undefined) {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function sanitizeStaticUrl(value: string) {
  if (value.startsWith('/')) return value.split(/[?#]/)[0];
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return value.split(/[?#]/)[0];
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return value.split(/[?#]/)[0];
  }
}

function httpClientTypeNames(sourceFile: ts.SourceFile) {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== '@angular/common/http') continue;

    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const specifier of bindings.elements) {
      const imported = specifier.propertyName?.text ?? specifier.name.text;
      if (imported === 'HttpClient') names.add(specifier.name.text);
    }
  }
  return names;
}

function typeIsHttpClient(type: ts.TypeNode | undefined, clientTypes: Set<string>) {
  return Boolean(type
    && ts.isTypeReferenceNode(type)
    && ts.isIdentifier(type.typeName)
    && clientTypes.has(type.typeName.text));
}

function isInjectHttpClient(expression: ts.Expression | undefined, clientTypes: Set<string>) {
  return Boolean(expression
    && ts.isCallExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === 'inject'
    && expression.arguments[0]
    && ts.isIdentifier(expression.arguments[0])
    && clientTypes.has(expression.arguments[0].text));
}

function httpClientIdentifiers(sourceFile: ts.SourceFile, clientTypes: Set<string>) {
  const identifiers = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isParameter(node)
      && ts.isIdentifier(node.name)
      && typeIsHttpClient(node.type, clientTypes)) {
      identifiers.add(node.name.text);
    }

    if (ts.isPropertyDeclaration(node)
      && ts.isIdentifier(node.name)
      && (typeIsHttpClient(node.type, clientTypes) || isInjectHttpClient(node.initializer, clientTypes))) {
      identifiers.add(node.name.text);
    }

    if (ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && (typeIsHttpClient(node.type, clientTypes) || isInjectHttpClient(node.initializer, clientTypes))) {
      identifiers.add(node.name.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return identifiers;
}

function receiverIsHttpClient(expression: ts.Expression, clients: Set<string>, clientTypes: Set<string>) {
  if (ts.isIdentifier(expression)) return clients.has(expression.text);
  if (ts.isPropertyAccessExpression(expression) && expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
    return clients.has(expression.name.text);
  }
  return isInjectHttpClient(expression, clientTypes);
}

function bodyFromOptions(options: ts.Expression | undefined) {
  if (!options || !ts.isObjectLiteralExpression(options)) return [];
  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property) || propertyName(property.name) !== 'body') continue;
    return collectStaticObjectFields(property.initializer);
  }
  return [];
}

function directCall(call: ts.CallExpression, methodName: string): HttpCall | undefined {
  const rawUrl = staticString(call.arguments[0]);
  if (!rawUrl) return undefined;
  const bodyFields = BODY_METHODS.has(methodName)
    ? collectStaticObjectFields(call.arguments[1])
    : [];
  return {
    url: sanitizeStaticUrl(rawUrl),
    method: methodName.toUpperCase(),
    bodyFields,
  };
}

function requestCall(call: ts.CallExpression): HttpCall | undefined {
  const method = staticString(call.arguments[0])?.toUpperCase();
  const rawUrl = staticString(call.arguments[1]);
  if (!method || !rawUrl) return undefined;
  return {
    url: sanitizeStaticUrl(rawUrl),
    method,
    bodyFields: bodyFromOptions(call.arguments[2]),
  };
}

export function collectAngularHttpCalls(sourceFile: ts.SourceFile): HttpCall[] {
  const clientTypes = httpClientTypeNames(sourceFile);
  if (clientTypes.size === 0) return [];
  const clients = httpClientIdentifiers(sourceFile, clientTypes);
  const calls: HttpCall[] = [];
  const seen = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = node.expression.expression;
      const methodName = node.expression.name.text.toLowerCase();
      if (receiverIsHttpClient(receiver, clients, clientTypes)) {
        const call = DIRECT_METHODS.has(methodName)
          ? directCall(node, methodName)
          : methodName === 'request'
            ? requestCall(node)
            : undefined;
        if (call) {
          const key = `${call.method}:${call.url}:${call.bodyFields.join(',')}`;
          if (!seen.has(key)) {
            seen.add(key);
            calls.push(call);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return calls;
}
