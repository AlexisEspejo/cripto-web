import { describe, it, expect } from 'vitest';
import { analyseAdvanced, monteCarloProjection } from '@/lib/projections';
import type { Kline } from '@/lib/types';

function makeKlines(closes: number[]): Kline[] {
  return closes.map((c, i) => ({
    time: 1_700_000_000_000 + i * 86_400_000,
    open: c * 0.999,
    high: c * 1.005,
    low: c * 0.995,
    close: c,
    volume: 1000,
  }));
}

describe('analyseAdvanced', () => {
  it('provides Sharpe, Sortino, drawdown, win rate, VaR, Hurst', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.4 + Math.sin(i / 6) * 3);
    const a = analyseAdvanced(makeKlines(closes), '1d', 60);
    expect(a).not.toBeNull();
    expect(typeof a!.sharpe).toBe('number');
    expect(typeof a!.sortino).toBe('number');
    expect(a!.maxDrawdownPct).toBeLessThanOrEqual(0);
    expect(a!.winRatePct).toBeGreaterThanOrEqual(0);
    expect(a!.winRatePct).toBeLessThanOrEqual(100);
    expect(a!.var95Pct).toBeLessThanOrEqual(0);
    expect(a!.cvar95Pct).toBeLessThanOrEqual(a!.var95Pct);
    expect(a!.hurst).toBeGreaterThanOrEqual(0);
    expect(a!.hurst).toBeLessThanOrEqual(1);
  });

  it('detects bullish pattern (HH+HL) on rising series', () => {
    const closes = Array.from({ length: 200 }, (_, i) => 100 + i * 0.5);
    const a = analyseAdvanced(makeKlines(closes), '1d', 60);
    expect(a!.patterns.higherHighs).toBe(true);
    expect(a!.patterns.higherLows).toBe(true);
    expect(a!.patterns.lowerLows).toBe(false);
  });

  it('hurst near 0.5 for pure random walk-ish noise', () => {
    const closes: number[] = [100];
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 1; i < 200; i++) {
      closes.push(closes[i - 1]! * (1 + (rand() - 0.5) * 0.04));
    }
    const a = analyseAdvanced(makeKlines(closes), '1d', 60);
    expect(a!.hurst).toBeGreaterThan(0.2);
    expect(a!.hurst).toBeLessThan(0.85);
  });

  it('annualisation factor changes with interval', () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.4);
    const d = analyseAdvanced(makeKlines(closes), '1d', 60)!;
    const w = analyseAdvanced(makeKlines(closes), '1w', 60)!;
    expect(d.stepsPerYear).toBe(365);
    expect(w.stepsPerYear).toBe(52);
  });
});

describe('monteCarloProjection sentiment bias', () => {
  const closes = Array.from({ length: 260 }, (_, i) => 100 + i * 0.3);
  const klines = makeKlines(closes);

  it('returns probabilityOfProfit and expectedPathDrawdown', () => {
    const r = monteCarloProjection(klines, '1d', 30, 500);
    expect(r.bands.length).toBe(31);
    expect(r.probabilityOfProfit).toBeGreaterThanOrEqual(0);
    expect(r.probabilityOfProfit).toBeLessThanOrEqual(1);
    expect(r.expectedPathDrawdown).toBeLessThanOrEqual(0);
  });

  it('positive sentiment lifts the median path vs no-sentiment baseline', () => {
    const baseline = monteCarloProjection(klines, '1d', 30, 2000);
    const bullish = monteCarloProjection(klines, '1d', 30, 2000, {
      sentimentNetScore: 100,
      sentimentWeight: 0.5,
    });
    const baseEnd = baseline.bands[baseline.bands.length - 1]!.p50;
    const bullEnd = bullish.bands[bullish.bands.length - 1]!.p50;
    expect(bullEnd).toBeGreaterThan(baseEnd);
  });

  it('negative sentiment lowers the median path', () => {
    const baseline = monteCarloProjection(klines, '1d', 30, 2000);
    const bearish = monteCarloProjection(klines, '1d', 30, 2000, {
      sentimentNetScore: -100,
      sentimentWeight: 0.5,
    });
    const baseEnd = baseline.bands[baseline.bands.length - 1]!.p50;
    const bearEnd = bearish.bands[bearish.bands.length - 1]!.p50;
    expect(bearEnd).toBeLessThan(baseEnd);
  });
});
