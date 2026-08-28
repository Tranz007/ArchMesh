import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ArchGraphData } from '../types.js';
import { applySystemBoundaries, detectSystemBoundaries } from './boundaries.js';

const tempRoots: string[] = [];

async function tempProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-systems-'));
  tempRoots.push(root);
  return root;
}

function graph(paths: string[]): ArchGraphData {
  return {
    project: 'workspace',
    generatedAt: new Date(0).toISOString(),
    nodes: paths.map((pathValue, index) => ({
      id: `file:${pathValue}`,
      label: path.basename(pathValue),
      kind: index === 0 ? 'component' : 'file',
      path: pathValue,
      health: 'healthy',
    })),
    edges: [],
  };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('system boundary detection', () => {
  it('uses npm workspace patterns and package names as architecture boundaries', async () => {
    const root = await tempProject();
    await fs.mkdir(path.join(root, 'apps', 'web'), { recursive: true });
    await fs.mkdir(path.join(root, 'services', 'api'), { recursive: true });
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({
      private: true,
      workspaces: ['apps/*', 'services/*'],
    }));
    await fs.writeFile(path.join(root, 'apps', 'web', 'package.json'), JSON.stringify({ name: '@example/customer-web' }));
    await fs.writeFile(path.join(root, 'services', 'api', 'package.json'), JSON.stringify({ name: '@example/orders-api' }));

    const input = graph([
      'apps/web/src/app.tsx',
      'services/api/src/index.ts',
      'src/shared.ts',
    ]);
    const boundaries = await detectSystemBoundaries(root, input);

    expect(boundaries).toEqual([
      expect.objectContaining({ root: 'apps/web', label: 'Customer Web', type: 'application', source: 'workspace' }),
      expect.objectContaining({ root: 'services/api', label: 'Orders Api', type: 'service', source: 'workspace' }),
    ]);

    const result = await applySystemBoundaries(root, input);
    expect(result.metadata?.systemBoundaryCount).toBe(2);
    expect(result.nodes.find((node) => node.path === 'apps/web/src/app.tsx')?.metadata).toMatchObject({
      systemKey: 'apps-web',
      systemLabel: 'Customer Web',
      systemRoot: 'apps/web',
      systemType: 'application',
      systemSource: 'workspace',
    });
    expect(result.nodes.find((node) => node.path === 'services/api/src/index.ts')?.metadata).toMatchObject({
      systemKey: 'services-api',
      systemLabel: 'Orders Api',
      systemType: 'service',
    });
    expect(result.nodes.find((node) => node.path === 'src/shared.ts')?.metadata?.systemKey).toBeUndefined();
  });

  it('detects conventional service/package roots even without workspace configuration', async () => {
    const root = await tempProject();
    await fs.mkdir(path.join(root, 'services', 'billing'), { recursive: true });
    await fs.mkdir(path.join(root, 'packages', 'ui'), { recursive: true });
    await fs.writeFile(path.join(root, 'services', 'billing', 'pyproject.toml'), '[project]\nname = "billing-api"\n');

    const result = await applySystemBoundaries(root, graph([
      'services/billing/app/main.py',
      'packages/ui/src/Button.tsx',
    ]));

    expect(result.nodes[0].metadata).toMatchObject({
      systemLabel: 'Billing Api',
      systemType: 'service',
      systemSource: 'convention',
    });
    expect(result.nodes[1].metadata).toMatchObject({
      systemLabel: 'Ui',
      systemType: 'package',
      systemSource: 'convention',
    });
  });

  it('supports explicit workspace roots such as frontend and backend', async () => {
    const root = await tempProject();
    await fs.mkdir(path.join(root, 'frontend'), { recursive: true });
    await fs.mkdir(path.join(root, 'backend'), { recursive: true });
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['frontend', 'backend'] }));

    const result = await applySystemBoundaries(root, graph([
      'frontend/src/main.ts',
      'backend/app/main.py',
    ]));

    expect(result.nodes.map((node) => node.metadata?.systemKey)).toEqual(['frontend', 'backend']);
    expect(result.metadata?.systemBoundaryCount).toBe(2);
  });
});
