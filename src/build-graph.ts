import { applyChangeImpact } from './changes/apply.js';
import { collectChangesFromRef, collectWorkingTreeChanges } from './changes/git.js';
import type { CliOptions } from './cli-options.js';
import { applyHealthSignals } from './health/apply.js';
import { loadHealthSignals } from './health/load.js';
import type { HealthSignal } from './health/types.js';
import { collectTypeScriptHealthSignals } from './health/typescript.js';
import { scanProjectWithPlugins } from './plugins/orchestrator.js';
import type { ArchGraphData } from './types.js';

export interface BuildGraphResult {
  graph: ArchGraphData;
  changedPaths: string[];
  signals: HealthSignal[];
}

export async function buildGraph(options: CliOptions): Promise<BuildGraphResult> {
  const scanned = await scanProjectWithPlugins(options.target);
  const changedPaths = options.changesFrom
    ? await collectChangesFromRef(options.target, options.changesFrom)
    : options.changes
      ? await collectWorkingTreeChanges(options.target)
      : [];

  const changedGraph = changedPaths.length > 0
    ? applyChangeImpact(scanned, changedPaths)
    : scanned;

  const fileSignals = await loadHealthSignals(options.target, options.healthPath);
  const diagnosticSignals = options.diagnostics
    ? collectTypeScriptHealthSignals(options.target)
    : [];
  const signals = [...fileSignals, ...diagnosticSignals];

  return {
    graph: applyHealthSignals(changedGraph, signals),
    changedPaths,
    signals,
  };
}
