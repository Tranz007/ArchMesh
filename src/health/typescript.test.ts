import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectTypeScriptHealthSignals } from './typescript';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('collectTypeScriptHealthSignals', () => {
  it('maps compiler errors back to project-relative source files', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-ts-health-'));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, include: ['src'] }),
      'utf8',
    );
    await fs.mkdir(path.join(root, 'src'));
    await fs.writeFile(path.join(root, 'src', 'broken.ts'), `const value: string = 42;\n`, 'utf8');

    const signals = collectTypeScriptHealthSignals(root);

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          source: 'typescript',
          node: { path: 'src/broken.ts' },
        }),
      ]),
    );
  });
});
