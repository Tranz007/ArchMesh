import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectFirestoreAccesses, collectHttpCalls } from './semantics.js';

function source(text: string) {
  return ts.createSourceFile('fixture.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('collectHttpCalls', () => {
  it('detects static fetch URLs and methods', () => {
    const calls = collectHttpCalls(source(`
      fetch('/api/story/publish', { method: 'POST' });
      fetch('https://example.com/status');
    `));

    expect(calls).toEqual([
      { url: '/api/story/publish', method: 'POST' },
      { url: 'https://example.com/status', method: 'GET' },
    ]);
  });
});

describe('collectFirestoreAccesses', () => {
  it('detects reads, writes, and listeners against static collection names', () => {
    const accesses = collectFirestoreAccesses(source(`
      getDocs(collection(db, 'stories'));
      setDoc(doc(db, 'stories', storyId), payload);
      onSnapshot(query(collection(db, 'companies')), listener);
    `));

    expect(accesses).toEqual(
      expect.arrayContaining([
        { collection: 'stories', relation: 'reads', operation: 'getDocs' },
        { collection: 'stories', relation: 'writes', operation: 'setDoc' },
        { collection: 'companies', relation: 'reads', operation: 'onSnapshot' },
      ]),
    );
  });
});
