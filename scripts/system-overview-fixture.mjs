import fs from 'node:fs/promises';

const featureCount = 26;
const integrationCount = 12;
const nodes = [];
const edges = [];

for (let index = 0; index < featureCount; index += 1) {
  nodes.push({
    id: `file:area-${index}.ts`,
    label: `Area ${index}`,
    kind: 'service',
    path: `features/area-${index}/service.ts`,
    health: 'healthy',
    change: 'unchanged',
  });
}

for (let index = 0; index < integrationCount; index += 1) {
  nodes.push({
    id: `integration:provider-${index}`,
    label: `Provider ${index}`,
    kind: 'integration',
    health: 'healthy',
    change: 'unchanged',
  });
}

let edgeNumber = 1;

// Deliberately dense but generic feature topology. This is synthetic CI data,
// not modeled after any real repository.
for (let index = 0; index < featureCount; index += 1) {
  for (const offset of [1, 4, 7]) {
    edges.push({
      id: `edge:${edgeNumber++}`,
      source: `file:area-${index}.ts`,
      target: `file:area-${(index + offset) % featureCount}.ts`,
      relation: 'imports',
      health: 'healthy',
      change: 'unchanged',
    });
  }
}

for (let index = 0; index < featureCount; index += 1) {
  for (const providerOffset of [0, 5]) {
    const provider = (index + providerOffset) % integrationCount;
    edges.push({
      id: `edge:${edgeNumber++}`,
      source: `file:area-${index}.ts`,
      target: `integration:provider-${provider}`,
      relation: 'integrates-with',
      health: 'healthy',
      change: 'unchanged',
      ...(index === 3 && providerOffset === 0 ? { metadata: { flowDirection: 'target-to-source' } } : {}),
    });
  }
}

const graph = {
  project: 'System Overview Fixture',
  generatedAt: new Date().toISOString(),
  nodes,
  edges,
  metadata: { fixture: 'system-overview-39-dense' },
};

await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/archmesh.json', `${JSON.stringify(graph, null, 2)}\n`);
await fs.writeFile('public/archmesh-drift.json', `${JSON.stringify({ ...graph, nodes: [], edges: [], metadata: { graphKind: 'drift' } }, null, 2)}\n`);
