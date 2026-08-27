import type { ArchGraphData } from './types';

export const sampleGraph: ArchGraphData = {
  project: 'Example Commerce App',
  generatedAt: new Date().toISOString(),
  nodes: [
    { id: 'example-app', label: 'Example App', kind: 'product', health: 'healthy' },
    { id: 'catalog', label: 'Catalog', kind: 'feature', health: 'healthy' },
    { id: 'orders', label: 'Orders', kind: 'feature', health: 'impacted' },
    { id: 'accounts', label: 'Accounts', kind: 'feature', health: 'healthy' },
    { id: 'firebase', label: 'Firebase', kind: 'integration', health: 'healthy' },
    { id: 'stripe', label: 'Stripe', kind: 'integration', health: 'error' },
    { id: 'billing-api', label: 'Billing API', kind: 'api', health: 'error' },
    { id: 'subscription', label: 'Subscription Service', kind: 'service', health: 'impacted' },
  ],
  edges: [
    { id: 'e1', source: 'example-app', target: 'catalog', relation: 'contains', health: 'healthy' },
    { id: 'e2', source: 'example-app', target: 'orders', relation: 'contains', health: 'impacted' },
    { id: 'e3', source: 'example-app', target: 'accounts', relation: 'contains', health: 'healthy' },
    { id: 'e4', source: 'catalog', target: 'firebase', relation: 'depends-on', health: 'healthy' },
    { id: 'e5', source: 'orders', target: 'billing-api', relation: 'depends-on', health: 'impacted' },
    { id: 'e6', source: 'stripe', target: 'billing-api', relation: 'calls', health: 'error', label: 'Webhook failure' },
    { id: 'e7', source: 'billing-api', target: 'subscription', relation: 'calls', health: 'error' },
    { id: 'e8', source: 'subscription', target: 'orders', relation: 'depends-on', health: 'impacted' },
  ],
};
