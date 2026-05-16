import { NextResponse } from 'next/server';
import { fetchTicker24h, type Ticker24h } from '@/lib/api-clients/binance';
import { fetchAth } from '@/lib/api-clients/coingecko';
import { krakenTicker24h } from '@/lib/api-clients/kraken';
import type { PriceData } from '@/lib/types';

export const revalidate = 30;
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

async function getTicker(): Promise<{ ticker: Ticker24h; source: 'binance' | 'kraken' }> {
  try {
    return { ticker: await fetchTicker24h(), source: 'binance' };
  } catch (err) {
    console.warn(
      JSON.stringify({ route: '/api/price', binance_failed: err instanceof Error ? err.message : String(err) }),
    );
    return { ticker: await krakenTicker24h(), source: 'kraken' };
  }
}

export async function GET() {
  try {
    const [{ ticker }, ath] = await Promise.all([getTicker(), fetchAth()]);
    const price = parseFloat(ticker.lastPrice);
    const data: PriceData = {
      price,
      change24h: parseFloat(ticker.priceChangePercent),
      high24h: parseFloat(ticker.highPrice),
      low24h: parseFloat(ticker.lowPrice),
      volume24h: parseFloat(ticker.quoteVolume),
      marketCap: ath?.marketCap ?? 0,
      ath: ath?.ath ?? 0,
      athDate: ath?.athDate ?? '',
      athChange: ath?.athChange ?? 0,
      timestamp: Date.now(),
    };
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({ route: '/api/price', error: err instanceof Error ? err.message : String(err) }),
    );
    return NextResponse.json(
      { ok: false, error: 'price_fetch_failed' },
      { status: 502 },
    );
  }
}
