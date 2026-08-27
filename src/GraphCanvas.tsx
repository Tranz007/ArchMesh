import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import { Group } from 'three';
import SpriteText from 'three-spritetext';
import type {
  ArchGraphData,
  ChangeState,
  DriftState,
  HealthState,
} from './types';

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

const driftColor: Record<DriftState, string> = {
  stable: '#59657a',
  added: '#34d399',
  removed: '#f472b6',
  modified: '#fbbf24',
};

const kindValue: Record<string, number> = {
  product: 20,
  feature: 10,
  integration: 8,
  api: 6,
  service: 6,
  route: 4,
  component: 3.5,
  data: 7,
  file: 2,
  module: 2,
  unknown: 3,
};

const alwaysLabelKinds = new Set([
  'product',
  'feature',
  'integration',
  'api',
  'service',
  'data',
]);

interface RenderNode {
  id: string;
  label: string;
  kind: string;
  health: HealthState;
  change: ChangeState;
  drift: DriftState;
  path?: string;
  value: number;
  baseColor: string;
  x: number;
  y: number;
  z: number;
}

interface RenderLink {
  id: string;
  source: string | RenderNode;
  target: string | RenderNode;
  label: string;
  relation: string;
  health: HealthState;
  change: ChangeState;
  drift: DriftState;
  baseColor: string;
}

function stableCoordinate(id: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function seededAxis(id: string, salt: number) {
  return (stableCoordinate(id, salt) - 0.5) * 140;
}

function graphColor(
  health: HealthState,
  change: ChangeState | undefined,
  drift: DriftState | undefined,
  healthyDefault: string,
  visualMode: 'default' | 'drift',
) {
  if (visualMode === 'drift') return driftColor[drift ?? 'stable'];
  if (health === 'error' || health === 'warning' || health === 'impacted') return healthColor[health];
  if (change === 'changed' || change === 'affected') return changeColor[change];
  return healthyDefault;
}

function endpointId(endpoint: string | RenderNode) {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

interface GraphCanvasProps {
  data: ArchGraphData;
  errorsOnly: boolean;
  visualMode?: 'default' | 'drift';
  selectedNodeId?: string;
  selectedEdgeId?: string;
  onSelectNode: (nodeId?: string) => void;
  onSelectEdge: (edgeId?: string) => void;
}

export function GraphCanvas({
  data,
  errorsOnly,
  visualMode = 'default',
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const fittedGraphRef = useRef<string>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
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

    const nodes: RenderNode[] = data.nodes
      .filter((node) => !errorsOnly || visibleNodes.has(node.id))
      .map((node) => {
        const drift = node.drift ?? 'stable';
        const driftScale = visualMode === 'drift'
          ? drift === 'added'
            ? 1.18
            : drift === 'removed'
              ? 0.94
              : drift === 'modified'
                ? 1.1
                : 1
          : 1;

        return {
          id: node.id,
          label: node.label,
          kind: node.kind,
          health: node.health,
          change: node.change ?? 'unchanged',
          drift,
          path: node.path,
          value: (kindValue[node.kind] ?? 3) * (node.change === 'changed' ? 1.12 : 1) * driftScale,
          baseColor: graphColor(node.health, node.change, node.drift, healthColor[node.health], visualMode),
          x: seededAxis(node.id, 17),
          y: seededAxis(node.id, 71),
          z: seededAxis(node.id, 137),
        };
      });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const links: RenderLink[] = data.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .filter((edge) => !errorsOnly || edge.health !== 'healthy')
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? edge.relation,
        relation: edge.relation,
        health: edge.health,
        change: edge.change ?? 'unchanged',
        drift: edge.drift ?? 'stable',
        baseColor: graphColor(edge.health, edge.change, edge.drift, '#38445b', visualMode),
      }));

    return { nodes, links };
  }, [data, errorsOnly, visualMode]);

  const selection = useMemo(() => {
    const selectedEdge = selectedEdgeId
      ? data.edges.find((edge) => edge.id === selectedEdgeId)
      : undefined;
    const edgeEndpoints = selectedEdge
      ? new Set([selectedEdge.source, selectedEdge.target])
      : undefined;
    const neighbors = new Set<string>();

    if (selectedNodeId) {
      for (const edge of data.edges) {
        if (edge.source === selectedNodeId) neighbors.add(edge.target);
        if (edge.target === selectedNodeId) neighbors.add(edge.source);
      }
    }

    return { edgeEndpoints, neighbors };
  }, [data.edges, selectedEdgeId, selectedNodeId]);

  const isNodeFaded = (node: RenderNode) => {
    if (selection.edgeEndpoints) return !selection.edgeEndpoints.has(node.id);
    if (!selectedNodeId) return false;
    return node.id !== selectedNodeId && !selection.neighbors.has(node.id);
  };

  const isLinkFaded = (link: RenderLink) => {
    if (selectedEdgeId) return link.id !== selectedEdgeId;
    if (!selectedNodeId) return false;
    return endpointId(link.source) !== selectedNodeId && endpointId(link.target) !== selectedNodeId;
  };

  const graphIdentity = useMemo(
    () => `${visualMode}:${errorsOnly ? 'errors' : 'all'}:${graphData.nodes.map((node) => node.id).join('|')}`,
    [errorsOnly, graphData.nodes, visualMode],
  );

  return (
    <div ref={containerRef} className="graph-canvas graph-canvas-3d" aria-label="Interactive 3D architecture graph">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        width={size.width}
        height={size.height}
        backgroundColor="#090d17"
        controlType="orbit"
        enableNavigationControls
        enableNodeDrag={false}
        showNavInfo={false}
        numDimensions={3}
        forceEngine="d3"
        warmupTicks={60}
        cooldownTicks={150}
        cooldownTime={4500}
        d3VelocityDecay={0.34}
        nodeRelSize={1.55}
        nodeVal={(node) => {
          const typedNode = node as RenderNode;
          const selected = typedNode.id === selectedNodeId;
          const edgeEndpoint = selection.edgeEndpoints?.has(typedNode.id) ?? false;
          return typedNode.value * (selected ? 1.8 : edgeEndpoint ? 1.45 : 1);
        }}
        nodeColor={(node) => {
          const typedNode = node as RenderNode;
          return isNodeFaded(typedNode) ? '#273147' : typedNode.baseColor;
        }}
        nodeOpacity={0.94}
        nodeResolution={14}
        nodeLabel={(node) => {
          const typedNode = node as RenderNode;
          return `${typedNode.label} · ${typedNode.kind}`;
        }}
        nodeThreeObject={(node) => {
          const typedNode = node as RenderNode;
          const group = new Group();
          const faded = isNodeFaded(typedNode);
          const selected = typedNode.id === selectedNodeId;
          const edgeEndpoint = selection.edgeEndpoints?.has(typedNode.id) ?? false;
          const showLabel = !faded && (selected || edgeEndpoint || alwaysLabelKinds.has(typedNode.kind));
          if (!showLabel) return group;

          const sprite = new SpriteText(
            typedNode.label,
            selected ? 4.8 : edgeEndpoint ? 4.2 : 3.3,
            selected ? '#ffffff' : '#dbe6f8',
          );
          sprite.backgroundColor = 'rgba(9, 13, 23, 0.78)';
          sprite.padding = [3, 2];
          sprite.borderRadius = 4;
          sprite.fontFace = 'Inter, Arial, sans-serif';
          sprite.fontWeight = selected ? '700' : '500';
          sprite.material.depthTest = false;
          sprite.renderOrder = 1000;
          sprite.position.y = 5 + Math.cbrt(typedNode.value) * 1.6;
          group.add(sprite);
          return group;
        }}
        nodeThreeObjectExtend
        linkColor={(link) => {
          const typedLink = link as RenderLink;
          return isLinkFaded(typedLink) ? '#20283a' : typedLink.baseColor;
        }}
        linkOpacity={0.48}
        linkWidth={(link) => {
          const typedLink = link as RenderLink;
          if (typedLink.id === selectedEdgeId) return 3.4;
          if (isLinkFaded(typedLink)) return 0;
          if (visualMode === 'drift') {
            return typedLink.drift === 'stable' ? 0 : typedLink.drift === 'modified' ? 1.8 : 1.25;
          }
          if (typedLink.health === 'error') return 2.4;
          if (typedLink.health === 'impacted') return 1.5;
          if (typedLink.health === 'warning') return 1.2;
          if (typedLink.change === 'affected') return 0.9;
          if (typedLink.change === 'changed') return 0.7;
          return 0;
        }}
        linkResolution={6}
        linkLabel={(link) => {
          const typedLink = link as RenderLink;
          return `${typedLink.label} · ${typedLink.health}`;
        }}
        linkHoverPrecision={5}
        linkDirectionalArrowLength={(link) => {
          const typedLink = link as RenderLink;
          if (isLinkFaded(typedLink)) return 0;
          if (typedLink.id === selectedEdgeId) return 4;
          if (typedLink.health === 'error' || typedLink.health === 'impacted') return 2.3;
          return 0;
        }}
        linkDirectionalArrowRelPos={0.82}
        linkDirectionalArrowColor={(link) => (link as RenderLink).baseColor}
        onNodeClick={(node) => {
          const typedNode = node as RenderNode;
          onSelectEdge(undefined);
          onSelectNode(typedNode.id);
        }}
        onLinkClick={(link) => {
          const typedLink = link as RenderLink;
          onSelectNode(undefined);
          onSelectEdge(typedLink.id);
        }}
        onBackgroundClick={() => {
          onSelectNode(undefined);
          onSelectEdge(undefined);
        }}
        onEngineStop={() => {
          if (fittedGraphRef.current === graphIdentity) return;
          fittedGraphRef.current = graphIdentity;
          graphRef.current?.zoomToFit(450, 72);
        }}
      />
      <div className="graph-nav-hint" aria-hidden="true">
        Drag to orbit · Scroll to zoom · Right-drag to pan
      </div>
    </div>
  );
}
