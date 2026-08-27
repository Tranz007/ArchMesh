#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { buildGraph, type BuildGraphResult } from './build-graph.js';
import { parseCliOptions } from './cli-options.js';
import { compareGraphs } from './drift/compare.js';
import { createEmptyDriftGraph } from './drift/empty.js';
import { sourceEditorPlugin } from './editor/plugin.js';
import { writeGraphOutput } from './output.js';
import { watchProject } from './watch.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archMeshRoot = path.resolve(here, '..');
const rawArgs = process.argv.slice(2);

function printHelp() {
  console.log(`
ArchMesh — local-first visual software architecture explorer

Usage:
  archmesh [project] [options]

Examples:
  archmesh .
  archmesh /path/to/project --watch
  archmesh . --changes --diagnostics
  archmesh . --changes-from main
  archmesh . --editor cursor

Options:
  --watch                Rebuild when supported source/config files change
  --changes              Highlight working-tree changes and affected dependents
  --changes-from <ref>   Compare source changes against a Git base ref
  --diagnostics          Overlay TypeScript compiler diagnostics
  --health <file>        Load health signals from an explicit JSON file
  --editor <name>        Source editor: auto, cursor, code, or zed
  -h, --help             Show this help
  -v, --version          Show the ArchMesh package version
`);
}

if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (rawArgs.includes('--version') || rawArgs.includes('-v')) {
  const packageJson = JSON.parse(await fs.readFile(path.join(archMeshRoot, 'package.json'), 'utf8')) as { version?: string };
  console.log(packageJson.version ?? 'unknown');
  process.exit(0);
}

const options = parseCliOptions(rawArgs);
const runtimeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-'));
const publicDir = path.join(runtimeRoot, 'public');
const output = path.join(publicDir, 'archmesh.json');
const driftOutput = path.join(publicDir, 'archmesh-drift.json');
await fs.mkdir(publicDir, { recursive: true });

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
  publicDir,
  plugins: [sourceEditorPlugin(options.target, options.editor)],
  server: {
    port: 4242,
    strictPort: true,
    open: true,
  },
});

await server.listen();
server.printUrls();

let watcherHandle: ReturnType<typeof watchProject> | undefined;

if (options.watch) {
  console.log('Watching project source for architecture changes.');
  watcherHandle = watchProject(options, {
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

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  watcherHandle?.close();
  await server.close();
  await fs.rm(runtimeRoot, { recursive: true, force: true });
  process.exit(0);
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

console.log('Press Ctrl+C to stop ArchMesh.\n');
