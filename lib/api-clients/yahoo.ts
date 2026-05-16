import type { Kline, KlineInterval } from '../types';
import type { Ticker24h } from './binance';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const INTERVAL_MAP: Record<KlineInterval, string> = {
  '1h': '1h',
  '4h': '1h', // Yahoo doesn't have 4h; aggregate from 1h client-side
  '1d': '1d',
  '1w': '1wk',
};

const RANGE_MAP: Record<KlineInterval, string> = {
  '1h': '1mo',
  '4h': '1mo',
  '1d': '2y',
  '1w': '5y',
};

interface YahooResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
      };
    }>;
    error?: { description?: string } | null;
  };
}

async function fetchYahooChart(
  yahooSymbol: string,
  interval: KlineInterval,
): Promise<{ klines: Kline[]; latestPrice: number; previousClose: number }> {
  const yi = INTERVAL_MAP[interval];
  const range = RANGE_MAP[interval];
  const url = `${YAHOO_BASE}/${encodeURIComponent(yahooSymbol)}?interval=${yi}&range=${range}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 btc-terminal/0.1' },
    next: { revalidate: 300 },
  });
  if (!r.ok) throw new Error(`Yahoo failed: ${r.status}`);
  const j = (await r.json()) as YahooResponse;
  if (j.chart?.error) throw new Error(`Yahoo: ${j.chart.error.description ?? 'error'}`);
  const result = j.chart?.result?.[0];
  if (!result) throw new Error('Yahoo: empty result');
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0];
  if (!q) throw new Error('Yahoo: no quote data');
  const klines: Kline[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    const v = q.volume?.[i];
    const t = ts[i];
    if (o == null || h == null || l == null || c == null || t == null) continue;
    klines.push({
      time: t * 1000,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v ?? 0,
    });
  }
  const latestPrice = result.meta?.regularMarketPrice ?? klines[klines.length - 1]?.close ?? 0;
  const previousClose = result.meta?.chartPreviousClose ?? klines[0]?.close ?? latestPrice;
  return { klines, latestPrice, previousClose };
}

/** Aggregate consecutive 1h klines into 4h klines. */
function aggregateTo4h(hourly: Kline[]): Kline[] {
  const out: Kline[] = [];
  for (let i = 0; i < hourly.length; i += 4) {
    const slice = hourly.slice(i, i + 4);
    if (slice.length === 0) continue;
    const first = slice[0]!;
    const last = slice[slice.length - 1]!;
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    for (const k of slice) {
      if (k.high > high) high = k.high;
      if (k.low < low) low = k.low;
      volume += k.volume;
    }
    out.push({
      time: first.time,
      open: first.open,
      high,
      low,
      close: last.close,
      volume,
    });
  }
  return out;
}

export async function yahooKlines(
  yahooSymbol: string,
  interval: KlineInterval,
  limit: number,
): Promise<Kline[]> {
  const effectiveInterval: KlineInterval = interval === '4h' ? '1h' : interval;
  const { klines } = await fetchYahooChart(yahooSymbol, effectiveInterval);
  const final = interval === '4h' ? aggregateTo4h(klines) : klines;
  return final.slice(-limit);
}

export async function yahooTicker24h(yahooSymbol: string): Promise<Ticker24h> {
  // Use 1d range to compute 24h high/low + change.
  const { klines, latestPrice, previousClose } = await fetchYahooChart(yahooSymbol, '1d');
  const last = klines[klines.length - 1];
  const high = last?.high ?? latestPrice;
  const low = last?.low ?? latestPrice;
  const volume = last?.volume ?? 0;
  const changePct = previousClose > 0 ? ((latestPrice - previousClose) / previousClose) * 100 : 0;
  return {
    lastPrice: String(latestPrice),
    priceChangePercent: String(changePct),
    highPrice: String(high),
    lowPrice: String(low),
    volume: String(volume),
    quoteVolume: String(volume * latestPrice),
  };
}
