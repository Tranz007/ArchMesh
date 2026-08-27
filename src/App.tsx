import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, CircleDot, Search, XCircle } from 'lucide-react';
import { GraphCanvas } from './GraphCanvas';
import { sampleGraph } from './sample-graph';
import type { ArchGraphData, ArchNode, HealthState } from './types';

const healthLabel: Record<HealthState, string> = {
  healthy: 'Healthy',
  warning: 'Warning',
  error: 'Error',
  impacted: 'Impacted',
  unknown: 'Unknown',
};

export default function App() {
  const [data, setData] = useState<ArchGraphData>(sampleGraph);
  const [source, setSource] = useState<'scan' | 'demo'>('demo');
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

  const selectNode = useCallback((nodeId?: string) => setSelectedNodeId(nodeId), []);

  const selectedNode = useMemo(
    () => data.nodes.find((node) => node.id === selectedNodeId),
    [data.nodes, selectedNodeId],
  );

  const selectedEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return data.edges.filter(
      (edge) => edge.source === selectedNodeId || edge.target === selectedNodeId,
    );
  }, [data.edges, selectedNodeId]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return data.nodes
      .filter((node) => `${node.label} ${node.path ?? ''} ${node.kind}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [data.nodes, query]);

  const counts = useMemo(() => {
    const result = { healthy: 0, warning: 0, error: 0, impacted: 0, unknown: 0 };
    for (const node of data.nodes) result[node.health] += 1;
    return result;
  }, [data.nodes]);

  const chooseSearchResult = (node: ArchNode) => {
    setSelectedNodeId(node.id);
    setQuery('');
  };

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
          <span className="status"><CircleDot size={14} /> {data.nodes.length} nodes</span>
        </div>
      </header>

      <section className="toolbar">
        <div className="search-wrap">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a feature, route, service, file…"
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
            {source === 'scan' ? 'Live scan' : 'Demo data'}
          </span>
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

      <section className="workspace">
        <div className="graph-panel">
          <GraphCanvas
            data={data}
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

              <h3>Connections</h3>
              <div className="connection-list">
                {selectedEdges.length === 0 && <p className="muted">No direct connections.</p>}
                {selectedEdges.map((edge) => {
                  const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                  const other = data.nodes.find((node) => node.id === otherId);
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
              <h2>Select anything</h2>
              <p>Click a node to isolate its immediate architecture and inspect every connected path.</p>
              <p className="muted">Red connections are failures. Orange connections represent downstream impact.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
