export interface ADXResult {
  adx: Array<number | null>;
  plusDI: Array<number | null>;
  minusDI: Array<number | null>;
}

export function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): ADXResult {
  const len = closes.length;
  if (len < period * 2 + 1) return { adx: [], plusDI: [], minusDI: [] };

  const tr: number[] = [0];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < len; i++) {
    const hi = highs[i] ?? 0;
    const hp = highs[i - 1] ?? 0;
    const li = lows[i] ?? 0;
    const lp = lows[i - 1] ?? 0;
    const cp = closes[i - 1] ?? 0;
    const upMove = hi - hp;
    const downMove = lp - li;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(hi - li, Math.abs(hi - cp), Math.abs(li - cp)));
  }

  const wilder = (arr: number[]): Array<number | null> => {
    const out: Array<number | null> = new Array(arr.length).fill(null);
    let sum = 0;
    for (let i = 1; i <= period; i++) sum += arr[i] ?? 0;
    out[period] = sum;
    for (let i = period + 1; i < arr.length; i++) {
      const prev = out[i - 1] ?? 0;
      out[i] = prev - prev / period + (arr[i] ?? 0);
    }
    return out;
  };

  const atrArr = wilder(tr);
  const sPlusDM = wilder(plusDM);
  const sMinusDM = wilder(minusDM);

  const plusDI: Array<number | null> = atrArr.map((a, i) => {
    if (a == null || a === 0) return null;
    const v = sPlusDM[i];
    return v == null ? null : (100 * v) / a;
  });
  const minusDI: Array<number | null> = atrArr.map((a, i) => {
    if (a == null || a === 0) return null;
    const v = sMinusDM[i];
    return v == null ? null : (100 * v) / a;
  });
  const dx: Array<number | null> = plusDI.map((p, i) => {
    const m = minusDI[i];
    if (p == null || m == null) return null;
    const sum = p + m;
    return sum === 0 ? 0 : (100 * Math.abs(p - m)) / sum;
  });

  const adxArr: Array<number | null> = new Array(dx.length).fill(null);
  const firstAdx = period * 2;
  if (firstAdx < dx.length) {
    let sum = 0;
    for (let i = period + 1; i <= firstAdx; i++) {
      const v = dx[i];
      if (v != null) sum += v;
    }
    adxArr[firstAdx] = sum / period;
    for (let i = firstAdx + 1; i < dx.length; i++) {
      const dxi = dx[i];
      const prev = adxArr[i - 1];
      if (dxi == null || prev == null) continue;
      adxArr[i] = (prev * (period - 1) + dxi) / period;
    }
  }
  return { adx: adxArr, plusDI, minusDI };
}
