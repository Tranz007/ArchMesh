import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SourceAnalysisCache } from './analysis-cache.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function tempFile(content = 'one') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-cache-'));
  tempDirs.push(root);
  const file = path.join(root, 'source.ts');
  await fs.writeFile(file, content, 'utf8');
  return { root, file };
}

describe('SourceAnalysisCache', () => {
  it('reuses analysis while the filesystem signature is unchanged', async () => {
    const { file } = await tempFile();
    const cache = new SourceAnalysisCache<string>();
    const analyze = vi.fn(async (filePath: string) => fs.readFile(filePath, 'utf8'));

    const first = await cache.get(file, analyze);
    const second = await cache.get(file, analyze);

    expect(first).toEqual({ value: 'one', hit: false });
    expect(second).toEqual({ value: 'one', hit: true });
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(cache.stats()).toMatchObject({ entries: 1, hits: 1, misses: 1 });
  });

  it('reanalyzes when the source file changes', async () => {
    const { file } = await tempFile('one');
    const cache = new SourceAnalysisCache<string>();
    const analyze = vi.fn(async (filePath: string) => fs.readFile(filePath, 'utf8'));

    await cache.get(file, analyze);
    await fs.writeFile(file, 'two-two', 'utf8');
    const result = await cache.get(file, analyze);

    expect(result).toEqual({ value: 'two-two', hit: false });
    expect(analyze).toHaveBeenCalledTimes(2);
    expect(cache.stats().misses).toBe(2);
  });

  it('supports explicit invalidation from watch events', async () => {
    const { file } = await tempFile();
    const cache = new SourceAnalysisCache<string>();
    const analyze = vi.fn(async () => 'analysis');

    await cache.get(file, analyze);
    expect(cache.invalidate(file)).toBe(true);
    await cache.get(file, analyze);

    expect(analyze).toHaveBeenCalledTimes(2);
    expect(cache.stats().invalidations).toBe(1);
  });

  it('prunes entries for deleted or no-longer-scanned files', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-cache-'));
    tempDirs.push(root);
    const first = path.join(root, 'first.ts');
    const second = path.join(root, 'second.ts');
    await fs.writeFile(first, 'first', 'utf8');
    await fs.writeFile(second, 'second', 'utf8');

    const cache = new SourceAnalysisCache<string>();
    await cache.get(first, async () => 'first');
    await cache.get(second, async () => 'second');

    expect(cache.retain([second])).toBe(1);
    expect(cache.has(first)).toBe(false);
    expect(cache.has(second)).toBe(true);
    expect(cache.stats()).toMatchObject({ entries: 1, pruned: 1 });
  });
});
