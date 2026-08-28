import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Boxes,
  CircleDot,
  Code2,
  Database,
  GitBranch,
  History,
  Network,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { GraphCanvas } from './GraphCanvas';
import { LensPanel } from './LensPanel';
import { SecurityEvidence } from './SecurityEvidence';
import { SourceOpenAction } from './SourceOpenAction';
import { TraceBar } from './TraceBar';
import {
  projectHealthContext,
  projectProductAreas,
  projectRequestFlow,
  projectSystemOverview,
  type ArchitectureLens,
} from './lenses';
import { projectArchitecture } from './projections/architecture';
import { projectChanges } from './projections/changes';
import { projectDrift } from './projections/drift';
import { projectSecurity } from './projections/security';
import { projectSystemBoundaries } from './projections/systems';
import { projectTopology } from './projections/topology';
import { projectTrace, type TraceDirection } from './projections/trace';
import { sampleGraph } from './sample-graph';
import type {
  ArchEdge,
  ArchGraphData,
  ArchNode,
  ChangeState,
  DriftState,
  GraphMetadata,
  HealthState,
} from './types';

const healthLabel: Record<HealthState, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  error: 'Error',
  impacted: 'Impacted',
  unknown: 'Unknown',
};

const changeLabel: Record<ChangeState, string> = {
  unchanged: 'Unchanged',
  changed: 'Changed',
  affected: 'Affected',
};

const driftLabel: Record<DriftState, string> = {
  stable: 'Stable',
  added: 'Added',
  removed: 'Removed',
  modified: 'Modified',
};

type ViewMode = 'architecture' | 'topology' | 'changes' | 'drift' | 'code';

interface ConnectionListProps {
  title: string;
  icon: 'outbound' | 'inbound';
  edges: ArchEdge[];
  selectedNodeId: string;
  data: ArchGraphData;
  onSelect: (nodeId: string) => void;
}

function ConnectionList({ title, icon, edges, selectedNodeId, data, onSelect }: ConnectionListProps) {
  return (
    <section className="connection-section">
      <h3>
        {icon === 'outbound' ? <ArrowDownRight size={13} /> : <ArrowUpLeft size={13} />}
        {title}
        <span>{edges.length}</span>
      </h3>
      <div className="connection-list">
        {edges.length === 0 && <p className="muted">None detected.</p>}
        {edges.map((edge) => {
          const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
          const other = data.nodes.find((node) => node.id === otherId);
          return (
            <button key={edge.id} type="button" onClick={() => onSelect(otherId)}>
              <span className={`edge-state ${edge.health} change-${edge.change ?? 'unchanged'} drift-${edge.drift ?? 'stable'}`} />
              <span className="connection-copy">
                <strong>{other?.label ?? otherId}</strong>
                <small>{edge.relation}{edge.label ? ` · ${edge.label}` : ''}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function HealthEvidence({ health, metadata }: { health: HealthState; metadata?: GraphMetadata }) {
  const message = metadata?.healthMessage;
  if ((health !== 'error' && health !== 'warning') || typeof message !== 'string') return null;

  const source = metadata?.healthSource;
  const timestamp = metadata?.healthTimestamp;

  return (
    <section className={`health-evidence ${health}`}>
      <div className="health-evidence-title">
        {health === 'error' ? <XCircle size={14} /> : <AlertTriangle size={14} />}
        Direct evidence
      </div>
      <p>{message}</p>
      <dl>
        {source && <div><dt>Source</dt><dd>{String(source)}</dd></div>}
        {timestamp && <div><dt>Observed</dt><dd>{String(timestamp)}</dd></div>}
      </dl>
    </section>
  );
}

function ChangeBadge({ change }: { change?: ChangeState }) {
  if (!change || change === 'unchanged') return null;
  return <div className={`change-badge ${change}`}>{changeLabel[change]}</div>;
}

function DriftBadge({ drift }: { drift?: DriftState }) {
  if (!drift || drift === 'stable') return null;
  return <div className={`drift-badge ${drift}`}>{driftLabel[drift]}</div>;
}

function DriftNote({ drift }: { drift?: DriftState }) {
  if (!drift || drift === 'stable') return null;

  const copy = drift === 'added'
    ? 'This entity appeared in the current scan and was not present in the previous successful live scan.'
    : drift === 'removed'
      ? 'This entity existed in the previous successful live scan but is absent from the current architecture. It is shown as historical context.'
      : 'This entity kept the same identity, but its structural role or architecture metadata changed between scans.';

  return <p className={`drift-note ${drift}`}>{copy}</p>;
}

function positiveCount(value: unknown) {
  return typeof value === 'number' && value > 0 ? value : undefined;
}

function emptyDriftView(data: ArchGraphData): ArchGraphData {
  return {
    project: data.project,
    generatedAt: data.generatedAt,
    nodes: [],
    edges: [],
    metadata: { graphKind: 'drift' },
  };
}

export default function App() {
  const [data, setData] = useState<ArchGraphData>(sampleGraph);
  const [driftData, setDriftData] = useState<ArchGraphData>();
  const [source, setSource] = useState<'scan' | 'demo'>('demo');
  const [viewMode, setViewMode] = useState<ViewMode>('architecture');
  const [activeLens, setActiveLens] = useState<ArchitectureLens>('system');
  const [focusedFeatureId, setFocusedFeatureId] = useState<string>();
  const [traceRootId, setTraceRootId] = useState<string>();
  const [traceDirection, setTraceDirection] = useState<TraceDirection>('both');
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [query, setQuery] = useState('');

  const loadGraph = useCallback(async () => {
    try {
      const response = await fetch(`/archmesh.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('No scan available');
      const graph = await response.json() as ArchGraphData;
      if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error('Invalid graph data');
      setData(graph);
      setSource('scan');

      try {
        const driftResponse = await fetch(`/archmesh-drift.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!driftResponse.ok) throw new Error('No drift data');
        const drift = await driftResponse.json() as ArchGraphData;
        if (!Array.isArray(drift.nodes) || !Array.isArray(drift.edges)) throw new Error('Invalid drift data');
        setDriftData(drift);
      } catch {
        setDriftData(undefined);
      }
    } catch {
      setData(sampleGraph);
      setDriftData(undefined);
      setSource('demo');
    }
  }, []);

  useEffect(() => {
    void loadGraph();

    const onGraphRefresh = () => void loadGraph();
    import.meta.hot?.on('archmesh:graph', onGraphRefresh);

    return () => {
      import.meta.hot?.off('archmesh:graph', onGraphRefresh);
    };
  }, [loadGraph]);

  const architectureProjection = useMemo(
    () => projectArchitecture(data, focusedFeatureId),
    [data, focusedFeatureId],
  );
  const detectedSystemProjection = useMemo(
    () => projectSystemBoundaries(data),
    [data],
  );
  const systemProjection = useMemo(
    () => detectedSystemProjection ?? projectSystemOverview(architectureProjection.graph),
    [architectureProjection.graph, detectedSystemProjection],
  );
  const productAreasProjection = useMemo(
    () => projectProductAreas(architectureProjection.graph),
    [architectureProjection.graph],
  );
  const topologyProjection = useMemo(() => projectTopology(data), [data]);
  const requestFlowProjection = useMemo(() => projectRequestFlow(data), [data]);
  const securityProjection = useMemo(() => projectSecurity(data), [data]);
  const changesProjection = useMemo(() => projectChanges(data), [data]);
  const driftProjection = useMemo(
    () => projectDrift(driftData ?? emptyDriftView(data)),
    [data, driftData],
  );
  const healthProjection = useMemo(
    () => projectHealthContext(architectureProjection.graph),
    [architectureProjection.graph],
  );

  const baseVisibleData = useMemo(() => {
    if (source === 'demo') return data;
    if (focusedFeatureId && viewMode === 'architecture' && activeLens !== 'security') return architectureProjection.graph;
    if (activeLens === 'system') return systemProjection;
    if (activeLens === 'areas') return productAreasProjection;
    if (activeLens === 'topology') return topologyProjection;
    if (activeLens === 'request-flow') return requestFlowProjection;
    if (activeLens === 'security') return securityProjection;
    if (activeLens === 'changes') return changesProjection;
    if (activeLens === 'health') return healthProjection;
    if (activeLens === 'drift') return driftProjection;
    return data;
  }, [
    activeLens,
    architectureProjection.graph,
    changesProjection,
    data,
    driftProjection,
    focusedFeatureId,
    healthProjection,
    productAreasProjection,
    requestFlowProjection,
    securityProjection,
    source,
    systemProjection,
    topologyProjection,
    viewMode,
  ]);

  const traceProjection = useMemo(
    () => traceRootId
      ? projectTrace(baseVisibleData, { rootId: traceRootId, direction: traceDirection })
      : undefined,
    [baseVisibleData, traceDirection, traceRootId],
  );

  const visibleData = traceProjection ?? baseVisibleData;

  const selectNode = useCallback((nodeId?: string) => {
    setSelectedEdgeId(undefined);
    setSelectedNodeId(nodeId);
  }, []);

  const selectEdge = useCallback((edgeId?: string) => {
    setSelectedNodeId(undefined);
    setSelectedEdgeId(edgeId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(undefined);
    setSelectedEdgeId(undefined);
  }, []);

  const clearTrace = useCallback(() => {
    setTraceRootId(undefined);
    setTraceDirection('both');
  }, []);

  const beginTrace = useCallback((nodeId: string) => {
    setTraceRootId(nodeId);
    setTraceDirection('both');
    setSelectedEdgeId(undefined);
    setSelectedNodeId(nodeId);
    setErrorsOnly(false);
  }, []);

  const exitTrace = useCallback(() => {
    const rootId = traceRootId;
    clearTrace();
    setSelectedEdgeId(undefined);
    setSelectedNodeId(rootId);
  }, [clearTrace, traceRootId]);

  useEffect(() => {
    if (traceRootId && !baseVisibleData.nodes.some((node) => node.id === traceRootId)) {
      clearTrace();
    }
  }, [baseVisibleData.nodes, clearTrace, traceRootId]);

  useEffect(() => {
    if (selectedNodeId && !visibleData.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(traceRootId && visibleData.nodes.some((node) => node.id === traceRootId) ? traceRootId : undefined);
    }
    if (selectedEdgeId && !visibleData.edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(undefined);
    }
  }, [selectedEdgeId, selectedNodeId, traceRootId, visibleData.edges, visibleData.nodes]);

  const selectedNode = useMemo(
    () => visibleData.nodes.find((node) => node.id === selectedNodeId),
    [visibleData.nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => visibleData.edges.find((edge) => edge.id === selectedEdgeId),
    [visibleData.edges, selectedEdgeId],
  );

  const traceRoot = useMemo(
    () => traceRootId ? baseVisibleData.nodes.find((node) => node.id === traceRootId) : undefined,
    [baseVisibleData.nodes, traceRootId],
  );

  const selectedEdgeSource = selectedEdge
    ? visibleData.nodes.find((node) => node.id === selectedEdge.source)
    : undefined;
  const selectedEdgeTarget = selectedEdge
    ? visibleData.nodes.find((node) => node.id === selectedEdge.target)
    : undefined;

  const selectedConnections = useMemo(() => {
    if (!selectedNodeId) return { outbound: [], inbound: [] };
    return {
      outbound: visibleData.edges.filter((edge) => edge.source === selectedNodeId),
      inbound: visibleData.edges.filter((edge) => edge.target === selectedNodeId),
    };
  }, [visibleData.edges, selectedNodeId]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return visibleData.nodes
      .filter((node) => `${node.label} ${node.path ?? ''} ${node.kind}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [query, visibleData.nodes]);

  const counts = useMemo(() => {
    const result = {
      healthy: 0,
      warning: 0,
      error: 0,
      impacted: 0,
      unknown: 0,
      changed: 0,
      affected: 0,
      added: 0,
      removed: 0,
      modified: 0,
    };
    for (const node of visibleData.nodes) {
      result[node.health] += 1;
      if (node.change === 'changed') result.changed += 1;
      if (node.change === 'affected') result.affected += 1;
      if (node.drift === 'added') result.added += 1;
      if (node.drift === 'removed') result.removed += 1;
      if (node.drift === 'modified') result.modified += 1;
    }
    return result;
  }, [visibleData.nodes]);

  const securityCounts = useMemo(() => ({
    findings: Number(securityProjection.metadata?.securityFindingCount ?? 0),
    sensitive: Number(securityProjection.metadata?.securitySensitiveFlowCount ?? 0),
    cleartext: Number(securityProjection.metadata?.securityCleartextCount ?? 0),
    external: Number(securityProjection.metadata?.securityExternalBoundaryCount ?? 0),
  }), [securityProjection.metadata]);

  const chooseSearchResult = (node: ArchNode) => {
    selectNode(node.id);
    setQuery('');
  };

  const changeView = (mode: ViewMode) => {
    clearTrace();
    setViewMode(mode);
    setActiveLens(
      mode === 'architecture'
        ? 'system'
        : mode === 'topology'
          ? 'topology'
          : mode === 'changes'
            ? 'changes'
            : mode === 'drift'
              ? 'drift'
              : 'code',
    );
    clearSelection();
    setErrorsOnly(false);
    if (mode !== 'architecture') setFocusedFeatureId(undefined);
  };

  const activateLens = (lens: ArchitectureLens) => {
    clearTrace();
    setActiveLens(lens);
    setViewMode(
      lens === 'system' || lens === 'areas' || lens === 'health' || lens === 'security'
        ? 'architecture'
        : lens === 'topology'
          ? 'topology'
          : lens === 'changes'
            ? 'changes'
            : lens === 'drift'
              ? 'drift'
              : 'code',
    );
    setFocusedFeatureId(undefined);
    setErrorsOnly(false);
    clearSelection();
  };

  const focusedFeature = architectureProjection.graph.nodes.find(
    (node) => node.id === focusedFeatureId,
  );

  const semanticSource = selectedNode?.metadata?.semanticSource;
  const routePath = selectedNode?.metadata?.routePath;
  const httpMethods = selectedNode?.metadata?.httpMethods;
  const serverActionCount = selectedNode?.metadata?.serverActionCount;
  const provider = selectedNode?.metadata?.provider;
  const resourceType = selectedNode?.metadata?.resourceType;
  const systemType = selectedNode?.metadata?.systemType;
  const systemRoot = selectedNode?.metadata?.systemRoot;
  const memberCount = positiveCount(selectedNode?.metadata?.memberCount);
  const changedMembers = positiveCount(selectedNode?.metadata?.changedMembers);
  const affectedMembers = positiveCount(selectedNode?.metadata?.affectedMembers);
  const changedFeatures = positiveCount(selectedNode?.metadata?.changedFeatures);
  const affectedFeatures = positiveCount(selectedNode?.metadata?.affectedFeatures);
  const hiddenNodes = positiveCount(visibleData.metadata?.hiddenNodes) ?? 0;

  const searchPlaceholder = traceRootId
    ? `Search trace around ${traceRoot?.label ?? 'selection'}…`
    : activeLens === 'security'
      ? 'Find sensitive data, external systems, security evidence…'
      : activeLens === 'request-flow'
        ? 'Find a route, API, service…'
        : activeLens === 'health'
          ? 'Find a failing or impacted area…'
          : viewMode === 'architecture'
            ? 'Find a system, feature, integration, service…'
            : viewMode === 'topology'
              ? 'Find a feature, collection, integration…'
              : viewMode === 'changes'
                ? 'Find changed or affected code…'
                : viewMode === 'drift'
                  ? 'Find added, removed, or modified architecture…'
                  : 'Find a route, component, file…';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Boxes size={21} /></div>
          <div>
            <h1>ArchMesh</h1>
            <p>{data.project}</p>
          </div>
        </div>

        <div className="status-strip" aria-label="Architecture status summary">
          {activeLens === 'security' && source === 'scan' ? (
            <>
              <span className="status status-security"><ShieldCheck size={14} /> {securityCounts.sensitive} sensitive flows</span>
              <span className="status status-security-warning"><ShieldAlert size={14} /> {securityCounts.findings} findings</span>
              {securityCounts.cleartext > 0 && (
                <span className="status status-error"><XCircle size={14} /> {securityCounts.cleartext} cleartext</span>
              )}
            </>
          ) : viewMode === 'drift' && source === 'scan' ? (
            <>
              <span className="status status-drift-added"><History size={14} /> {counts.added} added</span>
              <span className="status status-drift-removed"><History size={14} /> {counts.removed} removed</span>
              <span className="status status-drift-modified"><History size={14} /> {counts.modified} modified</span>
            </>
          ) : viewMode === 'changes' && source === 'scan' ? (
            <>
              <span className="status status-changed"><GitBranch size={14} /> {counts.changed} changed</span>
              <span className="status status-affected"><CircleDot size={14} /> {counts.affected} affected</span>
            </>
          ) : (
            <>
              <span className="status status-error"><XCircle size={14} /> {counts.error} errors</span>
              <span className="status status-impact"><AlertTriangle size={14} /> {counts.impacted} impacted</span>
              {source === 'scan' && counts.changed > 0 && (
                <span className="status status-changed"><GitBranch size={14} /> {counts.changed} changed</span>
              )}
              {source === 'scan' && counts.affected > 0 && (
                <span className="status status-affected"><CircleDot size={14} /> {counts.affected} affected</span>
              )}
            </>
          )}
          <span className="status"><CircleDot size={14} /> {visibleData.nodes.length} nodes</span>
        </div>
      </header>

      <section className="toolbar">
        <div className="search-wrap">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search architecture"
          />
          {matches.length > 0 && (
            <div className="search-results">
              {matches.map((node) => (
                <button key={node.id} type="button" onClick={() => chooseSearchResult(node)}>
                  <span>{node.label}</span>
                  <small>{node.kind}{node.path ? ` · ${node.path}` : ''}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="toolbar-actions">
          <span className={`source-pill ${source === 'demo' ? 'demo' : ''}`}>
            {source === 'scan' ? 'Local scan' : 'Demo data'}
          </span>
          {source === 'scan' && (
            <div className="view-switch" aria-label="Graph view">
              <button
                type="button"
                className={viewMode === 'architecture' ? 'selected' : ''}
                onClick={() => changeView('architecture')}
              >
                <Network size={14} /> Architecture
              </button>
              <button
                type="button"
                className={viewMode === 'topology' ? 'selected' : ''}
                onClick={() => changeView('topology')}
              >
                <Database size={14} /> Topology
              </button>
              <button
                type="button"
                className={viewMode === 'changes' ? 'selected' : ''}
                onClick={() => changeView('changes')}
              >
                <GitBranch size={14} /> Changes
              </button>
              <button
                type="button"
                className={viewMode === 'drift' ? 'selected' : ''}
                onClick={() => changeView('drift')}
              >
                <History size={14} /> Drift
              </button>
              <button
                type="button"
                className={viewMode === 'code' ? 'selected' : ''}
                onClick={() => changeView('code')}
              >
                <Code2 size={14} /> Code
              </button>
            </div>
          )}
          {viewMode !== 'changes' && viewMode !== 'drift' && activeLens !== 'security' && (
            <button
              type="button"
              className={errorsOnly ? 'active' : ''}
              onClick={() => {
                setErrorsOnly((value) => !value);
                clearSelection();
                clearTrace();
              }}
            >
              Errors only
            </button>
          )}
        </div>
      </section>

      {source === 'scan' && viewMode === 'architecture' && focusedFeatureId && activeLens !== 'security' && (
        <div className="focus-bar">
          <button
            type="button"
            onClick={() => {
              clearTrace();
              setFocusedFeatureId(undefined);
              clearSelection();
            }}
          >
            <ArrowLeft size={14} /> System overview
          </button>
          <span>Exploring <strong>{focusedFeature?.label ?? focusedFeatureId}</strong></span>
        </div>
      )}

      {source === 'scan' && traceRootId && traceRoot && (
        <TraceBar
          rootLabel={traceRoot.label}
          direction={traceDirection}
          nodeCount={visibleData.nodes.length}
          edgeCount={visibleData.edges.length}
          onDirectionChange={(direction) => {
            setTraceDirection(direction);
            selectNode(traceRootId);
          }}
          onExit={exitTrace}
        />
      )}

      <section className="workspace">
        <div className="graph-panel">
          <GraphCanvas
            data={visibleData}
            errorsOnly={errorsOnly}
            visualMode={viewMode === 'drift' ? 'drift' : activeLens === 'security' ? 'security' : 'default'}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={selectNode}
            onSelectEdge={selectEdge}
          />
          <div className="legend" aria-label="Graph legend">
            {activeLens === 'security' ? (
              <>
                <span><i className="legend-dot security-sensitive" />Sensitive data</span>
                <span><i className="legend-dot security-tls" />TLS requested</span>
                <span><i className="legend-dot security-unknown" />Unknown protection</span>
                <span><i className="legend-dot security-risk" />Security finding</span>
              </>
            ) : viewMode === 'drift' ? (
              <>
                <span><i className="legend-dot drift-added" />Added</span>
                <span><i className="legend-dot drift-removed" />Removed</span>
                <span><i className="legend-dot drift-modified" />Modified</span>
                <span><i className="legend-dot drift-stable" />Context</span>
              </>
            ) : viewMode === 'changes' ? (
              <>
                <span><i className="legend-dot changed" />Changed</span>
                <span><i className="legend-dot affected" />Affected</span>
                <span><i className="legend-dot error" />Error overrides change color</span>
              </>
            ) : (
              <>
                <span><i className="legend-kind product" />Product</span>
                <span><i className="legend-kind system" />System</span>
                <span><i className="legend-kind feature" />Feature</span>
                <span><i className="legend-kind service" />Service / API</span>
                <span><i className="legend-kind data" />Data</span>
                <span><i className="legend-kind integration" />Integration</span>
                <span><i className="legend-dot error" />Failure</span>
              </>
            )}
          </div>
        </div>

        <aside className="inspector">
          {selectedEdge ? (
            <>
              <div className="eyebrow">Connection</div>
              <h2>{selectedEdge.label ?? selectedEdge.relation}</h2>
              <div className={`health-badge ${selectedEdge.health}`}>{healthLabel[selectedEdge.health]}</div>
              <ChangeBadge change={selectedEdge.change} />
              <DriftBadge drift={selectedEdge.drift} />

              <div className="edge-route" aria-label="Connection direction">
                <button type="button" onClick={() => selectNode(selectedEdge.source)}>
                  <small>{selectedEdgeSource?.kind ?? 'source'}</small>
                  <strong>{selectedEdgeSource?.label ?? selectedEdge.source}</strong>
                </button>
                <span><ArrowRight size={16} /><em>{selectedEdge.relation}</em></span>
                <button type="button" onClick={() => selectNode(selectedEdge.target)}>
                  <small>{selectedEdgeTarget?.kind ?? 'target'}</small>
                  <strong>{selectedEdgeTarget?.label ?? selectedEdge.target}</strong>
                </button>
              </div>

              <HealthEvidence health={selectedEdge.health} metadata={selectedEdge.metadata} />
              <SecurityEvidence metadata={selectedEdge.metadata} />
              <DriftNote drift={selectedEdge.drift} />

              {selectedEdge.health === 'impacted' && (
                <p className="impact-note">
                  This connection is in the blast radius of a direct failure. ArchMesh does not have evidence that this connection itself failed.
                </p>
              )}
              {selectedEdge.change === 'affected' && (
                <p className="change-note">
                  This connection leads toward code that changed. It is structurally affected, not necessarily broken.
                </p>
              )}
            </>
          ) : selectedNode ? (
            <>
              <div className="eyebrow">{selectedNode.kind}</div>
              <h2>{selectedNode.label}</h2>
              <div className={`health-badge ${selectedNode.health}`}>{healthLabel[selectedNode.health]}</div>
              <ChangeBadge change={selectedNode.change} />
              <DriftBadge drift={selectedNode.drift} />
              {selectedNode.path && <code className="path">{selectedNode.path}</code>}
              {selectedNode.path && source === 'scan' && selectedNode.drift !== 'removed' && (
                <SourceOpenAction key={selectedNode.path} path={selectedNode.path} />
              )}

              <HealthEvidence health={selectedNode.health} metadata={selectedNode.metadata} />
              <SecurityEvidence metadata={selectedNode.metadata} />
              <DriftNote drift={selectedNode.drift} />

              {(routePath || httpMethods || serverActionCount || semanticSource || provider || resourceType || systemType || systemRoot) && (
                <dl className="entity-facts">
                  {systemType && <div><dt>System type</dt><dd>{String(systemType)}</dd></div>}
                  {systemRoot && <div><dt>Boundary</dt><dd>{String(systemRoot)}</dd></div>}
                  {routePath && <div><dt>Route</dt><dd>{String(routePath)}</dd></div>}
                  {httpMethods && <div><dt>Methods</dt><dd>{String(httpMethods)}</dd></div>}
                  {serverActionCount && <div><dt>Server actions</dt><dd>{String(serverActionCount)}</dd></div>}
                  {provider && <div><dt>Provider</dt><dd>{String(provider)}</dd></div>}
                  {resourceType && <div><dt>Resource</dt><dd>{String(resourceType)}</dd></div>}
                  {semanticSource && <div><dt>Grouping</dt><dd>{semanticSource === 'config' ? 'Project config' : 'Detected'}</dd></div>}
                </dl>
              )}

              {selectedNode.kind === 'system' && memberCount && (
                <div className="metadata-grid" aria-label="System contents">
                  <div><strong>{memberCount}</strong><span>Detected entities</span></div>
                </div>
              )}

              {selectedNode.kind === 'feature' && selectedNode.metadata?.memberCount && (
                <div className="metadata-grid" aria-label="Feature contents">
                  <div><strong>{selectedNode.metadata.memberCount}</strong><span>Files</span></div>
                  <div><strong>{selectedNode.metadata.routes ?? 0}</strong><span>Routes</span></div>
                  <div><strong>{selectedNode.metadata.apis ?? 0}</strong><span>APIs</span></div>
                  <div><strong>{selectedNode.metadata.services ?? 0}</strong><span>Services</span></div>
                  {changedMembers && <div className="metric-changed"><strong>{changedMembers}</strong><span>Changed</span></div>}
                  {affectedMembers && <div className="metric-affected"><strong>{affectedMembers}</strong><span>Affected</span></div>}
                </div>
              )}

              {selectedNode.kind === 'product' && (changedFeatures || affectedFeatures) && (
                <div className="metadata-grid" aria-label="Product change summary">
                  {changedFeatures && <div className="metric-changed"><strong>{changedFeatures}</strong><span>Changed features</span></div>}
                  {affectedFeatures && <div className="metric-affected"><strong>{affectedFeatures}</strong><span>Affected features</span></div>}
                </div>
              )}

              {selectedNode.health === 'impacted' && (
                <p className="impact-note">
                  This entity depends on a direct failure elsewhere in the graph. Impact is inferred; failure is not confirmed here.
                </p>
              )}
              {selectedNode.change === 'changed' && (
                <p className="change-note changed">
                  {selectedNode.kind === 'feature'
                    ? 'This feature contains source that changed directly in the selected Git comparison.'
                    : selectedNode.kind === 'system'
                      ? 'This system contains source that changed directly in the selected Git comparison.'
                      : selectedNode.kind === 'product'
                        ? 'This project contains one or more areas with directly changed source.'
                        : 'This source file was changed directly in the selected Git comparison.'}
                </p>
              )}
              {selectedNode.change === 'affected' && (
                <p className="change-note">
                  {selectedNode.kind === 'feature'
                    ? 'This feature depends on changed source elsewhere. ArchMesh is showing structural impact, not claiming behavior changed.'
                    : selectedNode.kind === 'system'
                      ? 'This system is structurally affected by changed source elsewhere. ArchMesh is showing dependency impact, not claiming runtime failure.'
                      : selectedNode.kind === 'product'
                        ? 'This project is structurally affected by changed code, but contains no directly changed area in the current projection.'
                        : 'This entity depends, directly or transitively, on changed code. ArchMesh is showing structural impact, not claiming behavior changed.'}
                </p>
              )}

              {source === 'scan' && selectedNode.drift !== 'removed' && (
                <>
                  <button
                    type="button"
                    className="trace-action"
                    onClick={() => beginTrace(selectedNode.id)}
                  >
                    {traceRootId ? 'Continue trace from here' : 'Trace from here'}
                  </button>
                  <p className="trace-action-note">
                    Isolate this node and its immediate incoming/outgoing architecture, then re-root the trace to keep following the path.
                  </p>
                </>
              )}

              {source === 'scan' && viewMode === 'architecture' && activeLens !== 'security' && selectedNode.kind === 'feature' && !focusedFeatureId && !traceRootId && (
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => {
                    clearTrace();
                    setFocusedFeatureId(selectedNode.id);
                    clearSelection();
                  }}
                >
                  Explore this feature
                </button>
              )}

              <ConnectionList
                title="Depends on"
                icon="outbound"
                edges={selectedConnections.outbound}
                selectedNodeId={selectedNode.id}
                data={visibleData}
                onSelect={selectNode}
              />
              <ConnectionList
                title="Depended on by"
                icon="inbound"
                edges={selectedConnections.inbound}
                selectedNodeId={selectedNode.id}
                data={visibleData}
                onSelect={selectNode}
              />
            </>
          ) : source === 'scan' ? (
            <LensPanel
              activeLens={activeLens}
              hiddenNodes={hiddenNodes}
              onSelect={activateLens}
            />
          ) : (
            <div className="empty-inspector">
              <Boxes size={34} />
              <h2>Explore the system</h2>
              <p>Select a node or connection to understand its role, health, and relationships.</p>
              <p className="muted">Run ArchMesh against a local project to unlock architecture lenses.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
