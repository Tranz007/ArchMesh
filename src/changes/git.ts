import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function parseNullPaths(output: string) {
  return output
    .split('\0')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/\\/g, '/'));
}

async function gitPaths(projectRoot: string, args: string[]) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return parseNullPaths(stdout);
}

export async function collectWorkingTreeChanges(projectRoot: string) {
  try {
    const [unstaged, staged, untracked] = await Promise.all([
      gitPaths(projectRoot, ['diff', '--name-only', '-z', '--diff-filter=ACMRTUXB']),
      gitPaths(projectRoot, ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMRTUXB']),
      gitPaths(projectRoot, ['ls-files', '--others', '--exclude-standard', '-z']),
    ]);
    return [...new Set([...unstaged, ...staged, ...untracked])].sort();
  } catch {
    return [];
  }
}

export async function collectChangesFromRef(projectRoot: string, baseRef: string) {
  try {
    return [...new Set(await gitPaths(projectRoot, [
      'diff',
      '--name-only',
      '-z',
      '--diff-filter=ACMRTUXB',
      `${baseRef}...HEAD`,
    ]))].sort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to compare Git changes from ${baseRef}: ${message}`);
  }
}
