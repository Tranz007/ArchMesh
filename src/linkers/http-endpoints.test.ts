import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProjectWithPlugins } from '../plugins/orchestrator.js';
import { projectSystemBoundaries } from '../projections/systems.js';

const tempRoots: string[] = [];

async function createProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-http-link-'));
  tempRoots.push(root);
  await fs.mkdir(path.join(root, 'apps', 'web', 'src'), { recursive: true });
  await fs.mkdir(path.join(root, 'services', 'api', 'app'), { recursive: true });
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({
    private: true,
    workspaces: ['apps/*', 'services/*'],
  }));
  await fs.writeFile(path.join(root, 'apps', 'web', 'package.json'), JSON.stringify({ name: '@sample/web-app' }));
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

describe('static HTTP endpoint linker', () => {
  it('connects a TypeScript request to one matching FastAPI handler across system and language boundaries', async () => {
    const root = await createProject();
    await write(root, 'apps/web/src/client.ts', `
      export async function createOrder(email: string) {
        return fetch('/orders', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
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
    const source = graph.nodes.find((node) => node.path === 'apps/web/src/client.ts');
    const target = graph.nodes.find((node) => node.kind === 'api' && node.metadata?.framework === 'fastapi');
    expect(source?.metadata?.systemKey).toBe('apps-web');
    expect(target?.metadata?.systemKey).toBe('services-api');

    const edge = graph.edges.find((candidate) => candidate.source === source?.id && candidate.target === target?.id && candidate.relation === 'calls');
    expect(edge).toMatchObject({
      label: 'POST /orders',
      metadata: expect.objectContaining({
        endpointMatch: 'static-method-path',
        matchedFramework: 'fastapi',
        matchedRoutePath: '/orders',
        sourceLanguage: 'javascript-typescript',
        targetLanguage: 'python',
        crossLanguage: true,
        crossSystem: true,
        architectureBoundary: 'cross-system',
        securitySensitiveData: true,
      }),
    });
    expect(graph.metadata).toMatchObject({
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

  it('matches one static request to a parameterized handler when segment shape is unambiguous', async () => {
    const root = await createProject();
    await write(root, 'apps/web/src/client.ts', `export const load = () => fetch('/orders/123');`);
    await write(root, 'services/api/app/main.py', `
      from fastapi import FastAPI
      app = FastAPI()

      @app.get('/orders/{order_id}')
      def order(order_id: str):
          return {'id': order_id}
    `);

    const graph = await scanProjectWithPlugins(root);
    const edge = graph.edges.find((candidate) => candidate.metadata?.endpointMatch === 'static-method-path');
    expect(edge).toMatchObject({
      label: 'GET /orders/123',
      metadata: expect.objectContaining({ matchedRoutePath: '/orders/{order_id}' }),
    });
  });

  it('does not invent a connection when two semantic handlers match the same method and path', async () => {
    const root = await createProject();
    await write(root, 'apps/web/src/client.ts', `export const send = () => fetch('/orders', { method: 'POST' });`);
    await write(root, 'services/api/app/one.py', `
      from fastapi import FastAPI
      app = FastAPI()
      @app.post('/orders')
      def first(): return {'source': 'one'}
    `);
    await write(root, 'services/api/app/two.py', `
      from fastapi import FastAPI
      app = FastAPI()
      @app.post('/orders')
      def second(): return {'source': 'two'}
    `);

    const graph = await scanProjectWithPlugins(root);
    expect(graph.nodes.filter((node) => node.kind === 'api' && node.metadata?.routePath === '/orders')).toHaveLength(2);
    expect(graph.edges.filter((edge) => edge.metadata?.endpointMatch === 'static-method-path')).toHaveLength(0);
    expect(graph.metadata?.staticEndpointMatchCount).toBe(0);
  });

  it('does not reinterpret an absolute external URL as an internal handler', async () => {
    const root = await createProject();
    await write(root, 'apps/web/src/client.ts', `export const load = () => fetch('https://example.com/orders');`);
    await write(root, 'services/api/app/main.py', `
      from fastapi import FastAPI
      app = FastAPI()
      @app.get('/orders')
      def orders(): return []
    `);

    const graph = await scanProjectWithPlugins(root);
    expect(graph.edges.filter((edge) => edge.metadata?.endpointMatch === 'static-method-path')).toHaveLength(0);
    expect(graph.edges.some((edge) => edge.target === 'integration:http:example.com')).toBe(true);
  });
});
