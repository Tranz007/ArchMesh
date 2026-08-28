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

export interface FlowEdgeLike {
  id: string;
  source: string;
  target: string;
  relation: ArchEdge['relation'];
}

export function shouldAnimateFlowEdge(edge: FlowEdgeLike, selection: FlowSelection) {
  if (!selection.enabled || !isDirectionalFlowRelation(edge.relation)) return false;
  if (selection.scope === 'all') return true;
  if (selection.selectedEdgeId) return edge.id === selection.selectedEdgeId;
  if (selection.selectedNodeId) {
    return edge.source === selection.selectedNodeId || edge.target === selection.selectedNodeId;
  }
  return false;
}

/**
 * The graph renderer only documents particle travel from its rendered source to
 * rendered target. ArchMesh stores a read as "reader reads resource", while the
 * data itself moves resource -> reader. Swap only the render endpoints so the
 * evidence model remains unchanged and the renderer can use a normal positive
 * particle speed.
 */
export function flowRenderEndpoints(edge: Pick<FlowEdgeLike, 'source' | 'target' | 'relation'>) {
  return edge.relation === 'reads'
    ? { source: edge.target, target: edge.source }
    : { source: edge.source, target: edge.target };
}

export function flowParticleSpeed(relation: ArchEdge['relation']) {
  if (relation === 'calls') return 0.0052;
  if (relation === 'writes') return 0.0044;
  if (relation === 'reads') return 0.0041;
  if (relation === 'integrates-with') return 0.0036;
  return 0;
}

export function flowDirectionLabel(relation: ArchEdge['relation']) {
  return relation === 'reads' ? 'target → source' : 'source → target';
}

function relationDelayMultiplier(relation: ArchEdge['relation']) {
  if (relation === 'calls') return 0.82;
  if (relation === 'reads') return 1.05;
  if (relation === 'writes') return 1.12;
  if (relation === 'integrates-with') return 1.34;
  return 1;
}

/**
 * Returns an illustrative delay between one-shot pulses. The random source is
 * injectable so tests can assert bounds without making production animation
 * deterministic. These timings represent visual pacing only, never traffic
 * volume or runtime frequency.
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
    min = initial ? 60 : 480;
    max = initial ? 180 : 1150;
  } else if (selection.scope === 'focus') {
    min = initial ? 90 : 720;
    max = initial ? 720 : 2200;
  } else {
    min = initial ? 180 : 1700;
    max = initial ? 3200 : 5600;
  }

  const base = min + ((max - min) * clampedRandom);
  return Math.round(base * relationDelayMultiplier(edge.relation));
}

export interface FlowEmitterOptions<T extends FlowEdgeLike> {
  edges: T[];
  selection: FlowSelection;
  emit: (edge: T) => void;
  random?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}

/**
 * Emit non-cyclical particles at independent intervals. Each edge owns its own
 * timer, so a system never looks like every request fired on the same frame.
 */
export function startFlowEmitter<T extends FlowEdgeLike>({
  edges,
  selection,
  emit,
  random = Math.random,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}: FlowEmitterOptions<T>) {
  const activeEdges = edges.filter((edge) => shouldAnimateFlowEdge(edge, selection));
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let stopped = false;

  const schedule = (edge: T, initial: boolean) => {
    if (stopped) return;
    const timer = setTimer(() => {
      timers.delete(timer);
      if (stopped) return;
      emit(edge);
      schedule(edge, false);
    }, flowEmissionDelay(edge, selection, random, initial));
    timers.add(timer);
  };

  for (const edge of activeEdges) schedule(edge, true);

  return () => {
    stopped = true;
    for (const timer of timers) clearTimer(timer);
    timers.clear();
  };
}
