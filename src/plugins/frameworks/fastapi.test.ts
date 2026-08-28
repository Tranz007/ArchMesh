import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProjectWithPlugins } from '../orchestrator.js';
import { pythonPlugin } from '../languages/python.js';
import { fastApiAdapter } from './fastapi.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(prefix: string, files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `archmesh-fastapi-${prefix}-`));
  tempDirs.push(root);
  await Promise.all(Object.entries(files).map(async ([relative, content]) => {
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, 'utf8');
  }));
  return root;
}

async function scan(root: string) {
  return scanProjectWithPlugins(root, {
    languagePlugins: [pythonPlugin],
    frameworkAdapters: [fastApiAdapter],
  });
}

describe('FastAPI framework adapter', () => {
  it('creates semantic API nodes from route decorators and static APIRouter prefixes', async () => {
    const root = await fixture('routes', {
      'pyproject.toml': `[project]\ndependencies = ["fastapi>=0.100"]\n`,
      'src/api/main.py': `
        from fastapi import APIRouter, Depends, FastAPI
        app = FastAPI()
        router = APIRouter(prefix="/api")

        @router.get("/orders/{order_id}")
        async def get_order(order_id: str, user = Depends(current_user)):
            return {"id": order_id}

        @router.post(path="/orders")
        async def create_order():
            return {"ok": True}

        @app.get("/health")
        def health():
            return {"ok": True}
      `,
    });

    const graph = await scan(root);
    const getOrder = graph.nodes.find((node) => node.label === 'GET /api/orders/{order_id}');
    const createOrder = graph.nodes.find((node) => node.label === 'POST /api/orders');
    const health = graph.nodes.find((node) => node.label === 'GET /health');
    const source = graph.nodes.find((node) => node.path === 'src/api/main.py' && node.kind !== 'api');

    expect(getOrder).toMatchObject({
      kind: 'api',
      path: 'src/api/main.py',
      metadata: {
        framework: 'fastapi',
        routePath: '/api/orders/{order_id}',
        httpMethods: 'GET',
        handlerName: 'get_order',
        dependencyCount: 1,
      },
    });
    expect(createOrder?.metadata).toMatchObject({ framework: 'fastapi', handlerName: 'create_order' });
    expect(health?.metadata).toMatchObject({ framework: 'fastapi', routePath: '/health' });
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: source?.id, target: getOrder?.id, relation: 'contains' }),
      expect.objectContaining({ source: source?.id, target: createOrder?.id, relation: 'contains' }),
    ]));
    expect(graph.metadata).toMatchObject({
      frameworkAdapterCount: 1,
      frameworkAdapters: 'fastapi',
      fastApiRouteCount: 3,
    });
  });

  it('supports static api_route method lists as separate semantic endpoints', async () => {
    const root = await fixture('api-route', {
      'requirements.txt': 'fastapi==0.116.0\n',
      'main.py': `
        from fastapi import FastAPI
        app = FastAPI()

        @app.api_route("/health", methods=["GET", "HEAD"])
        async def health():
            return {"ok": True}
      `,
    });

    const graph = await scan(root);
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'GET /health', kind: 'api' }),
      expect.objectContaining({ label: 'HEAD /health', kind: 'api' }),
    ]));
    expect(graph.metadata?.fastApiRouteCount).toBe(2);
  });

  it('detects FastAPI from source imports when package metadata is absent', async () => {
    const root = await fixture('source-detection', {
      'app.py': `
        from fastapi import FastAPI
        app = FastAPI()
        @app.get("/status")
        def status():
            return {"status": "ok"}
      `,
    });

    const graph = await scan(root);
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'GET /status', metadata: expect.objectContaining({ framework: 'fastapi' }) }),
    ]));
    expect(graph.metadata?.frameworkAdapters).toBe('fastapi');
  });

  it('does not invent FastAPI semantics for lookalike decorators without FastAPI evidence', async () => {
    const root = await fixture('false-positive', {
      'app.py': `
        class Router:
            def get(self, path):
                return lambda fn: fn
        app = Router()
        @app.get("/status")
        def status():
            return "ok"
      `,
    });

    const graph = await scan(root);
    expect(graph.nodes.some((node) => node.kind === 'api')).toBe(false);
    expect(graph.metadata).toMatchObject({ frameworkAdapterCount: 0, frameworkAdapters: '' });
  });

  it('ignores dynamic route paths rather than presenting them as static evidence', async () => {
    const root = await fixture('dynamic', {
      'requirements.txt': 'fastapi\n',
      'app.py': `
        from fastapi import FastAPI
        app = FastAPI()
        prefix = "/tenant"
        @app.get(f"{prefix}/status")
        def status():
            return "ok"
      `,
    });

    const graph = await scan(root);
    expect(graph.nodes.some((node) => node.kind === 'api')).toBe(false);
  });
});
