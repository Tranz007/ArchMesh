import { describe, expect, it } from 'vitest';
import { featureKeyForPath } from './architecture';

describe('Next.js metadata feature classification', () => {
  it('keeps root metadata routes in the app shell', () => {
    expect(featureKeyForPath('app/robots.ts')).toBe('app-shell');
    expect(featureKeyForPath('app/sitemap.ts')).toBe('app-shell');
    expect(featureKeyForPath('app/manifest.ts')).toBe('app-shell');
    expect(featureKeyForPath('app/opengraph-image.tsx')).toBe('app-shell');
  });

  it('still detects real app route segments', () => {
    expect(featureKeyForPath('app/account/page.tsx')).toBe('account');
  });
});
