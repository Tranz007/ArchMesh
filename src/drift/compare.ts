import type {
  ArchEdge,
  ArchGraphData,
  ArchNode,
  DriftState,
  GraphMetadata,
} from '../types.js';

const DYNAMIC_METADATA_PREFIXES = ['health', 'change', 'drift'];

function structuralMetadata(metadata?: GraphMetadata) {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !DYNAMIC_METADATA_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function nodeFingerprint(node: ArchNode) {
  return JSON.stringify({
    label: node.label,
    kind: node.kind,
    path: node.path ?? null,
    metadata: structuralMetadata(node.metadata),
  });
}

function edgeKey(edge: ArchEdge) {
  return `${edge.source}\u0000${edge.relation}\u0000${edge.target}\u0000${edge.label ?? ''}`;
}

function edgeFingerprint(edge: ArchEdge) {
  return JSON.stringify({
    label: edge.label ?? null,
    relation: edge.relation,
    metadata: structuralMetadata(edge.metadata),
  });
}

function removedEdgeId(edge: ArchEdge, index: number) {
  return `drift:removed:${index}:${edge.source}:${edge.relation}:${edge.target}`;
}

function cloneNode(node: ArchNode, drift: DriftState): ArchNode {
  return {
    ...node,
    drift,
    metadata: {
      ...(node.metadata ?? {}),
      ...(drift === 'removed' ? { driftSource: 'previous-scan' } : {}),
    },
  };
}

function cloneEdge(edge: ArchEdge, drift: DriftState, id = edge.id): ArchEdge {
  return {
    ...edge,
    id,
    drift,
    metadata: {
      ...(edge.metadata ?? {}),
      ...(drift === 'removed' ? { driftSource: 'previous-scan' } : {}),
    },
  };
}

export interface GraphDriftSummary {
  addedNodes: number;
  removedNodes: number;
  modifiedNodes: number;
  addedEdges: number;
  removedEdges: number;
  modifiedEdges: number;
}

export interface GraphDriftResult {
  graph: ArchGraphData;
  summary: GraphDriftSummary;
}

export function compareGraphs(previous: ArchGraphData, current: ArchGraphData): GraphDriftResult {
  const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]));
  const currentNodes = new Map(current.nodes.map((node) => [node.id, node]));
  const nodes: ArchNode[] = [];
  let addedNodes = 0;
  let removedNodes = 0;
  let modifiedNodes = 0;

  for (const node of current.nodes) {
    const before = previousNodes.get(node.id);
    let drift: DriftState = 'stable';
    if (!before) {
      drift = 'added';
      addedNodes += 1;
    } else if (nodeFingerprint(before) !== nodeFingerprint(node)) {
      drift = 'modified';
      modifiedNodes += 1;
    }
    nodes.push(cloneNode(node, drift));
  }

  for (const node of previous.nodes) {
    if (currentNodes.has(node.id)) continue;
    removedNodes += 1;
    nodes.push(cloneNode(node, 'removed'));
  }

  const previousEdges = new Map(previous.edges.map((edge) => [edgeKey(edge), edge]));
  const currentEdges = new Map(current.edges.map((edge) => [edgeKey(edge), edge]));
  const edges: ArchEdge[] = [];
  let addedEdges = 0;
  let removedEdges = 0;
  let modifiedEdges = 0;

  for (const edge of current.edges) {
    const before = previousEdges.get(edgeKey(edge));
    let drift: DriftState = 'stable';
    if (!before) {
      drift = 'added';
      addedEdges += 1;
    } else if (edgeFingerprint(before) !== edgeFingerprint(edge)) {
      drift = 'modified';
      modifiedEdges += 1;
    }
    edges.push(cloneEdge(edge, drift));
  }

  let removedIndex = 0;
  for (const edge of previous.edges) {
    if (currentEdges.has(edgeKey(edge))) continue;
    removedEdges += 1;
    removedIndex += 1;
    edges.push(cloneEdge(edge, 'removed', removedEdgeId(edge, removedIndex)));
  }

  const summary: GraphDriftSummary = {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedEdges,
    removedEdges,
    modifiedEdges,
  };

  return {
    graph: {
      ...current,
      generatedAt: current.generatedAt,
      nodes,
      edges,
      metadata: {
        ...(current.metadata ?? {}),
        graphKind: 'drift',
        driftAddedNodes: addedNodes,
        driftRemovedNodes: removedNodes,
        driftModifiedNodes: modifiedNodes,
        driftAddedEdges: addedEdges,
        driftRemovedEdges: removedEdges,
        driftModifiedEdges: modifiedEdges,
        driftPreviousGeneratedAt: previous.generatedAt,
        driftCurrentGeneratedAt: current.generatedAt,
      },
    },
    summary,
  };
}
