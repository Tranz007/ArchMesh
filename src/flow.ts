import type { ArchEdge, GraphMetadata } from './types.js';

export type FlowScope = 'focus' | 'all';
export type FlowDirection = 'source-to-target' | 'target-to-source' | 'both' | 'unknown';
export type FlowEmissionDirection = 'source-to-target' | 'target-to-source';

const directionalFlowRelations = new Set<ArchEdge['relation']>([
  'calls',
  'reads',
  'writes',
  'integrates-with',
]);

const flowDirections = new Set<FlowDirection>([
  'source-to-target',
  'target-to-source',
  'both',
  'unknown',
]);

export interface FlowSelection {
  enabled: boolean;
  scope: FlowScope;
  selectedNodeId?: string;
  selectedEdgeId?: string;
}

export interface FlowEdgeLike {
  id: string;
  source: string;
  target: string;
  relation: ArchEdge['relation'];
  flowDirection?: FlowDirection;
}

export function metadataFlowDirection(metadata?: GraphMetadata): FlowDirection | undefined {
  const value = metadata?.flowDirection;
  return typeof value === 'string' && flowDirections.has(value as FlowDirection)
    ? value as FlowDirection
    : undefined;
}

export function flowDirectionForEdge(edge: Pick<FlowEdgeLike, 'relation' | 'flowDirection'>): FlowDirection {
  if (edge.relation === 'reads') return 'target-to-source';
  if (edge.relation === 'calls' || edge.relation === 'writes') return 'source-to-target';
  if (edge.relation === 'integrates-with') return edge.flowDirection ?? 'unknown';
  return 'unknown';
}

export function mergeFlowDirection(
  left?: FlowDirection,
  right?: FlowDirection,
): FlowDirection | undefined {
  if (!left) return right;
  if (!right) return left;
  if (left === right) return left;
  if (left === 'both' || right === 'both') return 'both';
  if (left === 'unknown') return right;
  if (right === 'unknown') return left;
  return 'both';
}

/**
 * Keep an aggregation's preferred metadata intact while combining directional
 * evidence from every relationship that collapsed into the same visible edge.
 */
export function withMergedFlowDirection(
  preferred?: GraphMetadata,
  incoming?: GraphMetadata,
): GraphMetadata | undefined {
  const direction = mergeFlowDirection(
    metadataFlowDirection(preferred),
    metadataFlowDirection(incoming),
  );
  if (!preferred && !direction) return undefined;
  return {
    ...(preferred ?? {}),
    ...(direction ? { flowDirection: direction } : {}),
  };
}

export function flowDirectionFromReadWrite(hasRead: boolean, hasWrite: boolean): FlowDirection | undefined {
  if (hasRead && hasWrite) return 'both';
  if (hasRead) return 'target-to-source';
  if (hasWrite) return 'source-to-target';
  return undefined;
}

export function isDirectionalFlowRelation(relation: ArchEdge['relation']) {
  return directionalFlowRelations.has(relation);
}

export function hasDirectionalFlowEvidence(edge: Pick<FlowEdgeLike, 'relation' | 'flowDirection'>) {
  return isDirectionalFlowRelation(edge.relation) && flowDirectionForEdge(edge) !== 'unknown';
}

/**
 * Expand one evidence direction into the visual-only pulse directions that
 * should be emitted. Bidirectional evidence deliberately becomes two independent
 * visual emitters; neither direction changes or duplicates the force topology.
 */
export function flowEmissionDirections(
  edge: Pick<FlowEdgeLike, 'relation' | 'flowDirection'>,
): FlowEmissionDirection[] {
  const direction = flowDirectionForEdge(edge);
  if (direction === 'source-to-target') return ['source-to-target'];
  if (direction === 'target-to-source') return ['target-to-source'];
  if (direction === 'both') return ['source-to-target', 'target-to-source'];
  return [];
}

export function canAnimateFlowDirection(edge: Pick<FlowEdgeLike, 'relation' | 'flowDirection'>) {
  return flowEmissionDirections(edge).length > 0;
}

export function shouldAnimateFlowEdge(edge: FlowEdgeLike, selection: FlowSelection) {
  if (!selection.enabled || !hasDirectionalFlowEvidence(edge) || !canAnimateFlowDirection(edge)) return false;
  if (selection.scope === 'all') return true;
  if (selection.selectedEdgeId) return edge.id === selection.selectedEdgeId;
  if (selection.selectedNodeId) {
    return edge.source === selection.selectedNodeId || edge.target === selection.selectedNodeId;
  }
  return false;
}

/**
 * Force-layout endpoints are structural evidence, never animation state. Flow
 * direction is rendered by a separate Three.js overlay, so reverse and
 * bidirectional movement can never perturb d3 topology.
 */
export function flowRenderEndpoints(edge: Pick<FlowEdgeLike, 'source' | 'target'>) {
  return { source: edge.source, target: edge.target };
}

export function hasReverseFlow(edge: Pick<FlowEdgeLike, 'relation' | 'flowDirection'>) {
  const direction = flowDirectionForEdge(edge);
  return direction === 'target-to-source' || direction === 'both';
}

/**
 * Retained as a relation-level pacing helper for compatibility. The visual
 * overlay uses duration rather than mutating a force-graph link's speed.
 */
export function flowParticleSpeed(relation: ArchEdge['relation']) {
  if (relation === 'calls') return 0.0052;
  if (relation === 'writes') return 0.0044;
  if (relation === 'reads') return 0.0041;
  if (relation === 'integrates-with') return 0.0036;
  return 0;
}

export function flowParticleDuration(relation: ArchEdge['relation']) {
  if (relation === 'calls') return 850;
  if (relation === 'writes') return 980;
  if (relation === 'reads') return 1050;
  if (relation === 'integrates-with') return 1150;
  return 1000;
}

export function flowDirectionLabel(
  relation: ArchEdge['relation'],
  flowDirection?: FlowDirection,
) {
  const direction = flowDirectionForEdge({ relation, flowDirection });
  if (direction === 'both') return 'source ↔ target';
  if (direction === 'target-to-source') return 'target → source';
  if (direction === 'source-to-target') return 'source → target';
  return 'direction unknown';
}

function relationDelayMultiplier(relation: ArchEdge['relation']) {
  if (relation === 'calls') return 0.82;
  if (relation === 'reads') return 1.05;
  if (relation === 'writes') return 1.12;
  if (relation === 'integrates-with') return 1.18;
  return 1;
}

/**
 * Returns an illustrative delay between one-shot pulses. Flow should visibly
 * react soon after it is enabled, while recurring emissions remain independently
 * staggered so the graph never looks like synchronized fake traffic.
 */
export function flowEmissionDelay(
  edge: Pick<FlowEdgeLike, 'relation'>,
  selection: FlowSelection,
  random = Math.random,
  initial = false,
) {
  const clampedRandom = Math.max(0, Math.min(1, random()));
  let min: number;
  let max: number;

  if (selection.scope === 'focus' && selection.selectedEdgeId) {
    min = initial ? 35 : 360;
    max = initial ? 110 : 780;
  } else if (selection.scope === 'focus') {
    min = initial ? 55 : 560;
    max = initial ? 360 : 1350;
  } else {
    min = initial ? 70 : 820;
    max = initial ? 620 : 2300;
  }

  const base = min + ((max - min) * clampedRandom);
  return Math.round(base * relationDelayMultiplier(edge.relation));
}

export interface FlowEmitterOptions<T extends FlowEdgeLike> {
  edges: T[];
  selection: FlowSelection;
  emit: (edge: T, direction: FlowEmissionDirection) => void;
  random?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

/**
 * Emit non-cyclical particles at independent intervals. Each visible direction
 * owns its own timer. A bidirectional relationship therefore receives two
 * independently staggered visual streams without creating a second force link.
 */
export function startFlowEmitter<T extends FlowEdgeLike>({
  edges,
  selection,
  emit,
  random = Math.random,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}: FlowEmitterOptions<T>) {
  const activePaths = edges
    .filter((edge) => shouldAnimateFlowEdge(edge, selection))
    .flatMap((edge) => flowEmissionDirections(edge).map((direction) => ({ edge, direction })));
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;

  const schedule = (
    path: { edge: T; direction: FlowEmissionDirection },
    initial: boolean,
  ) => {
    if (stopped) return;
    const timer = setTimer(() => {
      timers.delete(timer);
      if (stopped) return;
      emit(path.edge, path.direction);
      schedule(path, false);
    }, flowEmissionDelay(path.edge, selection, random, initial));
    timers.add(timer);
  };

  for (const path of activePaths) schedule(path, true);

  return () => {
    stopped = true;
    for (const timer of timers) clearTimer(timer);
    timers.clear();
  };
}
