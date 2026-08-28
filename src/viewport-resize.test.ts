import { describe, expect, it } from 'vitest';

function shouldScheduleViewportRefit(
  previous: { width: number; height: number },
  current: { width: number; height: number },
  hasGraph: boolean,
  isCurrentGraphFitted: boolean,
) {
  if (!hasGraph || current.width < 120 || current.height < 120) return false;
  if (previous.width < 120 || previous.height < 120) return false;
  if (previous.width === current.width && previous.height === current.height) return false;
  return isCurrentGraphFitted;
}

describe('viewport resize camera policy', () => {
  it('refits an already-framed graph after a real viewport resize', () => {
    expect(shouldScheduleViewportRefit(
      { width: 1200, height: 760 },
      { width: 920, height: 760 },
      true,
      true,
    )).toBe(true);
  });

  it('does not treat the initial 1px measurement as a user resize', () => {
    expect(shouldScheduleViewportRefit(
      { width: 1, height: 1 },
      { width: 1200, height: 760 },
      true,
      false,
    )).toBe(false);
  });

  it('does not refit before the current graph has received its initial framing', () => {
    expect(shouldScheduleViewportRefit(
      { width: 1200, height: 760 },
      { width: 1000, height: 760 },
      true,
      false,
    )).toBe(false);
  });
});
