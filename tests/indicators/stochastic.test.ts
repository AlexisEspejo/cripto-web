import { describe, it, expect } from 'vitest';
import { stochastic } from '@/lib/indicators/stochastic';

const seq = (n: number, fn: (i: number) => number) => Array.from({ length: n }, (_, i) => fn(i));

describe('stochastic', () => {
  it('close at high → %K ≈ 100', () => {
    const highs = seq(20, () => 110);
    const lows = seq(20, () => 90);
    const closes = seq(20, i => (i < 19 ? 100 : 110));
    const st = stochastic(highs, lows, closes, 14, 3);
    expect(st.k[19] as number).toBeCloseTo(100, 2);
  });

  it('close at low → %K ≈ 0', () => {
    const highs = seq(20, () => 110);
    const lows = seq(20, () => 90);
    const closes = seq(20, i => (i < 19 ? 100 : 90));
    const st = stochastic(highs, lows, closes, 14, 3);
    expect(st.k[19] as number).toBeCloseTo(0, 2);
  });

  it('first kPeriod-1 values are null', () => {
    const highs = seq(20, () => 110);
    const lows = seq(20, () => 90);
    const closes = seq(20, () => 100);
    const st = stochastic(highs, lows, closes, 14, 3);
    expect(st.k.slice(0, 13).every(v => v === null)).toBe(true);
  });
});
