import { describe, it, expect } from 'vitest';
import { bollinger } from '@/lib/indicators/bollinger';

describe('bollinger', () => {
  it('on flat series upper = lower = mid', () => {
    const closes = Array(30).fill(100);
    const bb = bollinger(closes, 20, 2);
    expect(bb.mid[29]).toBeCloseTo(100, 6);
    expect(bb.upper[29]).toBeCloseTo(100, 6);
    expect(bb.lower[29]).toBeCloseTo(100, 6);
  });

  it('upper > mid > lower in volatile series', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i) * 5);
    const bb = bollinger(closes, 20, 2);
    expect(bb.upper[39]! > bb.mid[39]!).toBe(true);
    expect(bb.mid[39]! > bb.lower[39]!).toBe(true);
  });

  it('first period-1 values are null', () => {
    const closes = Array.from({ length: 30 }, (_, i) => i);
    const bb = bollinger(closes, 20, 2);
    expect(bb.mid.slice(0, 19).every(v => v === null)).toBe(true);
  });
});
