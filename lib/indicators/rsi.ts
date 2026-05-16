/**
 * RSI usando Wilder's smoothing (período por defecto 14).
 * Devuelve un array alineado con `values`; primeros `period` elementos = null.
 */
export function rsi(values: number[], period = 14): Array<number | null> {
  if (values.length < period + 1) return [];
  const out: Array<number | null> = new Array(period).fill(null);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    if (d >= 0) gains += d;
    else losses -= d;
  }
  let avgG = gains / period;
  let avgL = losses / period;
  out.push(100 - 100 / (1 + avgG / (avgL || 1e-9)));
  for (let i = period + 1; i < values.length; i++) {
    const d = (values[i] ?? 0) - (values[i - 1] ?? 0);
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgG = (avgG * (period - 1) + g) / period;
    avgL = (avgL * (period - 1) + l) / period;
    out.push(100 - 100 / (1 + avgG / (avgL || 1e-9)));
  }
  return out;
}
