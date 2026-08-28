import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanProject } from './scan.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function fixture(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-security-'));
  tempDirs.push(root);
  await Promise.all(Object.entries(files).map(async ([relative, content]) => {
    const destination = path.join(root, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content, 'utf8');
  }));
  return root;
}

describe('scanProject security evidence', () => {
  it('flags statically visible sensitive payload fields sent over cleartext HTTP', async () => {
    const root = await fixture({
      'src/services/profile.ts': `
        export async function send(email, phoneNumber) {
          return fetch('http://legacy.example.com/profile', {
            method: 'POST',
            body: JSON.stringify({ email, phoneNumber })
          })
        }
      `,
    });

    const graph = await scanProject(root);
    const edge = graph.edges.find((item) => item.label?.includes('legacy.example.com'));

    expect(edge?.metadata).toMatchObject({
      securitySensitiveData: true,
      securitySensitiveFields: 'email, phoneNumber',
      securityDataCategories: 'pii',
      securityExternalBoundary: true,
      securityTransport: 'cleartext',
      securityFinding: 'sensitive-data-over-cleartext',
      securitySeverity: 'high',
    });
  });

  it('records HTTPS as TLS requested without claiming runtime verification', async () => {
    const root = await fixture({
      'src/services/profile.ts': `
        export async function send(email) {
          return fetch('https://partner.example.com/profile', {
            method: 'POST',
            body: JSON.stringify({ email })
          })
        }
      `,
    });

    const graph = await scanProject(root);
    const edge = graph.edges.find((item) => item.label?.includes('partner.example.com'));

    expect(edge?.metadata).toMatchObject({
      securitySensitiveData: true,
      securityExternalBoundary: true,
      securityTransport: 'tls-requested',
      securityFinding: 'sensitive-data-crosses-external-boundary',
    });
    expect(String(edge?.metadata?.securityTransportEvidence)).toContain('not verified');
  });

  it('classifies statically visible sensitive Firestore write fields while leaving transport and storage unproven', async () => {
    const root = await fixture({
      'src/services/profile.ts': `
        import { doc, setDoc } from 'firebase/firestore';
        export async function save(db, id, email, resume) {
          return setDoc(doc(db, 'profiles', id), { email, resume })
        }
      `,
    });

    const graph = await scanProject(root);
    const edge = graph.edges.find((item) => item.relation === 'writes' && item.target === 'data:firestore:profiles');
    const collection = graph.nodes.find((item) => item.id === 'data:firestore:profiles');

    expect(edge?.metadata).toMatchObject({
      securitySensitiveData: true,
      securitySensitiveFields: 'email, resume',
      securityTransport: 'unknown',
      securityBoundary: 'managed-service',
    });
    expect(collection?.metadata).toMatchObject({
      securityStorage: 'unknown',
      securityBoundary: 'managed-service',
    });
  });

  it('does not copy URL credentials, query values, or fragments into graph artifacts', async () => {
    const root = await fixture({
      'src/services/partner.ts': `
        export async function send() {
          return fetch('https://user:supersecret@partner.example.com/profile?token=abc123&email=person@example.com#private')
        }
      `,
    });

    const graph = await scanProject(root);
    const serialized = JSON.stringify(graph);
    const edge = graph.edges.find((item) => item.label?.includes('partner.example.com'));

    expect(edge?.label).toBe('GET https://partner.example.com/profile');
    expect(serialized).not.toContain('supersecret');
    expect(serialized).not.toContain('abc123');
    expect(serialized).not.toContain('person@example.com');
    expect(serialized).not.toContain('#private');
  });
});
