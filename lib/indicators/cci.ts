export function cci(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 20,
): Array<number | null> {
  const tp: number[] = closes.map((c, i) => ((highs[i] ?? 0) + (lows[i] ?? 0) + c) / 3);
  const out: Array<number | null> = [];
  for (let i = 0; i < tp.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += tp[j] ?? 0;
    const meanTP = sum / period;
    let mad = 0;
    for (let j = i - period + 1; j <= i; j++) mad += Math.abs((tp[j] ?? 0) - meanTP);
    mad /= period;
    const t = tp[i] ?? 0;
    out.push(mad === 0 ? 0 : (t - meanTP) / (0.015 * mad));
  }
  return out;
}
