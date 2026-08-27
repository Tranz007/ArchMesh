import path from 'node:path';

export interface CliOptions {
  target: string;
  healthPath?: string;
  diagnostics: boolean;
}

export function parseCliOptions(argv: string[], cwd = process.cwd()): CliOptions {
  let target: string | undefined;
  let healthPath: string | undefined;
  let diagnostics = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--diagnostics') {
      diagnostics = true;
      continue;
    }

    if (argument === '--health') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--health requires a file path.');
      healthPath = path.resolve(cwd, value);
      index += 1;
      continue;
    }

    if (argument.startsWith('-')) throw new Error(`Unknown ArchMesh option: ${argument}`);
    if (target) throw new Error(`Only one project path may be scanned. Received: ${argument}`);
    target = path.resolve(cwd, argument);
  }

  return {
    target: target ?? cwd,
    healthPath,
    diagnostics,
  };
}
