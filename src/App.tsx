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
  Network,
  Search,
  XCircle,
} from 'lucide-react';
import { GraphCanvas } from './GraphCanvas';
import { projectArchitecture } from './projections/architecture';
import { projectChanges } from './projections/changes';
import { projectTopology } from './projections/topology';
import { sampleGraph } from './sample-graph';
import type {
  ArchEdge,
  ArchGraphData,
  ArchNode,
  ChangeState,
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

type ViewMode = 'architecture' | 'topology' | 'changes' | 'code';

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
              <span className={`edge-state ${edge.health} change-${edge.change ?? 'unchanged'}`} />
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

export default function App() {
  const [data, setData] = useState<ArchGraphData>(sampleGraph);
  const [source, setSource] = useState<'scan' | 'demo'>('demo');
  const [viewMode, setViewMode] = useState<ViewMode>('architecture');
  const [focusedFeatureId, setFocusedFeatureId] = useState<string>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/archmesh.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('No scan available');
        return response.json() as Promise<ArchGraphData>;
      })
      .then((graph) => {
        if (Array.isArray(graph.nodes) && Array.isArray(graph.edges)) {
          setData(graph);
          setSource('scan');
        }
      })
      .catch(() => {
        setData(sampleGraph);
        setSource('demo');
      });
  }, []);

  const architectureProjection = useMemo(
    () => projectArchitecture(data, focusedFeatureId),
    [data, focusedFeatureId],
  );
  const topologyProjection = useMemo(() => projectTopology(data), [data]);
  const changesProjection = useMemo(() => projectChanges(data), [data]);

  const visibleData = useMemo(() => {
    if (source === 'demo') return data;
    if (viewMode === 'architecture') return architectureProjection.graph;
    if (viewMode === 'topology') return topologyProjection;
    if (viewMode === 'changes') return changesProjection;
    return data;
  }, [architectureProjection.graph, changesProjection, data, source, topologyProjection, viewMode]);

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

  const selectedNode = useMemo(
    () => visibleData.nodes.find((node) => node.id === selectedNodeId),
    [visibleData.nodes, selectedNodeId],
  );

  const selectedEdge = useMemo(
    () => visibleData.edges.find((edge) => edge.id === selectedEdgeId),
    [visibleData.edges, selectedEdgeId],
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
    };
    for (const node of visibleData.nodes) {
      result[node.health] += 1;
      if (node.change === 'changed') result.changed += 1;
      if (node.change === 'affected') result.affected += 1;
    }
    return result;
  }, [visibleData.nodes]);

  const chooseSearchResult = (node: ArchNode) => {
    selectNode(node.id);
    setQuery('');
  };

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    clearSelection();
    setErrorsOnly(false);
    if (mode !== 'architecture') setFocusedFeatureId(undefined);
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

  const searchPlaceholder = viewMode === 'architecture'
    ? 'Find a feature, integration, service…'
    : viewMode === 'topology'
      ? 'Find a feature, collection, integration…'
      : viewMode === 'changes'
        ? 'Find changed or affected code…'
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
          {viewMode === 'changes' && source === 'scan' ? (
            <>
              <span className="status status-changed"><GitBranch size={14} /> {counts.changed} changed</span>
              <span className="status status-affected"><CircleDot size={14} /> {counts.affected} affected</span>
            </>
          ) : (
            <>
              <span className="status status-error"><XCircle size={14} /> {counts.error} errors</span>
              <span className="status status-impact"><AlertTriangle size={14} /> {counts.impacted} impacted</span>
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
                className={viewMode === 'code' ? 'selected' : ''}
                onClick={() => changeView('code')}
              >
                <Code2 size={14} /> Code
              </button>
            </div>
          )}
          {viewMode !== 'changes' && (
            <button
              type="button"
              className={errorsOnly ? 'active' : ''}
              onClick={() => {
                setErrorsOnly((value) => !value);
                clearSelection();
              }}
            >
              Errors only
            </button>
          )}
        </div>
      </section>

      {source === 'scan' && viewMode === 'architecture' && focusedFeatureId && (
        <div className="focus-bar">
          <button
            type="button"
            onClick={() => {
              setFocusedFeatureId(undefined);
              clearSelection();
            }}
          >
            <ArrowLeft size={14} /> System overview
          </button>
          <span>Exploring <strong>{focusedFeature?.label ?? focusedFeatureId}</strong></span>
        </div>
      )}

      <section className="workspace">
        <div className="graph-panel">
          <GraphCanvas
            data={visibleData}
            errorsOnly={errorsOnly}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={selectNode}
            onSelectEdge={selectEdge}
          />
          <div className="legend" aria-label="Graph legend">
            {viewMode === 'changes' ? (
              <>
                <span><i className="legend-dot changed" />Changed</span>
                <span><i className="legend-dot affected" />Affected</span>
                <span><i className="legend-dot error" />Error overrides change color</span>
              </>
            ) : (
              (['healthy', 'warning', 'error', 'impacted'] as HealthState[]).map((health) => (
                <span key={health}><i className={`legend-dot ${health}`} />{healthLabel[health]}</span>
              ))
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
              {selectedNode.path && <code className="path">{selectedNode.path}</code>}

              <HealthEvidence health={selectedNode.health} metadata={selectedNode.metadata} />

              {(routePath || httpMethods || serverActionCount || semanticSource || provider || resourceType) && (
                <dl className="entity-facts">
                  {routePath && <div><dt>Route</dt><dd>{String(routePath)}</dd></div>}
                  {httpMethods && <div><dt>Methods</dt><dd>{String(httpMethods)}</dd></div>}
                  {serverActionCount && <div><dt>Server actions</dt><dd>{String(serverActionCount)}</dd></div>}
                  {provider && <div><dt>Provider</dt><dd>{String(provider)}</dd></div>}
                  {resourceType && <div><dt>Resource</dt><dd>{String(resourceType)}</dd></div>}
                  {semanticSource && <div><dt>Grouping</dt><dd>{semanticSource === 'config' ? 'Project config' : 'Detected'}</dd></div>}
                </dl>
              )}

              {selectedNode.kind === 'feature' && selectedNode.metadata?.memberCount && (
                <div className="metadata-grid" aria-label="Feature contents">
                  <div><strong>{selectedNode.metadata.memberCount}</strong><span>Files</span></div>
                  <div><strong>{selectedNode.metadata.routes ?? 0}</strong><span>Routes</span></div>
                  <div><strong>{selectedNode.metadata.apis ?? 0}</strong><span>APIs</span></div>
                  <div><strong>{selectedNode.metadata.services ?? 0}</strong><span>Services</span></div>
                </div>
              )}

              {selectedNode.health === 'impacted' && (
                <p className="impact-note">
                  This entity depends on a direct failure elsewhere in the graph. Impact is inferred; failure is not confirmed here.
                </p>
              )}
              {selectedNode.change === 'changed' && (
                <p className="change-note changed">
                  This source file was changed directly in the selected Git comparison.
                </p>
              )}
              {selectedNode.change === 'affected' && (
                <p className="change-note">
                  This entity depends, directly or transitively, on changed code. ArchMesh is showing structural impact, not claiming behavior changed.
                </p>
              )}

              {source === 'scan' && viewMode === 'architecture' && selectedNode.kind === 'feature' && !focusedFeatureId && (
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => {
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
          ) : (
            <div className="empty-inspector">
              <Boxes size={34} />
              <h2>
                {viewMode === 'architecture'
                  ? 'Explore the system'
                  : viewMode === 'topology'
                    ? 'Explore data and integrations'
                    : viewMode === 'changes'
                      ? 'Explore change impact'
                      : 'Inspect the code graph'}
              </h2>
              <p>
                {viewMode === 'architecture'
                  ? 'Select a feature, integration, or connection to understand the human architecture, then drill into a feature when you need code-level detail.'
                  : viewMode === 'topology'
                    ? 'See which product areas read or write data and which external systems they call. Select a connection to inspect its health and evidence.'
                    : viewMode === 'changes'
                      ? visibleData.nodes.length > 0
                        ? 'Blue nodes changed directly. Purple nodes depend on those changes. Health remains a separate signal, so a changed node can still be healthy or failing.'
                        : 'No changed source is present in this scan. Run ArchMesh with --changes or --changes-from <ref> to populate this view.'
                      : 'Select a node or connection to isolate exact scanned code relationships and inspect direct failure evidence.'}
              </p>
              <p className="muted">
                {viewMode === 'changes'
                  ? 'Changed and affected describe source-control impact, not runtime health.'
                  : 'Red connections are failures. Orange connections represent downstream impact.'}
              </p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
