import path from 'node:path';

export interface CliOptions {
  target: string;
  healthPath?: string;
  diagnostics: boolean;
  changes: boolean;
  changesFrom?: string;
}

export function parseCliOptions(argv: string[], cwd = process.cwd()): CliOptions {
  let target: string | undefined;
  let healthPath: string | undefined;
  let diagnostics = false;
  let changes = false;
  let changesFrom: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--diagnostics') {
      diagnostics = true;
      continue;
    }

    if (argument === '--changes') {
      changes = true;
      continue;
    }

    if (argument === '--changes-from') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--changes-from requires a Git ref.');
      changesFrom = value;
      index += 1;
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

  if (changes && changesFrom) {
    throw new Error('Use either --changes or --changes-from, not both.');
  }

  return {
    target: target ?? cwd,
    healthPath,
    diagnostics,
    changes,
    changesFrom,
  };
}
