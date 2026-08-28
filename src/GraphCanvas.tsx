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
import {
  flowParticleSpeed,
  flowRenderEndpoints,
  hasReverseFlow,
  metadataFlowDirection,
  shouldAnimateFlowEdge,
  startFlowEmitter,
  type FlowDirection,
  type FlowScope,
} from './flow';
import type {
  ArchEdge,
  ArchGraphData,
  ChangeState,
  DriftState,
  HealthState,
} from './types';

type VisualMode = 'default' | 'drift' | 'security';

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

const flowRelationColor: Partial<Record<ArchEdge['relation'], string>> = {
  calls: '#72d4ff',
  reads: '#6ee7c4',
  writes: '#f4c86d',
  'integrates-with': '#c99cff',
};

const relationLabelWeight: Record<ArchEdge['relation'], number> = {
  calls: 120,
  reads: 110,
  writes: 110,
  'integrates-with': 95,
  'depends-on': 70,
  imports: 50,
  contains: 20,
};

const kindLabelWeight: Record<string, number> = {
  product: 120,
  system: 110,
  integration: 105,
  data: 100,
  api: 95,
  service: 90,
  feature: 80,
  route: 65,
  component: 50,
  module: 35,
  file: 20,
  unknown: 10,
};

export const semanticKindColor: Record<string, string> = {
  product: '#d6e2f5',
  system: '#8aa2d3',
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
  system: 14,
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
  system: 5.1,
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
  system: 48,
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
  'system',
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
  evidenceId: string;
  source: string | RenderNode;
  target: string | RenderNode;
  evidenceSource: string;
  evidenceTarget: string;
  label: string;
  relation: ArchEdge['relation'];
  flowDirection?: FlowDirection;
  flowOnly: boolean;
  health: HealthState;
  change: ChangeState;
  drift: DriftState;
  baseColor: string;
  securitySensitiveData: boolean;
  securityTransport?: string;
  securityFinding?: string;
  securitySeverity?: string;
  securityExternalBoundary: boolean;
  securityBoundary?: string;
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
  visualMode: VisualMode,
) {
  if (visualMode === 'drift') return driftColor[drift ?? 'stable'];
  if (health === 'error' || health === 'warning' || health === 'impacted') return healthColor[health];
  if (visualMode !== 'security' && (change === 'changed' || change === 'affected')) return changeColor[change];
  return healthyDefault;
}

function nodeColor(kind: string, health: HealthState, drift: DriftState, visualMode: VisualMode) {
  if (visualMode === 'drift') return driftColor[drift];
  if (health === 'error' || health === 'warning' || health === 'impacted') return healthColor[health];
  return semanticKindColor[kind] ?? semanticKindColor.unknown;
}

function securityEdgeColor(edge: ArchEdge) {
  const metadata = edge.metadata;
  if (metadata?.securityFinding === 'sensitive-data-over-cleartext' || metadata?.securitySeverity === 'high') return '#ff5364';
  if (metadata?.securityTransport === 'cleartext') return '#f0a84b';
  if (metadata?.securitySensitiveData === true && metadata?.securityTransport === 'tls-requested') return '#4fd1a1';
  if (metadata?.securitySensitiveData === true && metadata?.securityTransport === 'unknown') return '#e5b957';
  if (metadata?.securitySensitiveData === true) return '#75d8bd';
  if (metadata?.securityExternalBoundary === true && metadata?.securityTransport === 'tls-requested') return '#61b9db';
  if (metadata?.securityTransport === 'unknown' || metadata?.securityBoundary === 'managed-service') return '#7b879c';
  return '#3c4960';
}

function endpointId(endpoint: string | RenderNode) {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

function geometryForKind(kind: string, radius: number): BufferGeometry {
  switch (kind) {
    case 'product':
      return new IcosahedronGeometry(radius, 1);
    case 'system':
      return new BoxGeometry(radius * 1.55, radius * 1.12, radius * 1.55);
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
  visualMode?: VisualMode;
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
  const [flowEnabled, setFlowEnabled] = useState(false);
  const [flowScope, setFlowScope] = useState<FlowScope>('all');
  const fittedGraphRef = useRef<string | undefined>(undefined);
  const previousFlowSelectionRef = useRef('');

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

  useEffect(() => {
    const selectionKey = selectedEdgeId
      ? `edge:${selectedEdgeId}`
      : selectedNodeId
        ? `node:${selectedNodeId}`
        : '';

    if (flowEnabled && selectionKey && selectionKey !== previousFlowSelectionRef.current) {
      setFlowScope('focus');
    } else if (flowEnabled && !selectionKey && flowScope === 'focus') {
      setFlowScope('all');
    }

    previousFlowSelectionRef.current = selectionKey;
  }, [flowEnabled, flowScope, selectedEdgeId, selectedNodeId]);

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
      .flatMap((edge) => {
        const flowDirection = metadataFlowDirection(edge.metadata);
        const semanticEdge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          relation: edge.relation,
          flowDirection,
        };
        const renderEndpoints = flowRenderEndpoints(semanticEdge);
        const base: RenderLink = {
          id: edge.id,
          evidenceId: edge.id,
          source: renderEndpoints.source,
          target: renderEndpoints.target,
          evidenceSource: edge.source,
          evidenceTarget: edge.target,
          label: edge.label ?? edge.relation,
          relation: edge.relation,
          flowDirection,
          flowOnly: false,
          health: edge.health,
          change: edge.change ?? 'unchanged',
          drift: edge.drift ?? 'stable',
          baseColor: visualMode === 'security'
            ? securityEdgeColor(edge)
            : graphColor(edge.health, edge.change, edge.drift, '#3c4960', visualMode),
          securitySensitiveData: edge.metadata?.securitySensitiveData === true,
          securityTransport: typeof edge.metadata?.securityTransport === 'string' ? edge.metadata.securityTransport : undefined,
          securityFinding: typeof edge.metadata?.securityFinding === 'string' ? edge.metadata.securityFinding : undefined,
          securitySeverity: typeof edge.metadata?.securitySeverity === 'string' ? edge.metadata.securitySeverity : undefined,
          securityExternalBoundary: edge.metadata?.securityExternalBoundary === true,
          securityBoundary: typeof edge.metadata?.securityBoundary === 'string' ? edge.metadata.securityBoundary : undefined,
        };

        if (!hasReverseFlow(semanticEdge)) return [base];

        return [
          base,
          {
            ...base,
            id: `${edge.id}:flow-reverse`,
            source: edge.target,
            target: edge.source,
            flowOnly: true,
          },
        ];
      });

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

  const labelPriorityIds = useMemo(() => {
    const result = new Set<string>();
    if (selectedEdgeId) {
      const edge = data.edges.find((candidate) => candidate.id === selectedEdgeId);
      if (edge) {
        result.add(edge.source);
        result.add(edge.target);
      }
      return result;
    }
    if (!selectedNodeId) return result;

    result.add(selectedNodeId);
    const degree = new Map<string, number>();
    for (const edge of data.edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }

    const nodeById = new Map(data.nodes.map((node) => [node.id, node]));
    const scored = new Map<string, number>();
    for (const edge of data.edges) {
      const otherId = edge.source === selectedNodeId
        ? edge.target
        : edge.target === selectedNodeId
          ? edge.source
          : undefined;
      if (!otherId) continue;
      const node = nodeById.get(otherId);
      if (!node) continue;
      const healthBonus = node.health === 'error'
        ? 240
        : node.health === 'warning'
          ? 160
          : node.health === 'impacted'
            ? 120
            : 0;
      const score = (relationLabelWeight[edge.relation] ?? 0)
        + (kindLabelWeight[node.kind] ?? 0)
        + Math.min(50, (degree.get(otherId) ?? 0) * 3)
        + healthBonus;
      scored.set(otherId, Math.max(scored.get(otherId) ?? 0, score));
    }

    for (const [id] of [...scored.entries()].sort((left, right) => right[1] - left[1]).slice(0, 12)) {
      result.add(id);
    }
    return result;
  }, [data.edges, data.nodes, selectedEdgeId, selectedNodeId]);

  const flowSelection = useMemo(() => ({
    enabled: flowEnabled,
    scope: flowScope,
    selectedNodeId,
    selectedEdgeId,
  }), [flowEnabled, flowScope, selectedEdgeId, selectedNodeId]);

  const isNodeFaded = (node: RenderNode) => {
    if (selection.edgeEndpoints) return !selection.edgeEndpoints.has(node.id);
    if (!selectedNodeId) return false;
    return node.id !== selectedNodeId && !selection.neighbors.has(node.id);
  };

  const isLinkFaded = (link: RenderLink) => {
    if (selectedEdgeId) return link.evidenceId !== selectedEdgeId;
    if (!selectedNodeId) return false;
    return link.evidenceSource !== selectedNodeId && link.evidenceTarget !== selectedNodeId;
  };

  const flowEdge = (link: RenderLink) => ({
    id: link.evidenceId,
    source: link.evidenceSource,
    target: link.evidenceTarget,
    relation: link.relation,
    flowDirection: link.flowDirection,
  });

  const isFlowLinkActive = (link: RenderLink) => shouldAnimateFlowEdge(flowEdge(link), flowSelection);

  const flowColor = (link: RenderLink) => {
    if (visualMode === 'security') return link.baseColor;
    if (link.health === 'error' || link.health === 'warning' || link.health === 'impacted') return link.baseColor;
    return flowRelationColor[link.relation] ?? '#9ec5ff';
  };

  useEffect(() => {
    if (!flowEnabled) return undefined;

    const emitterEdges = graphData.links.map((link) => ({
      ...flowEdge(link),
      renderLink: link,
    }));

    return startFlowEmitter({
      edges: emitterEdges,
      selection: flowSelection,
      emit: ({ renderLink }) => graphRef.current?.emitParticle(renderLink),
    });
  }, [flowEnabled, flowSelection, graphData.links]);

  useEffect(() => {
    const force = graphRef.current?.d3Force('link') as {
      strength?: (accessor: (link: unknown) => number) => unknown;
    } | undefined;
    if (!force?.strength) return;

    const degree = new Map<string, number>();
    for (const link of graphData.links) {
      if (link.flowOnly) continue;
      const source = endpointId(link.source);
      const target = endpointId(link.target);
      degree.set(source, (degree.get(source) ?? 0) + 1);
      degree.set(target, (degree.get(target) ?? 0) + 1);
    }

    force.strength((rawLink) => {
      const link = rawLink as RenderLink;
      if (link.flowOnly) return 0;
      const sourceDegree = degree.get(endpointId(link.source)) ?? 1;
      const targetDegree = degree.get(endpointId(link.target)) ?? 1;
      return 1 / Math.max(1, Math.min(sourceDegree, targetDegree));
    });
    graphRef.current?.d3ReheatSimulation();
  }, [graphData.links]);

  const graphIdentity = useMemo(
    () => `${visualMode}:${errorsOnly ? 'errors' : 'all'}:${graphData.nodes.map((node) => node.id).join('|')}`,
    [errorsOnly, graphData.nodes, visualMode],
  );

  const fitGraph = () => {
    fittedGraphRef.current = graphIdentity;
    graphRef.current?.zoomToFit(450, 96);
  };

  const toggleFlow = () => {
    setFlowEnabled((enabled) => {
      const next = !enabled;
      if (next) setFlowScope(selectedNodeId || selectedEdgeId ? 'focus' : 'all');
      return next;
    });
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
          const scale = selected ? 1.24 : edgeEndpoint ? 1.15 : 1;
          group.scale.setScalar(scale);

          const material = new MeshStandardMaterial({
            color: faded ? '#273147' : typedNode.baseColor,
            roughness: 0.5,
            metalness: typedNode.kind === 'integration' || typedNode.kind === 'product'
              ? 0.28
              : typedNode.kind === 'system'
                ? 0.2
                : 0.12,
            transparent: faded,
            opacity: faded ? 0.18 : 0.96,
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

          if (!faded && visualMode !== 'drift' && visualMode !== 'security' && (typedNode.change === 'changed' || typedNode.change === 'affected')) {
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

          const selectedContext = Boolean(selectedNodeId || selectedEdgeId);
          const showLabel = !faded && (
            selected
            || edgeEndpoint
            || (selectedContext ? labelPriorityIds.has(typedNode.id) : alwaysLabelKinds.has(typedNode.kind))
          );
          if (showLabel) {
            const labelSize = selected
              ? 3.8
              : edgeEndpoint
                ? 3.55
                : typedNode.kind === 'product'
                  ? 3.6
                  : typedNode.kind === 'system'
                    ? 3.3
                    : 2.95;
            const sprite = new SpriteText(
              typedNode.label,
              labelSize,
              selected ? '#ffffff' : '#dbe6f8',
            );
            sprite.backgroundColor = 'rgba(9, 13, 23, 0.80)';
            sprite.padding = [3, 2];
            sprite.borderRadius = 4;
            sprite.fontFace = 'Inter, Arial, sans-serif';
            sprite.fontWeight = selected || typedNode.kind === 'product' || typedNode.kind === 'system' ? '700' : '500';
            sprite.material.depthTest = false;
            sprite.renderOrder = 1000;
            sprite.position.y = radius + 5;
            group.add(sprite);
          }

          return group;
        }}
        linkColor={(link) => {
          const typedLink = link as RenderLink;
          if (typedLink.flowOnly) return '#000000';
          if (flowScope === 'focus' && isFlowLinkActive(typedLink) && !isLinkFaded(typedLink)) return flowColor(typedLink);
          return isLinkFaded(typedLink) ? '#171d2b' : typedLink.baseColor;
        }}
        linkOpacity={visualMode === 'security' ? 0.72 : 0.55}
        linkWidth={(link) => {
          const typedLink = link as RenderLink;
          if (typedLink.flowOnly) return 0;
          if (typedLink.evidenceId === selectedEdgeId) return isFlowLinkActive(typedLink) ? 1.15 : 2.4;
          if (isLinkFaded(typedLink)) return 0.02;
          if (flowScope === 'focus' && isFlowLinkActive(typedLink)) return 0.52;
          if (visualMode === 'security') {
            if (typedLink.securityFinding || typedLink.securityTransport === 'cleartext') return 1.8;
            if (typedLink.securitySensitiveData) return 1.05;
            if (typedLink.securityExternalBoundary) return 0.75;
            return 0.52;
          }
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
          if (visualMode === 'security') {
            const security = typedLink.securityFinding
              ?? (typedLink.securitySensitiveData ? 'sensitive data' : typedLink.securityTransport ?? typedLink.securityBoundary ?? 'security evidence');
            return `${typedLink.label} · ${security}`;
          }
          return `${typedLink.label} · ${typedLink.health}`;
        }}
        linkHoverPrecision={5}
        linkDirectionalArrowLength={(link) => {
          const typedLink = link as RenderLink;
          if (isLinkFaded(typedLink)) return 0;
          if (typedLink.evidenceId === selectedEdgeId) return isFlowLinkActive(typedLink) ? 1.7 : 3;
          if (flowScope === 'focus' && isFlowLinkActive(typedLink)) return 1.05;
          if (!typedLink.flowOnly && (typedLink.health === 'error' || typedLink.health === 'impacted')) return 2.3;
          return 0;
        }}
        linkDirectionalArrowRelPos={0.82}
        linkDirectionalArrowColor={(link) => {
          const typedLink = link as RenderLink;
          return isFlowLinkActive(typedLink) ? flowColor(typedLink) : typedLink.baseColor;
        }}
        linkDirectionalParticles={0}
        linkDirectionalParticleWidth={(link) => {
          const typedLink = link as RenderLink;
          if (!isFlowLinkActive(typedLink)) return 0;
          if (typedLink.evidenceId === selectedEdgeId) return 0.82;
          return flowScope === 'focus' ? 0.62 : 0.42;
        }}
        linkDirectionalParticleSpeed={(link) => flowParticleSpeed((link as RenderLink).relation)}
        linkDirectionalParticleColor={(link) => flowColor(link as RenderLink)}
        onNodeClick={(node) => {
          const typedNode = node as RenderNode;
          onSelectEdge(undefined);
          onSelectNode(typedNode.id);
        }}
        onLinkClick={(link) => {
          const typedLink = link as RenderLink;
          onSelectNode(undefined);
          onSelectEdge(typedLink.evidenceId);
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
        <div className="flow-controls" role="group" aria-label="Directional flow controls">
          <button
            type="button"
            className={flowEnabled ? 'active' : ''}
            aria-pressed={flowEnabled}
            onClick={toggleFlow}
            title="Animate illustrative directional calls, reads, writes, and evidence-backed integrations"
          >
            Flow {flowEnabled ? 'on' : 'off'}
          </button>
          {flowEnabled && (
            <>
              <button
                type="button"
                className={flowScope === 'focus' ? 'active secondary' : 'secondary'}
                aria-pressed={flowScope === 'focus'}
                disabled={!selectedNodeId && !selectedEdgeId}
                onClick={() => setFlowScope('focus')}
                title="Animate only the selected node or connection"
              >
                Focus
              </button>
              <button
                type="button"
                className={flowScope === 'all' ? 'active secondary' : 'secondary'}
                aria-pressed={flowScope === 'all'}
                onClick={() => setFlowScope('all')}
                title="Simulate intermittent pulses across every visible runtime and data flow"
              >
                All
              </button>
            </>
          )}
        </div>
        <span aria-hidden="true">
          {flowEnabled
            ? visualMode === 'security'
              ? 'Illustrative pulses show detected direction; security colors remain evidence-based'
              : flowScope === 'focus'
                ? 'Illustrative pulses are staggered around the selection · not runtime traffic volume'
                : 'Illustrative pulses are staggered from static evidence · not runtime traffic volume'
            : 'Drag to orbit · Scroll to zoom · Right-drag to pan'}
        </span>
      </div>
    </div>
  );
}
