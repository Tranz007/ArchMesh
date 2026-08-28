import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProjectWithPlugins } from '../plugins/orchestrator.js';
import { projectSystemBoundaries } from '../projections/systems.js';

const tempRoots: string[] = [];

async function createProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-angular-http-'));
  tempRoots.push(root);
  await fs.mkdir(path.join(root, 'apps', 'web', 'src'), { recursive: true });
  await fs.mkdir(path.join(root, 'services', 'api', 'app'), { recursive: true });
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({
    private: true,
    workspaces: ['apps/*', 'services/*'],
    dependencies: {
      '@angular/core': '^20.0.0',
      '@angular/common': '^20.0.0',
    },
  }));
  await fs.writeFile(path.join(root, 'apps', 'web', 'package.json'), JSON.stringify({ name: '@sample/angular-web' }));
  await fs.writeFile(path.join(root, 'services', 'api', 'package.json'), JSON.stringify({ name: '@sample/orders-api' }));
  await fs.writeFile(path.join(root, 'requirements.txt'), 'fastapi==0.116.0\n');
  return root;
}

async function write(root: string, relative: string, content: string) {
  const target = path.join(root, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('Angular HttpClient endpoint linking', () => {
  it('connects a statically provable Angular service call to FastAPI', async () => {
    const root = await createProject();
    await write(root, 'apps/web/src/orders.service.ts', `
      import { Injectable } from '@angular/core';
      import { HttpClient } from '@angular/common/http';

      @Injectable({ providedIn: 'root' })
      export class OrdersService {
        constructor(private http: HttpClient) {}
        create(email: string, phone: string) {
          return this.http.post('/orders', { email, phone });
        }
      }
    `);
    await write(root, 'services/api/app/main.py', `
      from fastapi import FastAPI
      app = FastAPI()

      @app.post('/orders')
      def create_order():
          return {'ok': True}
    `);

    const graph = await scanProjectWithPlugins(root);
    const source = graph.nodes.find((node) => node.path === 'apps/web/src/orders.service.ts');
    const target = graph.nodes.find((node) => node.kind === 'api' && node.metadata?.framework === 'fastapi');
    expect(source).toMatchObject({ kind: 'service', metadata: expect.objectContaining({ framework: 'angular', systemKey: 'apps-web' }) });
    expect(target?.metadata?.systemKey).toBe('services-api');

    const edge = graph.edges.find((candidate) => candidate.source === source?.id && candidate.target === target?.id && candidate.relation === 'calls');
    expect(edge).toMatchObject({
      label: 'POST /orders',
      metadata: expect.objectContaining({
        callerEvidence: 'angular-httpclient',
        endpointMatch: 'static-method-path',
        matchedFramework: 'fastapi',
        sourceLanguage: 'javascript-typescript',
        targetLanguage: 'python',
        crossLanguage: true,
        crossSystem: true,
        securitySensitiveData: true,
        securitySensitiveFields: 'email, phone',
      }),
    });
    expect(graph.metadata).toMatchObject({
      angularHttpClientEndpointMatchCount: 1,
      staticEndpointMatchCount: 1,
      crossLanguageEndpointMatchCount: 1,
      crossSystemEndpointMatchCount: 1,
    });

    const systemMap = projectSystemBoundaries(graph)!;
    expect(systemMap.edges).toContainEqual(expect.objectContaining({
      source: 'system:apps-web',
      target: 'system:services-api',
      relation: 'calls',
      label: 'POST /orders',
    }));
  });

  it('does not connect a lookalike client whose type is not imported HttpClient', async () => {
    const root = await createProject();
    await write(root, 'apps/web/src/orders.service.ts', `
      class ApiClient { post(url: string, body: unknown) { return null; } }
      const http = new ApiClient();
      export const create = () => http.post('/orders', { email: 'x@example.com' });
    `);
    await write(root, 'services/api/app/main.py', `
      from fastapi import FastAPI
      app = FastAPI()
      @app.post('/orders')
      def create_order(): return {'ok': True}
    `);

    const graph = await scanProjectWithPlugins(root);
    expect(graph.edges.filter((edge) => edge.metadata?.callerEvidence === 'angular-httpclient')).toHaveLength(0);
    expect(graph.metadata?.angularHttpClientEndpointMatchCount).toBe(0);
  });
});
