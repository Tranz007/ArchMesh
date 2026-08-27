import ts from 'typescript';
import type { ArchEdge } from '../types.js';

export interface HttpCall {
  url: string;
  method: string;
}

export interface FirestoreAccess {
  collection: string;
  relation: Extract<ArchEdge['relation'], 'reads' | 'writes'>;
  operation: string;
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

function requestMethod(call: ts.CallExpression) {
  const options = call.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return 'GET';

  for (const property of options.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    const key = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
    if (key !== 'method') continue;
    return staticString(property.initializer)?.toUpperCase() ?? 'GET';
  }
  return 'GET';
}

export function collectHttpCalls(sourceFile: ts.SourceFile) {
  const calls: HttpCall[] = [];
  const seen = new Set<string>();

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && callName(node) === 'fetch') {
      const url = staticString(node.arguments[0]);
      if (url) {
        const method = requestMethod(node);
        const key = `${method}:${url}`;
        if (!seen.has(key)) {
          seen.add(key);
          calls.push({ url, method });
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
          const key = `${relation}:${collection}:${operation}`;
          if (!seen.has(key)) {
            seen.add(key);
            accesses.push({ collection, relation, operation });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return accesses;
}
