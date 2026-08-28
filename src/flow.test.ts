import { describe, expect, it, vi } from 'vitest';
import {
  flowDirectionLabel,
  flowEmissionDelay,
  flowParticleSpeed,
  flowRenderEndpoints,
  isDirectionalFlowRelation,
  shouldAnimateFlowEdge,
  startFlowEmitter,
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

  it('limits focus flow to the selected node neighborhood', () => {
    const selection = {
      enabled: true,
      scope: 'focus' as const,
      selectedNodeId: 'node:a',
    };
    expect(shouldAnimateFlowEdge(callEdge, selection)).toBe(true);
    expect(shouldAnimateFlowEdge({ ...callEdge, id: 'edge:other', source: 'node:x' }, selection)).toBe(false);
  });

  it('limits a selected-edge focus to that exact connection', () => {
    const selection = {
      enabled: true,
      scope: 'focus' as const,
      selectedEdgeId: callEdge.id,
    };
    expect(shouldAnimateFlowEdge(callEdge, selection)).toBe(true);
    expect(shouldAnimateFlowEdge({ ...callEdge, id: 'edge:other' }, selection)).toBe(false);
  });

  it('renders read data resource-to-reader without relying on negative speed', () => {
    const read = { ...callEdge, relation: 'reads' as const };
    expect(flowRenderEndpoints(read)).toEqual({ source: 'node:b', target: 'node:a' });
    expect(flowParticleSpeed('reads')).toBeGreaterThan(0);
    expect(flowDirectionLabel('reads')).toBe('target → source');
    expect(flowRenderEndpoints({ ...callEdge, relation: 'writes' as const })).toEqual({
      source: 'node:a',
      target: 'node:b',
    });
  });

  it('uses substantially wider randomized spacing in all-flow than focused flow', () => {
    const allFast = flowEmissionDelay(callEdge, { enabled: true, scope: 'all' }, () => 0, false);
    const allSlow = flowEmissionDelay(callEdge, { enabled: true, scope: 'all' }, () => 1, false);
    const focusFast = flowEmissionDelay(callEdge, {
      enabled: true,
      scope: 'focus',
      selectedNodeId: 'node:a',
    }, () => 0, false);

    expect(allFast).toBeGreaterThan(focusFast);
    expect(allSlow).toBeGreaterThan(allFast);
  });

  it('emits independent one-shot pulses and stops scheduling on cleanup', () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const stop = startFlowEmitter({
      edges: [callEdge],
      selection: { enabled: true, scope: 'focus', selectedNodeId: 'node:a' },
      emit,
      random: () => 0,
    });

    vi.advanceTimersByTime(1000);
    expect(emit).toHaveBeenCalled();
    const emittedBeforeStop = emit.mock.calls.length;
    stop();
    vi.advanceTimersByTime(5000);
    expect(emit).toHaveBeenCalledTimes(emittedBeforeStop);
    vi.useRealTimers();
  });

  it('does not animate when flow is disabled', () => {
    expect(shouldAnimateFlowEdge(callEdge, { enabled: false, scope: 'all' })).toBe(false);
  });
});
