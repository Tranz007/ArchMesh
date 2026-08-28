import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProjectWithPlugins } from '../orchestrator.js';
import { javascriptTypeScriptPlugin } from './javascript-typescript.js';
import { pythonPlugin, scanPythonProject } from './python.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(prefix: string, files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `archmesh-python-${prefix}-`));
  tempDirs.push(root);
  await Promise.all(Object.entries(files).map(async ([relative, content]) => {
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, 'utf8');
  }));
  return root;
}

describe('Python language plugin', () => {
  it('maps src-layout modules, local imports, generic service/data roles, and known integrations', async () => {
    const root = await fixture('structure', {
      'src/shop/__init__.py': '',
      'src/shop/main.py': `from shop.services.orders import OrdersService\n\ndef run():\n    return OrdersService()\n`,
      'src/shop/services/__init__.py': '',
      'src/shop/services/orders.py': `from shop.models.order import Order\nimport stripe\n\nclass OrdersService:\n    def create(self):\n        return Order()\n`,
      'src/shop/models/__init__.py': '',
      'src/shop/models/order.py': `class Order:\n    pass\n`,
    });

    const graph = await scanPythonProject(root);
    const main = graph.nodes.find((node) => node.path === 'src/shop/main.py');
    const service = graph.nodes.find((node) => node.path === 'src/shop/services/orders.py');
    const model = graph.nodes.find((node) => node.path === 'src/shop/models/order.py');
    const stripe = graph.nodes.find((node) => node.id === 'integration:stripe');

    expect(main?.metadata).toMatchObject({ language: 'python', functionCount: 1 });
    expect(service?.kind).toBe('service');
    expect(service?.metadata).toMatchObject({ language: 'python', classCount: 1, functionCount: 1 });
    expect(model?.kind).toBe('data');
    expect(stripe?.kind).toBe('integration');
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: main?.id, target: service?.id, relation: 'imports' }),
      expect.objectContaining({ source: service?.id, target: model?.id, relation: 'imports' }),
      expect.objectContaining({ source: service?.id, target: stripe?.id, relation: 'integrates-with' }),
    ]));
  });

  it('resolves relative package imports without inventing external dependencies', async () => {
    const root = await fixture('relative', {
      'app/__init__.py': '',
      'app/services/__init__.py': '',
      'app/services/orders.py': `from .repository import OrdersRepository\nfrom ..models import Order\n`,
      'app/services/repository.py': `class OrdersRepository:\n    pass\n`,
      'app/models.py': `class Order:\n    pass\n`,
    });

    const graph = await scanPythonProject(root);
    const service = graph.nodes.find((node) => node.path === 'app/services/orders.py');
    const repository = graph.nodes.find((node) => node.path === 'app/services/repository.py');
    const models = graph.nodes.find((node) => node.path === 'app/models.py');

    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: service?.id, target: repository?.id, relation: 'imports' }),
      expect.objectContaining({ source: service?.id, target: models?.id, relation: 'imports' }),
    ]));
  });

  it('ignores virtual environments, caches, and build output', async () => {
    const root = await fixture('ignored', {
      'app.py': 'value = 1\n',
      '.venv/lib/site.py': 'ignored = True\n',
      'venv/lib/other.py': 'ignored = True\n',
      '__pycache__/cached.py': 'ignored = True\n',
      'build/generated.py': 'ignored = True\n',
    });

    const graph = await scanPythonProject(root);
    expect(graph.nodes.map((node) => node.path)).toEqual(['app.py']);
  });

  it('merges Python and JavaScript/TypeScript evidence in one mixed repository', async () => {
    const root = await fixture('mixed', {
      'web/app.ts': `export const web = true`,
      'api/main.py': `from .service import OrdersService\n`,
      'api/service.py': `class OrdersService:\n    pass\n`,
    });

    const graph = await scanProjectWithPlugins(root, {
      languagePlugins: [javascriptTypeScriptPlugin, pythonPlugin],
      frameworkAdapters: [],
    });

    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'web/app.ts' }),
      expect.objectContaining({ path: 'api/main.py' }),
      expect.objectContaining({ path: 'api/service.py' }),
    ]));
    expect(graph.metadata).toMatchObject({
      languagePluginCount: 2,
      languagePlugins: 'javascript-typescript, python',
    });
  });
});
