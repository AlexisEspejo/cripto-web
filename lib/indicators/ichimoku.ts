export interface IchimokuResult {
  tenkan: Array<number | null>;
  kijun: Array<number | null>;
}

export function ichimoku(highs: number[], lows: number[]): IchimokuResult {
  const midpoint = (period: number): Array<number | null> => {
    const out: Array<number | null> = [];
    for (let i = 0; i < highs.length; i++) {
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
      out.push((hh + ll) / 2);
    }
    return out;
  };
  return { tenkan: midpoint(9), kijun: midpoint(26) };
}
