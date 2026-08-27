import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadHealthSignals } from './load';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('loadHealthSignals', () => {
  it('returns an empty list when the default file is absent', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-health-'));
    tempDirs.push(root);
    await expect(loadHealthSignals(root)).resolves.toEqual([]);
  });

  it('loads validated signals from .archmesh/health.json', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-health-'));
    tempDirs.push(root);
    await fs.mkdir(path.join(root, '.archmesh'), { recursive: true });
    await fs.writeFile(
      path.join(root, '.archmesh', 'health.json'),
      JSON.stringify({
        signals: [
          {
            severity: 'error',
            source: 'runtime',
            message: 'Request failed',
            node: { path: 'src/api.ts' },
          },
        ],
      }),
      'utf8',
    );

    const signals = await loadHealthSignals(root);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ severity: 'error', source: 'runtime' });
  });
});
