import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProject } from './scan.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-'));
  tempDirs.push(root);
  await Promise.all(
    Object.entries(files).map(async ([relative, content]) => {
      const destination = path.join(root, relative);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, content, 'utf8');
    }),
  );
  return root;
}

describe('scanProject', () => {
  it('maps relative imports and known integrations', async () => {
    const root = await fixture({
      'src/app/page.tsx': `import { Card } from '../components/Card';\nimport Stripe from 'stripe';\nexport default function Page(){ return <Card /> }`,
      'src/components/Card.tsx': `export function Card(){ return <div>Card</div> }`,
    });

    const graph = await scanProject(root);

    const page = graph.nodes.find((node) => node.path === 'src/app/page.tsx');
    const card = graph.nodes.find((node) => node.path === 'src/components/Card.tsx');
    const stripe = graph.nodes.find((node) => node.id === 'integration:stripe');

    expect(page?.kind).toBe('route');
    expect(card?.kind).toBe('component');
    expect(stripe?.kind).toBe('integration');
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: page?.id, target: card?.id, relation: 'imports' }),
        expect.objectContaining({ source: page?.id, target: 'integration:stripe', relation: 'integrates-with' }),
      ]),
    );
  });

  it('resolves TypeScript path aliases to local files', async () => {
    const root = await fixture({
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@/*': ['src/*'] },
          moduleResolution: 'Bundler',
          module: 'ESNext',
        },
      }),
      'src/app/page.tsx': `import { Card } from '@/components/Card';\nexport default function Page(){ return <Card /> }`,
      'src/components/Card.tsx': `export function Card(){ return <div>Card</div> }`,
    });

    const graph = await scanProject(root);
    const page = graph.nodes.find((node) => node.path === 'src/app/page.tsx');
    const card = graph.nodes.find((node) => node.path === 'src/components/Card.tsx');

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: page?.id, target: card?.id, relation: 'imports' }),
      ]),
    );
  });

  it('detects dynamic imports nested inside code', async () => {
    const root = await fixture({
      'src/load.ts': `export async function load(){ return import('./feature') }`,
      'src/feature.ts': `export const feature = true`,
    });

    const graph = await scanProject(root);
    const source = graph.nodes.find((node) => node.path === 'src/load.ts');
    const target = graph.nodes.find((node) => node.path === 'src/feature.ts');

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: source?.id, target: target?.id, relation: 'imports' }),
      ]),
    );
  });

  it('ignores generated and dependency directories', async () => {
    const root = await fixture({
      'src/index.ts': `export const value = 1`,
      'node_modules/pkg/index.ts': `export const dependency = true`,
      '.next/generated.ts': `export const generated = true`,
    });

    const graph = await scanProject(root);
    const paths = graph.nodes.map((node) => node.path).filter(Boolean);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('node_modules/pkg/index.ts');
    expect(paths).not.toContain('.next/generated.ts');
  });
});
