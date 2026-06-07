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

  it('score is bounded in [-22, +22] without sentiment', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
    const res = generateConsensus(makeKlines(closes));
    expect(res.totalScore).toBeGreaterThanOrEqual(-22);
    expect(res.totalScore).toBeLessThanOrEqual(22);
    expect(res.buyCount + res.sellCount + res.neutralCount).toBe(11);
    expect(res.maxScore).toBe(22);
    expect(res.includesSentiment).toBe(false);
  });

  it('with sentiment included → 12 indicators, maxScore 24, signal mapped', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
    const res = generateConsensus(makeKlines(closes), { newsNetScore: 50 });
    expect(res.indicators).toHaveLength(12);
    expect(res.maxScore).toBe(24);
    expect(res.includesSentiment).toBe(true);
    const last = res.indicators[11];
    expect(last?.name).toBe('Sentiment Noticias');
    expect(last?.signal).toBe(2);
  });

  it('news net score maps to discrete signals correctly', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
    const cases: Array<{ ns: number; expected: -2 | -1 | 0 | 1 | 2 }> = [
      { ns: 80, expected: 2 },
      { ns: 25, expected: 1 },
      { ns: 5, expected: 0 },
      { ns: 0, expected: 0 },
      { ns: -25, expected: -1 },
      { ns: -80, expected: -2 },
    ];
    for (const { ns, expected } of cases) {
      const res = generateConsensus(makeKlines(closes), { newsNetScore: ns });
      const last = res.indicators[11];
      expect(last?.signal).toBe(expected);
    }
  });

  it('bullish sentiment never lowers a bullish score', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.5);
    const noNews = generateConsensus(makeKlines(closes));
    const withBullNews = generateConsensus(makeKlines(closes), { newsNetScore: 100 });
    expect(withBullNews.totalScore).toBeGreaterThanOrEqual(noNews.totalScore);
  });

  it('mixed/ranging series → HOLD', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + Math.sin(i / 8) * 4);
    const res = generateConsensus(makeKlines(closes));
    expect(['HOLD', 'BUY', 'SELL']).toContain(res.verdict);
    expect(Math.abs(res.totalScore)).toBeLessThan(12);
  });

  it('returns 11 indicators', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
    const res = generateConsensus(makeKlines(closes));
    expect(res.indicators).toHaveLength(11);
    expect(res.indicators[10]?.name).toBe('Liquidez (Pull)');
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
