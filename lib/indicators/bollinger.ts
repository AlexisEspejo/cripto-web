export interface BollingerResult {
  mid: Array<number | null>;
  upper: Array<number | null>;
  lower: Array<number | null>;
}

export function bollinger(closes: number[], period = 20, sd = 2): BollingerResult {
  const mid: Array<number | null> = [];
  const upper: Array<number | null> = [];
  const lower: Array<number | null> = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      mid.push(null);
      upper.push(null);
      lower.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j] ?? 0;
    const m = sum / period;
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const v = (closes[j] ?? 0) - m;
      sq += v * v;
    }
    const stdDev = Math.sqrt(sq / period);
    mid.push(m);
    upper.push(m + sd * stdDev);
    lower.push(m - sd * stdDev);
  }
  return { mid, upper, lower };
}
