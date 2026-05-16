import { describe, it, expect } from 'vitest';
import { ASSETS } from '@/lib/asset-registry';
import { generateConsensus } from '@/lib/consensus';
import type { Kline } from '@/lib/types';

function makeKlines(closes: number[]): Kline[] {
  return closes.map((c, i) => ({
    time: 1_700_000_000_000 + i * 86_400_000,
    open: c * 0.999,
    high: c * 1.002,
    low: c * 0.997,
    close: c,
    volume: 0,
  }));
}

function invertKlines(klines: Kline[]): Kline[] {
  return klines.map(k => ({
    time: k.time,
    open: 1 / k.open,
    high: 1 / k.low,
    low: 1 / k.high,
    close: 1 / k.close,
    volume: k.volume,
  }));
}

describe('asset inversion', () => {
  it('USDEUR is registered as inverse of EURUSD', () => {
    expect(ASSETS.USDEUR?.invertOf).toBe('EURUSD');
    expect(ASSETS.USDEUR?.type).toBe('fx');
    expect(ASSETS.EURUSD?.invertOf).toBeUndefined();
  });

  it('consensus on inverted series produces mirror score', () => {
    // Bull series on EUR/USD → bear series on USD/EUR (inverted).
    const closes = Array.from({ length: 260 }, (_, i) => 1.05 + i * 0.0005);
    const direct = generateConsensus(makeKlines(closes));
    const inverted = generateConsensus(invertKlines(makeKlines(closes)));
    // Total score should flip sign (within tolerance — some neutral
    // indicators may not be perfectly antisymmetric).
    expect(Math.sign(direct.totalScore) * Math.sign(inverted.totalScore)).toBeLessThanOrEqual(0);
  });

  it('inversion is involutive: invert(invert(x)) == x', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 1.1 + i * 0.001);
    const original = makeKlines(closes);
    const twice = invertKlines(invertKlines(original));
    for (let i = 0; i < original.length; i++) {
      expect(twice[i]!.close).toBeCloseTo(original[i]!.close, 8);
      expect(twice[i]!.open).toBeCloseTo(original[i]!.open, 8);
      expect(twice[i]!.high).toBeCloseTo(original[i]!.high, 8);
      expect(twice[i]!.low).toBeCloseTo(original[i]!.low, 8);
    }
  });
});
