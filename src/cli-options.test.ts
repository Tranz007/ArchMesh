import { describe, expect, it } from 'vitest';
import { parseCliOptions } from './cli-options';

describe('parseCliOptions', () => {
  it('parses target, health file, diagnostics, working-tree changes, watch mode, and editor', () => {
    const result = parseCliOptions(
      ['../project', '--health', './signals.json', '--diagnostics', '--changes', '--watch', '--editor', 'cursor'],
      '/workspace/archmesh',
    );

    expect(result).toEqual({
      target: '/workspace/project',
      healthPath: '/workspace/archmesh/signals.json',
      diagnostics: true,
      changes: true,
      changesFrom: undefined,
      watch: true,
      editor: 'cursor',
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
      editor: 'auto',
    });
  });

  it('defaults to the current directory and auto editor selection', () => {
    expect(parseCliOptions([], '/workspace/project')).toEqual({
      target: '/workspace/project',
      healthPath: undefined,
      diagnostics: false,
      changes: false,
      changesFrom: undefined,
      watch: false,
      editor: 'auto',
    });
  });

  it('rejects unsupported editor names', () => {
    expect(() => parseCliOptions(['--editor', 'vim'], '/workspace/project'))
      .toThrow('Unsupported editor: vim.');
  });

  it('does not allow two Git change scopes at once', () => {
    expect(() => parseCliOptions(['--changes', '--changes-from', 'main'], '/workspace/project'))
      .toThrow('Use either --changes or --changes-from, not both.');
  });
});
