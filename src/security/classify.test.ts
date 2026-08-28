import { describe, expect, it } from 'vitest';
import { classifySensitiveFields, securityMetadataForFields } from './classify';

describe('security sensitive-data classification', () => {
  it('classifies explicit PII, credential, financial, and identifier fields', () => {
    expect(classifySensitiveFields(['email', 'accessToken', 'cardNumber', 'candidateId'])).toEqual([
      { field: 'email', category: 'pii' },
      { field: 'accessToken', category: 'credential' },
      { field: 'cardNumber', category: 'financial' },
      { field: 'candidateId', category: 'identifier' },
    ]);
  });

  it('does not treat generic application fields as sensitive', () => {
    expect(classifySensitiveFields(['status', 'title', 'description', 'theme', 'count'])).toEqual([]);
  });

  it('emits scalar graph metadata with evidence instead of raw values', () => {
    const metadata = securityMetadataForFields(['email', 'phoneNumber']);
    expect(metadata.securitySensitiveData).toBe(true);
    expect(metadata.securitySensitiveFields).toBe('email, phoneNumber');
    expect(metadata.securityDataCategories).toBe('pii');
    expect(JSON.stringify(metadata)).not.toContain('@example.com');
  });
});
