import { describe, it, expect } from 'vitest';
import { classifyNews } from '@/lib/news-sentiment';

describe('classifyNews', () => {
  it('bullish keywords → bull', () => {
    expect(classifyNews('Bitcoin rally to all-time high', 'Surge in institutional inflows')).toBe('bull');
  });

  it('bearish keywords → bear', () => {
    expect(classifyNews('Bitcoin crash and plunge', 'Liquidation cascade and outflows')).toBe('bear');
  });

  it('mixed → neutral', () => {
    expect(classifyNews('Bitcoin rises but then falls', '')).toBe('neutral');
  });

  it('handles empty input', () => {
    expect(classifyNews('', '')).toBe('neutral');
    expect(classifyNews(null, undefined)).toBe('neutral');
  });
});
