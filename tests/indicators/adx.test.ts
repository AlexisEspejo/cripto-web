import { describe, it, expect } from 'vitest';
import { adx } from '@/lib/indicators/adx';

const ohlc = (n: number, fn: (i: number) => number) => {
  const closes = Array.from({ length: n }, (_, i) => fn(i));
  const highs = closes.map(c => c + 1);
  const lows = closes.map(c => c - 1);
  return { highs, lows, closes };
};

describe('adx', () => {
  it('returns empty arrays when not enough data', () => {
    const { highs, lows, closes } = ohlc(10, i => 100 + i);
    expect(adx(highs, lows, closes, 14).adx).toEqual([]);
  });

  it('strongly trending series → +DI > -DI and ADX > 25', () => {
    const { highs, lows, closes } = ohlc(60, i => 100 + i * 2);
    const a = adx(highs, lows, closes, 14);
    const lA = a.adx[a.adx.length - 1] as number;
    const lP = a.plusDI[a.plusDI.length - 1] as number;
    const lM = a.minusDI[a.minusDI.length - 1] as number;
    expect(lA).toBeGreaterThan(25);
    expect(lP).toBeGreaterThan(lM);
  });

  it('downtrend → -DI > +DI', () => {
    const { highs, lows, closes } = ohlc(60, i => 200 - i * 2);
    const a = adx(highs, lows, closes, 14);
    const lP = a.plusDI[a.plusDI.length - 1] as number;
    const lM = a.minusDI[a.minusDI.length - 1] as number;
    expect(lM).toBeGreaterThan(lP);
  });

  it('ranging series → ADX is low', () => {
    const { highs, lows, closes } = ohlc(80, i => 100 + Math.sin(i) * 1);
    const a = adx(highs, lows, closes, 14);
    const lA = a.adx[a.adx.length - 1] as number;
    expect(lA).toBeLessThan(40);
  });
});
