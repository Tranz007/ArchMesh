import { describe, expect, it } from 'vitest';
import { parseCliOptions } from './cli-options';

describe('parseCliOptions', () => {
  it('parses target, health file, diagnostics, working-tree changes, and watch mode', () => {
    const result = parseCliOptions(
      ['../project', '--health', './signals.json', '--diagnostics', '--changes', '--watch'],
      '/workspace/archmesh',
    );

    expect(result).toEqual({
      target: '/workspace/project',
      healthPath: '/workspace/archmesh/signals.json',
      diagnostics: true,
      changes: true,
      changesFrom: undefined,
      watch: true,
    });
  });

  it('parses a Git base ref for change impact', () => {
    expect(parseCliOptions(['--changes-from', 'main'], '/workspace/project')).toEqual({
      target: '/workspace/project',
      healthPath: undefined,
      diagnostics: false,
      changes: false,
      changesFrom: 'main',
      watch: false,
    });
  });

  it('defaults to the current directory', () => {
    expect(parseCliOptions([], '/workspace/project')).toEqual({
      target: '/workspace/project',
      healthPath: undefined,
      diagnostics: false,
      changes: false,
      changesFrom: undefined,
      watch: false,
    });
  });

  it('does not allow two Git change scopes at once', () => {
    expect(() => parseCliOptions(['--changes', '--changes-from', 'main'], '/workspace/project'))
      .toThrow('Use either --changes or --changes-from, not both.');
  });
});
