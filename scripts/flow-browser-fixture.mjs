import fs from 'node:fs/promises';

const graph = {
  project: 'Flow Fixture',
  generatedAt: new Date().toISOString(),
  nodes: [
    { id: 'app', label: 'App', kind: 'service', health: 'healthy', change: 'unchanged' },
    { id: 'api', label: 'API', kind: 'api', health: 'healthy', change: 'unchanged' },
    { id: 'data', label: 'Data', kind: 'data', health: 'healthy', change: 'unchanged' },
    { id: 'provider', label: 'Provider', kind: 'integration', health: 'healthy', change: 'unchanged' },
  ],
  edges: [
    { id: 'call', source: 'app', target: 'api', relation: 'calls', health: 'healthy', change: 'unchanged' },
    { id: 'read', source: 'api', target: 'data', relation: 'reads', health: 'healthy', change: 'unchanged' },
    {
      id: 'provider-both',
      source: 'api',
      target: 'provider',
      relation: 'integrates-with',
      health: 'healthy',
      change: 'unchanged',
      metadata: { flowDirection: 'both' },
    },
  ],
  metadata: { fixture: 'flow-browser' },
};

await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/archmesh.json', `${JSON.stringify(graph, null, 2)}\n`);
await fs.writeFile('public/archmesh-drift.json', `${JSON.stringify({ ...graph, nodes: [], edges: [], metadata: { graphKind: 'drift' } }, null, 2)}\n`);
