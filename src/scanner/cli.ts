import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanProject } from './scan.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const archMeshRoot = path.resolve(here, '../..');
const target = path.resolve(process.argv[2] ?? process.cwd());
const output = path.join(archMeshRoot, 'public', 'archmesh.json');

const graph = await scanProject(target);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');

console.log(`ArchMesh scanned ${graph.project}`);
console.log(`  ${graph.nodes.length} nodes`);
console.log(`  ${graph.edges.length} edges`);
console.log(`  ${output}`);
