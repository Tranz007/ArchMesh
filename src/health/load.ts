import fs from 'node:fs/promises';
import path from 'node:path';
import type { HealthSignal } from './types.js';

function validNodeRef(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const ref = value as Record<string, unknown>;
  return (typeof ref.id === 'string' && ref.id.length > 0)
    || (typeof ref.path === 'string' && ref.path.length > 0);
}

function validSignal(value: unknown): value is HealthSignal {
  if (!value || typeof value !== 'object') return false;
  const signal = value as Record<string, unknown>;
  if (signal.severity !== 'warning' && signal.severity !== 'error') return false;
  if (typeof signal.source !== 'string' || signal.source.length === 0) return false;
  if (typeof signal.message !== 'string' || signal.message.length === 0) return false;

  const nodeValid = signal.node === undefined || validNodeRef(signal.node);
  const edgeValid = signal.edge === undefined
    || (Boolean(signal.edge)
      && typeof signal.edge === 'object'
      && validNodeRef((signal.edge as Record<string, unknown>).source)
      && validNodeRef((signal.edge as Record<string, unknown>).target));

  return nodeValid && edgeValid && (signal.node !== undefined || signal.edge !== undefined);
}

export async function loadHealthSignals(projectRoot: string, explicitPath?: string) {
  const healthPath = explicitPath
    ? path.resolve(explicitPath)
    : path.join(projectRoot, '.archmesh', 'health.json');

  try {
    const raw = await fs.readFile(healthPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const values = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).signals)
        ? (parsed as { signals: unknown[] }).signals
        : undefined;

    if (!values) throw new Error('Health file must be an array or an object with a signals array.');
    const signals = values.filter(validSignal);
    if (signals.length !== values.length) {
      throw new Error('Health file contains one or more invalid signals.');
    }
    return signals;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' && !explicitPath) return [];
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in health file: ${error.message}`);
    throw error;
  }
}
