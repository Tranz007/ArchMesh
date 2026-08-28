import { describe, expect, it, vi } from 'vitest';
import {
  canAnimateFlowDirection,
  flowDirectionLabel,
  flowEmissionDelay,
  flowEmissionDirections,
  flowParticleDuration,
  flowParticleSpeed,
  flowRenderEndpoints,
  hasReverseFlow,
  isDirectionalFlowRelation,
  mergeFlowDirection,
  shouldAnimateFlowEdge,
  startFlowEmitter,
  withMergedFlowDirection,
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
  it('recognizes flow-capable relations without pretending a generic integration has direction', () => {
    expect(isDirectionalFlowRelation('calls')).toBe(true);
    expect(isDirectionalFlowRelation('reads')).toBe(true);
    expect(isDirectionalFlowRelation('writes')).toBe(true);
    expect(isDirectionalFlowRelation('integrates-with')).toBe(true);
    expect(isDirectionalFlowRelation('depends-on')).toBe(false);
    expect(isDirectionalFlowRelation('contains')).toBe(false);

    const integration = { ...callEdge, relation: 'integrates-with' as const };
    expect(shouldAnimateFlowEdge(integration, { enabled: true, scope: 'all' })).toBe(false);
    expect(shouldAnimateFlowEdge(
      { ...integration, flowDirection: 'source-to-target' },
      { enabled: true, scope: 'all' },
    )).toBe(true);
    expect(shouldAnimateFlowEdge(
      { ...integration, flowDirection: 'target-to-source' },
      { enabled: true, scope: 'all' },
    )).toBe(true);
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

  it('animates reverse evidence without changing force-layout endpoints', () => {
    const read = { ...callEdge, relation: 'reads' as const };
    expect(flowRenderEndpoints(read)).toEqual({ source: 'node:a', target: 'node:b' });
    expect(flowParticleSpeed('reads')).toBeGreaterThan(0);
    expect(flowParticleDuration('reads')).toBeGreaterThan(0);
    expect(flowDirectionLabel('reads')).toBe('target → source');
    expect(canAnimateFlowDirection(read)).toBe(true);
    expect(hasReverseFlow(read)).toBe(true);
    expect(flowEmissionDirections(read)).toEqual(['target-to-source']);
    expect(shouldAnimateFlowEdge(read, { enabled: true, scope: 'all' })).toBe(true);
    expect(flowRenderEndpoints({ ...callEdge, relation: 'writes' as const })).toEqual({
      source: 'node:a',
      target: 'node:b',
    });
  });

  it('expands bidirectional evidence into two visual-only emission directions', () => {
    expect(mergeFlowDirection('source-to-target', 'target-to-source')).toBe('both');
    expect(withMergedFlowDirection(
      { flowDirection: 'source-to-target', securityTransport: 'unknown' },
      { flowDirection: 'target-to-source' },
    )).toEqual({
      flowDirection: 'both',
      securityTransport: 'unknown',
    });

    const integration = {
      ...callEdge,
      relation: 'integrates-with' as const,
      flowDirection: 'both' as const,
    };
    expect(hasReverseFlow(integration)).toBe(true);
    expect(canAnimateFlowDirection(integration)).toBe(true);
    expect(shouldAnimateFlowEdge(integration, { enabled: true, scope: 'all' })).toBe(true);
    expect(flowEmissionDirections(integration)).toEqual([
      'source-to-target',
      'target-to-source',
    ]);
    expect(flowDirectionLabel('integrates-with', 'both')).toBe('source ↔ target');
  });

  it('keeps non-flow dependencies out of the emitter', () => {
    expect(canAnimateFlowDirection(dependencyEdge)).toBe(false);
    expect(flowEmissionDirections(dependencyEdge)).toEqual([]);
    expect(shouldAnimateFlowEdge(dependencyEdge, { enabled: true, scope: 'all' })).toBe(false);
  });

  it('uses wider randomized spacing in all-flow than focused flow', () => {
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
    expect(emit).toHaveBeenCalledWith(callEdge, 'source-to-target');
    const emittedBeforeStop = emit.mock.calls.length;
    stop();
    vi.advanceTimersByTime(5000);
    expect(emit).toHaveBeenCalledTimes(emittedBeforeStop);
    vi.useRealTimers();
  });

  it('runs both directions on independent schedules for bidirectional evidence', () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const integration = {
      ...callEdge,
      relation: 'integrates-with' as const,
      flowDirection: 'both' as const,
    };
    const stop = startFlowEmitter({
      edges: [integration],
      selection: { enabled: true, scope: 'all' },
      emit,
      random: () => 0,
    });

    vi.advanceTimersByTime(1000);
    expect(emit).toHaveBeenCalledWith(integration, 'source-to-target');
    expect(emit).toHaveBeenCalledWith(integration, 'target-to-source');
    stop();
    vi.useRealTimers();
  });

  it('does not animate when flow is disabled', () => {
    expect(shouldAnimateFlowEdge(callEdge, { enabled: false, scope: 'all' })).toBe(false);
  });
});
