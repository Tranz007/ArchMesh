import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { scanProject } from './scanner/scan.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archMeshRoot = path.resolve(here, '..');
const target = path.resolve(process.argv[2] ?? process.cwd());
const output = path.join(archMeshRoot, 'public', 'archmesh.json');

console.log(`\nArchMesh → ${target}`);
const graph = await scanProject(target);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
console.log(`Mapped ${graph.nodes.length} nodes and ${graph.edges.length} connections.`);

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
