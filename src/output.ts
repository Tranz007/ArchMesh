import fs from 'node:fs/promises';
import path from 'node:path';
import type { ArchGraphData } from './types.js';

export async function writeGraphOutput(outputPath: string, graph: ArchGraphData) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
}
