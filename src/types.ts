export type HealthState = 'healthy' | 'warning' | 'error' | 'impacted' | 'unknown';

export type NodeKind =
  | 'product'
  | 'feature'
  | 'route'
  | 'component'
  | 'service'
  | 'api'
  | 'data'
  | 'integration'
  | 'file'
  | 'module'
  | 'unknown';

export interface ArchNode {
  id: string;
  label: string;
  kind: NodeKind;
  path?: string;
  health: HealthState;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  relation: 'contains' | 'imports' | 'calls' | 'reads' | 'writes' | 'depends-on' | 'integrates-with';
  health: HealthState;
  label?: string;
}

export interface ArchGraphData {
  project: string;
  generatedAt: string;
  nodes: ArchNode[];
  edges: ArchEdge[];
}
