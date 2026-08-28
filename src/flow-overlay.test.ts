import { describe, expect, it } from 'vitest';
import { flowEmissionDirections, flowRenderEndpoints, metadataFlowDirection } from './flow';

describe('visual-only flow contract', () => {
  it('preserves structural endpoints while reverse evidence changes only visual direction', () => {
    const edge = {
      id: 'integration:reverse',
      source: 'system:app',
      target: 'integration:provider',
      relation: 'integrates-with' as const,
      flowDirection: 'target-to-source' as const,
    };

    expect(flowRenderEndpoints(edge)).toEqual({
      source: 'system:app',
      target: 'integration:provider',
    });
    expect(flowEmissionDirections(edge)).toEqual(['target-to-source']);
  });

  it('reads projected integration direction from graph metadata', () => {
    expect(metadataFlowDirection({ flowDirection: 'source-to-target' })).toBe('source-to-target');
    expect(metadataFlowDirection({ flowDirection: 'both' })).toBe('both');
    expect(metadataFlowDirection({ flowDirection: 'not-evidence' })).toBeUndefined();
  });
});
