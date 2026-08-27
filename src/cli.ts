import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { applyChangeImpact } from './changes/apply.js';
import { collectChangesFromRef, collectWorkingTreeChanges } from './changes/git.js';
import { parseCliOptions } from './cli-options.js';
import { applyHealthSignals } from './health/apply.js';
import { loadHealthSignals } from './health/load.js';
import { collectTypeScriptHealthSignals } from './health/typescript.js';
import { scanProject } from './scanner/scan.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archMeshRoot = path.resolve(here, '..');
const options = parseCliOptions(process.argv.slice(2));
const output = path.join(archMeshRoot, 'public', 'archmesh.json');

console.log(`\nArchMesh → ${options.target}`);
const scanned = await scanProject(options.target);
const changedPaths = options.changesFrom
  ? await collectChangesFromRef(options.target, options.changesFrom)
  : options.changes
    ? await collectWorkingTreeChanges(options.target)
    : [];
const changedGraph = changedPaths.length > 0 ? applyChangeImpact(scanned, changedPaths) : scanned;
const fileSignals = await loadHealthSignals(options.target, options.healthPath);
const diagnosticSignals = options.diagnostics ? collectTypeScriptHealthSignals(options.target) : [];
const signals = [...fileSignals, ...diagnosticSignals];
const graph = applyHealthSignals(changedGraph, signals);

await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
console.log(`Mapped ${graph.nodes.length} nodes and ${graph.edges.length} connections.`);
if (changedPaths.length > 0) {
  const changed = graph.nodes.filter((node) => node.change === 'changed').length;
  const affected = graph.nodes.filter((node) => node.change === 'affected').length;
  console.log(`Mapped ${changed} changed nodes and ${affected} affected dependents.`);
}
if (signals.length > 0) {
  const errors = signals.filter((signal) => signal.severity === 'error').length;
  const warnings = signals.length - errors;
  console.log(`Applied ${signals.length} health signals (${errors} errors, ${warnings} warnings).`);
}

const server = await createServer({
  root: archMeshRoot,
  server: {
    port: 4242,
    strictPort: true,
    open: true,
  },
});

await server.listen();
server.printUrls();
console.log('Press Ctrl+C to stop ArchMesh.\n');
