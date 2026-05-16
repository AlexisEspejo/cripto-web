export function ema(values: number[], period: number): Array<number | null> {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i] ?? 0;
  let prev = sum / period;
  const out: Array<number | null> = new Array(period - 1).fill(null);
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    const v = values[i] ?? 0;
    prev = v * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}
