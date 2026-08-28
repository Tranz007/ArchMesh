import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { EditorPreference } from './editor/open-source.js';

const EDITORS = new Set<EditorPreference>(['auto', 'cursor', 'code', 'zed']);

export interface GuidedOnboardingAnswers {
  target: string;
  watch: boolean;
  editor: EditorPreference;
}

export function shouldRunGuidedOnboarding(
  argv: string[],
  stdinIsTTY = Boolean(process.stdin.isTTY),
  stdoutIsTTY = Boolean(process.stdout.isTTY),
) {
  const requested = argv.length === 0 || argv.includes('--guided');
  return requested && stdinIsTTY && stdoutIsTTY;
}

export function parseYesNo(value: string, defaultValue: boolean) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (['y', 'yes'].includes(normalized)) return true;
  if (['n', 'no'].includes(normalized)) return false;
  return defaultValue;
}

export function normalizeEditor(value: string): EditorPreference {
  const normalized = value.trim().toLowerCase() as EditorPreference;
  return EDITORS.has(normalized) ? normalized : 'auto';
}

export function guidedArgsFromAnswers(answers: GuidedOnboardingAnswers) {
  const args = [answers.target];
  if (answers.watch) args.push('--watch');
  if (answers.editor !== 'auto') args.push('--editor', answers.editor);
  return args;
}

export async function runGuidedOnboarding(cwd = process.cwd()) {
  const rl = createInterface({ input, output });

  console.log(`\nArchMesh guided start`);
  console.log('Map a codebase visually. Your source stays on this machine.\n');

  try {
    const projectAnswer = await rl.question(`Project folder [${cwd}]: `);
    const target = path.resolve(cwd, projectAnswer.trim() || '.');

    const watchAnswer = await rl.question('Keep the map live while the code changes? [Y/n]: ');
    const watch = parseYesNo(watchAnswer, true);

    const editorAnswer = await rl.question('Open source with auto, cursor, code, or zed [auto]: ');
    const editor = normalizeEditor(editorAnswer);

    console.log('\nGot it. ArchMesh will scan locally and open the visual map.');
    if (watch) console.log('Live mode is on, so the map will refresh as the project changes.');

    return guidedArgsFromAnswers({ target, watch, editor });
  } finally {
    rl.close();
  }
}
