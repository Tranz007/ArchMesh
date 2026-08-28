import fs from 'node:fs/promises';

const featureCount = 26;
const integrationCount = 12;
const nodes = [];
const edges = [];

for (let index = 0; index < featureCount; index += 1) {
  nodes.push({
    id: `file:feature-${index}`,
    label: `Feature ${index}`,
    kind: 'route',
    path: `app/feature-${index}/page.tsx`,
    health: 'healthy',
    change: 'unchanged',
    metadata: { language: 'typescript' },
  });
}

for (let index = 0; index < integrationCount; index += 1) {
  nodes.push({
    id: `integration:provider-${index}`,
    label: `Provider ${index}`,
    kind: 'integration',
    health: 'healthy',
    change: 'unchanged',
    metadata: { provider: `Provider ${index}` },
  });
}

let edgeNumber = 1;
for (let index = 0; index < featureCount - 1; index += 1) {
  edges.push({
    id: `edge:${edgeNumber++}`,
    source: `file:feature-${index}`,
    target: `file:feature-${index + 1}`,
    relation: 'imports',
    health: 'healthy',
    change: 'unchanged',
  });
}

for (let index = 0; index < integrationCount; index += 1) {
  edges.push({
    id: `edge:${edgeNumber++}`,
    source: `file:feature-${index % featureCount}`,
    target: `integration:provider-${index}`,
    relation: 'integrates-with',
    health: 'healthy',
    change: 'unchanged',
  });
}

const graph = {
  project: 'Fallback Fixture',
  generatedAt: new Date().toISOString(),
  nodes,
  edges,
  metadata: { fixture: 'system-overview-39' },
};

await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/archmesh.json', `${JSON.stringify(graph, null, 2)}\n`);
await fs.writeFile('public/archmesh-drift.json', `${JSON.stringify({ ...graph, nodes: [], edges: [], metadata: { graphKind: 'drift' } }, null, 2)}\n`);
