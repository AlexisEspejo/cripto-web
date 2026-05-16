export interface StochasticResult {
  k: Array<number | null>;
  d: Array<number | null>;
}

export function stochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3,
): StochasticResult {
  const kArr: Array<number | null> = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      kArr.push(null);
      continue;
    }
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      const h = highs[j] ?? -Infinity;
      const l = lows[j] ?? Infinity;
      if (h > hh) hh = h;
      if (l < ll) ll = l;
    }
    const range = hh - ll || 1e-9;
    const c = closes[i] ?? 0;
    kArr.push(((c - ll) / range) * 100);
  }
  const dArr: Array<number | null> = new Array(kArr.length).fill(null);
  for (let i = kPeriod - 1 + dPeriod - 1; i < kArr.length; i++) {
    let sum = 0;
    let ok = true;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      const v = kArr[j];
      if (v == null) {
        ok = false;
        break;
      }
      sum += v;
    }
    if (ok) dArr[i] = sum / dPeriod;
  }
  return { k: kArr, d: dArr };
}
