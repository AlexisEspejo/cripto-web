import { describe, it, expect } from 'vitest';
import { rsi } from '@/lib/indicators/rsi';

// Wilder's canonical dataset (New Concepts in Technical Trading Systems, 1978)
// 15-day closing prices that produce a known RSI(14) sequence.
const WILDER_CLOSES = [
  44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245,
  45.8433, 46.0826, 45.8931, 46.0328, 45.614, 46.282, 46.282, 46.0028,
  46.0328, 46.4116, 46.2222, 45.6439,
];

describe('rsi', () => {
  it('returns empty when not enough data', () => {
    expect(rsi([1, 2, 3], 14)).toEqual([]);
  });

  it('first 14 values are null', () => {
    const out = rsi(WILDER_CLOSES, 14);
    expect(out.slice(0, 14)).toEqual(new Array(14).fill(null));
  });

  it('approximates Wilder reference for canonical dataset', () => {
    const out = rsi(WILDER_CLOSES, 14);
    const first = out[14];
    expect(first).not.toBeNull();
    // Reference RSI ≈ 70.46 ± rounding for Wilder's published example.
    expect(first as number).toBeGreaterThan(68);
    expect(first as number).toBeLessThan(73);
  });

  it('strongly rising series → high RSI', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const out = rsi(closes, 14);
    const last = out[out.length - 1];
    expect(last as number).toBeGreaterThan(90);
  });

  it('strongly falling series → low RSI', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 - i);
    const out = rsi(closes, 14);
    const last = out[out.length - 1];
    expect(last as number).toBeLessThan(10);
  });

  it('alternating tight series → RSI near 50', () => {
    const closes: number[] = [];
    for (let i = 0; i < 40; i++) closes.push(100 + (i % 2 === 0 ? 0.1 : -0.1));
    const out = rsi(closes, 14);
    const last = out[out.length - 1] as number;
    expect(last).toBeGreaterThan(30);
    expect(last).toBeLessThan(70);
  });
});
