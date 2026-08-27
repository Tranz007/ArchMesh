import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CircleDot,
  Code2,
  Network,
  Search,
  XCircle,
} from 'lucide-react';
import { GraphCanvas } from './GraphCanvas';
import { projectArchitecture } from './projections/architecture';
import { sampleGraph } from './sample-graph';
import type { ArchGraphData, ArchNode, HealthState } from './types';

const healthLabel: Record<HealthState, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  error: 'Error',
  impacted: 'Impacted',
  unknown: 'Unknown',
};

type ViewMode = 'architecture' | 'code';

export default function App() {
  const [data, setData] = useState<ArchGraphData>(sampleGraph);
  const [source, setSource] = useState<'scan' | 'demo'>('demo');
  const [viewMode, setViewMode] = useState<ViewMode>('architecture');
  const [focusedFeatureId, setFocusedFeatureId] = useState<string>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
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

  const visibleData = useMemo(() => {
    if (source === 'demo') return data;
    return viewMode === 'architecture' ? architectureProjection.graph : data;
  }, [architectureProjection.graph, data, source, viewMode]);

  const selectNode = useCallback((nodeId?: string) => setSelectedNodeId(nodeId), []);

  const selectedNode = useMemo(
    () => visibleData.nodes.find((node) => node.id === selectedNodeId),
    [visibleData.nodes, selectedNodeId],
  );

  const selectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return visibleData.edges.filter(
      (edge) => edge.source === selectedNodeId || edge.target === selectedNodeId,
    );
  }, [visibleData.edges, selectedNodeId]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return visibleData.nodes
      .filter((node) => `${node.label} ${node.path ?? ''} ${node.kind}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [query, visibleData.nodes]);

  const counts = useMemo(() => {
    const result = { healthy: 0, warning: 0, error: 0, impacted: 0, unknown: 0 };
    for (const node of visibleData.nodes) result[node.health] += 1;
    return result;
  }, [visibleData.nodes]);

  const chooseSearchResult = (node: ArchNode) => {
    setSelectedNodeId(node.id);
    setQuery('');
  };

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedNodeId(undefined);
    setErrorsOnly(false);
    if (mode === 'code') setFocusedFeatureId(undefined);
  };

  const focusedFeature = architectureProjection.graph.nodes.find(
    (node) => node.id === focusedFeatureId,
  );

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

        <div className="status-strip" aria-label="Architecture health summary">
          <span className="status status-error"><XCircle size={14} /> {counts.error} errors</span>
          <span className="status status-impact"><AlertTriangle size={14} /> {counts.impacted} impacted</span>
          <span className="status"><CircleDot size={14} /> {visibleData.nodes.length} nodes</span>
        </div>
      </header>

      <section className="toolbar">
        <div className="search-wrap">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={viewMode === 'architecture' ? 'Find a feature, integration, service…' : 'Find a route, component, file…'}
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
                className={viewMode === 'code' ? 'selected' : ''}
                onClick={() => changeView('code')}
              >
                <Code2 size={14} /> Code
              </button>
            </div>
          )}
          <button
            type="button"
            className={errorsOnly ? 'active' : ''}
            onClick={() => {
              setErrorsOnly((value) => !value);
              setSelectedNodeId(undefined);
            }}
          >
            Errors only
          </button>
        </div>
      </section>

      {source === 'scan' && viewMode === 'architecture' && focusedFeatureId && (
        <div className="focus-bar">
          <button
            type="button"
            onClick={() => {
              setFocusedFeatureId(undefined);
              setSelectedNodeId(undefined);
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
            onSelectNode={selectNode}
          />
          <div className="legend" aria-label="Health legend">
            {(['healthy', 'warning', 'error', 'impacted'] as HealthState[]).map((health) => (
              <span key={health}><i className={`legend-dot ${health}`} />{healthLabel[health]}</span>
            ))}
          </div>
        </div>

        <aside className="inspector">
          {selectedNode ? (
            <>
              <div className="eyebrow">{selectedNode.kind}</div>
              <h2>{selectedNode.label}</h2>
              <div className={`health-badge ${selectedNode.health}`}>{healthLabel[selectedNode.health]}</div>
              {selectedNode.path && <code className="path">{selectedNode.path}</code>}

              {selectedNode.kind === 'feature' && selectedNode.metadata?.memberCount && (
                <div className="metadata-grid" aria-label="Feature contents">
                  <div><strong>{selectedNode.metadata.memberCount}</strong><span>Files</span></div>
                  <div><strong>{selectedNode.metadata.routes ?? 0}</strong><span>Routes</span></div>
                  <div><strong>{selectedNode.metadata.apis ?? 0}</strong><span>APIs</span></div>
                  <div><strong>{selectedNode.metadata.services ?? 0}</strong><span>Services</span></div>
                </div>
              )}

              {source === 'scan' && viewMode === 'architecture' && selectedNode.kind === 'feature' && !focusedFeatureId && (
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => {
                    setFocusedFeatureId(selectedNode.id);
                    setSelectedNodeId(undefined);
                  }}
                >
                  Explore this feature
                </button>
              )}

              <h3>Connections</h3>
              <div className="connection-list">
                {selectedEdges.length === 0 && <p className="muted">No direct connections.</p>}
                {selectedEdges.map((edge) => {
                  const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                  const other = visibleData.nodes.find((node) => node.id === otherId);
                  return (
                    <button key={edge.id} type="button" onClick={() => setSelectedNodeId(otherId)}>
                      <span className={`edge-state ${edge.health}`} />
                      <span className="connection-copy">
                        <strong>{other?.label ?? otherId}</strong>
                        <small>{edge.relation}{edge.label ? ` · ${edge.label}` : ''}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-inspector">
              <Boxes size={34} />
              <h2>{viewMode === 'architecture' ? 'Explore the system' : 'Inspect the code graph'}</h2>
              <p>
                {viewMode === 'architecture'
                  ? 'Select a feature or integration to understand the human architecture, then drill into a feature when you need code-level detail.'
                  : 'Select a node to isolate its immediate dependencies and inspect the exact scanned code relationships.'}
              </p>
              <p className="muted">Red connections are failures. Orange connections represent downstream impact.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
