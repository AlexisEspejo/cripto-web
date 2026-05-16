import type { Kline, KlineInterval } from '../types';
import type { Ticker24h } from './binance';

const KRAKEN = 'https://api.kraken.com';
const PAIR = 'XBTUSD';

interface KrakenTickerResult {
  result: Record<
    string,
    {
      c: [string, string];
      h: [string, string];
      l: [string, string];
      v: [string, string];
      p: [string, string];
      o: string;
    }
  >;
  error: string[];
}

interface KrakenOhlcResult {
  result: Record<string, unknown> & { last?: number };
  error: string[];
}

const INTERVAL_MIN: Record<KlineInterval, number> = {
  '1h': 60,
  '4h': 240,
  '1d': 1440,
  '1w': 10080,
};

export async function krakenTicker24h(): Promise<Ticker24h> {
  const r = await fetch(`${KRAKEN}/0/public/Ticker?pair=${PAIR}`, { next: { revalidate: 30 } });
  if (!r.ok) throw new Error(`Kraken ticker failed: ${r.status}`);
  const j = (await r.json()) as KrakenTickerResult;
  if (j.error && j.error.length > 0) throw new Error(`Kraken: ${j.error.join(',')}`);
  const firstKey = Object.keys(j.result)[0];
  if (!firstKey) throw new Error('Kraken: empty result');
  const t = j.result[firstKey]!;
  const last = parseFloat(t.c[0]);
  const open = parseFloat(t.o);
  const high = parseFloat(t.h[1]);
  const low = parseFloat(t.l[1]);
  const volBase = parseFloat(t.v[1]);
  const vwap = parseFloat(t.p[1]);
  const quoteVolume = volBase * (Number.isFinite(vwap) && vwap > 0 ? vwap : last);
  const changePct = open > 0 ? ((last - open) / open) * 100 : 0;
  return {
    lastPrice: String(last),
    priceChangePercent: String(changePct),
    highPrice: String(high),
    lowPrice: String(low),
    volume: String(volBase),
    quoteVolume: String(quoteVolume),
  };
}

export async function krakenKlines(interval: KlineInterval, limit: number): Promise<Kline[]> {
  const min = INTERVAL_MIN[interval];
  const sinceSec = Math.floor(Date.now() / 1000) - min * 60 * (limit + 5);
  const r = await fetch(
    `${KRAKEN}/0/public/OHLC?pair=${PAIR}&interval=${min}&since=${sinceSec}`,
    { next: { revalidate: 300 } },
  );
  if (!r.ok) throw new Error(`Kraken OHLC failed: ${r.status}`);
  const j = (await r.json()) as KrakenOhlcResult;
  if (j.error && j.error.length > 0) throw new Error(`Kraken: ${j.error.join(',')}`);
  const firstKey = Object.keys(j.result).find(k => k !== 'last');
  if (!firstKey) throw new Error('Kraken OHLC: empty');
  const rows = j.result[firstKey];
  if (!Array.isArray(rows)) throw new Error('Kraken OHLC: rows not array');
  const all: Kline[] = rows.map(row => {
    if (!Array.isArray(row)) throw new Error('Kraken OHLC row malformed');
    return {
      time: Number(row[0]) * 1000,
      open: parseFloat(String(row[1])),
      high: parseFloat(String(row[2])),
      low: parseFloat(String(row[3])),
      close: parseFloat(String(row[4])),
      volume: parseFloat(String(row[6])),
    };
  });
  return all.slice(-limit);
}
