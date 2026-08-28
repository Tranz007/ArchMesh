import { describe, expect, it } from 'vitest';
import {
  guidedArgsFromAnswers,
  normalizeEditor,
  parseYesNo,
  shouldRunGuidedOnboarding,
} from './onboarding.js';

describe('guided onboarding', () => {
  it('runs automatically only for an empty interactive invocation', () => {
    expect(shouldRunGuidedOnboarding([], true, true)).toBe(true);
    expect(shouldRunGuidedOnboarding([], false, true)).toBe(false);
    expect(shouldRunGuidedOnboarding(['.'], true, true)).toBe(false);
  });

  it('can be requested explicitly in an interactive terminal', () => {
    expect(shouldRunGuidedOnboarding(['--guided'], true, true)).toBe(true);
    expect(shouldRunGuidedOnboarding(['--guided'], true, false)).toBe(false);
  });

  it('uses friendly defaults for yes/no answers', () => {
    expect(parseYesNo('', true)).toBe(true);
    expect(parseYesNo('', false)).toBe(false);
    expect(parseYesNo('no', true)).toBe(false);
    expect(parseYesNo('YES', false)).toBe(true);
  });

  it('falls back to automatic editor detection for unfamiliar input', () => {
    expect(normalizeEditor('cursor')).toBe('cursor');
    expect(normalizeEditor('VS Code')).toBe('auto');
    expect(normalizeEditor('')).toBe('auto');
  });

  it('turns answers into the same deterministic flags used by non-interactive callers', () => {
    expect(guidedArgsFromAnswers({
      target: '/workspace/product',
      watch: true,
      editor: 'cursor',
    })).toEqual(['/workspace/product', '--watch', '--editor', 'cursor']);

    expect(guidedArgsFromAnswers({
      target: '/workspace/product',
      watch: false,
      editor: 'auto',
    })).toEqual(['/workspace/product']);
  });
});
