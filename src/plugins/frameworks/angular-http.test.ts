import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectAngularHttpCalls } from './angular-http.js';

function parse(source: string) {
  return ts.createSourceFile('service.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('Angular HttpClient evidence', () => {
  it('collects constructor-injected HttpClient calls and static body fields', () => {
    const calls = collectAngularHttpCalls(parse(`
      import { HttpClient } from '@angular/common/http';
      export class OrdersService {
        constructor(private http: HttpClient) {}
        load() { return this.http.get('/orders'); }
        create(email: string) { return this.http.post('/orders', { email, source: 'web' }); }
      }
    `));

    expect(calls).toEqual([
      { url: '/orders', method: 'GET', bodyFields: [] },
      { url: '/orders', method: 'POST', bodyFields: ['email', 'source'] },
    ]);
  });

  it('supports inject(HttpClient), aliased imports, and request(method, url, options)', () => {
    const calls = collectAngularHttpCalls(parse(`
      import { HttpClient as Client } from '@angular/common/http';
      import { inject } from '@angular/core';
      class AccountService {
        private readonly client = inject(Client);
        save() {
          return this.client.request('PATCH', '/account', { body: { phone: 'x' } });
        }
      }
    `));

    expect(calls).toEqual([
      { url: '/account', method: 'PATCH', bodyFields: ['phone'] },
    ]);
  });

  it('sanitizes external URLs without exposing credentials, query values, or fragments', () => {
    const calls = collectAngularHttpCalls(parse(`
      import { HttpClient } from '@angular/common/http';
      const http = inject(HttpClient);
      http.get('https://user:secret@example.com/orders?token=abc#private');
    `));

    expect(calls).toEqual([
      { url: 'https://example.com/orders', method: 'GET', bodyFields: [] },
    ]);
  });

  it('does not treat lookalike clients or dynamic URLs as HttpClient evidence', () => {
    const calls = collectAngularHttpCalls(parse(`
      class FakeClient { post(url: string, body: unknown) {} }
      const http = new FakeClient();
      const route = '/orders';
      http.post('/orders', { email: 'x' });

      import { HttpClient } from '@angular/common/http';
      const real = inject(HttpClient);
      real.post(route, { email: 'x' });
    `));

    expect(calls).toEqual([]);
  });
});
