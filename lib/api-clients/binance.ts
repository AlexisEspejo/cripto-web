import { z } from 'zod';
import type { Kline, KlineInterval } from '../types';

const Ticker24hSchema = z.object({
  lastPrice: z.string(),
  priceChangePercent: z.string(),
  highPrice: z.string(),
  lowPrice: z.string(),
  volume: z.string(),
  quoteVolume: z.string(),
});

export type Ticker24h = z.infer<typeof Ticker24hSchema>;

const BINANCE = 'https://api.binance.com';

export async function fetchTicker24h(symbol = 'BTCUSDT'): Promise<Ticker24h> {
  const r = await fetch(`${BINANCE}/api/v3/ticker/24hr?symbol=${symbol}`, {
    next: { revalidate: 30 },
  });
  if (!r.ok) throw new Error(`Binance ticker failed: ${r.status}`);
  const j: unknown = await r.json();
  return Ticker24hSchema.parse(j);
}

export async function fetchKlines(
  interval: KlineInterval,
  limit: number,
  symbol = 'BTCUSDT',
): Promise<Kline[]> {
  const r = await fetch(
    `${BINANCE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    { next: { revalidate: 300 } },
  );
  if (!r.ok) throw new Error(`Binance klines failed: ${r.status}`);
  const raw: unknown = await r.json();
  if (!Array.isArray(raw)) throw new Error('Klines: expected array');
  return raw.map((k): Kline => {
    if (!Array.isArray(k)) throw new Error('Kline row malformed');
    return {
      time: Number(k[0]),
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    };
  });
}
