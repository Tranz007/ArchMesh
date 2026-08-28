import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const graphCanvasSource = readFileSync(new URL('./GraphCanvas.tsx', import.meta.url), 'utf8');

describe('viewport resize camera policy', () => {
  it('keeps automatic zoom-to-fit out of the resize path', () => {
    expect(graphCanvasSource.match(/\.zoomToFit\(/g) ?? []).toHaveLength(1);
    expect(graphCanvasSource).not.toContain('previousViewportRef');
  });

  it('does not refit an already framed graph when the force engine stops again', () => {
    expect(graphCanvasSource).toContain(
      'if (fittedGraphRef.current !== graphIdentity) fitGraph();',
    );
  });

  it('still waits for a real viewport before the initial graph fit', () => {
    expect(graphCanvasSource).toContain(
      'size.width < 120 || size.height < 120',
    );
  });
});
