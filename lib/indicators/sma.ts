export function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(period - 1).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    if (i >= period) sum -= values[i - period] ?? 0;
    if (i >= period - 1) out.push(sum / period);
  }
  return out;
}
