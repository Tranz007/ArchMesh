import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { configuredFeatureForPath, loadArchMeshConfig } from './config.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('ArchMesh config', () => {
  it('loads feature path mappings and matches globs', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-config-'));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, 'archmesh.config.json'),
      JSON.stringify({
        features: [
          { id: 'story', label: 'Vetttd Story', paths: ['src/app/story/**', 'src/features/story/**'] },
        ],
      }),
      'utf8',
    );

    const config = await loadArchMeshConfig(root);

    expect(configuredFeatureForPath('src/app/story/[id]/page.tsx', config)).toEqual({
      key: 'story',
      label: 'Vetttd Story',
    });
    expect(configuredFeatureForPath('src/app/hiring/page.tsx', config)).toBeUndefined();
  });

  it('fails clearly when the config file contains invalid JSON', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-config-'));
    tempDirs.push(root);
    await fs.writeFile(path.join(root, 'archmesh.config.json'), '{ nope', 'utf8');

    await expect(loadArchMeshConfig(root)).rejects.toThrow('Invalid JSON in archmesh.config.json');
  });
});
