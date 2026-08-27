import path from 'node:path';
import ts from 'typescript';
import type { HealthSignal } from './types.js';

function normalizePath(value: string) {
  return value.replace(/\\/g, '/');
}

export function collectTypeScriptHealthSignals(projectRoot: string): HealthSignal[] {
  const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) return [];

  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) return [];

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: { ...parsed.options, noEmit: true },
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const signals: HealthSignal[] = [];

  for (const diagnostic of diagnostics) {
    if (!diagnostic.file) continue;
    if (diagnostic.category !== ts.DiagnosticCategory.Error && diagnostic.category !== ts.DiagnosticCategory.Warning) continue;

    const absolute = path.resolve(diagnostic.file.fileName);
    const relative = path.relative(projectRoot, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;

    signals.push({
      id: `typescript:${diagnostic.code}:${normalizePath(relative)}:${diagnostic.start ?? 0}`,
      severity: diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      source: 'typescript',
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      node: { path: normalizePath(relative) },
    });
  }

  return signals;
}
