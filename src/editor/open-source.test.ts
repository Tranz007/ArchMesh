import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openSourceFile, resolveSourcePath } from './open-source';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function projectFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-editor-'));
  tempDirs.push(root);
  const source = path.join(root, 'src', 'feature.ts');
  await fs.mkdir(path.dirname(source), { recursive: true });
  await fs.writeFile(source, 'export const feature = true;\n', 'utf8');
  return { root, source };
}

describe('source editor navigation', () => {
  it('resolves project-relative source paths inside the scanned root', async () => {
    const { root, source } = await projectFixture();
    expect(resolveSourcePath(root, 'src/feature.ts')).toBe(source);
  });

  it('rejects traversal outside the scanned project', async () => {
    const { root } = await projectFixture();
    expect(() => resolveSourcePath(root, '../secret.ts')).toThrow('outside the scanned project');
  });

  it('launches an explicit supported editor only after validating the source file', async () => {
    const { root, source } = await projectFixture();
    const launch = vi.fn(async () => undefined);

    const result = await openSourceFile({
      projectRoot: root,
      relativePath: 'src/feature.ts',
      editor: 'cursor',
    }, launch);

    expect(result).toEqual({ absolutePath: source, editor: 'cursor' });
    expect(launch).toHaveBeenCalledWith('cursor', ['--goto', source]);
  });

  it('does not invoke an editor for a missing source file', async () => {
    const { root } = await projectFixture();
    const launch = vi.fn(async () => undefined);

    await expect(openSourceFile({
      projectRoot: root,
      relativePath: 'src/missing.ts',
      editor: 'code',
    }, launch)).rejects.toThrow('does not exist');

    expect(launch).not.toHaveBeenCalled();
  });
});
