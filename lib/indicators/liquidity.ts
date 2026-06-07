/**
 * Liquidez · "pull de liquidez" (liquidity sweep / grab) detector.
 *
 * Pure OHLCV smart-money-concepts read: resting liquidity sits just beyond
 * recent swing highs (buy-side stops) and swing lows (sell-side stops). When a
 * bar pierces one of those pools and then reclaims, it is a "barrido" (sweep)
 * that usually precedes a reversal; when it pierces and holds, it is a
 * continuation. Volume on the sweep bar scales conviction.
 */
export type LiquidityEvent =
  /** Sell-side liquidity (stops below) swept then reclaimed → bullish reversal. */
  | 'bull-sweep'
  /** Buy-side liquidity (stops above) swept then rejected → bearish reversal. */
  | 'bear-sweep'
  /** Buy-side liquidity taken and close holds above → bullish continuation. */
  | 'bull-breakout'
  /** Sell-side liquidity taken and close holds below → bearish continuation. */
  | 'bear-breakdown'
  /** Price trading inside the liquidity range, no pool taken. */
  | 'range';

export interface LiquidityResult {
  /**
   * Net liquidity-pull score per bar in `[-100, 100]`.
   * Positive = sell-side liquidity swept / bullish pull; negative = bearish.
   */
  pull: Array<number | null>;
  /** Liquidity event classification per bar (null during warmup). */
  event: Array<LiquidityEvent | null>;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function liquidity(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  lookback = 20,
): LiquidityResult {
  const n = closes.length;
  const pull: Array<number | null> = [];
  const event: Array<LiquidityEvent | null> = [];

  for (let i = 0; i < n; i++) {
    if (i < lookback) {
      pull.push(null);
      event.push(null);
      continue;
    }

    // Resting liquidity = extremes of the prior `lookback` bars (excluding now).
    let swingHigh = -Infinity;
    let swingLow = Infinity;
    let volSum = 0;
    for (let j = i - lookback; j < i; j++) {
      const h = highs[j] ?? -Infinity;
      const l = lows[j] ?? Infinity;
      if (h > swingHigh) swingHigh = h;
      if (l < swingLow) swingLow = l;
      volSum += volumes[j] ?? 0;
    }
    const avgVol = volSum / lookback || 1;

    const curHigh = highs[i] ?? 0;
    const curLow = lows[i] ?? 0;
    const curClose = closes[i] ?? 0;
    const curVol = volumes[i] ?? 0;
    // A sweep on heavy volume carries more conviction than one on thin volume.
    const volFactor = clamp(avgVol > 0 ? curVol / avgVol : 1, 0.6, 2);

    const sweptBelow = curLow < swingLow;
    const sweptAbove = curHigh > swingHigh;
    // Where the bar closed inside its own range: 0 = at the low, 1 = at the
    // high. A genuine sweep reverses, so it must close in the opposite half
    // of the wick that grabbed the liquidity.
    const barRange = curHigh - curLow || 1;
    const closePos = (curClose - curLow) / barRange;

    let score = 0;
    let ev: LiquidityEvent;

    if (sweptBelow && curClose > swingLow && closePos > 0.5) {
      // Sell-side grab + reclaim into the upper half → bullish reversal.
      const depth = (swingLow - curLow) / (swingLow || 1);
      score = (50 + clamp(depth * 2000, 0, 40)) * volFactor;
      ev = 'bull-sweep';
    } else if (sweptAbove && curClose < swingHigh && closePos < 0.5) {
      // Buy-side grab + rejection into the lower half → bearish reversal.
      const depth = (curHigh - swingHigh) / (swingHigh || 1);
      score = -(50 + clamp(depth * 2000, 0, 40)) * volFactor;
      ev = 'bear-sweep';
    } else if (curClose > swingHigh) {
      // Took buy-side liquidity and holding above → bullish continuation.
      score = 30 * volFactor;
      ev = 'bull-breakout';
    } else if (curClose < swingLow) {
      // Took sell-side liquidity and holding below → bearish continuation.
      score = -30 * volFactor;
      ev = 'bear-breakdown';
    } else {
      // Inside the range: mild magnet bias toward the nearer untested pool.
      const range = swingHigh - swingLow || 1;
      const posInRange = (curClose - swingLow) / range; // 0 (lows) .. 1 (highs)
      score = (posInRange - 0.5) * 20;
      ev = 'range';
    }

    pull.push(clamp(score, -100, 100));
    event.push(ev);
  }

  return { pull, event };
}
