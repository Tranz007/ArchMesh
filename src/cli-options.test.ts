import { describe, expect, it } from 'vitest';
import { parseCliOptions } from './cli-options';

describe('parseCliOptions', () => {
  it('parses target, health file, and diagnostics', () => {
    const result = parseCliOptions(
      ['../project', '--health', './signals.json', '--diagnostics'],
      '/workspace/archmesh',
    );

    expect(result).toEqual({
      target: '/workspace/project',
      healthPath: '/workspace/archmesh/signals.json',
      diagnostics: true,
    });
  });

  it('defaults to the current directory', () => {
    expect(parseCliOptions([], '/workspace/project')).toEqual({
      target: '/workspace/project',
      healthPath: undefined,
      diagnostics: false,
    });
  });
});
