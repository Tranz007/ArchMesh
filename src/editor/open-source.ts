import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export type EditorPreference = 'auto' | 'cursor' | 'code' | 'zed';

export interface OpenSourceRequest {
  projectRoot: string;
  relativePath: string;
  editor?: EditorPreference;
}

export interface OpenSourceResult {
  absolutePath: string;
  editor: Exclude<EditorPreference, 'auto'>;
}

function resolveInsideProject(projectRoot: string, relativePath: string) {
  const root = path.resolve(projectRoot);
  const absolutePath = path.resolve(root, relativePath);
  const relative = path.relative(root, absolutePath);

  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return absolutePath;
  }

  throw new Error('Requested source path is outside the scanned project.');
}

async function assertSourceFile(absolutePath: string) {
  const stat = await fs.stat(absolutePath).catch(() => undefined);
  if (!stat?.isFile()) throw new Error('Requested source file does not exist.');
}

function detectedEditor() {
  const hints = [
    process.env.VSCODE_GIT_ASKPASS_NODE,
    process.env.VSCODE_IPC_HOOK_CLI,
    process.env.TERM_PROGRAM,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (hints.includes('cursor')) return 'cursor' as const;
  if (hints.includes('vscode') || hints.includes('visual studio code')) return 'code' as const;
  if (hints.includes('zed')) return 'zed' as const;
  return undefined;
}

function editorCandidates(preference: EditorPreference): Array<Exclude<EditorPreference, 'auto'>> {
  if (preference !== 'auto') return [preference];
  const detected = detectedEditor();
  return [...new Set([detected, 'cursor', 'code', 'zed'].filter(Boolean))] as Array<Exclude<EditorPreference, 'auto'>>;
}

function commandFor(editor: Exclude<EditorPreference, 'auto'>, absolutePath: string) {
  if (editor === 'zed') return { command: 'zed', args: [absolutePath] };
  return { command: editor, args: ['--goto', absolutePath] };
}

function spawnDetached(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

export async function openSourceFile({
  projectRoot,
  relativePath,
  editor = 'auto',
}: OpenSourceRequest): Promise<OpenSourceResult> {
  if (!relativePath || relativePath.includes('\0')) throw new Error('A source path is required.');

  const absolutePath = resolveInsideProject(projectRoot, relativePath);
  await assertSourceFile(absolutePath);

  const errors: string[] = [];
  for (const candidate of editorCandidates(editor)) {
    const { command, args } = commandFor(candidate, absolutePath);
    try {
      await spawnDetached(command, args);
      return { absolutePath, editor: candidate };
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `No supported editor CLI could be opened. Install the Cursor, VS Code, or Zed command-line launcher${errors.length ? ` (${errors.join('; ')})` : ''}.`,
  );
}
