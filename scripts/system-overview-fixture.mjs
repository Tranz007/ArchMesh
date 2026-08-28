import fs from 'node:fs/promises';

const systemCount = 12;
const integrationCount = 27;
const nodes = [];
const edges = [];

for (let index = 0; index < systemCount; index += 1) {
  nodes.push({
    id: `service:system-${index}`,
    label: `System ${index} Service`,
    kind: 'service',
    path: `apps/system-${index}/service.ts`,
    health: 'healthy',
    change: 'unchanged',
    metadata: {
      systemKey: `system-${index}`,
      systemLabel: `System ${index}`,
      systemType: 'application',
      systemRoot: `apps/system-${index}`,
      systemSource: 'workspace',
    },
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

// Deliberately dense but generic detected-system topology. This forces the same
// system-boundary projection path used by multi-system repositories rather than
// the feature-overview fallback.
for (let index = 0; index < systemCount; index += 1) {
  for (const offset of [1, 3, 5]) {
    edges.push({
      id: `edge:${edgeNumber++}`,
      source: `service:system-${index}`,
      target: `service:system-${(index + offset) % systemCount}`,
      relation: 'imports',
      health: 'healthy',
      change: 'unchanged',
    });
  }
}

const flowDirections = ['source-to-target', 'target-to-source', 'both'];

for (let index = 0; index < systemCount; index += 1) {
  for (const providerOffset of [0, 9, 18]) {
    const provider = (index + providerOffset) % integrationCount;
    edges.push({
      id: `edge:${edgeNumber++}`,
      source: `service:system-${index}`,
      target: `integration:provider-${provider}`,
      relation: 'integrates-with',
      health: 'healthy',
      change: 'unchanged',
      ...(providerOffset === 0
        ? { metadata: { flowDirection: flowDirections[index % flowDirections.length] } }
        : {}),
    });
  }
}

const graph = {
  project: 'System Boundary Fixture',
  generatedAt: new Date().toISOString(),
  nodes,
  edges,
  metadata: { fixture: 'system-boundary-39-dense' },
};

await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/archmesh.json', `${JSON.stringify(graph, null, 2)}\n`);
await fs.writeFile('public/archmesh-drift.json', `${JSON.stringify({ ...graph, nodes: [], edges: [], metadata: { graphKind: 'drift' } }, null, 2)}\n`);
