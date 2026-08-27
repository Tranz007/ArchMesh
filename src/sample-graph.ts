import type { ArchGraphData } from './types';

export const sampleGraph: ArchGraphData = {
  project: 'ArchMesh Demo',
  generatedAt: new Date().toISOString(),
  nodes: [
    { id: 'vetttd', label: 'Vetttd', kind: 'product', health: 'healthy' },
    { id: 'story', label: 'Story', kind: 'feature', health: 'healthy' },
    { id: 'hiring', label: 'Hiring', kind: 'feature', health: 'impacted' },
    { id: 'campus', label: 'Campus', kind: 'feature', health: 'healthy' },
    { id: 'firebase', label: 'Firebase', kind: 'integration', health: 'healthy' },
    { id: 'stripe', label: 'Stripe', kind: 'integration', health: 'error' },
    { id: 'billing-api', label: 'Billing API', kind: 'api', health: 'error' },
    { id: 'subscription', label: 'Subscription Service', kind: 'service', health: 'impacted' },
  ],
  edges: [
    { id: 'e1', source: 'vetttd', target: 'story', relation: 'contains', health: 'healthy' },
    { id: 'e2', source: 'vetttd', target: 'hiring', relation: 'contains', health: 'impacted' },
    { id: 'e3', source: 'vetttd', target: 'campus', relation: 'contains', health: 'healthy' },
    { id: 'e4', source: 'story', target: 'firebase', relation: 'depends-on', health: 'healthy' },
    { id: 'e5', source: 'hiring', target: 'billing-api', relation: 'depends-on', health: 'impacted' },
    { id: 'e6', source: 'stripe', target: 'billing-api', relation: 'calls', health: 'error', label: 'Webhook failure' },
    { id: 'e7', source: 'billing-api', target: 'subscription', relation: 'calls', health: 'error' },
    { id: 'e8', source: 'subscription', target: 'hiring', relation: 'depends-on', health: 'impacted' },
  ],
};
