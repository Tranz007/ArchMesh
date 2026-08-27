import { useEffect, useRef } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import Sigma from 'sigma';
import type { ArchGraphData, HealthState } from './types';

const healthColor: Record<HealthState, string> = {
  healthy: '#7f8da8',
  warning: '#f0b44d',
  error: '#ff4d5e',
  impacted: '#ff8f70',
  unknown: '#667085',
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

interface GraphCanvasProps {
  data: ArchGraphData;
  errorsOnly: boolean;
  selectedNodeId?: string;
  onSelectNode: (nodeId?: string) => void;
}

export function GraphCanvas({ data, errorsOnly, selectedNodeId, onSelectNode }: GraphCanvasProps) {
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
        path: node.path,
        x: Math.random(),
        y: Math.random(),
        size: kindSize[node.kind] ?? 7,
        color: healthColor[node.health],
      });
    }

    for (const edge of data.edges) {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
      if (errorsOnly && edge.health === 'healthy') continue;
      graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
        label: edge.label ?? edge.relation,
        relation: edge.relation,
        health: edge.health,
        size: edge.health === 'error' ? 3 : edge.health === 'impacted' ? 2 : 1,
        color: edge.health === 'healthy' ? '#38445b' : healthColor[edge.health],
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

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      labelRenderedSizeThreshold: 7,
      minCameraRatio: 0.08,
      maxCameraRatio: 8,
      nodeReducer(node, attributes) {
        if (!selectedNodeId) return attributes;
        if (node === selectedNodeId) {
          return { ...attributes, highlighted: true, size: Number(attributes.size) * 1.3 };
        }
        const neighbors = new Set(graph.neighbors(selectedNodeId));
        if (neighbors.has(node)) return attributes;
        return { ...attributes, color: '#283146', label: '', zIndex: 0 };
      },
      edgeReducer(edge, attributes) {
        if (!selectedNodeId) return attributes;
        const source = graph.source(edge);
        const target = graph.target(edge);
        if (source === selectedNodeId || target === selectedNodeId) {
          return { ...attributes, size: Math.max(Number(attributes.size), 2) };
        }
        return { ...attributes, color: '#222a3a', hidden: false, size: 0.5 };
      },
    });

    renderer.on('clickNode', ({ node }) => onSelectNode(node));
    renderer.on('clickStage', () => onSelectNode(undefined));

    return () => renderer.kill();
  }, [data, errorsOnly, selectedNodeId, onSelectNode]);

  return <div ref={containerRef} className="graph-canvas" aria-label="Interactive architecture graph" />;
}
