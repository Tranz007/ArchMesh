import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { buildGraph, type BuildGraphResult } from './build-graph.js';
import { parseCliOptions } from './cli-options.js';
import { compareGraphs } from './drift/compare.js';
import { createEmptyDriftGraph } from './drift/empty.js';
import { writeGraphOutput } from './output.js';
import { watchProject } from './watch.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archMeshRoot = path.resolve(here, '..');
const options = parseCliOptions(process.argv.slice(2));
const output = path.join(archMeshRoot, 'public', 'archmesh.json');
const driftOutput = path.join(archMeshRoot, 'public', 'archmesh-drift.json');

function logResult(result: BuildGraphResult, prefix = 'Mapped') {
  const { graph, changedPaths, signals } = result;
  console.log(`${prefix} ${graph.nodes.length} nodes and ${graph.edges.length} connections.`);
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
}

console.log(`\nArchMesh → ${options.target}`);
const initial = await buildGraph(options);
let previousGraph = initial.graph;
await writeGraphOutput(output, initial.graph);
await writeGraphOutput(driftOutput, createEmptyDriftGraph(initial.graph));
logResult(initial);

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

if (options.watch) {
  console.log('Watching project source for architecture changes.');
  watchProject(options, {
    onBuild: async (result) => {
      const drift = compareGraphs(previousGraph, result.graph);
      previousGraph = result.graph;

      await Promise.all([
        writeGraphOutput(output, result.graph),
        writeGraphOutput(driftOutput, drift.graph),
      ]);

      logResult(result, 'Refreshed');
      const totalNodeDrift = drift.summary.addedNodes + drift.summary.removedNodes + drift.summary.modifiedNodes;
      const totalEdgeDrift = drift.summary.addedEdges + drift.summary.removedEdges + drift.summary.modifiedEdges;
      if (totalNodeDrift > 0 || totalEdgeDrift > 0) {
        console.log(
          `Architecture drift: ${drift.summary.addedNodes} added, ${drift.summary.removedNodes} removed, ${drift.summary.modifiedNodes} modified nodes; `
          + `${drift.summary.addedEdges} added, ${drift.summary.removedEdges} removed, ${drift.summary.modifiedEdges} modified connections.`,
        );
      }

      server.ws.send({
        type: 'custom',
        event: 'archmesh:graph',
        data: { generatedAt: result.graph.generatedAt },
      });
    },
    onError: (error) => {
      console.error(`ArchMesh watch rebuild failed: ${error.message}`);
    },
  });
}

console.log('Press Ctrl+C to stop ArchMesh.\n');
