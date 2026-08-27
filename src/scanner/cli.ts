import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, type BuildGraphResult } from '../build-graph.js';
import { parseCliOptions } from '../cli-options.js';
import { writeGraphOutput } from '../output.js';
import { watchProject } from '../watch.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archMeshRoot = path.resolve(here, '../..');
const options = parseCliOptions(process.argv.slice(2));
const output = path.join(archMeshRoot, 'public', 'archmesh.json');

function logResult(result: BuildGraphResult, prefix = 'ArchMesh scanned') {
  const { graph, changedPaths, signals } = result;
  console.log(`${prefix} ${graph.project}`);
  console.log(`  ${graph.nodes.length} nodes`);
  console.log(`  ${graph.edges.length} edges`);
  if (changedPaths.length > 0) {
    console.log(`  ${graph.nodes.filter((node) => node.change === 'changed').length} changed nodes`);
    console.log(`  ${graph.nodes.filter((node) => node.change === 'affected').length} affected dependents`);
  }
  if (signals.length > 0) console.log(`  ${signals.length} health signals applied`);
  console.log(`  ${output}`);
}

const initial = await buildGraph(options);
await writeGraphOutput(output, initial.graph);
logResult(initial);

if (options.watch) {
  console.log('ArchMesh is watching the project. Press Ctrl+C to stop.');
  watchProject(options, {
    onBuild: async (result) => {
      await writeGraphOutput(output, result.graph);
      logResult(result, 'ArchMesh refreshed');
    },
    onError: (error) => {
      console.error(`ArchMesh watch rebuild failed: ${error.message}`);
    },
  });
}
