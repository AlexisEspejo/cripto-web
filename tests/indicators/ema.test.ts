import { describe, it, expect } from 'vitest';
import { ema } from '@/lib/indicators/ema';

describe('ema', () => {
  it('returns empty when input is shorter than period', () => {
    expect(ema([1, 2, 3], 5)).toEqual([]);
  });

  it('first value equals SMA of first `period` items', () => {
    const out = ema([1, 2, 3, 4, 5], 5);
    expect(out[4]).toBeCloseTo(3, 5);
  });

  it('follows canonical EMA recurrence on a known trend', () => {
    const out = ema([10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 5);
    // First 4 are null
    expect(out.slice(0, 4)).toEqual([null, null, null, null]);
    // Seed = SMA(10..14) = 12. k = 2/6 = 0.3333.
    // EMA[5] = 15*0.3333 + 12*0.6667 = 13
    expect(out[5]).toBeCloseTo(13, 4);
    expect(out[6]).toBeCloseTo(14, 4);
  });

  it('handles a falling series symmetrically', () => {
    const rising = ema([10, 11, 12, 13, 14, 15], 3);
    const falling = ema([15, 14, 13, 12, 11, 10], 3);
    // Last EMA of a rising sequence should be higher than that of falling
    const lastR = rising[rising.length - 1];
    const lastF = falling[falling.length - 1];
    expect(lastR).toBeGreaterThan(lastF as number);
  });

  it('on a flat series stays flat', () => {
    const out = ema([5, 5, 5, 5, 5, 5, 5, 5], 3);
    for (let i = 2; i < out.length; i++) expect(out[i]).toBeCloseTo(5, 8);
  });
});
