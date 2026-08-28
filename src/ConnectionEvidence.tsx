import { Link2 } from 'lucide-react';
import type { GraphMetadata } from './types';

function text(metadata: GraphMetadata | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function callerLabel(value?: string) {
  if (value === 'angular-httpclient') return 'Angular HttpClient';
  if (value === 'fetch') return 'fetch()';
  return value;
}

export function ConnectionEvidence({ metadata }: { metadata?: GraphMetadata }) {
  if (metadata?.endpointMatch !== 'static-method-path') return null;

  const route = text(metadata, 'matchedRoutePath');
  const framework = text(metadata, 'matchedFramework');
  const sourceLanguage = text(metadata, 'sourceLanguage');
  const targetLanguage = text(metadata, 'targetLanguage');
  const caller = callerLabel(text(metadata, 'callerEvidence'));
  const crossLanguage = metadata?.crossLanguage === true;
  const crossSystem = metadata?.crossSystem === true;

  return (
    <section className="connection-section" aria-label="Connection evidence">
      <h3><Link2 size={13} />Static endpoint match</h3>
      <p className="muted">
        ArchMesh connected this request to one semantic API handler using a statically visible HTTP method and path.
      </p>
      <dl className="entity-facts">
        {caller && <div><dt>Caller evidence</dt><dd>{caller}</dd></div>}
        {route && <div><dt>Matched route</dt><dd>{route}</dd></div>}
        {framework && <div><dt>Framework</dt><dd>{framework}</dd></div>}
        {sourceLanguage && targetLanguage && (
          <div><dt>Languages</dt><dd>{sourceLanguage} → {targetLanguage}</dd></div>
        )}
        {crossLanguage && <div><dt>Language boundary</dt><dd>Cross-language</dd></div>}
        {crossSystem && <div><dt>System boundary</dt><dd>Cross-system</dd></div>}
      </dl>
      <p className="muted">
        This is source-level evidence, not proof that the request succeeds at runtime or that deployment routing preserves the same path.
      </p>
    </section>
  );
}
