import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProjectWithPlugins } from '../orchestrator.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-nextjs-'));
  tempDirs.push(root);
  await Promise.all(Object.entries(files).map(async ([relative, content]) => {
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, 'utf8');
  }));
  return root;
}

const nextPackage = JSON.stringify({ dependencies: { next: '^15.0.0', react: '^19.0.0' } });

describe('Next.js framework adapter', () => {
  it('detects App Router pages and API route semantics', async () => {
    const root = await fixture({
      'package.json': nextPackage,
      'src/app/(main)/orders/[id]/page.tsx': `export default function Order(){ return null }`,
      'src/app/api/orders/[id]/route.ts': `export async function GET(){ return new Response('ok') }\nexport const POST = async () => new Response('created')`,
    });

    const graph = await scanProjectWithPlugins(root);
    const page = graph.nodes.find((node) => node.path?.endsWith('/page.tsx'));
    const api = graph.nodes.find((node) => node.path?.endsWith('/route.ts'));

    expect(page).toMatchObject({
      kind: 'route',
      metadata: {
        framework: 'nextjs',
        routePath: '/orders/[id]',
        routeType: 'page',
      },
    });
    expect(api).toMatchObject({
      kind: 'api',
      metadata: {
        framework: 'nextjs',
        routePath: '/api/orders/[id]',
        routeType: 'api',
        httpMethods: 'GET, POST',
      },
    });
    expect(graph.metadata).toMatchObject({
      languagePlugins: 'javascript-typescript',
      frameworkAdapters: 'nextjs',
      frameworkCapabilities: 'api-handlers, routes, server-actions',
    });
  });

  it('maps static internal fetch calls to detected API routes', async () => {
    const root = await fixture({
      'package.json': nextPackage,
      'src/app/catalog/page.tsx': `export async function publish(){ return fetch('/api/catalog/publish', { method: 'POST' }) }`,
      'src/app/api/catalog/publish/route.ts': `export async function POST(){ return new Response('ok') }`,
    });

    const graph = await scanProjectWithPlugins(root);
    const page = graph.nodes.find((node) => node.path === 'src/app/catalog/page.tsx');
    const api = graph.nodes.find((node) => node.path === 'src/app/api/catalog/publish/route.ts');

    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: page?.id,
        target: api?.id,
        relation: 'calls',
        label: 'POST /api/catalog/publish',
      }),
    ]));
  });

  it('detects file-level and function-level server actions', async () => {
    const root = await fixture({
      'package.json': nextPackage,
      'src/app/catalog/actions.ts': `'use server';\nexport async function publish(){ return true }`,
      'src/app/orders/actions.ts': `export async function save(){ 'use server'; return true }`,
    });

    const graph = await scanProjectWithPlugins(root);
    const catalog = graph.nodes.find((node) => node.path === 'src/app/catalog/actions.ts');
    const orders = graph.nodes.find((node) => node.path === 'src/app/orders/actions.ts');

    expect(catalog?.metadata?.serverActionCount).toBe(1);
    expect(orders?.metadata?.serverActionCount).toBe(1);
  });

  it('does not apply Next.js semantics to a lookalike repo without Next evidence', async () => {
    const root = await fixture({
      'src/app/page.tsx': `export default function Page(){ return null }`,
      'src/app/api/items/route.ts': `export async function GET(){ return new Response('ok') }`,
    });

    const graph = await scanProjectWithPlugins(root);
    const page = graph.nodes.find((node) => node.path === 'src/app/page.tsx');

    expect(page?.kind).toBe('file');
    expect(page?.metadata?.framework).toBeUndefined();
    expect(graph.metadata?.frameworkAdapterCount).toBe(0);
  });

  it('can detect Next.js from a config file when package metadata is unavailable', async () => {
    const root = await fixture({
      'next.config.mjs': `export default {}`,
      'app/page.tsx': `export default function Page(){ return null }`,
    });

    const graph = await scanProjectWithPlugins(root);
    const page = graph.nodes.find((node) => node.path === 'app/page.tsx');

    expect(page).toMatchObject({ kind: 'route', metadata: { framework: 'nextjs', routePath: '/' } });
    expect(graph.metadata?.frameworkAdapters).toBe('nextjs');
  });
});
