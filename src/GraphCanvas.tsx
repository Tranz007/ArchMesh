import { useEffect, useRef } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import Sigma from 'sigma';
import type { ArchGraphData, ChangeState, HealthState } from './types';

const healthColor: Record<HealthState, string> = {
  healthy: '#7f8da8',
  warning: '#f0b44d',
  error: '#ff4d5e',
  impacted: '#ff8f70',
  unknown: '#667085',
};

const changeColor: Record<ChangeState, string> = {
  unchanged: '#7f8da8',
  changed: '#58a6ff',
  affected: '#a78bfa',
};

const kindSize: Record<string, number> = {
  product: 18,
  feature: 13,
  integration: 12,
  api: 10,
  service: 10,
  route: 9,
  component: 8,
  data: 9,
  file: 6,
  module: 6,
  unknown: 7,
};

function stableCoordinate(id: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function graphColor(health: HealthState, change: ChangeState | undefined, healthyDefault: string) {
  if (health === 'error' || health === 'warning' || health === 'impacted') return healthColor[health];
  if (change === 'changed' || change === 'affected') return changeColor[change];
  return healthyDefault;
}

interface GraphCanvasProps {
  data: ArchGraphData;
  errorsOnly: boolean;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  onSelectNode: (nodeId?: string) => void;
  onSelectEdge: (edgeId?: string) => void;
}

export function GraphCanvas({
  data,
  errorsOnly,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph({ multi: true, type: 'directed' });
    const visibleNodes = new Set<string>();

    if (errorsOnly) {
      for (const edge of data.edges) {
        if (edge.health === 'error' || edge.health === 'impacted' || edge.health === 'warning') {
          visibleNodes.add(edge.source);
          visibleNodes.add(edge.target);
        }
      }
      for (const node of data.nodes) {
        if (node.health === 'error' || node.health === 'impacted' || node.health === 'warning') {
          visibleNodes.add(node.id);
        }
      }
    }

    for (const node of data.nodes) {
      if (errorsOnly && !visibleNodes.has(node.id)) continue;
      graph.addNode(node.id, {
        label: node.label,
        kind: node.kind,
        health: node.health,
        change: node.change ?? 'unchanged',
        path: node.path,
        x: stableCoordinate(node.id, 17),
        y: stableCoordinate(node.id, 71),
        size: (kindSize[node.kind] ?? 7) * (node.change === 'changed' ? 1.12 : 1),
        color: graphColor(node.health, node.change, healthColor[node.health]),
      });
    }

    for (const edge of data.edges) {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
      if (errorsOnly && edge.health === 'healthy') continue;
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        label: edge.label ?? edge.relation,
        relation: edge.relation,
        health: edge.health,
        change: edge.change ?? 'unchanged',
        size: edge.health === 'error'
          ? 3
          : edge.health === 'impacted'
            ? 2
            : edge.change === 'affected'
              ? 1.8
              : 1,
        color: graphColor(edge.health, edge.change, '#38445b'),
      });
    }

    if (graph.order > 1) {
      const settings = forceAtlas2.inferSettings(graph);
      forceAtlas2.assign(graph, {
        iterations: Math.min(180, Math.max(50, graph.order * 5)),
        settings: {
          ...settings,
          gravity: 1.5,
          scalingRatio: 8,
          slowDown: 3,
        },
      });
    }

    const activeNodeSelection = selectedNodeId && graph.hasNode(selectedNodeId) ? selectedNodeId : undefined;
    const activeEdgeSelection = selectedEdgeId && graph.hasEdge(selectedEdgeId) ? selectedEdgeId : undefined;
    const edgeEndpoints = activeEdgeSelection
      ? new Set([graph.source(activeEdgeSelection), graph.target(activeEdgeSelection)])
      : undefined;

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 7,
      minCameraRatio: 0.08,
      maxCameraRatio: 8,
      nodeReducer(node, attributes) {
        if (activeEdgeSelection && edgeEndpoints) {
          if (edgeEndpoints.has(node)) {
            return { ...attributes, highlighted: true, size: Number(attributes.size) * 1.25 };
          }
          return { ...attributes, color: '#283146', label: '', zIndex: 0 };
        }

        if (!activeNodeSelection) return attributes;
        if (node === activeNodeSelection) {
          return { ...attributes, highlighted: true, size: Number(attributes.size) * 1.3 };
        }
        const neighbors = new Set(graph.neighbors(activeNodeSelection));
        if (neighbors.has(node)) return attributes;
        return { ...attributes, color: '#283146', label: '', zIndex: 0 };
      },
      edgeReducer(edge, attributes) {
        if (activeEdgeSelection) {
          if (edge === activeEdgeSelection) {
            return { ...attributes, size: Math.max(Number(attributes.size), 4), zIndex: 10 };
          }
          return { ...attributes, color: '#222a3a', hidden: false, size: 0.4, zIndex: 0 };
        }

        if (!activeNodeSelection) return attributes;
        const source = graph.source(edge);
        const target = graph.target(edge);
        if (source === activeNodeSelection || target === activeNodeSelection) {
          return { ...attributes, size: Math.max(Number(attributes.size), 2) };
        }
        return { ...attributes, color: '#222a3a', hidden: false, size: 0.5 };
      },
    });

    renderer.on('clickNode', ({ node }) => {
      onSelectEdge(undefined);
      onSelectNode(node);
    });
    renderer.on('clickEdge', ({ edge }) => {
      onSelectNode(undefined);
      onSelectEdge(edge);
    });
    renderer.on('clickStage', () => {
      onSelectNode(undefined);
      onSelectEdge(undefined);
    });

    return () => renderer.kill();
  }, [data, errorsOnly, selectedNodeId, selectedEdgeId, onSelectNode, onSelectEdge]);

  return <div ref={containerRef} className="graph-canvas" aria-label="Interactive architecture graph" />;
}
