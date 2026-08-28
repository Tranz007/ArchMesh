import ts from 'typescript';
import type { ArchEdge } from '../types.js';

export interface HttpCall {
  url: string;
  method: string;
  bodyFields: string[];
}

export interface FirestoreAccess {
  collection: string;
  relation: Extract<ArchEdge['relation'], 'reads' | 'writes'>;
  operation: string;
  fields: string[];
}

function staticString(node: ts.Expression | undefined) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

function callName(call: ts.CallExpression) {
  if (ts.isIdentifier(call.expression)) return call.expression.text;
  if (ts.isPropertyAccessExpression(call.expression)) return call.expression.name.text;
  return undefined;
}

function propertyName(name: ts.PropertyName | undefined) {
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(expression)) return unwrapExpression(expression.expression);
  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)) return unwrapExpression(expression.expression);
  return expression;
}

export function collectStaticObjectFields(expression: ts.Expression | undefined): string[] {
  if (!expression) return [];
  const node = unwrapExpression(expression);

  if (ts.isCallExpression(node) && callName(node) === 'stringify') {
    return collectStaticObjectFields(node.arguments[0]);
  }

  if (!ts.isObjectLiteralExpression(node)) return [];

  const fields = new Set<string>();
  for (const property of node.properties) {
    if (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property) || ts.isGetAccessorDeclaration(property) || ts.isSetAccessorDeclaration(property)) {
      const name = propertyName(property.name);
      if (name) fields.add(name);
      continue;
    }
    if (ts.isShorthandPropertyAssignment(property)) fields.add(property.name.text);
  }
  return [...fields];
}

function requestMethod(call: ts.CallExpression) {
  const options = call.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return 'GET';

  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = propertyName(property.name);
    if (key !== 'method') continue;
    return staticString(property.initializer)?.toUpperCase() ?? 'GET';
  }
  return 'GET';
}

function requestBodyFields(call: ts.CallExpression) {
  const options = call.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return [];

  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propertyName(property.name) !== 'body') continue;
    return collectStaticObjectFields(property.initializer);
  }
  return [];
}

export function collectHttpCalls(sourceFile: ts.SourceFile) {
  const calls: HttpCall[] = [];
  const seen = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && callName(node) === 'fetch') {
      const url = staticString(node.arguments[0]);
      if (url) {
        const method = requestMethod(node);
        const bodyFields = requestBodyFields(node);
        const key = `${method}:${url}:${bodyFields.join(',')}`;
        if (!seen.has(key)) {
          seen.add(key);
          calls.push({ url, method, bodyFields });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return calls;
}

const firestoreReadOperations = new Set(['getDoc', 'getDocs', 'onSnapshot']);
const firestoreWriteOperations = new Set(['setDoc', 'addDoc', 'updateDoc', 'deleteDoc']);

function firestoreCollection(node: ts.Node | undefined): string | undefined {
  if (!node || !ts.isCallExpression(node)) return undefined;
  const name = callName(node);

  if (name === 'collection' || name === 'doc') {
    for (let index = 1; index < node.arguments.length; index += 1) {
      const value = staticString(node.arguments[index]);
      if (value) return value;
    }
  }

  for (const argument of node.arguments) {
    const nested = firestoreCollection(argument);
    if (nested) return nested;
  }
  return undefined;
}

function firestoreWriteFields(call: ts.CallExpression, operation: string) {
  if (operation === 'deleteDoc') return [];
  const objectFields = collectStaticObjectFields(call.arguments[1]);
  if (objectFields.length > 0) return objectFields;

  if (operation === 'updateDoc') {
    const fields = new Set<string>();
    for (let index = 1; index < call.arguments.length; index += 2) {
      const field = staticString(call.arguments[index]);
      if (field) fields.add(field);
    }
    return [...fields];
  }

  return [];
}

export function collectFirestoreAccesses(sourceFile: ts.SourceFile) {
  const accesses: FirestoreAccess[] = [];
  const seen = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const operation = callName(node);
      const relation = operation && firestoreReadOperations.has(operation)
        ? 'reads'
        : operation && firestoreWriteOperations.has(operation)
          ? 'writes'
          : undefined;

      if (relation && operation) {
        const collection = firestoreCollection(node.arguments[0]);
        if (collection) {
          const fields = relation === 'writes' ? firestoreWriteFields(node, operation) : [];
          const key = `${relation}:${collection}:${operation}:${fields.join(',')}`;
          if (!seen.has(key)) {
            seen.add(key);
            accesses.push({ collection, relation, operation, fields });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return accesses;
}
