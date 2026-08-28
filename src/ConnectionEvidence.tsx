import { Link2 } from 'lucide-react';
import type { ArchEdge, ArchNode, GraphMetadata } from './types';

function text(metadata: GraphMetadata | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function scalar(metadata: GraphMetadata | undefined, key: string) {
  const value = metadata?.[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

const metadataFacts: Array<[string, string]> = [
  ['matchedRoutePath', 'Matched route'],
  ['matchedFramework', 'Framework'],
  ['endpointMatch', 'Match'],
  ['provider', 'Provider'],
  ['operation', 'Operation'],
  ['method', 'Method'],
  ['httpMethod', 'HTTP method'],
  ['collection', 'Collection'],
  ['resource', 'Resource'],
  ['host', 'Host'],
  ['url', 'URL'],
  ['semanticSource', 'Semantic source'],
  ['adapter', 'Adapter'],
  ['scanner', 'Scanner'],
];

export function ConnectionEvidence({
  edge,
  source,
  target,
}: {
  edge: ArchEdge;
  source?: ArchNode;
  target?: ArchNode;
}) {
  const metadata = edge.metadata;
  const sourceLanguage = text(metadata, 'sourceLanguage');
  const targetLanguage = text(metadata, 'targetLanguage');
  const facts = metadataFacts
    .map(([key, label]) => ({ label, value: scalar(metadata, key) }))
    .filter((fact): fact is { label: string; value: string } => Boolean(fact.value));

  return (
    <section className="connection-section connection-evidence" aria-label="Why this connection exists">
      <h3><Link2 size={13} />Why are these connected?</h3>
      <p className="muted">
        This explanation is built from the relationship and source evidence already present in the scan; ArchMesh is not inventing an intermediate step.
      </p>
      <dl className="entity-facts">
        <div><dt>Relationship</dt><dd>{edge.relation}</dd></div>
        {source?.path && <div><dt>Source</dt><dd>{source.path}</dd></div>}
        {target?.path && <div><dt>Target</dt><dd>{target.path}</dd></div>}
        {facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
        {sourceLanguage && targetLanguage && (
          <div><dt>Languages</dt><dd>{sourceLanguage} → {targetLanguage}</dd></div>
        )}
        {metadata?.crossLanguage === true && <div><dt>Language boundary</dt><dd>Cross-language</dd></div>}
        {metadata?.crossSystem === true && <div><dt>System boundary</dt><dd>Cross-system</dd></div>}
      </dl>
      {facts.length === 0 && !source?.path && !target?.path && (
        <p className="muted">No additional provenance metadata is attached to this relationship yet.</p>
      )}
    </section>
  );
}
