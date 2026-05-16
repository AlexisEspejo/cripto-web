export function williamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): Array<number | null> {
  const out: Array<number | null> = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      const h = highs[j] ?? -Infinity;
      const l = lows[j] ?? Infinity;
      if (h > hh) hh = h;
      if (l < ll) ll = l;
    }
    const range = hh - ll || 1e-9;
    const c = closes[i] ?? 0;
    out.push(((hh - c) / range) * -100);
  }
  return out;
}
