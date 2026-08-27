import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d';
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  SphereGeometry,
  TetrahedronGeometry,
} from 'three';
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

export const semanticKindColor: Record<string, string> = {
  product: '#d6e2f5',
  feature: '#6f95d8',
  integration: '#a178d0',
  api: '#53a8c7',
  service: '#8778d2',
  route: '#7d9bc3',
  component: '#718096',
  data: '#4fae92',
  file: '#556175',
  module: '#6b7280',
  unknown: '#667085',
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

const kindRadius: Record<string, number> = {
  product: 6.2,
  feature: 4.2,
  integration: 4.1,
  api: 3.7,
  service: 3.8,
  route: 3.2,
  component: 2.6,
  data: 4,
  file: 1.8,
  module: 2.2,
  unknown: 2.4,
};

const shellRadius: Record<string, number> = {
  product: 0,
  feature: 70,
  api: 104,
  service: 108,
  route: 112,
  component: 126,
  file: 138,
  module: 128,
  data: 148,
  integration: 158,
  unknown: 132,
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
  fx?: number;
  fy?: number;
  fz?: number;
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

function semanticPosition(id: string, kind: string) {
  const radius = shellRadius[kind] ?? 132;
  if (radius === 0) return { x: 0, y: 0, z: 0 };

  const theta = stableCoordinate(id, 17) * Math.PI * 2;
  const cosPhi = stableCoordinate(id, 71) * 2 - 1;
  const phi = Math.acos(Math.max(-1, Math.min(1, cosPhi)));
  const jitter = (stableCoordinate(id, 137) - 0.5) * 18;
  const r = radius + jitter;

  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta),
  };
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

function nodeColor(kind: string, health: HealthState, drift: DriftState, visualMode: 'default' | 'drift') {
  if (visualMode === 'drift') return driftColor[drift];
  if (health === 'error' || health === 'warning' || health === 'impacted') return healthColor[health];
  return semanticKindColor[kind] ?? semanticKindColor.unknown;
}

function endpointId(endpoint: string | RenderNode) {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

function geometryForKind(kind: string, radius: number): BufferGeometry {
  switch (kind) {
    case 'product':
      return new IcosahedronGeometry(radius, 1);
    case 'feature':
      return new SphereGeometry(radius, 20, 14);
    case 'integration':
      return new OctahedronGeometry(radius, 0);
    case 'data':
      return new CylinderGeometry(radius * 0.8, radius * 0.8, radius * 1.55, 18);
    case 'api':
      return new BoxGeometry(radius * 1.45, radius * 1.45, radius * 1.45);
    case 'service':
      return new DodecahedronGeometry(radius, 0);
    case 'route':
      return new BoxGeometry(radius * 1.75, radius * 0.76, radius * 0.76);
    case 'component':
      return new BoxGeometry(radius * 1.25, radius * 1.25, radius * 0.58);
    case 'module':
      return new TetrahedronGeometry(radius, 0);
    default:
      return new SphereGeometry(radius, 12, 9);
  }
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
  const fittedGraphRef = useRef<string | undefined>(undefined);

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
        const position = semanticPosition(node.id, node.kind);
        const fixed = node.kind === 'product' ? { fx: 0, fy: 0, fz: 0 } : {};

        return {
          id: node.id,
          label: node.label,
          kind: node.kind,
          health: node.health,
          change: node.change ?? 'unchanged',
          drift,
          path: node.path,
          value: (kindValue[node.kind] ?? 3) * (node.change === 'changed' ? 1.12 : 1) * driftScale,
          baseColor: nodeColor(node.kind, node.health, drift, visualMode),
          ...position,
          ...fixed,
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
        baseColor: graphColor(edge.health, edge.change, edge.drift, '#3c4960', visualMode),
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

  const fitGraph = () => {
    fittedGraphRef.current = graphIdentity;
    graphRef.current?.zoomToFit(450, 72);
  };

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
        warmupTicks={50}
        cooldownTicks={130}
        cooldownTime={4000}
        d3VelocityDecay={0.37}
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
          const radius = kindRadius[typedNode.kind] ?? kindRadius.unknown;
          const scale = selected ? 1.32 : edgeEndpoint ? 1.18 : 1;
          group.scale.setScalar(scale);

          const material = new MeshStandardMaterial({
            color: faded ? '#273147' : typedNode.baseColor,
            roughness: 0.5,
            metalness: typedNode.kind === 'integration' || typedNode.kind === 'product' ? 0.28 : 0.12,
            transparent: faded,
            opacity: faded ? 0.22 : 0.96,
            emissive: typedNode.health === 'error' || typedNode.health === 'warning' || typedNode.health === 'impacted'
              ? healthColor[typedNode.health]
              : selected ? '#263d63' : '#000000',
            emissiveIntensity: typedNode.health === 'error'
              ? 0.8
              : typedNode.health === 'warning' || typedNode.health === 'impacted'
                ? 0.52
                : selected ? 0.4 : 0,
          });
          const mesh = new Mesh(geometryForKind(typedNode.kind, radius), material);
          group.add(mesh);

          if (!faded && visualMode !== 'drift' && (typedNode.change === 'changed' || typedNode.change === 'affected')) {
            const shell = new Mesh(
              new SphereGeometry(radius * 1.28, 12, 9),
              new MeshBasicMaterial({
                color: changeColor[typedNode.change],
                wireframe: true,
                transparent: true,
                opacity: typedNode.change === 'changed' ? 0.58 : 0.4,
                depthWrite: false,
              }),
            );
            group.add(shell);
          }

          const showLabel = !faded && (selected || edgeEndpoint || alwaysLabelKinds.has(typedNode.kind));
          if (showLabel) {
            const sprite = new SpriteText(
              typedNode.label,
              selected ? 4.8 : edgeEndpoint ? 4.2 : typedNode.kind === 'product' ? 4.1 : 3.25,
              selected ? '#ffffff' : '#dbe6f8',
            );
            sprite.backgroundColor = 'rgba(9, 13, 23, 0.80)';
            sprite.padding = [3, 2];
            sprite.borderRadius = 4;
            sprite.fontFace = 'Inter, Arial, sans-serif';
            sprite.fontWeight = selected || typedNode.kind === 'product' ? '700' : '500';
            sprite.material.depthTest = false;
            sprite.renderOrder = 1000;
            sprite.position.y = radius + 5;
            group.add(sprite);
          }

          return group;
        }}
        linkColor={(link) => {
          const typedLink = link as RenderLink;
          return isLinkFaded(typedLink) ? '#20283a' : typedLink.baseColor;
        }}
        linkOpacity={0.55}
        linkWidth={(link) => {
          const typedLink = link as RenderLink;
          if (typedLink.id === selectedEdgeId) return 3.4;
          if (isLinkFaded(typedLink)) return 0.12;
          if (visualMode === 'drift') {
            return typedLink.drift === 'stable' ? 0.25 : typedLink.drift === 'modified' ? 1.8 : 1.25;
          }
          if (typedLink.health === 'error') return 2.4;
          if (typedLink.health === 'impacted') return 1.5;
          if (typedLink.health === 'warning') return 1.2;
          if (typedLink.change === 'affected') return 0.9;
          if (typedLink.change === 'changed') return 0.7;
          return 0.38;
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
        linkDirectionalParticles={(link) => {
          const typedLink = link as RenderLink;
          if (isLinkFaded(typedLink)) return 0;
          if (typedLink.id === selectedEdgeId) return 4;
          if (typedLink.health === 'error') return 2;
          return 0;
        }}
        linkDirectionalParticleWidth={(link) => (link as RenderLink).id === selectedEdgeId ? 2.4 : 1.5}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(link) => (link as RenderLink).baseColor}
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
          fitGraph();
        }}
      />
      <div className="graph-controls">
        <button type="button" onClick={fitGraph}>Fit graph</button>
        <span aria-hidden="true">Drag to orbit · Scroll to zoom · Right-drag to pan</span>
      </div>
    </div>
  );
}
