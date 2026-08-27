import fs from 'node:fs';
import path from 'node:path';
import type { CliOptions } from './cli-options.js';
import { buildGraph, type BuildGraphResult } from './build-graph.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORED_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
]);

function normalize(value: string) {
  return value.replace(/\\/g, '/');
}

export function shouldWatchPath(filename: string) {
  const normalized = normalize(filename);
  const parts = normalized.split('/').filter(Boolean);
  if (parts.some((part) => IGNORED_SEGMENTS.has(part))) return false;
  if (normalized === 'public/archmesh.json') return false;

  const basename = path.posix.basename(normalized);
  if (
    basename === 'tsconfig.json'
    || basename === 'jsconfig.json'
    || basename === 'archmesh.config.json'
    || basename === 'package.json'
    || normalized === '.archmesh/health.json'
  ) {
    return true;
  }

  return SOURCE_EXTENSIONS.has(path.posix.extname(normalized));
}

export interface WatchProjectOptions {
  debounceMs?: number;
  onBuild: (result: BuildGraphResult) => Promise<void> | void;
  onError?: (error: Error) => void;
}

export function watchProject(
  options: CliOptions,
  { debounceMs = 250, onBuild, onError }: WatchProjectOptions,
) {
  let timer: NodeJS.Timeout | undefined;
  let rebuilding = false;
  let pending = false;
  let closed = false;

  const runBuild = async () => {
    if (closed) return;
    if (rebuilding) {
      pending = true;
      return;
    }

    rebuilding = true;
    try {
      const result = await buildGraph(options);
      await onBuild(result);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      rebuilding = false;
      if (pending && !closed) {
        pending = false;
        void runBuild();
      }
    }
  };

  const schedule = () => {
    if (closed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void runBuild(), debounceMs);
  };

  const watcher = fs.watch(options.target, { recursive: true }, (_eventType, filename) => {
    if (!filename) {
      schedule();
      return;
    }
    if (!shouldWatchPath(String(filename))) return;
    schedule();
  });

  watcher.on('error', (error) => onError?.(error));

  return {
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      watcher.close();
    },
  };
}
