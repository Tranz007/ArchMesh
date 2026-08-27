import { describe, expect, it } from 'vitest';
import { shouldWatchPath } from './watch';

describe('shouldWatchPath', () => {
  it('watches source and ArchMesh-relevant project configuration', () => {
    expect(shouldWatchPath('src/app/page.tsx')).toBe(true);
    expect(shouldWatchPath('src/services/story.ts')).toBe(true);
    expect(shouldWatchPath('tsconfig.json')).toBe(true);
    expect(shouldWatchPath('archmesh.config.json')).toBe(true);
    expect(shouldWatchPath('.archmesh/health.json')).toBe(true);
  });

  it('ignores generated, vendor, git, and ArchMesh output paths', () => {
    expect(shouldWatchPath('node_modules/pkg/index.js')).toBe(false);
    expect(shouldWatchPath('.git/index')).toBe(false);
    expect(shouldWatchPath('.next/server/app.js')).toBe(false);
    expect(shouldWatchPath('public/archmesh.json')).toBe(false);
    expect(shouldWatchPath('README.md')).toBe(false);
  });
});
