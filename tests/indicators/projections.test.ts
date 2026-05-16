import { describe, it, expect } from 'vitest';
import { monteCarloBands, analyseTrend, simulateScenario } from '@/lib/projections';
import type { Kline } from '@/lib/types';

function makeKlines(closes: number[]): Kline[] {
  return closes.map((c, i) => ({
    time: 1_700_000_000_000 + i * 86_400_000,
    open: c * 0.99,
    high: c * 1.01,
    low: c * 0.98,
    close: c,
    volume: 1000,
  }));
}

describe('monteCarloBands', () => {
  it('returns steps+1 bands with monotonic percentiles', () => {
    const closes = Array.from({ length: 200 }, (_, i) => 100 + i * 0.5 + Math.sin(i / 5) * 3);
    const bands = monteCarloBands(closes, 30, 500);
    expect(bands).toHaveLength(31);
    for (const b of bands) {
      expect(b.p5).toBeLessThanOrEqual(b.p25);
      expect(b.p25).toBeLessThanOrEqual(b.p50);
      expect(b.p50).toBeLessThanOrEqual(b.p75);
      expect(b.p75).toBeLessThanOrEqual(b.p95);
    }
  });

  it('returns empty when insufficient data', () => {
    expect(monteCarloBands([100, 101], 10, 100)).toEqual([]);
  });

  it('step 0 is the current price (all paths)', () => {
    const closes = Array.from({ length: 100 }, (_, i) => 100 + i);
    const bands = monteCarloBands(closes, 10, 200);
    const first = bands[0]!;
    expect(first.p50).toBeCloseTo(199, 4);
  });
});

describe('analyseTrend', () => {
  it('identifies a clear uptrend with high R²', () => {
    const closes = Array.from({ length: 100 }, (_, i) => 100 + i * 0.5);
    const t = analyseTrend(makeKlines(closes), 60);
    expect(t).not.toBeNull();
    expect(t!.trend).toBe('alcista');
    expect(t!.r2).toBeGreaterThan(0.95);
  });

  it('identifies a downtrend', () => {
    const closes = Array.from({ length: 100 }, (_, i) => 200 - i * 0.5);
    const t = analyseTrend(makeKlines(closes), 60);
    expect(t!.trend).toBe('bajista');
  });

  it('flags ranging series as lateral with low R²', () => {
    const closes = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const t = analyseTrend(makeKlines(closes), 60);
    expect(t!.trend).toBe('lateral');
    expect(t!.r2).toBeLessThan(0.3);
  });
});

describe('simulateScenario', () => {
  it('computes return percentages relative to invested capital', () => {
    const closes = Array.from({ length: 200 }, (_, i) => 100 + i * 0.3);
    const bands = monteCarloBands(closes, 30, 500);
    const s = simulateScenario(bands, 1000, 160, 30);
    expect(s.qty).toBeCloseTo(1000 / 160, 6);
    expect(s.bestCase).toBeGreaterThan(s.expectedValue);
    expect(s.worstCase).toBeLessThan(s.expectedValue);
  });
});
