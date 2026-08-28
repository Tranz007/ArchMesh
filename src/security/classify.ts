import type { GraphMetadata } from '../types.js';

export type SensitiveDataCategory = 'pii' | 'credential' | 'financial' | 'identifier';

export interface SensitiveFieldClassification {
  field: string;
  category: SensitiveDataCategory;
}

const explicitFieldCategories = new Map<string, SensitiveDataCategory>([
  ['email', 'pii'],
  ['emailaddress', 'pii'],
  ['phone', 'pii'],
  ['phonenumber', 'pii'],
  ['mobile', 'pii'],
  ['mobilephone', 'pii'],
  ['firstname', 'pii'],
  ['lastname', 'pii'],
  ['fullname', 'pii'],
  ['dateofbirth', 'pii'],
  ['dob', 'pii'],
  ['ssn', 'pii'],
  ['socialsecuritynumber', 'pii'],
  ['streetaddress', 'pii'],
  ['homeaddress', 'pii'],
  ['postalcode', 'pii'],
  ['zipcode', 'pii'],
  ['passportnumber', 'pii'],
  ['driverslicense', 'pii'],
  ['driverlicensenumber', 'pii'],
  ['resume', 'pii'],
  ['resumetext', 'pii'],
  ['salary', 'pii'],
  ['compensation', 'pii'],
  ['userid', 'identifier'],
  ['accountid', 'identifier'],
  ['candidateid', 'identifier'],
  ['customerid', 'identifier'],
  ['password', 'credential'],
  ['passcode', 'credential'],
  ['pin', 'credential'],
  ['token', 'credential'],
  ['accesstoken', 'credential'],
  ['refreshtoken', 'credential'],
  ['authorization', 'credential'],
  ['apikey', 'credential'],
  ['secret', 'credential'],
  ['clientsecret', 'credential'],
  ['cardnumber', 'financial'],
  ['creditcardnumber', 'financial'],
  ['cvv', 'financial'],
  ['cvc', 'financial'],
  ['bankaccount', 'financial'],
  ['bankaccountnumber', 'financial'],
  ['routingnumber', 'financial'],
]);

function normalizedField(field: string) {
  return field.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function classifySensitiveFields(fields: string[]) {
  const seen = new Set<string>();
  const result: SensitiveFieldClassification[] = [];

  for (const field of fields) {
    const normalized = normalizedField(field);
    const category = explicitFieldCategories.get(normalized);
    if (!category || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push({ field, category });
  }

  return result;
}

export function securityMetadataForFields(fields: string[]): GraphMetadata {
  const classifications = classifySensitiveFields(fields);
  if (classifications.length === 0) return {};

  const categories = [...new Set(classifications.map((item) => item.category))];
  return {
    securitySensitiveData: true,
    securitySensitiveFields: classifications.map((item) => item.field).join(', '),
    securityDataCategories: categories.join(', '),
    securityEvidence: 'Sensitive field names detected in a statically inspectable payload.',
    securityConfidence: 'detected',
  };
}
