import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectFirestoreAccesses, collectHttpCalls } from './semantics.js';

function source(text: string) {
  return ts.createSourceFile('fixture.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('collectHttpCalls', () => {
  it('detects static fetch URLs, methods, and payload fields', () => {
    const calls = collectHttpCalls(source(`
      fetch('/api/catalog/publish', { method: 'POST', body: JSON.stringify({ title, ownerId }) });
      fetch('https://example.com/status');
    `));

    expect(calls).toEqual([
      { url: '/api/catalog/publish', method: 'POST', bodyFields: ['title', 'ownerId'] },
      { url: 'https://example.com/status', method: 'GET', bodyFields: [] },
    ]);
  });
});

describe('collectFirestoreAccesses', () => {
  it('detects reads, writes, listeners, and statically visible write fields', () => {
    const accesses = collectFirestoreAccesses(source(`
      getDocs(collection(db, 'catalogItems'));
      setDoc(doc(db, 'catalogItems', itemId), { title, ownerId });
      onSnapshot(query(collection(db, 'organizations')), listener);
    `));

    expect(accesses).toEqual(
      expect.arrayContaining([
        { collection: 'catalogItems', relation: 'reads', operation: 'getDocs', fields: [] },
        { collection: 'catalogItems', relation: 'writes', operation: 'setDoc', fields: ['title', 'ownerId'] },
        { collection: 'organizations', relation: 'reads', operation: 'onSnapshot', fields: [] },
      ]),
    );
  });
});
