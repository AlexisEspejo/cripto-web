export function mfi(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period = 14,
): Array<number | null> {
  const tp: number[] = closes.map((c, i) => ((highs[i] ?? 0) + (lows[i] ?? 0) + c) / 3);
  const rmf: number[] = tp.map((t, i) => t * (volumes[i] ?? 0));
  const out: Array<number | null> = [];
  for (let i = 0; i < tp.length; i++) {
    if (i < period) {
      out.push(null);
      continue;
    }
    let pos = 0;
    let neg = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (j === 0) continue;
      const cur = tp[j] ?? 0;
      const prev = tp[j - 1] ?? 0;
      if (cur > prev) pos += rmf[j] ?? 0;
      else if (cur < prev) neg += rmf[j] ?? 0;
    }
    if (neg === 0) {
      out.push(100);
      continue;
    }
    const mfr = pos / neg;
    out.push(100 - 100 / (1 + mfr));
  }
  return out;
}
