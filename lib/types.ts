export type KlineInterval = '1h' | '4h' | '1d' | '1w';

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  ath: number;
  athDate: string;
  athChange: number;
  timestamp: number;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  url: string;
  source: string;
  publishedOn: number;
  sentiment: NewsSentiment;
}

export interface NewsResponse {
  items: NewsItem[];
  aggregate: {
    bull: number;
    bear: number;
    neutral: number;
    netScore: number;
  };
  timestamp: number;
}

export type NewsSentiment = 'bull' | 'bear' | 'neutral';

export type IndicatorSignal = -2 | -1 | 0 | 1 | 2;
export type Verdict = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface IndicatorResult {
  name: string;
  value: string;
  signal: IndicatorSignal;
  label: string;
  note: string;
}

export interface ConsensusLevels {
  entry: { from: number; to: number };
  stop: number;
  tp1: number;
  tp2: number;
  tp3: number;
}

export interface ConsensusResult {
  verdict: Verdict;
  verdictClass: string;
  verdictNote: string;
  totalScore: number;
  buyCount: number;
  sellCount: number;
  neutralCount: number;
  indicators: IndicatorResult[];
  levels: ConsensusLevels;
  lastPrice: number;
  timestamp: number;
}

export interface SignalLabel {
  tf: string;
  horizon: string;
}

export type Direction = 'up' | 'down' | 'neutral';

export interface TimeframeSignal {
  label: SignalLabel;
  score: number;
  direction: Direction;
  drivers: string[];
  lastRSI?: number;
  e20?: number | null;
  e50?: number | null;
  e200?: number | null;
}

export interface ApiError {
  ok: false;
  error: string;
}

export type ApiResult<T> = T | ApiError;
