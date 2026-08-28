import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProject } from './scan.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(prefix: string, files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `archmesh-${prefix}-`));
  tempDirs.push(root);
  await Promise.all(Object.entries(files).map(async ([relative, content]) => {
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, 'utf8');
  }));
  return root;
}

describe('documented Structural framework baseline', () => {
  it('produces a useful React + Vite source and HTTP graph', async () => {
    const root = await fixture('vite', {
      'src/main.tsx': `import { App } from './App'; export const root = App;`,
      'src/App.tsx': `import { loadCatalog } from './services/catalog'; export function App(){ void loadCatalog(); return null }`,
      'src/services/catalog.ts': `export async function loadCatalog(){ return fetch('https://catalog.example.com/items') }`,
    });

    const graph = await scanProject(root);
    const main = graph.nodes.find((node) => node.path === 'src/main.tsx');
    const app = graph.nodes.find((node) => node.path === 'src/App.tsx');
    const service = graph.nodes.find((node) => node.path === 'src/services/catalog.ts');
    const external = graph.nodes.find((node) => node.id === 'integration:http:catalog.example.com');

    expect(app?.kind).toBe('component');
    expect(service?.kind).toBe('service');
    expect(external?.kind).toBe('integration');
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: main?.id, target: app?.id, relation: 'imports' }),
      expect.objectContaining({ source: app?.id, target: service?.id, relation: 'imports' }),
      expect.objectContaining({ source: service?.id, target: external?.id, relation: 'calls' }),
    ]));
  });

  it('produces a useful Angular TypeScript component/service graph without inventing Angular runtime semantics', async () => {
    const root = await fixture('angular', {
      'src/app/app.component.ts': `import { OrdersService } from './orders.service'; export class AppComponent { constructor(readonly orders: OrdersService) {} }`,
      'src/app/orders.service.ts': `import { OrdersRepository } from './orders.repository'; export class OrdersService { constructor(readonly repo: OrdersRepository) {} }`,
      'src/app/orders.repository.ts': `export class OrdersRepository { list(){ return [] } }`,
    });

    const graph = await scanProject(root);
    const component = graph.nodes.find((node) => node.path === 'src/app/app.component.ts');
    const service = graph.nodes.find((node) => node.path === 'src/app/orders.service.ts');
    const repository = graph.nodes.find((node) => node.path === 'src/app/orders.repository.ts');

    expect(component?.kind).toBe('component');
    expect(service?.kind).toBe('service');
    expect(repository?.kind).toBe('service');
    expect(component?.metadata?.framework).toBeUndefined();
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: component?.id, target: service?.id, relation: 'imports' }),
      expect.objectContaining({ source: service?.id, target: repository?.id, relation: 'imports' }),
    ]));
  });

  it('produces a useful Node.js service/repository graph', async () => {
    const root = await fixture('node', {
      'src/index.ts': `import { OrdersService } from './services/orders.service'; export const orders = new OrdersService();`,
      'src/services/orders.service.ts': `import { OrdersRepository } from '../repositories/orders.repository'; export class OrdersService { repo = new OrdersRepository() }`,
      'src/repositories/orders.repository.ts': `export class OrdersRepository { async list(){ return fetch('https://data.example.com/orders') } }`,
    });

    const graph = await scanProject(root);
    const entry = graph.nodes.find((node) => node.path === 'src/index.ts');
    const service = graph.nodes.find((node) => node.path === 'src/services/orders.service.ts');
    const repository = graph.nodes.find((node) => node.path === 'src/repositories/orders.repository.ts');
    const external = graph.nodes.find((node) => node.id === 'integration:http:data.example.com');

    expect(service?.kind).toBe('service');
    expect(repository?.kind).toBe('service');
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: entry?.id, target: service?.id, relation: 'imports' }),
      expect.objectContaining({ source: service?.id, target: repository?.id, relation: 'imports' }),
      expect.objectContaining({ source: repository?.id, target: external?.id, relation: 'calls' }),
    ]));
  });
});
