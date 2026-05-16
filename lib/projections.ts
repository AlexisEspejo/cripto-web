import type { Kline } from './types';

export interface MonteCarloBand {
  step: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface TrendAnalysis {
  /** 'alcista' | 'bajista' | 'lateral' */
  trend: 'alcista' | 'bajista' | 'lateral';
  /** Strength of the regression: 'fuerte' | 'moderada' | 'débil' */
  strength: 'fuerte' | 'moderada' | 'débil';
  /** R² coefficient. */
  r2: number;
  /** Linear regression slope expressed as % per period. */
  slopePct: number;
  /** Last support (recent 30-bar low). */
  support: number;
  /** Last resistance (recent 30-bar high). */
  resistance: number;
  /** ATR (14) ratio vs the 200-bar mean ATR; >1 means above-average volatility. */
  volatilityRegime: number;
  /** Regression line endpoints over the analysed window. */
  regression: { from: number; to: number };
  /** Annualised volatility derived from daily log returns. */
  annualisedVolPct: number;
  /** Annualised expected return derived from daily log returns. */
  annualisedReturnPct: number;
}

function boxMullerStandardNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * q));
  return sorted[idx]!;
}

/**
 * Geometric Brownian Motion Monte Carlo simulation.
 * Returns the percentile bands (p5/p25/p50/p75/p95) of simulated prices at
 * each future step.
 */
export function monteCarloBands(
  closes: number[],
  steps: number,
  paths: number,
): MonteCarloBand[] {
  if (closes.length < 30) return [];
  const logRets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1] ?? 0;
    const cur = closes[i] ?? 0;
    if (prev > 0 && cur > 0) logRets.push(Math.log(cur / prev));
  }
  if (logRets.length < 10) return [];
  const mean = logRets.reduce((a, b) => a + b, 0) / logRets.length;
  const variance =
    logRets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, logRets.length - 1);
  const stddev = Math.sqrt(variance);
  const lastPrice = closes[closes.length - 1] ?? 0;

  const stepPrices: number[][] = Array.from({ length: steps + 1 }, () => []);
  stepPrices[0] = new Array(paths).fill(lastPrice);

  for (let p = 0; p < paths; p++) {
    let price = lastPrice;
    for (let s = 1; s <= steps; s++) {
      const z = boxMullerStandardNormal();
      price = price * Math.exp(mean - 0.5 * variance + stddev * z);
      stepPrices[s]!.push(price);
    }
  }

  const out: MonteCarloBand[] = [];
  for (let s = 0; s <= steps; s++) {
    const sorted = stepPrices[s]!.slice().sort((a, b) => a - b);
    out.push({
      step: s,
      p5: percentile(sorted, 0.05),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      p95: percentile(sorted, 0.95),
    });
  }
  return out;
}

/**
 * Linear regression + simple pattern features over the last `window` candles.
 */
export function analyseTrend(klines: Kline[], window = 60): TrendAnalysis | null {
  if (klines.length < 50) return null;
  const slice = klines.slice(-Math.min(window, klines.length));
  const closes = slice.map(k => k.close);
  const highs = slice.map(k => k.high);
  const lows = slice.map(k => k.low);

  const n = closes.length;
  const meanY = closes.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - (n - 1) / 2) * ((closes[i] ?? 0) - meanY);
    den += (i - (n - 1) / 2) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * ((n - 1) / 2);

  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const y = closes[i] ?? 0;
    const pred = slope * i + intercept;
    ssTot += (y - meanY) ** 2;
    ssRes += (y - pred) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const slopePct = (slope / meanY) * 100;

  let trend: TrendAnalysis['trend'] = 'lateral';
  if (slopePct > 0.05) trend = 'alcista';
  else if (slopePct < -0.05) trend = 'bajista';

  let strength: TrendAnalysis['strength'] = 'débil';
  if (r2 > 0.6) strength = 'fuerte';
  else if (r2 > 0.3) strength = 'moderada';

  // Support / resistance from recent 30-bar Donchian channel
  const swingWindow = Math.min(30, n);
  const recentHighs = highs.slice(-swingWindow);
  const recentLows = lows.slice(-swingWindow);
  const support = Math.min(...recentLows);
  const resistance = Math.max(...recentHighs);

  // ATR(14) ratio (current vs 200-bar mean)
  const atr14 = atr(klines.slice(-Math.min(60, klines.length)), 14);
  const atr200 = atr(klines, Math.min(200, klines.length - 1));
  const lastAtr14 = atr14[atr14.length - 1] ?? 0;
  const lastAtr200 = atr200[atr200.length - 1] ?? 0;
  const volatilityRegime = lastAtr200 > 0 ? lastAtr14 / lastAtr200 : 1;

  // Annualised vol / return from daily log returns
  const logRets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1] ?? 0;
    const cur = closes[i] ?? 0;
    if (prev > 0 && cur > 0) logRets.push(Math.log(cur / prev));
  }
  const mean = logRets.length ? logRets.reduce((a, b) => a + b, 0) / logRets.length : 0;
  const variance =
    logRets.length > 1
      ? logRets.reduce((a, b) => a + (b - mean) ** 2, 0) / (logRets.length - 1)
      : 0;
  const annualisedReturnPct = (Math.exp(mean * 252) - 1) * 100;
  const annualisedVolPct = Math.sqrt(variance * 252) * 100;

  return {
    trend,
    strength,
    r2,
    slopePct,
    support,
    resistance,
    volatilityRegime,
    regression: { from: intercept, to: slope * (n - 1) + intercept },
    annualisedVolPct,
    annualisedReturnPct,
  };
}

function atr(klines: Kline[], period: number): Array<number | null> {
  if (klines.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const cur = klines[i]!;
    const prev = klines[i - 1]!;
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close),
    );
    trs.push(tr);
  }
  const out: Array<number | null> = new Array(period - 1).fill(null);
  let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + (trs[i] ?? 0)) / period;
    out.push(prev);
  }
  return out;
}

/**
 * Simulate compound returns of a one-shot purchase over a holding horizon.
 * Returns the final price for each percentile band.
 */
export interface ScenarioSummary {
  invested: number;
  qty: number;
  expectedValue: number;
  bestCase: number; // p95
  worstCase: number; // p5
  expectedReturnPct: number;
  bestReturnPct: number;
  worstReturnPct: number;
}

export function simulateScenario(
  bands: MonteCarloBand[],
  invested: number,
  entryPrice: number,
  horizonSteps: number,
): ScenarioSummary {
  const target = bands.find(b => b.step === horizonSteps) ?? bands[bands.length - 1];
  const qty = invested / entryPrice;
  const expectedValue = qty * (target?.p50 ?? entryPrice);
  const bestCase = qty * (target?.p95 ?? entryPrice);
  const worstCase = qty * (target?.p5 ?? entryPrice);
  return {
    invested,
    qty,
    expectedValue,
    bestCase,
    worstCase,
    expectedReturnPct: (expectedValue / invested - 1) * 100,
    bestReturnPct: (bestCase / invested - 1) * 100,
    worstReturnPct: (worstCase / invested - 1) * 100,
  };
}
