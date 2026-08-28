import { CircleHelp, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { GraphMetadata } from './types';

function humanize(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined;
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function transportLabel(value: unknown) {
  if (value === 'cleartext') return 'Cleartext';
  if (value === 'tls-requested') return 'TLS requested';
  if (value === 'unknown') return 'Unknown';
  return humanize(value);
}

interface SecurityEvidenceProps {
  metadata?: GraphMetadata;
}

export function SecurityEvidence({ metadata }: SecurityEvidenceProps) {
  if (!metadata) return null;

  const sensitive = metadata.securitySensitiveData === true;
  const finding = humanize(metadata.securityFinding);
  const severity = humanize(metadata.securitySeverity);
  const fields = typeof metadata.securitySensitiveFields === 'string' ? metadata.securitySensitiveFields : undefined;
  const categories = typeof metadata.securityDataCategories === 'string' ? metadata.securityDataCategories : undefined;
  const transport = transportLabel(metadata.securityTransport);
  const boundary = humanize(metadata.securityBoundary);
  const storage = humanize(metadata.securityStorage);
  const transportEvidence = typeof metadata.securityTransportEvidence === 'string'
    ? metadata.securityTransportEvidence
    : undefined;
  const storageEvidence = typeof metadata.securityStorageEvidence === 'string'
    ? metadata.securityStorageEvidence
    : undefined;
  const sensitiveEvidence = typeof metadata.securityEvidence === 'string'
    ? metadata.securityEvidence
    : undefined;

  const hasEvidence = sensitive
    || Boolean(finding)
    || Boolean(transport)
    || Boolean(boundary)
    || Boolean(storage)
    || metadata.securityExternalBoundary === true;

  if (!hasEvidence) return null;

  const isRisk = metadata.securityTransport === 'cleartext'
    || metadata.securitySeverity === 'high'
    || metadata.securitySeverity === 'warning';
  const isKnownTls = metadata.securityTransport === 'tls-requested';
  const Icon = isRisk ? ShieldAlert : isKnownTls ? ShieldCheck : CircleHelp;
  const tone = isRisk ? 'risk' : isKnownTls ? 'protected' : 'unknown';

  return (
    <section className={`security-evidence ${tone}`} aria-label="Security evidence">
      <div className="security-evidence-title">
        <Icon size={14} />
        Security evidence
      </div>

      {finding && (
        <div className="security-finding">
          <strong>{finding}</strong>
          {severity && <span>{severity}</span>}
        </div>
      )}

      <dl>
        {fields && <div><dt>Sensitive fields</dt><dd>{fields}</dd></div>}
        {categories && <div><dt>Data class</dt><dd>{categories}</dd></div>}
        {transport && <div><dt>Transport</dt><dd>{transport}</dd></div>}
        {boundary && <div><dt>Boundary</dt><dd>{boundary}</dd></div>}
        {storage && <div><dt>At rest</dt><dd>{storage}</dd></div>}
      </dl>

      {(sensitiveEvidence || transportEvidence || storageEvidence) && (
        <div className="security-evidence-notes">
          {sensitiveEvidence && <p>{sensitiveEvidence}</p>}
          {transportEvidence && <p>{transportEvidence}</p>}
          {storageEvidence && <p>{storageEvidence}</p>}
        </div>
      )}

      {(metadata.securityTransport === 'unknown' || metadata.securityStorage === 'unknown') && (
        <p className="security-unknown-note">
          Unknown means ArchMesh cannot prove this control from repository evidence. It does not mean the control is absent.
        </p>
      )}
    </section>
  );
}
