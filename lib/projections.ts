import type { Kline, KlineInterval } from './types';

export interface MonteCarloBand {
  step: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface MonteCarloResult {
  bands: MonteCarloBand[];
  /** Fraction of paths ending above the entry price at the final step. */
  probabilityOfProfit: number;
  /** Maximum drawdown observed in the simulated paths (mean across paths). */
  expectedPathDrawdown: number;
  /** Annualisation factor used (steps per year for the given timeframe). */
  stepsPerYear: number;
}

export interface AdvancedAnalysis {
  trend: 'alcista' | 'bajista' | 'lateral';
  strength: 'fuerte' | 'moderada' | 'débil';
  r2: number;
  slopePctPerStep: number;
  /** Annualised drift derived from log returns, in %. */
  annualisedReturnPct: number;
  /** Annualised volatility from log returns, in %. */
  annualisedVolPct: number;
  /** Sharpe ratio (excess return over volatility, risk-free assumed 0). */
  sharpe: number;
  /** Sortino ratio (uses downside deviation only). */
  sortino: number;
  /** Maximum drawdown observed in the historical window, in %. */
  maxDrawdownPct: number;
  /** Current drawdown vs window-high, in %. */
  currentDrawdownPct: number;
  /** Win rate: % of historical periods with positive return. */
  winRatePct: number;
  /** VaR 95 % — worst loss in 95 % of cases, in % per period. */
  var95Pct: number;
  /** CVaR 95 % — expected loss in the worst 5 % tail, in % per period. */
  cvar95Pct: number;
  /** Hurst exponent (>0.5 trending, <0.5 mean-reverting, =0.5 random walk). */
  hurst: number;
  /** Skewness of log returns. */
  skewness: number;
  /** Excess kurtosis (subtracts 3). */
  kurtosis: number;
  /** Donchian channel from last `swingWindow` candles. */
  support: number;
  resistance: number;
  /** ATR(14) ratio vs ATR(200) — volatility regime. */
  volatilityRegime: number;
  regimeLabel: 'volatilidad alta' | 'volatilidad normal' | 'volatilidad baja';
  /** Endpoints of the linear regression line within the window. */
  regression: { from: number; to: number };
  /** Last closing price. */
  lastPrice: number;
  /** Pattern features. */
  patterns: PatternFeatures;
  /** Steps per year used for annualisation. */
  stepsPerYear: number;
}

export interface PatternFeatures {
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  bollingerSqueeze: boolean;
  /** Number of times MACD line crossed signal in the window. */
  macdCrosses: number;
  /** RSI divergence detected (price new high + RSI lower high, or inverse). */
  rsiDivergence: 'bullish' | 'bearish' | null;
}

export const STEPS_PER_YEAR: Record<KlineInterval, number> = {
  '1h': 24 * 365,
  '4h': 6 * 365,
  '1d': 365,
  '1w': 52,
};

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

function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1] ?? 0;
    const cur = closes[i] ?? 0;
    if (prev > 0 && cur > 0) out.push(Math.log(cur / prev));
  }
  return out;
}

function meanAndStd(xs: number[]): { mean: number; std: number; variance: number } {
  if (xs.length === 0) return { mean: 0, std: 0, variance: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.length > 1
      ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1)
      : 0;
  return { mean, std: Math.sqrt(variance), variance };
}

function downsideStd(xs: number[]): number {
  const neg = xs.filter(x => x < 0);
  if (neg.length === 0) return 0;
  const sq = neg.reduce((a, b) => a + b * b, 0) / neg.length;
  return Math.sqrt(sq);
}

function maxDrawdown(closes: number[]): { maxDD: number; current: number } {
  let peak = closes[0] ?? 0;
  let maxDD = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = peak > 0 ? (c - peak) / peak : 0;
    if (dd < maxDD) maxDD = dd;
  }
  const last = closes[closes.length - 1] ?? 0;
  // current drawdown vs the running peak at the last bar
  let runningPeak = closes[0] ?? 0;
  for (const c of closes) if (c > runningPeak) runningPeak = c;
  const current = runningPeak > 0 ? (last - runningPeak) / runningPeak : 0;
  return { maxDD, current };
}

/** Hurst exponent via R/S analysis on log returns. */
function hurstExponent(returns: number[]): number {
  if (returns.length < 32) return 0.5;
  const lags = [4, 8, 16, 32, 64].filter(l => l < returns.length);
  if (lags.length < 3) return 0.5;
  const logRs: number[] = [];
  const logL: number[] = [];
  for (const lag of lags) {
    const chunks = Math.floor(returns.length / lag);
    const rsValues: number[] = [];
    for (let c = 0; c < chunks; c++) {
      const slice = returns.slice(c * lag, (c + 1) * lag);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const dev = slice.map(x => x - mean);
      let cum = 0;
      let maxC = -Infinity;
      let minC = Infinity;
      for (const d of dev) {
        cum += d;
        if (cum > maxC) maxC = cum;
        if (cum < minC) minC = cum;
      }
      const range = maxC - minC;
      const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length);
      if (std > 0 && range > 0) rsValues.push(range / std);
    }
    if (rsValues.length > 0) {
      const meanRs = rsValues.reduce((a, b) => a + b, 0) / rsValues.length;
      logRs.push(Math.log(meanRs));
      logL.push(Math.log(lag));
    }
  }
  if (logRs.length < 3) return 0.5;
  // Linear regression slope on (logL, logRs)
  const meanX = logL.reduce((a, b) => a + b, 0) / logL.length;
  const meanY = logRs.reduce((a, b) => a + b, 0) / logRs.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < logL.length; i++) {
    num += (logL[i]! - meanX) * (logRs[i]! - meanY);
    den += (logL[i]! - meanX) ** 2;
  }
  const slope = den === 0 ? 0.5 : num / den;
  return Math.max(0, Math.min(1, slope));
}

function skewKurt(xs: number[]): { skew: number; kurt: number } {
  if (xs.length < 4) return { skew: 0, kurt: 0 };
  const { mean, std } = meanAndStd(xs);
  if (std === 0) return { skew: 0, kurt: 0 };
  const n = xs.length;
  const m3 = xs.reduce((a, b) => a + (b - mean) ** 3, 0) / n;
  const m4 = xs.reduce((a, b) => a + (b - mean) ** 4, 0) / n;
  const skew = m3 / std ** 3;
  const kurt = m4 / std ** 4 - 3;
  return { skew, kurt };
}

function atrSeries(klines: Kline[], period: number): number[] {
  if (klines.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const c = klines[i]!;
    const p = klines[i - 1]!;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close),
    );
    trs.push(tr);
  }
  const out: number[] = [];
  let cur = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(cur);
  for (let i = period; i < trs.length; i++) {
    cur = (cur * (period - 1) + (trs[i] ?? 0)) / period;
    out.push(cur);
  }
  return out;
}

function detectPatterns(klines: Kline[]): PatternFeatures {
  const closes = klines.map(k => k.close);
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);

  // Higher-highs / lower-lows over the last 20 candles split in halves
  const half = Math.floor(Math.min(20, closes.length) / 2);
  if (half < 3) {
    return {
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
      bollingerSqueeze: false,
      macdCrosses: 0,
      rsiDivergence: null,
    };
  }
  const recent = klines.slice(-half * 2);
  const left = recent.slice(0, half);
  const right = recent.slice(half);
  const leftMaxH = Math.max(...left.map(k => k.high));
  const rightMaxH = Math.max(...right.map(k => k.high));
  const leftMinL = Math.min(...left.map(k => k.low));
  const rightMinL = Math.min(...right.map(k => k.low));
  const higherHighs = rightMaxH > leftMaxH;
  const lowerHighs = rightMaxH < leftMaxH;
  const higherLows = rightMinL > leftMinL;
  const lowerLows = rightMinL < leftMinL;

  // Bollinger squeeze: current bandwidth is in the bottom 20 % of last 120 bars
  const bw: number[] = [];
  const N = 20;
  for (let i = N - 1; i < closes.length; i++) {
    const slice = closes.slice(i - N + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / N;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / N;
    const sd = Math.sqrt(variance);
    bw.push((4 * sd) / (mean || 1)); // upper-lower normalised
  }
  const recentBw = bw.slice(-Math.min(120, bw.length));
  const sortedBw = recentBw.slice().sort((a, b) => a - b);
  const p20Bw = sortedBw[Math.floor(sortedBw.length * 0.2)] ?? Infinity;
  const lastBw = bw[bw.length - 1] ?? 0;
  const bollingerSqueeze = lastBw < p20Bw;

  // MACD crosses (12,26,9) in last 60 bars
  const macdLine: number[] = [];
  const ema = (vals: number[], period: number): number[] => {
    if (vals.length < period) return [];
    const k = 2 / (period + 1);
    let prev = vals.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const out: number[] = new Array(period - 1).fill(NaN);
    out.push(prev);
    for (let i = period; i < vals.length; i++) {
      prev = (vals[i] ?? 0) * k + prev * (1 - k);
      out.push(prev);
    }
    return out;
  };
  const eFast = ema(closes, 12);
  const eSlow = ema(closes, 26);
  for (let i = 0; i < eSlow.length; i++) {
    const f = eFast[i];
    const s = eSlow[i];
    if (!Number.isNaN(f ?? NaN) && !Number.isNaN(s ?? NaN)) macdLine.push((f ?? 0) - (s ?? 0));
    else macdLine.push(NaN);
  }
  const macdSignal = ema(macdLine.filter(v => !Number.isNaN(v)), 9);
  const macdHist: number[] = [];
  const validStart = macdLine.findIndex(v => !Number.isNaN(v));
  const offset = validStart + (macdLine.filter(v => !Number.isNaN(v)).length - macdSignal.length);
  for (let i = 0; i < macdLine.length; i++) {
    const m = macdLine[i];
    const sIdx = i - offset;
    const s = sIdx >= 0 ? macdSignal[sIdx] : undefined;
    if (m == null || Number.isNaN(m) || s == null || Number.isNaN(s)) macdHist.push(NaN);
    else macdHist.push(m - s);
  }
  let macdCrosses = 0;
  const window = Math.min(60, macdHist.length - 1);
  for (let i = macdHist.length - window; i < macdHist.length - 1; i++) {
    if (i < 1) continue;
    const a = macdHist[i - 1];
    const b = macdHist[i];
    if (a != null && b != null && !Number.isNaN(a) && !Number.isNaN(b)) {
      if ((a < 0 && b > 0) || (a > 0 && b < 0)) macdCrosses++;
    }
  }

  // RSI divergence: compare last-segment high/low of price vs RSI
  const rsi14 = computeRsi(closes, 14);
  const lookback = Math.min(30, closes.length - 1);
  const recentClosesSeg = closes.slice(-lookback);
  const recentRsiSeg = rsi14.slice(-lookback);
  const splitIdx = Math.floor(lookback / 2);
  const priceLeftMax = Math.max(...recentClosesSeg.slice(0, splitIdx));
  const priceRightMax = Math.max(...recentClosesSeg.slice(splitIdx));
  const rsiLeftMax = Math.max(...recentRsiSeg.slice(0, splitIdx).filter(x => x != null) as number[]);
  const rsiRightMax = Math.max(...recentRsiSeg.slice(splitIdx).filter(x => x != null) as number[]);
  const priceLeftMin = Math.min(...recentClosesSeg.slice(0, splitIdx));
  const priceRightMin = Math.min(...recentClosesSeg.slice(splitIdx));
  const rsiLeftMin = Math.min(...recentRsiSeg.slice(0, splitIdx).filter(x => x != null) as number[]);
  const rsiRightMin = Math.min(...recentRsiSeg.slice(splitIdx).filter(x => x != null) as number[]);
  let rsiDivergence: 'bullish' | 'bearish' | null = null;
  if (priceRightMax > priceLeftMax && rsiRightMax < rsiLeftMax) rsiDivergence = 'bearish';
  else if (priceRightMin < priceLeftMin && rsiRightMin > rsiLeftMin) rsiDivergence = 'bullish';

  void highs;
  void lows;
  return {
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    bollingerSqueeze,
    macdCrosses,
    rsiDivergence,
  };
}

function computeRsi(closes: number[], period: number): Array<number | null> {
  if (closes.length < period + 1) return new Array(closes.length).fill(null);
  const out: Array<number | null> = new Array(period).fill(null);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    if (d >= 0) gains += d;
    else losses -= d;
  }
  let avgG = gains / period;
  let avgL = losses / period;
  out.push(100 - 100 / (1 + avgG / (avgL || 1e-9)));
  for (let i = period + 1; i < closes.length; i++) {
    const d = (closes[i] ?? 0) - (closes[i - 1] ?? 0);
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    out.push(100 - 100 / (1 + avgG / (avgL || 1e-9)));
  }
  return out;
}

/**
 * Full robust technical analysis for the projection page.
 */
export function analyseAdvanced(
  klines: Kline[],
  interval: KlineInterval = '1d',
  window = 60,
): AdvancedAnalysis | null {
  if (klines.length < 50) return null;
  const stepsPerYear = STEPS_PER_YEAR[interval];
  const slice = klines.slice(-Math.min(window, klines.length));
  const closes = slice.map(k => k.close);
  const lastPrice = closes[closes.length - 1] ?? 0;

  // Linear regression
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
  const slopePctPerStep = (slope / meanY) * 100;

  let trend: AdvancedAnalysis['trend'] = 'lateral';
  if (slopePctPerStep > 0.05) trend = 'alcista';
  else if (slopePctPerStep < -0.05) trend = 'bajista';
  let strength: AdvancedAnalysis['strength'] = 'débil';
  if (r2 > 0.6) strength = 'fuerte';
  else if (r2 > 0.3) strength = 'moderada';

  // Returns + risk metrics
  const allCloses = klines.map(k => k.close);
  const rets = logReturns(allCloses);
  const { mean, std, variance } = meanAndStd(rets);
  const dsStd = downsideStd(rets);
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(stepsPerYear) : 0;
  const sortino = dsStd > 0 ? (mean / dsStd) * Math.sqrt(stepsPerYear) : 0;
  const annualisedReturnPct = (Math.exp(mean * stepsPerYear) - 1) * 100;
  const annualisedVolPct = Math.sqrt(variance * stepsPerYear) * 100;

  const dd = maxDrawdown(allCloses);
  const maxDrawdownPct = dd.maxDD * 100;
  const currentDrawdownPct = dd.current * 100;

  const winRatePct = rets.length > 0 ? (rets.filter(r => r > 0).length / rets.length) * 100 : 0;

  // VaR / CVaR at 95 %
  const sortedRets = rets.slice().sort((a, b) => a - b);
  const var95 = sortedRets[Math.floor(sortedRets.length * 0.05)] ?? 0;
  const tail = sortedRets.slice(0, Math.max(1, Math.floor(sortedRets.length * 0.05)));
  const cvar95 = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : 0;

  const hurst = hurstExponent(rets);
  const { skew, kurt } = skewKurt(rets);

  // Donchian channel + ATR regime
  const swingWindow = Math.min(30, slice.length);
  const support = Math.min(...slice.slice(-swingWindow).map(k => k.low));
  const resistance = Math.max(...slice.slice(-swingWindow).map(k => k.high));

  const atr14 = atrSeries(klines.slice(-Math.min(60, klines.length)), 14);
  const atr200 = atrSeries(klines, Math.min(200, klines.length - 1));
  const lastAtr14 = atr14[atr14.length - 1] ?? 0;
  const lastAtr200 = atr200[atr200.length - 1] ?? 0;
  const volatilityRegime = lastAtr200 > 0 ? lastAtr14 / lastAtr200 : 1;
  const regimeLabel: AdvancedAnalysis['regimeLabel'] =
    volatilityRegime > 1.2
      ? 'volatilidad alta'
      : volatilityRegime < 0.8
      ? 'volatilidad baja'
      : 'volatilidad normal';

  const patterns = detectPatterns(klines.slice(-Math.min(120, klines.length)));

  return {
    trend,
    strength,
    r2,
    slopePctPerStep,
    annualisedReturnPct,
    annualisedVolPct,
    sharpe,
    sortino,
    maxDrawdownPct,
    currentDrawdownPct,
    winRatePct,
    var95Pct: var95 * 100,
    cvar95Pct: cvar95 * 100,
    hurst,
    skewness: skew,
    kurtosis: kurt,
    support,
    resistance,
    volatilityRegime,
    regimeLabel,
    regression: { from: intercept, to: slope * (n - 1) + intercept },
    lastPrice,
    patterns,
    stepsPerYear,
  };
}

export interface MonteCarloOptions {
  /** Bias the drift by news sentiment score in [-100, +100]. */
  sentimentNetScore?: number | null;
  /** Strength of the sentiment bias (fraction of stddev to shift the drift). */
  sentimentWeight?: number;
}

/**
 * Geometric Brownian Motion Monte Carlo with optional sentiment drift bias.
 */
export function monteCarloProjection(
  klines: Kline[],
  interval: KlineInterval,
  steps: number,
  paths: number,
  options: MonteCarloOptions = {},
): MonteCarloResult {
  const closes = klines.map(k => k.close);
  const stepsPerYear = STEPS_PER_YEAR[interval];
  if (closes.length < 30) {
    return { bands: [], probabilityOfProfit: 0.5, expectedPathDrawdown: 0, stepsPerYear };
  }
  const rets = logReturns(closes);
  if (rets.length < 10) {
    return { bands: [], probabilityOfProfit: 0.5, expectedPathDrawdown: 0, stepsPerYear };
  }
  const { mean, variance, std } = meanAndStd(rets);

  // Sentiment bias: shift the drift by `sentimentWeight * (score/100) * std`.
  const ns = options.sentimentNetScore;
  const w = options.sentimentWeight ?? 0.5;
  const driftAdjust = ns != null ? (ns / 100) * std * w : 0;
  const adjustedMean = mean + driftAdjust;

  const lastPrice = closes[closes.length - 1] ?? 0;
  const stepPrices: number[][] = Array.from({ length: steps + 1 }, () => []);
  stepPrices[0] = new Array(paths).fill(lastPrice);

  let aboveCount = 0;
  let drawdownSum = 0;

  for (let p = 0; p < paths; p++) {
    let price = lastPrice;
    let peak = lastPrice;
    let maxDD = 0;
    for (let s = 1; s <= steps; s++) {
      const z = boxMullerStandardNormal();
      price = price * Math.exp(adjustedMean - 0.5 * variance + std * z);
      stepPrices[s]!.push(price);
      if (price > peak) peak = price;
      const dd = peak > 0 ? (price - peak) / peak : 0;
      if (dd < maxDD) maxDD = dd;
    }
    if (price > lastPrice) aboveCount++;
    drawdownSum += maxDD;
  }

  const bands: MonteCarloBand[] = [];
  for (let s = 0; s <= steps; s++) {
    const sorted = stepPrices[s]!.slice().sort((a, b) => a - b);
    bands.push({
      step: s,
      p5: percentile(sorted, 0.05),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      p95: percentile(sorted, 0.95),
    });
  }
  return {
    bands,
    probabilityOfProfit: aboveCount / paths,
    expectedPathDrawdown: (drawdownSum / paths) * 100,
    stepsPerYear,
  };
}

// ---------------------------------------------------------------------------
// Back-compat exports — older code paths call these names.
// ---------------------------------------------------------------------------
export function monteCarloBands(
  closes: number[],
  steps: number,
  paths: number,
): MonteCarloBand[] {
  if (closes.length < 30) return [];
  const klines: Kline[] = closes.map((c, i) => ({
    time: i,
    open: c,
    high: c,
    low: c,
    close: c,
    volume: 0,
  }));
  return monteCarloProjection(klines, '1d', steps, paths).bands;
}

export interface TrendAnalysis {
  trend: 'alcista' | 'bajista' | 'lateral';
  strength: 'fuerte' | 'moderada' | 'débil';
  r2: number;
  slopePct: number;
  support: number;
  resistance: number;
  volatilityRegime: number;
  regression: { from: number; to: number };
  annualisedVolPct: number;
  annualisedReturnPct: number;
}

export function analyseTrend(klines: Kline[], window = 60): TrendAnalysis | null {
  const adv = analyseAdvanced(klines, '1d', window);
  if (!adv) return null;
  return {
    trend: adv.trend,
    strength: adv.strength,
    r2: adv.r2,
    slopePct: adv.slopePctPerStep,
    support: adv.support,
    resistance: adv.resistance,
    volatilityRegime: adv.volatilityRegime,
    regression: adv.regression,
    annualisedVolPct: adv.annualisedVolPct,
    annualisedReturnPct: adv.annualisedReturnPct,
  };
}

export interface ScenarioSummary {
  invested: number;
  qty: number;
  expectedValue: number;
  bestCase: number;
  worstCase: number;
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
  const qty = entryPrice > 0 ? invested / entryPrice : 0;
  const expectedValue = qty * (target?.p50 ?? entryPrice);
  const bestCase = qty * (target?.p95 ?? entryPrice);
  const worstCase = qty * (target?.p5 ?? entryPrice);
  return {
    invested,
    qty,
    expectedValue,
    bestCase,
    worstCase,
    expectedReturnPct: invested > 0 ? (expectedValue / invested - 1) * 100 : 0,
    bestReturnPct: invested > 0 ? (bestCase / invested - 1) * 100 : 0,
    worstReturnPct: invested > 0 ? (worstCase / invested - 1) * 100 : 0,
  };
}
