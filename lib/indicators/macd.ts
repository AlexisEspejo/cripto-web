import { ema } from './ema';

export interface MACDResult {
  macd: Array<number | null>;
  signal: Array<number | null>;
  histogram: Array<number | null>;
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): MACDResult {
  const eFast = ema(values, fast);
  const eSlow = ema(values, slow);
  const macdLine: Array<number | null> = eSlow.map((s, i) => {
    const f = eFast[i];
    return s != null && f != null ? f - s : null;
  });

  const cleanMacd: number[] = [];
  for (const v of macdLine) if (v != null) cleanMacd.push(v);
  const sigLine = ema(cleanMacd, signal);

  const firstMacdIdx = macdLine.findIndex(v => v != null);
  const validSigCount = sigLine.filter(v => v != null).length;
  const firstSigIdx = firstMacdIdx + (cleanMacd.length - validSigCount);

  const alignedSignal: Array<number | null> = new Array(macdLine.length).fill(null);
  let j = 0;
  for (let i = 0; i < sigLine.length; i++) {
    const s = sigLine[i];
    if (s != null) {
      alignedSignal[firstSigIdx + j] = s;
      j++;
    }
  }
  const hist: Array<number | null> = macdLine.map((m, i) => {
    const s = alignedSignal[i];
    return m != null && s != null ? m - s : null;
  });
  return { macd: macdLine, signal: alignedSignal, histogram: hist };
}
