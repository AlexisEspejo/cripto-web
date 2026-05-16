import { describe, it, expect } from 'vitest';
import { macd } from '@/lib/indicators/macd';

const trend = (start: number, len: number, slope: number) =>
  Array.from({ length: len }, (_, i) => start + slope * i);

describe('macd', () => {
  it('returns arrays of equal length to input', () => {
    const closes = trend(100, 200, 0.5);
    const m = macd(closes);
    expect(m.macd.length).toBe(closes.length);
    expect(m.signal.length).toBe(closes.length);
    expect(m.histogram.length).toBe(closes.length);
  });

  it('rising trend → positive MACD line at the end', () => {
    const closes = trend(100, 200, 0.5);
    const m = macd(closes);
    const last = m.macd[m.macd.length - 1] as number;
    expect(last).toBeGreaterThan(0);
  });

  it('falling trend → negative MACD line at the end', () => {
    const closes = trend(200, 200, -0.5);
    const m = macd(closes);
    const last = m.macd[m.macd.length - 1] as number;
    expect(last).toBeLessThan(0);
  });

  it('histogram = macd − signal where both defined', () => {
    const closes = trend(100, 100, 0.3).concat(trend(130, 100, -0.4));
    const m = macd(closes);
    for (let i = 0; i < m.macd.length; i++) {
      const mm = m.macd[i];
      const ss = m.signal[i];
      const hh = m.histogram[i];
      if (mm != null && ss != null) {
        expect(hh).toBeCloseTo(mm - ss, 6);
      } else {
        expect(hh).toBeNull();
      }
    }
  });
});
