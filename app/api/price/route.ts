import { NextResponse } from 'next/server';
import { fetchTicker24h } from '@/lib/api-clients/binance';
import { fetchAth } from '@/lib/api-clients/coingecko';
import type { PriceData } from '@/lib/types';

export const revalidate = 30;
export const runtime = 'edge';

export async function GET() {
  try {
    const [ticker, ath] = await Promise.all([fetchTicker24h(), fetchAth()]);
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
