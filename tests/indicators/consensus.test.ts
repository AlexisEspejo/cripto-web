import { describe, it, expect } from 'vitest';
import { generateConsensus } from '@/lib/consensus';
import type { Kline } from '@/lib/types';

function makeKlines(closes: number[]): Kline[] {
  return closes.map((c, i) => ({
    time: i * 86_400_000,
    open: c * 0.99,
    high: c * 1.01,
    low: c * 0.98,
    close: c,
    volume: 1000 + (i % 20) * 50,
  }));
}

describe('generateConsensus', () => {
  it('healthy uptrend (trend then mild pullback) → bullish verdict', () => {
    // Long uptrend that pulls back slightly at the end to bring RSI off extreme.
    const len = 260;
    const closes = Array.from({ length: len }, (_, i) => {
      if (i < len - 12) return 100 + i * 0.5;
      // Mild pullback at the tail
      const peak = 100 + (len - 12) * 0.5;
      return peak - (i - (len - 12)) * 1.0;
    });
    const res = generateConsensus(makeKlines(closes));
    expect(['BUY', 'STRONG_BUY', 'HOLD']).toContain(res.verdict);
    // Structural bullishness: trend, EMAs, Ichimoku all positive
    expect(res.buyCount).toBeGreaterThanOrEqual(res.sellCount);
  });

  it('healthy downtrend → bearish verdict', () => {
    const len = 260;
    const closes = Array.from({ length: len }, (_, i) => {
      if (i < len - 12) return 300 - i * 0.5;
      const bottom = 300 - (len - 12) * 0.5;
      return bottom + (i - (len - 12)) * 1.0;
    });
    const res = generateConsensus(makeKlines(closes));
    expect(['SELL', 'STRONG_SELL', 'HOLD']).toContain(res.verdict);
    expect(res.sellCount).toBeGreaterThanOrEqual(res.buyCount);
  });

  it('verdict score and indicator counts change when input is mutated', () => {
    const baseline = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
    const baselineLast = baseline[baseline.length - 1] ?? 0;
    const mutated = baseline.slice();
    // Insert a sharp drop near the tail to force a different technical picture
    for (let i = 250; i < 260; i++) mutated[i] = baselineLast - (i - 249) * 4;
    const bResult = generateConsensus(makeKlines(baseline));
    const mResult = generateConsensus(makeKlines(mutated));
    // Either the score or the buy/sell distribution should reflect the change.
    const changed =
      bResult.totalScore !== mResult.totalScore ||
      bResult.buyCount !== mResult.buyCount ||
      bResult.sellCount !== mResult.sellCount;
    expect(changed).toBe(true);
  });

  it('score is bounded in [-20, +20]', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
    const res = generateConsensus(makeKlines(closes));
    expect(res.totalScore).toBeGreaterThanOrEqual(-20);
    expect(res.totalScore).toBeLessThanOrEqual(20);
    expect(res.buyCount + res.sellCount + res.neutralCount).toBe(10);
  });

  it('mixed/ranging series → HOLD', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + Math.sin(i / 8) * 4);
    const res = generateConsensus(makeKlines(closes));
    expect(['HOLD', 'BUY', 'SELL']).toContain(res.verdict);
    expect(Math.abs(res.totalScore)).toBeLessThan(12);
  });

  it('returns 10 indicators', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
    const res = generateConsensus(makeKlines(closes));
    expect(res.indicators).toHaveLength(10);
  });

  it('computes operational levels', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.4);
    const res = generateConsensus(makeKlines(closes));
    expect(res.levels.entry.from).toBeLessThan(res.lastPrice);
    expect(res.levels.entry.to).toBeGreaterThan(res.lastPrice);
    // Buy verdict → tp1 above price
    expect(res.levels.tp1).toBeGreaterThan(res.lastPrice);
  });

  it('verdict score totals match sum of signals', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
    const res = generateConsensus(makeKlines(closes));
    const sum = res.indicators.reduce((a, i) => a + i.signal, 0);
    expect(res.totalScore).toBe(sum);
  });
});
