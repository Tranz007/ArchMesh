import type { HttpCall } from '../scanner/semantics.js';
import { securityMetadataForFields } from './classify.js';

export function safeHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function httpSecurityMetadata(call: HttpCall) {
  const sensitive = securityMetadataForFields(call.bodyFields);
  const parsed = safeHttpUrl(call.url);

  if (!parsed) {
    return {
      ...sensitive,
      securityBoundary: 'same-origin',
      securityTransport: 'unknown',
      securityTransportEvidence: 'Relative URL: transport inherits the deployment origin and cannot be proven from source alone.',
    };
  }

  const cleartext = parsed.protocol === 'http:';
  const sensitiveData = sensitive.securitySensitiveData === true;
  return {
    ...sensitive,
    securityBoundary: 'external',
    securityExternalBoundary: true,
    securityTransport: cleartext ? 'cleartext' : 'tls-requested',
    securityTransportEvidence: cleartext
      ? 'Static URL uses http://.'
      : 'Static URL uses https://; TLS is requested, but certificate/runtime configuration is not verified by this scan.',
    ...(cleartext
      ? {
          securityFinding: sensitiveData ? 'sensitive-data-over-cleartext' : 'cleartext-transport',
          securitySeverity: sensitiveData ? 'high' : 'warning',
        }
      : sensitiveData
        ? { securityFinding: 'sensitive-data-crosses-external-boundary', securitySeverity: 'info' }
        : {}),
  };
}
