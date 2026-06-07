import { describe, it, expect } from 'vitest';
import { liquidity } from '@/lib/indicators/liquidity';

/** Build flat OHLCV bars; per-bar overrides patch a single candle. */
function bars(
  n: number,
  base = 100,
  overrides: Record<
    number,
    Partial<{ high: number; low: number; close: number; volume: number }>
  > = {},
) {
  const highs: number[] = [];
  const lows: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];
  for (let i = 0; i < n; i++) {
    const o = overrides[i] ?? {};
    highs.push(o.high ?? base + 1);
    lows.push(o.low ?? base - 1);
    closes.push(o.close ?? base);
    volumes.push(o.volume ?? 1000);
  }
  return { highs, lows, closes, volumes };
}

describe('liquidity (pull de liquidez)', () => {
  it('returns null during the warmup window', () => {
    const { highs, lows, closes, volumes } = bars(30);
    const res = liquidity(highs, lows, closes, volumes, 20);
    expect(res.pull.slice(0, 20).every(v => v === null)).toBe(true);
    expect(res.pull[20]).not.toBeNull();
    expect(res.pull).toHaveLength(30);
  });

  it('detects a bullish sweep: wick below swing low then reclaim', () => {
    // Range pinned at 100±1; last bar wicks to 95 (below swing low 99) but
    // closes back at 100 → sell-side liquidity grabbed and reclaimed.
    const { highs, lows, closes, volumes } = bars(25, 100, {
      24: { low: 95, close: 100, high: 101, volume: 2500 },
    });
    const res = liquidity(highs, lows, closes, volumes, 20);
    expect(res.event[24]).toBe('bull-sweep');
    expect(res.pull[24]!).toBeGreaterThan(0);
  });

  it('detects a bearish sweep: wick above swing high then rejection', () => {
    const { highs, lows, closes, volumes } = bars(25, 100, {
      24: { high: 105, close: 100, low: 99, volume: 2500 },
    });
    const res = liquidity(highs, lows, closes, volumes, 20);
    expect(res.event[24]).toBe('bear-sweep');
    expect(res.pull[24]!).toBeLessThan(0);
  });

  it('flags a bullish breakout when close holds above the swing high', () => {
    const { highs, lows, closes, volumes } = bars(25, 100, {
      24: { high: 110, low: 105, close: 108 },
    });
    const res = liquidity(highs, lows, closes, volumes, 20);
    expect(res.event[24]).toBe('bull-breakout');
    expect(res.pull[24]!).toBeGreaterThan(0);
  });

  it('flags a bearish breakdown when close holds below the swing low', () => {
    const { highs, lows, closes, volumes } = bars(25, 100, {
      24: { high: 95, low: 90, close: 92 },
    });
    const res = liquidity(highs, lows, closes, volumes, 20);
    expect(res.event[24]).toBe('bear-breakdown');
    expect(res.pull[24]!).toBeLessThan(0);
  });

  it('stays in range with a small bias when no pool is taken', () => {
    const { highs, lows, closes, volumes } = bars(25, 100);
    const res = liquidity(highs, lows, closes, volumes, 20);
    expect(res.event[24]).toBe('range');
    expect(Math.abs(res.pull[24]!)).toBeLessThanOrEqual(20);
  });

  it('clamps the pull score to [-100, 100]', () => {
    const { highs, lows, closes, volumes } = bars(25, 100, {
      24: { low: 1, close: 100, high: 101, volume: 100000 },
    });
    const res = liquidity(highs, lows, closes, volumes, 20);
    expect(res.pull[24]!).toBeLessThanOrEqual(100);
    expect(res.pull[24]!).toBeGreaterThanOrEqual(-100);
  });
});
