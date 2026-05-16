export const REFRESH = {
  PRICE_MS: 30_000,
  KLINES_MS: 5 * 60_000,
  NEWS_MS: 5 * 60_000,
  CONSENSUS_MS: 5 * 60_000,
} as const;

export const KLINES_LIMITS = {
  '1h': 168,
  '4h': 180,
  '1d': 365,
  '1w': 200,
} as const;

export const VERDICT_THRESHOLDS = {
  STRONG_BUY: 12,
  BUY: 5,
  SELL: -5,
  STRONG_SELL: -12,
} as const;
