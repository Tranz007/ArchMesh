import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyChangeImpact } from '../changes/apply.js';
import { collectChangesFromRef, collectWorkingTreeChanges } from '../changes/git.js';
import { parseCliOptions } from '../cli-options.js';
import { applyHealthSignals } from '../health/apply.js';
import { loadHealthSignals } from '../health/load.js';
import { collectTypeScriptHealthSignals } from '../health/typescript.js';
import { scanProject } from './scan.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archMeshRoot = path.resolve(here, '../..');
const options = parseCliOptions(process.argv.slice(2));
const output = path.join(archMeshRoot, 'public', 'archmesh.json');

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

console.log(`ArchMesh scanned ${graph.project}`);
console.log(`  ${graph.nodes.length} nodes`);
console.log(`  ${graph.edges.length} edges`);
if (changedPaths.length > 0) {
  console.log(`  ${graph.nodes.filter((node) => node.change === 'changed').length} changed nodes`);
  console.log(`  ${graph.nodes.filter((node) => node.change === 'affected').length} affected dependents`);
}
if (signals.length > 0) console.log(`  ${signals.length} health signals applied`);
console.log(`  ${output}`);
