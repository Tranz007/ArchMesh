import { describe, expect, it } from 'vitest';
import {
  flowDirectionLabel,
  flowParticleCount,
  flowParticleSpeed,
  isDirectionalFlowRelation,
  shouldAnimateFlowEdge,
} from './flow';

const callEdge = {
  id: 'edge:calls',
  source: 'node:a',
  target: 'node:b',
  relation: 'calls' as const,
};

const dependencyEdge = {
  id: 'edge:depends',
  source: 'node:a',
  target: 'node:c',
  relation: 'depends-on' as const,
};

describe('directional flow', () => {
  it('only treats runtime/data relationships as animated flow', () => {
    expect(isDirectionalFlowRelation('calls')).toBe(true);
    expect(isDirectionalFlowRelation('reads')).toBe(true);
    expect(isDirectionalFlowRelation('writes')).toBe(true);
    expect(isDirectionalFlowRelation('integrates-with')).toBe(true);
    expect(isDirectionalFlowRelation('depends-on')).toBe(false);
    expect(isDirectionalFlowRelation('contains')).toBe(false);
  });

  it('keeps all-flow visually lightweight', () => {
    const selection = { enabled: true, scope: 'all' as const };
    expect(shouldAnimateFlowEdge(callEdge, selection)).toBe(true);
    expect(shouldAnimateFlowEdge(dependencyEdge, selection)).toBe(false);
    expect(flowParticleCount(callEdge, selection)).toBe(1);
  });

  it('limits focus flow to the selected node neighborhood', () => {
    const selection = {
      enabled: true,
      scope: 'focus' as const,
      selectedNodeId: 'node:a',
    };
    expect(shouldAnimateFlowEdge(callEdge, selection)).toBe(true);
    expect(shouldAnimateFlowEdge({ ...callEdge, id: 'edge:other', source: 'node:x' }, selection)).toBe(false);
    expect(flowParticleCount(callEdge, selection)).toBe(2);
  });

  it('uses only a few particles for a selected edge', () => {
    const selection = {
      enabled: true,
      scope: 'focus' as const,
      selectedEdgeId: callEdge.id,
    };
    expect(flowParticleCount(callEdge, selection)).toBe(3);
  });

  it('moves read data from the resource back to the reader', () => {
    expect(flowParticleSpeed('reads')).toBeLessThan(0);
    expect(flowDirectionLabel('reads')).toBe('target → source');
    expect(flowParticleSpeed('writes')).toBeGreaterThan(0);
    expect(flowDirectionLabel('writes')).toBe('source → target');
  });

  it('does not animate when flow is disabled', () => {
    expect(shouldAnimateFlowEdge(callEdge, { enabled: false, scope: 'all' })).toBe(false);
  });
});
