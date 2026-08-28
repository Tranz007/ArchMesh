import type { ArchEdge } from './types';

export type FlowScope = 'focus' | 'all';

const directionalFlowRelations = new Set<ArchEdge['relation']>([
  'calls',
  'reads',
  'writes',
  'integrates-with',
]);

export function isDirectionalFlowRelation(relation: ArchEdge['relation']) {
  return directionalFlowRelations.has(relation);
}

export interface FlowSelection {
  enabled: boolean;
  scope: FlowScope;
  selectedNodeId?: string;
  selectedEdgeId?: string;
}

export function shouldAnimateFlowEdge(edge: Pick<ArchEdge, 'id' | 'source' | 'target' | 'relation'>, selection: FlowSelection) {
  if (!selection.enabled || !isDirectionalFlowRelation(edge.relation)) return false;
  if (selection.scope === 'all') return true;
  if (selection.selectedEdgeId) return edge.id === selection.selectedEdgeId;
  if (selection.selectedNodeId) {
    return edge.source === selection.selectedNodeId || edge.target === selection.selectedNodeId;
  }
  return false;
}

export function flowParticleCount(edge: Pick<ArchEdge, 'id' | 'source' | 'target' | 'relation'>, selection: FlowSelection) {
  if (!shouldAnimateFlowEdge(edge, selection)) return 0;
  if (selection.scope === 'focus') return selection.selectedEdgeId ? 6 : 4;
  return edge.relation === 'calls' ? 2 : 1;
}

export function flowParticleSpeed(relation: ArchEdge['relation']) {
  if (relation === 'calls') return 0.007;
  if (relation === 'writes') return 0.0055;
  if (relation === 'reads') return 0.0048;
  if (relation === 'integrates-with') return 0.0042;
  return 0;
}
